/**
 * KLARO UI LAYER — PARTIES MANAGEMENT (ABSTRACT ENTITIES ENGINE)
 * -----------------------------------------------------------------------------
 * Manages industry-agnostic Parties (Client, Supplier, Employee) with live
 * search, segmented type filtering, high-density single-elevation data grid,
 * and dynamic Custom Fields injected from the Configuration Engine.
 */

import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createParty, deleteParty, updateParty } from '../api/erpService.ts';
import { ActionTooltip } from '../components/ActionTooltip.tsx';
import { DynamicFieldsRenderer } from '../components/DynamicFieldsRenderer.tsx';
import { EmptyState } from '../components/EmptyStateIllustration.tsx';
import { Avatar, StatusChip } from '../components/ui.tsx';
import { InfoTooltip } from '../components/InfoTooltip.tsx';
import { useErp } from '../context/ErpContext.tsx';
import {
  ContactStatus,
  CustomAttributeValue,
  FIELD_LIMITS,
  Party,
  PartyType,
} from '../core/types.ts';
import { getFieldLabel, getFieldsForEntity } from '../engine/configEngine.ts';

export function PartiesView() {
  const { parties, customFields, profile, lang, tr, can, notify, dataLoading, setActiveModule } =
    useErp();

  const partyFields = useMemo(
    () => getFieldsForEntity(customFields, 'PARTY'),
    [customFields]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PartyType>('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [partyType, setPartyType] = useState<PartyType>('CLIENT');
  const [contactStatus, setContactStatus] = useState<ContactStatus>('ACTIVE');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, CustomAttributeValue | string>>({});
  const [saving, setSaving] = useState(false);

  const filteredParties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parties.filter((p) => {
      const matchesType = typeFilter === 'ALL' || p.partyType === typeFilter;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        (p.phone ?? '').toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [parties, searchQuery, typeFilter]);

  const openCreateDrawer = () => {
    setEditingParty(null);
    setName('');
    setPartyType('CLIENT');
    setContactStatus('ACTIVE');
    setEmail('');
    setPhone('');
    setCustomValues({});
    setDrawerOpen(true);
  };

  const openEditDrawer = (party: Party) => {
    setEditingParty(party);
    setName(party.name);
    setPartyType(party.partyType);
    setContactStatus(party.contactStatus);
    setEmail(party.email ?? '');
    setPhone(party.phone ?? '');
    setCustomValues({ ...(party.customAttributes ?? {}) });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const payload = {
        name,
        partyType,
        contactStatus,
        email,
        phone,
        customAttributes: customValues,
      };
      if (editingParty) {
        await updateParty(profile, editingParty.id, payload, partyFields);
        notify('success', `${name} · ${tr('editParty')}`);
      } else {
        await createParty(profile, payload, partyFields);
        notify('success', `${name} · ${tr('addParty')}`);
      }
      setDrawerOpen(false);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (party: Party) => {
    if (!profile) return;
    try {
      await deleteParty(profile, party);
      notify('info', `${party.name} · ${tr('delete')}`);
      setConfirmDeleteId(null);
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
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {profile?.roleCode === 'EMPLOYEE' ? tr('navPartiesOp') : tr('partiesTitle')}
            </h1>
            {profile?.roleCode !== 'EMPLOYEE' && <InfoTooltip text={tr('partiesTooltip')} />}
          </div>
          <p className="text-sm text-muted">{tr('partiesSubtitle')}</p>
        </div>

        {can('entities:write') && (
          <ActionTooltip label={tr('addNewPartyTitle')} side="bottom">
            <button
              onClick={() => setActiveModule('parties', 'new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-all duration-150 hover:brightness-105 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{tr('addParty')}</span>
            </button>
          </ActionTooltip>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Segmented Type Filter */}
        <div className="klaro-tabs self-start">
          {(['ALL', 'CLIENT', 'SUPPLIER', 'EMPLOYEE'] as const).map((type) => {
            const active = typeFilter === type;
            const label = type === 'ALL' ? tr('all') : tr(`type${type}`);
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-surface text-ink shadow-[var(--shadow-card)]'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Live Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-muted absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr('searchPlaceholder')}
            className="w-full h-11 ps-10 pe-4 rounded-2xl border border-line bg-surface text-sm text-ink shadow-[var(--shadow-card)] focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* High-Density Single-Elevation Data Grid */}
      <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
        {dataLoading && parties.length === 0 ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((r) => (
              <div key={r} className="h-10 rounded bg-surface animate-pulse" />
            ))}
          </div>
        ) : filteredParties.length === 0 ? (
          <EmptyState
            variant="contacts"
            title={tr('noRecordsTitle')}
            description={tr('noRecordsHint')}
            ctaLabel={can('entities:write') ? tr('addFirstPartyCta') : undefined}
            onAction={can('entities:write') ? () => setActiveModule('parties', 'new') : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-canvas border-b border-line text-xs font-semibold text-muted">
                  <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('partyName')}</th>
                  <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('partyType')}</th>
                  <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('contactStatus')}</th>
                  <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('email')}</th>
                  <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('phone')}</th>
                  {partyFields.map((cf) => (
                    <th key={cf.id} className="py-3.5 px-5 text-start whitespace-nowrap">
                      {getFieldLabel(cf, lang)}
                    </th>
                  ))}
                  <th className="py-3.5 px-5 text-end whitespace-nowrap">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filteredParties.map((party) => (
                  <tr
                    key={party.id}
                    onClick={() => {
                      if (can('entities:write')) openEditDrawer(party);
                    }}
                    className={`h-14 hover:bg-brand-soft/50 transition-colors duration-150 ${
                      can('entities:write') ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className="py-3 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={party.name} size={36} />
                        <span className="font-bold text-ink">{party.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-ink/80 whitespace-nowrap">
                      {tr(`type${party.partyType}`)}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      <StatusChip tone={party.contactStatus === 'ACTIVE' ? 'success' : party.contactStatus === 'PENDING' ? 'warning' : 'neutral'}>{tr(`status${party.contactStatus}`)}</StatusChip>
                    </td>
                    <td className="py-3 px-5 text-xs text-ink/70 whitespace-nowrap">
                      {party.email || '—'}
                    </td>
                    <td className="py-3 px-5 text-xs font-mono-tabular text-ink/70 whitespace-nowrap">
                      {party.phone || '—'}
                    </td>
                    {partyFields.map((cf) => {
                      const val = party.customAttributes?.[cf.fieldKey];
                      return (
                        <td
                          key={cf.id}
                          className="py-3 px-5 text-xs text-ink/80 whitespace-nowrap"
                        >
                          {val === undefined || val === ''
                            ? '—'
                            : typeof val === 'boolean'
                            ? val
                              ? 'Yes'
                              : 'No'
                            : String(val)}
                        </td>
                      );
                    })}
                    <td className="py-3 px-5 text-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-2">
                        {can('entities:write') && (
                          <ActionTooltip label={tr('editParty')} side="top">
                            <button
                              onClick={() => openEditDrawer(party)}
                              aria-label={tr('edit')}
                              className="p-1.5 rounded-md text-ink/70 hover:text-ink hover:bg-line/70 transition-all duration-150"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </ActionTooltip>
                        )}
                        {can('entities:delete') &&
                          (confirmDeleteId === party.id ? (
                            <button
                              onClick={() => void handleDelete(party)}
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold transition-transform"
                            >
                              {tr('confirmDelete')}
                            </button>
                          ) : (
                            <ActionTooltip label={tr('delete')} side="top">
                              <button
                                onClick={() => setConfirmDeleteId(party.id)}
                                aria-label={tr('delete')}
                                className="p-1.5 rounded-md text-muted hover:text-red-600 hover:bg-red-50 transition-all duration-150"
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

      {/* Create / Edit Slide-Over Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 bg-ink/35 flex justify-end"
          >
            <div className="flex-1" onClick={() => setDrawerOpen(false)} />
            <motion.div
              initial={{ x: lang === 'ar' ? -420 : 420 }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? -420 : 420 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-canvas h-full border-s border-line flex flex-col"
            >
              <div className="h-16 px-6 border-b border-line flex items-center justify-between shrink-0">
                <h2 className="text-base font-bold text-ink">
                  {editingParty ? tr('editParty') : tr('addParty')}
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-xl text-muted hover:bg-surface"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-ink">
                    {tr('partyName')} <span className="text-brand">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={FIELD_LIMITS.NAME_MIN}
                    maxLength={FIELD_LIMITS.NAME_MAX}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink focus:outline-none focus:border-ink"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-ink">
                      {tr('partyType')}
                    </label>
                    <select
                      value={partyType}
                      onChange={(e) => setPartyType(e.target.value as PartyType)}
                      className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-sm text-ink focus:outline-none focus:border-ink"
                    >
                      <option value="CLIENT">{tr('typeCLIENT')}</option>
                      <option value="SUPPLIER">{tr('typeSUPPLIER')}</option>
                      <option value="EMPLOYEE">{tr('typeEMPLOYEE')}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-ink">
                      {tr('contactStatus')}
                    </label>
                    <select
                      value={contactStatus}
                      onChange={(e) => setContactStatus(e.target.value as ContactStatus)}
                      className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-sm text-ink focus:outline-none focus:border-ink"
                    >
                      <option value="ACTIVE">{tr('statusACTIVE')}</option>
                      <option value="PENDING">{tr('statusPENDING')}</option>
                      <option value="INACTIVE">{tr('statusINACTIVE')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-ink">
                      {tr('email')}
                    </label>
                    <input
                      type="email"
                      maxLength={FIELD_LIMITS.EMAIL_MAX}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink focus:outline-none focus:border-ink"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-ink">
                      {tr('phone')}
                    </label>
                    <input
                      type="text"
                      maxLength={FIELD_LIMITS.PHONE_MAX}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink focus:outline-none focus:border-ink"
                    />
                  </div>
                </div>

                <DynamicFieldsRenderer
                  fields={partyFields}
                  values={customValues}
                  onChange={(k, v) => setCustomValues((prev) => ({ ...prev, [k]: v }))}
                />

                <div className="pt-6 border-t border-line flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="px-4 py-2 rounded-xl border border-line text-xs font-medium text-ink hover:bg-surface"
                  >
                    {tr('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-xs font-semibold"
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
