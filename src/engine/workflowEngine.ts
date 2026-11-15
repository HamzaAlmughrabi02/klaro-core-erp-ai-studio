/**
 * KLARO ENGINE LAYER — WORKFLOW STATE MACHINE
 * -----------------------------------------------------------------------------
 * Governs abstract document lifecycle transitions (DRAFT -> APPROVED) and
 * enforces RBAC authorization before committing transitions & audit records.
 */

import { hasPermission } from '../core/rbac.ts';
import {
  DocumentStatus,
  Role,
  RoleCode,
  TemporaryPermission,
} from '../core/types.ts';

export interface TransitionCheck {
  allowed: boolean;
  reason?: string;
}

export function canTransitionDocumentStatus(
  fromStatus: DocumentStatus,
  toStatus: DocumentStatus,
  roleCode: RoleCode | undefined,
  roles?: Role[],
  temporaryPermissions?: TemporaryPermission[],
  userId?: string
): TransitionCheck {
  if (fromStatus === toStatus) {
    return { allowed: false, reason: 'Document is already in the target status.' };
  }

  if (fromStatus === 'APPROVED' || fromStatus === 'REJECTED') {
    return { allowed: false, reason: 'Finalized documents are locked by the workflow engine.' };
  }

  if (fromStatus === 'DRAFT' && (toStatus === 'APPROVED' || toStatus === 'REJECTED')) {
    const permitted = hasPermission(
      roleCode,
      'documents:approve',
      roles,
      temporaryPermissions,
      userId
    );
    if (!permitted) {
      return {
        allowed: false,
        reason: 'Only Admin, Accountant, or users with an active documents:approve delegation may approve or reject workflow documents.',
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Unsupported workflow state transition.' };
}
