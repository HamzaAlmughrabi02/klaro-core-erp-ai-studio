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

  const BrandHeader = ({ collapsed }: { collapsed: boolean }) => (
    <div
      className={`h-16 flex items-center border-b border-slate-200/80 min-w-0 ${
        collapsed ? 'px-3 justify-center' : 'px-4 justify-between gap-2'
      }`}
    >
      {!collapsed &&
        (systemSettings?.logoDataUrl ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={systemSettings.logoDataUrl}
              alt={companyDisplay}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0"
            />
            <span className="text-sm font-bold tracking-tight text-[#1A2B4A] truncate">
              {companyDisplay}
            </span>
          </div>
        ) : (
          <KlaroLogo size={30} wordmark={companyDisplay} />
        ))}

      <ActionTooltip
        label={collapsed ? tr('expandSidebar') : tr('collapseSidebar')}
        side={collapsed ? 'end' : 'bottom'}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          aria-label={collapsed ? tr('expandSidebar') : tr('collapseSidebar')}
          className="hidden lg:inline-flex p-2 rounded-lg text-[#1A2B4A]/65 hover:text-[#1A2B4A] hover:bg-white hover:scale-105 active:scale-95 transition-all duration-150 shrink-0"
        >
          {collapsed ? (
            <PanelLeftOpen className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          ) : (
            <PanelLeftClose className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          )}
        </button>
      </ActionTooltip>
    </div>
  );

  const renderNavButtons = (collapsed: boolean) =>
    visibleNavItems.map((item) => {
      const Icon = item.icon;
      const isActive = activeModule === item.id;
      const showSubtitle = !collapsed && !isEmployee && Boolean(item.subtitleKey);
      const itemLabel = getItemLabel(item);

      const buttonNode = (
        <motion.button
          whileHover={collapsed ? undefined : { x: lang === 'ar' ? -2 : 2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.14 }}
          onClick={() => handleSelectModule(item.id)}
          className={`group w-full flex items-start rounded-lg text-start transition-colors duration-200 ${
            collapsed ? 'justify-center px-2.5 py-2.5' : 'gap-3 px-3.5 py-2.5'
          } ${
            isActive
              ? 'bg-[#1A2B4A] text-white shadow-sm'
              : 'text-[#1A2B4A]/80 hover:bg-white hover:text-[#1A2B4A]'
          }`}
        >
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
              collapsed ? 'mt-0' : 'mt-0.5'
            } ${
              isActive
                ? 'text-[#FF7A00]'
                : 'text-[#1A2B4A]/60 group-hover:text-[#FF7A00]'
            }`}
          />
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-snug truncate">
                {itemLabel}
              </span>
              {showSubtitle && item.subtitleKey && (
                <span
                  className={`block text-[11px] leading-tight mt-0.5 truncate transition-colors duration-200 ${
                    isActive
                      ? 'text-white/75'
                      : 'text-[#1A2B4A]/55 group-hover:text-[#1A2B4A]/75'
                  }`}
                >
                  {tr(item.subtitleKey)}
                </span>
              )}
            </span>
          )}
        </motion.button>
      );

      return (
        <div key={item.id} className={collapsed ? 'flex justify-center' : undefined}>
          <ActionTooltip label={itemLabel} side="end" disabled={!collapsed}>
            {buttonNode}
          </ActionTooltip>
        </div>
      );
    });

  return (
    <div className="min-h-screen bg-white text-[#1A2B4A] flex">
      {/* Desktop Sidebar (Expanded 272px / Collapsed 76px, Fog #F3F5F7) */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:shrink-0 bg-[#F3F5F7] border-e border-slate-200/90 transition-all duration-200 ${
          sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-[272px]'
        }`}
      >
        <BrandHeader collapsed={sidebarCollapsed} />

        <nav
          className={`flex-1 px-3 py-4 space-y-1 ${
            sidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'
          }`}
        >
          {renderNavButtons(sidebarCollapsed)}
        </nav>

        {/* Signed-in Identity Summary */}
        <div className="p-3 border-t border-slate-200/80 space-y-3">
          {!sidebarCollapsed && (
            <div className="px-2">
              <p className="text-sm font-semibold text-[#1A2B4A] truncate">
                {profile?.displayName}
              </p>
              <p className="text-xs text-[#1A2B4A]/65 truncate mt-0.5">
                {roleLabel} · {profile?.email}
              </p>
            </div>
          )}
          <div className={sidebarCollapsed ? 'flex justify-center' : undefined}>
            <ActionTooltip label={tr('signOut')} side="end" disabled={!sidebarCollapsed}>
              <button
                onClick={() => void signOut()}
                aria-label={tr('signOut')}
                className={`flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-[#1A2B4A] hover:border-[#1A2B4A]/40 hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all duration-150 whitespace-nowrap ${
                  sidebarCollapsed ? 'w-10 h-10 p-0' : 'w-full px-3 py-2'
                }`}
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                {!sidebarCollapsed && <span>{tr('signOut')}</span>}
              </button>
            </ActionTooltip>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 lg:hidden bg-[#1A2B4A]/35 flex"
          >
            <motion.aside
              initial={{ x: lang === 'ar' ? 272 : -272 }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? 272 : -272 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-[272px] bg-[#F3F5F7] h-full flex flex-col border-e border-slate-200"
            >
              <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
                <KlaroLogo size={28} wordmark={companyDisplay} />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={tr('close')}
                  className="p-2 rounded-lg text-[#1A2B4A]/70 hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {renderNavButtons(false)}
              </nav>
              <div className="p-4 border-t border-slate-200">
                <button
                  onClick={() => void signOut()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-[#1A2B4A] hover:scale-105 active:scale-95 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{tr('signOut')}</span>
                </button>
              </div>
            </motion.aside>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (Contextual Breadcrumb + Language Switcher) */}
        <header className="h-16 px-4 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-[#1A2B4A] hover:bg-[#F3F5F7] transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-[#1A2B4A]/55 whitespace-nowrap truncate max-w-[160px]">
                {companyDisplay}
              </span>
              <span className="text-[#1A2B4A]/35" aria-hidden="true">
                /
              </span>
              <span
                className={`truncate ${
                  activeModule === 'parties' && subRoute === 'new'
                    ? 'font-medium text-[#1A2B4A]/65'
                    : 'font-semibold text-[#1A2B4A]'
                }`}
              >
                {getItemLabel(activeNav)}
              </span>
              {activeModule === 'parties' && subRoute === 'new' && (
                <>
                  <span className="text-[#1A2B4A]/35" aria-hidden="true">
                    /
                  </span>
                  <span className="font-semibold text-[#1A2B4A] truncate">
                    {tr('addNewPartyTitle')}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ActionTooltip
              label={lang === 'en' ? 'Switch to Arabic (RTL)' : 'Switch to English (LTR)'}
              side="bottom"
            >
              <button
                onClick={toggleLang}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-[#F3F5F7] hover:bg-slate-200/70 hover:scale-105 active:scale-95 text-xs font-medium text-[#1A2B4A] transition-all duration-150 whitespace-nowrap shrink-0"
              >
                <Globe className="w-3.5 h-3.5 text-[#1A2B4A]" />
                <span>{lang === 'en' ? 'العربية' : 'English'}</span>
              </button>
            </ActionTooltip>
          </div>
        </header>

        {/* Global Error Banner */}
        {errorBanner && (
          <div className="mx-4 sm:mx-8 mt-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-900 text-xs flex items-center justify-between gap-4">
            <span className="truncate">{errorBanner}</span>
            <button onClick={clearErrorBanner} className="font-medium underline shrink-0">
              {tr('close')}
            </button>
          </div>
        )}

        {/* Viewport Body */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Toast Stack */}
      <div className="fixed bottom-5 end-5 z-50 flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.16 }}
              className={`px-4 py-3 rounded-lg border text-sm font-medium flex items-center justify-between gap-4 bg-white shadow-sm ${
                toast.type === 'error'
                  ? 'border-red-300 text-red-800'
                  : toast.type === 'success'
                  ? 'border-[#2ECC71] text-[#1A2B4A]'
                  : 'border-slate-300 text-[#1A2B4A]'
              }`}
            >
              <span>{toast.text}</span>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-xs text-[#1A2B4A]/50 hover:text-[#1A2B4A]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
