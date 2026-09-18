import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Download, Upload, CheckCircle2, AlertCircle, 
  Copy, Check, RefreshCw, ExternalLink, ShieldCheck, HardDrive, KeyRound, Lock,
  GitBranch, GitCommit, Eye, EyeOff, Send
} from 'lucide-react';
import { isSupabaseConfigured, syncCustomProductsToSupabase, syncGalleryPhotosToSupabase } from '../lib/supabase';
import { downloadFullBackup, restoreFromBackupData } from '../utils/backupStorage';
import { getCustomProducts } from '../utils/customProductStorage';
import { loadPhotosFromStorage } from '../utils/photoStorage';
import { triggerPermanentProjectPersistence } from './AutoProjectPersister';
import { isUsingDefaultPin } from '../utils/adminAuth';

interface DatabaseAdminPanelProps {
  showToast: (msg: string) => void;
  onOpenChangePassword?: () => void;
}

const SUPABASE_SQL_SCRIPT = `-- Kreiranje tabela za Savremeni Koreni na Supabase
-- 1. Tabela za prilagođene proizvode
CREATE TABLE IF NOT EXISTS custom_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL,
  price_rsd NUMERIC,
  price_eur NUMERIC,
  description TEXT,
  description_en TEXT,
  image TEXT,
  in_stock BOOLEAN DEFAULT true,
  lead_time_days INTEGER DEFAULT 3,
  featured BOOLEAN DEFAULT false,
  badge TEXT,
  badge_en TEXT,
  craft_techniques JSONB DEFAULT '[]'::jsonb,
  craft_techniques_en JSONB DEFAULT '[]'::jsonb,
  materials JSONB DEFAULT '[]'::jsonb,
  materials_en JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela za fotografije radionice
CREATE TABLE IF NOT EXISTS gallery_photos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_en TEXT,
  category TEXT NOT NULL,
  category_en TEXT,
  image_url TEXT NOT NULL,
  caption TEXT,
  caption_en TEXT,
  is_custom_uploaded BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Sigurnosne politike (RLS - Dozvola javnog čitanja i unosa)
ALTER TABLE custom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Javno citanje custom_products" ON custom_products FOR SELECT USING (true);
CREATE POLICY "Javni unos custom_products" ON custom_products FOR ALL USING (true);

CREATE POLICY "Javno citanje gallery_photos" ON gallery_photos FOR SELECT USING (true);
CREATE POLICY "Javni unos gallery_photos" ON gallery_photos FOR ALL USING (true);
`;

