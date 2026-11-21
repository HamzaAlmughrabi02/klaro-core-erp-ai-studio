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
            <SlidersHorizontal className="w-5 h-5 text-ink" />
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {tr('configTitle')}
            </h1>
            <InfoTooltip text={tr('configTooltip')} />
          </div>
          <p className="text-sm text-muted">{tr('configSubtitle')}</p>
        </div>

        <ActionTooltip label={tr('addCustomField')} side="bottom">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-all duration-150 hover:brightness-105 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{tr('addCustomField')}</span>
          </button>
        </ActionTooltip>
      </div>

      {/* Target Entity Filter + Schema Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface border border-line self-start">
          {(['ALL', 'PARTY', 'ITEM', 'DOCUMENT'] as const).map((ent) => {
            const active = entityFilter === ent;
            const label = ent === 'ALL' ? tr('all') : tr(`entity${ent}`);
            return (
              <button
                key={ent}
                onClick={() => setEntityFilter(ent)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-canvas text-ink border border-line/80'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-muted tabular-nums">
          <Database className="w-3.5 h-3.5 text-muted" />
          <span>
            {filteredFields.filter((f) => f.isActive).length} {tr('fieldStatusActive')} ·{' '}
            {filteredFields.length} {tr('all')}
          </span>
        </div>
      </div>

      {/* Custom Fields Table */}
      <div className="rounded-2xl shadow-[var(--shadow-card)] border border-line bg-canvas overflow-hidden">
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
                <tr className="bg-canvas border-b border-line text-xs font-semibold text-ink/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('targetEntity')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('fieldName')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('fieldType')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('isRequiredField')}</th>
                  <th className="py-3 px-4 text-end whitespace-nowrap">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filteredFields.map((cf) => (
                  <tr key={cf.id} className="h-12 hover:bg-surface transition-colors duration-200 cursor-pointer">
                    <td className="py-2.5 px-4 text-xs font-semibold text-ink whitespace-nowrap">
                      {tr(`entity${cf.entityType}`)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">
                          {getFieldLabel(cf, lang)}
                        </span>
                        <span aria-hidden="true" className="text-line-strong">·</span>
                        <span className="font-mono-tabular text-xs text-muted">
                          {cf.fieldKey}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-ink/80 whitespace-nowrap">
                      {tr(`field${cf.fieldType}`)}
                      {cf.options && cf.options.length > 0 ? ` (${cf.options.join(', ')})` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      <span
                        className={
                          cf.isRequired ? 'text-brand font-semibold' : 'text-muted'
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
                            className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline transition-transform ${
                              cf.isActive ? 'text-success' : 'text-muted'
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
                            className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold transition-transform"
                          >
                            {tr('confirmDelete')}
                          </button>
                        ) : (
                          <ActionTooltip label={tr('delete')} side="top">
                            <button
                              onClick={() => setConfirmDeleteId(cf.id)}
                              aria-label={tr('delete')}
                              className="p-1.5 rounded-md text-muted hover:text-red-600 hover:bg-red-50 transition-all duration-150"
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
            className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-canvas rounded-2xl shadow-[var(--shadow-card)] border border-line overflow-hidden"
            >
              <div className="h-14 px-6 bg-surface border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-ink" />
                  <h2 className="text-sm font-bold text-ink">{tr('addCustomField')}</h2>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  aria-label={tr('close')}
                  className="p-1.5 rounded-xl text-muted hover:bg-canvas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => void handleCreate(e)} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-ink">
                      {tr('targetEntity')} <span className="text-brand">*</span>
                    </label>
                    <select
                      value={entityType}
                      onChange={(e) => setEntityType(e.target.value as CustomEntityType)}
                      className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-sm text-ink focus:outline-none focus:border-ink"
                    >
                      <option value="PARTY">{tr('entityPARTY')}</option>
                      <option value="ITEM">{tr('entityITEM')}</option>
                      <option value="DOCUMENT">{tr('entityDOCUMENT')}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-ink">
                      {tr('fieldType')} <span className="text-brand">*</span>
                    </label>
                    <select
                      value={fieldType}
                      onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
                      className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-sm text-ink focus:outline-none focus:border-ink"
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
                    <label className="block text-xs font-medium text-ink">
                      {tr('labelEn')} <span className="text-brand">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={labelEn}
                      onChange={(e) => handleLabelEnChange(e.target.value)}
                      placeholder="Tax ID"
                      className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink focus:outline-none focus:border-ink"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-ink">
                      {tr('labelAr')}
                    </label>
                    <input
                      type="text"
                      value={labelAr}
                      onChange={(e) => setLabelAr(e.target.value)}
                      placeholder="الرقم الضريبي"
                      className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink focus:outline-none focus:border-ink"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-ink">
                    {tr('fieldKey')} <span className="text-brand">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fieldKey}
                    onChange={(e) => setFieldKey(e.target.value)}
                    placeholder="tax_id"
                    className="w-full h-10 px-3 rounded-xl border border-line font-mono-tabular text-sm text-ink focus:outline-none focus:border-ink"
                  />
                </div>

                {fieldType === 'SELECT' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-ink">
                      {tr('selectOptions')} <span className="text-brand">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      placeholder="EMEA, MENA, APAC, AMER"
                      className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink"
                    />
                  </div>
                )}

                {/* Is Required Toggle */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-line bg-surface">
                  <span className="text-sm font-medium text-ink">
                    {tr('isRequiredField')}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isRequired}
                    onClick={() => setIsRequired((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      isRequired ? 'bg-brand' : 'bg-line-strong'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-canvas transition-transform ${
                        isRequired
                          ? lang === 'ar'
                            ? '-translate-x-5'
                            : 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-line text-xs font-medium text-ink hover:bg-surface"
                  >
                    {tr('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-xs font-semibold transition-colors"
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
