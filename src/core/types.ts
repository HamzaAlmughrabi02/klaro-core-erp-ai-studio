/**
 * KLARO CORE LAYER — ABSTRACT ENTITY & RBAC TYPES
 * -----------------------------------------------------------------------------
 * Defines industry-agnostic data contracts shared across Core, Engine, API,
 * and UI layers. All string length limits mirror `firebase-blueprint.json`
 * and `firestore.rules` to guarantee validation synchronicity.
 */

export const WORKSPACE_ID = 'klaro-core';

export const FIELD_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 140,
  CODE_MIN: 2,
  CODE_MAX: 40,
  UNIT_MAX: 32,
  EMAIL_MAX: 160,
  PHONE_MAX: 40,
  NOTES_MAX: 500,
  FIELD_KEY_MIN: 2,
  FIELD_KEY_MAX: 48,
  FIELD_LABEL_MAX: 80,
  DOC_LINES_MAX: 25,
  CUSTOM_ATTRS_MAX: 30,
  SELECT_OPTIONS_MAX: 20,
} as const;

export const FIELD_KEY_REGEX = /^[a-z][a-z0-9_]*$/;

export type Language = 'en' | 'ar';

export type RoleCode = 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE';

export type Permission =
  | 'entities:read'
  | 'entities:write'
  | 'entities:delete'
  | 'documents:create'
  | 'documents:approve'
  | 'config:manage'
  | 'iam:manage';

export type PartyType = 'CLIENT' | 'SUPPLIER' | 'EMPLOYEE';
export type ContactStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export type ItemType = 'PRODUCT' | 'SERVICE';

export type DocumentType = 'DRAFT_INVOICE' | 'PURCHASE_ORDER' | 'GENERIC_DOC';
export type DocumentStatus = 'DRAFT' | 'APPROVED' | 'REJECTED';

export type CustomEntityType = 'PARTY' | 'ITEM' | 'DOCUMENT';
export type CustomFieldType = 'TEXT' | 'NUMBER' | 'SELECT' | 'DATE' | 'BOOLEAN';

export type AuditEntityType =
  | 'PARTY'
  | 'ITEM'
  | 'DOCUMENT'
  | 'CUSTOM_FIELD'
  | 'USER'
  | 'SYSTEM_SETTINGS'
  | 'TEMPORARY_PERMISSION';
export type AuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'DELETED'
  | 'ROLE_UPDATED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED';

export type CustomAttributeValue = string | number | boolean;
export type CustomAttributesMap = Record<string, CustomAttributeValue>;

export interface Role {
  id: string;
  code: RoleCode;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  permissions: Permission[];
  workspaceId: string;
}

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  roleCode: RoleCode;
  isActive: boolean;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Party {
  id: string;
  name: string;
  partyType: PartyType;
  contactStatus: ContactStatus;
  email?: string;
  phone?: string;
  customAttributes?: CustomAttributesMap;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  itemType: ItemType;
  unit: string;
  customAttributes?: CustomAttributesMap;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentLine {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
}

export interface ErpDocument {
  id: string;
  docNumber: string;
  docType: DocumentType;
  partyId: string;
  partyName: string;
  status: DocumentStatus;
  notes?: string;
  lines: DocumentLine[];
  customAttributes?: CustomAttributesMap;
  workspaceId: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFieldDefinition {
  id: string;
  entityType: CustomEntityType;
  fieldKey: string;
  labelEn: string;
  labelAr: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired: boolean;
  isActive: boolean;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorName: string;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  action: AuditAction;
  fromStatus?: string;
  toStatus?: string;
  workspaceId: string;
  createdAt: Date;
}

export interface SystemSettings {
  id: string;
  companyName: string;
  companyNameAr?: string;
  logoDataUrl?: string;
  defaultCurrency: string;
  workspaceId: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface TemporaryPermission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  permission: Permission;
  grantedById: string;
  grantedByName: string;
  expiresAt: Date;
  workspaceId: string;
  createdAt: Date;
}

export type AppModule =
  | 'dashboard'
  | 'parties'
  | 'items'
  | 'documents'
  | 'retail'
  | 'workflows'
  | 'auditLogs'
  | 'config'
  | 'iam'
  | 'settings'
  | 'architecture';
