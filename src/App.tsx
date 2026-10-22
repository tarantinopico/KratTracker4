import React from 'react';
import { BottomNav } from './components/layout/BottomNav';
import { ConfirmDialog } from './components/sheets/ConfirmDialog';
import { ToastContainer } from './components/ui/Toast';
import { DoseModal } from './dose-modal/DoseModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNotifications } from './hooks/useNotifications';
import { useTheme } from './hooks/useTheme';
import { useTicker } from './hooks/useTicker';
import { AnalyticsScreen } from './screens/Analytics/AnalyticsScreen';
import { DashboardScreen } from './screens/Dashboard/DashboardScreen';
import { HistoryScreen } from './screens/History/HistoryScreen';
import { SettingsScreen } from './screens/Settings/SettingsScreen';
import { StockScreen } from './screens/Stock/StockScreen';
import { BeverageSheet } from './sheets-specific/BeverageSheet';
import { CravingSheet } from './sheets-specific/CravingSheet';
import { HelpSheet } from './sheets-specific/HelpSheet';
import { OnboardingSheet } from './sheets-specific/OnboardingSheet';
import { PackageDetailSheet } from './sheets-specific/PackageDetailSheet';
import { PackageSheet } from './sheets-specific/PackageSheet';
import { ReconcileSheet } from './sheets-specific/ReconcileSheet';
import { StrainSheet } from './sheets-specific/StrainSheet';
import { useAppStore } from './store/useAppStore';

export function App() {
  useTheme();
  useTicker();
  useKeyboardShortcuts();
  useNotifications();

  const activeTab = useAppStore((s) => s.activeTab);

  return (
    <>
      <div className="ambient-bg" aria-hidden="true" />
      <div className="app">
        {activeTab === 'dashboard' && <DashboardScreen />}
        {activeTab === 'stock' && <StockScreen />}
        {activeTab === 'history' && <HistoryScreen />}
        {activeTab === 'analytics' && <AnalyticsScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </div>

      <BottomNav />
      <DoseModal />
      <PackageSheet />
      <PackageDetailSheet />
      <StrainSheet />
      <BeverageSheet />
      <CravingSheet />
      <ReconcileSheet />
      <HelpSheet />
      <OnboardingSheet />
      <ConfirmDialog />
      <ToastContainer />
    </>
  );
}

export default App;
