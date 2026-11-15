/**
 * KLARO RETAIL PACKAGE (INDUSTRY LAYER) — PRODUCT CATALOG GRID
 * -----------------------------------------------------------------------------
 * Left-hand POS terminal column displaying Items fetched from the Core Item
 * stream, category filter buttons, search, and dynamic Custom Field metadata.
 */

import { useMemo, useState } from 'react';
import { Package, Plus, Search, SlidersHorizontal, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { ActionTooltip } from '../../../components/ActionTooltip.tsx';
import { EmptyState } from '../../../components/EmptyStateIllustration.tsx';
import { CustomFieldDefinition, Item, ItemType, Language } from '../../../core/types.ts';
import { getFieldLabel } from '../../../engine/configEngine.ts';
import {
  CartItem,
  findItemPriceFieldKey,
  formatCurrencyAmount,
  resolveItemUnitPrice,
} from './types.ts';

interface RetailProductGridProps {
  items: Item[];
  itemFields: CustomFieldDefinition[];
  cart: CartItem[];
  currency: string;
  lang: Language;
  loading: boolean;
  onAddToCart: (item: Item, unitPrice: number, priceSource: 'CUSTOM_FIELD' | 'MANUAL') => void;
  onEnablePriceField?: () => Promise<void>;
  enablingPriceField?: boolean;
  onManageItems?: () => void;
}

export function RetailProductGrid({
  items,
  itemFields,
  cart,
  currency,
  lang,
  loading,
  onAddToCart,
  onEnablePriceField,
  enablingPriceField,
  onManageItems,
}: RetailProductGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ItemType>('ALL');

  const priceFieldKey = useMemo(() => findItemPriceFieldKey(itemFields), [itemFields]);

  const cartQtyByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart) {
      map.set(line.item.id, line.quantity);
    }
    return map;
  }, [cart]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = typeFilter === 'ALL' || item.itemType === typeFilter;
      if (!matchesType) return false;
      if (!q) return true;

      const attrValues = Object.values(item.customAttributes ?? {})
        .map((v) => String(v).toLowerCase())
        .join(' ');

      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.unit.toLowerCase().includes(q) ||
        attrValues.includes(q)
      );
    });
  }, [items, searchQuery, typeFilter]);

  const nonPriceFields = useMemo(
    () => itemFields.filter((f) => f.fieldKey !== priceFieldKey).slice(0, 2),
    [itemFields, priceFieldKey]
  );

  return (
    <section className="space-y-4">
      {/* Search & Category Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#1A2B4A]/45 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'ابحث بالاسم أو الرمز أو الحقول المخصصة...'
                  : 'Search products by name, SKU code, or custom attributes...'
              }
              className="w-full h-10 ps-9 pe-3 rounded-lg border border-slate-200 bg-[#F3F5F7]/50 focus:bg-white text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A] transition-colors"
            />
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#F3F5F7] border border-slate-200 self-start sm:self-auto shrink-0">
            {(['ALL', 'PRODUCT', 'SERVICE'] as const).map((type) => {
              const active = typeFilter === type;
              const label =
                type === 'ALL'
                  ? lang === 'ar'
                    ? 'الكل'
                    : 'All'
                  : type === 'PRODUCT'
                  ? lang === 'ar'
                    ? 'منتجات'
                    : 'Products'
                  : lang === 'ar'
                  ? 'خدمات'
                  : 'Services';
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
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
        </div>

        {/* Dynamic Schema Bridge Hint when no price custom field is registered on ITEM */}
        {!priceFieldKey && onEnablePriceField && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#1A2B4A]/75">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF7A00] shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'لا يوجد حقل مخصص للسعر على الأصناف بعد. يمكنك تفعيل حقل unit_price عبر محرك التخصيص أو تحديد السعر مباشرة في السلة.'
                  : 'No numeric price custom field exists on Item yet. Enable unit_price via Custom Fields API or enter unit prices in the cart.'}
              </span>
            </div>
            <button
              type="button"
              disabled={enablingPriceField}
              onClick={() => void onEnablePriceField()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-[#F3F5F7] hover:bg-white text-xs font-semibold text-[#1A2B4A] transition-all duration-150 hover:scale-105 active:scale-95 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              <Tag className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>
                {enablingPriceField
                  ? lang === 'ar'
                    ? 'جاري الإضافة...'
                    : 'Adding...'
                  : lang === 'ar'
                  ? 'إضافة حقل السعر (unit_price)'
                  : 'Add unit_price Field'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Product Cards Grid */}
      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-44 rounded-xl border border-slate-200 bg-[#F3F5F7]/70 animate-pulse"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            variant="products"
            title={lang === 'ar' ? 'لا توجد أصناف مطابقة' : 'No matching items found'}
            description={
              lang === 'ar'
                ? 'عدّل نص البحث أو أضف أصنافاً جديدة من كتالوج النواة.'
                : 'Adjust your search filter or add catalog Items in the Core Entities module.'
            }
            ctaLabel={onManageItems ? (lang === 'ar' ? 'إدارة الأصناف' : 'Manage Items') : undefined}
            onAction={onManageItems}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const { price, source } = resolveItemUnitPrice(item, itemFields);
            const qtyInCart = cartQtyByItemId.get(item.id) ?? 0;

            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onAddToCart(item, price, source)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onAddToCart(item, price, source);
                  }
                }}
                className={`group rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00] ${
                  qtyInCart > 0
                    ? 'border-[#2ECC71] ring-1 ring-[#2ECC71]/25'
                    : 'border-slate-200 hover:border-[#1A2B4A]/35'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Quiet Unboxed Metadata */}
                  <div className="flex items-center justify-between gap-2 text-xs text-[#1A2B4A]/60">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="font-mono-tabular font-semibold text-[#1A2B4A]/75">
                        {item.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {item.itemType === 'PRODUCT'
                          ? lang === 'ar'
                            ? 'منتج'
                            : 'Product'
                          : lang === 'ar'
                          ? 'خدمة'
                          : 'Service'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.unit}</span>
                    </div>
                    <Package className="w-3.5 h-3.5 text-[#1A2B4A]/40 shrink-0 group-hover:text-[#FF7A00] transition-colors" />
                  </div>

                  {/* Product Name */}
                  <h3 className="text-base font-bold text-[#1A2B4A] leading-snug line-clamp-2">
                    {item.name}
                  </h3>

                  {/* Custom Fields Metadata */}
                  {nonPriceFields.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      {nonPriceFields.map((cf) => {
                        const val = item.customAttributes?.[cf.fieldKey];
                        if (val === undefined || val === '') return null;
                        return (
                          <div
                            key={cf.id}
                            className="flex items-center justify-between gap-2 text-xs text-[#1A2B4A]/60"
                          >
                            <span className="truncate">{getFieldLabel(cf, lang)}</span>
                            <span className="font-mono-tabular font-medium text-[#1A2B4A]/80 truncate">
                              {String(val)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Price + Add CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono-tabular text-base font-extrabold text-[#1A2B4A] tabular-nums">
                      {price > 0
                        ? formatCurrencyAmount(price, currency)
                        : lang === 'ar'
                        ? 'يحدد بالسلة'
                        : 'Set in cart'}
                    </span>
                    <span className="block text-[11px] text-[#1A2B4A]/50">
                      / {item.unit}
                    </span>
                  </div>

                  <ActionTooltip
                    label={lang === 'ar' ? 'إضافة إلى السلة' : 'Add to checkout cart'}
                    side="top"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(item, price, source);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 whitespace-nowrap ${
                        qtyInCart > 0
                          ? 'bg-[#2ECC71] hover:bg-[#27ae60] text-white'
                          : 'bg-[#1A2B4A] group-hover:bg-[#FF7A00] text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {qtyInCart > 0
                          ? lang === 'ar'
                            ? `في السلة (${qtyInCart})`
                            : `In Cart (${qtyInCart})`
                          : lang === 'ar'
                          ? 'إضافة'
                          : 'Add'}
                      </span>
                    </button>
                  </ActionTooltip>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
