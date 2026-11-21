/**
 * KLARO UI LAYER — AUDIT LOG SCREEN (/dashboard/audit-logs)
 * -----------------------------------------------------------------------------
 * Admin-only immutable trail fetched live from Firestore with columns:
 * User, Action (e.g. CREATED_PARTY, APPROVED_DOCUMENT, REJECTED_DOCUMENT),
 * Entity Type, Timestamp, and a "View Details" button opening a JSON modal.
 */

import { useMemo, useState } from 'react';
import { Check, Copy, Eye, History, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ActionTooltip } from '../components/ActionTooltip.tsx';
import { EmptyState } from '../components/EmptyStateIllustration.tsx';
import { useErp } from '../context/ErpContext.tsx';
import { AuditEntityType, AuditLog } from '../core/types.ts';

function formatActionCode(log: AuditLog): string {
  if (log.toStatus === 'APPROVED') return 'APPROVED_DOCUMENT';
  if (log.toStatus === 'REJECTED') return 'REJECTED_DOCUMENT';
  if (log.action === 'PERMISSION_GRANTED' || log.action === 'PERMISSION_REVOKED') {
    return log.action;
  }
  return `${log.action}_${log.entityType}`;
}

function formatEntityLabel(entityType: AuditEntityType, tr: (k: any) => string): string {
  switch (entityType) {
    case 'PARTY':
      return tr('entityPARTY');
    case 'ITEM':
      return tr('entityITEM');
    case 'DOCUMENT':
      return tr('entityDOCUMENT');
    case 'CUSTOM_FIELD':
      return tr('navConfig');
    case 'USER':
      return tr('navIam');
    case 'SYSTEM_SETTINGS':
      return tr('navSettings');
    case 'TEMPORARY_PERMISSION':
      return tr('entityTEMPORARY_PERMISSION');
    default:
      return entityType;
  }
}

