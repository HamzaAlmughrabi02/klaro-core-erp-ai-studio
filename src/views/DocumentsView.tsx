/**
 * KLARO UI LAYER — DOCUMENT ENGINE & WORKFLOW APPROVALS
 * -----------------------------------------------------------------------------
 * Creates generic Documents linking an abstract Party and Catalog Item lines
 * plus Document-level dynamic Custom Fields. Drives the Draft -> Approved
 * Workflow Engine and inspects immutable Audit Logs per document.
 */

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, Lock, Plus, Search, Trash2, X, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  approveDocumentWorkflow,
  createDocument,
  deleteDraftDocument,
  rejectDocumentWorkflow,
} from '../api/erpService.ts';
import { ActionTooltip } from '../components/ActionTooltip.tsx';
import { DynamicFieldsRenderer } from '../components/DynamicFieldsRenderer.tsx';
import { EmptyState } from '../components/EmptyStateIllustration.tsx';
import { useErp } from '../context/ErpContext.tsx';
import {
  CustomAttributeValue,
  DocumentLine,
  DocumentStatus,
  DocumentType,
  ErpDocument,
  FIELD_LIMITS,
} from '../core/types.ts';
import { getFieldLabel, getFieldsForEntity } from '../engine/configEngine.ts';

export function DocumentsView() {
  const {
    documents,
    parties,
    items,
    customFields,
    auditLogs,
    roles,
    profile,
    lang,
    tr,
    can,
    notify,
    dataLoading,
  } = useErp();

  const docFields = useMemo(
    () => getFieldsForEntity(customFields, 'DOCUMENT'),
    [customFields]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentStatus>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [inspectDoc, setInspectDoc] = useState<ErpDocument | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create form state
  const [docNumber, setDocNumber] = useState('');
  const [docType, setDocType] = useState<DocumentType>('DRAFT_INVOICE');
  const [partyId, setPartyId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ itemId: string; quantity: number }[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, CustomAttributeValue | string>>({});
  const [saving, setSaving] = useState(false);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((d) => {
      const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
      const matchesQuery =
        !q ||
        d.docNumber.toLowerCase().includes(q) ||
        d.partyName.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [documents, searchQuery, statusFilter]);

  const activeInspectLogs = useMemo(() => {
    if (!inspectDoc) return [];
    return auditLogs.filter((l) => l.entityType === 'DOCUMENT' && l.entityId === inspectDoc.id);
  }, [auditLogs, inspectDoc]);

  // Keep inspectDoc synchronized with real-time updates
  const liveInspectDoc = useMemo(() => {
    if (!inspectDoc) return null;
    return documents.find((d) => d.id === inspectDoc.id) ?? inspectDoc;
  }, [documents, inspectDoc]);

  const openCreateModal = () => {
    setDocNumber(`DOC-2026-${String(documents.length + 1).padStart(3, '0')}`);
    setDocType('DRAFT_INVOICE');
    setPartyId(parties[0]?.id ?? '');
    setNotes('');
    setLines(items[0] ? [{ itemId: items[0].id, quantity: 1 }] : []);
    setCustomValues({});
    setCreateOpen(true);
  };

  const handleAddLine = () => {
    if (!items[0] || lines.length >= FIELD_LIMITS.DOC_LINES_MAX) return;
    setLines((prev) => [...prev, { itemId: items[0].id, quantity: 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const selectedParty = parties.find((p) => p.id === partyId);
    if (!selectedParty) {
      notify('error', tr('selectParty'));
      return;
    }

    const resolvedLines: DocumentLine[] = [];
    for (const rawLine of lines) {
      const foundItem = items.find((i) => i.id === rawLine.itemId);
      if (foundItem && rawLine.quantity > 0) {
        resolvedLines.push({
          itemId: foundItem.id,
          itemCode: foundItem.code,
          itemName: foundItem.name,
          unit: foundItem.unit,
          quantity: Number(rawLine.quantity),
        });
      }
    }

    if (resolvedLines.length === 0) {
      notify('error', tr('selectItem'));
      return;
    }

    setSaving(true);
    try {
      await createDocument(
        profile,
        {
          docNumber,
          docType,
          partyId: selectedParty.id,
          partyName: selectedParty.name,
          notes,
          lines: resolvedLines,
          customAttributes: customValues,
        },
        docFields
      );
      notify('success', `${docNumber} · ${tr('docStatusDRAFT')}`);
      setCreateOpen(false);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (docItem: ErpDocument) => {
    if (!profile) return;
    setApprovingId(docItem.id);
    try {
      await approveDocumentWorkflow(profile, docItem, roles);
      notify('success', `${docItem.docNumber} · ${tr('docStatusAPPROVED')}`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Workflow transition failed');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (docItem: ErpDocument) => {
    if (!profile) return;
    setApprovingId(docItem.id);
    try {
      await rejectDocumentWorkflow(profile, docItem, roles);
      notify('info', `${docItem.docNumber} · ${tr('docStatusREJECTED')}`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Workflow transition failed');
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeleteDraft = async (docItem: ErpDocument) => {
    if (!profile) return;
    try {
      await deleteDraftDocument(profile, docItem);
      notify('info', `${docItem.docNumber} · ${tr('delete')}`);
      setConfirmDeleteId(null);
      if (inspectDoc?.id === docItem.id) setInspectDoc(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2B4A]">
            {tr('documentsTitle')}
          </h1>
          <p className="text-sm text-[#1A2B4A]/65">{tr('documentsSubtitle')}</p>
        </div>

        {can('documents:create') && (
          <ActionTooltip label={tr('addDocument')} side="bottom">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] text-white text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{tr('addDocument')}</span>
            </button>
          </ActionTooltip>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#F3F5F7] border border-slate-200 self-start">
          {(['ALL', 'DRAFT', 'APPROVED', 'REJECTED'] as const).map((status) => {
            const active = statusFilter === status;
            const label = status === 'ALL' ? tr('all') : tr(`docStatus${status}`);
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
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

        <div className="relative w-full md:w-72">
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

      {/* Documents Data Grid */}
      <div className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
        {dataLoading && documents.length === 0 ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((r) => (
              <div key={r} className="h-10 rounded bg-[#F3F5F7] animate-pulse" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <EmptyState
            variant="documents"
            title={tr('noRecordsTitle')}
            description={tr('noRecordsHint')}
            ctaLabel={can('documents:create') ? tr('addFirstDocumentCta') : undefined}
            onAction={can('documents:create') ? openCreateModal : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-[#F3F5F7] border-b border-slate-200 text-xs font-semibold text-[#1A2B4A]/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docNumber')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docType')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docPARTY')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('docLines')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('status')}</th>
                  {docFields.map((cf) => (
                    <th key={cf.id} className="py-3 px-4 text-start whitespace-nowrap">
                      {getFieldLabel(cf, lang)}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-end whitespace-nowrap">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredDocs.map((docItem) => (
                  <tr
                    key={docItem.id}
                    onClick={() => setInspectDoc(docItem)}
                    className="h-11 hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
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
                    <td className="py-2.5 px-4 text-xs text-[#1A2B4A]/75 tabular-nums whitespace-nowrap">
                      {docItem.lines.length}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          docItem.status === 'APPROVED'
                            ? 'text-[#2ECC71]'
                            : docItem.status === 'REJECTED'
                            ? 'text-red-600'
                            : 'text-[#FF7A00]'
                        }`}
                      >
                        {docItem.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {docItem.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                        <span>{tr(`docStatus${docItem.status}`)}</span>
                      </span>
                    </td>
                    {docFields.map((cf) => {
                      const val = docItem.customAttributes?.[cf.fieldKey];
                      return (
                        <td
                          key={cf.id}
                          className="py-2.5 px-4 text-xs text-[#1A2B4A]/80 whitespace-nowrap"
                        >
                          {val === undefined || val === '' ? '—' : String(val)}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-4 text-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-2">
                        <ActionTooltip label={tr('documentDetail')} side="top">
                          <button
                            onClick={() => setInspectDoc(docItem)}
                            aria-label={tr('documentDetail')}
                            className="p-1.5 rounded-md text-[#1A2B4A]/70 hover:text-[#1A2B4A] hover:bg-slate-200/70 hover:scale-105 active:scale-95 transition-all duration-150"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </ActionTooltip>
                        {docItem.status === 'DRAFT' && can('documents:approve') && (
                          <>
                            <ActionTooltip label={tr('approveDocument')} side="top">
                              <button
                                onClick={() => void handleApprove(docItem)}
                                disabled={approvingId === docItem.id}
                                className="px-2.5 py-1 rounded-md bg-[#2ECC71] hover:bg-[#27ae60] disabled:opacity-60 text-white text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105"
                              >
                                {tr('approveNow')}
                              </button>
                            </ActionTooltip>
                            <ActionTooltip label={tr('rejectNow')} side="top">
                              <button
                                onClick={() => void handleReject(docItem)}
                                disabled={approvingId === docItem.id}
                                className="px-2.5 py-1 rounded-md border border-red-200 bg-white hover:bg-red-50 disabled:opacity-60 text-red-700 text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95"
                              >
                                {tr('rejectNow')}
                              </button>
                            </ActionTooltip>
                          </>
                        )}
                        {docItem.status === 'DRAFT' &&
                          can('entities:delete') &&
                          (confirmDeleteId === docItem.id ? (
                            <button
                              onClick={() => void handleDeleteDraft(docItem)}
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-transform"
                            >
                              {tr('confirmDelete')}
                            </button>
                          ) : (
                            <ActionTooltip label={tr('delete')} side="top">
                              <button
                                onClick={() => setConfirmDeleteId(docItem.id)}
                                aria-label={tr('delete')}
                                className="p-1.5 rounded-md text-[#1A2B4A]/50 hover:text-red-600 hover:bg-red-50 hover:scale-105 active:scale-95 transition-all duration-150"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </ActionTooltip>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Generic Document Drawer */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 bg-[#1A2B4A]/35 flex justify-end"
          >
            <div className="flex-1" onClick={() => setCreateOpen(false)} />
            <motion.div
              initial={{ x: lang === 'ar' ? -480 : 480 }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? -480 : 480 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xl bg-white h-full border-s border-slate-200 flex flex-col"
            >
              <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h2 className="text-base font-bold text-[#1A2B4A]">{tr('addDocument')}</h2>
                <button
                  onClick={() => setCreateOpen(false)}
                  className="p-2 rounded-lg text-[#1A2B4A]/60 hover:bg-[#F3F5F7]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => void handleCreateSubmit(e)} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#1A2B4A]">
                      {tr('docNumber')} <span className="text-[#FF7A00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono-tabular text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#1A2B4A]">
                      {tr('docType')}
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as DocumentType)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                    >
                      <option value="DRAFT_INVOICE">{tr('docTypeDRAFT_INVOICE')}</option>
                      <option value="PURCHASE_ORDER">{tr('docTypePURCHASE_ORDER')}</option>
                      <option value="GENERIC_DOC">{tr('docTypeGENERIC_DOC')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#1A2B4A]">
                    {tr('docPARTY')} <span className="text-[#FF7A00]">*</span>
                  </label>
                  <select
                    required
                    value={partyId}
                    onChange={(e) => setPartyId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                  >
                    <option value="">{tr('selectParty')}</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({tr(`type${p.partyType}`)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Lines Builder */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#1A2B4A]">
                      {tr('docLines')} <span className="text-[#FF7A00]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF7A00] hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{tr('addLine')}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {lines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <select
                          value={line.itemId}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, itemId: e.target.value } : l))
                            )
                          }
                          className="col-span-8 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1A2B4A]"
                        >
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.code} · {it.name} ({it.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          required
                          value={line.quantity}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, quantity: Number(e.target.value) } : l
                              )
                            )
                          }
                          className="col-span-3 h-10 px-2.5 rounded-lg border border-slate-200 font-mono-tabular text-sm text-[#1A2B4A]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 1}
                          className="col-span-1 h-10 flex items-center justify-center text-[#1A2B4A]/45 hover:text-red-600 disabled:opacity-30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#1A2B4A]">
                    {tr('notes')}
                  </label>
                  <textarea
                    rows={3}
                    maxLength={FIELD_LIMITS.NOTES_MAX}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-200 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                  />
                </div>

                <DynamicFieldsRenderer
                  fields={docFields}
                  values={customValues}
                  onChange={(k, v) => setCustomValues((prev) => ({ ...prev, [k]: v }))}
                />

                <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-[#1A2B4A] hover:bg-[#F3F5F7]"
                  >
                    {tr('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] disabled:opacity-60 text-white text-xs font-semibold"
                  >
                    {tr('create')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Inspection & Workflow Drawer */}
      <AnimatePresence>
        {liveInspectDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 bg-[#1A2B4A]/35 flex justify-end"
          >
            <div className="flex-1" onClick={() => setInspectDoc(null)} />
            <motion.div
              initial={{ x: lang === 'ar' ? -480 : 480 }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? -480 : 480 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-xl bg-white h-full border-s border-slate-200 flex flex-col"
            >
              <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono-tabular text-sm font-bold text-[#1A2B4A]">
                    {liveInspectDoc.docNumber}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span
                    className={`text-xs font-semibold ${
                      liveInspectDoc.status === 'APPROVED'
                        ? 'text-[#2ECC71]'
                        : liveInspectDoc.status === 'REJECTED'
                        ? 'text-red-600'
                        : 'text-[#FF7A00]'
                    }`}
                  >
                    {tr(`docStatus${liveInspectDoc.status}`)}
                  </span>
                </div>
                <button
                  onClick={() => setInspectDoc(null)}
                  className="p-2 rounded-lg text-[#1A2B4A]/60 hover:bg-[#F3F5F7]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Workflow Banner */}
                <div className="p-4 rounded-xl bg-[#F3F5F7] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {liveInspectDoc.status === 'DRAFT' ? (
                    <>
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-[#1A2B4A]">
                          {tr('docStatusDRAFT')} → {tr('docStatusAPPROVED')} / {tr('docStatusREJECTED')}
                        </p>
                        <p className="text-xs text-[#1A2B4A]/65">{tr('approvalRoleHint')}</p>
                      </div>
                      {can('documents:approve') && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => void handleApprove(liveInspectDoc)}
                            disabled={approvingId === liveInspectDoc.id}
                            className="px-3.5 py-2 rounded-lg bg-[#2ECC71] hover:bg-[#27ae60] disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap"
                          >
                            {tr('approveNow')}
                          </button>
                          <button
                            onClick={() => void handleReject(liveInspectDoc)}
                            disabled={approvingId === liveInspectDoc.id}
                            className="px-3.5 py-2 rounded-lg border border-red-200 bg-white hover:bg-red-50 disabled:opacity-60 text-red-700 text-xs font-semibold whitespace-nowrap"
                          >
                            {tr('rejectNow')}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2.5 text-xs text-[#1A2B4A]">
                      <Lock
                        className={`w-4 h-4 shrink-0 ${
                          liveInspectDoc.status === 'APPROVED' ? 'text-[#2ECC71]' : 'text-red-600'
                        }`}
                      />
                      <span>
                        {tr('workflowLockedNote')} (
                        {liveInspectDoc.status === 'APPROVED'
                          ? `${tr('approvedBy')}: `
                          : `${tr('rejectedBy')}: `}
                        <strong>
                          {liveInspectDoc.status === 'APPROVED'
                            ? liveInspectDoc.approvedByName || 'Admin'
                            : liveInspectDoc.rejectedByName || 'Admin'}
                        </strong>
                        )
                      </span>
                    </div>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[#1A2B4A]/55">{tr('docType')}</p>
                    <p className="font-semibold text-[#1A2B4A] mt-0.5">
                      {tr(`docType${liveInspectDoc.docType}`)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#1A2B4A]/55">{tr('docPARTY')}</p>
                    <p className="font-semibold text-[#1A2B4A] mt-0.5">
                      {liveInspectDoc.partyName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#1A2B4A]/55">{tr('createdBy')}</p>
                    <p className="font-medium text-[#1A2B4A] mt-0.5">
                      {liveInspectDoc.createdByName}
                    </p>
                  </div>
                  {docFields.map((cf) => (
                    <div key={cf.id}>
                      <p className="text-[#1A2B4A]/55">{getFieldLabel(cf, lang)}</p>
                      <p className="font-medium text-[#1A2B4A] mt-0.5">
                        {String(liveInspectDoc.customAttributes?.[cf.fieldKey] ?? '—')}
                      </p>
                    </div>
                  ))}
                </div>

                {liveInspectDoc.notes && (
                  <div className="text-xs space-y-1">
                    <p className="text-[#1A2B4A]/55">{tr('notes')}</p>
                    <p className="text-[#1A2B4A] leading-relaxed">{liveInspectDoc.notes}</p>
                  </div>
                )}

                {/* Item Lines Table */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-[#1A2B4A]">{tr('docLines')}</h3>
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-start text-xs">
                      <thead className="bg-[#F3F5F7] border-b border-slate-200 text-[#1A2B4A]/70">
                        <tr>
                          <th className="py-2.5 px-3 text-start">{tr('itemCode')}</th>
                          <th className="py-2.5 px-3 text-start">{tr('itemName')}</th>
                          <th className="py-2.5 px-3 text-start">{tr('unit')}</th>
                          <th className="py-2.5 px-3 text-end">{tr('quantity')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {liveInspectDoc.lines.map((line, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-mono-tabular font-semibold">
                              {line.itemCode}
                            </td>
                            <td className="py-2.5 px-3">{line.itemName}</td>
                            <td className="py-2.5 px-3 text-[#1A2B4A]/65">{line.unit}</td>
                            <td className="py-2.5 px-3 text-end font-mono-tabular font-semibold">
                              {line.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Document Audit Trail */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <h3 className="text-xs font-bold text-[#1A2B4A]">{tr('workflowHistory')}</h3>
                  {activeInspectLogs.length === 0 ? (
                    <p className="text-xs text-[#1A2B4A]/55">{tr('noAuditLogs')}</p>
                  ) : (
                    <div className="space-y-2">
                      {activeInspectLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-lg bg-[#F3F5F7] border border-slate-200 text-xs flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="font-semibold text-[#1A2B4A]">{log.actorName}</span>
                            <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
                            <span className="font-medium text-[#2ECC71]">
                              {log.fromStatus && log.toStatus
                                ? `${log.fromStatus} → ${log.toStatus}`
                                : log.action}
                            </span>
                          </div>
                          <span className="font-mono-tabular text-[#1A2B4A]/55">
                            {log.createdAt.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
