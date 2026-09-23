import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  MapPin, 
  Search, 
  HelpCircle, 
  ShieldCheck, 
  Cpu, 
  UserCheck, 
  FileText, 
  ArrowRight,
  CheckCircle2,
  Sliders,
  Globe2,
  Key,
  Layers,
  Layout,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ChevronDown,
  Quote,
  Flame
} from 'lucide-react';
import { 
  generateSeoAeoGeoArticle, 
  generateSeoAeoGeoLandingPage,
  testGeminiApiKey,
  GeneratedBlogPostResult, 
  GeneratedLandingPageResult,
  BlogGeneratorParams,
  LandingPageGeneratorParams,
  buildProductSourceFacts,
  validateGeneratedBlogResult
} from '../utils/seoAeoGeoBlogGenerator';
import { permanentProductsData } from '../data/permanentProductsData';

interface SeoAeoGeoBlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyArticle?: (result: GeneratedBlogPostResult) => void;
  onApplyLandingPage?: (result: GeneratedLandingPageResult) => void;
  showToast: (msg: string) => void;
  initialMode?: 'blog' | 'landing';
}

const POPULAR_BLOG_TOPICS = [
  { label: "Šubare od jagnjećeg krzna", topic: "Prava srpska šubara od prirodnog jagnjećeg krzna", kw: "srpska šubara pešter" },
  { label: "Jelek sa zlatovezom", topic: "Srpski narodni jelek sa zlatovezom i srmom", kw: "narodni jelek zlatovez" },
  { label: "Kožni opanci sa kljunom", topic: "Tradicionalni opanci od goveđe kože sa kljunom", kw: "kožni opanci sa kljunom" },
  { label: "Pirotski ćilim i simboli", topic: "Tajna pirotskog ćilima dva lica i drevni zaštitni simboli", kw: "pirotski ćilim dva lica" },
];

const POPULAR_LANDING_TOPICS = [
  { 
    label: "🧦 Vunene čarape Zlatibor", 
    topic: "Ručno Pletene Vunene Čarape sa Zlatibora i Homolja", 
    kw: "vunene carape rucni rad", 
    cat: "carape" as const,
    aud: "general" as const
  },
  { 
    label: "👞 Opanci za folklor", 
    topic: "Tradicionalni Kožni Opanci sa Kljunom za Folklor i Svečanosti", 
    kw: "opanci za folklor srbija", 
    cat: "nosnje" as const,
    aud: "folklore" as const
  },
  { 
    label: "🎁 Slavski etno pokloni", 
    topic: "Najlepši Slavski i Svadbeni Pokloni od Prirodnih Materijala", 
    kw: "slavski pokloni rucni rad", 
    cat: "pokloni" as const,
    aud: "slava_gifts" as const
  },
  { 
    label: "🦺 Narodni jelek sa zlatovezom", 
    topic: "Autentični Srpski Jelek sa Zlatovezom i Gajtanima po Meri", 
    kw: "srpski jelek zlatovez", 
    cat: "nosnje" as const,
    aud: "diaspora" as const
  },
  { 
    label: "👑 Pešterske šubare", 
    topic: "Homoljske i Pešterske Šubare od 100% Prirodnog Krzna", 
    kw: "prava srpska subara krzno", 
    cat: "subare" as const,
    aud: "general" as const
  }
];

