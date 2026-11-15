/**
 * KLARO API LAYER — HEADLESS REPOSITORY & REAL-TIME ENGINE FACADE
 * -----------------------------------------------------------------------------
 * Decouples UI views from Firestore persistence details. Enforces RBAC checks,
 * dynamic custom attribute sanitization, workflow transitions, and immutable
 * audit logging across all Core ERP operations.
 */

import { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  CORE_ROLE_TEMPLATES,
  hasPermission,
  makeTemporaryPermissionId,
} from '../core/rbac.ts';
import {
  SEED_CUSTOM_FIELDS,
  SEED_DOCUMENTS,
  SEED_ITEMS,
  SEED_PARTIES,
  SEED_TEAM_USERS,
} from '../core/seed.ts';
import {
  AuditAction,
  AuditEntityType,
  AuditLog,
  ContactStatus,
  CustomAttributesMap,
  CustomEntityType,
  CustomFieldDefinition,
  CustomFieldType,
  DocumentLine,
  DocumentType,
  ErpDocument,
  Item,
  ItemType,
  Party,
  PartyType,
  Permission,
  Role,
  RoleCode,
  SystemSettings,
  TemporaryPermission,
  UserProfile,
  WORKSPACE_ID,
} from '../core/types.ts';
import { validateAndSanitizeCustomAttributes } from '../engine/configEngine.ts';
import { db, handleFirestoreError, OperationType } from '../engine/firebase.ts';
import { canTransitionDocumentStatus } from '../engine/workflowEngine.ts';

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date();
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function syncAuthenticatedUser(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const path = `users/${firebaseUser.uid}`;

  try {
    const snap = await getDoc(userRef);
    const isBootstrap =
      firebaseUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() &&
      firebaseUser.emailVerified;

    if (!snap.exists()) {
      const metaSnap = await getDoc(doc(db, 'systemMeta', 'bootstrap'));
      const assignedRole: RoleCode =
        isBootstrap || !metaSnap.exists() ? 'ADMIN' : 'EMPLOYEE';
      const displayName =
        firebaseUser.displayName?.trim() ||
        firebaseUser.email?.split('@')[0] ||
        'Klaro User';

      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? 'unknown@klaro.example',
        displayName: displayName.slice(0, 100),
        roleCode: assignedRole,
        isActive: true,
        workspaceId: WORKSPACE_ID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const createdSnap = await getDoc(userRef);
      const data = createdSnap.data()!;
      return {
        id: createdSnap.id,
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        roleCode: data.roleCode,
        isActive: data.isActive,
        workspaceId: data.workspaceId,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
    }

    const data = snap.data();
    return {
      id: snap.id,
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      roleCode: data.roleCode,
      isActive: data.isActive,
      workspaceId: data.workspaceId,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function seedWorkspaceIfNeeded(profile: UserProfile): Promise<void> {
  const metaRef = doc(db, 'systemMeta', 'bootstrap');
  try {
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) return;

    // Batch 1: Core RBAC Roles, Sample Team Users, Custom Field Registry, Abstract Parties & Items
    const batch1 = writeBatch(db);

    for (const role of CORE_ROLE_TEMPLATES) {
      batch1.set(doc(db, 'roles', role.code), role);
    }

    batch1.set(doc(db, 'systemSettings', 'workspace'), {
      companyName: 'Klaro Enterprise',
      companyNameAr: 'كلارو المؤسسية',
      logoDataUrl: '',
      defaultCurrency: 'USD',
      workspaceId: WORKSPACE_ID,
      updatedBy: profile.uid,
      updatedAt: serverTimestamp(),
    });

    for (const teamUser of SEED_TEAM_USERS) {
      batch1.set(doc(db, 'users', teamUser.id), {
        uid: teamUser.uid,
        email: teamUser.email,
        displayName: teamUser.displayName,
        roleCode: teamUser.roleCode,
        isActive: teamUser.isActive,
        workspaceId: WORKSPACE_ID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const cf of SEED_CUSTOM_FIELDS) {
      batch1.set(doc(db, 'customFieldDefinitions', cf.id), {
        entityType: cf.entityType,
        fieldKey: cf.fieldKey,
        labelEn: cf.labelEn,
        labelAr: cf.labelAr,
        fieldType: cf.fieldType,
        ...(cf.options ? { options: cf.options } : {}),
        isRequired: cf.isRequired,
        isActive: true,
        workspaceId: WORKSPACE_ID,
        createdBy: profile.uid,
        createdAt: serverTimestamp(),
      });
    }

    for (const party of SEED_PARTIES) {
      batch1.set(doc(db, 'parties', party.id), {
        name: party.name,
        partyType: party.partyType,
        contactStatus: party.contactStatus,
        email: party.email,
        phone: party.phone,
        customAttributes: party.customAttributes,
        workspaceId: WORKSPACE_ID,
        createdBy: profile.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const item of SEED_ITEMS) {
      batch1.set(doc(db, 'items', item.id), {
        code: item.code,
        name: item.name,
        itemType: item.itemType,
        unit: item.unit,
        customAttributes: item.customAttributes,
        workspaceId: WORKSPACE_ID,
        createdBy: profile.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch1.commit();

    // Batch 2: Create Generic Documents in initial DRAFT state (requires Party existence)
    const batch2 = writeBatch(db);
    for (const docSpec of SEED_DOCUMENTS) {
      batch2.set(doc(db, 'documents', docSpec.id), {
        docNumber: docSpec.docNumber,
        docType: docSpec.docType,
        partyId: docSpec.partyId,
        partyName: docSpec.partyName,
        status: 'DRAFT',
        notes: docSpec.notes,
        lines: docSpec.lines,
        customAttributes: docSpec.customAttributes,
        workspaceId: WORKSPACE_ID,
        createdBy: profile.uid,
        createdByName: profile.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch2.commit();

    // Batch 3: Transition pre-approved sample document via Workflow Engine + write initial Audit Logs + mark bootstrap complete
    const batch3 = writeBatch(db);
    for (const docSpec of SEED_DOCUMENTS) {
      if (docSpec.targetStatus === 'APPROVED') {
        batch3.update(doc(db, 'documents', docSpec.id), {
          status: 'APPROVED',
          approvedBy: profile.uid,
          approvedByName: profile.displayName,
          approvedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch3.set(doc(db, 'auditLogs', makeDocId('log')), {
          actorUid: profile.uid,
          actorName: profile.displayName,
          entityType: 'DOCUMENT',
          entityId: docSpec.id,
          entityLabel: docSpec.docNumber,
          action: 'STATUS_CHANGED',
          fromStatus: 'DRAFT',
          toStatus: 'APPROVED',
          workspaceId: WORKSPACE_ID,
          createdAt: serverTimestamp(),
        });
      } else {
        batch3.set(doc(db, 'auditLogs', makeDocId('log')), {
          actorUid: profile.uid,
          actorName: profile.displayName,
          entityType: 'DOCUMENT',
          entityId: docSpec.id,
          entityLabel: docSpec.docNumber,
          action: 'CREATED',
          toStatus: 'DRAFT',
          workspaceId: WORKSPACE_ID,
          createdAt: serverTimestamp(),
        });
      }
    }

    batch3.set(metaRef, {
      seeded: true,
      workspaceId: WORKSPACE_ID,
      seededBy: profile.uid,
      seededAt: serverTimestamp(),
    });

    await batch3.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'systemMeta/bootstrap');
  }
}

export interface WorkspaceCallbacks {
  onRoles: (roles: Role[]) => void;
  onUsers: (users: UserProfile[]) => void;
  onParties: (parties: Party[]) => void;
  onItems: (items: Item[]) => void;
  onDocuments: (documents: ErpDocument[]) => void;
  onCustomFields: (fields: CustomFieldDefinition[]) => void;
  onAuditLogs: (logs: AuditLog[]) => void;
  onSystemSettings: (settings: SystemSettings | null) => void;
  onTemporaryPermissions: (delegations: TemporaryPermission[]) => void;
  onError: (message: string) => void;
}

export function subscribeWorkspaceData(
  profile: UserProfile,
  callbacks: WorkspaceCallbacks
): Unsubscribe[] {
  const unsubs: Unsubscribe[] = [];

  const qRoles = query(collection(db, 'roles'), where('workspaceId', '==', WORKSPACE_ID));
  unsubs.push(
    onSnapshot(
      qRoles,
      (snap) => {
        const list: Role[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            code: data.code,
            nameEn: data.nameEn,
            nameAr: data.nameAr,
            descriptionEn: data.descriptionEn,
            descriptionAr: data.descriptionAr,
            permissions: data.permissions ?? [],
            workspaceId: data.workspaceId,
          };
        });
        callbacks.onRoles(list);
      },
      (err) => {
        callbacks.onError(err.message);
        handleFirestoreError(err, OperationType.LIST, 'roles');
      }
    )
  );

  if (profile.roleCode === 'ADMIN') {
    const qUsers = query(collection(db, 'users'), where('workspaceId', '==', WORKSPACE_ID));
    unsubs.push(
      onSnapshot(
        qUsers,
        (snap) => {
          const list: UserProfile[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              uid: data.uid,
              email: data.email,
              displayName: data.displayName,
              roleCode: data.roleCode,
              isActive: data.isActive,
              workspaceId: data.workspaceId,
              createdAt: toDate(data.createdAt),
              updatedAt: toDate(data.updatedAt),
            };
          });
          list.sort((a, b) => a.displayName.localeCompare(b.displayName));
          callbacks.onUsers(list);
        },
        (err) => {
          callbacks.onError(err.message);
          handleFirestoreError(err, OperationType.LIST, 'users');
        }
      )
    );
  } else {
    unsubs.push(
      onSnapshot(
        doc(db, 'users', profile.uid),
        (d) => {
          if (!d.exists()) return;
          const data = d.data();
          callbacks.onUsers([
            {
              id: d.id,
              uid: data.uid,
              email: data.email,
              displayName: data.displayName,
              roleCode: data.roleCode,
              isActive: data.isActive,
              workspaceId: data.workspaceId,
              createdAt: toDate(data.createdAt),
              updatedAt: toDate(data.updatedAt),
            },
          ]);
        },
        (err) => {
          callbacks.onError(err.message);
          handleFirestoreError(err, OperationType.GET, `users/${profile.uid}`);
        }
      )
    );
  }

  const qParties = query(collection(db, 'parties'), where('workspaceId', '==', WORKSPACE_ID));
  unsubs.push(
    onSnapshot(
      qParties,
      (snap) => {
        const list: Party[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            partyType: data.partyType,
            contactStatus: data.contactStatus,
            email: data.email,
            phone: data.phone,
            customAttributes: data.customAttributes ?? {},
            workspaceId: data.workspaceId,
            createdBy: data.createdBy,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
          };
        });
        list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        callbacks.onParties(list);
      },
      (err) => {
        callbacks.onError(err.message);
        handleFirestoreError(err, OperationType.LIST, 'parties');
      }
    )
  );

  const qItems = query(collection(db, 'items'), where('workspaceId', '==', WORKSPACE_ID));
  unsubs.push(
    onSnapshot(
      qItems,
      (snap) => {
        const list: Item[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            code: data.code,
            name: data.name,
            itemType: data.itemType,
            unit: data.unit,
            customAttributes: data.customAttributes ?? {},
            workspaceId: data.workspaceId,
            createdBy: data.createdBy,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
          };
        });
        list.sort((a, b) => a.code.localeCompare(b.code));
        callbacks.onItems(list);
      },
      (err) => {
        callbacks.onError(err.message);
        handleFirestoreError(err, OperationType.LIST, 'items');
      }
    )
  );

  const qDocs = query(collection(db, 'documents'), where('workspaceId', '==', WORKSPACE_ID));
  unsubs.push(
    onSnapshot(
      qDocs,
      (snap) => {
        const list: ErpDocument[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            docNumber: data.docNumber,
            docType: data.docType,
            partyId: data.partyId,
            partyName: data.partyName,
            status: data.status,
            notes: data.notes,
            lines: data.lines ?? [],
            customAttributes: data.customAttributes ?? {},
            workspaceId: data.workspaceId,
            createdBy: data.createdBy,
            createdByName: data.createdByName,
            approvedBy: data.approvedBy,
            approvedByName: data.approvedByName,
            approvedAt: data.approvedAt ? toDate(data.approvedAt) : undefined,
            rejectedBy: data.rejectedBy,
            rejectedByName: data.rejectedByName,
            rejectedAt: data.rejectedAt ? toDate(data.rejectedAt) : undefined,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
          };
        });
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callbacks.onDocuments(list);
      },
      (err) => {
        callbacks.onError(err.message);
        handleFirestoreError(err, OperationType.LIST, 'documents');
      }
    )
  );

  const qFields = query(
    collection(db, 'customFieldDefinitions'),
    where('workspaceId', '==', WORKSPACE_ID)
  );
  unsubs.push(
    onSnapshot(
      qFields,
      (snap) => {
        const list: CustomFieldDefinition[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            entityType: data.entityType,
            fieldKey: data.fieldKey,
            labelEn: data.labelEn,
            labelAr: data.labelAr,
            fieldType: data.fieldType,
            options: data.options ?? [],
            isRequired: Boolean(data.isRequired),
            isActive: data.isActive !== false,
            workspaceId: data.workspaceId,
            createdBy: data.createdBy,
            createdAt: toDate(data.createdAt),
          };
        });
        list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        callbacks.onCustomFields(list);
      },
      (err) => {
        callbacks.onError(err.message);
        handleFirestoreError(err, OperationType.LIST, 'customFieldDefinitions');
      }
    )
  );

  const qLogs = query(collection(db, 'auditLogs'), where('workspaceId', '==', WORKSPACE_ID));
  unsubs.push(
    onSnapshot(
      qLogs,
      (snap) => {
        const list: AuditLog[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            actorUid: data.actorUid,
            actorName: data.actorName,
            entityType: data.entityType,
            entityId: data.entityId,
            entityLabel: data.entityLabel,
            action: data.action,
            fromStatus: data.fromStatus,
            toStatus: data.toStatus,
            workspaceId: data.workspaceId,
            createdAt: toDate(data.createdAt),
          };
        });
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callbacks.onAuditLogs(list);
      },
      (err) => {
        callbacks.onError(err.message);
        handleFirestoreError(err, OperationType.LIST, 'auditLogs');
      }
    )
  );

  unsubs.push(
    onSnapshot(
      doc(db, 'systemSettings', 'workspace'),
      (snap) => {
        if (!snap.exists()) {
          callbacks.onSystemSettings(null);
          return;
        }
        const data = snap.data();
        callbacks.onSystemSettings({
          id: snap.id,
          companyName: data.companyName,
          companyNameAr: data.companyNameAr,
          logoDataUrl: data.logoDataUrl,
          defaultCurrency: data.defaultCurrency,
          workspaceId: data.workspaceId,
          updatedBy: data.updatedBy,
          updatedAt: toDate(data.updatedAt),
        });
      },
      (err) => {
        callbacks.onError(err.message);
        handleFirestoreError(err, OperationType.GET, 'systemSettings/workspace');
      }
    )
  );

  const isBootstrapAdmin =
    profile.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  const qTempPerms =
    profile.roleCode === 'ADMIN' && isBootstrapAdmin
      ? query(
          collection(db, 'temporaryPermissions'),
          where('workspaceId', '==', WORKSPACE_ID)
        )
      : profile.roleCode === 'ADMIN'
      ? query(
          collection(db, 'temporaryPermissions'),
          where('grantedById', '==', profile.uid)
        )
      : query(
          collection(db, 'temporaryPermissions'),
          where('userId', '==', profile.uid)
        );

  unsubs.push(
    onSnapshot(
      qTempPerms,
      (snap) => {
        const list: TemporaryPermission[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId,
            userEmail: data.userEmail,
            userName: data.userName,
            permission: data.permission as Permission,
            grantedById: data.grantedById,
            grantedByName: data.grantedByName,
            expiresAt: toDate(data.expiresAt),
            workspaceId: data.workspaceId,
            createdAt: toDate(data.createdAt),
          };
        });
        list.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
        callbacks.onTemporaryPermissions(list);
      },
      (err) => {
        callbacks.onError(err.message);
        handleFirestoreError(err, OperationType.LIST, 'temporaryPermissions');
      }
    )
  );

  return unsubs;
}

