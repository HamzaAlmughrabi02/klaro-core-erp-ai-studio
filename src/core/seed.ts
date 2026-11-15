/**
 * KLARO CORE LAYER — INDUSTRY-AGNOSTIC SAMPLE SEED DEFINITIONS
 * -----------------------------------------------------------------------------
 * Provides generic operational records (Parties, Items, Custom Fields, and
 * Sample Documents) without hardcoding any industry vertical.
 */

import {
  CustomEntityType,
  CustomFieldType,
  DocumentType,
  ItemType,
  PartyType,
  ContactStatus,
  RoleCode,
} from './types.ts';

export interface SeedParty {
  id: string;
  name: string;
  partyType: PartyType;
  contactStatus: ContactStatus;
  email: string;
  phone: string;
  customAttributes: Record<string, string | number | boolean>;
}

export interface SeedItem {
  id: string;
  code: string;
  name: string;
  itemType: ItemType;
  unit: string;
  customAttributes: Record<string, string | number | boolean>;
}

export interface SeedCustomField {
  id: string;
  entityType: CustomEntityType;
  fieldKey: string;
  labelEn: string;
  labelAr: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired: boolean;
}

export interface SeedUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  roleCode: RoleCode;
  isActive: boolean;
}

export const SEED_CUSTOM_FIELDS: SeedCustomField[] = [
  {
    id: 'cf_party_tax_id',
    entityType: 'PARTY',
    fieldKey: 'tax_id',
    labelEn: 'Tax ID',
    labelAr: 'الرقم الضريبي',
    fieldType: 'TEXT',
    isRequired: false,
  },
  {
    id: 'cf_party_region',
    entityType: 'PARTY',
    fieldKey: 'region',
    labelEn: 'Region',
    labelAr: 'المنطقة',
    fieldType: 'SELECT',
    options: ['EMEA', 'MENA', 'APAC', 'AMER'],
    isRequired: false,
  },
  {
    id: 'cf_item_origin',
    entityType: 'ITEM',
    fieldKey: 'classification_code',
    labelEn: 'Classification Code',
    labelAr: 'رمز التصنيف',
    fieldType: 'TEXT',
    isRequired: false,
  },
  {
    id: 'cf_doc_cost_center',
    entityType: 'DOCUMENT',
    fieldKey: 'cost_center',
    labelEn: 'Cost Center',
    labelAr: 'مركز التكلفة',
    fieldType: 'SELECT',
    options: ['CC-100 Core Ops', 'CC-200 Finance', 'CC-300 Procurement'],
    isRequired: false,
  },
];

export const SEED_PARTIES: SeedParty[] = [
  {
    id: 'party_meridian_holdings',
    name: 'Meridian Global Holdings',
    partyType: 'CLIENT',
    contactStatus: 'ACTIVE',
    email: 'ops@meridian-holdings.example',
    phone: '+44 20 7946 0182',
    customAttributes: { tax_id: 'GB-8841209', region: 'EMEA' },
  },
  {
    id: 'party_al_noor_enterprises',
    name: 'Al-Noor Commercial Group',
    partyType: 'CLIENT',
    contactStatus: 'ACTIVE',
    email: 'accounts@alnoor-group.example',
    phone: '+966 11 490 2210',
    customAttributes: { tax_id: 'SA-3004198', region: 'MENA' },
  },
  {
    id: 'party_vertex_supply',
    name: 'Vertex Core Supply Ltd.',
    partyType: 'SUPPLIER',
    contactStatus: 'ACTIVE',
    email: 'dispatch@vertexsupply.example',
    phone: '+49 30 9018 4412',
    customAttributes: { tax_id: 'DE-5120944', region: 'EMEA' },
  },
  {
    id: 'party_pacific_vendors',
    name: 'Pacific Basin Partners',
    partyType: 'SUPPLIER',
    contactStatus: 'PENDING',
    email: 'onboarding@pacificbasin.example',
    phone: '+65 6789 3411',
    customAttributes: { tax_id: 'SG-2094811', region: 'APAC' },
  },
  {
    id: 'party_tariq_mansour',
    name: 'Tariq Al-Mansour',
    partyType: 'EMPLOYEE',
    contactStatus: 'ACTIVE',
    email: 't.mansour@klaro.example',
    phone: '+971 50 482 1900',
    customAttributes: { region: 'MENA' },
  },
];

