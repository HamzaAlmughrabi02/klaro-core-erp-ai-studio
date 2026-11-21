/**
 * KLARO UI LAYER — ROLE-BASED SIDEBAR & BUILDER WORKSPACE SHELL
 * -----------------------------------------------------------------------------
 * Implements Role-Based Sidebar visibility, collapsible icon-rail mode with
 * hover tooltips, and smooth icon/background hover transitions:
 * - Admin (Implementer): Full Application Factory suite with architectural
 *   labels and subtitles (Entity: Parties, Entity: Items, Schema Builder,
 *   Access Control (RBAC), System Blueprint, Workflows, Audit Log, Settings).
 * - Accountant: Operational modules.
 * - Employee (End User): ONLY operational pages (Dashboard, Parties, Items,
 *   Documents). All builder/schema/RBAC/blueprint pages are hidden.
 */

import React, { useMemo, useState } from 'react';
import {
  Building2,
  FileText,
  GitPullRequest,
  Globe,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AppModule, RoleCode } from '../core/types.ts';
import { useErp } from '../context/ErpContext.tsx';
import { TranslationKey } from '../engine/i18n.ts';
import { ActionTooltip } from './ActionTooltip.tsx';
import { KlaroLogo } from './KlaroLogo.tsx';

interface NavItem {
  id: AppModule;
  labelKey: TranslationKey;
  employeeLabelKey?: TranslationKey;
  subtitleKey?: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: RoleCode[];
  delegatedPermission?: 'documents:approve' | 'config:manage' | 'iam:manage';
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'navDashboard',
    subtitleKey: 'navDashboardSub',
    icon: LayoutDashboard,
    allowedRoles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'],
  },
  {
    id: 'parties',
    labelKey: 'navParties',
    employeeLabelKey: 'navPartiesOp',
    subtitleKey: 'navPartiesSub',
    icon: Users,
    allowedRoles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'],
  },
  {
    id: 'items',
    labelKey: 'navItems',
    employeeLabelKey: 'navItemsOp',
    subtitleKey: 'navItemsSub',
    icon: Package,
    allowedRoles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'],
  },
  {
    id: 'documents',
    labelKey: 'navDocuments',
    subtitleKey: 'navDocumentsSub',
    icon: FileText,
    allowedRoles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'],
  },
  {
    id: 'retail',
    labelKey: 'navRetail',
    subtitleKey: 'navRetailSub',
    icon: Store,
    allowedRoles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'],
  },
  {
    id: 'workflows',
    labelKey: 'navWorkflows',
    subtitleKey: 'navWorkflowsSub',
    icon: GitPullRequest,
    allowedRoles: ['ADMIN'],
    delegatedPermission: 'documents:approve',
  },
  {
    id: 'auditLogs',
    labelKey: 'navAuditLogs',
    subtitleKey: 'navAuditLogsSub',
    icon: History,
    allowedRoles: ['ADMIN'],
  },
  {
    id: 'config',
    labelKey: 'navConfig',
    subtitleKey: 'navConfigSub',
    icon: SlidersHorizontal,
    allowedRoles: ['ADMIN'],
    delegatedPermission: 'config:manage',
  },
  {
    id: 'iam',
    labelKey: 'navIam',
    subtitleKey: 'navIamSub',
    icon: ShieldCheck,
    allowedRoles: ['ADMIN'],
    delegatedPermission: 'iam:manage',
  },
  {
    id: 'architecture',
    labelKey: 'navArchitecture',
    subtitleKey: 'navArchitectureSub',
    icon: Layers,
    allowedRoles: ['ADMIN'],
  },
  {
    id: 'settings',
    labelKey: 'navSettings',
    subtitleKey: 'navSettingsSub',
    icon: Building2,
    allowedRoles: ['ADMIN'],
  },
];

const OPERATION_IDS: AppModule[] = ['dashboard', 'parties', 'items', 'documents', 'retail'];

