import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export function notifyUser(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/pwa-192x192.png' });
    }
  } catch {
    // ignore browser notification errors
  }
}

export function useNotifications() {
  const updateSettings = useAppStore((s) => s.updateSettings);
  const addToast = useAppStore((s) => s.addToast);

  const toggleNotifications = useCallback(
    async (enable: boolean) => {
      if (!enable) {
        updateSettings({ enableNotifications: false });
        addToast('Nastavení uloženo');
        return;
      }
      if (typeof window === 'undefined' || !('Notification' in window)) {
        updateSettings({ enableNotifications: false });
        addToast('Notifikace nejsou v tomto prohlížeči podporovány', { type: 'danger' });
        return;
      }
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          updateSettings({ enableNotifications: true });
          addToast('Notifikace povoleny 🔔', { type: 'good' });
        } else {
          updateSettings({ enableNotifications: false });
          addToast('Oprávnění k notifikacím bylo zamítnuto', { type: 'danger' });
        }
      } catch {
        updateSettings({ enableNotifications: false });
        addToast('Nepodařilo se zapnout notifikace', { type: 'danger' });
      }
    },
    [updateSettings, addToast]
  );

  const toggleCravingNotifications = useCallback(
    async (enable: boolean) => {
      if (!enable) {
        updateSettings({ cravingNotificationEnabled: false });
        addToast('Nastavení uloženo');
        return;
      }
      if (typeof window === 'undefined' || !('Notification' in window)) {
        updateSettings({ cravingNotificationEnabled: false });
        addToast('Notifikace nejsou v tomto prohlížeči podporovány', { type: 'danger' });
        return;
      }
      try {
        const perm =
          Notification.permission === 'granted'
            ? 'granted'
            : await Notification.requestPermission();
        if (perm === 'granted') {
          updateSettings({ cravingNotificationEnabled: true });
          addToast('Notifikace predikce chuti povoleny 🔔', { type: 'good' });
        } else {
          updateSettings({ cravingNotificationEnabled: false });
          addToast('Oprávnění k notifikacím bylo zamítnuto', { type: 'danger' });
        }
      } catch {
        updateSettings({ cravingNotificationEnabled: false });
        addToast('Nepodařilo se zapnout notifikace', { type: 'danger' });
      }
    },
    [updateSettings, addToast]
  );

  return { toggleNotifications, toggleCravingNotifications };
}
