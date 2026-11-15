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

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
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

  const isAdmin = profile?.roleCode === 'ADMIN';
  const canViewAuditLogs = isAdmin;

  const draftDocs = documents.filter((d) => d.status === 'DRAFT');
  const approvedDocs = documents.filter((d) => d.status === 'APPROVED');

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
        <div className="h-8 w-64 bg-[#F3F5F7] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[#F3F5F7] border border-slate-200 animate-pulse" />
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
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2B4A]">
            {tr('dashboardTitle')}
          </h1>
          <p className="text-sm text-[#1A2B4A]/65">
            {tr('dashboardSubtitle')}
            {systemSettings?.defaultCurrency ? ` · ${systemSettings.defaultCurrency}` : ''}
          </p>
        </div>
        <ActionTooltip label={tr('viewAllDocuments')} side="bottom">
          <button
            type="button"
            onClick={() => setActiveModule('documents')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] text-white text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <span>{tr('viewAllDocuments')}</span>
            <ArrowRight className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>
        </ActionTooltip>
      </div>

      {/* 5 Core Generic KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => {
            if (isAdmin) setActiveModule('iam');
          }}
          className={`text-start p-5 rounded-xl shadow-sm bg-[#F3F5F7] border border-slate-200 transition-all duration-200 space-y-3 ${
            isAdmin
              ? 'hover:shadow-md hover:-translate-y-1 hover:border-[#1A2B4A]/40 cursor-pointer'
              : 'cursor-default'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#1A2B4A]/65">
            <span>{tr('kpiUsers')}</span>
            <Users className="w-4 h-4 text-[#1A2B4A]" />
          </div>
          <div className="text-3xl font-bold text-[#1A2B4A] tabular-nums">
            {users.length}
          </div>
          <div className="text-xs text-[#2ECC71] font-medium flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span>{tr('kpiUsersSub')}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule('parties')}
          className="text-start p-5 rounded-xl shadow-sm bg-[#F3F5F7] border border-slate-200 hover:shadow-md hover:-translate-y-1 hover:border-[#1A2B4A]/40 transition-all duration-200 cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#1A2B4A]/65">
            <span>{tr('kpiParties')}</span>
            <Users className="w-4 h-4 text-[#1A2B4A]" />
          </div>
          <div className="text-3xl font-bold text-[#1A2B4A] tabular-nums">
            {parties.length}
          </div>
          <div className="text-xs text-[#1A2B4A]/65 truncate">
            {tr('kpiPartiesSub')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule('items')}
          className="text-start p-5 rounded-xl shadow-sm bg-[#F3F5F7] border border-slate-200 hover:shadow-md hover:-translate-y-1 hover:border-[#1A2B4A]/40 transition-all duration-200 cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#1A2B4A]/65">
            <span>{tr('kpiItems')}</span>
            <Package className="w-4 h-4 text-[#1A2B4A]" />
          </div>
          <div className="text-3xl font-bold text-[#1A2B4A] tabular-nums">
            {items.length}
          </div>
          <div className="text-xs text-[#1A2B4A]/65 truncate">
            {tr('kpiItemsSub')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule('documents')}
          className="text-start p-5 rounded-xl shadow-sm bg-[#F3F5F7] border border-slate-200 hover:shadow-md hover:-translate-y-1 hover:border-[#1A2B4A]/40 transition-all duration-200 cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#1A2B4A]/65">
            <span>{tr('kpiDocuments')}</span>
            <FileText className="w-4 h-4 text-[#2ECC71]" />
          </div>
          <div className="text-3xl font-bold text-[#1A2B4A] tabular-nums">
            {documents.length}
          </div>
          <div className="text-xs text-[#2ECC71] font-medium tabular-nums">
            {approvedDocs.length} {tr('docStatusAPPROVED')} · {draftDocs.length} {tr('docStatusDRAFT')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveModule(isAdmin ? 'workflows' : 'documents')}
          className="text-start p-5 rounded-xl shadow-sm bg-[#1A2B4A] text-white border border-[#1A2B4A] hover:shadow-md hover:-translate-y-1 hover:bg-[#1A2B4A]/95 transition-all duration-200 cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-medium text-white/75">
            <span>{tr('kpiPendingTasks')}</span>
            <Clock className="w-4 h-4 text-[#FF7A00]" />
          </div>
          <div className="text-3xl font-bold text-white tabular-nums">
            {draftDocs.length}
          </div>
          <div className="text-xs text-[#FF7A00] font-medium truncate">
            {tr('kpiPendingSub')}
          </div>
        </button>
      </section>

      {/* Builder Quick Setup Checklist (Admin / Implementer) */}
      {isAdmin && (
        <section className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ListChecks className="w-4 h-4 text-[#1A2B4A]" />
              <div>
                <h2 className="text-sm font-bold text-[#1A2B4A]">{tr('checklistTitle')}</h2>
                <p className="text-xs text-[#1A2B4A]/60">{tr('checklistSubtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-[#1A2B4A] tabular-nums">
                {completedChecklistCount}/{checklistSteps.length} {tr('checklistProgress')}
              </span>
              <div className="w-28 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-[#2ECC71] transition-all duration-300"
                  style={{ width: `${checklistPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200">
            {checklistSteps.map((step) => (
              <div key={step.id} className="p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-[#1A2B4A]/30 shrink-0 mt-0.5" />
                    )}
                    <h3
                      className={`text-sm font-semibold ${
                        step.done ? 'text-[#1A2B4A]/65' : 'text-[#1A2B4A]'
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#1A2B4A]/65 leading-relaxed">{step.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={step.onClick}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105 self-start whitespace-nowrap ${
                    step.done
                      ? 'border border-slate-200 text-[#1A2B4A]/75 hover:bg-[#F3F5F7]'
                      : 'bg-[#FF7A00] hover:bg-[#e56e00] text-white'
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
          <div className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#1A2B4A]" />
                <div>
                  <h2 className="text-sm font-bold text-[#1A2B4A]">{tr('docsPerWeekTitle')}</h2>
                  <p className="text-xs text-[#1A2B4A]/60">{tr('docsPerWeekSub')}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#1A2B4A] tabular-nums">
                {documents.length} {tr('docsPerWeekLabel')}
              </span>
            </div>

            <div className="p-5 h-60 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyDocData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#1A2B4A', fontSize: 11 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#1A2B4A', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#F3F5F7' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#1A2B4A',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name={tr('docsPerWeekLabel')}
                    fill="#1A2B4A"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1A2B4A]">{tr('workflowQueue')}</h2>
              <span className="text-xs font-medium text-[#1A2B4A]/60 tabular-nums">
                {draftDocs.length} {tr('docStatusDRAFT')}
              </span>
            </div>

            {draftDocs.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#1A2B4A]/60">
                {tr('noPendingTasks')}
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {draftDocs.slice(0, 6).map((docItem) => (
                  <div
                    key={docItem.id}
                    onClick={() => setActiveModule(isAdmin ? 'workflows' : 'documents')}
                    className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#1A2B4A]">
                        <span className="font-mono-tabular">{docItem.docNumber}</span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="truncate">{docItem.partyName}</span>
                      </div>
                      <div className="text-xs text-[#1A2B4A]/60 mt-0.5 flex items-center gap-2">
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
                          className="px-3.5 py-1.5 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] disabled:opacity-60 text-white text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105 whitespace-nowrap shrink-0"
                        >
                          {tr('approveNow')}
                        </button>
                      </ActionTooltip>
                    ) : (
                      <span className="text-xs font-medium text-[#FF7A00] whitespace-nowrap shrink-0">
                        {tr('docStatusDRAFT')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl shadow-sm border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#1A2B4A]">{tr('entityComposition')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-1">
              <div className="space-y-1">
                <p className="text-xs text-[#1A2B4A]/60">{tr('typeCLIENT')}</p>
                <p className="text-xl font-bold text-[#1A2B4A] tabular-nums">{clientCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#1A2B4A]/60">{tr('typeSUPPLIER')}</p>
                <p className="text-xl font-bold text-[#1A2B4A] tabular-nums">{supplierCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#1A2B4A]/60">{tr('typeEMPLOYEE')}</p>
                <p className="text-xl font-bold text-[#1A2B4A] tabular-nums">{employeeCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#1A2B4A]/60">{tr('typePRODUCT')}</p>
                <p className="text-xl font-bold text-[#1A2B4A] tabular-nums">{productCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#1A2B4A]/60">{tr('typeSERVICE')}</p>
                <p className="text-xl font-bold text-[#1A2B4A] tabular-nums">{serviceCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Data Preview (Latest JSON Payload) + Recent Activity */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Live Schema Data Preview Widget */}
          {isAdmin && (
            <div className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
              <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#FF7A00]" />
                  <h2 className="text-sm font-bold text-[#1A2B4A]">{tr('dataPreviewTitle')}</h2>
                  <InfoTooltip text={tr('dataPreviewTooltip')} />
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-white border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreviewTarget('DOCUMENT')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        previewTarget === 'DOCUMENT'
                          ? 'bg-[#1A2B4A] text-white'
                          : 'text-[#1A2B4A]/65 hover:text-[#1A2B4A]'
                      }`}
                    >
                      {tr('dataPreviewLatestDoc')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTarget('PARTY')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        previewTarget === 'PARTY'
                          ? 'bg-[#1A2B4A] text-white'
                          : 'text-[#1A2B4A]/65 hover:text-[#1A2B4A]'
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
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:scale-105 active:scale-95 text-xs font-medium text-[#1A2B4A] transition-all duration-150 whitespace-nowrap"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-[#2ECC71]" />
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
                  className="p-4 text-xs font-mono-tabular text-[#1A2B4A] bg-white overflow-x-auto max-h-64 leading-relaxed"
                >
                  {formattedPreviewJson}
                </pre>
              ) : (
                <div className="p-6 text-center text-xs text-[#1A2B4A]/60">
                  {tr('noPreviewData')}
                </div>
              )}
            </div>
          )}

          {/* Recent Activity / Audit Trail Feed */}
          <div className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden flex flex-col flex-1">
            <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#1A2B4A]">{tr('recentAuditTrail')}</h2>
                <span className="text-xs text-[#1A2B4A]/55 tabular-nums">({auditLogs.length})</span>
              </div>
              {canViewAuditLogs && (
                <button
                  type="button"
                  onClick={() => setActiveModule('auditLogs')}
                  className="text-xs font-semibold text-[#FF7A00] hover:underline whitespace-nowrap"
                >
                  {tr('viewAllAuditLogs')}
                </button>
              )}
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#1A2B4A]/60 flex-1 flex items-center justify-center">
                {tr('noAuditLogs')}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 flex-1 overflow-y-auto max-h-[420px]">
                {auditLogs.slice(0, 12).map((log) => (
                  <div
                    key={log.id}
                    onClick={() => {
                      if (canViewAuditLogs) setActiveModule('auditLogs');
                    }}
                    className={`px-6 py-3.5 space-y-1 hover:bg-slate-50 transition-colors duration-200 ${
                      canViewAuditLogs ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#1A2B4A] truncate">
                        {log.entityLabel}
                      </span>
                      <span className="font-mono-tabular text-[#1A2B4A]/50 shrink-0">
                        {log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#1A2B4A]/65 flex-wrap">
                      <span>{log.actorName}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          log.toStatus === 'APPROVED'
                            ? 'text-[#2ECC71] font-semibold'
                            : log.action === 'DELETED'
                            ? 'text-red-600 font-medium'
                            : 'text-[#1A2B4A]/80 font-medium'
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
