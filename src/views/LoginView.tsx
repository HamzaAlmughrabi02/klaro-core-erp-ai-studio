/**
 * KLARO UI LAYER — AUTHENTICATION GATEWAY VIEW
 * -----------------------------------------------------------------------------
 * Clean, flat enterprise sign-in page introducing the Klaro Core Engine
 * with bilingual EN/AR switching and Google Sign-In.
 */

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Globe } from 'lucide-react';
import { useErp } from '../context/ErpContext.tsx';
import { KlaroLogo } from '../components/KlaroLogo.tsx';

export function LoginView() {
  const { lang, toggleLang, tr, signInWithGoogle, errorBanner, clearErrorBanner } = useErp();
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1A2B4A] flex flex-col">
      {/* Minimal 3-zone Top Bar */}
      <header className="h-16 px-6 sm:px-10 border-b border-slate-200 flex items-center justify-between gap-8">
        <KlaroLogo size={30} wordmark={tr('brandName')} />
        <button
          onClick={toggleLang}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-[#F3F5F7] hover:bg-slate-200/70 text-xs font-medium text-[#1A2B4A] transition-colors whitespace-nowrap shrink-0"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Left: Architectural Proposition */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <p className="text-xs font-semibold tracking-wider text-[#FF7A00]">
              {tr('brandTagline')}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1A2B4A] text-balance leading-tight">
              {tr('loginTitle')}
            </h1>
            <p className="text-base text-[#1A2B4A]/70 leading-relaxed max-w-xl">
              {tr('loginSubtitle')}
            </p>

            <div className="pt-2 space-y-3 border-t border-slate-200">
              <div className="flex items-start gap-2.5 text-sm text-[#1A2B4A]/85">
                <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0 mt-0.5" />
                <span>{tr('loginFeature1')}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-[#1A2B4A]/85">
                <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0 mt-0.5" />
                <span>{tr('loginFeature2')}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-[#1A2B4A]/85">
                <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0 mt-0.5" />
                <span>{tr('loginFeature3')}</span>
              </div>
            </div>
          </div>

          {/* Right: Flat Single-Elevation Sign-In Card */}
          <div className="lg:col-span-5 flex items-center">
            <div className="w-full p-8 rounded-xl bg-[#F3F5F7] border border-slate-200 space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-[#1A2B4A]">
                  {tr('brandName')}
                </h2>
                <p className="text-xs text-[#1A2B4A]/65">
                  {tr('brandTagline')}
                </p>
              </div>

              {errorBanner && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-2">
                  <span>{errorBanner}</span>
                  <button onClick={clearErrorBanner} className="underline shrink-0">
                    {tr('close')}
                  </button>
                </div>
              )}

              <button
                onClick={() => void handleSignIn()}
                disabled={submitting}
                className="w-full h-11 px-5 rounded-lg bg-[#FF7A00] hover:bg-[#e56e00] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <span>{submitting ? tr('signingIn') : tr('signInWithGoogle')}</span>
                <ArrowRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
              </button>

              <p className="text-xs text-[#1A2B4A]/55 leading-relaxed">
                {lang === 'en'
                  ? 'Authenticated sessions automatically synchronize with role-based permissions in the Core IAM registry.'
                  : 'تتم مزامنة الجلسات تلقائياً مع مصفوفة الصلاحيات في سجل الهوية والصلاحيات الأساسي.'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
