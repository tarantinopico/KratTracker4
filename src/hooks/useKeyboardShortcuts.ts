import { useEffect } from 'react';
import { dayKey } from '../lib/date';
import { downloadFile, exportJSON } from '../lib/exportImport';
import { useAppStore } from '../store/useAppStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      const s = useAppStore.getState();
      const anyModalOpen =
        s.doseModalOpen ||
        s.strainSheetOpen ||
        s.packageSheetOpen ||
        s.beverageSheetOpen ||
        Boolean(s.reconcilePkgId) ||
        s.helpSheetOpen ||
        s.onboardingOpen ||
        Boolean(s.confirmDialog);

      if (e.key === 'Escape') {
        if (s.confirmDialog) s.closeConfirm();
        else if (s.doseModalOpen) s.closeDoseModal();
        else if (s.strainSheetOpen) s.closeStrainSheet();
        else if (s.packageSheetOpen) s.closePackageSheet();
        else if (s.beverageSheetOpen) s.closeBeverageSheet();
        else if (s.reconcilePkgId) s.closeReconcileSheet();
        else if (s.helpSheetOpen) s.setHelpSheetOpen(false);
        else if (s.onboardingOpen) {
          s.updateSettings({ onboarded: true });
          s.setOnboardingOpen(false);
        }
        return;
      }

      if (anyModalOpen || e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'd' || key === 'n') {
        e.preventDefault();
        s.openDoseModal(null);
      } else if (key === 'w') {
        e.preventDefault();
        const ml = s.settings.waterQuickMl1 || 250;
        s.addWater(ml);
        s.addToast(`💧 +${ml} ml vody zapsáno`);
      } else if (key === '1') {
        s.setActiveTab('dashboard');
      } else if (key === '2') {
        s.setActiveTab('stock');
      } else if (key === '3') {
        s.setActiveTab('history');
      } else if (key === '4') {
        s.setActiveTab('analytics');
      } else if (key === '5') {
        s.setActiveTab('settings');
      } else if (key === 'e') {
        e.preventDefault();
        const json = exportJSON(s);
        downloadFile(json, `kratom-tracker-backup-${dayKey(Date.now())}.json`, 'application/json');
        s.markBackupDone();
        s.addToast('💾 Záloha JSON exportována');
      } else if (e.key === '?') {
        e.preventDefault();
        s.setHelpSheetOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
