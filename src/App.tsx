/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { AppShell } from './components/AppShell.tsx';
import { KlaroLogo } from './components/KlaroLogo.tsx';
import { ErpProvider, useErp } from './context/ErpContext.tsx';
import { AddPartyView } from './views/AddPartyView.tsx';
import { ArchitectureView } from './views/ArchitectureView.tsx';
import { AuditLogsView } from './views/AuditLogsView.tsx';
import { ConfigurationView } from './views/ConfigurationView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { DocumentsView } from './views/DocumentsView.tsx';
import { IamView } from './views/IamView.tsx';
import { ItemsView } from './views/ItemsView.tsx';
import { LoginView } from './views/LoginView.tsx';
import { PartiesView } from './views/PartiesView.tsx';
import { SystemSettingsView } from './views/SystemSettingsView.tsx';
import { WorkflowsView } from './views/WorkflowsView.tsx';
import { RetailPosPage } from './app/dashboard/retail/page.tsx';

function WorkspaceRouter() {
  const { authLoading, firebaseUser, profile, activeModule, subRoute, tr, can } = useErp();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-6">
        <KlaroLogo size={38} wordmark={tr('brandName')} />
        <p className="text-xs font-medium text-[#1A2B4A]/65">{tr('loadingWorkspace')}</p>
      </div>
    );
  }

  if (!firebaseUser || !profile) {
    return <LoginView />;
  }

  const isAdmin = profile.roleCode === 'ADMIN';

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'parties':
        return subRoute === 'new' ? <AddPartyView /> : <PartiesView />;
      case 'items':
        return <ItemsView />;
      case 'documents':
        return <DocumentsView />;
      case 'retail':
        return <RetailPosPage />;
      case 'workflows':
        return isAdmin || can('documents:approve') ? <WorkflowsView /> : <DashboardView />;
      case 'auditLogs':
        return isAdmin ? <AuditLogsView /> : <DashboardView />;
      case 'config':
        return isAdmin || can('config:manage') ? <ConfigurationView /> : <DashboardView />;
      case 'iam':
        return isAdmin || can('iam:manage') ? <IamView /> : <DashboardView />;
      case 'settings':
        return isAdmin ? <SystemSettingsView /> : <DashboardView />;
      case 'architecture':
        return isAdmin ? <ArchitectureView /> : <DashboardView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeModule}-${subRoute}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderModule()}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}

export default function App() {
  return (
    <ErpProvider>
      <WorkspaceRouter />
    </ErpProvider>
  );
}
