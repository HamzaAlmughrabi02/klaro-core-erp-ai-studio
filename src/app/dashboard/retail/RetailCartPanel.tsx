/**
 * KLARO RETAIL PACKAGE (INDUSTRY LAYER) — POS CHECKOUT CART PANEL
 * -----------------------------------------------------------------------------
 * Right-hand sticky checkout rail with Framer Motion animated cart lines,
 * quantity steppers, unit price overrides, Party (Customer) selector,
 * Document Custom Fields, and one-click Invoice Document checkout.
 */

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ActionTooltip } from '../../../components/ActionTooltip.tsx';
import { DynamicFieldsRenderer } from '../../../components/DynamicFieldsRenderer.tsx';
import {
  CustomAttributeValue,
  CustomFieldDefinition,
  Language,
  Party,
} from '../../../core/types.ts';
import { CartItem, CheckoutReceipt, formatCurrencyAmount } from './types.ts';

interface RetailCartPanelProps {
  cart: CartItem[];
  parties: Party[];
  selectedPartyId: string;
  onSelectParty: (partyId: string) => void;
  docFields: CustomFieldDefinition[];
  docCustomValues: Record<string, CustomAttributeValue | string>;
  onChangeDocCustomValue: (key: string, value: CustomAttributeValue | string) => void;
  notes: string;
  onChangeNotes: (value: string) => void;
  currency: string;
  lang: Language;
  canCreateDocument: boolean;
  checkingOut: boolean;
  receipt: CheckoutReceipt | null;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onUpdateUnitPrice: (itemId: string, nextPrice: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onCheckout: () => Promise<void>;
  onDismissReceipt: () => void;
  onOpenDocuments?: () => void;
}

export function RetailCartPanel({
  cart,
  parties,
  selectedPartyId,
  onSelectParty,
  docFields,
  docCustomValues,
  onChangeDocCustomValue,
  notes,
  onChangeNotes,
  currency,
  lang,
  canCreateDocument,
  checkingOut,
  receipt,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onDismissReceipt,
  onOpenDocuments,
}: RetailCartPanelProps) {
  const hasRequiredDocField = useMemo(
    () => docFields.some((f) => f.isRequired),
    [docFields]
  );
  const [showDocMeta, setShowDocMeta] = useState(hasRequiredDocField);

  const totalUnits = useMemo(
    () => cart.reduce((acc, line) => acc + line.quantity, 0),
    [cart]
  );
  const subtotal = useMemo(
    () => cart.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0),
    [cart]
  );

  const sortedParties = useMemo(() => {
    const clients = parties.filter((p) => p.partyType === 'CLIENT');
    const others = parties.filter((p) => p.partyType !== 'CLIENT');
    return [...clients, ...others];
  }, [parties]);

