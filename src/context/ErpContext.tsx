/**
 * KLARO STATE MANAGEMENT — REACT CONTEXT PROVIDER & URL ROUTER
 * -----------------------------------------------------------------------------
 * Connects Firebase Authentication, real-time Firestore workspace streams,
 * on-premise SystemSettings, RBAC permission evaluation, History API routing,
 * and bilingual LTR/RTL state.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from 'firebase/auth';
import {
  cleanupExpiredDelegations,
  seedWorkspaceIfNeeded,
  subscribeWorkspaceData,
  syncAuthenticatedUser,
} from '../api/erpService.ts';
import { hasPermission } from '../core/rbac.ts';
import {
  AppModule,
  AuditLog,
  CustomFieldDefinition,
  ErpDocument,
  Item,
  Language,
  Party,
  Permission,
  Role,
  SystemSettings,
  TemporaryPermission,
  UserProfile,
} from '../core/types.ts';
import { auth, googleAuthProvider, testFirestoreConnection } from '../engine/firebase.ts';
import { t, TranslationKey } from '../engine/i18n.ts';

export type SubRoute = 'list' | 'new';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

function parsePathname(pathname: string): { module: AppModule; subRoute: SubRoute } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/dashboard/parties/new') {
    return { module: 'parties', subRoute: 'new' };
  }
  if (clean === '/dashboard/parties') {
    return { module: 'parties', subRoute: 'list' };
  }
  if (clean === '/dashboard/items') {
    return { module: 'items', subRoute: 'list' };
  }
  if (clean === '/dashboard/documents') {
    return { module: 'documents', subRoute: 'list' };
  }
  if (clean === '/dashboard/retail') {
    return { module: 'retail', subRoute: 'list' };
  }
  if (clean === '/dashboard/workflows') {
    return { module: 'workflows', subRoute: 'list' };
  }
  if (clean === '/dashboard/audit-logs') {
    return { module: 'auditLogs', subRoute: 'list' };
  }
  if (clean === '/dashboard/configuration') {
    return { module: 'config', subRoute: 'list' };
  }
  if (clean === '/dashboard/iam') {
    return { module: 'iam', subRoute: 'list' };
  }
  if (clean === '/dashboard/settings') {
    return { module: 'settings', subRoute: 'list' };
  }
  if (clean === '/dashboard/architecture' || clean === '/dashboard/blueprint') {
    return { module: 'architecture', subRoute: 'list' };
  }
  return { module: 'dashboard', subRoute: 'list' };
}

function buildPathname(module: AppModule, subRoute: SubRoute = 'list'): string {
  switch (module) {
    case 'parties':
      return subRoute === 'new' ? '/dashboard/parties/new' : '/dashboard/parties';
    case 'items':
      return '/dashboard/items';
    case 'documents':
      return '/dashboard/documents';
    case 'retail':
      return '/dashboard/retail';
    case 'workflows':
      return '/dashboard/workflows';
    case 'auditLogs':
      return '/dashboard/audit-logs';
    case 'config':
      return '/dashboard/configuration';
    case 'iam':
      return '/dashboard/iam';
    case 'settings':
      return '/dashboard/settings';
    case 'architecture':
      return '/dashboard/blueprint';
    case 'dashboard':
    default:
      return '/dashboard';
  }
}

interface ErpContextValue {
  authLoading: boolean;
  dataLoading: boolean;
  firebaseUser: User | null;
  profile: UserProfile | null;
  roles: Role[];
  users: UserProfile[];
  parties: Party[];
  items: Item[];
  documents: ErpDocument[];
  customFields: CustomFieldDefinition[];
  auditLogs: AuditLog[];
  systemSettings: SystemSettings | null;
  temporaryPermissions: TemporaryPermission[];
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  tr: (key: TranslationKey) => string;
  activeModule: AppModule;
  subRoute: SubRoute;
  setActiveModule: (module: AppModule, subRoute?: SubRoute) => void;
  can: (permission: Permission) => boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  notify: (type: ToastMessage['type'], text: string) => void;
  toasts: ToastMessage[];
  dismissToast: (id: number) => void;
  errorBanner: string | null;
  clearErrorBanner: () => void;
}

const ErpContext = createContext<ErpContextValue | null>(null);

export function ErpProvider({ children }: { children: React.ReactNode }) {
  const initialRoute = parsePathname(
    typeof window !== 'undefined' ? window.location.pathname : '/dashboard'
  );

  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [documents, setDocuments] = useState<ErpDocument[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [temporaryPermissions, setTemporaryPermissions] = useState<TemporaryPermission[]>([]);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const [lang, setLangState] = useState<Language>('en');
  const [activeModule, setActiveModuleState] = useState<AppModule>(initialRoute.module);
  const [subRoute, setSubRoute] = useState<SubRoute>(initialRoute.subRoute);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parsePathname(window.location.pathname);
      setActiveModuleState(parsed.module);
      setSubRoute(parsed.subRoute);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setActiveModule = useCallback((module: AppModule, nextSub: SubRoute = 'list') => {
    setActiveModuleState(module);
    setSubRoute(nextSub);
    const targetPath = buildPathname(module, nextSub);
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  }, []);

  useEffect(() => {
    void testFirestoreConnection();

    let unsubs: (() => void)[] = [];
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubs.forEach((fn) => fn());
      unsubs = [];

      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setRoles([]);
        setUsers([]);
        setParties([]);
        setItems([]);
        setDocuments([]);
        setCustomFields([]);
        setAuditLogs([]);
        setSystemSettings(null);
        setTemporaryPermissions([]);
        setAuthLoading(false);
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      try {
        const syncedProfile = await syncAuthenticatedUser(user);
        setProfile(syncedProfile);
        await seedWorkspaceIfNeeded(syncedProfile);

        unsubs = subscribeWorkspaceData(syncedProfile, {
          onRoles: setRoles,
          onUsers: (list) => {
            setUsers(list);
            const updatedSelf = list.find((u) => u.uid === syncedProfile.uid);
            if (updatedSelf) setProfile(updatedSelf);
          },
          onParties: setParties,
          onItems: setItems,
          onDocuments: setDocuments,
          onCustomFields: setCustomFields,
          onAuditLogs: setAuditLogs,
          onSystemSettings: setSystemSettings,
          onTemporaryPermissions: (list) => {
            setTemporaryPermissions(list);
            if (list.some((d) => d.expiresAt.getTime() <= Date.now())) {
              void cleanupExpiredDelegations(list);
            }
          },
          onError: (msg) => setErrorBanner(msg),
        });
      } catch (err) {
        setErrorBanner(err instanceof Error ? err.message : 'Failed to initialize workspace');
      } finally {
        setAuthLoading(false);
        setDataLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubs.forEach((fn) => fn());
    };
  }, []);

  const notify = useCallback((type: ToastMessage['type'], text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setErrorBanner(null);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setErrorBanner(msg);
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  useEffect(() => {
    if (temporaryPermissions.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      if (temporaryPermissions.some((d) => d.expiresAt.getTime() <= now)) {
        void cleanupExpiredDelegations(temporaryPermissions);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [temporaryPermissions]);

  const value = useMemo<ErpContextValue>(
    () => ({
      authLoading,
      dataLoading,
      firebaseUser,
      profile,
      roles,
      users,
      parties,
      items,
      documents,
      customFields,
      auditLogs,
      systemSettings,
      temporaryPermissions,
      lang,
      setLang: setLangState,
      toggleLang: () => setLangState((prev) => (prev === 'en' ? 'ar' : 'en')),
      tr: (key) => t(lang, key),
      activeModule,
      subRoute,
      setActiveModule,
      can: (permission) =>
        hasPermission(
          profile?.roleCode,
          permission,
          roles,
          temporaryPermissions,
          profile?.uid,
          nowTick
        ),
      signInWithGoogle,
      signOut,
      notify,
      toasts,
      dismissToast,
      errorBanner,
      clearErrorBanner: () => setErrorBanner(null),
    }),
    [
      authLoading,
      dataLoading,
      firebaseUser,
      profile,
      roles,
      users,
      parties,
      items,
      documents,
      customFields,
      auditLogs,
      systemSettings,
      temporaryPermissions,
      nowTick,
      lang,
      activeModule,
      subRoute,
      setActiveModule,
      signInWithGoogle,
      signOut,
      notify,
      toasts,
      dismissToast,
      errorBanner,
    ]
  );

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
}

export function useErp(): ErpContextValue {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error('useErp must be used inside ErpProvider');
  return ctx;
}
