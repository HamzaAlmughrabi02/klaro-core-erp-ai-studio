/**
 * KLARO UI LAYER — WORKFLOW ENGINE UI (/dashboard/workflows)
 * -----------------------------------------------------------------------------
 * Admin approval console listing pending DRAFT documents for single-click
 * Approve / Reject transitions backed by the Workflow Engine and Firestore,
 * plus a recent processed decisions history table.
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, GitPullRequest, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { approveDocumentWorkflow, rejectDocumentWorkflow } from '../api/erpService.ts';
import { ActionTooltip } from '../components/ActionTooltip.tsx';
import { EmptyState } from '../components/EmptyStateIllustration.tsx';
import { useErp } from '../context/ErpContext.tsx';
import { ErpDocument } from '../core/types.ts';

export function WorkflowsView() {
  const { documents, roles, profile, tr, notify, setActiveModule } = useErp();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingDocs = useMemo(
    () => documents.filter((d) => d.status === 'DRAFT'),
    [documents]
  );

  const processedDocs = useMemo(
    () => documents.filter((d) => d.status === 'APPROVED' || d.status === 'REJECTED'),
    [documents]
  );

  const handleApprove = async (docItem: ErpDocument) => {
    if (!profile) return;
    setProcessingId(docItem.id);
    try {
      await approveDocumentWorkflow(profile, docItem, roles);
      notify('success', `${docItem.docNumber} · ${tr('workflowApprovedToast')}`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (docItem: ErpDocument) => {
    if (!profile) return;
    setProcessingId(docItem.id);
    try {
      await rejectDocumentWorkflow(profile, docItem, roles);
      notify('info', `${docItem.docNumber} · ${tr('workflowRejectedToast')}`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <GitPullRequest className="w-5 h-5 text-[#1A2B4A]" />
            <h1 className="text-2xl font-bold tracking-tight text-[#1A2B4A]">
              {tr('workflowsTitle')}
            </h1>
          </div>
          <p className="text-sm text-[#1A2B4A]/65">{tr('workflowsSubtitle')}</p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold tabular-nums">
          <span className="text-[#FF7A00]">
            {pendingDocs.length} {tr('docStatusDRAFT')}
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="text-[#2ECC71]">
            {documents.filter((d) => d.status === 'APPROVED').length} {tr('docStatusAPPROVED')}
          </span>
        </div>
      </div>

      {/* Pending Approvals Queue */}
      <section className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF7A00]" />
            <h2 className="text-sm font-bold text-[#1A2B4A]">{tr('workflowQueue')}</h2>
          </div>
          <span className="text-xs font-semibold text-[#1A2B4A]/65 tabular-nums">
            {pendingDocs.length}
          </span>
        </div>

        {pendingDocs.length === 0 ? (
          <EmptyState
            variant="documents"
            title={tr('noPendingTasks')}
            description={tr('workflowsSubtitle')}
            ctaLabel={tr('addDocument')}
            onAction={() => setActiveModule('documents')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-[#F3F5F7]/70 border-b border-slate-200 text-xs font-semibold text-[#1A2B4A]/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docNumber')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docType')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docPARTY')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('createdBy')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docLines')}</th>
                  <th className="py-3 px-4 text-end whitespace-nowrap">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {pendingDocs.map((docItem) => (
                  <tr
                    key={docItem.id}
                    className="h-12 hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono-tabular text-xs font-semibold text-[#1A2B4A] whitespace-nowrap">
                      {docItem.docNumber}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#1A2B4A]/80 whitespace-nowrap">
                      {tr(`docType${docItem.docType}`)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-[#1A2B4A] whitespace-nowrap">
                      {docItem.partyName}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#1A2B4A]/70 whitespace-nowrap">
                      {docItem.createdByName}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono-tabular text-[#1A2B4A]/75 whitespace-nowrap">
                      {docItem.lines.length}
                    </td>
                    <td className="py-2.5 px-4 text-end whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <ActionTooltip label={tr('approveDocument')} side="top">
                          <button
                            type="button"
                            onClick={() => void handleApprove(docItem)}
                            disabled={processingId === docItem.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2ECC71] hover:bg-[#27ae60] disabled:opacity-60 text-white text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{tr('approveNow')}</span>
                          </button>
                        </ActionTooltip>
                        <ActionTooltip label={tr('rejectNow')} side="top">
                          <button
                            type="button"
                            onClick={() => void handleReject(docItem)}
                            disabled={processingId === docItem.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 disabled:opacity-60 text-red-700 text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{tr('rejectNow')}</span>
                          </button>
                        </ActionTooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Processed Decisions */}
      {processedDocs.length > 0 && (
        <section className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1A2B4A]">
              {tr('workflowRecentDecisions')}
            </h2>
            <span className="text-xs font-semibold text-[#1A2B4A]/65 tabular-nums">
              {processedDocs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-[#F3F5F7]/70 border-b border-slate-200 text-xs font-semibold text-[#1A2B4A]/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docNumber')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docType')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docPARTY')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('status')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('auditActor')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {processedDocs.slice(0, 10).map((docItem) => (
                  <tr key={docItem.id} className="h-11 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono-tabular text-xs font-semibold text-[#1A2B4A] whitespace-nowrap">
                      {docItem.docNumber}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#1A2B4A]/80 whitespace-nowrap">
                      {tr(`docType${docItem.docType}`)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-[#1A2B4A] whitespace-nowrap">
                      {docItem.partyName}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          docItem.status === 'APPROVED' ? 'text-[#2ECC71]' : 'text-red-600'
                        }`}
                      >
                        {docItem.status === 'APPROVED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{tr(`docStatus${docItem.status}`)}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#1A2B4A]/70 whitespace-nowrap">
                      {docItem.status === 'APPROVED'
                        ? docItem.approvedByName || 'Admin'
                        : docItem.rejectedByName || 'Admin'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </motion.div>
  );
}