  return (
    <aside className="rounded-2xl border border-line bg-canvas shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
      {/* Cart Header */}
      <div className="px-5 py-4 bg-night text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ShoppingCart className="w-4 h-4 text-brand shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">
              {lang === 'ar' ? 'سلة نقطة البيع' : 'Active Sale Cart'}
            </h2>
            <p className="text-xs text-white/70 tabular-nums">
              {cart.length} {lang === 'ar' ? 'أصناف' : 'lines'} · {totalUnits}{' '}
              {lang === 'ar' ? 'وحدة' : 'units'}
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-xs font-medium text-white/75 hover:text-white underline shrink-0"
          >
            {lang === 'ar' ? 'إفراغ' : 'Clear'}
          </button>
        )}
      </div>

      {/* Receipt Confirmation Banner when Checkout completes */}
      <AnimatePresence>
        {receipt && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="p-5 bg-success/10 border-b border-success/30 space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-bold text-ink">
                  {lang === 'ar'
                    ? 'تم إصدار مستند الفاتورة بنجاح'
                    : 'Invoice Document Created'}
                </p>
                <p className="text-xs text-ink/75">
                  <span className="font-mono-tabular font-semibold">{receipt.docNumber}</span>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span>{receipt.partyName}</span>
                </p>
                <p className="font-mono-tabular text-sm font-extrabold text-ink tabular-nums">
                  {formatCurrencyAmount(receipt.totalAmount, receipt.currency)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {onOpenDocuments && (
                <button
                  type="button"
                  onClick={onOpenDocuments}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-all duration-150"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'عرض الفاتورة' : 'Open Documents'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onDismissReceipt}
                className="px-3 py-1.5 rounded-xl border border-line bg-canvas hover:bg-surface text-xs font-semibold text-ink"
              >
                {lang === 'ar' ? 'إغلاق' : 'Dismiss'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer / Party Selector */}
      <div className="p-4 border-b border-line bg-surface/60 space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <UserCheck className="w-3.5 h-3.5 text-ink/70" />
          <span>{lang === 'ar' ? 'العميل (الطرف)' : 'Customer (Party)'}</span>
          <span className="text-brand">*</span>
        </label>
        <select
          value={selectedPartyId}
          onChange={(e) => onSelectParty(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-sm text-ink focus:outline-none focus:border-ink"
        >
          <option value="">
            {lang === 'ar' ? 'اختر العميل...' : 'Select a Customer Party...'}
          </option>
          {sortedParties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.partyType})
            </option>
          ))}
        </select>
      </div>

      {/* Animated Cart Items List */}
      <div className="p-4 max-h-[380px] overflow-y-auto space-y-2.5">
        {cart.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <ShoppingCart className="w-8 h-8 text-line-strong mx-auto" />
            <p className="text-sm font-semibold text-ink">
              {lang === 'ar' ? 'السلة فارغة حالياً' : 'Your cart is empty'}
            </p>
            <p className="text-xs text-muted max-w-xs mx-auto">
              {lang === 'ar'
                ? 'اضغط على أي منتج من الشبكة لإضافته إلى فاتورة البيع.'
                : 'Select any product card on the left to add it to this POS invoice.'}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {cart.map((line) => {
              const lineTotal = line.quantity * line.unitPrice;
              return (
                <motion.div
                  key={line.item.id}
                  layout
                  initial={{ opacity: 0, x: lang === 'ar' ? -18 : 18, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: lang === 'ar' ? 18 : -18, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-xl border border-line bg-surface/45 p-3 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink truncate">
                        {line.item.name}
                      </p>
                      <p className="font-mono-tabular text-xs text-muted">
                        {line.item.code} · {line.item.unit}
                      </p>
                    </div>

                    <ActionTooltip label={lang === 'ar' ? 'إزالة' : 'Remove item'} side="top">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(line.item.id)}
                        aria-label="Remove cart item"
                        className="p-1 rounded text-muted hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </ActionTooltip>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Unit Price Field (editable for items without pre-filled price) */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted">
                        {lang === 'ar' ? 'السعر' : 'Price'}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) =>
                          onUpdateUnitPrice(line.item.id, Math.max(0, Number(e.target.value) || 0))
                        }
                        aria-label={`Unit price for ${line.item.name}`}
                        className="w-20 h-8 px-2 rounded-md border border-line bg-canvas font-mono-tabular text-xs font-semibold text-ink tabular-nums focus:outline-none focus:border-ink"
                      />
                    </div>

                    {/* Quantity Stepper */}
                    <div className="inline-flex items-center rounded-xl border border-line bg-canvas overflow-hidden">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(line.item.id, -1)}
                        aria-label="Decrease quantity"
                        className="w-8 h-8 flex items-center justify-center text-ink hover:bg-surface transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono-tabular text-xs font-bold text-ink tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(line.item.id, 1)}
                        aria-label="Increase quantity"
                        className="w-8 h-8 flex items-center justify-center text-ink hover:bg-surface transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line Subtotal */}
                    <div className="text-end min-w-[74px]">
                      <span className="font-mono-tabular text-xs font-extrabold text-ink tabular-nums">
                        {formatCurrencyAmount(lineTotal, currency)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Collapsible Invoice Custom Fields & POS Note */}
      <div className="border-t border-line px-4 py-3 space-y-3">
        <button
          type="button"
          onClick={() => setShowDocMeta((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-semibold text-ink/75 hover:text-ink"
        >
          <span>
            {lang === 'ar'
              ? 'خيارات الفاتورة والحقول المخصصة'
              : 'Invoice Metadata & Custom Fields'}
            {docFields.length > 0 ? ` (${docFields.length})` : ''}
          </span>
          {showDocMeta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDocMeta && (
          <div className="space-y-3 pt-1">
            {docFields.length > 0 && (
              <DynamicFieldsRenderer
                fields={docFields}
                values={docCustomValues}
                onChange={onChangeDocCustomValue}
              />
            )}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ink">
                {lang === 'ar' ? 'ملاحظات نقطة البيع' : 'POS Receipt Notes'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => onChangeNotes(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'اختياري: رقم الصندوق أو المرجع...'
                    : 'Optional: Register # or payment ref...'
                }
                className="w-full h-9 px-3 rounded-xl border border-line bg-canvas text-xs text-ink focus:outline-none focus:border-ink"
              />
            </div>
          </div>
        )}
      </div>

      {/* Checkout Totals & Primary CTA */}
      <div className="p-4 bg-surface border-t border-line space-y-4">
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-ink/70">
            <span>{lang === 'ar' ? 'نوع المستند الصادر' : 'Target Document Type'}</span>
            <span className="font-mono-tabular font-semibold text-ink">
              INVOICE (DRAFT_INVOICE)
            </span>
          </div>
          <div className="flex items-center justify-between text-ink/70">
            <span>{lang === 'ar' ? 'إجمالي الوحدات' : 'Total Units'}</span>
            <span className="font-mono-tabular font-semibold text-ink tabular-nums">
              {totalUnits}
            </span>
          </div>
          <div className="pt-2 border-t border-line/80 flex items-center justify-between">
            <span className="text-sm font-bold text-ink">
              {lang === 'ar' ? 'الإجمالي المستحق' : 'Checkout Total'}
            </span>
            <span className="font-mono-tabular text-xl font-extrabold text-ink tabular-nums">
              {formatCurrencyAmount(subtotal, currency)}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={!canCreateDocument || cart.length === 0 || !selectedPartyId || checkingOut}
          onClick={() => void onCheckout()}
          className="w-full h-11 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] hover:brightness-105 shadow-[var(--shadow-card)]"
        >
          <CreditCard className="w-4 h-4" />
          <span>
            {checkingOut
              ? lang === 'ar'
                ? 'جاري إصدار الفاتورة...'
                : 'Processing Checkout...'
              : lang === 'ar'
              ? 'إتمام الدفع وإنشاء الفاتورة'
              : 'Checkout'}
          </span>
        </button>

        {!canCreateDocument && (
          <p className="text-xs text-red-700 font-medium text-center">
            {lang === 'ar'
              ? 'حسابك لا يملك صلاحية documents:create لإصدار الفواتير.'
              : 'Your account lacks documents:create permission to issue invoices.'}
          </p>
        )}
      </div>
    </aside>
  );
}
