/**
 * KLARO UI LAYER — ITEMS CATALOG (ABSTRACT ENTITIES ENGINE)
 * -----------------------------------------------------------------------------
 * Manages generic Products and Services (Code, Name, Type, Unit) plus any
 * dynamic Custom Fields configured for ITEM in the Configuration Engine.
 */

import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createItem, deleteItem, updateItem } from '../api/erpService.ts';
import { ActionTooltip } from '../components/ActionTooltip.tsx';
import { DynamicFieldsRenderer } from '../components/DynamicFieldsRenderer.tsx';
import { EmptyState } from '../components/EmptyStateIllustration.tsx';
import { InfoTooltip } from '../components/InfoTooltip.tsx';
import { useErp } from '../context/ErpContext.tsx';
import { CustomAttributeValue, FIELD_LIMITS, Item, ItemType } from '../core/types.ts';
import { getFieldLabel, getFieldsForEntity } from '../engine/configEngine.ts';

export function ItemsView() {
  const { items, customFields, profile, lang, tr, can, notify, dataLoading } = useErp();

  const itemFields = useMemo(
    () => getFieldsForEntity(customFields, 'ITEM'),
    [customFields]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ItemType>('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [itemType, setItemType] = useState<ItemType>('PRODUCT');
  const [unit, setUnit] = useState('Unit');
  const [customValues, setCustomValues] = useState<Record<string, CustomAttributeValue | string>>({});
  const [saving, setSaving] = useState(false);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = typeFilter === 'ALL' || item.itemType === typeFilter;
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.unit.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [items, searchQuery, typeFilter]);

  const openCreateDrawer = () => {
    setEditingItem(null);
    setCode(`ITM-${Math.floor(1000 + Math.random() * 9000)}`);
    setName('');
    setItemType('PRODUCT');
    setUnit('Unit');
    setCustomValues({});
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: Item) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setItemType(item.itemType);
    setUnit(item.unit);
    setCustomValues({ ...(item.customAttributes ?? {}) });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const payload = { code, name, itemType, unit, customAttributes: customValues };
      if (editingItem) {
        await updateItem(profile, editingItem.id, payload, itemFields);
        notify('success', `${code} · ${tr('editItem')}`);
      } else {
        await createItem(profile, payload, itemFields);
        notify('success', `${code} · ${tr('addItem')}`);
      }
      setDrawerOpen(false);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Item) => {
    if (!profile) return;
    try {
      await deleteItem(profile, item);
      notify('info', `${item.code} · ${tr('delete')}`);
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2B4A]">
              {profile?.roleCode === 'EMPLOYEE' ? tr('navItemsOp') : tr('itemsTitle')}
            </h1>
            {profile?.roleCode !== 'EMPLOYEE' && <InfoTooltip text={tr('itemsTooltip')} />}
          </div>
          <p className="text-sm text-[#1A2B4A]/65">{tr('itemsSubtitle')}</p>
        </div>

        {can('entities:write') && (
          <ActionTooltip label={tr('addItem')} side="bottom">
            <button
              onClick={openCreateDrawer}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] text-white text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{tr('addItem')}</span>
            </button>
          </ActionTooltip>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#F3F5F7] border border-slate-200 self-start">
          {(['ALL', 'PRODUCT', 'SERVICE'] as const).map((type) => {
            const active = typeFilter === type;
            const label = type === 'ALL' ? tr('all') : tr(`type${type}`);
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
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

      {/* Table */}
      <div className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
        {dataLoading && items.length === 0 ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((r) => (
              <div key={r} className="h-10 rounded bg-[#F3F5F7] animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            variant="products"
            title={tr('noRecordsTitle')}
            description={tr('noRecordsHint')}
            ctaLabel={can('entities:write') ? tr('addFirstItemCta') : undefined}
            onAction={can('entities:write') ? openCreateDrawer : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-[#F3F5F7] border-b border-slate-200 text-xs font-semibold text-[#1A2B4A]/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('itemCode')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('itemName')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('itemType')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('unit')}</th>
                  {itemFields.map((cf) => (
                    <th key={cf.id} className="py-3 px-4 text-start whitespace-nowrap">
                      {getFieldLabel(cf, lang)}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-end whitespace-nowrap">{tr('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => {
                      if (can('entities:write')) openEditDrawer(item);
                    }}
                    className={`h-11 hover:bg-slate-50 transition-colors duration-200 ${
                      can('entities:write') ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono-tabular text-xs font-semibold text-[#1A2B4A] whitespace-nowrap">
                      {item.code}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#1A2B4A] whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-4 text-[#1A2B4A]/80 whitespace-nowrap">
                      {tr(`type${item.itemType}`)}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#1A2B4A]/75 whitespace-nowrap">
                      {item.unit}
                    </td>
                    {itemFields.map((cf) => {
                      const val = item.customAttributes?.[cf.fieldKey];
                      return (
                        <td
                          key={cf.id}
                          className="py-2.5 px-4 text-xs text-[#1A2B4A]/80 whitespace-nowrap"
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
                    <td className="py-2.5 px-4 text-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-2">
                        {can('entities:write') && (
                          <ActionTooltip label={tr('editItem')} side="top">
                            <button
                              onClick={() => openEditDrawer(item)}
                              aria-label={tr('edit')}
                              className="p-1.5 rounded-md text-[#1A2B4A]/70 hover:text-[#1A2B4A] hover:bg-slate-200/70 hover:scale-105 active:scale-95 transition-all duration-150"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </ActionTooltip>
                        )}
                        {can('entities:delete') &&
                          (confirmDeleteId === item.id ? (
                            <button
                              onClick={() => void handleDelete(item)}
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold hover:scale-105 active:scale-95 transition-transform"
                            >
                              {tr('confirmDelete')}
                            </button>
                          ) : (
                            <ActionTooltip label={tr('delete')} side="top">
                              <button
                                onClick={() => setConfirmDeleteId(item.id)}
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

      {/* Create / Edit Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 bg-[#1A2B4A]/35 flex justify-end"
          >
            <div className="flex-1" onClick={() => setDrawerOpen(false)} />
            <motion.div
              initial={{ x: lang === 'ar' ? -420 : 420 }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? -420 : 420 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-white h-full border-s border-slate-200 flex flex-col"
            >
              <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h2 className="text-base font-bold text-[#1A2B4A]">
                  {editingItem ? tr('editItem') : tr('addItem')}
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-[#1A2B4A]/60 hover:bg-[#F3F5F7]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#1A2B4A]">
                      {tr('itemCode')} <span className="text-[#FF7A00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      minLength={FIELD_LIMITS.CODE_MIN}
                      maxLength={FIELD_LIMITS.CODE_MAX}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono-tabular text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#1A2B4A]">
                      {tr('itemType')}
                    </label>
                    <select
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value as ItemType)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                    >
                      <option value="PRODUCT">{tr('typePRODUCT')}</option>
                      <option value="SERVICE">{tr('typeSERVICE')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#1A2B4A]">
                    {tr('itemName')} <span className="text-[#FF7A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={FIELD_LIMITS.NAME_MIN}
                    maxLength={FIELD_LIMITS.NAME_MAX}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#1A2B4A]">
                    {tr('unit')} <span className="text-[#FF7A00]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={1}
                    maxLength={FIELD_LIMITS.UNIT_MAX}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Unit / Hour / Box"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
                  />
                </div>

                <DynamicFieldsRenderer
                  fields={itemFields}
                  values={customValues}
                  onChange={(k, v) => setCustomValues((prev) => ({ ...prev, [k]: v }))}
                />

                <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-[#1A2B4A] hover:bg-[#F3F5F7]"
                  >
                    {tr('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] disabled:opacity-60 text-white text-xs font-semibold"
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