function initialsOf(name?: string | null): string {
  if (!name) return 'K';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || 'K';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    profile,
    systemSettings,
    lang,
    toggleLang,
    tr,
    activeModule,
    subRoute,
    setActiveModule,
    signOut,
    toasts,
    dismissToast,
    errorBanner,
    clearErrorBanner,
    can,
  } = useErp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const role = ((profile?.roleCode ?? 'EMPLOYEE').toUpperCase()) as RoleCode;
  const isEmployee = role === 'EMPLOYEE';

  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter(
      (item) =>
        item.allowedRoles.includes(role) ||
        (item.delegatedPermission ? can(item.delegatedPermission) : false)
    );
  }, [role, can]);

  const navGroups = useMemo(
    () =>
      [
        {
          id: 'ops',
          label: tr('navGroupOperations'),
          items: visibleNavItems.filter((i) => OPERATION_IDS.includes(i.id)),
        },
        {
          id: 'admin',
          label: tr('navGroupAdmin'),
          items: visibleNavItems.filter((i) => !OPERATION_IDS.includes(i.id)),
        },
      ].filter((g) => g.items.length > 0),
    [visibleNavItems, tr]
  );

  const activeNav = NAV_ITEMS.find((n) => n.id === activeModule) ?? NAV_ITEMS[0];

  const getItemLabel = (item: NavItem): string => {
    if (isEmployee && item.employeeLabelKey) {
      return tr(item.employeeLabelKey);
    }
    return tr(item.labelKey);
  };

  const companyDisplay =
    lang === 'ar'
      ? systemSettings?.companyNameAr || systemSettings?.companyName || tr('brandName')
      : systemSettings?.companyName || tr('brandName');

  const roleLabel =
    role === 'ADMIN'
      ? tr('roleADMIN')
      : role === 'ACCOUNTANT'
      ? tr('roleACCOUNTANT')
      : tr('roleEMPLOYEE');

  const handleSelectModule = (id: AppModule) => {
    setActiveModule(id);
    setMobileMenuOpen(false);
  };

  const brandMark = (size: number) =>
    systemSettings?.logoDataUrl ? (
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src={systemSettings.logoDataUrl}
          alt={companyDisplay}
          referrerPolicy="no-referrer"
          className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shrink-0"
        />
        <span className="text-sm font-extrabold tracking-tight text-white truncate">
          {companyDisplay}
        </span>
      </div>
    ) : (
      <KlaroLogo size={size} wordmark={companyDisplay} tone="dark" />
    );

  const renderNavButtons = (collapsed: boolean) =>
    navGroups.map((group) => (
      <div key={group.id} className="space-y-1">
        {!collapsed ? (
          <p className="px-3.5 pb-1 pt-3 text-xs font-semibold tracking-wide text-night-muted">
            {group.label}
          </p>
        ) : (
          <div className="mx-3 my-2 h-px bg-night-line" aria-hidden="true" />
        )}
        {group.items.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          const showSubtitle = !collapsed && !isEmployee && Boolean(item.subtitleKey);
          const itemLabel = getItemLabel(item);

          const buttonNode = (
            <button
              type="button"
              onClick={() => handleSelectModule(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group w-full flex items-center rounded-2xl text-start transition-colors duration-150 ${
                collapsed ? 'justify-center px-2.5 py-3' : 'gap-3 px-3.5 py-2.5'
              } ${
                isActive
                  ? 'bg-brand text-white shadow-[0_10px_24px_-10px_rgba(109,61,242,0.9)]'
                  : 'text-night-text hover:bg-night-3/70 hover:text-white'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${
                  isActive ? 'text-white' : 'text-night-muted group-hover:text-brand-glow'
                }`}
              />
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug truncate">
                    {itemLabel}
                  </span>
                  {showSubtitle && item.subtitleKey && (
                    <span
                      className={`block text-xs leading-tight mt-0.5 truncate ${
                        isActive ? 'text-white/85' : 'text-night-muted'
                      }`}
                    >
                      {tr(item.subtitleKey)}
                    </span>
                  )}
                </span>
              )}
            </button>
          );

          return (
            <div key={item.id} className={collapsed ? 'flex justify-center' : undefined}>
              <ActionTooltip label={itemLabel} side="end" disabled={!collapsed}>
                {buttonNode}
              </ActionTooltip>
            </div>
          );
        })}
      </div>
    ));

  const renderUserCard = (collapsed: boolean) => (
    <div className="p-3">
      {collapsed ? (
        <div className="flex flex-col items-center gap-2">
          <span
            className="w-10 h-10 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center"
            aria-hidden="true"
          >
            {initialsOf(profile?.displayName)}
          </span>
          <ActionTooltip label={tr('signOut')} side="end">
            <button
              onClick={() => void signOut()}
              aria-label={tr('signOut')}
              className="w-10 h-10 rounded-xl text-night-text hover:bg-night-3 hover:text-white flex items-center justify-center transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </ActionTooltip>
        </div>
      ) : (
        <div className="rounded-[20px] p-4 border border-night-line bg-gradient-to-br from-night-3 to-night-2 space-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-10 h-10 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              {initialsOf(profile?.displayName)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{profile?.displayName}</p>
              <p className="text-xs text-night-muted truncate">{roleLabel}</p>
            </div>
          </div>
          <p className="text-xs text-night-muted truncate">{profile?.email}</p>
          <button
            onClick={() => void signOut()}
            className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{tr('signOut')}</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-night text-ink flex">
      {/* Desktop Sidebar — dark violet (Expanded 288px / Collapsed 84px) */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:shrink-0 lg:h-screen bg-night transition-[width] duration-200 ${
          sidebarCollapsed ? 'lg:w-[84px]' : 'lg:w-[288px]'
        }`}
      >
        <div
          className={`h-[72px] flex items-center min-w-0 ${
            sidebarCollapsed ? 'px-3 justify-center' : 'px-5 justify-between gap-2'
          }`}
        >
          {!sidebarCollapsed && brandMark(32)}
          <ActionTooltip
            label={sidebarCollapsed ? tr('expandSidebar') : tr('collapseSidebar')}
            side={sidebarCollapsed ? 'end' : 'bottom'}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? tr('expandSidebar') : tr('collapseSidebar')}
              className="inline-flex w-10 h-10 items-center justify-center rounded-xl text-night-text hover:text-white hover:bg-night-3 transition-colors shrink-0"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className={`w-[18px] h-[18px] ${lang === 'ar' ? 'rotate-180' : ''}`} />
              ) : (
                <PanelLeftClose className={`w-[18px] h-[18px] ${lang === 'ar' ? 'rotate-180' : ''}`} />
              )}
            </button>
          </ActionTooltip>
        </div>

        <nav
          aria-label={tr('brandName')}
          className={`flex-1 px-3 pb-3 space-y-2 klaro-scroll-dark ${
            sidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'
          }`}
        >
          {renderNavButtons(sidebarCollapsed)}
        </nav>

        {renderUserCard(sidebarCollapsed)}
      </aside>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 lg:hidden bg-night/60 backdrop-blur-sm flex"
          >
            <motion.aside
              initial={{ x: lang === 'ar' ? 300 : -300 }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? 300 : -300 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-[288px] bg-night h-full flex flex-col"
            >
              <div className="h-[72px] px-5 flex items-center justify-between">
                {brandMark(30)}
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={tr('close')}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-night-text hover:bg-night-3 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto klaro-scroll-dark">
                {renderNavButtons(false)}
              </nav>
              {renderUserCard(false)}
            </motion.aside>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Panel — light canvas with a large rounded edge on desktop */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-canvas lg:rounded-s-[32px] lg:h-screen">
        <header className="h-[72px] px-4 sm:px-8 flex items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation"
              className="lg:hidden w-11 h-11 inline-flex items-center justify-center rounded-xl bg-surface border border-line text-ink hover:bg-brand-soft transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-muted whitespace-nowrap truncate max-w-[180px]">
                {companyDisplay}
              </span>
              <span className="text-line-strong" aria-hidden="true">
                /
              </span>
              <span
                className={`truncate ${
                  activeModule === 'parties' && subRoute === 'new'
                    ? 'text-muted'
                    : 'font-bold text-ink'
                }`}
                aria-current={subRoute === 'new' ? undefined : 'page'}
              >
                {getItemLabel(activeNav)}
              </span>
              {activeModule === 'parties' && subRoute === 'new' && (
                <>
                  <span className="text-line-strong" aria-hidden="true">
                    /
                  </span>
                  <span className="font-bold text-ink truncate" aria-current="page">
                    {tr('addNewPartyTitle')}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ActionTooltip
              label={lang === 'en' ? 'Switch to Arabic (RTL)' : 'Switch to English (LTR)'}
              side="bottom"
            >
              <button
                onClick={toggleLang}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl border border-line bg-surface hover:bg-brand-soft text-sm font-semibold text-ink transition-colors whitespace-nowrap shrink-0 shadow-[var(--shadow-card)]"
              >
                <Globe className="w-4 h-4 text-brand" />
                <span>{lang === 'en' ? 'العربية' : 'English'}</span>
              </button>
            </ActionTooltip>
            <span
              className="hidden sm:flex w-11 h-11 rounded-full bg-night text-white text-sm font-bold items-center justify-center"
              title={profile?.displayName ?? ''}
              aria-hidden="true"
            >
              {initialsOf(profile?.displayName)}
            </span>
          </div>
        </header>

        {errorBanner && (
          <div
            role="alert"
            className="mx-4 sm:mx-8 mb-2 px-4 py-3 rounded-2xl border border-danger/30 bg-red-50 text-red-900 text-sm flex items-center justify-between gap-4"
          >
            <span className="truncate">{errorBanner}</span>
            <button onClick={clearErrorBanner} className="font-semibold underline shrink-0">
              {tr('close')}
            </button>
          </div>
        )}

        <main className="flex-1 px-4 sm:px-8 pb-10 pt-2 w-full min-h-0 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Toast Stack */}
      <div
        className="fixed bottom-5 end-5 z-50 flex flex-col gap-2 max-w-sm"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.16 }}
              className={`px-4 py-3 rounded-2xl border text-sm font-medium flex items-center justify-between gap-4 bg-surface shadow-[var(--shadow-lift)] ${
                toast.type === 'error'
                  ? 'border-danger/40 text-red-800'
                  : toast.type === 'success'
                  ? 'border-success text-ink'
                  : 'border-line-strong text-ink'
              }`}
            >
              <span>{toast.text}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                aria-label={tr('close')}
                className="text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
