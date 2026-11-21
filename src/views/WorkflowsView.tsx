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
            <GitPullRequest className="w-5 h-5 text-ink" />
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {tr('workflowsTitle')}
            </h1>
          </div>
          <p className="text-sm text-muted">{tr('workflowsSubtitle')}</p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold tabular-nums">
          <span className="text-brand">
            {pendingDocs.length} {tr('docStatusDRAFT')}
          </span>
          <span aria-hidden="true" className="text-line-strong">·</span>
          <span className="text-success">
            {documents.filter((d) => d.status === 'APPROVED').length} {tr('docStatusAPPROVED')}
          </span>
        </div>
      </div>

      {/* Pending Approvals Queue */}
      <section className="rounded-2xl shadow-[var(--shadow-card)] border border-line bg-canvas overflow-hidden">
        <div className="px-6 py-4 bg-surface border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-bold text-ink">{tr('workflowQueue')}</h2>
          </div>
          <span className="text-xs font-semibold text-muted tabular-nums">
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
                <tr className="bg-surface/70 border-b border-line text-xs font-semibold text-ink/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docNumber')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docType')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docPARTY')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('createdBy')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docLines')}</th>
                  <th className="py-3 px-4 text-end whitespace-nowrap">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {pendingDocs.map((docItem) => (
                  <tr
                    key={docItem.id}
                    className="h-12 hover:bg-surface transition-colors duration-200 cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono-tabular text-xs font-semibold text-ink whitespace-nowrap">
                      {docItem.docNumber}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-ink/80 whitespace-nowrap">
                      {tr(`docType${docItem.docType}`)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-ink whitespace-nowrap">
                      {docItem.partyName}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-ink/70 whitespace-nowrap">
                      {docItem.createdByName}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono-tabular text-ink/75 whitespace-nowrap">
                      {docItem.lines.length}
                    </td>
                    <td className="py-2.5 px-4 text-end whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <ActionTooltip label={tr('approveDocument')} side="top">
                          <button
                            type="button"
                            onClick={() => void handleApprove(docItem)}
                            disabled={processingId === docItem.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success hover:bg-success-hover disabled:opacity-60 text-white text-xs font-semibold transition-all duration-150 hover:brightness-105"
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-canvas hover:bg-red-50 disabled:opacity-60 text-red-700 text-xs font-semibold transition-all duration-150"
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
        <section className="rounded-2xl shadow-[var(--shadow-card)] border border-line bg-canvas overflow-hidden">
          <div className="px-6 py-4 bg-surface border-b border-line flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">
              {tr('workflowRecentDecisions')}
            </h2>
            <span className="text-xs font-semibold text-muted tabular-nums">
              {processedDocs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-surface/70 border-b border-line text-xs font-semibold text-ink/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docNumber')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docType')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docPARTY')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('status')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('auditActor')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {processedDocs.slice(0, 10).map((docItem) => (
                  <tr key={docItem.id} className="h-11 hover:bg-surface transition-colors">
                    <td className="py-2.5 px-4 font-mono-tabular text-xs font-semibold text-ink whitespace-nowrap">
                      {docItem.docNumber}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-ink/80 whitespace-nowrap">
                      {tr(`docType${docItem.docType}`)}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-ink whitespace-nowrap">
                      {docItem.partyName}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          docItem.status === 'APPROVED' ? 'text-success' : 'text-red-600'
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
                    <td className="py-2.5 px-4 text-xs text-ink/70 whitespace-nowrap">
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
