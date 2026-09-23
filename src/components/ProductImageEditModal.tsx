import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  Star, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Image as ImageIcon,
  Languages
} from 'lucide-react';
import { Product } from '../types';
import { compressImageFile, formatBytes } from '../utils/imageCompressor';
import { saveCustomProduct } from '../utils/customProductStorage';
import { generateProductImageAlt, AiImageAltResult } from '../utils/imageSeo';

interface ProductImageEditModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedProduct: Product) => void;
  showToast: (message: string) => void;
}

export const ProductImageEditModal: React.FC<ProductImageEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaved,
  showToast
}) => {
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionBadge, setCompressionBadge] = useState<string | null>(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);
  const [altResults, setAltResults] = useState<Record<number, AiImageAltResult | null>>({});
  const [altLoading, setAltLoading] = useState<number | null>(null);
  const [editableAlts, setEditableAlts] = useState<Record<number, { alt: string; altEn: string }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      const initialSlots: (string | null)[] = [null, null, null, null];
      if (product.image) {
        initialSlots[0] = product.image;
      }
      if (Array.isArray(product.images)) {
        let slotIdx = 1;
        product.images.forEach(img => {
          if (img && img !== product.image && slotIdx < 4) {
            initialSlots[slotIdx] = img;
            slotIdx++;
          }
        });
        if (!initialSlots[0] && product.images[0]) {
          initialSlots[0] = product.images[0];
          let sIdx = 1;
          product.images.slice(1).forEach(img => {
            if (img && sIdx < 4) {
              initialSlots[sIdx] = img;
              sIdx++;
            }
          });
        }
      }
      setSlots(initialSlots);
      setCompressionBadge(null);
      setActiveSlotIndex(null);
      setAltResults({});
      setAltLoading(null);
      const existingAlts = product.imageAlts || [];
      const restored: Record<number, { alt: string; altEn: string }> = {};
      existingAlts.forEach((a, i) => { if (a) restored[i] = { alt: a.alt || '', altEn: a.altEn || '' }; });
      setEditableAlts(restored);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleSlotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeSlotIndex === null) return;

    setIsCompressing(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });

      setSlots(prev => {
        const updated = [...prev];
        updated[activeSlotIndex] = res.dataUrl;
        return updated;
      });
      setCompressionBadge(`⚡ Slot ${activeSlotIndex + 1} optimizovan: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (-${res.savingsPercent}%)`);
      showToast(`Slika za Slot ${activeSlotIndex + 1} uspešno postavljena i optimizovana!`);
    } catch (err) {
      console.warn("Greška pri kompresiji, fallback:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) {
          setSlots(prev => {
            const updated = [...prev];
            updated[activeSlotIndex] = url;
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
      setActiveSlotIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearSlot = (index: number) => {
    setSlots(prev => {
      const updated = [...prev];
      updated[index] = null;
      return updated;
    });
    showToast(`Slot ${index + 1} je ispražnjen.`);
  };

  const handleSetSlotAsPrimary = (index: number) => {
    if (index === 0) return;
    setSlots(prev => {
      const updated = [...prev];
      const target = updated[index];
      updated.splice(index, 1);
      updated.unshift(target);
      while (updated.length < 4) updated.push(null);
      return updated.slice(0, 4);
    });
    showToast(`Slot ${index + 1} je postavljen kao Glavna slika (Slot 1)!`);
  };

  const handleSwapWithPrimary = (index: number) => {
    if (index === 0) return;
    setSlots(prev => {
      const updated = [...prev];
      const temp = updated[0];
      updated[0] = updated[index];
      updated[index] = temp;
      return updated;
    });
    showToast(`Glavna slika je uspešno zamenjena sa Slotom ${index + 1}!`);
  };

  const handleGenerateAlt = async (index: number) => {
    const imageUrl = slots[index];
    if (!imageUrl) return;
    setAltLoading(index);
    try {
      const apiKey = localStorage.getItem('koreni_gemini_api_key') || '';
      const result = await generateProductImageAlt({
        imageUrl,
        productNameSr: product.name,
        productNameEn: product.nameEn,
        keywords: [
          product.category,
          ...(product.materials || []),
          ...(product.craftTechniques || [])
        ],
        imageRole: index === 0 ? 'main' : index === 1 ? 'closeup' : index === 2 ? 'interior' : 'model',
        apiKey
      });
      setAltResults(prev => ({ ...prev, [index]: result }));
      setEditableAlts(prev => ({ ...prev, [index]: { alt: result.altSr, altEn: result.altEn } }));
      showToast(result.source === 'vision' ? '✨ ALT je generisan analizom stvarne fotografije.' : 'ALT je napravljen pomoću sigurnog fallback-a.');
    } catch (error) {
      console.error('ALT generation error:', error);
      showToast('Nije moguće generisati ALT tekst.');
    } finally {
      setAltLoading(null);
    }
  };

  const handleSaveChanges = async () => {
    const validSlots = slots.filter((s): s is string => Boolean(s));
    if (validSlots.length === 0) {
      alert("Proizvod mora imati bar jednu sliku pre čuvanja.");
      return;
    }

    const mainImage = slots[0] || validSlots[0];
    const allValidImages = slots.filter((s): s is string => Boolean(s));

    const updatedProduct: Product = {
      ...product,
      image: mainImage,
      images: allValidImages,
      imageAlts,
      ...(mainAlt?.alt ? { alt: mainAlt.alt, altEn: mainAlt.altEn } : {}),
      name: product.name,
      nameEn: product.nameEn,
      description: product.description,
      descriptionSr: product.descriptionSr || product.description,
      descriptionEn: product.descriptionEn,
      longDescription: product.longDescription,
      longDescriptionEn: product.longDescriptionEn,
      priceRsd: product.priceRsd,
      priceEur: product.priceEur,
      category: product.category,
      materials: product.materials || [],
      materialsEn: product.materialsEn || [],
      craftTechniques: product.craftTechniques || [],
      craftTechniquesEn: product.craftTechniquesEn || [],
      inStock: product.inStock !== false,
      leadTimeDays: product.leadTimeDays || 3
    };

    try {
      await saveCustomProduct(updatedProduct);
      window.dispatchEvent(new CustomEvent('custom-products-updated', { detail: [updatedProduct] }));
      onSaved(updatedProduct);
      showToast(`✨ Slike za "${product.name}" su uspešno sačuvane u 4 slota! Opisi su sačuvani.`);
      onClose();
    } catch (err) {
      console.error("Greška pri čuvanju slika proizvoda:", err);
      showToast("Greška pri čuvanju slika proizvoda.");
    }
  };

  const filledCount = slots.filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#1A1512] border border-[#C2872A]/50 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-white">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-[#241D19]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C2872A]/20 border border-[#C2872A]/40 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-[#C2872A]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#FAF7F2] flex items-center gap-2">
                <span>Upravljanje sa 4 Nezavisna Slota Slika</span>
              </h2>
              <p className="text-xs text-[#C2872A] font-medium truncate max-w-md">
                {product.name} {product.nameEn ? `• ${product.nameEn}` : ''}
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
          
          {/* Information Notice */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-xs text-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-300">
                Slobodan raspored i zamena u 4 nezavisna slota
              </p>
              <p className="text-stone-300 text-[11px] leading-relaxed">
                Možete zameniti, dodati ili postaviti bilo koji slot kao glavnu naslovnu sliku u bilo kom trenutku. Opisi na srpskom i engleskom jeziku su potpuno zaštićeni i netaknuti.
              </p>
            </div>
          </div>

          {/* Description Preview Toggle */}
          <div className="bg-[#121212] border border-stone-800 rounded-xl p-3">
            <button
              type="button"
              onClick={() => setShowDescriptionPreview(!showDescriptionPreview)}
              className="w-full flex items-center justify-between text-xs text-[#E8D0A9] font-medium cursor-pointer hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-[#C2872A]" />
                <span>Pregledaj zaštićene opise ({'🇷🇸 & 🇬🇧'})</span>
              </span>
              <span className="text-[11px] text-stone-400">{showDescriptionPreview ? 'Sakrij ▲' : 'Prikaži ▼'}</span>
            </button>

            {showDescriptionPreview && (
              <div className="mt-3 pt-3 border-t border-stone-800 space-y-3 text-xs">
                <div>
                  <span className="text-stone-400 font-medium block mb-1">🇷🇸 Opis na Srpskom:</span>
                  <p className="p-2.5 bg-stone-900 rounded-lg text-stone-200 text-[11px] leading-relaxed italic border border-stone-800">
                    {product.description || product.descriptionSr || 'Bez tekstualnog opisa'}
                  </p>
                </div>
                {product.descriptionEn && (
                  <div>
                    <span className="text-stone-400 font-medium block mb-1">🇬🇧 Description in English:</span>
                    <p className="p-2.5 bg-stone-900 rounded-lg text-stone-200 text-[11px] leading-relaxed italic border border-stone-800">
                      {product.descriptionEn}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4 Slots Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs uppercase tracking-wider text-[#E8D0A9] font-semibold flex items-center gap-2">
                <span>4 Nezavisna Slota za Slike ({filledCount}/4 popunjeno)</span>
                <span className="text-[10px] text-stone-400 font-normal normal-case">
                  (Slot 1 je glavna naslovna slika)
                </span>
              </label>
            </div>

            {/* Compression Indicator */}
            {isCompressing && (
              <div className="p-3 bg-[#C2872A]/10 border border-[#C2872A]/30 rounded-xl flex items-center gap-2.5 text-xs text-[#E8D0A9] animate-pulse mb-3">
                <RefreshCw className="w-4 h-4 animate-spin text-[#C2872A]" />
                <span>Optimizacija i kompresija slike u WebP format...</span>
              </div>
            )}

            {compressionBadge && (
              <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{compressionBadge}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {slots.map((imgUrl, index) => {
                const isPrimary = index === 0;
                const hasImage = Boolean(imgUrl);

                return (
                  <div 
                    key={index}
                    className={`relative group rounded-xl overflow-hidden border ${
                      isPrimary 
                        ? 'border-[#C2872A] ring-2 ring-[#C2872A]/40' 
                        : hasImage 
                        ? 'border-stone-700' 
                        : 'border-dashed border-stone-700 bg-stone-900/40'
                    } bg-black/60 shadow-lg flex flex-col justify-between`}
                  >
                    {hasImage ? (
                      <div className="relative aspect-square">
                        <img 
                          src={imgUrl!} 
                          alt={`Slot ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Slot Badge */}
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPrimary 
                            ? 'bg-[#C2872A] text-stone-950 flex items-center gap-1 shadow' 
                            : 'bg-black/80 text-stone-300 border border-stone-700'
                        }`}>
                          {isPrimary && <Star className="w-3 h-3 fill-stone-950" />}
                          <span>{isPrimary ? 'Glavna (Slot 1)' : `Slot ${index + 1}`}</span>
                        </div>

                        {/* Hover Overlay Actions */}
                        <button
                          type="button"
                          onClick={() => handleGenerateAlt(index)}
                          disabled={altLoading === index}
                          className="absolute bottom-2 left-2 right-2 z-10 px-2.5 py-1.5 bg-[#C2872A]/95 hover:bg-[#d49635] text-stone-950 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer shadow"
                          title="Automatski generiši ALT analizom fotografije + nazivom + ključnim rečima"
                        >
                          {altLoading === index ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                          <span>{altLoading === index ? 'Analiziram...' : '✨ Generiši ALT'}</span>
                        </button>
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSlotIndex(index);
                              fileInputRef.current?.click();
                            }}
                            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 w-full justify-center transition-colors cursor-pointer border border-stone-600"
                            title={`Zameni sliku u Slotu ${index + 1}`}
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#C2872A]" />
                            <span>Zameni sliku</span>
                          </button>

                          {!isPrimary && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSetSlotAsPrimary(index)}
                                className="px-3 py-1.5 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 rounded-lg text-xs font-bold flex items-center gap-1.5 w-full justify-center transition-colors cursor-pointer shadow"
                                title="Postavi kao glavnu sliku"
                              >
                                <Star className="w-3.5 h-3.5 fill-stone-950" />
                                <span>Učini Glavnom</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSwapWithPrimary(index)}
                                className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-[#E8D0A9] rounded-lg text-xs font-medium flex items-center gap-1.5 w-full justify-center transition-colors cursor-pointer border border-[#C2872A]/40"
                                title="Zameni mesta sa Glavnom (Slot 1)"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-[#C2872A]" />
                                <span>Zameni sa Glavnom</span>
                              </button>
                            </>
                          )}

                          {isPrimary && slots.some((s, idx) => idx > 0 && s) && (
                            <div className="w-full space-y-1 pt-1">
                              <span className="text-[10px] text-stone-300 font-medium block text-center">Zameni sa:</span>
                              <div className="grid grid-cols-3 gap-1">
                                {slots.map((s, idx) => {
                                  if (idx === 0 || !s) return null;
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => handleSwapWithPrimary(idx)}
                                      className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-[#E8D0A9] rounded text-[10px] font-bold border border-stone-600 cursor-pointer text-center truncate"
                                      title={`Zameni sa Slotom ${idx + 1}`}
                                    >
                                      Slot {idx + 1}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleClearSlot(index)}
                            className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 rounded-lg text-xs font-medium flex items-center gap-1.5 w-full justify-center transition-colors cursor-pointer border border-red-700/50"
                            title={`Isprazni Slot ${index + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>Isprazni Slot</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          setActiveSlotIndex(index);
                          fileInputRef.current?.click();
                        }}
                        className="aspect-square flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-stone-800/40 transition-colors"
                      >
                        <Upload className="w-7 h-7 text-stone-500 mb-2" />
                        <span className="text-xs font-bold text-stone-300">Slot {index + 1} (Prazno)</span>
                        <span className="text-[10px] text-stone-500 mt-1">Kliknite da dodate sliku</span>
                      </div>
                    )}

                    <div className="p-2 bg-stone-900 text-center border-t border-stone-800">
                      <span className="text-[10px] text-stone-400">
                        {isPrimary ? 'Naslovna slika kataloga' : `Rezervni Slot #${index + 1}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSlotFileChange}
            />
          </div>

        </div>

        {/* ALT editor */}
        {Object.keys(editableAlts).length > 0 && (
          <div className="px-5 sm:px-6 pb-4">
            <div className="bg-[#121212] border border-[#C2872A]/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E8D0A9]">ALT tekstovi po fotografiji</span>
                <span className="text-[10px] text-stone-500">AI predlog + ručna kontrola</span>
              </div>
              {Object.entries(editableAlts).map(([key, value]) => {
                const index = Number(key);
                return (
                  <div key={key} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-stone-500">Slot {index + 1} — SR</label>
                      <input value={value.alt} onChange={e => setEditableAlts(prev => ({...prev, [index]: {...prev[index], alt: e.target.value}}))} className="w-full mt-1 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500">Slot {index + 1} — EN</label>
                      <input value={value.altEn} onChange={e => setEditableAlts(prev => ({...prev, [index]: {...prev[index], altEn: e.target.value}}))} className="w-full mt-1 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-white" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
            onClick={handleSaveChanges}
            disabled={isCompressing || filledCount === 0}
            className="px-6 py-2.5 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer font-serif tracking-wide disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sačuvaj Promene (4 Slota)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
