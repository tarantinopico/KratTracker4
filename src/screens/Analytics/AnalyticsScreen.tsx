import React from 'react';
import { Icon } from '../../components/icons/Icon';
import { TopHeader } from '../../components/layout/TopHeader';
import { getAnalyticsContext } from '../../lib/analytics';
import { useAppStore } from '../../store/useAppStore';
import { AnalyticsPeriod, AnalyticsSubTab } from '../../types';
import { AchievementsTab } from './tabs/AchievementsTab';
import { BentoHomeTab } from './tabs/BentoHomeTab';
import { CravingTab } from './tabs/CravingTab';
import { HealthTab } from './tabs/HealthTab';
import { IntervalsTab } from './tabs/IntervalsTab';
import { StrainsTab } from './tabs/StrainsTab';
import { SummaryTab } from './tabs/SummaryTab';

const SUB_TABS: Array<{ id: AnalyticsSubTab; label: string }> = [
  { id: 'summary', label: '📊 Souhrn' },
  { id: 'intervals', label: '⏱ Rozestupy' },
  { id: 'strains', label: '🌿 Odrůdy' },
  { id: 'craving', label: '🤤 Chuť' },
  { id: 'health', label: '💚 Zdraví & Plán' },
  { id: 'achievements', label: '🏆 Úspěchy' },
];

const PERIODS: Array<{ id: AnalyticsPeriod; label: string }> = [
  { id: 7, label: '7 dní' },
  { id: 14, label: '14 dní' },
  { id: 30, label: '30 dní' },
  { id: 90, label: '90 dní' },
  { id: 'all', label: 'Vše' },
];

export const AnalyticsScreen: React.FC = () => {
  const state = useAppStore();
  const ctx = getAnalyticsContext(state, state.anaPeriod);

  const activeSubTab: AnalyticsSubTab =
    state.anaSubTab === 'craving' && !state.settings.enableCravingTracker
      ? 'home'
      : state.anaSubTab;

  return (
    <div className="screen active">
      <TopHeader
        icon="chart"
        title="Přehled"
        subtitle={
          activeSubTab === 'home'
            ? 'Bento rozcestník · všechna data na jednom místě'
            : 'Analytika, kinetika a úspěchy'
        }
      />

      {/* Sub-nav tabs: Home icon button + specialized sub-pages */}
      <div className="sub-nav-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-label="Domů (Bento přehled)"
          aria-selected={activeSubTab === 'home'}
          className={`sub-nav-btn ${activeSubTab === 'home' ? 'on' : ''}`}
          style={{ padding: '7px 11px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => state.setAnaSubTab('home')}
          title="Bento přehled (Domů)"
        >
          <Icon name="home" size={14} />
        </button>

        {SUB_TABS.map((t) => {
          if (t.id === 'achievements' && !state.settings.enableAchievements) return null;
          if (t.id === 'craving' && !state.settings.enableCravingTracker) return null;
          const isOn = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isOn}
              className={`sub-nav-btn ${isOn ? 'on' : ''}`}
              onClick={() => state.setAnaSubTab(isOn ? 'home' : t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Period selector */}
      {activeSubTab !== 'achievements' && (
        <div className="seg" id="ana-period-seg" style={{ marginBottom: 4 }}>
          {PERIODS.map((p) => (
            <button
              key={String(p.id)}
              type="button"
              className={`seg-btn ${state.anaPeriod === p.id ? 'on' : ''}`}
              onClick={() => state.setAnaPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div id="ana-content">
        {activeSubTab === 'home' && (
          <BentoHomeTab ctx={ctx} onSelectSubTab={(sub) => state.setAnaSubTab(sub)} />
        )}
        {activeSubTab === 'summary' && <SummaryTab ctx={ctx} />}
        {activeSubTab === 'intervals' && <IntervalsTab ctx={ctx} allDoses={state.doses} />}
        {activeSubTab === 'strains' && <StrainsTab ctx={ctx} strains={state.strains} />}
        {activeSubTab === 'craving' && <CravingTab />}
        {activeSubTab === 'health' && <HealthTab ctx={ctx} />}
        {activeSubTab === 'achievements' && <AchievementsTab />}
      </div>
    </div>
  );
};

