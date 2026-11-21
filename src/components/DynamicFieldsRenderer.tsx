/**
 * KLARO UI LAYER — DYNAMIC CUSTOM FIELDS FORM RENDERER
 * -----------------------------------------------------------------------------
 * Parses `CustomFieldDefinition` metadata targeting PARTY, ITEM, or DOCUMENT
 * and dynamically renders typed controls (String, Number, Boolean, Date, Select)
 * with bilingual EN/AR labels and inline per-field validation errors.
 */

import { CustomAttributeValue, CustomFieldDefinition } from '../core/types.ts';
import { useErp } from '../context/ErpContext.tsx';
import { getFieldLabel } from '../engine/configEngine.ts';

interface DynamicFieldsRendererProps {
  fields: CustomFieldDefinition[];
  values: Record<string, CustomAttributeValue | string | boolean | undefined>;
  onChange: (fieldKey: string, value: CustomAttributeValue | string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function DynamicFieldsRenderer({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
}: DynamicFieldsRendererProps) {
  const { lang, tr } = useErp();

  if (fields.length === 0) return null;

  return (
    <div className="pt-4 mt-4 border-t border-line space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-ink/70 tracking-wide">
          {tr('customFieldsSection')}
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => {
          const label = getFieldLabel(field, lang);
          const currentVal = values[field.fieldKey];
          const fieldError = errors[field.fieldKey];
          const borderClass = fieldError
            ? 'border-red-500 focus:border-red-600'
            : 'border-line focus:border-ink';

          if (field.fieldType === 'BOOLEAN') {
            return (
              <div key={field.id} className="space-y-1">
                <label
                  className={`flex items-center justify-between px-3.5 h-10 rounded-xl border bg-surface/70 cursor-pointer ${
                    fieldError ? 'border-red-500' : 'border-line'
                  }`}
                >
                  <span className="text-sm font-medium text-ink">
                    {label}
                    {field.isRequired && <span className="text-brand ms-1">*</span>}
                  </span>
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={Boolean(currentVal)}
                    onChange={(e) => onChange(field.fieldKey, e.target.checked)}
                    className="h-4 w-4 accent-ink rounded border-line-strong"
                  />
                </label>
                {fieldError && (
                  <p className="text-xs text-red-600 font-medium">{fieldError}</p>
                )}
              </div>
            );
          }

          if (field.fieldType === 'SELECT') {
            return (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-medium text-ink">
                  {label}
                  {field.isRequired && <span className="text-brand ms-1">*</span>}
                </label>
                <select
                  disabled={disabled}
                  value={currentVal !== undefined ? String(currentVal) : ''}
                  onChange={(e) => onChange(field.fieldKey, e.target.value)}
                  aria-invalid={Boolean(fieldError)}
                  className={`w-full h-10 px-3 rounded-xl border bg-canvas text-sm text-ink focus:outline-none ${borderClass}`}
                >
                  <option value="">—</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {fieldError && (
                  <p className="text-xs text-red-600 font-medium">{fieldError}</p>
                )}
              </div>
            );
          }

          return (
            <div key={field.id} className="space-y-1.5">
              <label className="block text-xs font-medium text-ink">
                {label}
                {field.isRequired && <span className="text-brand ms-1">*</span>}
              </label>
              <input
                type={
                  field.fieldType === 'NUMBER'
                    ? 'number'
                    : field.fieldType === 'DATE'
                    ? 'date'
                    : 'text'
                }
                disabled={disabled}
                value={currentVal !== undefined ? String(currentVal) : ''}
                onChange={(e) => onChange(field.fieldKey, e.target.value)}
                aria-invalid={Boolean(fieldError)}
                className={`w-full h-10 px-3 rounded-xl border bg-canvas text-sm text-ink focus:outline-none ${borderClass}`}
              />
              {fieldError && (
                <p className="text-xs text-red-600 font-medium">{fieldError}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