export const SeoAeoGeoBlogModal: React.FC<SeoAeoGeoBlogModalProps> = ({
  isOpen,
  onClose,
  onApplyArticle,
  onApplyLandingPage,
  showToast,
  initialMode = 'blog'
}) => {
  // Mode: 'blog' | 'landing'
  const [activeMode, setActiveMode] = useState<'blog' | 'landing'>(initialMode);

  // Sync mode with initialMode prop when opened
  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // General Inputs
  const [topic, setTopic] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const selectedProduct = permanentProductsData.find(p => p.id === selectedProductId);
  const [writingStyle, setWritingStyle] = useState<'artisan' | 'premium' | 'editorial' | 'informational' | 'educational' | 'storytelling' | 'sales' | 'traditional'>('artisan');
  const [wordCount, setWordCount] = useState<300 | 500 | 750 | 1000 | 1500 | 2000 | 2500 | 3000 | 3500 | 4000>(1000);
  const [seoEnabled, setSeoEnabled] = useState(true);
  const [aeoEnabled, setAeoEnabled] = useState(true);
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [geoRegion, setGeoRegion] = useState<'all' | 'homolje' | 'zlatibor' | 'pirot' | 'pester' | 'sumadija'>('all');

  // Blog-specific
  const [tone, setTone] = useState<'artisan' | 'history' | 'buyers_guide' | 'heritage_diaspora'>('artisan');

  // Landing-specific
  const [targetAudience, setTargetAudience] = useState<'general' | 'folklore' | 'diaspora' | 'slava_gifts' | 'collectors'>('general');
  const [productCategory, setProductCategory] = useState<'subare' | 'nosnje' | 'carape' | 'pokloni' | 'torbice' | 'nakit' | 'kosulje' | 'dom-pokloni'>('nosnje');

  // Gemini API Key & Model Settings
  const [useGemini, setUseGemini] = useState(() => {
    const saved = localStorage.getItem('koreni_gemini_api_key');
    return !!(saved && saved.trim().length > 10);
  });
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('koreni_gemini_api_key') || '');
  const [geminiModel, setGeminiModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro'>(() => {
    return (localStorage.getItem('koreni_gemini_model') as any) || 'gemini-2.5-flash';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Results & Loading
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlogResult, setGeneratedBlogResult] = useState<GeneratedBlogPostResult | null>(null);
  const [generatedLandingResult, setGeneratedLandingResult] = useState<GeneratedLandingPageResult | null>(null);
  const [blogValidation, setBlogValidation] = useState<ReturnType<typeof validateGeneratedBlogResult> | null>(null);

  if (!isOpen) return null;

  const handleSaveApiKey = (val: string) => {
    setGeminiApiKey(val);
    localStorage.setItem('koreni_gemini_api_key', val.trim());
    setKeyTestStatus(null);
  };

  const handleSaveModel = (model: 'gemini-2.5-flash' | 'gemini-2.5-pro') => {
    setGeminiModel(model);
    localStorage.setItem('koreni_gemini_model', model);
    setKeyTestStatus(null);
  };

  const handleTestKey = async () => {
    if (!geminiApiKey.trim()) {
      showToast("Unesite API ključ pre testiranja.");
      return;
    }
    setIsTestingKey(true);
    setKeyTestStatus(null);
    try {
      const res = await testGeminiApiKey(geminiApiKey.trim(), geminiModel);
      setKeyTestStatus(res);
      if (res.success) {
        showToast("✅ Gemini API ključ je uspešno verifikovan!");
      } else {
        showToast("❌ Verifikacija ključa nije uspela.");
      }
    } catch (err: any) {
      setKeyTestStatus({ success: false, message: err.message || 'Mrežna greška' });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      showToast("Molimo unesite temu ili izaberite neku od preporučenih.");
      return;
    }

    setIsGenerating(true);
    if (activeMode === 'blog') {
      setGeneratedBlogResult(null);
      setBlogValidation(null);
      try {
        const params: BlogGeneratorParams = {
          topic: topic.trim(),
          keyword: keyword.trim() || undefined,
          tone,
          writingStyle,
          wordCount,
          seoEnabled,
          aeoEnabled,
          geoEnabled,
          geoRegion,
          geminiApiKey: useGemini ? geminiApiKey.trim() : undefined,
          geminiModel,
          productId: selectedProduct?.id,
          sourceFacts: selectedProduct ? buildProductSourceFacts(selectedProduct) : undefined,
          forbidUnverifiedClaims: true
        };
        const res = await generateSeoAeoGeoArticle(params);
        setGeneratedBlogResult(res);
        const validation = validateGeneratedBlogResult(res, {
          keyword: params.keyword,
          wordCount: params.wordCount,
          seoEnabled: params.seoEnabled,
          aeoEnabled: params.aeoEnabled,
          geoEnabled: params.geoEnabled,
          sourceFacts: params.sourceFacts,
          forbidUnverifiedClaims: true
        });
        setBlogValidation(validation);
        showToast(
          validation.ok
            ? `✨ Super Cool tekst je generisan i prošao validaciju: ${validation.score}/100 — SR+EN, People-first, SEO/AEO/GEO.`
            : `⚠️ Tekst je generisan, ali validacija traži doradu: ${validation.score}/100. Pregledajte rezultat pre uvoza.`
        );
      } catch (err: any) {
        console.error("Greška pri generisanju:", err);
        showToast("Došlo je do greške pri generisanju bloga.");
      } finally {
        setIsGenerating(false);
      }
    } else {
      setGeneratedLandingResult(null);
      try {
        const params: LandingPageGeneratorParams = {
          topic: topic.trim(),
          keyword: keyword.trim() || undefined,
          targetAudience,
          writingStyle,
          wordCount,
          seoEnabled,
          aeoEnabled,
          geoEnabled,
          geoRegion,
          productCategory,
          geminiApiKey: useGemini ? geminiApiKey.trim() : undefined,
          geminiModel
        };
        const res = await generateSeoAeoGeoLandingPage(params);
        setGeneratedLandingResult(res);
        showToast("✨ Ciljana Landing Stranica je uspešno kreirana sa SEO/AEO/GEO parametrima!");
      } catch (err: any) {
        console.error("Greška pri generisanju landing stranice:", err);
        showToast("Došlo je do greške pri generisanju landing stranice.");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleApplyBlog = () => {
    if (!generatedBlogResult || !onApplyArticle) return;
    if (blogValidation && !blogValidation.ok) {
      showToast('⚠️ Uvoz je blokiran: Content Quality Check nije prošao. Doradite tekst pa pokušajte ponovo.');
      return;
    }
    onApplyArticle(generatedBlogResult);
    onClose();
  };

  const handleApplyLanding = () => {
    if (!generatedLandingResult) return;
    if (onApplyLandingPage) {
      onApplyLandingPage(generatedLandingResult);
    } else {
      showToast("Landing stranica je generisana.");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#1C1613] border border-[#C2872A]/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C2872A]/20 bg-[#241D19]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C2872A] to-[#9E3E26] flex items-center justify-center text-stone-950 font-bold shadow-md">
              <Sparkles className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-serif text-[#E8D0A9]">
                  SUPER COOL TEXT GENERATOR
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 font-medium">
                  <UserCheck className="w-3 h-3" />
                  People-first / editorial
                </span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 font-mono">
                  {geminiModel}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Prirodan, koristan i originalan sadržaj do 4.000 reči — SR + EN, uz SEO, AEO i Generative Engine Optimization kontrole.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Blog vs Landing) */}
        <div className="flex items-center border-b border-white/10 bg-[#15100D] px-6">
          <button
            type="button"
            onClick={() => {
              setActiveMode('blog');
              setGeneratedBlogResult(null);
              setGeneratedLandingResult(null);
            }}
            className={`py-3 px-4 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeMode === 'blog'
                ? 'border-[#C2872A] text-[#E8D0A9] bg-[#C2872A]/10 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileText className="w-4 h-4 text-[#C2872A]" />
            <span>📝 Super Cool tekst generator</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('landing');
              setGeneratedBlogResult(null);
              setGeneratedLandingResult(null);
            }}
            className={`py-3 px-4 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeMode === 'landing'
                ? 'border-[#C2872A] text-[#E8D0A9] bg-[#C2872A]/10 font-bold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layout className="w-4 h-4 text-[#C2872A]" />
            <span>🎯 Ciljana Landing Stranica (SEO + GEO + AEO)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-stone-300">

          {/* CONTENT OPTIMIZATION CONTROLS */}
          <div className="p-4 bg-[#15100D] border border-[#C2872A]/30 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C2872A]" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#E8D0A9]">Kontrole sadržaja</div>
                <div className="text-[10px] text-stone-500">Ove vrednosti se stvarno prosleđuju generatoru.</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1">Stil pisanja</label>
                <select value={writingStyle} onChange={e => setWritingStyle(e.target.value as typeof writingStyle)} className="w-full bg-[#120E0C] border border-stone-700 rounded-xl px-3 py-2 text-xs text-white">
                  <option value="artisan">Zanatski / prirodan</option><option value="premium">Premium</option><option value="editorial">Editorial</option><option value="informational">Informativni</option><option value="educational">Edukativni</option><option value="storytelling">Storytelling</option><option value="sales">Prodajni</option><option value="traditional">Tradicionalni / etno</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1">Ciljna dužina</label>
                <select value={wordCount} onChange={e => setWordCount(Number(e.target.value) as typeof wordCount)} className="w-full bg-[#120E0C] border border-stone-700 rounded-xl px-3 py-2 text-xs text-white">
                  {[300,500,750,1000,1500,2000,2500,3000,3500,4000].map(n => <option key={n} value={n}>{n} reči (±10%)</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer"><div className="flex justify-between items-center"><span className="font-bold text-xs">SEO</span><input type="checkbox" checked={seoEnabled} onChange={e => setSeoEnabled(e.target.checked)} /></div><div className="text-[10px] text-stone-500 mt-1">Klasična pretraga</div></label>
              <label className="p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer"><div className="flex justify-between items-center"><span className="font-bold text-xs">AEO</span><input type="checkbox" checked={aeoEnabled} onChange={e => setAeoEnabled(e.target.checked)} /></div><div className="text-[10px] text-stone-500 mt-1">Direktni odgovori i FAQ</div></label>
              <label className="p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer"><div className="flex justify-between items-center"><span className="font-bold text-xs">GEO</span><input type="checkbox" checked={geoEnabled} onChange={e => setGeoEnabled(e.target.checked)} /></div><div className="text-[10px] text-stone-500 mt-1">Generative Engine Optimization</div></label>
            </div>
          </div>

          {/* GEMINI API KEY & MODEL SETTINGS (Za kompleksnije zadatke) */}
          <div className="p-4 bg-gradient-to-r from-[#241D19] to-[#1a1411] border border-[#C2872A]/30 rounded-2xl space-y-3 shadow-inner">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#C2872A]/20 rounded-xl border border-[#C2872A]/40 text-[#C2872A]">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#E8D0A9]">
                      Google Gemini AI Podešavanja
                    </span>
                    <span className="text-[10px] text-stone-400">
                      (Za kompleksne zadatke, duboke eseje i ciljane stranice)
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    {useGemini ? 'Aktiviran je Google Gemini režim uz people-first pravila.' : 'Koristi se ugrađeni klijentski zanatski rečnik.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs text-stone-300 font-medium">Uključi Gemini:</span>
                  <input
                    type="checkbox"
                    checked={useGemini}
                    onChange={(e) => setUseGemini(e.target.checked)}
                    className="w-4 h-4 accent-[#C2872A] rounded cursor-pointer"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-stone-300 text-xs rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-[#C2872A]" />
                  <span>{showKeyInput ? 'Sakrij Podešavanja' : 'Podesi Ključ & Model'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showKeyInput ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Expander za Gemini ključ i model */}
            {showKeyInput && (
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* API Key Input */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1 font-medium">
                      Gemini API Ključ (Čuva se bezbedno samo u vašem browseru)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showKeySecret ? 'text' : 'password'}
                        value={geminiApiKey}
                        onChange={(e) => handleSaveApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-[#120E0C] border border-stone-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none font-mono pr-20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeySecret(!showKeySecret)}
                        className="absolute right-10 text-stone-400 hover:text-white p-1"
                        title={showKeySecret ? 'Sakrij' : 'Prikaži'}
                      >
                        {showKeySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleTestKey}
                        disabled={isTestingKey}
                        className="absolute right-1.5 px-2 py-1 bg-[#C2872A]/20 hover:bg-[#C2872A]/30 text-[#C2872A] text-[10px] font-bold rounded-lg border border-[#C2872A]/40 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isTestingKey ? 'Test...' : 'Test'}
                      </button>
                    </div>
                  </div>

                  {/* Model Selector */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1 font-medium">
                      Izbor Modela
                    </label>
                    <select
                      value={geminiModel}
                      onChange={(e) => handleSaveModel(e.target.value as any)}
                      className="w-full bg-[#120E0C] border border-stone-700 rounded-xl px-3 py-2 text-xs text-[#E8D0A9] focus:border-[#C2872A] focus:outline-none"
                    >
                      <option value="gemini-2.5-flash">⚡ gemini-2.5-flash (Brz i efikasan)</option>
                      <option value="gemini-2.5-pro">🧠 gemini-2.5-pro (Kompleksniji zadaci)</option>
                    </select>
                  </div>
                </div>

                {/* Status poruka za test ključa */}
                {keyTestStatus && (
                  <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    keyTestStatus.success 
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    {keyTestStatus.success ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                    <span>{keyTestStatus.message}</span>
                  </div>
                )}

                <p className="text-[10px] text-stone-500 italic">
                  * Savet: Za uobičajene blog članke <b>gemini-2.5-flash</b> je izuzetno brz i precizan. Za detaljne, duže ciljane Landing Stranice sa složenim AEO/GEO FAQ odgovorima izaberite <b>gemini-2.5-pro</b>.
                </p>
              </div>
            )}
          </div>

          {/* GENERATOR INPUT FORMS (Ako nema rezultata ili hoćemo ponovo) */}
          {(!generatedBlogResult && !generatedLandingResult) && (
            <div className="space-y-5">
              
              {/* Brzi izbor tema (Zavisno od taba) */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#C2872A] mb-2 font-medium">
                  {activeMode === 'blog' ? 'Preporučene Blog Teme (1-Klik):' : 'Preporučene Landing Teme (1-Klik):'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {activeMode === 'blog' ? (
                    POPULAR_BLOG_TOPICS.map((pt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTopic(pt.topic);
                          setKeyword(pt.kw);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          topic === pt.topic
                            ? 'bg-[#C2872A] text-stone-950 border-[#C2872A] font-bold shadow-md'
                            : 'bg-[#15100D] text-stone-300 border-white/10 hover:border-[#C2872A]/50'
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))
                  ) : (
                    POPULAR_LANDING_TOPICS.map((pt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTopic(pt.topic);
                          setKeyword(pt.kw);
                          setProductCategory(pt.cat);
                          setTargetAudience(pt.aud);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          topic === pt.topic
                            ? 'bg-[#C2872A] text-stone-950 border-[#C2872A] font-bold shadow-md'
                            : 'bg-[#15100D] text-stone-300 border-white/10 hover:border-[#C2872A]/50'
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Tema i ključna reč */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                    {activeMode === 'blog' ? 'Tema Članka / Problem Kupca *' : 'Glavni Naziv i Cilj Landing Stranice *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={activeMode === 'blog' ? 'npr. Kako odabrati pravu srpsku šubaru' : 'npr. Ručno Pletene Vunene Čarape sa Zlatibora'}
                    className="w-full bg-[#120E0C] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                    Fokusna Ključna Reč (SEO)
                  </label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="npr. vunene čarape ručni rad"
                    className="w-full bg-[#120E0C] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Parametri optimizacije */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-[#15100D] rounded-2xl border border-white/5">
                
                {activeMode === 'blog' ? (
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#C2872A] mb-1 font-medium">
                      Ton Pisanja (Ljudski Zanatski)
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value as any)}
                      className="w-full bg-[#1C1613] border border-stone-700 rounded-xl p-2 text-xs text-white focus:border-[#C2872A] focus:outline-none"
                    >
                      <option value="artisan">Iskusni Stari Majstor (Topao, opipljiv)</option>
                      <option value="history">Etnolog & Čuvar Baštine (Istorijski)</option>
                      <option value="buyers_guide">Vodič za Kupca (Saveti i nega)</option>
                      <option value="heritage_diaspora">Za Dijasporu (Čežnja za zavičajem)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#C2872A] mb-1 font-medium">
                      Ciljana Publika (Landing Stranica)
                    </label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value as any)}
                      className="w-full bg-[#1C1613] border border-stone-700 rounded-xl p-2 text-xs text-white focus:border-[#C2872A] focus:outline-none"
                    >
                      <option value="general">Opšti Kupci & Domaćinstva</option>
                      <option value="folklore">Folklorna Društva (KUD-ovi)</option>
                      <option value="diaspora">Srpska Dijaspora (Evropa, SAD, Kanada)</option>
                      <option value="slava_gifts">Krsne Slave & Svadbeni Darovi</option>
                      <option value="collectors">Kolekcionari & Ljubitelji Etno Umetnosti</option>
                    </select>
                  </div>
                )}

                {/* Geografska Regija */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#C2872A] mb-1 font-medium">
                    Geografski Region (GEO Toponimi)
                  </label>
                  <select
                    value={geoRegion}
                    onChange={(e) => setGeoRegion(e.target.value as any)}
                    className="w-full bg-[#1C1613] border border-stone-700 rounded-xl p-2 text-xs text-white focus:border-[#C2872A] focus:outline-none"
                  >
                    <option value="all">Srbija + Dijaspora (Svi regioni)</option>
                    <option value="homolje">Homoljske planine & Istočna Srbija</option>
                    <option value="zlatibor">Zlatibor & Zapadna Srbija</option>
                    <option value="pirot">Pirot & Stara planina</option>
                    <option value="pester">Pešterska visoravan (Vuna i krzno)</option>
                    <option value="sumadija">Šumadija & Centralna Srbija</option>
                  </select>
                </div>

                {/* Kategorija proizvoda za Landing Stranicu */}
                {activeMode === 'landing' ? (
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#C2872A] mb-1 font-medium">
                      Povezana Kategorija Proizvoda
                    </label>
                    <select
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value as any)}
                      className="w-full bg-[#1C1613] border border-stone-700 rounded-xl p-2 text-xs text-white focus:border-[#C2872A] focus:outline-none"
                    >
                      <option value="nosnje">Nošnje & Opanci</option>
                      <option value="carape">Vunene Čarape</option>
                      <option value="subare">Šubare & Kape</option>
                      <option value="pokloni">Slavski & Etno Pokloni</option>
                      <option value="torbice">Torbice & Aksesoari</option>
                      <option value="nakit">Tradicionalni Nakit</option>
                      <option value="kosulje">Košulje & Platna</option>
                      <option value="dom-pokloni">Dom & Dekor</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center">
                    <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Zaštita od AI Detektora
                    </span>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Nema generičkih uvodnih klišea. Prirodan burstiness i leksika srpskog zanata.
                    </p>
                  </div>
                )}
              </div>

              {/* Generiši Dugme */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#C2872A] to-[#9E3E26] hover:opacity-95 text-stone-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>
                    {isGenerating 
                      ? (activeMode === 'blog' ? 'Majstorsko Pisanje Članka...' : 'Gradnja Ciljane Landing Stranice...') 
                      : (activeMode === 'blog' ? '⚡ Generiši Ljudski Blog Članak' : '⚡ Generiši Kompletnu Landing Stranicu')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW: GENERISAN BLOG ČLANAK */}
          {generatedBlogResult && (
            <div className="space-y-6">
              
              {/* Status bar */}
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Članak je uspešno generisan sa kompletnim SEO, AEO i GEO parametrima!</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGeneratedBlogResult(null)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-stone-300 text-xs rounded-lg border border-white/10 transition-colors cursor-pointer"
                  >
                    Ponovo generiši
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBlog}
                    className="px-4 py-1.5 bg-[#C2872A] hover:bg-[#a37021] text-stone-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Uvezi u Formu za Članak</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* CONTENT QUALITY CHECK */}
              {blogValidation && (
                <div className={`p-4 rounded-2xl border ${blogValidation.ok ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-red-950/20 border-red-500/40'}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {blogValidation.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
                      <span className="text-sm font-bold text-stone-100">CONTENT QUALITY CHECK</span>
                    </div>
                    <span className={`text-lg font-bold ${blogValidation.ok ? 'text-emerald-300' : 'text-red-300'}`}>{blogValidation.score}/100</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {blogValidation.items.map(item => (
                      <div key={item.key} className="flex items-start gap-2 p-2.5 bg-black/25 rounded-lg border border-white/5">
                        {item.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                        <div className="min-w-0"><div className="text-xs font-semibold text-stone-200">{item.label}</div><div className="text-[11px] text-stone-400 break-words">{item.detail}</div></div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-stone-400">Uvoz u formu je dozvoljen samo kada sve obavezne kontrole prođu.</p>
                </div>
              )}

              {/* Meta & Slug kartica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#15100D] border border-white/10 rounded-xl space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-[#C2872A] font-bold">🇷🇸 Naslov & Slug</span>
                  <h3 className="text-base font-serif text-[#E8D0A9] font-bold">{generatedBlogResult.titleSr}</h3>
                  <div className="flex items-center gap-1 font-mono text-xs text-stone-400">
                    <span className="text-[#C2872A]">/blog/</span>
                    <span className="text-white">{generatedBlogResult.slug}</span>
                  </div>
                  <p className="text-xs text-stone-300 italic pt-1">{generatedBlogResult.excerptSr}</p>
                </div>

                <div className="p-4 bg-[#15100D] border border-white/10 rounded-xl space-y-2">
                  <span className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">🇬🇧 English Translation</span>
                  <h3 className="text-base font-serif text-stone-200">{generatedBlogResult.titleEn}</h3>
                  <p className="text-xs text-stone-400 italic pt-1">{generatedBlogResult.excerptEn}</p>
                </div>
              </div>

              {/* AEO Direct Answer Box */}
              {generatedBlogResult.aeoDirectAnswer && (
                <div className="p-4 bg-gradient-to-br from-[#241D19] to-[#1a1411] border border-[#C2872A]/40 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-[#C2872A] font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>AEO Direct Answer (Za Google AI Overviews & Perplexity)</span>
                  </div>
                  <p className="text-xs text-stone-200 leading-relaxed font-sans bg-black/30 p-3 rounded-lg border border-white/5">
                    {generatedBlogResult.aeoDirectAnswer}
                  </p>
                </div>
              )}

              {/* FAQ Lista */}
              {generatedBlogResult.faqList && generatedBlogResult.faqList.length > 0 && (
                <div className="p-4 bg-[#15100D] border border-white/10 rounded-xl space-y-3">
                  <span className="text-[11px] uppercase tracking-wider text-[#C2872A] font-bold flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" />
                    Strukturirana Pitanja i Odgovori (AEO FAQ Schema)
                  </span>
                  <div className="space-y-2">
                    {generatedBlogResult.faqList.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-1">
                        <div className="font-semibold text-xs text-stone-200">❓ {item.question}</div>
                        <div className="text-xs text-stone-400 pl-4">{item.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Donje dugme za uvoz */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleApplyBlog}
                  className="px-6 py-3 bg-[#C2872A] hover:bg-[#a37021] text-stone-950 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Uvezi u Formu za Članak & Pregledaj</span>
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW: GENERISANA CILJANA LANDING STRANICA */}
          {generatedLandingResult && (
            <div className="space-y-6">
              
              {/* Status bar */}
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Ciljana Landing Stranica je uspešno kreirana sa H1, prednostima, sekcijama i FAQ!</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGeneratedLandingResult(null)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-stone-300 text-xs rounded-lg border border-white/10 transition-colors cursor-pointer"
                  >
                    Ponovo generiši
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyLanding}
                    className="px-4 py-1.5 bg-[#C2872A] hover:bg-[#a37021] text-stone-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Uvezi i Sačuvaj Stranicu</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* URL & H1 Hero kartica */}
              <div className="p-5 bg-[#15100D] border border-[#C2872A]/40 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono text-xs text-stone-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                    <Globe2 className="w-4 h-4 text-[#C2872A]" />
                    <span>URL Slug:</span>
                    <span className="text-[#E8D0A9] font-bold">https://savremenikoreni.com/{generatedLandingResult.slug}</span>
                  </div>
                  <span className="bg-[#C2872A]/20 text-[#C2872A] text-[11px] px-2.5 py-0.5 rounded-full border border-[#C2872A]/30">
                    {generatedLandingResult.badgeSr}
                  </span>
                </div>

                <div>
                  <h2 className="text-lg sm:text-xl font-serif text-[#E8D0A9] font-bold">{generatedLandingResult.titleSr}</h2>
                  <h3 className="text-xs text-stone-400 font-serif italic mt-0.5">{generatedLandingResult.titleEn}</h3>
                </div>

                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5">
                  {generatedLandingResult.subtitleSr}
                </p>
              </div>

              {/* Key Highlights (Prednosti za kupce) */}
              {generatedLandingResult.keyHighlights && generatedLandingResult.keyHighlights.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-wider text-[#C2872A] font-bold flex items-center gap-1.5">
                    <Flame className="w-4 h-4" />
                    Ključne Prednosti za Kupce (Key Highlights)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {generatedLandingResult.keyHighlights.map((hl, idx) => (
                      <div key={idx} className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-1">
                        <div className="text-xs font-bold text-[#E8D0A9]">{hl.titleSr}</div>
                        <div className="text-[11px] text-stone-400 leading-relaxed">{hl.descSr}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Sections sa citatom majstora */}
              {generatedLandingResult.contentSections && generatedLandingResult.contentSections.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs uppercase tracking-wider text-[#C2872A] font-bold flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Zanatske Sekcije Sadržaja & Citati Majstora
                  </span>
                  {generatedLandingResult.contentSections.map((sec, idx) => (
                    <div key={idx} className="p-4 bg-[#15100D] border border-white/10 rounded-xl space-y-2">
                      <h4 className="text-sm font-bold text-[#E8D0A9]">{sec.headingSr}</h4>
                      {sec.paragraphsSr.map((p, pIdx) => (
                        <p key={pIdx} className="text-xs text-stone-300 leading-relaxed">{p}</p>
                      ))}
                      {sec.quoteSr && (
                        <div className="mt-2 p-3 bg-gradient-to-r from-[#C2872A]/10 to-transparent border-l-2 border-[#C2872A] text-xs text-amber-200/90 italic flex items-start gap-2">
                          <Quote className="w-4 h-4 shrink-0 text-[#C2872A]" />
                          <span>„{sec.quoteSr}“</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* AEO FAQs za Landing Stranicu */}
              {generatedLandingResult.faqs && generatedLandingResult.faqs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-wider text-[#C2872A] font-bold flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" />
                    AEO Često Postavljana Pitanja (Schema.org FAQPage)
                  </span>
                  <div className="space-y-2">
                    {generatedLandingResult.faqs.map((f, idx) => (
                      <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1">
                        <div className="font-semibold text-xs text-stone-200">❓ {f.questionSr}</div>
                        <div className="text-xs text-stone-400 pl-4">{f.answerSr}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Donje dugme za uvoz Landing Stranice */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleApplyLanding}
                  className="px-6 py-3 bg-[#C2872A] hover:bg-[#a37021] text-stone-950 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Uvezi i Aktiviraj Ciljanu Landing Stranicu</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
