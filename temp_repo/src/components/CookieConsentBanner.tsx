import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, X, Check, Settings, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const COOKIE_CONSENT_KEY = 'savremeni_koreni_cookie_consent';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

interface CookieConsentBannerProps {
  onOpenCookiePolicy?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenCookiePolicy }) => {
  const { isEn } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    marketing: true,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) {
        // Show banner after a slight 1s delay for smooth page entrance
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
      } else {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      }
    } catch (e) {
      setIsVisible(true);
    }
  }, []);

  // Listen for custom event to re-open settings from footer link
  useEffect(() => {
    const handleReopen = () => {
      setShowSettingsModal(true);
      setIsVisible(true);
    };
    window.addEventListener('openCookieSettings', handleReopen);
    return () => window.removeEventListener('openCookieSettings', handleReopen);
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    try {
      const updated = { ...prefs, timestamp: new Date().toISOString() };
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(updated));
      setPreferences(updated);
    } catch (e) {
      console.error('Error saving cookie consent:', e);
    }
    setIsVisible(false);
    setShowSettingsModal(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    });
  };

  const handleAcceptEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!isVisible && !showSettingsModal) return null;

  return (
    <>
      {/* Floating Bottom Cookie Banner */}
      {isVisible && !showSettingsModal && (
        <div className="fixed bottom-0 inset-x-0 z-[80] p-3 sm:p-4 md:p-6 bg-[#1A1512]/95 backdrop-blur-md border-t border-[#C2872A]/40 text-[#FAF7F2] shadow-2xl transition-all duration-300 animate-fade-in">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Left Column: Icon & Text */}
            <div className="flex items-start gap-3 sm:gap-4 text-left w-full lg:w-auto">
              <div className="p-2.5 rounded-xl bg-[#C2872A]/20 border border-[#C2872A]/50 text-[#E8D0A9] shrink-0 mt-0.5">
                <Cookie className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold font-serif text-[#E8D0A9] flex items-center gap-2">
                  <span>{isEn ? 'Cookie Consent & Privacy Preferences' : 'Kolačići i Privatnost na Sajtu'}</span>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#C2872A]/30 text-[#E8D0A9] font-sans font-semibold border border-[#C2872A]/40">
                    GDPR / EU
                  </span>
                </h4>
                <p className="text-xs text-[#FAF7F2]/80 leading-relaxed max-w-3xl">
                  {isEn
                    ? 'Savremeni Koreni uses cookies and local storage to keep your shopping bag intact, remember language/currency preferences, and analyze site performance. We respect your privacy.'
                    : 'Sajt Savremeni Koreni koristi kolačiće i lokalnu memoriju radi pamćenja Vaše korpe, izabranog jezika/valute i analize posećenosti. Poštujemo Vašu privatnost u potpunosti.'}
                  {' '}
                  <button
                    type="button"
                    onClick={onOpenCookiePolicy}
                    className="text-[#E8D0A9] font-semibold underline hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Info className="w-3 h-3" />
                    <span>{isEn ? 'Read Cookie Policy' : 'Pročitajte Politiku kolačića'}</span>
                  </button>
                </p>
              </div>
            </div>

            {/* Right Column: Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-[#FAF7F2] border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-[#E8D0A9]" />
                <span>{isEn ? 'Settings' : 'Podesi kolačiće'}</span>
              </button>

              <button
                type="button"
                onClick={handleAcceptEssential}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-[#FAF7F2] border border-white/20 transition-all cursor-pointer"
              >
                {isEn ? 'Essential Only' : 'Samo Neophodni'}
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-[#C2872A] to-[#8C5E1A] hover:from-[#d19435] hover:to-[#a06d20] text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isEn ? 'Accept All Cookies' : 'Prihvati Sve Kolačiće'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#1A1512] border border-[#C2872A]/50 rounded-2xl max-w-lg w-full p-6 text-[#FAF7F2] shadow-2xl space-y-5 relative">
            
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2.5 rounded-xl bg-[#C2872A]/20 text-[#E8D0A9]">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#E8D0A9]">
                  {isEn ? 'Customize Cookie Preferences' : 'Podešavanje Kolačića'}
                </h3>
                <p className="text-xs text-[#FAF7F2]/70">
                  {isEn ? 'Choose which cookies you want to allow.' : 'Izaberite koje kategorije kolačića želite da omogućite.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              
              {/* Essential */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">
                      {isEn ? 'Essential Cookies' : 'Neophodni Kolačići'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      {isEn ? 'Always Active' : 'Uvek aktivni'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#FAF7F2]/70 leading-relaxed">
                    {isEn
                      ? 'Required for shopping cart, session security, and language selection.'
                      : 'Omogućavaju pamćenje korpe, bezbednost sesije i izabrani jezik.'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 w-4 h-4 accent-[#C2872A] opacity-70 cursor-not-allowed"
                />
              </div>

              {/* Analytics */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-semibold text-xs text-white block">
                    {isEn ? 'Analytical Cookies' : 'Analitički Kolačići'}
                  </span>
                  <p className="text-[11px] text-[#FAF7F2]/70 leading-relaxed">
                    {isEn
                      ? 'Help us understand site usage and improve loading performance.'
                      : 'Pomažu nam da razumemo posećenost i poboljšamo brzinu sajta.'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-[#C2872A] cursor-pointer"
                />
              </div>

              {/* Marketing */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-semibold text-xs text-white block">
                    {isEn ? 'Marketing & Notice Cookies' : 'Marketinški Kolačići'}
                  </span>
                  <p className="text-[11px] text-[#FAF7F2]/70 leading-relaxed">
                    {isEn
                      ? 'Used to share updates regarding heritage fairs and new collections.'
                      : 'Služe za obaveštenja o novim etno kolekcijama i sajmovima.'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-[#C2872A] cursor-pointer"
                />
              </div>

            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={onOpenCookiePolicy}
                className="text-xs text-[#E8D0A9] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{isEn ? 'Full Cookie Policy' : 'Puna Politika kolačića'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-3 py-1.5 text-xs text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  {isEn ? 'Enable All' : 'Omogući sve'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[#C2872A] hover:bg-[#d19435] text-white shadow-md transition-all cursor-pointer"
                >
                  {isEn ? 'Save Preferences' : 'Sačuvaj izbore'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