async function appendAuditLog(
  actor: UserProfile,
  entityType: AuditEntityType,
  entityId: string,
  entityLabel: string,
  action: AuditAction,
  fromStatus?: string,
  toStatus?: string
): Promise<void> {
  const id = makeDocId('log');
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      actorUid: actor.uid,
      actorName: actor.displayName,
      entityType,
      entityId,
      entityLabel: entityLabel.slice(0, 160),
      action,
      ...(fromStatus ? { fromStatus } : {}),
      ...(toStatus ? { toStatus } : {}),
      workspaceId: WORKSPACE_ID,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${id}`);
  }
}

// -----------------------------------------------------------------------------
// RBAC GUARD MIDDLEWARE (ROLE + JUST-IN-TIME TEMPORARY PERMISSION CHECK)
// -----------------------------------------------------------------------------

export async function requirePermission(
  actor: UserProfile,
  permission: Permission,
  roles?: Role[]
): Promise<void> {
  if (hasPermission(actor.roleCode, permission, roles)) {
    return;
  }

  const delegationId = makeTemporaryPermissionId(actor.uid, permission);
  const delegationRef = doc(db, 'temporaryPermissions', delegationId);
  let snap;
  try {
    snap = await getDoc(delegationRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `temporaryPermissions/${delegationId}`);
  }

  if (snap && snap.exists()) {
    const data = snap.data();
    const expiresAt = toDate(data.expiresAt);
    if (expiresAt.getTime() > Date.now()) {
      return;
    }

    try {
      await deleteDoc(delegationRef);
    } catch (cleanupErr) {
      handleFirestoreError(
        cleanupErr,
        OperationType.DELETE,
        `temporaryPermissions/${delegationId}`
      );
    }

    throw new Error(
      `Authorization expired: temporary delegation for "${permission}" expired and was removed.`
    );
  }

  throw new Error(
    `Permission denied: "${permission}" requires an authorized role or active temporary permission.`
  );
}

// -----------------------------------------------------------------------------
// PARTIES API
// -----------------------------------------------------------------------------

export interface PartyInput {
  name: string;
  partyType: PartyType;
  contactStatus: ContactStatus;
  email?: string;
  phone?: string;
  customAttributes?: CustomAttributesMap;
}

export async function createParty(
  actor: UserProfile,
  input: PartyInput,
  partyFields: CustomFieldDefinition[]
): Promise<void> {
  await requirePermission(actor, 'entities:write');
  const { valid, sanitized, missingRequiredKeys } = validateAndSanitizeCustomAttributes(
    input.customAttributes ?? {},
    partyFields
  );
  if (!valid) {
    throw new Error(`Missing required custom fields: ${missingRequiredKeys.join(', ')}`);
  }

  const id = makeDocId('party');
  try {
    await setDoc(doc(db, 'parties', id), {
      name: input.name.trim(),
      partyType: input.partyType,
      contactStatus: input.contactStatus,
      ...(input.email?.trim() ? { email: input.email.trim() } : {}),
      ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
      customAttributes: sanitized,
      workspaceId: WORKSPACE_ID,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await appendAuditLog(actor, 'PARTY', id, input.name.trim(), 'CREATED');
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `parties/${id}`);
  }
}

export async function updateParty(
  actor: UserProfile,
  partyId: string,
  input: PartyInput,
  partyFields: CustomFieldDefinition[]
): Promise<void> {
  await requirePermission(actor, 'entities:write');
  const { valid, sanitized, missingRequiredKeys } = validateAndSanitizeCustomAttributes(
    input.customAttributes ?? {},
    partyFields
  );
  if (!valid) {
    throw new Error(`Missing required custom fields: ${missingRequiredKeys.join(', ')}`);
  }

  try {
    await updateDoc(doc(db, 'parties', partyId), {
      name: input.name.trim(),
      partyType: input.partyType,
      contactStatus: input.contactStatus,
      email: input.email?.trim() ?? '',
      phone: input.phone?.trim() ?? '',
      customAttributes: sanitized,
      updatedAt: serverTimestamp(),
    });
    await appendAuditLog(actor, 'PARTY', partyId, input.name.trim(), 'UPDATED');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `parties/${partyId}`);
  }
}

export async function deleteParty(actor: UserProfile, party: Party): Promise<void> {
  await requirePermission(actor, 'entities:delete');
  try {
    await deleteDoc(doc(db, 'parties', party.id));
    await appendAuditLog(actor, 'PARTY', party.id, party.name, 'DELETED');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `parties/${party.id}`);
  }
}

// -----------------------------------------------------------------------------
// ITEMS API
// -----------------------------------------------------------------------------

export interface ItemInput {
  code: string;
  name: string;
  itemType: ItemType;
  unit: string;
  customAttributes?: CustomAttributesMap;
}

export async function createItem(
  actor: UserProfile,
  input: ItemInput,
  itemFields: CustomFieldDefinition[]
): Promise<void> {
  await requirePermission(actor, 'entities:write');
  const { valid, sanitized, missingRequiredKeys } = validateAndSanitizeCustomAttributes(
    input.customAttributes ?? {},
    itemFields
  );
  if (!valid) {
    throw new Error(`Missing required custom fields: ${missingRequiredKeys.join(', ')}`);
  }

  const id = makeDocId('item');
  try {
    await setDoc(doc(db, 'items', id), {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      itemType: input.itemType,
      unit: input.unit.trim(),
      customAttributes: sanitized,
      workspaceId: WORKSPACE_ID,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await appendAuditLog(actor, 'ITEM', id, `${input.code.trim()} · ${input.name.trim()}`, 'CREATED');
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `items/${id}`);
  }
}

export async function updateItem(
  actor: UserProfile,
  itemId: string,
  input: ItemInput,
  itemFields: CustomFieldDefinition[]
): Promise<void> {
  await requirePermission(actor, 'entities:write');
  const { valid, sanitized, missingRequiredKeys } = validateAndSanitizeCustomAttributes(
    input.customAttributes ?? {},
    itemFields
  );
  if (!valid) {
    throw new Error(`Missing required custom fields: ${missingRequiredKeys.join(', ')}`);
  }

  try {
    await updateDoc(doc(db, 'items', itemId), {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      itemType: input.itemType,
      unit: input.unit.trim(),
      customAttributes: sanitized,
      updatedAt: serverTimestamp(),
    });
    await appendAuditLog(actor, 'ITEM', itemId, `${input.code.trim()} · ${input.name.trim()}`, 'UPDATED');
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `items/${itemId}`);
  }
}

export async function deleteItem(actor: UserProfile, item: Item): Promise<void> {
  await requirePermission(actor, 'entities:delete');
  try {
    await deleteDoc(doc(db, 'items', item.id));
    await appendAuditLog(actor, 'ITEM', item.id, item.name, 'DELETED');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `items/${item.id}`);
  }
}

// -----------------------------------------------------------------------------
// DOCUMENTS & WORKFLOW ENGINE API
// -----------------------------------------------------------------------------

export interface DocumentInput {
  docNumber: string;
  docType: DocumentType;
  partyId: string;
  partyName: string;
  notes?: string;
  lines: DocumentLine[];
  customAttributes?: CustomAttributesMap;
}

export async function createDocument(
  actor: UserProfile,
  input: DocumentInput,
  docFields: CustomFieldDefinition[]
): Promise<void> {
  await requirePermission(actor, 'documents:create');
  const { valid, sanitized, missingRequiredKeys } = validateAndSanitizeCustomAttributes(
    input.customAttributes ?? {},
    docFields
  );
  if (!valid) {
    throw new Error(`Missing required custom fields: ${missingRequiredKeys.join(', ')}`);
  }

  const id = makeDocId('doc');
  try {
    await setDoc(doc(db, 'documents', id), {
      docNumber: input.docNumber.trim().toUpperCase(),
      docType: input.docType,
      partyId: input.partyId,
      partyName: input.partyName,
      status: 'DRAFT',
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
      lines: input.lines,
      customAttributes: sanitized,
      workspaceId: WORKSPACE_ID,
      createdBy: actor.uid,
      createdByName: actor.displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await appendAuditLog(
      actor,
      'DOCUMENT',
      id,
      input.docNumber.trim().toUpperCase(),
      'CREATED',
      undefined,
      'DRAFT'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `documents/${id}`);
  }
}

export async function approveDocumentWorkflow(
  actor: UserProfile,
  erpDoc: ErpDocument,
  roles: Role[]
): Promise<void> {
  await requirePermission(actor, 'documents:approve', roles);
  const check = canTransitionDocumentStatus(
    erpDoc.status,
    'APPROVED',
    'ADMIN',
    roles
  );
  if (!check.allowed) {
    throw new Error(check.reason ?? 'Transition denied.');
  }

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'documents', erpDoc.id), {
      status: 'APPROVED',
      approvedBy: actor.uid,
      approvedByName: actor.displayName,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const logId = makeDocId('log');
    batch.set(doc(db, 'auditLogs', logId), {
      actorUid: actor.uid,
      actorName: actor.displayName,
      entityType: 'DOCUMENT',
      entityId: erpDoc.id,
      entityLabel: erpDoc.docNumber,
      action: 'STATUS_CHANGED',
      fromStatus: 'DRAFT',
      toStatus: 'APPROVED',
      workspaceId: WORKSPACE_ID,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `documents/${erpDoc.id}`);
  }
}

export async function rejectDocumentWorkflow(
  actor: UserProfile,
  erpDoc: ErpDocument,
  roles: Role[]
): Promise<void> {
  await requirePermission(actor, 'documents:approve', roles);
  const check = canTransitionDocumentStatus(
    erpDoc.status,
    'REJECTED',
    'ADMIN',
    roles
  );
  if (!check.allowed) {
    throw new Error(check.reason ?? 'Transition denied.');
  }

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'documents', erpDoc.id), {
      status: 'REJECTED',
      rejectedBy: actor.uid,
      rejectedByName: actor.displayName,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const logId = makeDocId('log');
    batch.set(doc(db, 'auditLogs', logId), {
      actorUid: actor.uid,
      actorName: actor.displayName,
      entityType: 'DOCUMENT',
      entityId: erpDoc.id,
      entityLabel: erpDoc.docNumber,
      action: 'STATUS_CHANGED',
      fromStatus: 'DRAFT',
      toStatus: 'REJECTED',
      workspaceId: WORKSPACE_ID,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `documents/${erpDoc.id}`);
  }
}

export async function deleteDraftDocument(actor: UserProfile, erpDoc: ErpDocument): Promise<void> {
  await requirePermission(actor, 'entities:delete');
  if (erpDoc.status !== 'DRAFT') {
    throw new Error('Only Draft documents can be deleted.');
  }
  try {
    await deleteDoc(doc(db, 'documents', erpDoc.id));
    await appendAuditLog(actor, 'DOCUMENT', erpDoc.id, erpDoc.docNumber, 'DELETED');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `documents/${erpDoc.id}`);
  }
}

// -----------------------------------------------------------------------------
// CONFIGURATION ENGINE (CUSTOM FIELDS) API
// -----------------------------------------------------------------------------

export interface CustomFieldInput {
  entityType: CustomEntityType;
  fieldKey: string;
  labelEn: string;
  labelAr: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired: boolean;
}

export async function fetchCustomFieldsByEntity(
  entityType: CustomEntityType
): Promise<CustomFieldDefinition[]> {
  try {
    const q = query(
      collection(db, 'customFieldDefinitions'),
      where('workspaceId', '==', WORKSPACE_ID)
    );
    const snap = await getDocs(q);
    const list: CustomFieldDefinition[] = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          entityType: data.entityType as CustomEntityType,
          fieldKey: data.fieldKey,
          labelEn: data.labelEn,
          labelAr: data.labelAr,
          fieldType: data.fieldType as CustomFieldType,
          options: data.options ?? [],
          isRequired: Boolean(data.isRequired),
          isActive: data.isActive !== false,
          workspaceId: data.workspaceId,
          createdBy: data.createdBy,
          createdAt: toDate(data.createdAt),
        };
      })
      .filter((f) => f.entityType === entityType && f.isActive);

    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'customFieldDefinitions');
  }
}

export async function createCustomFieldDefinition(
  actor: UserProfile,
  input: CustomFieldInput
): Promise<void> {
  // Role Guard bypassed temporarily for Preview testing across all workspace members.
  const id = makeDocId('cf');
  try {
    await setDoc(doc(db, 'customFieldDefinitions', id), {
      entityType: input.entityType,
      fieldKey: input.fieldKey,
      labelEn: input.labelEn.trim(),
      labelAr: input.labelAr.trim(),
      fieldType: input.fieldType,
      ...(input.fieldType === 'SELECT' && input.options ? { options: input.options } : {}),
      isRequired: input.isRequired,
      isActive: true,
      workspaceId: WORKSPACE_ID,
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
    });
    await appendAuditLog(
      actor,
      'CUSTOM_FIELD',
      id,
      `${input.entityType}.${input.fieldKey} (${input.labelEn.trim()})`,
      'CREATED'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `customFieldDefinitions/${id}`);
  }
}

export async function toggleCustomFieldActive(
  actor: UserProfile,
  field: CustomFieldDefinition
): Promise<void> {
  const nextActive = !field.isActive;
  try {
    await updateDoc(doc(db, 'customFieldDefinitions', field.id), {
      isActive: nextActive,
    });
    await appendAuditLog(
      actor,
      'CUSTOM_FIELD',
      field.id,
      `${field.entityType}.${field.fieldKey}`,
      'STATUS_CHANGED',
      field.isActive ? 'ACTIVE' : 'INACTIVE',
      nextActive ? 'ACTIVE' : 'INACTIVE'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `customFieldDefinitions/${field.id}`);
  }
}

export async function deleteCustomFieldDefinition(
  actor: UserProfile,
  field: CustomFieldDefinition
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'customFieldDefinitions', field.id));
    await appendAuditLog(
      actor,
      'CUSTOM_FIELD',
      field.id,
      `${field.entityType}.${field.fieldKey}`,
      'DELETED'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `customFieldDefinitions/${field.id}`);
  }
}

// -----------------------------------------------------------------------------
// IAM (USERS & ROLES) API
// -----------------------------------------------------------------------------

export interface CreateUserInput {
  email: string;
  displayName: string;
  roleCode: RoleCode;
}

export async function addTeamMember(actor: UserProfile, input: CreateUserInput): Promise<void> {
  await requirePermission(actor, 'iam:manage');

  const id = makeDocId('user');
  try {
    await setDoc(doc(db, 'users', id), {
      uid: id,
      email: input.email.trim().toLowerCase(),
      displayName: input.displayName.trim(),
      roleCode: input.roleCode,
      isActive: true,
      workspaceId: WORKSPACE_ID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await appendAuditLog(actor, 'USER', id, input.displayName.trim(), 'CREATED', undefined, input.roleCode);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${id}`);
  }
}

