/**
 * KLARO UI LAYER — IDENTITY & ACCESS MANAGEMENT (IAM)
 * -----------------------------------------------------------------------------
 * Displays workspace users, role assignment controls (Admin, Accountant,
 * Employee), account active/inactive toggles, and the full RBAC Permission Matrix.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock,
  KeyRound,
  Minus,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  addTeamMember,
  grantTemporaryPermission,
  revokeTemporaryPermission,
  updateUserRoleAndStatus,
} from '../api/erpService.ts';
import { ActionTooltip } from '../components/ActionTooltip.tsx';
import { EmptyState } from '../components/EmptyStateIllustration.tsx';
import { InfoTooltip } from '../components/InfoTooltip.tsx';
import { useErp } from '../context/ErpContext.tsx';
import {
  ALL_PERMISSIONS,
  CORE_ROLE_TEMPLATES,
  hasPermission,
  isTemporaryPermissionActive,
} from '../core/rbac.ts';
import {
  Permission,
  RoleCode,
  TemporaryPermission,
  UserProfile,
} from '../core/types.ts';
import { TranslationKey } from '../engine/i18n.ts';

const PERM_LABEL_KEYS: Record<Permission, TranslationKey> = {
  'entities:read': 'permEntitiesRead',
  'entities:write': 'permEntitiesWrite',
  'entities:delete': 'permEntitiesDelete',
  'documents:create': 'permDocsCreate',
  'documents:approve': 'permDocsApprove',
  'config:manage': 'permConfigManage',
  'iam:manage': 'permIamManage',
};

type DurationPreset = '1H' | '1D' | '1W' | 'CUSTOM';

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatCountdown(expiresAt: Date, nowMs: number, expiredText: string): string {
  const diffMs = expiresAt.getTime() - nowMs;
  if (diffMs <= 0) return expiredText;
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(mins)}m`;
  }
  return `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
}

export function IamView() {
  const { users, roles, temporaryPermissions, profile, lang, tr, can, notify } = useErp();

  const canManageIam = can('iam:manage');

  const [activeTab, setActiveTab] = useState<'users' | 'delegations'>('users');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Add User Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState<RoleCode>('EMPLOYEE');
  const [saving, setSaving] = useState(false);

  // Grant Temporary Permission Modal state
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<Permission>('documents:approve');
  const [durationPreset, setDurationPreset] = useState<DurationPreset>('1H');
  const [customExpiryInput, setCustomExpiryInput] = useState(() =>
    toLocalDateTimeInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // 1-second live countdown ticker while delegations exist
  useEffect(() => {
    if (temporaryPermissions.length === 0) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [temporaryPermissions.length]);

  const activeDelegations = useMemo(
    () => temporaryPermissions.filter((d) => isTemporaryPermissionActive(d, nowMs)),
    [temporaryPermissions, nowMs]
  );

  const delegationsByUserId = useMemo(() => {
    const map = new Map<string, TemporaryPermission[]>();
    for (const del of activeDelegations) {
      const existing = map.get(del.userId) ?? [];
      existing.push(del);
      map.set(del.userId, existing);
    }
    return map;
  }, [activeDelegations]);

  const openGrantModal = (preselectedUserId?: string) => {
    const defaultUser =
      (preselectedUserId ? users.find((u) => u.uid === preselectedUserId) : undefined) ??
      users.find((u) => u.roleCode !== 'ADMIN') ??
      users[0];
    setTargetUserId(defaultUser?.uid ?? '');
    setSelectedPermission('documents:approve');
    setDurationPreset('1H');
    setCustomExpiryInput(toLocalDateTimeInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
    setGrantModalOpen(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await addTeamMember(profile, { email, displayName, roleCode });
      notify('success', `${displayName} · ${tr(`role${roleCode}`)}`);
      setDrawerOpen(false);
      setDisplayName('');
      setEmail('');
      setRoleCode('EMPLOYEE');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (target: UserProfile, nextRole: RoleCode) => {
    if (!profile) return;
    try {
      await updateUserRoleAndStatus(profile, target, nextRole, target.isActive);
      notify('success', `${target.displayName} → ${tr(`role${nextRole}`)}`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleToggleActive = async (target: UserProfile) => {
    if (!profile) return;
    try {
      await updateUserRoleAndStatus(profile, target, target.roleCode, !target.isActive);
      notify('info', `${target.displayName} · ${!target.isActive ? tr('active') : tr('inactive')}`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update account state');
    }
  };

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const targetUser = users.find((u) => u.uid === targetUserId);
    if (!targetUser) {
      notify('error', tr('selectUser'));
      return;
    }

    let expiresAt: Date;
    const now = Date.now();
    if (durationPreset === '1H') {
      expiresAt = new Date(now + 60 * 60 * 1000);
    } else if (durationPreset === '1D') {
      expiresAt = new Date(now + 24 * 60 * 60 * 1000);
    } else if (durationPreset === '1W') {
      expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
    } else {
      expiresAt = new Date(customExpiryInput);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now) {
        notify('error', 'Please choose a future expiration date and time.');
        return;
      }
    }

    setGranting(true);
    try {
      await grantTemporaryPermission(profile, {
        targetUser,
        permission: selectedPermission,
        expiresAt,
      });
      notify('success', `${targetUser.displayName} · ${selectedPermission} · ${tr('delegationGrantedToast')}`);
      setGrantModalOpen(false);
      setActiveTab('delegations');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to grant temporary permission');
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (delegation: TemporaryPermission) => {
    if (!profile) return;
    setRevokingId(delegation.id);
    try {
      await revokeTemporaryPermission(profile, delegation);
      notify('info', `${delegation.userName} · ${tr('delegationRevokedToast')}`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to revoke permission');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Header & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-ink" />
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {tr('iamTitle')}
            </h1>
            <InfoTooltip text={tr('iamTooltip')} />
          </div>
          <p className="text-sm text-muted">{tr('iamSubtitle')}</p>
        </div>

        {canManageIam && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <ActionTooltip label={tr('grantTempPermissionSub')} side="bottom">
              <button
                type="button"
                onClick={() => openGrantModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-all duration-150 hover:brightness-105 whitespace-nowrap"
              >
                <Clock className="w-4 h-4" />
                <span>{tr('grantTempPermission')}</span>
              </button>
            </ActionTooltip>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line bg-canvas hover:bg-surface text-ink text-xs font-semibold transition-all duration-150 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{tr('addUser')}</span>
            </button>
          </div>
        )}
      </div>

      {!canManageIam && (
        <div className="px-4 py-3 rounded-xl bg-surface border border-line text-xs text-ink/80">
          <strong>{tr('permissionNotice')}:</strong> {tr('readOnlyIamNotice')}
        </div>
      )}

      {/* Segmented Section Tabs */}
      <div className="klaro-tabs self-start">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-canvas text-ink border border-line/80 shadow-[var(--shadow-card)]'
              : 'text-muted hover:text-ink'
          }`}
        >
          {tr('tabUsersRoles')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('delegations')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'delegations'
              ? 'bg-canvas text-ink border border-line/80 shadow-[var(--shadow-card)]'
              : 'text-muted hover:text-ink'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-brand" />
          <span>{tr('tabTempDelegations')}</span>
          <span className="font-mono-tabular text-xs font-bold text-brand">
            {activeDelegations.length}
          </span>
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-8">
          {/* Users Table */}
          <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-canvas border-b border-line text-xs font-semibold text-muted">
                    <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('displayName')}</th>
                    <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('email')}</th>
                    <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('role')}</th>
                    <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('accountState')}</th>
                    {canManageIam && (
                      <th className="py-3.5 px-5 text-end whitespace-nowrap">{tr('actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {users.map((u) => {
                    const isSelf = u.uid === profile?.uid;
                    const userTempList = delegationsByUserId.get(u.uid) ?? [];
                    return (
                      <tr
                        key={u.id}
                        className="h-12 hover:bg-surface transition-colors duration-200"
                      >
                        <td className="py-3 px-5 font-semibold text-ink whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span>{u.displayName}</span>
                            {userTempList.length > 0 && (
                              <ActionTooltip
                                label={userTempList.map((d) => d.permission).join(', ')}
                                side="top"
                              >
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('delegations')}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>
                                    {tr('temporaryLabel')} ({userTempList.length})
                                  </span>
                                </button>
                              </ActionTooltip>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-5 text-xs text-ink/70 whitespace-nowrap">
                          {u.email}
                        </td>
                        <td className="py-3 px-5 whitespace-nowrap">
                          {canManageIam && !isSelf ? (
                            <select
                              value={u.roleCode}
                              onChange={(e) => void handleUpdateRole(u, e.target.value as RoleCode)}
                              className="h-8 px-2.5 rounded-md border border-line bg-canvas text-xs font-semibold text-ink"
                            >
                              <option value="ADMIN">{tr('roleADMIN')}</option>
                              <option value="ACCOUNTANT">{tr('roleACCOUNTANT')}</option>
                              <option value="EMPLOYEE">{tr('roleEMPLOYEE')}</option>
                            </select>
                          ) : (
                            <span className="text-xs font-semibold text-ink">
                              {tr(`role${u.roleCode}`)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 whitespace-nowrap">
                          {canManageIam && !isSelf ? (
                            <button
                              onClick={() => void handleToggleActive(u)}
                              className={`text-xs font-semibold hover:underline ${
                                u.isActive ? 'text-success' : 'text-muted'
                              }`}
                            >
                              {u.isActive ? tr('active') : tr('inactive')}
                            </button>
                          ) : (
                            <span
                              className={`text-xs font-semibold ${
                                u.isActive ? 'text-success' : 'text-muted'
                              }`}
                            >
                              {u.isActive ? tr('active') : tr('inactive')}
                            </span>
                          )}
                        </td>
                        {canManageIam && (
                          <td className="py-3 px-5 text-end whitespace-nowrap">
                            <ActionTooltip label={tr('grantTempPermission')} side="top">
                              <button
                                type="button"
                                onClick={() => openGrantModal(u.uid)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-line bg-canvas hover:bg-surface text-xs font-semibold text-ink transition-all duration-150"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-brand" />
                                <span>{tr('temporaryLabel')}</span>
                              </button>
                            </ActionTooltip>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RBAC Permissions Matrix */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink">{tr('permissionsMatrix')}</h2>
            <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="bg-canvas border-b border-line text-xs font-semibold text-muted">
                      <th className="py-3.5 px-5 text-start whitespace-nowrap">
                        {tr('permissionsMatrix')}
                      </th>
                      {CORE_ROLE_TEMPLATES.map((r) => (
                        <th key={r.code} className="py-3 px-4 text-center whitespace-nowrap">
                          {lang === 'ar' ? r.nameAr : r.nameEn}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {ALL_PERMISSIONS.map((perm) => (
                      <tr key={perm} className="h-10 hover:bg-surface transition-colors duration-200">
                        <td className="py-3 px-5 font-medium text-ink">
                          {tr(PERM_LABEL_KEYS[perm])}
                          <span className="font-mono-tabular text-muted ms-2">
                            ({perm})
                          </span>
                        </td>
                        {CORE_ROLE_TEMPLATES.map((r) => {
                          const granted = hasPermission(r.code, perm, roles);
                          return (
                            <td key={r.code} className="py-3 px-5 text-center">
                              {granted ? (
                                <Check className="w-4 h-4 text-success mx-auto" />
                              ) : (
                                <Minus className="w-4 h-4 text-line-strong mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Temporary Permissions Table */
        <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
          {activeDelegations.length === 0 ? (
            <EmptyState
              variant="audit"
              title={tr('noDelegationsTitle')}
              description={tr('noDelegationsHint')}
              ctaLabel={canManageIam ? tr('grantTempPermission') : undefined}
              onAction={canManageIam ? () => openGrantModal() : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-canvas border-b border-line text-xs font-semibold text-muted">
                    <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('displayName')}</th>
                    <th className="py-3.5 px-5 text-start whitespace-nowrap">
                      {tr('selectPermission')}
                    </th>
                    <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('grantedBy')}</th>
                    <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('expiresIn')}</th>
                    <th className="py-3.5 px-5 text-start whitespace-nowrap">{tr('expiresAt')}</th>
                    {canManageIam && (
                      <th className="py-3.5 px-5 text-end whitespace-nowrap">{tr('actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {activeDelegations.map((del) => {
                    const remainingMs = del.expiresAt.getTime() - nowMs;
                    const isUrgent = remainingMs < 60 * 60 * 1000;
                    return (
                      <tr
                        key={del.id}
                        className="h-12 hover:bg-surface transition-colors duration-200"
                      >
                        <td className="py-3 px-5 whitespace-nowrap">
                          <div className="font-semibold text-ink">{del.userName}</div>
                          <div className="text-xs text-muted">{del.userEmail}</div>
                        </td>
                        <td className="py-3 px-5 whitespace-nowrap">
                          <div className="text-xs font-semibold text-ink">
                            {tr(PERM_LABEL_KEYS[del.permission])}
                          </div>
                          <div className="font-mono-tabular text-xs text-muted">
                            {del.permission}
                          </div>
                        </td>
                        <td className="py-3 px-5 text-xs font-medium text-ink/80 whitespace-nowrap">
                          {del.grantedByName}
                        </td>
                        <td className="py-3 px-5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 font-mono-tabular text-xs font-bold tabular-nums ${
                              isUrgent ? 'text-brand' : 'text-success'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {formatCountdown(del.expiresAt, nowMs, tr('expiredLabel'))}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-5 font-mono-tabular text-xs text-muted whitespace-nowrap">
                          {del.expiresAt.toLocaleString()}
                        </td>
                        {canManageIam && (
                          <td className="py-3 px-5 text-end whitespace-nowrap">
                            <ActionTooltip label={tr('revokeAccess')} side="top">
                              <button
                                type="button"
                                onClick={() => void handleRevoke(del)}
                                disabled={revokingId === del.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-canvas hover:bg-red-50 disabled:opacity-60 text-red-700 text-xs font-semibold transition-all duration-150"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{tr('revokeAccess')}</span>
                              </button>
                            </ActionTooltip>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Grant Temporary Permission Modal */}
      <AnimatePresence>
        {grantModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
            onClick={() => setGrantModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-canvas rounded-2xl shadow-[var(--shadow-card)] border border-line overflow-hidden"
            >
              <div className="h-14 px-6 bg-surface border-b border-line flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-brand shrink-0" />
                  <h2 className="text-sm font-bold text-ink truncate">
                    {tr('grantTempPermission')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setGrantModalOpen(false)}
                  aria-label={tr('close')}
                  className="p-1.5 rounded-xl text-muted hover:bg-canvas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => void handleGrantSubmit(e)} className="p-6 space-y-5">
                <p className="text-xs text-ink/70 leading-relaxed">
                  {tr('grantTempPermissionSub')}
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink">
                    {tr('selectUser')} <span className="text-brand">*</span>
                  </label>
                  <select
                    required
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-sm text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="">{tr('selectUser')}</option>
                    {users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} ({tr(`role${u.roleCode}`)}) — {u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink">
                    {tr('selectPermission')} <span className="text-brand">*</span>
                  </label>
                  <select
                    required
                    value={selectedPermission}
                    onChange={(e) => setSelectedPermission(e.target.value as Permission)}
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-sm text-ink focus:outline-none focus:border-ink"
                  >
                    {ALL_PERMISSIONS.map((perm) => (
                      <option key={perm} value={perm}>
                        {tr(PERM_LABEL_KEYS[perm])} ({perm})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink">
                    {tr('selectDuration')} <span className="text-brand">*</span>
                  </label>
                  <select
                    value={durationPreset}
                    onChange={(e) => setDurationPreset(e.target.value as DurationPreset)}
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-sm text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="1H">{tr('duration1h')}</option>
                    <option value="1D">{tr('duration1d')}</option>
                    <option value="1W">{tr('duration1w')}</option>
                    <option value="CUSTOM">{tr('durationCustom')}</option>
                  </select>
                </div>

                {durationPreset === 'CUSTOM' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink">
                      {tr('customExpiry')} <span className="text-brand">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={customExpiryInput}
                      onChange={(e) => setCustomExpiryInput(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-sm font-mono-tabular text-ink focus:outline-none focus:border-ink"
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-line flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setGrantModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-line text-xs font-medium text-ink hover:bg-surface"
                  >
                    {tr('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={granting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-xs font-semibold transition-all duration-150 hover:brightness-105"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{tr('grantAccessBtn')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add User Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 bg-ink/35 flex justify-end"
          >
            <div className="flex-1" onClick={() => setDrawerOpen(false)} />
            <motion.div
              initial={{ x: lang === 'ar' ? -420 : 420 }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? -420 : 420 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-canvas h-full border-s border-line flex flex-col"
            >
              <div className="h-16 px-6 border-b border-line flex items-center justify-between shrink-0">
                <h2 className="text-base font-bold text-ink">{tr('addUser')}</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-xl text-muted hover:bg-surface"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => void handleAddUser(e)} className="flex-1 p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-ink">
                    {tr('displayName')} <span className="text-brand">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-ink">
                    {tr('email')} <span className="text-brand">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-ink">
                    {tr('role')}
                  </label>
                  <select
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value as RoleCode)}
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-sm text-ink"
                  >
                    <option value="ADMIN">{tr('roleADMIN')}</option>
                    <option value="ACCOUNTANT">{tr('roleACCOUNTANT')}</option>
                    <option value="EMPLOYEE">{tr('roleEMPLOYEE')}</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-line flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="px-4 py-2 rounded-xl border border-line text-xs font-medium text-ink"
                  >
                    {tr('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-xs font-semibold"
                  >
                    {tr('save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
