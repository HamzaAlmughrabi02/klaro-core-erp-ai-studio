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
    <div className="min-h-screen bg-night text-white flex flex-col relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -end-40 w-[560px] h-[560px] rounded-full bg-brand/30 blur-[120px]"
      />
      <header className="h-[72px] px-6 sm:px-10 flex items-center justify-between gap-8 relative">
        <KlaroLogo size={32} wordmark={tr('brandName')} tone="dark" />
        <button
          onClick={toggleLang}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl border border-night-line bg-night-2 hover:bg-night-3 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Globe className="w-4 h-4 text-brand-glow" />
          <span>{lang === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <p className="klaro-chip self-start !bg-white/10 !text-brand-glow">{tr('brandTagline')}</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white text-balance leading-[1.1]">
              {tr('loginTitle')}
            </h1>
            <p className="text-base text-night-text leading-relaxed max-w-xl">
              {tr('loginSubtitle')}
            </p>

            <ul className="pt-2 space-y-3">
              {['loginFeature1', 'loginFeature2', 'loginFeature3'].map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm text-night-text">
                  <CheckCircle2 className="w-5 h-5 text-brand-glow shrink-0" />
                  <span>{tr(key as Parameters<typeof tr>[0])}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <div className="w-full p-8 rounded-[28px] bg-surface text-ink space-y-6 shadow-[var(--shadow-hero)]">
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold text-ink">{tr('brandName')}</h2>
                <p className="text-sm text-muted">{tr('brandTagline')}</p>
              </div>

              {errorBanner && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 border border-danger/30 text-sm text-red-800 flex items-center justify-between gap-2"
                >
                  <span>{errorBanner}</span>
                  <button onClick={clearErrorBanner} className="underline shrink-0">
                    {tr('close')}
                  </button>
                </div>
              )}

              <button
                onClick={() => void handleSignIn()}
                disabled={submitting}
                className="klaro-btn-primary w-full h-12 px-5 disabled:opacity-60 text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>{submitting ? tr('signingIn') : tr('signInWithGoogle')}</span>
                <ArrowRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
              </button>

              <p className="text-xs text-muted leading-relaxed">
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