export const SEED_ITEMS: SeedItem[] = [
  {
    id: 'item_core_unit_a',
    code: 'ITM-1001',
    name: 'Modular Processing Unit',
    itemType: 'PRODUCT',
    unit: 'Unit',
    customAttributes: { classification_code: 'CLS-HW-01' },
  },
  {
    id: 'item_standard_pack',
    code: 'ITM-1002',
    name: 'Standard Enclosure Kit',
    itemType: 'PRODUCT',
    unit: 'Box',
    customAttributes: { classification_code: 'CLS-PKG-04' },
  },
  {
    id: 'item_advisory_hour',
    code: 'SRV-2001',
    name: 'Operational Advisory',
    itemType: 'SERVICE',
    unit: 'Hour',
    customAttributes: { classification_code: 'CLS-PRO-02' },
  },
  {
    id: 'item_annual_support',
    code: 'SRV-2002',
    name: 'Managed SLA Retainer',
    itemType: 'SERVICE',
    unit: 'Month',
    customAttributes: { classification_code: 'CLS-SLA-09' },
  },
];

export const SEED_TEAM_USERS: SeedUser[] = [
  {
    id: 'user_sarah_chen',
    uid: 'user_sarah_chen',
    email: 'sarah.chen@klaro.example',
    displayName: 'Sarah Chen',
    roleCode: 'ACCOUNTANT',
    isActive: true,
  },
  {
    id: 'user_omar_farouk',
    uid: 'user_omar_farouk',
    email: 'omar.farouk@klaro.example',
    displayName: 'Omar Farouk',
    roleCode: 'EMPLOYEE',
    isActive: true,
  },
];

export interface SeedDocumentSpec {
  id: string;
  docNumber: string;
  docType: DocumentType;
  partyId: string;
  partyName: string;
  targetStatus: 'DRAFT' | 'APPROVED';
  notes: string;
  lines: {
    itemId: string;
    itemCode: string;
    itemName: string;
    unit: string;
    quantity: number;
  }[];
  customAttributes: Record<string, string | number | boolean>;
}

export const SEED_DOCUMENTS: SeedDocumentSpec[] = [
  {
    id: 'doc_2026_001',
    docNumber: 'DOC-2026-001',
    docType: 'PURCHASE_ORDER',
    partyId: 'party_vertex_supply',
    partyName: 'Vertex Core Supply Ltd.',
    targetStatus: 'APPROVED',
    notes: 'Initial quarterly replenishment order for core operational units.',
    lines: [
      {
        itemId: 'item_core_unit_a',
        itemCode: 'ITM-1001',
        itemName: 'Modular Processing Unit',
        unit: 'Unit',
        quantity: 12,
      },
      {
        itemId: 'item_standard_pack',
        itemCode: 'ITM-1002',
        itemName: 'Standard Enclosure Kit',
        unit: 'Box',
        quantity: 6,
      },
    ],
    customAttributes: { cost_center: 'CC-300 Procurement' },
  },
  {
    id: 'doc_2026_002',
    docNumber: 'DOC-2026-002',
    docType: 'DRAFT_INVOICE',
    partyId: 'party_meridian_holdings',
    partyName: 'Meridian Global Holdings',
    targetStatus: 'DRAFT',
    notes: 'Pending accountant verification prior to final workflow approval.',
    lines: [
      {
        itemId: 'item_advisory_hour',
        itemCode: 'SRV-2001',
        itemName: 'Operational Advisory',
        unit: 'Hour',
        quantity: 24,
      },
    ],
    customAttributes: { cost_center: 'CC-200 Finance' },
  },
  {
    id: 'doc_2026_003',
    docNumber: 'DOC-2026-003',
    docType: 'GENERIC_DOC',
    partyId: 'party_al_noor_enterprises',
    partyName: 'Al-Noor Commercial Group',
    targetStatus: 'DRAFT',
    notes: 'Quarterly SLA allocation prepared for client review.',
    lines: [
      {
        itemId: 'item_annual_support',
        itemCode: 'SRV-2002',
        itemName: 'Managed SLA Retainer',
        unit: 'Month',
        quantity: 3,
      },
    ],
    customAttributes: { cost_center: 'CC-100 Core Ops' },
  },
];
