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
            <Layers className="w-5 h-5 text-[#1A2B4A]" />
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2B4A]">
              {tr('archTitle')}
            </h1>
            <InfoTooltip text={tr('blueprintTooltip')} />
          </div>
          <p className="text-sm text-[#1A2B4A]/65">{tr('archSubtitle')}</p>
        </div>

        <button
          type="button"
          onClick={() => setActiveModule('config')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] text-white text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105 whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{tr('openSchemaBuilder')}</span>
        </button>
      </div>

      {/* Section 1: Active Engines (Config, Workflow, Audit, RBAC) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#1A2B4A]" />
          <h2 className="text-sm font-bold text-[#1A2B4A]">{tr('activeEnginesTitle')}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {engines.map((eng) => {
            const Icon = eng.icon;
            return (
              <button
                key={eng.id}
                type="button"
                onClick={eng.onClick}
                className="text-start p-5 rounded-xl shadow-sm bg-[#F3F5F7] border border-slate-200 hover:shadow-md hover:-translate-y-1 hover:border-[#1A2B4A]/45 transition-all duration-200 cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="w-4 h-4 text-[#FF7A00] shrink-0" />
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2ECC71]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{tr('engineStatusActive')}</span>
                  </span>
                </div>
                <p className="text-sm font-bold text-[#1A2B4A]">{eng.title}</p>
                <p className="text-xs text-[#1A2B4A]/65 leading-relaxed">{eng.detail}</p>
                <p className="text-xs font-semibold text-[#1A2B4A] tabular-nums pt-1 border-t border-slate-200/80">
                  {eng.metric}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Schema Summary (Total counts of Parties, Items, Documents, Custom Fields) */}
      <section className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 bg-[#1A2B4A] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#FF7A00]" />
            <h2 className="text-sm font-bold">{tr('schemaSummaryTitle')}</h2>
          </div>
          <p className="text-xs font-medium text-white/85 tabular-nums">{schemaSummaryLine}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200">
          <div className="p-5 space-y-1.5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1A2B4A]/65">{tr('navParties')}</span>
              <span className="text-xs font-semibold text-[#2ECC71] tabular-nums">
                {partyFieldCount} {lang === 'ar' ? 'حقول' : 'fields'}
              </span>
            </div>
            <p className="text-2xl font-bold text-[#1A2B4A] tabular-nums">{parties.length}</p>
            <p className="text-xs text-[#1A2B4A]/60">
              {lang === 'ar' ? 'المجموعة: parties' : 'Collection: parties'}
            </p>
          </div>

          <div className="p-5 space-y-1.5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1A2B4A]/65">{tr('navItems')}</span>
              <span className="text-xs font-semibold text-[#2ECC71] tabular-nums">
                {itemFieldCount} {lang === 'ar' ? 'حقول' : 'fields'}
              </span>
            </div>
            <p className="text-2xl font-bold text-[#1A2B4A] tabular-nums">{items.length}</p>
            <p className="text-xs text-[#1A2B4A]/60">
              {lang === 'ar' ? 'المجموعة: items' : 'Collection: items'}
            </p>
          </div>

          <div className="p-5 space-y-1.5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1A2B4A]/65">{tr('navDocuments')}</span>
              <span className="text-xs font-semibold text-[#2ECC71] tabular-nums">
                {docFieldCount} {lang === 'ar' ? 'حقول' : 'fields'}
              </span>
            </div>
            <p className="text-2xl font-bold text-[#1A2B4A] tabular-nums">{documents.length}</p>
            <p className="text-xs text-[#1A2B4A]/60">
              {lang === 'ar' ? 'المجموعة: documents' : 'Collection: documents'}
            </p>
          </div>

          <div className="p-5 space-y-1.5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1A2B4A]/65">
                {tr('customFieldsSection')}
              </span>
              <span className="text-xs font-semibold text-[#FF7A00] tabular-nums">
                {activeFieldsCount} {tr('fieldStatusActive')}
              </span>
            </div>
            <p className="text-2xl font-bold text-[#1A2B4A] tabular-nums">{customFields.length}</p>
            <p className="text-xs text-[#1A2B4A]/60">
              {lang === 'ar' ? 'المجموعة: customFieldDefinitions' : 'Collection: customFieldDefinitions'}
            </p>
          </div>
        </div>
      </section>

      {/* Live Dynamic Schema Registry */}
      <section className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#1A2B4A]" />
            <h2 className="text-sm font-bold text-[#1A2B4A]">
              {tr('dynamicFieldsInventory')}
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#1A2B4A]/65 tabular-nums">
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
                <tr className="bg-[#F3F5F7]/70 border-b border-slate-200 text-xs font-semibold text-[#1A2B4A]/70">
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('targetEntity')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('fieldName')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('fieldKey')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('fieldType')}</th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">{tr('isRequiredField')}</th>
                  <th className="py-3 px-4 text-end whitespace-nowrap">{tr('fieldStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {customFields.map((cf) => (
                  <tr key={cf.id} className="h-11 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-xs font-semibold text-[#1A2B4A] whitespace-nowrap">
                      {tr(`entity${cf.entityType}`)}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#1A2B4A] whitespace-nowrap">
                      {getFieldLabel(cf, lang)}
                    </td>
                    <td className="py-2.5 px-4 font-mono-tabular text-xs text-[#1A2B4A]/65 whitespace-nowrap">
                      {cf.fieldKey}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#1A2B4A]/80 whitespace-nowrap">
                      {tr(`field${cf.fieldType}`)}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      <span
                        className={
                          cf.isRequired ? 'text-[#FF7A00] font-semibold' : 'text-[#1A2B4A]/55'
                        }
                      >
                        {cf.isRequired ? tr('required') : tr('optional')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-end text-xs whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          cf.isActive ? 'text-[#2ECC71]' : 'text-[#1A2B4A]/45'
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
        <section className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200">
            <h2 className="text-sm font-bold text-[#1A2B4A]">
              {lang === 'ar' ? 'هيكل المجلدات (Modular Monolith)' : 'Modular Monolith Folder Structure'}
            </h2>
          </div>
          <pre
            dir="ltr"
            className="p-6 text-xs font-mono-tabular text-[#1A2B4A] overflow-x-auto leading-relaxed bg-white"
          >
            {MODULAR_STRUCTURE}
          </pre>
        </section>

        <section className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 bg-[#F3F5F7] border-b border-slate-200">
            <h2 className="text-sm font-bold text-[#1A2B4A]">
              {lang === 'ar' ? 'مخطط علاقات الكيانات (Core ERD)' : 'Core Entity-Relationship Diagram (ERD)'}
            </h2>
          </div>
          <pre
            dir="ltr"
            className="p-6 text-xs font-mono-tabular text-[#1A2B4A] overflow-x-auto leading-relaxed bg-white"
          >
            {ERD_DIAGRAM}
          </pre>
        </section>
      </div>
    </motion.div>
  );
}
