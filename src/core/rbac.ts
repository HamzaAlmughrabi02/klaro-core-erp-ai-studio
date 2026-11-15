/**
 * KLARO CORE LAYER — ROLE-BASED ACCESS CONTROL (RBAC) MATRIX
 * -----------------------------------------------------------------------------
 * Centralizes role templates and deterministic permission evaluation for both
 * UI affordance gating and Engine-level pre-flight authorization checks.
 */

import {
  Permission,
  Role,
  RoleCode,
  TemporaryPermission,
  WORKSPACE_ID,
} from './types.ts';

export const BOOTSTRAP_ADMIN_EMAIL = 'hamzaalmughrabi6@gmail.com';

export const ALL_PERMISSIONS: Permission[] = [
  'entities:read',
  'entities:write',
  'entities:delete',
  'documents:create',
  'documents:approve',
  'config:manage',
  'iam:manage',
];

export const CORE_ROLE_TEMPLATES: Omit<Role, 'id'>[] = [
  {
    code: 'ADMIN',
    nameEn: 'Administrator',
    nameAr: 'مدير النظام',
    descriptionEn:
      'Full governance across identity management, dynamic schema configuration, entities, and workflow approvals.',
    descriptionAr:
      'صلاحيات كاملة لإدارة الهويات والصلاحيات، تهيئة الحقول المخصصة، الكيانات، واعتماد المستندات.',
    permissions: [
      'entities:read',
      'entities:write',
      'entities:delete',
      'documents:create',
      'documents:approve',
      'config:manage',
      'iam:manage',
    ],
    workspaceId: WORKSPACE_ID,
  },
  {
    code: 'ACCOUNTANT',
    nameEn: 'Accountant',
    nameAr: 'محاسب',
    descriptionEn:
      'Creates and manages parties, catalog items, and generic documents with authority to approve workflow drafts.',
    descriptionAr:
      'إنشاء وإدارة الأطراف والأصناف والمستندات العامة مع صلاحية اعتماد مسودات سير العمل.',
    permissions: [
      'entities:read',
      'entities:write',
      'documents:create',
      'documents:approve',
    ],
    workspaceId: WORKSPACE_ID,
  },
  {
    code: 'EMPLOYEE',
    nameEn: 'Employee',
    nameAr: 'موظف',
    descriptionEn:
      'Operates abstract entities and prepares draft documents for workflow review without approval or config privileges.',
    descriptionAr:
      'إدارة الكيانات الأساسية وإعداد مسودات المستندات للمراجعة دون صلاحيات الاعتماد أو التهيئة.',
    permissions: ['entities:read', 'entities:write', 'documents:create'],
    workspaceId: WORKSPACE_ID,
  },
];

const ROLE_PERMISSION_MAP: Record<RoleCode, Set<Permission>> = {
  ADMIN: new Set(CORE_ROLE_TEMPLATES[0].permissions),
  ACCOUNTANT: new Set(CORE_ROLE_TEMPLATES[1].permissions),
  EMPLOYEE: new Set(CORE_ROLE_TEMPLATES[2].permissions),
};

export function makeTemporaryPermissionId(userId: string, permission: Permission): string {
  return `${userId}__${permission.replace(':', '_')}`;
}

export function isTemporaryPermissionActive(
  record: Pick<TemporaryPermission, 'expiresAt'>,
  nowMs: number = Date.now()
): boolean {
  return record.expiresAt.getTime() > nowMs;
}

export function hasPermission(
  roleCode: RoleCode | undefined,
  permission: Permission,
  rolesFromDb?: Role[],
  temporaryPermissions?: TemporaryPermission[],
  userId?: string,
  nowMs: number = Date.now()
): boolean {
  if (!roleCode) return false;

  let roleGrantsPermission = false;
  if (rolesFromDb && rolesFromDb.length > 0) {
    const matched = rolesFromDb.find((r) => r.code === roleCode);
    if (matched) {
      roleGrantsPermission = matched.permissions.includes(permission);
    } else {
      roleGrantsPermission = ROLE_PERMISSION_MAP[roleCode]?.has(permission) ?? false;
    }
  } else {
    roleGrantsPermission = ROLE_PERMISSION_MAP[roleCode]?.has(permission) ?? false;
  }

  if (roleGrantsPermission) {
    return true;
  }

  if (temporaryPermissions && temporaryPermissions.length > 0 && userId) {
    return temporaryPermissions.some(
      (tp) =>
        tp.userId === userId &&
        tp.permission === permission &&
        isTemporaryPermissionActive(tp, nowMs)
    );
  }

  return false;
}
