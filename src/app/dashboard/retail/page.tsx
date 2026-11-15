/**
 * KLARO RETAIL PACKAGE (INDUSTRY LAYER) — POINT OF SALE (/dashboard/retail)
 * -----------------------------------------------------------------------------
 * Industry extension built strictly on top of Klaro Core APIs without
 * altering Core engines:
 * - Reads catalog Items + Custom Field Definitions (ITEM / DOCUMENT)
 * - Displays two-column POS interface (Product Grid left, Animated Cart right)
 * - Emits a Core Invoice Document (`DRAFT_INVOICE`) on Checkout
 */

import { useEffect, useMemo, useState } from 'react';
import { Store } from 'lucide-react';
import { motion } from 'motion/react';
import {
  createCustomFieldDefinition,
  createDocument,
  fetchCustomFieldsByEntity,
} from '../../../api/erpService.ts';
import { InfoTooltip } from '../../../components/InfoTooltip.tsx';
import { useErp } from '../../../context/ErpContext.tsx';
import {
  CustomAttributeValue,
  CustomFieldDefinition,
  DocumentLine,
  Item,
} from '../../../core/types.ts';
import { getFieldsForEntity } from '../../../engine/configEngine.ts';
import { RetailCartPanel } from './RetailCartPanel.tsx';
import { RetailProductGrid } from './RetailProductGrid.tsx';
import { CartItem, CheckoutReceipt, formatCurrencyAmount } from './types.ts';

