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
          <History className="w-5 h-5 text-[#1A2B4A]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#1A2B4A]">
            {tr('auditLogsTitle')}
          </h1>
        </div>
        <p className="text-sm text-[#1A2B4A]/65">{tr('auditLogsSubtitle')}</p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#F3F5F7] border border-slate-200 self-start">
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
                    ? 'bg-white text-[#1A2B4A] border border-slate-200/80 shadow-sm'
                    : 'text-[#1A2B4A]/65 hover:text-[#1A2B4A]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-[#1A2B4A]/45 absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr('searchPlaceholder')}
            className="w-full h-10 ps-9 pe-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
          />
        </div>
      </div>

      {/* Audit History Table: User, Action, Entity Type, Timestamp, View Details */}
      <div className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
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
                <tr className="bg-[#F3F5F7] border-b border-slate-200 text-xs font-semibold text-[#1A2B4A]/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('auditTimestamp')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('auditActor')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('auditAction')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('auditEntity')}</th>
                  <th className="py-3 px-4 text-end whitespace-nowrap">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
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
                      className="h-12 hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-mono-tabular text-xs text-[#1A2B4A]/65 whitespace-nowrap">
                        {log.createdAt.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#1A2B4A] whitespace-nowrap">
                        {log.actorName}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono-tabular text-xs font-semibold ${
                            isApproved
                              ? 'text-[#2ECC71]'
                              : isRejectedOrDeleted
                              ? 'text-red-600'
                              : isCreated
                              ? 'text-[#1A2B4A]'
                              : 'text-[#FF7A00]'
                          }`}
                        >
                          {actionCode}
                        </span>
                        <span className="text-xs text-[#1A2B4A]/55 ms-2">
                          ({log.entityLabel})
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-[#1A2B4A]/80 whitespace-nowrap">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-[#F3F5F7] hover:scale-105 active:scale-95 text-xs font-semibold text-[#1A2B4A] transition-all duration-150"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#1A2B4A]/70" />
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
            className="fixed inset-0 z-50 bg-[#1A2B4A]/40 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="h-14 px-6 bg-[#F3F5F7] border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <History className="w-4 h-4 text-[#1A2B4A] shrink-0" />
                  <h2 className="text-sm font-bold text-[#1A2B4A] truncate">
                    {tr('auditPayloadModalTitle')}
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleCopyJson()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-[#1A2B4A]"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-[#2ECC71]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? tr('copiedJson') : tr('copyJson')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    aria-label={tr('close')}
                    className="p-1.5 rounded-lg text-[#1A2B4A]/60 hover:bg-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#F3F5F7] border border-slate-200 text-xs">
                  <div>
                    <p className="text-[#1A2B4A]/55">{tr('auditActor')}</p>
                    <p className="font-semibold text-[#1A2B4A] mt-0.5">{selectedLog.actorName}</p>
                  </div>
                  <div>
                    <p className="text-[#1A2B4A]/55">{tr('auditAction')}</p>
                    <p className="font-mono-tabular font-semibold text-[#1A2B4A] mt-0.5">
                      {formatActionCode(selectedLog)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#1A2B4A]/55">{tr('auditTimestamp')}</p>
                    <p className="font-mono-tabular text-[#1A2B4A] mt-0.5">
                      {selectedLog.createdAt.toLocaleString()}
                    </p>
                  </div>
                </div>

                <pre
                  dir="ltr"
                  className="p-4 rounded-xl border border-slate-200 bg-[#F3F5F7]/60 text-xs font-mono-tabular text-[#1A2B4A] overflow-x-auto max-h-96 leading-relaxed"
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
