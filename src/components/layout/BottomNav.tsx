import React from 'react';
import { useHaptics } from '../../hooks/useHaptics';
import { useAppStore } from '../../store/useAppStore';
import { NavTab } from '../../types';
import { Icon } from '../icons/Icon';

export const BottomNav: React.FC = () => {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const openDoseModal = useAppStore((s) => s.openDoseModal);
  const buzz = useHaptics();

  const handleNav = (tab: NavTab) => {
    buzz(8);
    setActiveTab(tab);
  };

  return (
    <nav className="bottom-nav" aria-label="Hlavní navigace">
      <div className="bottom-nav-inner">
        <button
          type="button"
          className={`nav-btn ${activeTab === 'dashboard' ? 'on' : ''}`}
          onClick={() => handleNav('dashboard')}
        >
          <Icon name="home" size={20} />
          <span>Dnes</span>
        </button>

        <button
          type="button"
          className={`nav-btn ${activeTab === 'stock' ? 'on' : ''}`}
          onClick={() => handleNav('stock')}
        >
          <Icon name="package" size={20} />
          <span>Sklad</span>
        </button>

        <div className="nav-fab-wrap">
          <button
            type="button"
            className="nav-fab"
            aria-label="Nová dávka"
            onClick={() => {
              buzz(15);
              openDoseModal(null);
            }}
          >
            <Icon name="plus" size={24} strokeWidth={2.4} />
          </button>
        </div>

        <button
          type="button"
          className={`nav-btn ${activeTab === 'history' ? 'on' : ''}`}
          onClick={() => handleNav('history')}
        >
          <Icon name="history" size={20} />
          <span>Historie</span>
        </button>

        <button
          type="button"
          className={`nav-btn ${activeTab === 'analytics' ? 'on' : ''}`}
          onClick={() => handleNav('analytics')}
        >
          <Icon name="chart" size={20} />
          <span>Přehled</span>
        </button>
      </div>
    </nav>
  );
};
