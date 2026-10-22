import { useEffect } from 'react';
import { getNewlyUnlockedAchievements } from '../lib/achievements';
import { predictNextCraving } from '../lib/cravingPrediction';
import { fmtTime } from '../lib/date';
import { useAppStore } from '../store/useAppStore';
import { notifyUser } from './useNotifications';
import { useSounds } from './useSounds';

export function useTicker() {
  const tick = useAppStore((s) => s.tick);
  const doses = useAppStore((s) => s.doses);
  const waterLogs = useAppStore((s) => s.waterLogs);
  const tbreakHistory = useAppStore((s) => s.tbreakHistory);
  const cravingLogs = useAppStore((s) => s.cravingLogs);
  const lastBackupAt = useAppStore((s) => s.settings.lastBackupAt);
  const playSound = useSounds();

  useEffect(() => {
    const state = useAppStore.getState();
    const newlyUnlocked = getNewlyUnlockedAchievements(state);
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach((def, idx) => {
        state.unlockAchievement(def.id);
        setTimeout(() => {
          useAppStore
            .getState()
            .addToast(`🏆 Úspěch odemčen: ${def.name}`, { type: 'good', duration: 4200 });
          playSound(988, 110);
        }, idx * 400);
      });
    }
  }, [doses, waterLogs, tbreakHistory, cravingLogs, lastBackupAt, playSound]);

  useEffect(() => {
    const checkCravingNotification = () => {
      const s = useAppStore.getState();
      const st = s.settings;
      if (st.enableCravingTracker && st.cravingNotificationEnabled) {
        const pred = predictNextCraving(s.cravingLogs || [], s.doses, st, Date.now());
        if (pred.available && pred.predictedAt) {
          const msUntil = pred.predictedAt - Date.now();
          const leadMs = (st.cravingNotificationLeadMin || 20) * 60_000;
          if (msUntil > 0 && msUntil <= leadMs && !s.cravingNotifiedForCurrentSession) {
            notifyUser('Blíží se chuť 🤤', `Predikce: ${fmtTime(pred.predictedAt, st.timeFormat24)}`);
            s.setCravingNotifiedForCurrentSession(true);
          }
        }
      }
    };

    const id = setInterval(() => {
      tick();
      checkCravingNotification();
    }, 20000);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        tick();
        checkCravingNotification();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [tick]);
}
