/**
 * KLARO UI LAYER — SYSTEM BLUEPRINT SCREEN (/dashboard/blueprint)
 * -----------------------------------------------------------------------------
 * Control Center displaying:
 * - Section 1: Active Engines (Config Engine, Workflow Engine, Audit Engine,
 *   RBAC Engine) with green "Active" indicators
 * - Section 2: Schema Summary (total counts of Parties, Items, Documents, and
 *   Custom Fields)
 * - Live Dynamic Fields Registry table & Modular Monolith / ERD blueprints
 */

import {
  CheckCircle2,
  Cpu,
  Database,
  GitBranch,
  History,
  Layers,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { motion } from 'motion/react';
import { EmptyState } from '../components/EmptyStateIllustration.tsx';
import { InfoTooltip } from '../components/InfoTooltip.tsx';
import { useErp } from '../context/ErpContext.tsx';
import { getFieldLabel } from '../engine/configEngine.ts';

const MODULAR_STRUCTURE = `src/
├── core/                  # Core Layer: Industry-agnostic entities & RBAC contracts
│   ├── types.ts           # Abstract Party, Item, Document, User, Role, CustomField types
│   ├── rbac.ts            # Role templates (ADMIN, ACCOUNTANT, EMPLOYEE) & permission guard
│   └── seed.ts            # Generic industry-neutral bootstrap records
│
├── engine/                # Engine Layer: Reusable business & schema engines
│   ├── configEngine.ts    # Zero-code Custom Field key normalization & payload validation
│   ├── workflowEngine.ts  # Governed state transitions (DRAFT -> APPROVED | REJECTED)
│   ├── i18n.ts            # Bilingual English (LTR / Inter) & Arabic (RTL / Tajawal)
│   └── firebase.ts        # Database connection gateway & structured error handler
│
├── api/                   # Headless API / Repository Layer
│   └── erpService.ts      # Decoupled CRUD, RBAC enforcement, & immutable Audit Logs
│
├── context/               # Client State Management
│   └── ErpContext.tsx     # Auth session, real-time entity streams, & i18n state
│
└── views/ & components/   # Headless UI Layer (Klaro Design System)`;

const ERD_DIAGRAM = `roles (code, permissions[]) ──< users (uid, email, roleCode, isActive)
                                   │
                                   ├──< parties (name, partyType, contactStatus, customAttributes)
                                   │       │
                                   │       └──< documents (docNumber, docType, status, lines[], customAttributes)
                                   │               ▲
items (code, name, itemType, unit, customAttributes)
                                   │
customFieldDefinitions (entityType, fieldKey, labelEn, labelAr, fieldType, options[])
                                   │
auditLogs (actorUid, entityType, entityId, action, fromStatus, toStatus, createdAt)`;

export function ArchitectureView() {
  const { customFields, parties, items, documents, roles, users, auditLogs, tr, lang, setActiveModule } =
    useErp();

  const activeFieldsCount = customFields.filter((f) => f.isActive).length;
  const partyFieldCount = customFields.filter((f) => f.entityType === 'PARTY' && f.isActive).length;
  const itemFieldCount = customFields.filter((f) => f.entityType === 'ITEM' && f.isActive).length;
  const docFieldCount = customFields.filter((f) => f.entityType === 'DOCUMENT' && f.isActive).length;

  const approvedDocsCount = documents.filter((d) => d.status === 'APPROVED').length;
  const draftDocsCount = documents.filter((d) => d.status === 'DRAFT').length;

  const engines = [
    {
      id: 'config',
      icon: SlidersHorizontal,
      title: lang === 'ar' ? 'محرك التخصيص (Config Engine)' : 'Config Engine',
      metric: `${activeFieldsCount} ${lang === 'ar' ? 'حقول' : 'Fields'}`,
      detail:
        lang === 'ar'
          ? 'حقن والتحقق من الحقول الديناميكية عبر الكيانات في وقت التشغيل'
          : 'Runtime custom field schema builder and payload sanitization across entities',
      onClick: () => setActiveModule('config'),
    },
    {
      id: 'workflow',
      icon: GitBranch,
      title: lang === 'ar' ? 'محرك سير العمل (Workflow Engine)' : 'Workflow Engine',
      metric: `${approvedDocsCount} / ${documents.length}`,
      detail:
        lang === 'ar'
          ? `${approvedDocsCount} معتمد · ${draftDocsCount} مسودة بانتظار المراجعة`
          : `${approvedDocsCount} Approved · ${draftDocsCount} Draft awaiting sign-off`,
      onClick: () => setActiveModule('workflows'),
    },
    {
      id: 'audit',
      icon: History,
      title: lang === 'ar' ? 'محرك التدقيق (Audit Engine)' : 'Audit Engine',
      metric: `${auditLogs.length} ${lang === 'ar' ? 'حدث' : 'Events'}`,
      detail:
        lang === 'ar'
          ? 'توثيق زمني غير قابل للتعديل لكل تعديل مخطط أو كيان أو اعتماد'
          : 'Immutable chronological logging across schema, entity, and workflow actions',
      onClick: () => setActiveModule('auditLogs'),
    },
    {
      id: 'rbac',
      icon: ShieldCheck,
      title: lang === 'ar' ? 'محرك الصلاحيات (RBAC Engine)' : 'RBAC Engine',
      metric: `${roles.length} · ${users.length}`,
      detail:
        lang === 'ar'
          ? `${roles.length} أدوار قياسية تحكم ${users.length} هوية مسجلة`
          : `${roles.length} role policies governing ${users.length} workspace identities`,
      onClick: () => setActiveModule('iam'),
    },
  ];

  const schemaSummaryLine =
    lang === 'ar'
      ? `3 كيانات أساسية مهيأة (الأطراف، الأصناف، المستندات) · ${customFields.length} حقول مخصصة مضافة`
      : `3 Entities configured, ${customFields.length} Custom Fields added`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* Control Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-ink" />
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {tr('archTitle')}
            </h1>
            <InfoTooltip text={tr('blueprintTooltip')} />
          </div>
          <p className="text-sm text-muted">{tr('archSubtitle')}</p>
        </div>

        <button
          type="button"
          onClick={() => setActiveModule('config')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-all duration-150 hover:brightness-105 whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{tr('openSchemaBuilder')}</span>
        </button>
      </div>

      {/* Section 1: Active Engines (Config, Workflow, Audit, RBAC) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-ink" />
          <h2 className="text-sm font-bold text-ink">{tr('activeEnginesTitle')}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {engines.map((eng) => {
            const Icon = eng.icon;
            return (
              <button
                key={eng.id}
                type="button"
                onClick={eng.onClick}
                className="text-start p-5 rounded-2xl shadow-[var(--shadow-card)] bg-surface border border-line hover:shadow-[var(--shadow-lift)] hover:border-ink/45 transition-all duration-200 cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="w-4 h-4 text-brand shrink-0" />
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{tr('engineStatusActive')}</span>
                  </span>
                </div>
                <p className="text-sm font-bold text-ink">{eng.title}</p>
                <p className="text-xs text-muted leading-relaxed">{eng.detail}</p>
                <p className="text-xs font-semibold text-ink tabular-nums pt-1 border-t border-line/80">
                  {eng.metric}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Schema Summary (Total counts of Parties, Items, Documents, Custom Fields) */}
      <section className="rounded-[20px] border border-line bg-surface overflow-hidden">
        <div className="px-6 py-4 bg-night text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-bold">{tr('schemaSummaryTitle')}</h2>
          </div>
          <p className="text-xs font-medium text-white/85 tabular-nums">{schemaSummaryLine}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-line">
          <div className="p-5 space-y-1.5 hover:bg-surface transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">{tr('navParties')}</span>
              <span className="text-xs font-semibold text-success tabular-nums">
                {partyFieldCount} {lang === 'ar' ? 'حقول' : 'fields'}
              </span>
            </div>
            <p className="text-2xl font-bold text-ink tabular-nums">{parties.length}</p>
            <p className="text-xs text-muted">
              {lang === 'ar' ? 'المجموعة: parties' : 'Collection: parties'}
            </p>
          </div>

          <div className="p-5 space-y-1.5 hover:bg-surface transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">{tr('navItems')}</span>
              <span className="text-xs font-semibold text-success tabular-nums">
                {itemFieldCount} {lang === 'ar' ? 'حقول' : 'fields'}
              </span>
            </div>
            <p className="text-2xl font-bold text-ink tabular-nums">{items.length}</p>
            <p className="text-xs text-muted">
              {lang === 'ar' ? 'المجموعة: items' : 'Collection: items'}
            </p>
          </div>

          <div className="p-5 space-y-1.5 hover:bg-surface transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">{tr('navDocuments')}</span>
              <span className="text-xs font-semibold text-success tabular-nums">
                {docFieldCount} {lang === 'ar' ? 'حقول' : 'fields'}
              </span>
            </div>
            <p className="text-2xl font-bold text-ink tabular-nums">{documents.length}</p>
            <p className="text-xs text-muted">
              {lang === 'ar' ? 'المجموعة: documents' : 'Collection: documents'}
            </p>
          </div>

          <div className="p-5 space-y-1.5 hover:bg-surface transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">
                {tr('customFieldsSection')}
              </span>
              <span className="text-xs font-semibold text-brand tabular-nums">
                {activeFieldsCount} {tr('fieldStatusActive')}
              </span>
            </div>
            <p className="text-2xl font-bold text-ink tabular-nums">{customFields.length}</p>
            <p className="text-xs text-muted">
              {lang === 'ar' ? 'المجموعة: customFieldDefinitions' : 'Collection: customFieldDefinitions'}
            </p>
          </div>
        </div>
      </section>

      {/* Live Dynamic Schema Registry */}
      <section className="rounded-[20px] border border-line bg-surface overflow-hidden">
        <div className="px-6 py-4 bg-surface border-b border-line flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-ink" />
            <h2 className="text-sm font-bold text-ink">
              {tr('dynamicFieldsInventory')}
            </h2>
          </div>
          <span className="text-xs font-semibold text-muted tabular-nums">
            {activeFieldsCount} {tr('fieldStatusActive')} · {customFields.length} {tr('all')}
          </span>
        </div>

        {customFields.length === 0 ? (
          <EmptyState
            variant="custom"
            title={tr('noRecordsTitle')}
            description={tr('noCustomFieldsHint')}
            ctaLabel={tr('addFirstCustomFieldCta')}
            onAction={() => setActiveModule('config')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="bg-surface/70 border-b border-line text-xs font-semibold text-ink/70">
                  <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('targetEntity')}</th>
                  <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('fieldName')}</th>
                  <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('fieldKey')}</th>
                  <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('fieldType')}</th>
                  <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('isRequiredField')}</th>
                  <th className="py-3.5 px-5 text-end whitespace-nowrap">{tr('fieldStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {customFields.map((cf) => (
                  <tr key={cf.id} className="h-11 hover:bg-surface transition-colors">
                    <td className="py-3 px-5 text-xs font-semibold text-ink whitespace-nowrap">
                      {tr(`entity${cf.entityType}`)}
                    </td>
                    <td className="py-3 px-5 font-semibold text-ink whitespace-nowrap">
                      {getFieldLabel(cf, lang)}
                    </td>
                    <td className="py-3 px-5 font-mono-tabular text-xs text-muted whitespace-nowrap">
                      {cf.fieldKey}
                    </td>
                    <td className="py-3 px-5 text-xs text-ink/80 whitespace-nowrap">
                      {tr(`field${cf.fieldType}`)}
                    </td>
                    <td className="py-3 px-5 text-xs whitespace-nowrap">
                      <span
                        className={
                          cf.isRequired ? 'text-brand font-semibold' : 'text-muted'
                        }
                      >
                        {cf.isRequired ? tr('required') : tr('optional')}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-end text-xs whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          cf.isActive ? 'text-success' : 'text-muted'
                        }`}
                      >
                        {cf.isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>
                          {cf.isActive ? tr('fieldStatusActive') : tr('fieldStatusInactive')}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Folder Structure & ERD Blueprints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-[20px] border border-line bg-surface overflow-hidden">
          <div className="px-6 py-4 bg-surface border-b border-line">
            <h2 className="text-sm font-bold text-ink">
              {lang === 'ar' ? 'هيكل المجلدات (Modular Monolith)' : 'Modular Monolith Folder Structure'}
            </h2>
          </div>
          <pre
            dir="ltr"
            className="p-6 text-xs font-mono-tabular text-ink overflow-x-auto leading-relaxed bg-canvas"
          >
            {MODULAR_STRUCTURE}
          </pre>
        </section>

        <section className="rounded-[20px] border border-line bg-surface overflow-hidden">
          <div className="px-6 py-4 bg-surface border-b border-line">
            <h2 className="text-sm font-bold text-ink">
              {lang === 'ar' ? 'مخطط علاقات الكيانات (Core ERD)' : 'Core Entity-Relationship Diagram (ERD)'}
            </h2>
          </div>
          <pre
            dir="ltr"
            className="p-6 text-xs font-mono-tabular text-ink overflow-x-auto leading-relaxed bg-canvas"
          >
            {ERD_DIAGRAM}
          </pre>
        </section>
      </div>
    </motion.div>
  );
}
