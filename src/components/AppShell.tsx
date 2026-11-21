/**
 * KLARO UI LAYER — "CLOUD DOCK" WORKSPACE SHELL (rail + dark tree sidebar + panel)
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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  GitPullRequest,
  Globe,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Rocket,
  Search,
  Settings,
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
import { Avatar, ProgressBar } from './ui.tsx';

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
const RAIL_IDS: AppModule[] = ['dashboard', 'retail', 'documents', 'workflows'];

/* ------------------------------------------------------------------ */
/* Command palette (⌘K / Ctrl+K) — real search across pages & records  */
/* ------------------------------------------------------------------ */
function CommandPalette({
  open,
  onClose,
  pages,
}: {
  open: boolean;
  onClose: () => void;
  pages: { id: AppModule; label: string; icon: NavItem['icon'] }[];
}) {
  const { tr, parties, items, documents, setActiveModule } = useErp();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const needle = q.trim().toLowerCase();
  const pageHits = pages.filter((p) => !needle || p.label.toLowerCase().includes(needle));
  const recordHits = useMemo(() => {
    if (!needle) return [];
    const hits: { key: string; label: string; sub: string; module: AppModule }[] = [];
    parties.forEach((p) => {
      if ((p.name + ' ' + (p.email ?? '')).toLowerCase().includes(needle))
        hits.push({ key: 'p' + p.id, label: p.name, sub: tr(`type${p.partyType}` as TranslationKey), module: 'parties' });
    });
    items.forEach((i) => {
      if ((i.name + ' ' + i.code).toLowerCase().includes(needle))
        hits.push({ key: 'i' + i.id, label: i.name, sub: i.code, module: 'items' });
    });
    documents.forEach((d) => {
      if ((d.docNumber + ' ' + d.partyName).toLowerCase().includes(needle))
        hits.push({ key: 'd' + d.id, label: d.docNumber, sub: d.partyName, module: 'documents' });
    });
    return hits.slice(0, 8);
  }, [needle, parties, items, documents, tr]);

  const go = (m: AppModule) => {
    setActiveModule(m);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-night/60 px-4 pt-[14vh] backdrop-blur-sm"
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={tr('searchGlobal')}
        >
          <motion.div
            initial={{ y: -10, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-[24px] border border-line bg-surface shadow-[var(--shadow-hero)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-5 h-14">
              <Search className="h-5 w-5 text-muted shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onClose();
                  if (e.key === 'Enter') {
                    if (recordHits[0]) go(recordHits[0].module);
                    else if (pageHits[0]) go(pageHits[0].id);
                  }
                }}
                placeholder={tr('searchGlobalHint')}
                aria-label={tr('searchGlobal')}
                className="h-full flex-1 bg-transparent text-sm text-ink outline-none"
              />
              <kbd className="rounded-md bg-canvas-2 px-1.5 py-0.5 text-xs font-semibold text-muted">Esc</kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {pageHits.length > 0 && (
                <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted">{tr('searchGroupPages')}</p>
              )}
              {pageHits.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => go(p.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-ink hover:bg-brand-soft"
                  >
                    <Icon className="h-4 w-4 text-brand" />
                    {p.label}
                  </button>
                );
              })}
              {recordHits.length > 0 && (
                <p className="px-3 pb-1 pt-3 text-xs font-semibold text-muted">{tr('searchGroupRecords')}</p>
              )}
              {recordHits.map((r) => (
                <button
                  key={r.key}
                  onClick={() => go(r.module)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start text-sm hover:bg-brand-soft"
                >
                  <span className="font-medium text-ink truncate">{r.label}</span>
                  <span className="text-xs text-muted truncate">{r.sub}</span>
                </button>
              ))}
              {pageHits.length === 0 && recordHits.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted">{tr('searchNoResults')}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Dark tree sidebar                                                   */
/* ------------------------------------------------------------------ */
function TreeSidebar({
  onNavigate,
  onSearch,
  onCollapse,
  groups,
  isEmployee,
  getLabel,
}: {
  onNavigate?: () => void;
  onSearch: () => void;
  onCollapse?: () => void;
  groups: { id: string; label: string; items: NavItem[] }[];
  isEmployee: boolean;
  getLabel: (i: NavItem) => string;
}) {
  const { tr, lang, activeModule, setActiveModule, documents, parties, items, can } = useErp();
  const activeNav = NAV_ITEMS.find((n) => n.id === activeModule) ?? NAV_ITEMS[0];
  const [open, setOpen] = useState<Record<string, boolean>>({ ops: true, admin: true });
  const pendingDocs = documents.filter((d) => d.status === 'DRAFT');
  const latest = useMemo(
    () => [...documents].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 3),
    [documents]
  );
  const counts: Partial<Record<AppModule, number>> = {
    parties: parties.length,
    items: items.length,
    documents: documents.length,
    workflows: pendingDocs.length,
  };
  const go = (m: AppModule) => {
    setActiveModule(m);
    onNavigate?.();
  };
  const canApprove = can('documents:approve');

  return (
    <div className="flex h-full flex-col text-night-text">
      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        {onCollapse && (
          <button
            onClick={onCollapse}
            aria-label={tr('collapseSidebar')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-night-line bg-night-2 text-night-text transition-colors hover:text-white"
          >
            {lang === 'ar' ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        )}
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-white">{getLabel(activeNav)}</h2>
        {!isEmployee && (
          <button
            onClick={() => go('settings')}
            aria-label={tr('navSettings')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-night-line bg-night-2 text-night-text transition-colors hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* search */}
      <div className="px-4 pb-3">
        <button
          onClick={onSearch}
          className="flex h-11 w-full items-center gap-3 rounded-2xl border border-night-line bg-night-2/70 px-3.5 text-sm text-night-muted transition-colors hover:border-brand/60 hover:text-white"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-start">{tr('searchGlobal')}</span>
          <kbd dir="ltr" className="rounded-md bg-night-3 px-1.5 py-0.5 text-xs font-semibold text-night-text">⌘ K</kbd>
        </button>
      </div>

      <div className="klaro-scroll-dark min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {groups.map((g) => {
          const hasActive = g.items.some((i) => i.id === activeModule);
          const isOpen = open[g.id] !== false;
          const GroupIcon = g.id === 'ops' ? LayoutDashboard : ShieldCheck;
          return (
            <div key={g.id}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [g.id]: !isOpen }))}
                aria-expanded={isOpen}
                className={`flex h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition-colors ${
                  hasActive
                    ? 'bg-brand text-white shadow-[0_10px_24px_-10px_rgba(109,61,242,0.9)]'
                    : 'text-night-text hover:bg-night-3/70 hover:text-white'
                }`}
              >
                <GroupIcon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 text-start">{g.label}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90 rtl:rotate-90'}`} />
              </button>
              {isOpen && (
                <ul className="relative ms-[26px] mt-1 space-y-0.5 border-s border-night-line ps-0">
                  {g.items.map((item) => {
                    const active = item.id === activeModule;
                    const count = counts[item.id];
                    const Icon = item.icon;
                    return (
                      <li key={item.id} className="relative">
                        <span
                          aria-hidden="true"
                          className="absolute start-0 top-1/2 h-px w-4 bg-night-line"
                        />
                        <button
                          onClick={() => go(item.id)}
                          aria-current={active ? 'page' : undefined}
                          className={`ms-6 flex h-10 w-[calc(100%-1.5rem)] items-center gap-2.5 rounded-xl px-3 text-sm transition-colors ${
                            active
                              ? 'bg-night-3 font-semibold text-white'
                              : 'text-night-text hover:bg-night-3/60 hover:text-white'
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand-glow' : 'text-night-muted'}`} />
                          <span className="flex-1 truncate text-start">{getLabel(item)}</span>
                          {count !== undefined && count > 0 && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                item.id === 'workflows'
                                  ? 'bg-brand text-white'
                                  : 'bg-night-2 text-night-text'
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {/* Latest documents (≈ "Starred Files" tree) */}
        {latest.length > 0 && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-3.5 pb-1">
              <span className="text-xs font-semibold text-night-muted">{tr('latestDocsTitle')}</span>
              <button
                onClick={() => go('documents')}
                aria-label={tr('navDocuments')}
                className="text-night-muted hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="relative ms-[26px] space-y-0.5 border-s border-night-line">
              {latest.map((d) => (
                <li key={d.id} className="relative">
                  <span aria-hidden="true" className="absolute start-0 top-1/2 h-px w-4 bg-night-line" />
                  <button
                    onClick={() => go('documents')}
                    className="ms-6 flex h-9 w-[calc(100%-1.5rem)] items-center gap-2.5 rounded-xl px-3 text-sm text-night-text transition-colors hover:bg-night-3/60 hover:text-white"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-night-muted" />
                    <span className="truncate font-mono-tabular text-xs">{d.docNumber}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => go('documents')}
              className="mx-1 mt-3 flex h-11 w-[calc(100%-0.5rem)] items-center justify-center gap-2 rounded-2xl border border-dashed border-night-line text-sm font-semibold text-night-text transition-colors hover:border-brand hover:text-white"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                <Plus className="h-3 w-3" />
              </span>
              {tr('newDocumentShort')}
            </button>
          </div>
        )}
      </div>

      {/* Approvals promo card (≈ "Trial Ending Soon") */}
      <div className="p-3">
        <div className="relative overflow-hidden rounded-[22px] border border-night-line bg-[linear-gradient(160deg,var(--color-night-3),var(--color-night-2))] p-4">
          <div aria-hidden="true" className="absolute -top-10 -end-8 h-28 w-28 rounded-full bg-brand/40 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-brand-glow">
              <Rocket className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">
                {pendingDocs.length > 0 ? tr('approvalsCardTitle') : tr('approvalsCardClear')}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-night-text">
                {pendingDocs.length > 0
                  ? `${pendingDocs.length} ${tr('approvalsCardBody')}`
                  : tr('approvalsCardClearBody')}
              </p>
            </div>
          </div>
          {pendingDocs.length > 0 && (canApprove || !isEmployee) && (
            <button
              onClick={() => go('workflows')}
              className="relative mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold text-white transition-colors hover:bg-brand"
            >
              {tr('reviewNow')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App shell                                                           */
/* ------------------------------------------------------------------ */
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
    documents,
    parties,
    items,
  } = useErp();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const role = ((profile?.roleCode ?? 'EMPLOYEE').toUpperCase()) as RoleCode;
  const isEmployee = role === 'EMPLOYEE';

  const visibleNavItems = useMemo(
    () =>
      NAV_ITEMS.filter(
        (item) =>
          item.allowedRoles.includes(role) ||
          (item.delegatedPermission ? can(item.delegatedPermission) : false)
      ),
    [role, can]
  );

  const groups = useMemo(
    () =>
      [
        { id: 'ops', label: tr('navGroupOperations'), items: visibleNavItems.filter((i) => OPERATION_IDS.includes(i.id)) },
        { id: 'admin', label: tr('navGroupAdmin'), items: visibleNavItems.filter((i) => !OPERATION_IDS.includes(i.id)) },
      ].filter((g) => g.items.length > 0),
    [visibleNavItems, tr]
  );

  const getLabel = (item: NavItem): string =>
    isEmployee && item.employeeLabelKey ? tr(item.employeeLabelKey) : tr(item.labelKey);

  const activeNav = NAV_ITEMS.find((n) => n.id === activeModule) ?? NAV_ITEMS[0];
  const companyDisplay =
    lang === 'ar'
      ? systemSettings?.companyNameAr || systemSettings?.companyName || tr('brandName')
      : systemSettings?.companyName || tr('brandName');

  const approved = documents.filter((d) => d.status === 'APPROVED').length;
  const pending = documents.filter((d) => d.status === 'DRAFT').length;
  const pct = documents.length ? Math.round((approved / documents.length) * 100) : 0;

  const countFor: Partial<Record<AppModule, number>> = {
    parties: parties.length,
    items: items.length,
    documents: documents.length,
    workflows: pending,
  };
  const activeCount = countFor[activeModule];

  const palettePages = visibleNavItems.map((i) => ({ id: i.id, label: getLabel(i), icon: i.icon }));
  const railItems = RAIL_IDS.map((id) => visibleNavItems.find((i) => i.id === id)).filter(Boolean) as NavItem[];

  const railBtn = (active: boolean) =>
    `relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
      active ? 'bg-night text-white shadow-[var(--shadow-lift)]' : 'text-muted hover:bg-brand-soft hover:text-brand'
    }`;

  return (
    <div className="min-h-screen bg-canvas-2 text-ink lg:flex lg:h-screen lg:gap-3 lg:overflow-hidden lg:p-3">
      {/* 1 — Icon rail */}
      <aside className="hidden w-[76px] shrink-0 flex-col items-center rounded-[28px] border border-line bg-surface py-5 shadow-[var(--shadow-card)] lg:flex">
        <button onClick={() => setActiveModule('dashboard')} aria-label={tr('brandName')} className="mb-5">
          {systemSettings?.logoDataUrl ? (
            <img src={systemSettings.logoDataUrl} alt="" className="h-10 w-10 rounded-xl object-contain" />
          ) : (
            <KlaroLogo size={40} showWordmark={false} />
          )}
        </button>
        <div className="mb-3 h-px w-8 bg-line" />
        <nav aria-label="Quick access" className="flex flex-col items-center gap-2">
          {railItems.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            return (
              <ActionTooltip key={item.id} label={getLabel(item)} side="end">
                <button
                  onClick={() => setActiveModule(item.id)}
                  aria-label={getLabel(item)}
                  aria-current={active ? 'page' : undefined}
                  className={railBtn(active)}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.id === 'workflows' && pending > 0 && (
                    <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-brand ring-2 ring-surface" />
                  )}
                </button>
              </ActionTooltip>
            );
          })}
          <ActionTooltip label={tr('newDocumentShort')} side="end">
            <button
              onClick={() => setActiveModule('documents')}
              aria-label={tr('newDocumentShort')}
              className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-canvas-2 text-ink transition-colors hover:bg-brand hover:text-white"
            >
              <Plus className="h-[18px] w-[18px]" />
            </button>
          </ActionTooltip>
        </nav>
        <div className="mt-auto flex flex-col items-center gap-2">
          <ActionTooltip label={lang === 'en' ? 'العربية' : 'English'} side="end">
            <button onClick={toggleLang} aria-label="Language" className={railBtn(false)}>
              <Globe className="h-[18px] w-[18px]" />
            </button>
          </ActionTooltip>
          <ActionTooltip label={tr('signOut')} side="end">
            <button onClick={() => void signOut()} aria-label={tr('signOut')} className={railBtn(false)}>
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </ActionTooltip>
        </div>
      </aside>

      {/* 2 — Dark tree sidebar */}
      {panelOpen && (
        <aside className="hidden w-[296px] shrink-0 overflow-hidden rounded-[28px] bg-night shadow-[var(--shadow-hero)] lg:block">
          <TreeSidebar
            groups={groups}
            isEmployee={isEmployee}
            getLabel={getLabel}
            onSearch={() => setPaletteOpen(true)}
            onCollapse={() => setPanelOpen(false)}
          />
        </aside>
      )}

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex bg-night/60 backdrop-blur-sm lg:hidden"
          >
            <motion.aside
              initial={{ x: lang === 'ar' ? 320 : -320 }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? 320 : -320 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full w-[300px] bg-night"
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label={tr('close')}
                className="absolute end-3 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-night-text hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <TreeSidebar
                groups={groups}
                isEmployee={isEmployee}
                getLabel={getLabel}
                onNavigate={() => setMobileOpen(false)}
                onSearch={() => {
                  setMobileOpen(false);
                  setPaletteOpen(true);
                }}
              />
            </motion.aside>
            <div className="flex-1" onClick={() => setMobileOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3 — Main white panel */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-surface lg:min-h-0 lg:rounded-[28px] lg:border lg:border-line lg:shadow-[var(--shadow-card)]">
        <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open Navigation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-ink hover:bg-brand-soft lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            {!panelOpen && (
              <button
                onClick={() => setPanelOpen(true)}
                aria-label={tr('expandSidebar')}
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-ink hover:bg-brand-soft lg:flex"
              >
                {lang === 'ar' ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
              </button>
            )}
            {/* workspace chip with progress (≈ "Basic Storage 50GB / 100GB") */}
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand ring-4 ring-canvas">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 w-[168px] sm:w-[230px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-bold text-ink">{companyDisplay}</span>
                  <span dir="ltr" className="shrink-0 text-xs text-muted tabular-nums">
                    <b className="text-ink">{approved}</b> / {documents.length}
                  </span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar value={pct} label={tr('approvalProgress')} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label={tr('searchGlobal')}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-brand-soft lg:hidden"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={toggleLang}
              className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-brand-soft lg:hidden"
            >
              <Globe className="h-4 w-4 text-brand" />
              {lang === 'en' ? 'العربية' : 'EN'}
            </button>
            <ActionTooltip label={tr('navWorkflows')} side="bottom">
              <button
                onClick={() => setActiveModule('workflows')}
                aria-label={tr('navWorkflows')}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-brand-soft"
              >
                <Bell className="h-[18px] w-[18px]" />
                {pending > 0 && (
                  <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-white ring-2 ring-surface">
                    {pending}
                  </span>
                )}
              </button>
            </ActionTooltip>
            <div className="hidden items-center gap-3 ps-1 sm:flex">
              <Avatar name={profile?.displayName ?? 'K'} size={44} ring="ring-canvas-2" />
            </div>
          </div>
        </header>

        {/* breadcrumb row */}
        <nav aria-label="Breadcrumb" className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-3 text-sm sm:px-8">
          <span className="truncate text-muted">{tr('sectionOverview')}</span>
          <span className="text-line-strong" aria-hidden="true">/</span>
          <span className={`truncate ${activeModule === 'parties' && subRoute === 'new' ? 'text-muted' : 'font-semibold text-ink'}`}>
            {getLabel(activeNav)}
          </span>
          {activeModule === 'parties' && subRoute === 'new' ? (
            <>
              <span className="text-line-strong" aria-hidden="true">/</span>
              <span className="truncate font-semibold text-ink" aria-current="page">{tr('addNewPartyTitle')}</span>
            </>
          ) : (
            activeCount !== undefined && (
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand tabular-nums">
                {activeCount}
              </span>
            )
          )}
        </nav>

        {errorBanner && (
          <div role="alert" className="mx-4 mb-2 flex items-center justify-between gap-4 rounded-2xl border border-danger/30 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mx-8">
            <span className="truncate">{errorBanner}</span>
            <button onClick={clearErrorBanner} className="shrink-0 font-semibold underline">{tr('close')}</button>
          </div>
        )}

        <main className="min-h-0 w-full flex-1 overflow-y-auto px-4 pb-10 pt-4 sm:px-8">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} pages={palettePages} />

      {/* Toasts */}
      <div className="fixed bottom-5 end-5 z-[70] flex max-w-sm flex-col gap-2" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.16 }}
              className={`flex items-center justify-between gap-4 rounded-2xl border bg-surface px-4 py-3 text-sm font-medium shadow-[var(--shadow-lift)] ${
                toast.type === 'error' ? 'border-danger/40 text-red-800' : toast.type === 'success' ? 'border-success text-ink' : 'border-line-strong text-ink'
              }`}
            >
              <span>{toast.text}</span>
              <button onClick={() => dismissToast(toast.id)} aria-label={tr('close')} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
