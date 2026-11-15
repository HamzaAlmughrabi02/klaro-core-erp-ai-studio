/**
 * KLARO UI LAYER — ON-PREMISE SYSTEM SETTINGS (/dashboard/settings)
 * -----------------------------------------------------------------------------
 * Allows Administrators to brand their on-premise Klaro installation with
 * Company Name (EN/AR), corporate Logo upload, and Default Currency.
 */

import React, { useEffect, useState } from 'react';
import { Building2, RotateCcw, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { saveSystemSettings } from '../api/erpService.ts';
import { KlaroLogo } from '../components/KlaroLogo.tsx';
import { useErp } from '../context/ErpContext.tsx';

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'SAR', label: 'SAR — Saudi Riyal (ر.س)' },
  { code: 'AED', label: 'AED — UAE Dirham (د.إ)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'JOD', label: 'JOD — Jordanian Dinar (د.أ)' },
  { code: 'EGP', label: 'EGP — Egyptian Pound (ج.م)' },
];

export function SystemSettingsView() {
  const { systemSettings, profile, tr, can, notify } = useErp();

  const canManage = can('iam:manage');

  const [companyName, setCompanyName] = useState('Klaro Enterprise');
  const [companyNameAr, setCompanyNameAr] = useState('كلارو المؤسسية');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (systemSettings) {
      setCompanyName(systemSettings.companyName || 'Klaro Enterprise');
      setCompanyNameAr(systemSettings.companyNameAr || '');
      setDefaultCurrency(systemSettings.defaultCurrency || 'USD');
      setLogoDataUrl(systemSettings.logoDataUrl || '');
    }
  }, [systemSettings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024) {
      notify('error', 'Logo file must be under 100 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !canManage) return;
    setSaving(true);
    try {
      await saveSystemSettings(profile, {
        companyName,
        companyNameAr,
        logoDataUrl,
        defaultCurrency,
      });
      notify('success', tr('settingsSavedToast'));
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl space-y-6"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-5 h-5 text-[#1A2B4A]" />
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A2B4A]">
            {tr('settingsTitle')}
          </h1>
        </div>
        <p className="text-sm text-[#1A2B4A]/65">{tr('settingsSubtitle')}</p>
      </div>

      {!canManage && (
        <div className="px-4 py-3 rounded-lg bg-[#F3F5F7] border border-slate-200 text-xs text-[#1A2B4A]/80">
          <strong>{tr('permissionNotice')}:</strong> {tr('readOnlySettingsNotice')}
        </div>
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden"
      >
        <div className="p-6 space-y-6">
          {/* Corporate Logo Preview & Upload */}
          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-[#1A2B4A]">
              {tr('companyLogo')}
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-[#F3F5F7] border border-slate-200">
              <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {logoDataUrl ? (
                  <img
                    src={logoDataUrl}
                    alt={companyName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <KlaroLogo size={36} showWordmark={false} />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1A2B4A] hover:bg-[#1A2B4A]/90 text-white text-xs font-semibold cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{tr('uploadLogo')}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      disabled={!canManage}
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoDataUrl && canManage && (
                    <button
                      type="button"
                      onClick={() => setLogoDataUrl('')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-[#1A2B4A] hover:bg-slate-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{tr('resetLogo')}</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#1A2B4A]/60">{tr('logoHint')}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1A2B4A]">
                {tr('companyNameEn')} <span className="text-[#FF7A00]">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!canManage}
                maxLength={120}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1A2B4A]">
                {tr('companyNameAr')}
              </label>
              <input
                type="text"
                disabled={!canManage}
                maxLength={120}
                value={companyNameAr}
                onChange={(e) => setCompanyNameAr(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-w-sm">
            <label className="block text-xs font-medium text-[#1A2B4A]">
              {tr('defaultCurrency')} <span className="text-[#FF7A00]">*</span>
            </label>
            <select
              disabled={!canManage}
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#1A2B4A] focus:outline-none focus:border-[#1A2B4A]"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canManage && (
          <div className="px-6 py-4 bg-[#F3F5F7] border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] disabled:opacity-60 text-white text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 hover:brightness-105"
            >
              {tr('save')}
            </button>
          </div>
        )}
      </form>
    </motion.div>
  );
}
