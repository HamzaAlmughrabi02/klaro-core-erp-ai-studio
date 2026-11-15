/**
 * KLARO RETAIL PACKAGE (INDUSTRY LAYER) — POS TYPES & PRICE RESOLVER
 * -----------------------------------------------------------------------------
 * Maps abstract Core `Item` customAttributes (configured via Schema Builder)
 * into Retail POS pricing without modifying any Core engine contracts.
 */

import { CustomFieldDefinition, Item } from '../../../core/types.ts';

export interface CartItem {
  item: Item;
  quantity: number;
  unitPrice: number;
  priceSource: 'CUSTOM_FIELD' | 'MANUAL';
}

export interface CheckoutReceipt {
  docNumber: string;
  partyName: string;
  lineCount: number;
  totalUnits: number;
  totalAmount: number;
  currency: string;
  createdAt: Date;
}

const KNOWN_PRICE_KEYS = [
  'unit_price',
  'price',
  'retail_price',
  'sale_price',
  'selling_price',
  'rate',
];

export function findItemPriceFieldKey(itemFields: CustomFieldDefinition[]): string | undefined {
  for (const key of KNOWN_PRICE_KEYS) {
    const match = itemFields.find(
      (f) => f.entityType === 'ITEM' && f.isActive && f.fieldKey === key
    );
    if (match) return match.fieldKey;
  }

  const numericPriceMatch = itemFields.find(
    (f) =>
      f.entityType === 'ITEM' &&
      f.isActive &&
      f.fieldType === 'NUMBER' &&
      /price|rate|cost|سعر/i.test(`${f.fieldKey} ${f.labelEn} ${f.labelAr}`)
  );
  return numericPriceMatch?.fieldKey;
}

export function resolveItemUnitPrice(
  item: Item,
  itemFields: CustomFieldDefinition[]
): { price: number; source: 'CUSTOM_FIELD' | 'MANUAL'; fieldKey?: string } {
  const attrs = item.customAttributes ?? {};

  for (const key of KNOWN_PRICE_KEYS) {
    const raw = attrs[key];
    if (raw !== undefined && raw !== null && raw !== '') {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        return { price: parsed, source: 'CUSTOM_FIELD', fieldKey: key };
      }
    }
  }

  const detectedKey = findItemPriceFieldKey(itemFields);
  if (detectedKey && attrs[detectedKey] !== undefined && attrs[detectedKey] !== '') {
    const parsed = Number(attrs[detectedKey]);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return { price: parsed, source: 'CUSTOM_FIELD', fieldKey: detectedKey };
    }
  }

  return { price: 0, source: 'MANUAL' };
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || 'USD'} ${amount.toFixed(2)}`;
  }
}