export const DatabaseAdminPanel: React.FC<DatabaseAdminPanelProps> = ({ showToast, onOpenChangePassword }) => {
  const [productCount, setProductCount] = useState<number>(0);
  const [productImagesCount, setProductImagesCount] = useState<number>(0);
  const [photoCount, setPhotoCount] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isPersistingRepo, setIsPersistingRepo] = useState<boolean>(false);
  const [persistProgress, setPersistProgress] = useState<string>('');
  const [repoStatus, setRepoStatus] = useState<{
    productsCount: number;
    productImagesCount?: number;
    photosCount: number;
    totalSiteImagesCount?: number;
    physicalUploadsCount: number;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GitHub integration state
  const [githubToken, setGithubToken] = useState<string>(() => localStorage.getItem('koreni_github_pat') || '');
  const [githubRepo, setGithubRepo] = useState<string>(() => {
    const saved = localStorage.getItem('koreni_github_repo');
    if (!saved || saved === 'skoksap/SAVREMENI-KORENI-EXPORT') {
      localStorage.setItem('koreni_github_repo', 'sasapetric5/SAVREMENI-KORENI-EXPORT');
      return 'sasapetric5/SAVREMENI-KORENI-EXPORT';
    }
    return saved;
  });
  const [githubBranch, setGithubBranch] = useState<string>(() => localStorage.getItem('koreni_github_branch') || 'main');
  const [showPat, setShowPat] = useState<boolean>(false);
  const [isTestingGithub, setIsTestingGithub] = useState<boolean>(false);
  const [githubStatus, setGithubStatus] = useState<{
    success: boolean;
    message: string;
    fullRepo?: string;
    defaultBranch?: string;
  } | null>(null);
  const [isPushingGithub, setIsPushingGithub] = useState<boolean>(false);
  const [lastCommitUrl, setLastCommitUrl] = useState<string | null>(null);

  const handleSaveGithubConfig = (token: string, repo: string, branch: string) => {
    localStorage.setItem('koreni_github_pat', token);
    localStorage.setItem('koreni_github_repo', repo);
    localStorage.setItem('koreni_github_branch', branch);
  };

  const handleTestGithubConnection = async () => {
    if (!githubToken.trim()) {
      showToast('Unesite GitHub Personal Access Token (PAT)');
      return;
    }
    setIsTestingGithub(true);
    try {
      handleSaveGithubConfig(githubToken, githubRepo, githubBranch);
      const res = await fetch('/api/github/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken,
          repo: githubRepo
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGithubStatus({
          success: true,
          message: data.message,
          fullRepo: data.fullRepo,
          defaultBranch: data.defaultBranch
        });
        showToast(data.message);
      } else {
        setGithubStatus({
          success: false,
          message: data.error || 'Greška pri povezivanju sa GitHub-om'
        });
        showToast(data.error || 'Neuspešno testiranje GitHub konekcije.');
      }
    } catch (err: any) {
      showToast('Greška pri komunikaciji sa GitHub-om.');
    } finally {
      setIsTestingGithub(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!githubToken.trim()) {
      showToast('Molimo unesite GitHub Personal Access Token (PAT).');
      return;
    }
    setIsPushingGithub(true);
    try {
      handleSaveGithubConfig(githubToken, githubRepo, githubBranch);
      
      showToast('1/2 Upisujem lokalne fajlove u projekat...');
      await triggerPermanentProjectPersistence((progress) => {
        setPersistProgress(progress);
      });

      showToast('2/2 Šaljem sve promene direktno na GitHub repozitorijum...');
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken,
          repo: githubRepo,
          branch: githubBranch,
          commitMessage: `Automatska sinhronizacija iz Admin Panela (${new Date().toLocaleDateString('sr-RS')} ${new Date().toLocaleTimeString('sr-RS')})`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLastCommitUrl(data.commitUrl);
        setGithubStatus({
          success: true,
          message: data.message,
          fullRepo: data.targetRepo,
          defaultBranch: data.targetBranch
        });
        showToast(`✅ ${data.message}`);
        await loadStats();
      } else {
        const errorMsg = data.error || 'Greška pri slanju na GitHub repozitorijum.';
        setGithubStatus({
          success: false,
          message: errorMsg,
          fullRepo: githubRepo,
          defaultBranch: githubBranch
        });
        showToast(`❌ ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('GitHub push failed:', err);
      const errMsg = err?.message || 'Greška pri sinhronizaciji sa GitHub repozitorijumom.';
      setGithubStatus({
        success: false,
        message: errMsg,
        fullRepo: githubRepo,
        defaultBranch: githubBranch
      });
      showToast(`❌ ${errMsg}`);
    } finally {
      setIsPushingGithub(false);
      setPersistProgress('');
    }
  };

  const loadStats = async () => {
    try {
      const [products, photos] = await Promise.all([
        getCustomProducts(),
        loadPhotosFromStorage(),
      ]);
      
      let prodImages = 0;
      if (products && Array.isArray(products)) {
        products.forEach(p => {
          if (p.image) prodImages++;
          if (Array.isArray(p.images)) prodImages += p.images.length;
        });
      }

      setProductCount(products ? products.length : 0);
      setProductImagesCount(prodImages);
      setPhotoCount(photos ? photos.length : 0);

      // Also check server persistence status
      const pRes = await fetch('/api/persistence-status');
      if (pRes.ok) {
        const pData = await pRes.json();
        setRepoStatus(pData);
      }
    } catch (e) {
      console.warn('Greška pri učitavanju statistike:', e);
    }
  };

  useEffect(() => {
    loadStats();
    const handleUpdated = () => loadStats();
    window.addEventListener('project-persistence-updated', handleUpdated);
    return () => window.removeEventListener('project-persistence-updated', handleUpdated);
  }, []);

  const handlePermanentPersist = async () => {
    setIsPersistingRepo(true);
    setPersistProgress('Pripremam podatke...');
    try {
      const result = await triggerPermanentProjectPersistence((progress) => {
        setPersistProgress(progress);
      });
      if (result.success) {
        showToast(`Uspešno trajno upisano u GitHub kod: ${result.savedProductsCount} proizvoda i ${result.savedPhotosCount} fotografija!`);
        await loadStats();
      } else {
        showToast(result.error || result.message || 'Greška pri trajnom upisu u projekat.');
      }
    } catch (err) {
      showToast('Greška pri trajnom upisu u GitHub projekat.');
    } finally {
      setIsPersistingRepo(false);
      setPersistProgress('');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await downloadFullBackup();
      if (res.success) {
        showToast(`Rezervna kopija preuzeta! (${res.count?.photos} slika, ${res.count?.products} proizvoda)`);
      } else {
        showToast('Greška pri preuzimanju rezervne kopije.');
      }
    } catch {
      showToast('Greška pri generisanju fajla.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        const res = await restoreFromBackupData(data);
        if (res.success) {
          await loadStats();
          showToast(`Uspešno vraćeno: ${res.restoredPhotos} slika i ${res.restoredProducts} proizvoda!`);
        } else {
          showToast(res.error || 'Neispravan fajl rezervne kopije.');
        }
      } catch {
        showToast('Greška pri obradi JSON fajla.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleSyncToSupabase = async () => {
    if (!isSupabaseConfigured) {
      showToast('Supabase nije konfigurisan. Podesite VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setIsSyncing(true);
    try {
      const [products, photos] = await Promise.all([
        getCustomProducts(),
        loadPhotosFromStorage(),
      ]);

      const [pRes, gRes] = await Promise.all([
        products && products.length > 0 ? syncCustomProductsToSupabase(products) : true,
        photos && photos.length > 0 ? syncGalleryPhotosToSupabase(photos) : true,
      ]);

      if (pRes && gRes) {
        showToast('Svi proizvodi i fotografije su uspešno sinhronizovani sa Supabase!');
      } else {
        showToast('Sinhronizacija delimično nije uspela. Proverite Supabase tabele.');
      }
    } catch (err) {
      showToast('Greška pri sinhronizaciji sa Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    showToast('SQL skripta kopirana u privremenu memoriju!');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* 1. Status Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#241D19] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-[#E8D0A9] flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-400">Lokalno sačuvano (Uređaj)</p>
            <h3 className="text-xl font-bold text-white font-serif">{productCount} proizvoda • {photoCount} slika</h3>
            <p className="text-[11px] text-emerald-400 mt-0.5">Spremljeno u trajnoj bazi pretraživača</p>
          </div>
        </div>

        <div className="bg-[#241D19] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isSupabaseConfigured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-400'
          }`}>
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-400">Supabase Cloud Baza</p>
            <h3 className="text-lg font-bold text-white font-serif">
              {isSupabaseConfigured ? 'Povezan & Aktivan' : 'Nije Konfigurisan'}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {isSupabaseConfigured ? 'Sinhronizacija u toku' : 'Potrebno uneti URL i ključ'}
            </p>
          </div>
        </div>

        <div className="bg-[#241D19] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-stone-400">Bezbednost Podataka</p>
            <h3 className="text-lg font-bold text-white font-serif">1-Klik Rezervna Kopija</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Preuzmite JSON fajl u bilo kom trenutku</p>
          </div>
        </div>
      </div>

      {/* Administratorska Bezbednost & Lozinka */}
      <div className="bg-[#241D19] border border-[#C2872A]/40 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#C2872A]/20 border border-[#C2872A]/40 flex items-center justify-center text-[#E8D0A9] shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-serif text-[#E8D0A9]">Administratorska Lozinka za Pristup</h2>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${
                isUsingDefaultPin()
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isUsingDefaultPin() ? 'Fabrička Lozinka' : 'Aktivna Vaša Lozinka'}
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-1">
              Lozinka više nije javno prikazana na dugmetu sajta. Ovde možete promeniti svoju lozinku ili je po potrebi vratiti na fabričku.
            </p>
          </div>
        </div>

        {onOpenChangePassword && (
          <button
            type="button"
            onClick={onOpenChangePassword}
            className="px-5 py-2.5 bg-[#C2872A] hover:bg-[#a87422] text-stone-950 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer shrink-0 font-serif"
          >
            <KeyRound className="w-4 h-4" />
            <span>Promeni Lozinku</span>
          </button>
        )}
      </div>

      {/* Trajno ugrađivanje i Direktan Push na GitHub (SAVREMENI-KORENI-EXPORT) */}
      <div className="bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E1B18] border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
              <CheckCircle2 className="w-4 h-4" />
              Direktna Automatska Sinhronizacija sa GitHub Repozitorijumom
            </div>
            <h2 className="text-xl font-serif text-white font-bold flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-emerald-400" />
              Povezivanje i Automatski Push na GitHub (<code className="text-emerald-300 font-mono text-base">SAVREMENI-KORENI-EXPORT</code>)
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePermanentPersist}
              disabled={isPersistingRepo || isPushingGithub}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-stone-200 font-medium text-xs rounded-xl flex items-center gap-2 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              title="Samo lokalno upiši u fajlove na serveru"
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>{isPersistingRepo ? (persistProgress || 'Upisujem lokalno...') : 'Lokalno u kod'}</span>
            </button>

            <button
              onClick={handlePushToGithub}
              disabled={isPushingGithub || isPersistingRepo}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm rounded-xl flex items-center gap-2.5 transition-all shadow-xl shadow-emerald-950/50 hover:shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-5 h-5 ${isPushingGithub ? 'animate-bounce' : ''}`} />
              <span>{isPushingGithub ? (persistProgress || 'Šaljem na GitHub...') : '⚡ DIREKTNO PUSTI NA GITHUB (SAVREMENI-KORENI-EXPORT)'}</span>
            </button>
          </div>
        </div>

        {/* Info text */}
        <p className="text-xs text-stone-300 leading-relaxed">
          Ova funkcija trajno upisuje sve vaše proizvode ({productCount}), sve optimizovane fotografije ({productImagesCount + photoCount}) i sve SEO stranice direktno u vaš GitHub repozitorijum <strong className="text-emerald-400">SAVREMENI-KORENI-EXPORT</strong>. 
          Čim kliknete dugme, GitHub prima novi commit i vaš Cloudflare Pages ili Vercel hosting odmah pravi novu verziju sajta sa svim podacima uživo!
        </p>

        {/* GitHub Credentials Setup Form */}
        <div className="bg-black/50 rounded-xl p-4 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              Podešavanje GitHub Tokena i Repozitorijuma
            </h3>
            <a 
              href="https://github.com/settings/tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Kreiraj GitHub Token (PAT sa 'repo' dozvolom)
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-[11px] font-medium text-stone-300 mb-1">
                GitHub Token (PAT / Personal Access Token):
              </label>
              <div className="relative">
                <input
                  type={showPat ? 'text' : 'password'}
                  value={githubToken}
                  onChange={(e) => {
                    setGithubToken(e.target.value);
                    handleSaveGithubConfig(e.target.value, githubRepo, githubBranch);
                  }}
                  placeholder="ghp_1234567890abcdef..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPat(!showPat)}
                  className="absolute right-2.5 top-2 text-stone-400 hover:text-white"
                >
                  {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">
                Naziv Repozitorijuma na GitHub-u:
              </label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => {
                  setGithubRepo(e.target.value);
                  handleSaveGithubConfig(githubToken, e.target.value, githubBranch);
                }}
                placeholder="sasapetric5/SAVREMENI-KORENI-EXPORT"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-300 mb-1">
                Grana (Branch):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={githubBranch}
                  onChange={(e) => {
                    setGithubBranch(e.target.value);
                    handleSaveGithubConfig(githubToken, githubRepo, e.target.value);
                  }}
                  placeholder="main"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestGithubConnection}
                  disabled={isTestingGithub}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs rounded-lg border border-emerald-500/30 transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingGithub ? 'animate-spin' : ''}`} />
                  Testiraj
                </button>
              </div>
            </div>
          </div>

          {githubStatus && (
            <div className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
              githubStatus.success 
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {githubStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                <span>{githubStatus.message}</span>
              </div>
              {lastCommitUrl && (
                <a
                  href={lastCommitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-emerald-800/60 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded flex items-center gap-1 shrink-0"
                >
                  <GitCommit className="w-3.5 h-3.5" />
                  Pogledaj Commit na GitHub-u
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
            <span className="text-stone-400 block text-[11px]">Kolekcija Proizvoda:</span>
            <span className="text-white font-bold text-sm block mt-0.5">{productCount} unikatnih modela</span>
            <span className="text-[11px] text-amber-400/90 block mt-1 font-medium">{productImagesCount} slika proizvoda</span>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
            <span className="text-stone-400 block text-[11px]">Zasebna Galerija:</span>
            <span className="text-white font-bold text-sm block mt-0.5">{photoCount} fotografija</span>
            <span className="text-[11px] text-stone-400 block mt-1">Slike radova iz ateljea</span>
          </div>

          <div className="bg-amber-950/30 rounded-xl p-3 border border-amber-500/30">
            <span className="text-amber-400 font-semibold block text-[11px]">UKUPNO SLIKA NA SAJTU:</span>
            <span className="text-amber-300 font-extrabold text-sm block mt-0.5">{productImagesCount + photoCount} fotografija</span>
            <span className="text-[11px] text-amber-300/80 block mt-1">Svi proizvodi + cela galerija</span>
          </div>

          <div className="bg-emerald-950/30 rounded-xl p-3 border border-emerald-500/30">
            <span className="text-emerald-400 font-semibold block text-[11px]">Fizičke Slike u Kodu:</span>
            <span className="text-emerald-300 font-extrabold text-sm block mt-0.5">
              {repoStatus ? `${repoStatus.physicalUploadsCount} fajlova` : 'Provera...'}
            </span>
            <span className="text-[11px] text-emerald-300/80 block mt-1">public/custom_products/</span>
          </div>
        </div>
      </div>

      {/* 2. Export / Import Section */}
      <div className="bg-[#241D19] border border-[#C2872A]/30 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-serif text-[#E8D0A9] flex items-center gap-2 mb-2">
          <Download className="w-5 h-5 text-[#C2872A]" />
          Preuzimanje i Vraćanje Rezervne Kopije (JSON)
        </h2>
        <p className="text-xs text-stone-300 leading-relaxed mb-6">
          Preuzmite kompletnu rezervnu kopiju svih vaših unikatnih proizvoda i SEO optimizovanih fotografija. 
          Ovaj fajl možete čuvati na telefonu, računaru ili ga preneti na bilo koji drugi uređaj i jednim klikom vratiti sve podatke!
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-3 bg-gradient-to-r from-[#9E3E26] to-[#C2872A] hover:opacity-95 text-white font-medium text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Preuzimanje...' : 'Preuzmi Rezervnu Kopiju (JSON)'}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="px-5 py-3 bg-white/10 hover:bg-white/15 border border-white/20 text-stone-200 font-medium text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>{isImporting ? 'Vraćanje...' : 'Uvezi Rezervnu Kopiju (JSON)'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />

          {isSupabaseConfigured && (
            <button
              onClick={handleSyncToSupabase}
              disabled={isSyncing}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sinhronizacija...' : 'Pošalji sve na Supabase sada'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Supabase Guide & SQL Schema */}
      <div className="bg-[#241D19] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-serif text-[#E8D0A9] flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Supabase Integracija & Postavljanje
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Supabase omogućava besplatnu bazu podataka bez restriktivnih dnevnih kvota.
            </p>
          </div>

          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs font-medium rounded-xl flex items-center gap-2 transition-all"
          >
            <span>Otvori Supabase.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Step-by-step instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#1C1613] p-4 rounded-xl border border-white/5 space-y-2">
            <span className="w-6 h-6 rounded-full bg-[#C2872A]/20 text-[#E8D0A9] font-bold flex items-center justify-center text-[11px]">1</span>
            <h4 className="font-semibold text-white">Kreirajte projekat</h4>
            <p className="text-stone-400">
              Registrujte se besplatno na supabase.com i kliknite <strong>New Project</strong> (unesite ime npr. <em>savremeni-koreni</em>).
            </p>
          </div>

          <div className="bg-[#1C1613] p-4 rounded-xl border border-white/5 space-y-2">
            <span className="w-6 h-6 rounded-full bg-[#C2872A]/20 text-[#E8D0A9] font-bold flex items-center justify-center text-[11px]">2</span>
            <h4 className="font-semibold text-white">Pokrenite SQL Skriptu</h4>
            <p className="text-stone-400">
              U levom meniju na Supabase otvorite <strong>SQL Editor</strong>, nalepite pripremljeni kod ispod i kliknite <strong>Run</strong>.
            </p>
          </div>

          <div className="bg-[#1C1613] p-4 rounded-xl border border-white/5 space-y-2">
            <span className="w-6 h-6 rounded-full bg-[#C2872A]/20 text-[#E8D0A9] font-bold flex items-center justify-center text-[11px]">3</span>
            <h4 className="font-semibold text-white">Povežite sajt</h4>
            <p className="text-stone-400">
              U <strong>Project Settings → API</strong> kopirajte URL i anon ključ, i prosledite ih nama ili unesite u .env.
            </p>
          </div>
        </div>

        {/* SQL Script Box */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider text-[#E8D0A9] font-medium">
              SQL Skripta za kreiranje tabela na Supabase (Jedan Klik za Kopiranje):
            </label>
            <button
              type="button"
              onClick={copySqlToClipboard}
              className="px-3 py-1.5 bg-[#C2872A]/20 hover:bg-[#C2872A]/30 border border-[#C2872A]/40 text-[#E8D0A9] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Kopirano!' : 'Kopiraj SQL'}</span>
            </button>
          </div>

          <div className="bg-[#120F0D] border border-white/10 rounded-xl p-4 overflow-x-auto">
            <pre className="text-[11px] font-mono text-stone-300 whitespace-pre leading-relaxed">
              {SUPABASE_SQL_SCRIPT}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
