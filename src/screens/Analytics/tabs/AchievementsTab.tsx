import React from 'react';
import { ACH_DEFS } from '../../../constants/achievements';
import { achUnlockedCount } from '../../../lib/achievements';
import { fmtDateShort } from '../../../lib/date';
import {
  calcIntervalStreak,
  calcLimitStreak,
  calcWaterStreak,
} from '../../../lib/streaks';
import { useAppStore } from '../../../store/useAppStore';

export const AchievementsTab: React.FC = () => {
  const state = useAppStore();
  const unlocked = achUnlockedCount(state);
  const total = ACH_DEFS.length;
  const pct = Math.round((unlocked / total) * 100);

  const limitStreak = calcLimitStreak(state);
  const waterStreak = calcWaterStreak(state);
  const intervalStreak = calcIntervalStreak(state);
  const tbreaksCompleted = state.tbreakHistory.filter((t) => t.completed).length;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>🏆 Odemčené úspěchy</span>
          <span className="delta-tag good num">
            {unlocked} / {total} ({pct} %)
          </span>
        </div>
        <div className="bento-meter-track" style={{ height: 9 }}>
          <div className="bento-meter-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 4 mini streak cards */}
      <div className="stats-4" style={{ marginTop: 10 }}>
        <div className="stat-cell">
          <div className="stat-cell-label">Dny v limitu</div>
          <div className="stat-cell-val">🔥 {limitStreak}</div>
          <div className="stat-cell-sub">v řadě</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Splněné pauzy</div>
          <div className="stat-cell-val">🧘 {tbreaksCompleted}</div>
          <div className="stat-cell-sub">T-Break</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Dny vody</div>
          <div className="stat-cell-val">💧 {waterStreak}</div>
          <div className="stat-cell-sub">cíl splněn</div>
        </div>
        <div className="stat-cell">
          <div className="stat-cell-label">Série odstupů</div>
          <div className="stat-cell-val">⏱️ {intervalStreak}</div>
          <div className="stat-cell-sub">dávek za sebou</div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
          gap: 8,
          marginTop: 10,
        }}
      >
        {ACH_DEFS.map((def) => {
          const unlockedAt = state.achievements[def.id];
          const curVal = Math.min(def.target, def.get(state));
          const isUnlocked = Boolean(unlockedAt) || curVal >= def.target;

          return (
            <div
              key={def.id}
              className="bento-tile"
              style={{
                borderColor: isUnlocked ? 'var(--accent)' : undefined,
                opacity: isUnlocked ? 1 : 0.55,
                filter: isUnlocked ? 'none' : 'grayscale(0.8)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 22 }}>{def.icon}</span>
                {isUnlocked ? (
                  <span className="delta-tag good" style={{ fontSize: 10 }}>
                    {unlockedAt ? fmtDateShort(unlockedAt) : 'Odemčeno'}
                  </span>
                ) : (
                  <span className="delta-tag num" style={{ fontSize: 10 }}>
                    {curVal}/{def.target}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 8 }}>{def.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, lineHeight: 1.35 }}>
                {def.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
