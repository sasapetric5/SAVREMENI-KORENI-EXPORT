import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Download, Upload, CheckCircle2, AlertCircle, 
  Copy, Check, RefreshCw, ExternalLink, ShieldCheck, HardDrive
} from 'lucide-react';
import { isSupabaseConfigured, syncCustomProductsToSupabase, syncGalleryPhotosToSupabase } from '../lib/supabase';
import { downloadFullBackup, restoreFromBackupData } from '../utils/backupStorage';
import { getCustomProducts } from '../utils/customProductStorage';
import { loadPhotosFromStorage } from '../utils/photoStorage';
import { triggerPermanentProjectPersistence } from './AutoProjectPersister';

interface DatabaseAdminPanelProps {
  showToast: (msg: string) => void;
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

export const DatabaseAdminPanel: React.FC<DatabaseAdminPanelProps> = ({ showToast }) => {
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

      {/* Trajno ugrađivanje u GitHub & Cloudflare Pages */}
      <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-2 border-emerald-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <CheckCircle2 className="w-4 h-4" />
              Automatska sinhronizacija u GitHub & Cloudflare Pages
            </div>
            <h2 className="text-xl font-serif text-white font-bold">
              Trajno Čuvanje Svih Proizvoda i Slika u Kodu Projekta
            </h2>
          </div>
          <button
            onClick={handlePermanentPersist}
            disabled={isPersistingRepo}
            className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2.5 transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-5 h-5 ${isPersistingRepo ? 'animate-spin' : ''}`} />
            <span>{isPersistingRepo ? (persistProgress || 'Upisujem u projekat...') : '⚡ Trajno upiši sve u GitHub kod'}</span>
          </button>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed max-w-3xl mb-4">
          Ova funkcija uzima sve vaše proizvode (svih 47) i sve optimizovane fotografije iz vašeg pretraživača i fizički ih upisuje u repozitorijum projekta (<code className="text-emerald-300 bg-emerald-950/40 px-1 py-0.5 rounded">public/custom_products/</code> i <code className="text-emerald-300 bg-emerald-950/40 px-1 py-0.5 rounded">src/data/permanentProductsData.ts</code>). Nakon toga, svaki put kada uradite deploy na Cloudflare Pages, sajt će odmah prikazivati identične podatke bez ikakve potrebe za ručnim radom!
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
            <span className="text-stone-400 block text-[11px]">Kolekcija Proizvoda:</span>
            <span className="text-white font-bold text-sm block mt-0.5">{productCount} unikatnih modela</span>
            <span className="text-[11px] text-amber-400/90 block mt-1 font-medium">{productImagesCount} slika proizvoda (do 4 po modelu)</span>
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