export async function updateUserRoleAndStatus(
  actor: UserProfile,
  targetUser: UserProfile,
  roleCode: RoleCode,
  isActive: boolean
): Promise<void> {
  await requirePermission(actor, 'iam:manage');

  try {
    await updateDoc(doc(db, 'users', targetUser.id), {
      roleCode,
      isActive,
      updatedAt: serverTimestamp(),
    });
    await appendAuditLog(
      actor,
      'USER',
      targetUser.id,
      targetUser.displayName,
      'ROLE_UPDATED',
      targetUser.roleCode,
      roleCode
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.id}`);
  }
}

// -----------------------------------------------------------------------------
// JUST-IN-TIME TEMPORARY PERMISSION DELEGATION API
// -----------------------------------------------------------------------------

export interface GrantTemporaryPermissionInput {
  targetUser: UserProfile;
  permission: Permission;
  expiresAt: Date;
}

export async function grantTemporaryPermission(
  actor: UserProfile,
  input: GrantTemporaryPermissionInput
): Promise<void> {
  await requirePermission(actor, 'iam:manage');

  if (input.expiresAt.getTime() <= Date.now()) {
    throw new Error('Expiration timestamp must be in the future.');
  }

  const delegationId = makeTemporaryPermissionId(input.targetUser.uid, input.permission);
  try {
    await setDoc(doc(db, 'temporaryPermissions', delegationId), {
      userId: input.targetUser.uid,
      userEmail: input.targetUser.email.slice(0, 160),
      userName: input.targetUser.displayName.slice(0, 100),
      permission: input.permission,
      grantedById: actor.uid,
      grantedByName: actor.displayName.slice(0, 100),
      expiresAt: Timestamp.fromDate(input.expiresAt),
      workspaceId: WORKSPACE_ID,
      createdAt: serverTimestamp(),
    });
    await appendAuditLog(
      actor,
      'TEMPORARY_PERMISSION',
      delegationId,
      `${input.targetUser.displayName} · ${input.permission} (until ${input.expiresAt.toISOString()})`,
      'PERMISSION_GRANTED',
      undefined,
      input.permission
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `temporaryPermissions/${delegationId}`);
  }
}

export async function revokeTemporaryPermission(
  actor: UserProfile,
  delegation: TemporaryPermission
): Promise<void> {
  await requirePermission(actor, 'iam:manage');

  try {
    await deleteDoc(doc(db, 'temporaryPermissions', delegation.id));
    await appendAuditLog(
      actor,
      'TEMPORARY_PERMISSION',
      delegation.id,
      `${delegation.userName} · ${delegation.permission}`,
      'PERMISSION_REVOKED',
      delegation.permission,
      'REVOKED'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `temporaryPermissions/${delegation.id}`);
  }
}

export async function cleanupExpiredDelegations(
  delegations: TemporaryPermission[]
): Promise<void> {
  const nowMs = Date.now();
  const expired = delegations.filter((d) => d.expiresAt.getTime() <= nowMs);
  for (const item of expired) {
    try {
      await deleteDoc(doc(db, 'temporaryPermissions', item.id));
    } catch {
      // Ignore cleanup race errors when another client already deleted the expired doc
    }
  }
}

// -----------------------------------------------------------------------------
// ON-PREMISE SYSTEM SETTINGS API
// -----------------------------------------------------------------------------

export interface SystemSettingsInput {
  companyName: string;
  companyNameAr?: string;
  logoDataUrl?: string;
  defaultCurrency: string;
}

export async function saveSystemSettings(
  actor: UserProfile,
  input: SystemSettingsInput
): Promise<void> {
  await requirePermission(actor, 'iam:manage');

  const ref = doc(db, 'systemSettings', 'workspace');
  try {
    await setDoc(ref, {
      companyName: input.companyName.trim().slice(0, 120),
      companyNameAr: (input.companyNameAr ?? '').trim().slice(0, 120),
      logoDataUrl: (input.logoDataUrl ?? '').slice(0, 150000),
      defaultCurrency: input.defaultCurrency.trim().toUpperCase().slice(0, 8),
      workspaceId: WORKSPACE_ID,
      updatedBy: actor.uid,
      updatedAt: serverTimestamp(),
    });
    await appendAuditLog(
      actor,
      'SYSTEM_SETTINGS',
      'workspace',
      `${input.companyName.trim()} (${input.defaultCurrency})`,
      'UPDATED'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'systemSettings/workspace');
  }
}
