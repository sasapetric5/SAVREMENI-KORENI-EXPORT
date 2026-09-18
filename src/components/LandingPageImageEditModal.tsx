import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Image as ImageIcon,
  Compass,
  ExternalLink
} from 'lucide-react';
import { SeoLandingPageData } from '../data/seoLandingPagesData';
import { compressImageFile, formatBytes } from '../utils/imageCompressor';
import { updateLandingPageImages } from '../utils/landingPageStorage';

interface LandingPageImageEditModalProps {
  landingPage: SeoLandingPageData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  showToast: (message: string) => void;
}

export const LandingPageImageEditModal: React.FC<LandingPageImageEditModalProps> = ({
  landingPage,
  isOpen,
  onClose,
  onSaved,
  showToast
}) => {
  const [heroImage, setHeroImage] = useState<string>('');
  const [secondaryImage, setSecondaryImage] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionMsg, setCompressionMsg] = useState<string | null>(null);

  const heroInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (landingPage) {
      setHeroImage(landingPage.heroImage || '');
      setSecondaryImage(landingPage.secondaryImage || '');
      setCompressionMsg(null);
    }
  }, [landingPage, isOpen]);

  if (!isOpen || !landingPage) return null;

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });

      setHeroImage(res.dataUrl);
      setCompressionMsg(`⚡ Glavna Hero slika optimizovana: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (-${res.savingsPercent}%)`);
      showToast(`Glavna Hero slika kompresovana (-${res.savingsPercent}%)!`);
    } catch (err) {
      console.warn("Hero image compression error:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) setHeroImage(url);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleSecondaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });

      setSecondaryImage(res.dataUrl);
      setCompressionMsg(`⚡ Sekundarna slika optimizovana: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (-${res.savingsPercent}%)`);
      showToast(`Sekundarna slika kompresovana (-${res.savingsPercent}%)!`);
    } catch (err) {
      console.warn("Secondary image compression error:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) setSecondaryImage(url);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    updateLandingPageImages(landingPage.slug, heroImage, secondaryImage);
    showToast(`✨ Slike za Landing stranicu "${landingPage.titleSr}" su uspešno sačuvane!`);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#1A1512] border border-[#C2872A]/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-white">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-[#241D19]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C2872A]/20 border border-[#C2872A]/40 flex items-center justify-center">
              <Compass className="w-5 h-5 text-[#C2872A]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#FAF7F2]">
                Upravljanje Slikama za Landing Page
              </h2>
              <p className="text-xs text-[#C2872A] font-medium truncate max-w-md">
                /{landingPage.slug} • {landingPage.titleSr}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">

          {isCompressing && (
            <div className="p-3 bg-[#C2872A]/10 border border-[#C2872A]/30 rounded-xl flex items-center gap-2.5 text-xs text-[#E8D0A9] animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-[#C2872A]" />
              <span>Kompresija slike u ultra-brzi WebP format...</span>
            </div>
          )}

          {compressionMsg && (
            <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{compressionMsg}</span>
            </div>
          )}

          {/* 1. Glavna Hero Slika */}
          <div className="bg-[#121212] border border-stone-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-[#E8D0A9] font-bold">
                  Glavna Hero Slika (Hero Banner)
                </h3>
                <p className="text-[11px] text-stone-400">Prikazuje se na vrhu landing stranice.</p>
              </div>

              <button
                type="button"
                onClick={() => heroInputRef.current?.click()}
                disabled={isCompressing}
                className="px-3 py-1.5 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{heroImage ? 'Zameni Hero Sliku' : '+ Postavi Hero Sliku'}</span>
              </button>
            </div>

            {heroImage ? (
              <div className="relative rounded-xl overflow-hidden border border-[#C2872A]/40 aspect-video max-h-52 bg-black/60 group">
                <img src={heroImage} alt="Hero" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => heroInputRef.current?.click()}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#C2872A]" />
                    <span>Zameni</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHeroImage('');
                      showToast("Hero slika je uklonjena.");
                    }}
                    className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Obriši sliku</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => heroInputRef.current?.click()}
                className="border-2 border-dashed border-stone-700 hover:border-[#C2872A] rounded-xl p-6 text-center cursor-pointer transition-colors bg-stone-900/30"
              >
                <Upload className="w-6 h-6 text-stone-500 mx-auto mb-1" />
                <p className="text-xs text-stone-300">Trenutno nema Hero slike</p>
                <p className="text-[10px] text-stone-500">Kliknite da postavite glavnu sliku za ovu stranicu</p>
              </div>
            )}

            <input
              ref={heroInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleHeroUpload}
            />
          </div>

          {/* 2. Sekundarna Slika */}
          <div className="bg-[#121212] border border-stone-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-[#E8D0A9] font-bold">
                  Sekundarna Slika (Prateća fotografija ručnog rada)
                </h3>
                <p className="text-[11px] text-stone-400">Prikazuje se pored opisa zanata i tradicije.</p>
              </div>

              <button
                type="button"
                onClick={() => secondaryInputRef.current?.click()}
                disabled={isCompressing}
                className="px-3 py-1.5 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{secondaryImage ? 'Zameni Sekundarnu Sliku' : '+ Postavi Sekundarnu Sliku'}</span>
              </button>
            </div>

            {secondaryImage ? (
              <div className="relative rounded-xl overflow-hidden border border-[#C2872A]/40 aspect-video max-h-52 bg-black/60 group">
                <img src={secondaryImage} alt="Secondary" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => secondaryInputRef.current?.click()}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#C2872A]" />
                    <span>Zameni</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSecondaryImage('');
                      showToast("Sekundarna slika je uklonjena.");
                    }}
                    className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Obriši sliku</span>
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => secondaryInputRef.current?.click()}
                className="border-2 border-dashed border-stone-700 hover:border-[#C2872A] rounded-xl p-6 text-center cursor-pointer transition-colors bg-stone-900/30"
              >
                <Upload className="w-6 h-6 text-stone-500 mx-auto mb-1" />
                <p className="text-xs text-stone-300">Trenutno nema sekundarne slike</p>
                <p className="text-[10px] text-stone-500">Kliknite da postavite prateću sliku</p>
              </div>
            )}

            <input
              ref={secondaryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSecondaryUpload}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-[#241D19] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Odustani
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isCompressing}
            className="px-6 py-2.5 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer font-serif tracking-wide disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sačuvaj Promene Slika</span>
          </button>
        </div>

      </div>
    </div>
  );
};
