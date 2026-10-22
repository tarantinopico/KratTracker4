import React from 'react';
import { IconName } from '../../constants/icons';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../icons/Icon';

interface TopHeaderProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
  showPrivacyToggle?: boolean;
  extraAction?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  icon = 'leaf',
  title,
  subtitle,
  showPrivacyToggle = false,
  extraAction,
}) => {
  const privacyMode = useAppStore((s) => s.settings.privacyMode);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const addToast = useAppStore((s) => s.addToast);

  return (
    <header className="top-header">
      <div className="top-header-left">
        <div className="top-header-logo">
          <Icon name={icon} size={20} />
        </div>
        <div>
          <div className="top-header-title">{title}</div>
          {subtitle && <div className="top-header-sub">{subtitle}</div>}
        </div>
      </div>
      <div className="top-header-actions">
        {extraAction}
        {showPrivacyToggle && (
          <button
            type="button"
            className="icon-btn"
            aria-label={privacyMode ? 'Vypnout anonymní režim' : 'Zapnout anonymní režim'}
            onClick={() => {
              const next = !privacyMode;
              updateSettings({ privacyMode: next });
              addToast(next ? '🕵️ Soukromý režim zapnut' : '👁️ Soukromý režim vypnut');
            }}
          >
            <Icon name={privacyMode ? 'eyeOff' : 'eye'} size={18} />
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          aria-label="Nastavení"
          onClick={() => setActiveTab('settings')}
        >
          <Icon name="settings" size={18} />
        </button>
      </div>
    </header>
  );
};
