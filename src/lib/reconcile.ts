import { AppState, Dose, Package, ReconcileMethod } from '../types';
import { r2 } from './format';

export function getReconcileCandidateDoses(
  doses: Dose[],
  pkg: Package,
  includeUnassigned = false
): Dose[] {
  const pkgDoses = doses.filter((d) => d.packageId === pkg.id);
  const unassigned = doses.filter((d) => !d.packageId && d.strainId === pkg.strainId);
  const all = includeUnassigned ? [...pkgDoses, ...unassigned] : pkgDoses;
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export function performReconciliation(
  state: Pick<AppState, 'doses' | 'packages'>,
  pkgId: string,
  selectedDoseIds: Set<string>,
  targetWeightG: number,
  method: ReconcileMethod,
  calibrate: boolean,
  now = Date.now()
): { packages: Package[]; doses: Dose[] } {
  const pkg = state.packages.find((p) => p.id === pkgId);
  if (!pkg) return { packages: state.packages, doses: state.doses };

  if (!calibrate || selectedDoseIds.size === 0) {
    const packages = state.packages.map((p) =>
      p.id === pkgId
        ? {
            ...p,
            status: 'finished' as const,
            remainingWeightG: 0,
            finishedAt: now,
          }
        : p
    );
    return { packages, doses: state.doses };
  }

  const selectedDoses = state.doses.filter((d) => selectedDoseIds.has(d.id));
  const sumSelected = r2(selectedDoses.reduce((a, d) => a + d.amountG, 0));
  const diff = r2(targetWeightG - sumSelected);
  const factor = sumSelected > 0 ? targetWeightG / sumSelected : 1;
  const delta = selectedDoses.length > 0 ? diff / selectedDoses.length : 0;

  const originalAmounts: Record<string, number> = {};
  const doses = state.doses.map((d) => {
    if (!selectedDoseIds.has(d.id)) return d;
    const orig = d.originalAmountG !== undefined ? d.originalAmountG : d.amountG;
    originalAmounts[d.id] = orig;

    const rawNew = method === 'proportional' ? d.amountG * factor : Math.max(0.1, d.amountG + delta);
    const newAmount = r2(Math.max(0.1, rawNew));
    const mitPct = d.mitPct || 1.45;
    const sevenOhPct = d.sevenOhPct || 0.025;
    const pricePerG = d.pricePerG || pkg.pricePerG || 8;

    return {
      ...d,
      amountG: newAmount,
      packageId: pkg.id,
      calibrated: true,
      originalAmountG: orig,
      calibrationDiff: r2(newAmount - orig),
      cost: r2(newAmount * pricePerG),
      mitMg: r2(newAmount * mitPct * 10),
      sevenOhMg: r2(newAmount * sevenOhPct * 10),
    };
  });

  const packages = state.packages.map((p) =>
    p.id === pkgId
      ? {
          ...p,
          status: 'finished' as const,
          remainingWeightG: 0,
          finishedAt: now,
          calibrated: true,
          reconciliation: {
            date: now,
            method,
            targetWeightG: r2(targetWeightG),
            diff,
            factor: r2(factor),
            delta: r2(delta),
            doseIds: Array.from(selectedDoseIds),
            originalAmounts,
          },
        }
      : p
  );

  return { packages, doses };
}

export function revertReconciliation(
  state: Pick<AppState, 'doses' | 'packages'>,
  pkgId: string
): { packages: Package[]; doses: Dose[] } {
  const pkg = state.packages.find((p) => p.id === pkgId);
  if (!pkg || !pkg.reconciliation) {
    return { packages: state.packages, doses: state.doses };
  }

  const rec = pkg.reconciliation;
  const idSet = new Set(rec.doseIds);

  const doses = state.doses.map((d) => {
    if (!idSet.has(d.id)) return d;
    const orig = rec.originalAmounts[d.id] ?? d.originalAmountG ?? d.amountG;
    const amountG = r2(orig);
    const mitPct = d.mitPct || 1.45;
    const sevenOhPct = d.sevenOhPct || 0.025;
    const next = {
      ...d,
      amountG,
      calibrated: false,
      cost: r2(amountG * d.pricePerG),
      mitMg: r2(amountG * mitPct * 10),
      sevenOhMg: r2(amountG * sevenOhPct * 10),
    };
    delete next.calibrationDiff;
    delete next.originalAmountG;
    return next;
  });

  const assignedSum = doses
    .filter((d) => d.packageId === pkgId)
    .reduce((a, d) => a + d.amountG, 0);

  const packages = state.packages.map((p) => {
    if (p.id !== pkgId) return p;
    const next: Package = {
      ...p,
      status: 'active',
      finishedAt: null,
      remainingWeightG: r2(Math.max(0, p.initialWeightG - assignedSum)),
      calibrated: false,
    };
    delete next.reconciliation;
    return next;
  });

  return { packages, doses };
}
