import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  FileText, 
  Image as ImageIcon,
  Sparkles,
  Plus
} from 'lucide-react';
import { BlogPost } from '../types';
import { compressImageFile, formatBytes } from '../utils/imageCompressor';
import { updateBlogPostImages } from '../utils/blogStorage';

interface BlogImageEditModalProps {
  blog: BlogPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  showToast: (message: string) => void;
}

export const BlogImageEditModal: React.FC<BlogImageEditModalProps> = ({
  blog,
  isOpen,
  onClose,
  onSaved,
  showToast
}) => {
  const [coverImage, setCoverImage] = useState<string>('');
  const [sectionImages, setSectionImages] = useState<Record<number, string>>({});
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionMsg, setCompressionMsg] = useState<string | null>(null);
  
  const [targetSectionIdx, setTargetSectionIdx] = useState<number | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const sectionFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (blog) {
      setCoverImage(blog.coverImage || '');
      const secMap: Record<number, string> = {};
      if (Array.isArray(blog.sections)) {
        blog.sections.forEach((sec, idx) => {
          if (sec.image) {
            secMap[idx] = sec.image;
          }
        });
      }
      setSectionImages(secMap);
      setCompressionMsg(null);
      setTargetSectionIdx(null);
    }
  }, [blog, isOpen]);

  if (!isOpen || !blog) return null;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });

      setCoverImage(res.dataUrl);
      setCompressionMsg(`⚡ Glavna slika optimizovana: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (-${res.savingsPercent}%)`);
      showToast(`Naslovna slika optimizovana (-${res.savingsPercent}%)!`);
    } catch (err) {
      console.warn("Cover image compression fallback:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) setCoverImage(url);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleSectionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || targetSectionIdx === null) return;

    setIsCompressing(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });

      setSectionImages(prev => ({
        ...prev,
        [targetSectionIdx]: res.dataUrl
      }));
      setCompressionMsg(`⚡ Slika u pasusu #${targetSectionIdx + 1} optimizovana: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (-${res.savingsPercent}%)`);
      showToast(`Slika za pasus #${targetSectionIdx + 1} uspešno dodata!`);
    } catch (err) {
      console.warn("Section image compression error:", err);
    } finally {
      setIsCompressing(false);
      setTargetSectionIdx(null);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    updateBlogPostImages(blog.id || blog.slug, coverImage, sectionImages);
    showToast(`✨ Slike za blog članak "${blog.title}" su uspešno sačuvane!`);
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
              <ImageIcon className="w-5 h-5 text-[#C2872A]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#FAF7F2]">
                Upravljanje Slikama u Blog Članku
              </h2>
              <p className="text-xs text-[#C2872A] font-medium truncate max-w-md">
                {blog.title}
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
              <span>Kompresija slike u WebP visoke definicije za brže učitavanje sajta...</span>
            </div>
          )}

          {compressionMsg && (
            <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{compressionMsg}</span>
            </div>
          )}

          {/* Glavna Naslovna Slika (Cover / Hero Image) */}
          <div className="bg-[#121212] border border-stone-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-[#E8D0A9] font-bold">
                  Glavna Naslovna Slika Članka (Hero / Cover)
                </h3>
                <p className="text-[11px] text-stone-400">Prikazuje se na vrhu članka, u listi blogova i na društvenim mrežama.</p>
              </div>

              <button
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                disabled={isCompressing}
                className="px-3 py-1.5 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{coverImage ? 'Zameni Sliku' : '+ Postavi Sliku'}</span>
              </button>
            </div>

            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden border border-[#C2872A]/40 aspect-video max-h-56 bg-black/60 group">
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#C2872A]" />
                    <span>Zameni</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage('');
                      showToast("Glavna slika je uklonjena.");
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
                onClick={() => coverFileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-700 hover:border-[#C2872A] rounded-xl p-6 text-center cursor-pointer transition-colors bg-stone-900/30"
              >
                <Upload className="w-6 h-6 text-stone-500 mx-auto mb-1" />
                <p className="text-xs text-stone-300">Trenutno nema naslovne slike</p>
                <p className="text-[10px] text-stone-500">Kliknite da dodate optimizovanu sliku za blog</p>
              </div>
            )}

            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
          </div>

          {/* Slike po Pasusima (Section Images) */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-[#E8D0A9] font-bold">
              Slike unutar Teksta Članka (Pasusi)
            </h3>

            {blog.sections && blog.sections.length > 0 ? (
              <div className="space-y-3">
                {blog.sections.map((sec, idx) => {
                  const currentSecImg = sectionImages[idx];
                  return (
                    <div key={idx} className="bg-[#121212] border border-stone-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono text-[#C2872A] uppercase">Pasus #{idx + 1}</span>
                        <h4 className="text-xs font-semibold text-stone-200 truncate mt-0.5">
                          {sec.heading || `Podnaslov ${idx + 1}`}
                        </h4>
                        <p className="text-[11px] text-stone-400 truncate mt-0.5">
                          {sec.paragraphs?.[0]?.slice(0, 70)}...
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {currentSecImg ? (
                          <div className="flex items-center gap-2">
                            <img src={currentSecImg} alt="Sec" className="w-12 h-12 object-cover rounded-lg border border-stone-700" />
                            <button
                              type="button"
                              onClick={() => {
                                setTargetSectionIdx(idx);
                                sectionFileInputRef.current?.click();
                              }}
                              className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs transition-colors cursor-pointer"
                              title="Zameni sliku u ovom pasusu"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-[#C2872A]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSectionImages(prev => {
                                  const c = { ...prev };
                                  delete c[idx];
                                  return c;
                                });
                                showToast(`Slika u pasusu #${idx + 1} je uklonjena.`);
                              }}
                              className="p-2 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg text-xs transition-colors cursor-pointer border border-red-800/40"
                              title="Obriši sliku iz ovog pasusa"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetSectionIdx(idx);
                              sectionFileInputRef.current?.click();
                            }}
                            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#C2872A]" />
                            <span>+ Dodaj sliku</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic">Ovaj članak nema dodatnih podsekcija.</p>
            )}

            <input
              ref={sectionFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSectionImageUpload}
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
