/**
 * KLARO UI LAYER — BUILDER DASHBOARD VIEW
 * -----------------------------------------------------------------------------
 * Implementer control dashboard featuring:
 * - Operational KPIs across Identities, Entities, Documents, and Pending Approvals
 * - Admin "Builder Quick Setup Checklist" (Create Entities -> Dynamic Fields -> Workflow -> Blueprint)
 * - Recharts "Documents Created per Week" chart
 * - Live "Data Preview" JSON payload widget inspecting the last Document or Party
 * - Recent Activity feed linked to the full Audit Log
 */

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  Copy,
  FileText,
  ListChecks,
  Package,
  TrendingUp,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { approveDocumentWorkflow } from '../api/erpService.ts';
import { ActionTooltip } from '../components/ActionTooltip.tsx';
import { InfoTooltip } from '../components/InfoTooltip.tsx';
import { useErp } from '../context/ErpContext.tsx';
import { ErpDocument } from '../core/types.ts';
import { TranslationKey } from '../engine/i18n.ts';
import { AvatarStack, DocThumb, FolderCard, StatusChip } from '../components/ui.tsx';

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function docTone(status: string): 'success' | 'warning' | 'danger' | 'brand' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'warning';
}

function timeAgo(date: Date, lang: string): string {
  const diff = Math.max(0, Date.now() - date.getTime());
  const mins = Math.round(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'en', { numeric: 'auto' });
  if (mins < 60) return rtf.format(-Math.max(1, mins), 'minute');
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return rtf.format(-hrs, 'hour');
  return rtf.format(-Math.round(hrs / 24), 'day');
}

