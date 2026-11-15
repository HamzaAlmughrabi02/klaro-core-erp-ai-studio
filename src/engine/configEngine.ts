/**
 * KLARO ENGINE LAYER — DYNAMIC CONFIGURATION ENGINE
 * -----------------------------------------------------------------------------
 * Enables zero-code schema extensibility on abstract entities (Party, Item,
 * Document). Handles key normalization, bilingual label selection, and dynamic
 * payload validation prior to database persistence.
 */

import {
  CustomAttributesMap,
  CustomEntityType,
  CustomFieldDefinition,
  FIELD_KEY_REGEX,
  FIELD_LIMITS,
  Language,
} from '../core/types.ts';

export function toFieldKey(rawLabel: string): string {
  const cleaned = rawLabel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!cleaned) return 'field_' + Math.random().toString(36).slice(2, 6);
  const prefixed = /^[a-z]/.test(cleaned) ? cleaned : `f_${cleaned}`;
  return prefixed.slice(0, FIELD_LIMITS.FIELD_KEY_MAX);
}

export function isValidFieldKey(key: string): boolean {
  return (
    key.length >= FIELD_LIMITS.FIELD_KEY_MIN &&
    key.length <= FIELD_LIMITS.FIELD_KEY_MAX &&
    FIELD_KEY_REGEX.test(key)
  );
}

export function getFieldLabel(field: CustomFieldDefinition, lang: Language): string {
  return lang === 'ar' ? field.labelAr || field.labelEn : field.labelEn || field.labelAr;
}

export function getFieldsForEntity(
  allFields: CustomFieldDefinition[],
  entityType: CustomEntityType
): CustomFieldDefinition[] {
  return allFields.filter((f) => f.entityType === entityType && f.isActive !== false);
}

export interface CustomValidationResult {
  valid: boolean;
  sanitized: CustomAttributesMap;
  missingRequiredKeys: string[];
}

export function validateAndSanitizeCustomAttributes(
  rawValues: Record<string, unknown>,
  fields: CustomFieldDefinition[]
): CustomValidationResult {
  const sanitized: CustomAttributesMap = {};
  const missingRequiredKeys: string[] = [];

  for (const field of fields) {
    const val = rawValues[field.fieldKey];

    if (field.fieldType === 'BOOLEAN') {
      sanitized[field.fieldKey] = Boolean(val);
      continue;
    }

    const isEmpty = val === undefined || val === null || String(val).trim() === '';
    if (isEmpty) {
      if (field.isRequired) {
        missingRequiredKeys.push(field.fieldKey);
      }
      continue;
    }

    if (field.fieldType === 'NUMBER') {
      const parsed = Number(val);
      if (!Number.isNaN(parsed)) {
        sanitized[field.fieldKey] = parsed;
      } else if (field.isRequired) {
        missingRequiredKeys.push(field.fieldKey);
      }
      continue;
    }

    sanitized[field.fieldKey] = String(val).trim().slice(0, 240);
  }

  return {
    valid: missingRequiredKeys.length === 0,
    sanitized,
    missingRequiredKeys,
  };
}
