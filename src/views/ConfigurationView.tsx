/**
 * KLARO UI LAYER — CONFIGURATION ENGINE STUDIO (/dashboard/configuration)
 * -----------------------------------------------------------------------------
 * Zero-code schema builder allowing users to define Custom Fields on abstract
 * entities (Party, Item, Document). Role Guard is temporarily bypassed for
 * Preview testing so any authenticated user can create, toggle, or remove fields.
 */

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  createCustomFieldDefinition,
  deleteCustomFieldDefinition,
  toggleCustomFieldActive,
} from '../api/erpService.ts';
import { ActionTooltip } from '../components/ActionTooltip.tsx';
import { EmptyState } from '../components/EmptyStateIllustration.tsx';
import { InfoTooltip } from '../components/InfoTooltip.tsx';
import { useErp } from '../context/ErpContext.tsx';
import {
  CustomEntityType,
  CustomFieldDefinition,
  CustomFieldType,
} from '../core/types.ts';
import { getFieldLabel, isValidFieldKey, toFieldKey } from '../engine/configEngine.ts';

export function ConfigurationView() {
  const { customFields, profile, lang, tr, notify } = useErp();

  const [entityFilter, setEntityFilter] = useState<'ALL' | CustomEntityType>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Add Custom Field Modal Form State
  const [entityType, setEntityType] = useState<CustomEntityType>('PARTY');
  const [labelEn, setLabelEn] = useState('');
  const [labelAr, setLabelAr] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('TEXT');
  const [optionsText, setOptionsText] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredFields = useMemo(() => {
    return customFields.filter(
      (f) => entityFilter === 'ALL' || f.entityType === entityFilter
    );
  }, [customFields, entityFilter]);

  const openCreateModal = () => {
    setEntityType(entityFilter === 'ALL' ? 'PARTY' : entityFilter);
    setLabelEn('');
    setLabelAr('');
    setFieldKey('');
    setFieldType('TEXT');
    setOptionsText('');
    setIsRequired(false);
    setModalOpen(true);
  };

  const handleLabelEnChange = (val: string) => {
    setLabelEn(val);
    setFieldKey(toFieldKey(val));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const normalizedKey = fieldKey.trim().toLowerCase();
    if (!isValidFieldKey(normalizedKey)) {
      notify('error', 'Field Key must match lowercase snake_case (e.g., tax_id, region).');
      return;
    }

    const parsedOptions =
      fieldType === 'SELECT'
        ? optionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 20)
        : undefined;

    if (fieldType === 'SELECT' && (!parsedOptions || parsedOptions.length === 0)) {
      notify('error', 'Please enter at least one dropdown option.');
      return;
    }

    setSaving(true);
    try {
      await createCustomFieldDefinition(profile, {
        entityType,
        fieldKey: normalizedKey,
        labelEn,
        labelAr: labelAr.trim() || labelEn.trim(),
        fieldType,
        options: parsedOptions,
        isRequired,
      });
      notify('success', `${tr('customFieldCreatedToast')} (${entityType}.${normalizedKey})`);
      setModalOpen(false);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save custom field');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (field: CustomFieldDefinition) => {
    if (!profile) return;
    setTogglingId(field.id);
    try {
      await toggleCustomFieldActive(profile, field);
      notify(
        'info',
        `${getFieldLabel(field, lang)} · ${
          !field.isActive ? tr('fieldStatusActive') : tr('fieldStatusInactive')
        }`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (field: CustomFieldDefinition) => {
    if (!profile) return;
    try {
      await deleteCustomFieldDefinition(profile, field);
      notify('info', `${field.fieldKey} · ${tr('delete')}`);
      setConfirmDeleteId(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to delete field');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Studio Header — Prominent Orange "Add Custom Field" CTA in Top Right */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-[#1A2B4A]" />
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2B4A]">
              {tr('configTitle')}
            </h1>
            <InfoTooltip text={tr('configTooltip')} />
          </div>
          <p className="text-sm text-[#1A2B4A]/65">{tr('configSubtitle')}</p>
        </div>

        <ActionTooltip label={tr('addCustomField')} side="bottom">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] text-white text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{tr('addCustomField')}</span>
          </button>
        </ActionTooltip>
      </div>

      {/* Target Entity Filter + Schema Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#F3F5F7] border border-slate-200 self-start">
          {(['ALL', 'PARTY', 'ITEM', 'DOCUMENT'] as const).map((ent) => {
            const active = entityFilter === ent;
            const label = ent === 'ALL' ? tr('all') : tr(`entity${ent}`);
            return (
              <button
                key={ent}
                onClick={() => setEntityFilter(ent)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-[#1A2B4A] border border-slate-200/80'
                    : 'text-[#1A2B4A]/65 hover:text-[#1A2B4A]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-[#1A2B4A]/65 tabular-nums">
          <Database className="w-3.5 h-3.5 text-[#1A2B4A]/60" />
          <span>
            {filteredFields.filter((f) => f.isActive).length} {tr('fieldStatusActive')} ·{' '}
            {filteredFields.length} {tr('all')}
          </span>
        </div>
      </div>

      {/* Custom Fields Table */}
      <div className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
        {filteredFields.length === 0 ? (
          <EmptyState
            variant="custom"
            title={tr('noRecordsTitle')}
            description={tr('noRecordsHint')}
            ctaLabel={tr('addFirstCustomFieldCta')}
            onAction={openCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-[#F3F5F7] border-b border-slate-200 text-xs font-semibold text-[#1A2B4A]/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('targetEntity')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('fieldName')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('fieldType')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('isRequiredField')}</th>
                  <th className="py-3 px-4 text-end whitespace-nowrap">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredFields.map((cf) => (
                  <tr key={cf.id} className="h-12 hover:bg-slate-50 transition-colors duration-200 cursor-pointer">
                    <td className="py-2.5 px-4 text-xs font-semibold text-[#1A2B4A] whitespace-nowrap">
                      {tr(`entity${cf.entityType}`)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1A2B4A]">
                          {getFieldLabel(cf, lang)}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="font-mono-tabular text-xs text-[#1A2B4A]/55">
                          {cf.fieldKey}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#1A2B4A]/80 whitespace-nowrap">
                      {tr(`field${cf.fieldType}`)}
                      {cf.options && cf.options.length > 0 ? ` (${cf.options.join(', ')})` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      <span
                        className={
                          cf.isRequired ? 'text-[#FF7A00] font-semibold' : 'text-[#1A2B4A]/60'
                        }
                      >
                        {cf.isRequired ? tr('required') : tr('optional')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-end whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-3">
                        <ActionTooltip label={tr('fieldStatus')} side="top">
                          <button
                            onClick={() => void handleToggleActive(cf)}
                            disabled={togglingId === cf.id}
                            className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline transition-transform hover:scale-105 active:scale-95 ${
                              cf.isActive ? 'text-[#2ECC71]' : 'text-[#1A2B4A]/45'
                            }`}
                          >
                            {cf.isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>
                              {cf.isActive ? tr('fieldStatusActive') : tr('fieldStatusInactive')}
                            </span>
                          </button>
                        </ActionTooltip>

                        {confirmDeleteId === cf.id ? (
                          <button
                            onClick={() => void handleDelete(cf)}
                            className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-transform"
                          >
                            {tr('confirmDelete')}
                          </button>
                        ) : (
                          <ActionTooltip label={tr('delete')} side="top">
                            <button
                              onClick={() => setConfirmDeleteId(cf.id)}
                              aria-label={tr('delete')}
                              className="p-1.5 rounded-md text-[#1A2B4A]/50 hover:text-red-600 hover:bg-red-50 hover:scale-105 active:scale-95 transition-all duration-150"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </ActionTooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Custom Field Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 bg-[#1A2B4A]/40 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="h-14 px-6 bg-[#F3F5F7] border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#1A2B4A]" />
                  <h2 className="text-sm font-bold text-[#1A2B4A]">{tr('addCustomField')}</h2>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  aria-label={tr('close')}
                  className="p-1.5 rounded-lg text-[#1A2B4A]/60 hover:bg-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => void handleCreate(e)} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#1A2B4A]">
                      {tr('targetEntity')} <span className="text-[#FF7A00]">*</span>
                    </label>
                    <select
                      value={entityType}
                      onChange={(e) => setEntityType(e.target.value as CustomEntityType)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                    >
                      <option value="PARTY">{tr('entityPARTY')}</option>
                      <option value="ITEM">{tr('entityITEM')}</option>
                      <option value="DOCUMENT">{tr('entityDOCUMENT')}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#1A2B4A]">
                      {tr('fieldType')} <span className="text-[#FF7A00]">*</span>
                    </label>
                    <select
                      value={fieldType}
                      onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                    >
                      <option value="TEXT">{tr('fieldTEXT')}</option>
                      <option value="NUMBER">{tr('fieldNUMBER')}</option>
                      <option value="BOOLEAN">{tr('fieldBOOLEAN')}</option>
                      <option value="DATE">{tr('fieldDATE')}</option>
                      <option value="SELECT">{tr('fieldSELECT')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#1A2B4A]">
                      {tr('labelEn')} <span className="text-[#FF7A00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={labelEn}
                      onChange={(e) => handleLabelEnChange(e.target.value)}
                      placeholder="Tax ID"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#1A2B4A]">
                      {tr('labelAr')}
                    </label>
                    <input
                      type="text"
                      value={labelAr}
                      onChange={(e) => setLabelAr(e.target.value)}
                      placeholder="الرقم الضريبي"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#1A2B4A]">
                    {tr('fieldKey')} <span className="text-[#FF7A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fieldKey}
                    onChange={(e) => setFieldKey(e.target.value)}
                    placeholder="tax_id"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono-tabular text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                  />
                </div>

                {fieldType === 'SELECT' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#1A2B4A]">
                      {tr('selectOptions')} <span className="text-[#FF7A00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      placeholder="EMEA, MENA, APAC, AMER"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A2B4A]"
                    />
                  </div>
                )}

                {/* Is Required Toggle */}
                <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 bg-[#F3F5F7]">
                  <span className="text-sm font-medium text-[#1A2B4A]">
                    {tr('isRequiredField')}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isRequired}
                    onClick={() => setIsRequired((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      isRequired ? 'bg-[#FF7A00]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                        isRequired
                          ? lang === 'ar'
                            ? '-translate-x-5'
                            : 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-[#1A2B4A] hover:bg-[#F3F5F7]"
                  >
                    {tr('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                  >
                    {tr('save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