export function DashboardView() {
  const {
    profile,
    roles,
    users,
    parties,
    items,
    documents,
    customFields,
    auditLogs,
    systemSettings,
    lang,
    tr,
    can,
    setActiveModule,
    notify,
    dataLoading,
  } = useErp();

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<'DOCUMENT' | 'PARTY'>('DOCUMENT');
  const [copied, setCopied] = useState(false);
  const [tableTab, setTableTab] = useState<'recent' | 'pending' | 'approved'>('recent');
  const [selected, setSelected] = useState<string[]>([]);

  const isAdmin = profile?.roleCode === 'ADMIN';
  const canViewAuditLogs = isAdmin;

  const draftDocs = documents.filter((d) => d.status === 'DRAFT');
  const approvedDocs = documents.filter((d) => d.status === 'APPROVED');

  const recentDocs = useMemo(
    () => [...documents].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 3),
    [documents]
  );
  const tableDocs = useMemo(() => {
    const sorted = [...documents].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    if (tableTab === 'pending') return sorted.filter((d) => d.status === 'DRAFT').slice(0, 8);
    if (tableTab === 'approved') return sorted.filter((d) => d.status === 'APPROVED').slice(0, 8);
    return sorted.slice(0, 8);
  }, [documents, tableTab]);

  const clientCount = parties.filter((p) => p.partyType === 'CLIENT').length;
  const supplierCount = parties.filter((p) => p.partyType === 'SUPPLIER').length;
  const employeeCount = parties.filter((p) => p.partyType === 'EMPLOYEE').length;

  const productCount = items.filter((i) => i.itemType === 'PRODUCT').length;
  const serviceCount = items.filter((i) => i.itemType === 'SERVICE').length;

  // Weekly Document Volume for Recharts BarChart
  const weeklyDocData = useMemo(() => {
    const currentWeekStart = getStartOfWeek(new Date());
    const weeks: { key: number; label: string; count: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - i * 7);
      const label = start.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
      weeks.push({ key: start.getTime(), label, count: 0 });
    }

    for (const docItem of documents) {
      const docWeek = getStartOfWeek(docItem.createdAt).getTime();
      const bucket = weeks.find((w) => w.key === docWeek);
      if (bucket) {
        bucket.count += 1;
      }
    }

    return weeks;
  }, [documents, lang]);

  // Latest Created Document & Party for JSON Data Preview Widget
  const latestDocument = useMemo(() => {
    if (documents.length === 0) return null;
    const sorted = [...documents].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    const d = sorted[0];
    return {
      id: d.id,
      docNumber: d.docNumber,
      docType: d.docType,
      status: d.status,
      partyId: d.partyId,
      partyName: d.partyName,
      lines: d.lines,
      customAttributes: d.customAttributes ?? {},
      createdAt: d.createdAt.toISOString(),
    };
  }, [documents]);

  const latestParty = useMemo(() => {
    if (parties.length === 0) return null;
    const sorted = [...parties].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    const p = sorted[0];
    return {
      id: p.id,
      name: p.name,
      partyType: p.partyType,
      contactStatus: p.contactStatus,
      email: p.email ?? null,
      phone: p.phone ?? null,
      customAttributes: p.customAttributes ?? {},
      createdAt: p.createdAt.toISOString(),
    };
  }, [parties]);

  const activePreviewPayload =
    previewTarget === 'DOCUMENT' ? latestDocument : latestParty;

  const formattedPreviewJson = useMemo(() => {
    if (!activePreviewPayload) return '';
    return JSON.stringify(activePreviewPayload, null, 2);
  }, [activePreviewPayload]);

  const handleCopyJson = async () => {
    if (!formattedPreviewJson) return;
    try {
      await navigator.clipboard.writeText(formattedPreviewJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('info', 'Copy unavailable in this browser context.');
    }
  };

  // Builder Quick Setup Checklist (Admin / Implementer)
  const checklistSteps = useMemo(
    () => [
      {
        id: 'entities',
        done: parties.length > 0 && items.length > 0,
        title: tr('checklistStep1Title'),
        desc: tr('checklistStep1Desc'),
        cta: tr('checklistStep1Cta'),
        onClick: () => setActiveModule('parties'),
      },
      {
        id: 'schema',
        done: customFields.some((f) => f.isActive),
        title: tr('checklistStep2Title'),
        desc: tr('checklistStep2Desc'),
        cta: tr('checklistStep2Cta'),
        onClick: () => setActiveModule('config'),
      },
      {
        id: 'workflow',
        done: approvedDocs.length > 0,
        title: tr('checklistStep3Title'),
        desc: tr('checklistStep3Desc'),
        cta: tr('checklistStep3Cta'),
        onClick: () => setActiveModule('documents'),
      },
      {
        id: 'blueprint',
        done: auditLogs.length > 0 && roles.length > 0,
        title: tr('checklistStep4Title'),
        desc: tr('checklistStep4Desc'),
        cta: tr('checklistStep4Cta'),
        onClick: () => setActiveModule('architecture'),
      },
    ],
    [
      parties.length,
      items.length,
      customFields,
      approvedDocs.length,
      auditLogs.length,
      roles.length,
      tr,
      setActiveModule,
    ]
  );

  const completedChecklistCount = checklistSteps.filter((s) => s.done).length;
  const checklistPct = Math.round((completedChecklistCount / checklistSteps.length) * 100);

  const handleQuickApprove = async (docItem: ErpDocument) => {
    if (!profile) return;
    setApprovingId(docItem.id);
    try {
      await approveDocumentWorkflow(profile, docItem, roles);
      notify('success', `${docItem.docNumber} · ${tr('docStatusAPPROVED')}`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  if (dataLoading && parties.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface border border-line animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{tr('dashboardTitle')}</h1>
          <p className="text-sm text-muted">
            {tr('dashboardSubtitle')}
            {systemSettings?.defaultCurrency ? ` · ${systemSettings.defaultCurrency}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveModule('documents')}
          className="klaro-btn-primary inline-flex h-11 shrink-0 items-center gap-2 self-start px-5 text-sm whitespace-nowrap sm:self-auto"
        >
          <span>{tr('viewAllDocuments')}</span>
          <ArrowRight className={`h-4 w-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Recent edited — latest updated documents */}
      <section aria-labelledby="recent-edited">
        <h2 id="recent-edited" className="mb-4 text-lg font-bold text-ink">{tr('recentlyUpdated')}</h2>
        {recentDocs.length === 0 ? (
          <div className="klaro-card p-8 text-center text-sm text-muted">{tr('noPreviewData')}</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {recentDocs.map((d) => (
              <article key={d.id} className="group">
                <div className="relative">
                  <DocThumb
                    label={d.partyName}
                    tone={d.status === 'APPROVED' ? 'green' : d.status === 'REJECTED' ? 'amber' : 'brand'}
                  />
                  <button
                    type="button"
                    onClick={() => setActiveModule('documents')}
                    className="absolute start-[calc(50%-8px)] top-9 rounded-xl bg-night px-4 py-2 text-xs font-semibold text-white opacity-0 shadow-[var(--shadow-lift)] transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    {tr('seeDetails')}
                  </button>
                </div>
                <div className="mt-3 flex items-start justify-between gap-3 px-1">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{d.docNumber}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {d.partyName} · {timeAgo(d.updatedAt, lang)}
                    </p>
                  </div>
                  <StatusChip tone={docTone(d.status)}>{tr(`docStatus${d.status}` as TranslationKey)}</StatusChip>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Workspace folders — entity overview */}
      <section aria-labelledby="ws-folders">
        <h2 id="ws-folders" className="mb-4 text-lg font-bold text-ink">{tr('workspaceFolders')}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <FolderCard
            featured
            title={tr('kpiParties')}
            meta={`${parties.length} ${tr('recordsCount')} · ${clientCount} ${tr('typeCLIENT')} · ${supplierCount} ${tr('typeSUPPLIER')}`}
            names={parties.map((p) => p.name)}
            icon={<Users className="h-5 w-5" />}
            onClick={() => setActiveModule('parties')}
          />
          <FolderCard
            title={tr('kpiItems')}
            meta={`${items.length} ${tr('recordsCount')} · ${productCount} ${tr('typePRODUCT')} · ${serviceCount} ${tr('typeSERVICE')}`}
            names={items.map((i) => i.name)}
            icon={<Package className="h-5 w-5" />}
            onClick={() => setActiveModule('items')}
          />
          <FolderCard
            title={tr('kpiDocuments')}
            meta={`${documents.length} ${tr('recordsCount')} · ${approvedDocs.length} ${tr('docStatusAPPROVED')} · ${draftDocs.length} ${tr('docStatusDRAFT')}`}
            names={documents.map((d) => d.createdByName)}
            icon={<FileText className="h-5 w-5" />}
            onClick={() => setActiveModule('documents')}
          />
          <FolderCard
            title={tr('kpiUsers')}
            meta={`${users.length} ${tr("recordsCount")}`}
            names={users.map((u) => u.displayName)}
            icon={<Clock className="h-5 w-5" />}
            onClick={() => setActiveModule(isAdmin ? 'iam' : 'dashboard')}
          />
        </div>
      </section>

      {/* Tabs + documents table */}
      <section aria-labelledby="docs-table" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="docs-table" className="sr-only">{tr('kpiDocuments')}</h2>
          <div role="tablist" className="klaro-tabs">
            {([
              ['recent', tr('tabRecentlyOpened')],
              ['pending', tr('tabPending')],
              ['approved', tr('tabApproved')],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tableTab === id}
                onClick={() => {
                  setTableTab(id);
                  setSelected([]);
                }}
                className="klaro-tab"
              >
                {label}
              </button>
            ))}
          </div>
          {selected.length > 0 && (
            <span className="klaro-chip">{selected.length} {tr('selectedCount')}</span>
          )}
        </div>

        <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-start">
              <thead>
                <tr className="bg-canvas text-xs font-semibold text-muted">
                  <th className="w-12 py-3.5 ps-5">
                    <input
                      type="checkbox"
                      aria-label={tr('selectAllRows')}
                      className="h-4 w-4 rounded accent-[var(--color-brand)]"
                      checked={tableDocs.length > 0 && selected.length === tableDocs.length}
                      onChange={(e) => setSelected(e.target.checked ? tableDocs.map((d) => d.id) : [])}
                    />
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-start">{tr('colName')}</th>
                  <th scope="col" className="px-3 py-3.5 text-start">{tr('colOwner')}</th>
                  <th scope="col" className="px-3 py-3.5 text-start">{tr('colDate')}</th>
                  <th scope="col" className="px-3 py-3.5 text-start">{tr('status')}</th>
                  <th scope="col" className="px-5 py-3.5 text-end">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {tableDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">{tr('noPendingTasks')}</td>
                  </tr>
                )}
                {tableDocs.map((d) => {
                  const isSel = selected.includes(d.id);
                  return (
                    <tr
                      key={d.id}
                      className={`border-t border-line transition-colors ${isSel ? 'bg-brand-soft/70' : 'hover:bg-canvas/70'}`}
                    >
                      <td className="ps-5">
                        <input
                          type="checkbox"
                          aria-label={`${tr('selectRow')} ${d.docNumber}`}
                          className="h-4 w-4 rounded accent-[var(--color-brand)]"
                          checked={isSel}
                          onChange={() =>
                            setSelected((s) => (s.includes(d.id) ? s.filter((x) => x !== d.id) : [...s, d.id]))
                          }
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                            <FileText className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink">{d.docNumber}</p>
                            <p className="truncate text-xs text-muted">
                              {tr(`docType${d.docType}` as TranslationKey)} · {d.partyName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <AvatarStack names={[d.createdByName, d.approvedByName ?? '']} />
                      </td>
                      <td className="px-3 py-3.5 text-sm text-muted whitespace-nowrap">
                        {d.updatedAt.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusChip tone={docTone(d.status)}>{tr(`docStatus${d.status}` as TranslationKey)}</StatusChip>
                      </td>
                      <td className="px-5 py-3.5 text-end">
                        {d.status === 'DRAFT' && can('documents:approve') ? (
                          <button
                            type="button"
                            disabled={approvingId === d.id}
                            onClick={() => void handleQuickApprove(d)}
                            className="klaro-btn-primary h-9 px-4 text-xs disabled:opacity-60"
                          >
                            {tr('approveNow')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveModule('documents')}
                            className="h-9 rounded-xl border border-line px-4 text-xs font-semibold text-ink hover:bg-brand-soft"
                          >
                            {tr('seeDetails')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Builder Quick Setup Checklist (Admin / Implementer) */}
      {isAdmin && (
        <section className="rounded-[20px] border border-line bg-surface overflow-hidden">
          <div className="px-6 py-4 bg-surface border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ListChecks className="w-4 h-4 text-ink" />
              <div>
                <h2 className="text-sm font-bold text-ink">{tr('checklistTitle')}</h2>
                <p className="text-xs text-muted">{tr('checklistSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-ink tabular-nums">
                {completedChecklistCount}/{checklistSteps.length} {tr('checklistProgress')}
              </span>
              <div className="w-28 h-2 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full bg-success transition-all duration-300"
                  style={{ width: `${checklistPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-line">
            {checklistSteps.map((step) => (
              <div key={step.id} className="p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                    )}
                    <h3
                      className={`text-sm font-semibold ${
                        step.done ? 'text-muted' : 'text-ink'
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{step.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={step.onClick}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 hover:brightness-105 self-start whitespace-nowrap ${
                    step.done
                      ? 'border border-line text-ink/75 hover:bg-surface'
                      : 'bg-brand hover:bg-brand-hover text-white'
                  }`}
                >
                  <span>{step.cta}</span>
                  <ArrowRight className={`w-3 h-3 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main 2-Column Operational & Schema Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Weekly Documents Chart + Pending Approvals + Entity Composition */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
            <div className="px-6 py-4 bg-surface border-b border-line flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-ink" />
                <div>
                  <h2 className="text-sm font-bold text-ink">{tr('docsPerWeekTitle')}</h2>
                  <p className="text-xs text-muted">{tr('docsPerWeekSub')}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-ink tabular-nums">
                {documents.length} {tr('docsPerWeekLabel')}
              </span>
            </div>

            <div className="p-5 h-60 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyDocData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E2F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#17112B', fontSize: 12 }}
                    axisLine={{ stroke: '#CFC8E3' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#17112B', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#F3F1F9' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CFC8E3',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#17112B',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name={tr('docsPerWeekLabel')}
                    fill="#6D3DF2"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
            <div className="px-6 py-4 bg-surface border-b border-line flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">{tr('workflowQueue')}</h2>
              <span className="text-xs font-medium text-muted tabular-nums">
                {draftDocs.length} {tr('docStatusDRAFT')}
              </span>
            </div>

            {draftDocs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">
                {tr('noPendingTasks')}
              </div>
            ) : (
              <div className="divide-y divide-line">
                {draftDocs.slice(0, 6).map((docItem) => (
                  <div
                    key={docItem.id}
                    onClick={() => setActiveModule(isAdmin ? 'workflows' : 'documents')}
                    className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-surface transition-colors duration-200 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <span className="font-mono-tabular">{docItem.docNumber}</span>
                        <span aria-hidden="true" className="text-line-strong">·</span>
                        <span className="truncate">{docItem.partyName}</span>
                      </div>
                      <div className="text-xs text-muted mt-0.5 flex items-center gap-2">
                        <span>{tr(`docType${docItem.docType}`)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {docItem.lines.length} {tr('docLines')}
                        </span>
                      </div>
                    </div>

                    {can('documents:approve') ? (
                      <ActionTooltip label={tr('approveDocument')} side="top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleQuickApprove(docItem);
                          }}
                          disabled={approvingId === docItem.id}
                          className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-xs font-semibold transition-all duration-150 hover:brightness-105 whitespace-nowrap shrink-0"
                        >
                          {tr('approveNow')}
                        </button>
                      </ActionTooltip>
                    ) : (
                      <span className="text-xs font-medium text-brand whitespace-nowrap shrink-0">
                        {tr('docStatusDRAFT')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl shadow-[var(--shadow-card)] border border-line bg-canvas p-6 space-y-4">
            <h2 className="text-sm font-bold text-ink">{tr('entityComposition')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-1">
              <div className="space-y-1">
                <p className="text-xs text-muted">{tr('typeCLIENT')}</p>
                <p className="text-xl font-bold text-ink tabular-nums">{clientCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted">{tr('typeSUPPLIER')}</p>
                <p className="text-xl font-bold text-ink tabular-nums">{supplierCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted">{tr('typeEMPLOYEE')}</p>
                <p className="text-xl font-bold text-ink tabular-nums">{employeeCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted">{tr('typePRODUCT')}</p>
                <p className="text-xl font-bold text-ink tabular-nums">{productCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted">{tr('typeSERVICE')}</p>
                <p className="text-xl font-bold text-ink tabular-nums">{serviceCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Data Preview (Latest JSON Payload) + Recent Activity */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Live Schema Data Preview Widget */}
          {isAdmin && (
            <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
              <div className="px-6 py-4 bg-surface border-b border-line flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-brand" />
                  <h2 className="text-sm font-bold text-ink">{tr('dataPreviewTitle')}</h2>
                  <InfoTooltip text={tr('dataPreviewTooltip')} />
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-canvas border border-line">
                    <button
                      type="button"
                      onClick={() => setPreviewTarget('DOCUMENT')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        previewTarget === 'DOCUMENT'
                          ? 'bg-brand text-white'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {tr('dataPreviewLatestDoc')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTarget('PARTY')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        previewTarget === 'PARTY'
                          ? 'bg-brand text-white'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {tr('dataPreviewLatestParty')}
                    </button>
                  </div>

                  {formattedPreviewJson && (
                    <ActionTooltip label={tr('copyJson')} side="top">
                      <button
                        type="button"
                        onClick={() => void handleCopyJson()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-line bg-canvas hover:bg-surface text-xs font-medium text-ink transition-all duration-150 whitespace-nowrap"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copied ? tr('copiedJson') : tr('copyJson')}</span>
                      </button>
                    </ActionTooltip>
                  )}
                </div>
              </div>

              {formattedPreviewJson ? (
                <pre
                  dir="ltr"
                  className="p-4 text-xs font-mono-tabular text-ink bg-canvas overflow-x-auto max-h-64 leading-relaxed"
                >
                  {formattedPreviewJson}
                </pre>
              ) : (
                <div className="p-6 text-center text-xs text-muted">
                  {tr('noPreviewData')}
                </div>
              )}
            </div>
          )}

          {/* Recent Activity / Audit Trail Feed */}
          <div className="rounded-[20px] border border-line bg-surface overflow-hidden flex flex-col flex-1">
            <div className="px-6 py-4 bg-surface border-b border-line flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-ink">{tr('recentAuditTrail')}</h2>
                <span className="text-xs text-muted tabular-nums">({auditLogs.length})</span>
              </div>
              {canViewAuditLogs && (
                <button
                  type="button"
                  onClick={() => setActiveModule('auditLogs')}
                  className="text-xs font-semibold text-brand hover:underline whitespace-nowrap"
                >
                  {tr('viewAllAuditLogs')}
                </button>
              )}
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted flex-1 flex items-center justify-center">
                {tr('noAuditLogs')}
              </div>
            ) : (
              <div className="divide-y divide-line flex-1 overflow-y-auto max-h-[420px]">
                {auditLogs.slice(0, 12).map((log) => (
                  <div
                    key={log.id}
                    onClick={() => {
                      if (canViewAuditLogs) setActiveModule('auditLogs');
                    }}
                    className={`px-6 py-3.5 space-y-1 hover:bg-surface transition-colors duration-200 ${
                      canViewAuditLogs ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-ink truncate">
                        {log.entityLabel}
                      </span>
                      <span className="font-mono-tabular text-muted shrink-0">
                        {log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted flex-wrap">
                      <span>{log.actorName}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          log.toStatus === 'APPROVED'
                            ? 'text-success font-semibold'
                            : log.action === 'DELETED'
                            ? 'text-red-600 font-medium'
                            : 'text-ink/80 font-medium'
                        }
                      >
                        {log.fromStatus && log.toStatus
                          ? `${log.fromStatus} → ${log.toStatus}`
                          : log.action}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{log.entityType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
