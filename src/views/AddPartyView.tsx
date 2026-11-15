/**
 * KLARO UI LAYER — ADD NEW PARTY DYNAMIC FORM (/dashboard/parties/new)
 * -----------------------------------------------------------------------------
 * Demonstrates the zero-code Configuration Engine in action: fetches active
 * CustomFieldDefinition metadata for `PARTY` directly from the API, dynamically
 * builds typed form controls (String, Number, Boolean, Date, Select), validates
 * base + dynamic fields with per-field inline errors, and submits unified
 * payloads to the backend.
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Database, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { createParty, fetchCustomFieldsByEntity } from '../api/erpService.ts';
import { DynamicFieldsRenderer } from '../components/DynamicFieldsRenderer.tsx';
import { useErp } from '../context/ErpContext.tsx';
import {
  ContactStatus,
  CustomAttributeValue,
  CustomFieldDefinition,
  FIELD_LIMITS,
  PartyType,
} from '../core/types.ts';

export function AddPartyView() {
  const { profile, lang, tr, notify, setActiveModule } = useErp();

  const [dynamicFields, setDynamicFields] = useState<CustomFieldDefinition[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Base Party Fields
  const [name, setName] = useState('');
  const [partyType, setPartyType] = useState<PartyType>('CLIENT');
  const [contactStatus, setContactStatus] = useState<ContactStatus>('ACTIVE');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Dynamic Custom Field Values keyed by `fieldKey`
  const [customValues, setCustomValues] = useState<Record<string, CustomAttributeValue | string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Fetch CustomFieldDefinition metadata for PARTY directly from the API on mount
  useEffect(() => {
    let cancelled = false;
    async function loadPartySchema() {
      setLoadingSchema(true);
      setSchemaError(null);
      try {
        const fields = await fetchCustomFieldsByEntity('PARTY');
        if (!cancelled) {
          setDynamicFields(fields);
        }
      } catch (err) {
        if (!cancelled) {
          setSchemaError(
            err instanceof Error ? err.message : 'Failed to fetch Party custom fields.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSchema(false);
        }
      }
    }
    void loadPartySchema();
    return () => {
      cancelled = true;
    };
  }, []);

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (name.trim().length < FIELD_LIMITS.NAME_MIN) {
      nextErrors.__name = tr('partyNameRequiredError');
    }

    for (const field of dynamicFields) {
      const raw = customValues[field.fieldKey];

      if (field.fieldType === 'BOOLEAN') {
        if (field.isRequired && raw !== true) {
          nextErrors[field.fieldKey] = tr('fieldRequiredError');
        }
        continue;
      }

      const isEmpty = raw === undefined || raw === null || String(raw).trim() === '';
      if (isEmpty) {
        if (field.isRequired) {
          nextErrors[field.fieldKey] = tr('fieldRequiredError');
        }
        continue;
      }

      if (field.fieldType === 'NUMBER' && Number.isNaN(Number(raw))) {
        nextErrors[field.fieldKey] = tr('invalidNumberError');
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleDynamicChange = (fieldKey: string, value: CustomAttributeValue | string) => {
    setCustomValues((prev) => ({ ...prev, [fieldKey]: value }));
    if (fieldErrors[fieldKey]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldKey];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!validateForm()) return;

    setSaving(true);
    try {
      await createParty(
        profile,
        {
          name,
          partyType,
          contactStatus,
          email,
          phone,
          customAttributes: customValues,
        },
        dynamicFields
      );
      notify('success', `${tr('partyCreatedToast')} (${name.trim()})`);
      setActiveModule('parties', 'list');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to create party');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl space-y-6"
    >
      {/* Header & Back Navigation */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setActiveModule('parties', 'list')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A2B4A]/70 hover:text-[#1A2B4A] transition-colors"
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          <span>{tr('backToParties')}</span>
        </button>

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2B4A]">
            {tr('addNewPartyTitle')}
          </h1>
          <p className="text-sm text-[#1A2B4A]/65">{tr('addNewPartySubtitle')}</p>
        </div>
      </div>

      {/* Unified Base + Dynamic Form */}
      <form
        noValidate
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden"
      >
        {/* Base Abstract Party Section */}
        <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#1A2B4A] uppercase tracking-wider">
            {tr('partiesTitle')}
          </h2>
          <button
            type="button"
            onClick={() => setActiveModule('config')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A2B4A]/70 hover:text-[#FF7A00] transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{tr('configTitle')}</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#1A2B4A]">
              {tr('partyName')} <span className="text-[#FF7A00]">*</span>
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.NAME_MAX}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.__name) {
                  setFieldErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.__name;
                    return copy;
                  });
                }
              }}
              aria-invalid={Boolean(fieldErrors.__name)}
              className={`w-full h-10 px-3 rounded-lg border text-sm text-[#1A2B4A] focus:outline-none ${
                fieldErrors.__name
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-slate-200 focus:border-[#1A2B4A]'
              }`}
            />
            {fieldErrors.__name && (
              <p className="text-xs text-red-600 font-medium">{fieldErrors.__name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1A2B4A]">
                {tr('partyType')}
              </label>
              <select
                value={partyType}
                onChange={(e) => setPartyType(e.target.value as PartyType)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
              >
                <option value="CLIENT">{tr('typeCLIENT')}</option>
                <option value="SUPPLIER">{tr('typeSUPPLIER')}</option>
                <option value="EMPLOYEE">{tr('typeEMPLOYEE')}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1A2B4A]">
                {tr('contactStatus')}
              </label>
              <select
                value={contactStatus}
                onChange={(e) => setContactStatus(e.target.value as ContactStatus)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
              >
                <option value="ACTIVE">{tr('statusACTIVE')}</option>
                <option value="PENDING">{tr('statusPENDING')}</option>
                <option value="INACTIVE">{tr('statusINACTIVE')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1A2B4A]">
                {tr('email')}
              </label>
              <input
                type="email"
                maxLength={FIELD_LIMITS.EMAIL_MAX}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1A2B4A]">
                {tr('phone')}
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.PHONE_MAX}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
              />
            </div>
          </div>

          {/* Dynamic Custom Fields Metadata Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-[#1A2B4A]/65 mb-2">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#1A2B4A]">
                <Database className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>{tr('customFieldsSection')}</span>
              </span>
              {!loadingSchema && (
                <span className="tabular-nums">
                  {dynamicFields.length} {tr('dynamicFieldsLoaded')}
                </span>
              )}
            </div>

            {loadingSchema ? (
              <div className="p-4 rounded-lg bg-[#F3F5F7] border border-slate-200 text-xs text-[#1A2B4A]/65">
                {tr('loadingDynamicSchema')}
              </div>
            ) : schemaError ? (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {schemaError}
              </div>
            ) : dynamicFields.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#F3F5F7] border border-slate-200 text-xs text-[#1A2B4A]/65">
                {tr('noCustomFieldsHint')}
              </div>
            ) : (
              <DynamicFieldsRenderer
                fields={dynamicFields}
                values={customValues}
                errors={fieldErrors}
                onChange={handleDynamicChange}
              />
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-[#F3F5F7] border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setActiveModule('parties', 'list')}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-[#1A2B4A] hover:bg-slate-50"
          >
            {tr('cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] disabled:opacity-60 text-white text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105"
          >
            {tr('save')}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