export function AuditLogsView() {
  const {
    auditLogs,
    parties,
    items,
    documents,
    customFields,
    users,
    temporaryPermissions,
    tr,
    notify,
  } = useErp();

  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<'ALL' | AuditEntityType>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const actionCode = formatActionCode(log).toLowerCase();
      const matchesEntity = entityFilter === 'ALL' || log.entityType === entityFilter;
      const matchesQuery =
        !q ||
        log.actorName.toLowerCase().includes(q) ||
        log.entityLabel.toLowerCase().includes(q) ||
        actionCode.includes(q) ||
        log.entityType.toLowerCase().includes(q);
      return matchesEntity && matchesQuery;
    });
  }, [auditLogs, searchQuery, entityFilter]);

  const selectedPayloadJson = useMemo(() => {
    if (!selectedLog) return '';

    let matchedRecord: unknown = null;
    if (selectedLog.entityType === 'PARTY') {
      matchedRecord = parties.find((p) => p.id === selectedLog.entityId) ?? null;
    } else if (selectedLog.entityType === 'ITEM') {
      matchedRecord = items.find((i) => i.id === selectedLog.entityId) ?? null;
    } else if (selectedLog.entityType === 'DOCUMENT') {
      matchedRecord = documents.find((d) => d.id === selectedLog.entityId) ?? null;
    } else if (selectedLog.entityType === 'CUSTOM_FIELD') {
      matchedRecord = customFields.find((f) => f.id === selectedLog.entityId) ?? null;
    } else if (selectedLog.entityType === 'USER') {
      matchedRecord = users.find((u) => u.id === selectedLog.entityId) ?? null;
    } else if (selectedLog.entityType === 'TEMPORARY_PERMISSION') {
      matchedRecord = temporaryPermissions.find((tp) => tp.id === selectedLog.entityId) ?? null;
    }

    const payload = {
      eventId: selectedLog.id,
      actionCode: formatActionCode(selectedLog),
      action: selectedLog.action,
      entityType: selectedLog.entityType,
      entityId: selectedLog.entityId,
      entityLabel: selectedLog.entityLabel,
      actor: {
        uid: selectedLog.actorUid,
        name: selectedLog.actorName,
      },
      transition:
        selectedLog.fromStatus || selectedLog.toStatus
          ? { from: selectedLog.fromStatus ?? null, to: selectedLog.toStatus ?? null }
          : null,
      timestamp: selectedLog.createdAt.toISOString(),
      currentEntitySnapshot: matchedRecord,
    };

    return JSON.stringify(payload, null, 2);
  }, [selectedLog, parties, items, documents, customFields, users, temporaryPermissions]);

  const handleCopyJson = async () => {
    if (!selectedPayloadJson) return;
    try {
      await navigator.clipboard.writeText(selectedPayloadJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('info', 'Copy unavailable in this browser context.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-ink" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {tr('auditLogsTitle')}
          </h1>
        </div>
        <p className="text-sm text-muted">{tr('auditLogsSubtitle')}</p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-surface border border-line self-start">
          {(
            [
              'ALL',
              'DOCUMENT',
              'PARTY',
              'ITEM',
              'CUSTOM_FIELD',
              'USER',
              'TEMPORARY_PERMISSION',
              'SYSTEM_SETTINGS',
            ] as const
          ).map((ent) => {
            const active = entityFilter === ent;
            const label = ent === 'ALL' ? tr('all') : formatEntityLabel(ent, tr);
            return (
              <button
                key={ent}
                onClick={() => setEntityFilter(ent)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-canvas text-ink border border-line/80 shadow-[var(--shadow-card)]'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-muted absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr('searchPlaceholder')}
            className="w-full h-10 ps-9 pe-3 rounded-xl border border-line bg-canvas text-sm text-ink focus:outline-none focus:border-ink"
          />
        </div>
      </div>

      {/* Audit History Table: User, Action, Entity Type, Timestamp, View Details */}
      <div className="rounded-2xl shadow-[var(--shadow-card)] border border-line bg-canvas overflow-hidden">
        {filteredLogs.length === 0 ? (
          <EmptyState
            variant="audit"
            title={tr('noRecordsTitle')}
            description={tr('noAuditLogs')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-canvas border-b border-line text-xs font-semibold text-ink/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('auditTimestamp')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('auditActor')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('auditAction')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('auditEntity')}</th>
                  <th className="py-3 px-4 text-end whitespace-nowrap">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filteredLogs.map((log) => {
                  const actionCode = formatActionCode(log);
                  const isApproved = log.toStatus === 'APPROVED';
                  const isRejectedOrDeleted =
                    log.toStatus === 'REJECTED' ||
                    log.action === 'DELETED' ||
                    log.action === 'PERMISSION_REVOKED';
                  const isCreated = log.action === 'CREATED';

                  return (
                    <tr
                      key={log.id}
                      onClick={() => {
                        setCopied(false);
                        setSelectedLog(log);
                      }}
                      className="h-12 hover:bg-surface transition-colors duration-200 cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-mono-tabular text-xs text-muted whitespace-nowrap">
                        {log.createdAt.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-ink whitespace-nowrap">
                        {log.actorName}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono-tabular text-xs font-semibold ${
                            isApproved
                              ? 'text-success'
                              : isRejectedOrDeleted
                              ? 'text-red-600'
                              : isCreated
                              ? 'text-ink'
                              : 'text-brand'
                          }`}
                        >
                          {actionCode}
                        </span>
                        <span className="text-xs text-muted ms-2">
                          ({log.entityLabel})
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-ink/80 whitespace-nowrap">
                        {formatEntityLabel(log.entityType, tr)}
                      </td>
                      <td className="py-2.5 px-4 text-end whitespace-nowrap">
                        <ActionTooltip label={tr('auditPayloadModalTitle')} side="top">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCopied(false);
                              setSelectedLog(log);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-canvas hover:bg-surface text-xs font-semibold text-ink transition-all duration-150"
                          >
                            <Eye className="w-3.5 h-3.5 text-ink/70" />
                            <span>{tr('viewDetails')}</span>
                          </button>
                        </ActionTooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Payload Inspection Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-canvas rounded-2xl shadow-[var(--shadow-card)] border border-line overflow-hidden"
            >
              <div className="h-14 px-6 bg-surface border-b border-line flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <History className="w-4 h-4 text-ink shrink-0" />
                  <h2 className="text-sm font-bold text-ink truncate">
                    {tr('auditPayloadModalTitle')}
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleCopyJson()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-line bg-canvas hover:bg-surface text-xs font-medium text-ink"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? tr('copiedJson') : tr('copyJson')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    aria-label={tr('close')}
                    className="p-1.5 rounded-xl text-muted hover:bg-canvas"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface border border-line text-xs">
                  <div>
                    <p className="text-muted">{tr('auditActor')}</p>
                    <p className="font-semibold text-ink mt-0.5">{selectedLog.actorName}</p>
                  </div>
                  <div>
                    <p className="text-muted">{tr('auditAction')}</p>
                    <p className="font-mono-tabular font-semibold text-ink mt-0.5">
                      {formatActionCode(selectedLog)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">{tr('auditTimestamp')}</p>
                    <p className="font-mono-tabular text-ink mt-0.5">
                      {selectedLog.createdAt.toLocaleString()}
                    </p>
                  </div>
                </div>

                <pre
                  dir="ltr"
                  className="p-4 rounded-2xl border border-line bg-surface/60 text-xs font-mono-tabular text-ink overflow-x-auto max-h-96 leading-relaxed"
                >
                  {selectedPayloadJson}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
