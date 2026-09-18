import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Clock, MessageCircle, Phone, ShoppingBag, Sparkles, Shield, Info, ChevronLeft, ChevronRight, Share2, Feather, HeartHandshake, Droplet, SunMedium, Layers, ShieldCheck, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Product } from '../types';
import { companyDetails } from '../data/companyData';
import { permanentProductsData } from '../data/permanentProductsData';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { CurrencySelector } from './CurrencySelector';
import { ProductReviews } from './ProductReviews';
import { getProductImageAlt, getProductImageTitle } from '../utils/imageSeo';
import { injectProductSocialMeta, toAbsoluteUrl } from '../utils/socialMeta';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOrderProduct: (productName: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOrderProduct,
}) => {
  const { t, isEn } = useLanguage();
  const { currency, formatProduct } = useCurrency();
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [copiedShare, setCopiedShare] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Magnifying Glass Lens effect state
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0, relX: 0, relY: 0 });
  const [magnifierEnabled, setMagnifierEnabled] = useState(false);

  // Compute full 4 images list for the product
  const allImages: string[] = React.useMemo(() => {
    if (!product) return ['/logo.jpg'];
    const list: string[] = [];
    const addIfValid = (url?: string) => {
      if (
        url &&
        typeof url === 'string' &&
        url.trim().length > 0 &&
        !list.includes(url.trim())
      ) {
        list.push(url.trim());
      }
    };

    const perm = permanentProductsData.find((p) => p.id === product.id);

    // 1. Primary product image (prioritize product.image, then perm.image)
    if (product.image) {
      addIfValid(product.image);
    } else if (perm?.image) {
      addIfValid(perm.image);
    }

    // 2. Secondary gallery images (prioritize product.images, then perm.images)
    if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach(addIfValid);
    } else if (perm?.images && perm.images.length > 0) {
      perm.images.forEach(addIfValid);
    }

    if (list.length === 0) {
      list.push('/logo.jpg');
    }
    return list;
  }, [product]);

  // Reset states when product changes
  useEffect(() => {
    setActiveImageIdx(0);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setCopiedShare(false);
    setShowShareMenu(false);
  }, [product?.id]);

  // Lock body scroll when modal is open and handle ESC key
  useEffect(() => {
    if (!product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIdx((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveImageIdx((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [product, onClose]);

  // Dynamically inject OpenGraph and Twitter card meta tags safely
  useEffect(() => {
    if (!product) return;
    try {
      const cleanup = injectProductSocialMeta(product, isEn);
      return () => {
        try {
          if (typeof cleanup === 'function') cleanup();
        } catch {}
      };
    } catch {}
  }, [product, isEn]);

  // Reset zoom & selection when product or active image changes
  useEffect(() => {
    setActiveImageIdx(0);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setCopiedShare(false);
    setShowShareMenu(false);
  }, [product]);

  useEffect(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setTouchStart(null);
    setTouchEnd(null);
  }, [activeImageIdx]);

  if (!product) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current || zoomScale > 1 || !magnifierEnabled) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate relative percentage (0.0 to 1.0)
    const relX = Math.max(0, Math.min(1, x / rect.width));
    const relY = Math.max(0, Math.min(1, y / rect.height));

    setMagnifierPos({ x, y, relX, relY });
  };

  const toggleZoom = () => {
    if (zoomScale > 1) {
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomScale(2.2);
    }
  };

  const handleShareProduct = async () => {
    const url = `https://savremenikoreni.com/katalog?product=${product.id}`;
    const title = isEn && product.nameEn ? product.nameEn : product.name;
    const text = isEn 
      ? `Check out this authentic handcrafted piece "${title}" by Savremeni Koreni:`
      : `Pogledajte ovaj unikatni ručni rad "${title}" iz radionice Savremeni Koreni:`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch (e) {
      // Ignore clipboard failure
    }
  };

  const priceInfo = formatProduct(product);
  const displayName = (isEn && product.nameEn ? product.nameEn : product.name) || 'Savremeni Koreni Unikat';
  const displayDesc = isEn 
    ? (product.longDescriptionEn || product.descriptionEn || product.longDescription || product.description || '')
    : (product.longDescription || product.description || '');
  
  const rawTech = isEn && product.craftTechniquesEn ? product.craftTechniquesEn : product.craftTechniques;
  const displayTechniques: string[] = Array.isArray(rawTech) ? rawTech : [];

  const rawMat = isEn && product.materialsEn ? product.materialsEn : product.materials;
  const displayMaterials: string[] = Array.isArray(rawMat) ? rawMat : [];

  const safeActiveIdx = Math.max(0, Math.min(activeImageIdx, allImages.length - 1));
  const currentImageUrl = allImages[safeActiveIdx] || allImages[0] || product.image || '/logo.jpg';
  const displayCategory = (product.category || 'radionica').toUpperCase();

  const whatsappUrl = `https://wa.me/381643075214?text=${encodeURIComponent(
    isEn 
      ? `Hello Tanja, I am interested in ordering the handcrafted piece: "${displayName}". Could you share more details on availability?` 
      : `Poštovana Tanja, pišem u vezi porudžbine unikatnog rada "${displayName}". Molim Vas za detalje oko izrade i slanja.`
  )}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl w-full bg-[#FAF7F2] rounded-2xl overflow-hidden shadow-2xl border border-[#E8E0D5] my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#E8E0D5] flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-[#9E3E26] bg-[#F4E8E3] px-2.5 py-1 rounded-md">
              {displayCategory}
            </span>
            <span className="text-xs text-[#241D19]/60 font-serif italic hidden sm:inline">
              {isEn ? 'Handcrafted in Jošanica, Homolje' : 'Ručni rad iz Jošanice, Homolje'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Social Share Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-lg bg-[#FAF7F2] hover:bg-[#F4E8E3] border border-[#E8E0D5] text-[#241D19] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title={isEn ? 'Share product' : 'Podeli proizvod'}
              >
                <Share2 className="w-3.5 h-3.5 text-[#9E3E26]" />
                <span className="hidden sm:inline">{isEn ? 'Share' : 'Podeli'}</span>
              </button>

              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E8E0D5] py-2 z-50 animate-in fade-in">
                  <div className="px-3 py-1.5 border-b border-[#E8E0D5]/50 text-[10px] font-bold uppercase tracking-wider text-[#241D19]/60">
                    {isEn ? 'Share this piece' : 'Podelite ovaj unikat'}
                  </div>

                  {/* Pinterest Direct Pin */}
                  <a
                    href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(`https://savremenikoreni.com/katalog?product=${product.id}`)}&media=${encodeURIComponent(toAbsoluteUrl(currentImageUrl))}&description=${encodeURIComponent(isEn ? `Discover authentic Serbian handcrafted "${displayName}" by Savremeni Koreni` : `Pogledajte prelepi unikatni ručni rad "${product.name}" iz radionice Savremeni Koreni. 100% autorska izrada.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#241D19] hover:bg-[#FAF7F2] transition-colors"
                    onClick={() => setShowShareMenu(false)}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#E60023] flex items-center justify-center text-white font-black text-[11px] leading-none shrink-0">
                      P
                    </span>
                    <span className="font-semibold">{isEn ? 'Pin on Pinterest' : 'Zakači na Pinterest'}</span>
                  </a>

                  {/* Facebook Share */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://savremenikoreni.com/katalog?product=${product.id}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#241D19] hover:bg-[#FAF7F2] transition-colors"
                    onClick={() => setShowShareMenu(false)}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-bold text-xs shrink-0">
                      f
                    </span>
                    <span>{isEn ? 'Share on Facebook' : 'Podeli na Facebook-u'}</span>
                  </a>

                  {/* Twitter / X */}
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://savremenikoreni.com/katalog?product=${product.id}`)}&text=${encodeURIComponent(isEn ? `Check out this authentic handcrafted piece "${displayName}" by Savremeni Koreni:` : `Pogledajte prelepi unikatni ručni rad "${product.name}" iz radionice Savremeni Koreni:`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#241D19] hover:bg-[#FAF7F2] transition-colors"
                    onClick={() => setShowShareMenu(false)}
                  >
                    <span className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white font-bold text-[9px] shrink-0">
                      𝕏
                    </span>
                    <span>{isEn ? 'Share on X' : 'Podeli na X / Twitter'}</span>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent((isEn ? `Check out this handcrafted piece "${displayName}" on Savremeni Koreni: ` : `Pogledajte ovaj unikatni ručni rad "${product.name}" iz radionice Savremeni Koreni: `) + `https://savremenikoreni.com/katalog?product=${product.id}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#241D19] hover:bg-[#FAF7F2] transition-colors"
                    onClick={() => setShowShareMenu(false)}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                      W
                    </span>
                    <span>{isEn ? 'Send on WhatsApp' : 'Pošalji na WhatsApp'}</span>
                  </a>

                  {/* Copy Link */}
                  <button
                    onClick={async () => {
                      setShowShareMenu(false);
                      await handleShareProduct();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#241D19] hover:bg-[#FAF7F2] transition-colors text-left border-t border-[#E8E0D5]/40 mt-1 cursor-pointer font-medium"
                  >
                    {copiedShare ? (
                      <>
                        <Check className="w-5 h-5 p-1 rounded-full bg-emerald-50 text-emerald-700" />
                        <span className="text-[#4E6852] font-semibold">{isEn ? 'Copied!' : 'Kopirano!'}</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5 p-1 rounded-full bg-gray-100 text-[#9E3E26]" />
                        <span>{isEn ? 'Copy Direct Link' : 'Kopiraj direktan link'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <CurrencySelector variant="topbar" />

            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 bg-[#9E3E26] hover:bg-[#7F2F1C] text-white rounded-full border-2 border-white shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center group shrink-0 active:scale-95 z-50"
              aria-label={isEn ? 'Close modal' : 'Zatvori prozor'}
              title={isEn ? 'Close (ESC)' : 'Zatvori (ESC)'}
            >
              <X className="w-5 h-5 stroke-[2.5] transition-transform group-hover:scale-110" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
            {/* Image Column */}
            <div className="md:col-span-6 flex flex-col">
              {/* Action Buttons Container (Above Image) */}
              <div className="flex justify-between items-center mb-2.5">
                {/* Zoom / Lens Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleZoom}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer border shadow-xs ${
                      zoomScale > 1
                        ? 'bg-[#9E3E26] text-white border-[#9E3E26]'
                        : 'bg-white text-[#241D19] border-[#E8E0D5] hover:bg-[#F4E8E3]'
                    }`}
                    title={isEn ? 'Zoom image' : 'Uvećaj sliku'}
                  >
                    {zoomScale > 1 ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5 text-[#9E3E26]" />}
                    <span className="text-[11px]">
                      {zoomScale > 1 ? (isEn ? 'Reset Zoom' : 'Umanji') : (isEn ? 'Zoom 2x' : 'Uvećaj 2x')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMagnifierEnabled(!magnifierEnabled);
                      if (zoomScale > 1) setZoomScale(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer border shadow-xs ${
                      magnifierEnabled
                        ? 'bg-[#241D19] text-[#E8D0A9] border-[#241D19]'
                        : 'bg-white text-[#241D19] border-[#E8E0D5] hover:bg-[#F4E8E3]'
                    }`}
                    title={isEn ? 'Magnifying lens for embroidery details' : 'Lupa za detalje veza'}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C2872A]" />
                    <span className="text-[11px]">
                      {isEn ? (magnifierEnabled ? 'Lens Active' : 'Embroidery Lens') : (magnifierEnabled ? 'Lupa aktivna' : 'Lupa veza')}
                    </span>
                  </button>
                </div>

                {/* Pinterest Auto-Share Image Pin */}
                <a
                  href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(`https://savremenikoreni.com/katalog?product=${product.id}`)}&media=${encodeURIComponent(toAbsoluteUrl(currentImageUrl))}&description=${encodeURIComponent(isEn ? `Discover authentic Serbian handcrafted "${displayName}" by Savremeni Koreni` : `Pogledajte prelepi unikatni ručni rad "${product.name}" iz radionice Savremeni Koreni. 100% autorska izrada.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E60023] hover:bg-[#b8001c] text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-[#E60023]"
                  title={isEn ? 'Pin this image on Pinterest' : 'Zakači ovu sliku na Pinterest'}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-white text-[#E60023] flex items-center justify-center font-black text-[9px] leading-none shrink-0">
                    P
                  </span>
                  <span className="text-[11px] font-semibold">{isEn ? 'Pin' : 'Zakači'}</span>
                </a>
              </div>

              {/* Main Image Stage */}
              <div 
                ref={imageContainerRef}
                className="relative aspect-square sm:aspect-3/4 w-full rounded-2xl overflow-hidden border border-[#E8E0D5] bg-[#FAF7F2] shadow-md group flex items-center justify-center cursor-pointer select-none"
                onMouseEnter={() => setShowMagnifier(true)}
                onMouseLeave={() => {
                  setShowMagnifier(false);
                  setIsPanning(false);
                }}
                onMouseMove={handleMouseMove}
                onDoubleClick={toggleZoom}
                onTouchStart={(e) => {
                  setTouchEnd(null);
                  if (e.targetTouches[0]) {
                    setTouchStart(e.targetTouches[0].clientX);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.targetTouches[0]) {
                    setTouchEnd(e.targetTouches[0].clientX);
                  }
                }}
                onTouchEnd={() => {
                  if (!touchStart || !touchEnd || zoomScale > 1) return;
                  const distance = touchStart - touchEnd;
                  if (allImages.length > 1) {
                    if (distance > 45) {
                      setActiveImageIdx((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                    } else if (distance < -45) {
                      setActiveImageIdx((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                    }
                  }
                }}
              >
                {/* Blurred backdrop for a premium look and to cover empty space */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  <img
                    src={currentImageUrl}
                    alt=""
                    className="w-full h-full object-cover blur-2xl opacity-40 scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-white/20"></div>
                </div>

                {/* Floating Craftsman Magnifying Glass Lens */}
                {showMagnifier && magnifierEnabled && zoomScale <= 1 && (
                  <div
                    className="pointer-events-none absolute z-30 rounded-full border-2 border-[#C2872A] shadow-2xl overflow-hidden bg-white hidden sm:block transition-opacity duration-150"
                    style={{
                      width: '180px',
                      height: '180px',
                      left: `${magnifierPos.x - 90}px`,
                      top: `${magnifierPos.y - 90}px`,
                      backgroundImage: `url(${currentImageUrl})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '360% 360%',
                      backgroundPosition: `${magnifierPos.relX * 100}% ${magnifierPos.relY * 100}%`,
                      boxShadow: '0 12px 30px rgba(0,0,0,0.35), inset 0 0 15px rgba(194,135,42,0.35)',
                    }}
                  >
                    {/* Metallic rim reflection & glare */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E3E26] bg-[#FAF7F2]/90 border border-[#C2872A]/40 px-2 py-0.5 rounded-full shadow-xs">
                        {isEn ? 'Craft Detail 3.5x' : 'Detalj Veza 3.5x'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Primary Photo Display */}
                <div 
                  className="relative z-10 w-full h-full flex items-center justify-center p-3 transition-transform duration-300"
                  style={{
                    transform: `scale(${zoomScale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    cursor: zoomScale > 1 ? 'zoom-out' : magnifierEnabled ? 'crosshair' : 'zoom-in',
                  }}
                  onClick={() => {
                    if (zoomScale > 1) {
                      setZoomScale(1);
                      setPanOffset({ x: 0, y: 0 });
                    }
                  }}
                >
                  <img
                    src={currentImageUrl}
                    alt={getProductImageAlt(product, isEn)}
                    title={getProductImageTitle(product, isEn)}
                    className="max-w-full max-h-full object-contain object-center drop-shadow-md rounded-lg transition-all"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('etno_torbica_vez')) {
                        target.src = '/images/etno_torbica_vez_1789021849429.jpg';
                      }
                    }}
                  />
                </div>
                
                {/* Navigation arrows */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
                      }}
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-[#241D19] shadow-md backdrop-blur-xs transition-all z-20 cursor-pointer"
                      aria-label={isEn ? 'Previous image' : 'Prethodna slika'}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white text-[#241D19] shadow-md backdrop-blur-xs transition-all z-20 cursor-pointer"
                      aria-label={isEn ? 'Next image' : 'Sledeća slika'}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              
              {/* Thumbnails list */}
              {allImages.length > 1 && (
                <div className={`mt-3.5 grid gap-2.5 ${allImages.length === 2 ? 'grid-cols-2' : allImages.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {allImages.map((img, idx) => (
                    <button
                      key={img + idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        safeActiveIdx === idx ? 'border-[#9E3E26] shadow-md opacity-100 scale-102' : 'border-[#E8E0D5] opacity-70 hover:opacity-100 hover:shadow'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`${displayName} - ${isEn ? 'Handcraft detail view' : 'Detalj ručnog rada'} ${idx + 1}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.includes('etno_torbica_vez')) {
                            target.src = '/images/etno_torbica_vez_1789021849429.jpg';
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 p-3.5 bg-white rounded-xl border border-[#E8E0D5] text-xs space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-[#241D19]/75">
                  <span>{isEn ? 'Workshop:' : 'Radionica:'}</span>
                  <span className="font-semibold text-[#241D19]">Savremeni Koreni, Jošanica</span>
                </div>
                <div className="flex items-center justify-between text-[#241D19]/75">
                  <span>{isEn ? 'Artisan:' : 'Autor:'}</span>
                  <span className="font-semibold text-[#9E3E26]">{companyDetails.owner}</span>
                </div>
                {product.dimensions && (
                  <div className="flex items-center justify-between text-[#241D19]/75">
                    <span>{isEn ? 'Dimensions:' : 'Dimenzije:'}</span>
                    <span className="font-semibold text-[#241D19]">{product.dimensions}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info Column */}
            <div className="md:col-span-6 space-y-5">
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#241D19] leading-tight">
                  {displayName}
                </h3>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  <span className="font-serif text-3xl font-bold text-[#9E3E26]">
                    {currency === 'USD' || currency === 'EUR' ? priceInfo.symbol : ''}
                    {priceInfo.amount.toLocaleString(isEn ? 'en-US' : 'sr-RS')}
                    {currency !== 'USD' && currency !== 'EUR' ? ` ${priceInfo.symbol}` : ''}
                  </span>
                  {priceInfo.isConverted ? (
                    <span className="text-xs font-bold text-[#241D19]/75 bg-[#F4E8E3] px-2.5 py-1 rounded-md border border-[#9E3E26]/20">
                      {priceInfo.rsdFormatted}
                    </span>
                  ) : (
                    product.priceEur && (
                      <span className="text-xs font-bold text-[#C2872A] bg-[#FAF7F2] px-2.5 py-1 rounded-md border border-[#C2872A]/30">
                        (~€{product.priceEur})
                      </span>
                    )
                  )}
                  <span className="text-xs text-[#241D19]/50 ml-1">
                    {isEn ? '(+ shipping)' : '(+ troškovi PostExpress-a)'}
                  </span>
                </div>
              </div>

              {/* Status & Timing */}
              <div className="flex items-center gap-3 text-xs bg-white p-3 rounded-lg border border-[#E8E0D5]">
                <Clock className="w-4 h-4 text-[#C2872A]" />
                <div>
                  <span className="font-semibold text-[#241D19]">
                    {product.inStock 
                      ? (isEn ? 'Available in stock' : 'Proizvod je dostupan na stanju') 
                      : (isEn ? 'Out of stock' : 'Nema na stanju')}
                  </span>
                  <p className="text-[#241D19]/70 text-[11px]">
                    {product.inStock 
                      ? (isEn ? 'Dispatch within 24-48 hours' : 'Slanje u roku od 24-48h') 
                      : (isEn ? 'Crafting time 7 to 15 days' : 'Rok za izradu 7 do 15 dana')}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#241D19]/80">
                  {isEn ? 'Description & Craft Details' : 'Opis i karakteristike'}
                </h4>
                <p className="text-xs sm:text-sm text-[#241D19]/85 leading-relaxed">
                  {displayDesc}
                </p>
              </div>

              {/* Materials and Techniques */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white p-3 rounded-lg border border-[#E8E0D5]">
                  <span className="text-[11px] font-bold text-[#7F2F1C] uppercase block mb-1">
                    {isEn ? 'Techniques' : 'Korišćene tehnike'}
                  </span>
                  <ul className="text-xs space-y-1 text-[#241D19]/80">
                    {displayTechniques.map((tech, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-[#4E6852]" />
                        <span>{tech}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-3 rounded-lg border border-[#E8E0D5]">
                  <span className="text-[11px] font-bold text-[#7F2F1C] uppercase block mb-1">
                    {isEn ? 'Materials' : 'Materijali'}
                  </span>
                  <ul className="text-xs space-y-1 text-[#241D19]/80">
                    {displayMaterials.map((mat, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-[#4E6852]" />
                        <span>{mat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Heritage Value & Care Instructions Guide (SEO & Craftsmanship Info) */}
              <div className="space-y-2 pt-2">
                <details className="group bg-white rounded-xl border border-[#E8E0D5] p-3 open:pb-4 transition-all">
                  <summary className="flex items-center justify-between font-serif font-bold text-xs sm:text-sm text-[#241D19] cursor-pointer select-none list-none">
                    <span className="flex items-center gap-1.5 text-[#9E3E26]">
                      <Droplet className="w-4 h-4 text-[#9E3E26]" />
                      {isEn ? 'Care & Maintenance Guide' : 'Uputstvo za negu i pranje vune'}
                    </span>
                    <span className="text-xs text-[#241D19]/50 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-2.5 pt-2 border-t border-[#E8E0D5]/60 text-[11px] sm:text-xs text-[#241D19]/80 space-y-1.5 leading-relaxed">
                    <p className="flex items-start gap-1.5">
                      <span className="font-bold text-[#9E3E26]">•</span>
                      <span><strong>{isEn ? 'Hand Wash at 30°C:' : 'Ručno pranje na 30°C:'}</strong> {isEn ? 'Gently hand wash in lukewarm water with wool detergent or baby shampoo. Avoid machine spinning.' : 'Isključivo ručno pranje u mlakoj vodi sa blagim deterdžentom za vunu sa lanolinom ili dečijim šamponom.'}</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="font-bold text-[#9E3E26]">•</span>
                      <span><strong>{isEn ? 'Flat Horizontal Drying:' : 'Horizontalno sušenje:'}</strong> {isEn ? 'Dry flat on a dry towel away from radiators and direct sunlight. Do not hang.' : 'Sušiti položeno na suvom peškiru na sobnoj temperaturi. Ne kačiti štipaljkama i ne sušiti na radijatoru.'}</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="font-bold text-[#9E3E26]">•</span>
                      <span><strong>{isEn ? 'Moth Protection:' : 'Zaštita od moljaca:'}</strong> {isEn ? 'Store in breathable cotton bags with dried natural lavender or cedar wood blocks.' : 'Čuvati na suvom mestu u pamučnim vrećicama uz sušeni cvet prirodne lavande ili kedrovo drvo.'}</span>
                    </p>
                  </div>
                </details>

                <details className="group bg-white rounded-xl border border-[#E8E0D5] p-3 open:pb-4 transition-all">
                  <summary className="flex items-center justify-between font-serif font-bold text-xs sm:text-sm text-[#241D19] cursor-pointer select-none list-none">
                    <span className="flex items-center gap-1.5 text-[#4E6852]">
                      <HeartHandshake className="w-4 h-4 text-[#4E6852]" />
                      {isEn ? 'Cultural & Heritage Value' : 'Etnolojska vrednost i autentičnost'}
                    </span>
                    <span className="text-xs text-[#241D19]/50 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-2.5 pt-2 border-t border-[#E8E0D5]/60 text-[11px] sm:text-xs text-[#241D19]/80 space-y-1.5 leading-relaxed">
                    <p>
                      {isEn 
                        ? 'Crafted in Jošanica (Homolje, Eastern Serbia) using ancestral 5-needle knitting, cross-stitch, and satin embroidery. Each handmade piece carries living folklore symbolism, cultural continuity, and heirloom provenance.'
                        : 'Unikat izrađen u selu Jošanica (Homolje) arhaičnim tehnikama pletenja na 5 igala, pokrstice i punog veza. Svaki rad predstavlja nematerijalno kulturno nasleđe i trajnu porodičnu dragocenost.'
                      }
                    </p>
                  </div>
                </details>
              </div>

            </div>
          </div>

          {/* Product Reviews & Star Rating Section */}
          <ProductReviews
            productId={product.id || 'prod_default'}
            productName={displayName}
            productCategory={product.category || 'radionica'}
          />
        </div>

        {/* Modal Footer / Direct Actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#E8E0D5] flex flex-col gap-3 shrink-0">
          {/* Payment Card Security Badge Strip */}
          <div className="flex items-center justify-between text-[10px] text-[#241D19]/70 pb-1 border-b border-[#E8E0D5]/50 flex-wrap gap-1">
            <span className="font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4E6852]"></span>
              {isEn ? 'Accepted Payments:' : 'Načini plaćanja:'}
            </span>
            <div className="flex items-center gap-1 font-bold">
              <span className="px-1.5 py-0.5 rounded-xs bg-[#1A1F71] text-white text-[9px] font-serif">VISA</span>
              <span className="px-1.5 py-0.5 rounded-xs bg-[#EB001B] text-white text-[9px]">MC</span>
              <span className="px-1.5 py-0.5 rounded-xs bg-[#00A4E4] text-white text-[9px]">DINA</span>
              <span className="px-1.5 py-0.5 rounded-xs bg-[#003087] text-white text-[9px] font-serif italic">PayPal</span>
              <span className="px-1.5 py-0.5 rounded-xs bg-[#241D19]/10 text-[#241D19] text-[9px]">Pouzeće</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`tel:${companyDetails.phone}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8E0D5] hover:bg-[#FAF7F2] text-xs font-semibold text-[#241D19] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#9E3E26]" />
                <span className="hidden sm:inline">{isEn ? 'Call' : 'Pozovi'}:</span> {companyDetails.phoneFormatted}
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] border border-[#25D366]/30 text-xs font-semibold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#128C7E]" />
                <span>WhatsApp</span>
              </a>

              <button
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E8E0D5] hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs font-semibold text-[#241D19]/70 transition-colors cursor-pointer"
                title={isEn ? 'Close modal' : 'Zatvori prozor'}
              >
                <X className="w-3.5 h-3.5" />
                <span>{isEn ? 'Close' : 'Zatvori'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onOrderProduct(displayName);
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#9E3E26] hover:bg-[#7F2F1C] text-white text-sm font-semibold shadow-sm transition-all hover:shadow-md cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t.orderPiece}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