export function RetailPosPage() {
  const {
    items,
    parties,
    documents,
    customFields,
    systemSettings,
    profile,
    lang,
    can,
    notify,
    dataLoading,
    setActiveModule,
  } = useErp();

  const [fetchedItemFields, setFetchedItemFields] = useState<CustomFieldDefinition[] | null>(null);
  const [fetchedDocFields, setFetchedDocFields] = useState<CustomFieldDefinition[] | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [docCustomValues, setDocCustomValues] = useState<
    Record<string, CustomAttributeValue | string>
  >({});
  const [notes, setNotes] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [enablingPriceField, setEnablingPriceField] = useState(false);
  const [receipt, setReceipt] = useState<CheckoutReceipt | null>(null);

  const currency = systemSettings?.defaultCurrency || 'USD';

  // Fetch CustomFieldDefinitions for ITEM and DOCUMENT via the existing Config API
  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchCustomFieldsByEntity('ITEM'),
      fetchCustomFieldsByEntity('DOCUMENT'),
    ])
      .then(([itemDefs, docDefs]) => {
        if (!active) return;
        setFetchedItemFields(itemDefs);
        setFetchedDocFields(docDefs);
      })
      .catch(() => {
        // Real-time stream from ErpContext provides fallback definitions
      });
    return () => {
      active = false;
    };
  }, [customFields.length]);

  const itemFields = useMemo(
    () => fetchedItemFields ?? getFieldsForEntity(customFields, 'ITEM'),
    [fetchedItemFields, customFields]
  );

  const docFields = useMemo(
    () => fetchedDocFields ?? getFieldsForEntity(customFields, 'DOCUMENT'),
    [fetchedDocFields, customFields]
  );

  // Default customer selection to first active CLIENT Party
  useEffect(() => {
    if (selectedPartyId || parties.length === 0) return;
    const defaultClient = parties.find((p) => p.partyType === 'CLIENT') ?? parties[0];
    if (defaultClient) {
      setSelectedPartyId(defaultClient.id);
    }
  }, [parties, selectedPartyId]);

  const handleAddToCart = (
    item: Item,
    unitPrice: number,
    priceSource: 'CUSTOM_FIELD' | 'MANUAL'
  ) => {
    setReceipt(null);
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1, unitPrice, priceSource }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const handleUpdateUnitPrice = (itemId: string, nextPrice: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.item.id === itemId ? { ...c, unitPrice: nextPrice, priceSource: 'MANUAL' } : c
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const handleEnablePriceField = async () => {
    if (!profile) return;
    setEnablingPriceField(true);
    try {
      await createCustomFieldDefinition(profile, {
        entityType: 'ITEM',
        fieldKey: 'unit_price',
        labelEn: 'Unit Price',
        labelAr: 'سعر الوحدة',
        fieldType: 'NUMBER',
        isRequired: false,
      });
      const updated = await fetchCustomFieldsByEntity('ITEM');
      setFetchedItemFields(updated);
      notify(
        'success',
        lang === 'ar'
          ? 'تم إنشاء الحقل المخصص unit_price للأصناف.'
          : 'Created unit_price custom field on Item schema.'
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to create unit_price field');
    } finally {
      setEnablingPriceField(false);
    }
  };

  const handleCheckout = async () => {
    if (!profile) return;
    if (cart.length === 0) return;

    const customer = parties.find((p) => p.id === selectedPartyId);
    if (!customer) {
      notify(
        'error',
        lang === 'ar' ? 'يرجى اختيار عميل لإصدار الفاتورة.' : 'Select a Customer Party before checkout.'
      );
      return;
    }

    const lines: DocumentLine[] = cart.map((entry) => ({
      itemId: entry.item.id,
      itemCode: entry.item.code,
      itemName: entry.item.name,
      unit: entry.item.unit,
      quantity: entry.quantity,
    }));

    const totalUnits = cart.reduce((sum, entry) => sum + entry.quantity, 0);
    const totalAmount = cart.reduce((sum, entry) => sum + entry.quantity * entry.unitPrice, 0);

    const nextSeq = String(documents.length + 1).padStart(3, '0');
    const docNumber = `INV-POS-${new Date().getFullYear()}-${nextSeq}`;

    const summaryBreakdown = cart
      .map(
        (c) =>
          `${c.item.code} x${c.quantity} @ ${formatCurrencyAmount(c.unitPrice, currency)}`
      )
      .join(' | ');

    const combinedNotes = [
      `POS Checkout (${formatCurrencyAmount(totalAmount, currency)})`,
      notes.trim(),
      summaryBreakdown,
    ]
      .filter(Boolean)
      .join(' — ')
      .slice(0, 500);

    setCheckingOut(true);
    try {
      await createDocument(
        profile,
        {
          docNumber,
          docType: 'DRAFT_INVOICE',
          partyId: customer.id,
          partyName: customer.name,
          notes: combinedNotes,
          lines,
          customAttributes: docCustomValues,
        },
        docFields
      );

      setReceipt({
        docNumber,
        partyName: customer.name,
        lineCount: lines.length,
        totalUnits,
        totalAmount,
        currency,
        createdAt: new Date(),
      });
      setCart([]);
      setNotes('');
      setDocCustomValues({});
      notify(
        'success',
        lang === 'ar'
          ? `تم إنشاء الفاتورة ${docNumber} عبر نقطة البيع.`
          : `POS Invoice ${docNumber} created successfully.`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Store className="w-5 h-5 text-[#FF7A00]" />
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2B4A]">
              {lang === 'ar' ? 'نقطة البيع (حزمة التجزئة)' : 'Retail Point of Sale (POS)'}
            </h1>
            <InfoTooltip
              text={
                lang === 'ar'
                  ? 'حزمة قطاع التجزئة مبنية فوق واجهات الأصناف والحقول المخصصة والمستندات في نواة كلارو دون تعديل المحركات الأساسية.'
                  : 'Retail Industry Layer built directly on top of Core Items, Custom Fields, and Invoice Documents without altering Core engines.'
              }
            />
          </div>
          <p className="text-sm text-[#1A2B4A]/65">
            {lang === 'ar'
              ? 'اختر الأصناف من الكتالوج وأنشئ فاتورة مبيعات فورية عبر محرك المستندات.'
              : 'Tap catalog Items on the left to build a live checkout cart and issue an Invoice Document.'}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium text-[#1A2B4A]/65 shrink-0">
          <span className="tabular-nums">
            {items.length} {lang === 'ar' ? 'صنف متاح' : 'catalog items'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular font-semibold text-[#1A2B4A]">
            {currency}
          </span>
        </div>
      </div>

      {/* Two-Column POS Layout: Left Product Grid, Right Sticky Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 xl:col-span-8">
          <RetailProductGrid
            items={items}
            itemFields={itemFields}
            cart={cart}
            currency={currency}
            lang={lang}
            loading={dataLoading}
            onAddToCart={handleAddToCart}
            onEnablePriceField={
              profile?.roleCode === 'ADMIN' || can('config:manage')
                ? handleEnablePriceField
                : undefined
            }
            enablingPriceField={enablingPriceField}
            onManageItems={() => setActiveModule('items')}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6">
          <RetailCartPanel
            cart={cart}
            parties={parties}
            selectedPartyId={selectedPartyId}
            onSelectParty={setSelectedPartyId}
            docFields={docFields}
            docCustomValues={docCustomValues}
            onChangeDocCustomValue={(k, v) =>
              setDocCustomValues((prev) => ({ ...prev, [k]: v }))
            }
            notes={notes}
            onChangeNotes={setNotes}
            currency={currency}
            lang={lang}
            canCreateDocument={can('documents:create')}
            checkingOut={checkingOut}
            receipt={receipt}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateUnitPrice={handleUpdateUnitPrice}
            onRemoveItem={handleRemoveItem}
            onClearCart={() => setCart([])}
            onCheckout={handleCheckout}
            onDismissReceipt={() => setReceipt(null)}
            onOpenDocuments={() => setActiveModule('documents')}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default RetailPosPage;
