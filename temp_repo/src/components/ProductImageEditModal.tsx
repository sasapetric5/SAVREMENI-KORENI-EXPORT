import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  Star, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Image as ImageIcon,
  Languages,
  Eye
} from 'lucide-react';
import { Product } from '../types';
import { compressImageFile, formatBytes } from '../utils/imageCompressor';
import { saveCustomProduct } from '../utils/customProductStorage';

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
  const [images, setImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionBadge, setCompressionBadge] = useState<string | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      const initialList: string[] = [];
      if (product.image) initialList.push(product.image);
      if (Array.isArray(product.images)) {
        product.images.forEach(img => {
          if (img && !initialList.includes(img)) {
            initialList.push(img);
          }
        });
      }
      setImages(initialList);
      setCompressionBadge(null);
      setReplacingIndex(null);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleAddNewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });

      setImages(prev => [...prev, res.dataUrl]);
      setCompressionBadge(`⚡ Slika optimizovana: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (-${res.savingsPercent}%)`);
      showToast(`Slika je kompresovana i dodata! (-${res.savingsPercent}%)`);
    } catch (err) {
      console.warn("Greška pri kompresiji, fallback:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) setImages(prev => [...prev, url]);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleReplaceSpecificImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingIndex === null) return;

    setIsCompressing(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });

      setImages(prev => {
        const updated = [...prev];
        updated[replacingIndex] = res.dataUrl;
        return updated;
      });
      setCompressionBadge(`⚡ Zamenjena slika #${replacingIndex + 1}: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (-${res.savingsPercent}%)`);
      showToast(`Slika #${replacingIndex + 1} uspešno zamenjena i optimizovana!`);
    } catch (err) {
      console.warn("Greška pri zameni slike:", err);
    } finally {
      setIsCompressing(false);
      setReplacingIndex(null);
      e.target.value = '';
    }
  };

  const handleDeleteImage = (index: number) => {
    if (images.length <= 1) {
      if (!confirm("Ovo je jedina slika proizvoda. Da li sigurno želite da je obrišete?")) {
        return;
      }
    }
    setImages(prev => prev.filter((_, i) => i !== index));
    showToast(`Slika #${index + 1} je uklonjena.`);
  };

  const handleSetAsPrimary = (index: number) => {
    if (index === 0) return;
    setImages(prev => {
      const target = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [target, ...rest];
    });
    showToast(`Slika #${index + 1} je sada postavljena kao glavna slika proizvoda!`);
  };

  const handleSaveChanges = async () => {
    if (images.length === 0) {
      alert("Proizvod mora imati bar jednu sliku pre čuvanja.");
      return;
    }

    const mainImage = images[0];
    const additionalImages = images.slice(1);

    // KORISNIKOV GLAVNI ZAHTEV:
    // Opisi na srpskom i engleskom se čuvaju 100% netaknuti bez ikakvog brisanja!
    const updatedProduct: Product = {
      ...product,
      image: mainImage,
      images: additionalImages,
      // Eksplicitno osiguravamo očuvanje svih jezičkih varijanti opisa i naziva
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
      showToast(`✨ Slike za "${product.name}" su uspešno ažurirane! Opisi na srpskom i engleskom su sačuvani.`);
      onClose();
    } catch (err) {
      console.error("Greška pri čuvanju slika proizvoda:", err);
      showToast("Greška pri čuvanju slika proizvoda.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#1A1512] border border-[#C2872A]/50 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl text-white">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-[#241D19]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C2872A]/20 border border-[#C2872A]/40 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-[#C2872A]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#FAF7F2] flex items-center gap-2">
                <span>Zameni & Dodaj Slike Proizvoda</span>
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
          
          {/* Information Notice: Descriptions Safe Guarantee */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-xs text-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-300">
                Garantovano očuvanje opisa na Srpskom i Engleskom jeziku
              </p>
              <p className="text-stone-300 text-[11px] leading-relaxed">
                Zamena, dodavanje ili brisanje slika ni na koji način ne dira postojeće opise, cene, materijale niti nazive proizvoda. Sve jezičke verzije ostaju 100% nepromenjene.
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
                <span>Pregledaj zaštićene opise ovog proizvoda ({isCompressing ? '...' : '🇷🇸 & 🇬🇧'})</span>
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

          {/* Slike Proizvoda Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs uppercase tracking-wider text-[#E8D0A9] font-semibold flex items-center gap-2">
                <span>Fotografije Proizvoda ({images.length})</span>
                <span className="text-[10px] text-stone-400 font-normal normal-case">
                  (Prva slika je glavna naslovna slika)
                </span>
              </label>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="px-3 py-1.5 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Dodaj Novu Sliku</span>
              </button>
            </div>

            {/* Compression Indicator */}
            {isCompressing && (
              <div className="p-3 bg-[#C2872A]/10 border border-[#C2872A]/30 rounded-xl flex items-center gap-2.5 text-xs text-[#E8D0A9] animate-pulse mb-3">
                <RefreshCw className="w-4 h-4 animate-spin text-[#C2872A]" />
                <span>Optimizacija i kompresija slike u ultra-lagan WebP format bez gubitka oštrine...</span>
              </div>
            )}

            {compressionBadge && (
              <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{compressionBadge}</span>
              </div>
            )}

            {/* Images list */}
            {images.length === 0 ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-700 hover:border-[#C2872A] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-stone-900/30"
              >
                <Upload className="w-8 h-8 text-stone-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-stone-300">Proizvod trenutno nema sliku</p>
                <p className="text-xs text-stone-500 mt-1">Kliknite da izaberete sliku sa računara ili telefona</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((imgUrl, index) => {
                  const isPrimary = index === 0;
                  return (
                    <div 
                      key={index}
                      className={`relative group rounded-xl overflow-hidden border ${
                        isPrimary ? 'border-[#C2872A] ring-2 ring-[#C2872A]/40' : 'border-stone-800'
                      } bg-black/60 shadow-md flex flex-col`}
                    >
                      <div className="relative aspect-square">
                        <img 
                          src={imgUrl} 
                          alt={`Slika ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Badge for primary or index */}
                        <div className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPrimary 
                            ? 'bg-[#C2872A] text-stone-950 flex items-center gap-1 shadow' 
                            : 'bg-black/70 text-stone-300'
                        }`}>
                          {isPrimary && <Star className="w-3 h-3 fill-stone-950" />}
                          <span>{isPrimary ? 'Glavna' : `#${index + 1}`}</span>
                        </div>

                        {/* Hover Overlay Actions */}
                        <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplacingIndex(index);
                              replaceInputRef.current?.click();
                            }}
                            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-white rounded text-[11px] font-medium flex items-center gap-1 w-full justify-center transition-colors cursor-pointer border border-stone-600"
                            title="Zameni ovu sliku drugom"
                          >
                            <RefreshCw className="w-3 h-3 text-[#C2872A]" />
                            <span>Zameni sliku</span>
                          </button>

                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetAsPrimary(index)}
                              className="px-2.5 py-1 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 rounded text-[11px] font-bold flex items-center gap-1 w-full justify-center transition-colors cursor-pointer shadow"
                              title="Postavi kao glavnu naslovnu sliku"
                            >
                              <Star className="w-3 h-3 fill-stone-950" />
                              <span>Učini Glavnom</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteImage(index)}
                            className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-200 rounded text-[11px] font-medium flex items-center gap-1 w-full justify-center transition-colors cursor-pointer border border-red-700/50"
                            title="Obriši ovu sliku"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                            <span>Obriši sliku</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-1.5 bg-stone-900/90 text-center border-t border-stone-800">
                        <span className="text-[10px] text-stone-400">
                          {isPrimary ? 'Prikazuje se na katalogu' : `Dodatna fotografija #${index + 1}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAddNewImage}
            />

            <input
              ref={replaceInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleReplaceSpecificImage}
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
            onClick={handleSaveChanges}
            disabled={isCompressing}
            className="px-6 py-2.5 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer font-serif tracking-wide disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sačuvaj Nove Slike (Zadrži Opise)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
