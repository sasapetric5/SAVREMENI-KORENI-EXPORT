import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, KeyRound, LogOut, PackagePlus, FileText, Globe, Sparkles, 
  Upload, Trash2, Edit3, CheckCircle2, ArrowRight, Eye, EyeOff, RefreshCw,
  Plus, AlertCircle, ExternalLink, Image as ImageIcon, Check, DollarSign, X, Mail, BarChart3,
  Database, Camera, Search, ShieldCheck
} from 'lucide-react';
import { Product, BlogPost, ProductCategory, GalleryPhoto } from '../types';
import { blogPostsData } from '../data/blogData';
import { seoLandingPages, SeoLandingPageData } from '../data/seoLandingPagesData';
import { productsData, companyDetails, initialGalleryPhotos } from '../data/companyData';
import { translateTextToEnglish } from '../utils/translator';
import { saveCustomProduct, deleteCustomProduct, getCustomProducts, loadCustomProductsFromStorage } from '../utils/customProductStorage';
import { loadPhotosFromStorage, savePhotosToStorage, deduplicatePhotos } from '../utils/photoStorage';
import { compressImageFile, formatBytes } from '../utils/imageCompressor';
import { BlogAdminPanel } from './BlogAdminPanel';
import { EmailCascadeAdminPanel } from './EmailCascadeAdminPanel';
import { MarketingTrackingAdminPanel } from './MarketingTrackingAdminPanel';
import { DatabaseAdminPanel } from './DatabaseAdminPanel';
import { ProductImageEditModal } from './ProductImageEditModal';
import { LandingPageImageEditModal } from './LandingPageImageEditModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { SeoAeoGeoBlogModal } from './SeoAeoGeoBlogModal';
import { verifyAdminPin, getAdminPin, isUsingDefaultPin } from '../utils/adminAuth';
import { loadAllLandingPages, saveCustomLandingPage, deleteCustomLandingPage } from '../utils/landingPageStorage';
import { generateSeoSlug } from '../utils/slug';

const AUTH_STORAGE_KEY = "koreni_admin_authenticated";

interface AdminPanelProps {
  onClose: () => void;
  products?: Product[];
  onProductCreated?: () => void;
  lang?: 'sr' | 'en';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  onClose, 
  products = productsData, 
  onProductCreated,
  lang = 'sr' 
}) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Tabs: 'products' | 'blogs' | 'landing' | 'emails' | 'tracking' | 'database' | 'gallery'
  const [activeTab, setActiveTab] = useState<'products' | 'blogs' | 'landing' | 'emails' | 'tracking' | 'database' | 'gallery'>('products');

  // Success notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-translate state
  const [isTranslating, setIsTranslating] = useState(false);

  // ---------------- GALLERY FORM STATE ----------------
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [galTitleSr, setGalTitleSr] = useState('');
  const [galTitleEn, setGalTitleEn] = useState('');
  const [galCategory, setGalCategory] = useState('Torbice');
  const [galCaptionSr, setGalCaptionSr] = useState('');
  const [galCaptionEn, setGalCaptionEn] = useState('');
  const [galImageUrl, setGalImageUrl] = useState('');

  // Bulk Gallery Upload State (up to 50 photos from phone)
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState('');
  const [bulkUploadCategory, setBulkUploadCategory] = useState('Torbice');
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const handleBulkGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    if (fileList.length > 50) {
      alert(lang === 'en' ? 'Maximum 50 photos allowed at once.' : 'Maksimalno možete izabrati do 50 slika odjednom.');
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
      return;
    }

    setIsBulkUploading(true);
    const files = Array.from(fileList);
    let completedCount = 0;
    setBulkUploadProgress(lang === 'en' ? `Compressing 0/${files.length}...` : `Kompresujem 0/${files.length}...`);

    const processFile = async (file: File, index: number): Promise<GalleryPhoto | null> => {
      try {
        const compressed = await compressImageFile(file, {
          maxDimension: 1920,
          quality: 0.85,
          preferredFormat: 'image/webp'
        });

        const chosenCategory = bulkUploadCategory || 'Torbice';
        const displayTitle = `Unikatni rad ${index + 1} - ${chosenCategory}`;

        const newPhoto: GalleryPhoto = {
          id: 'custom-' + Date.now() + '-' + index + '-' + Math.random().toString(36).substring(2, 8),
          title: displayTitle,
          category: chosenCategory,
          imageUrl: compressed.dataUrl,
          caption: `Autentični ručni rad u kategoriji ${chosenCategory} - Savremeni Koreni.`,
          isCustomUploaded: true,
          dateAdded: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'sr-RS'),
        };

        completedCount++;
        setBulkUploadProgress(lang === 'en' ? `Compressing ${completedCount}/${files.length}...` : `Kompresujem ${completedCount}/${files.length}...`);

        return newPhoto;
      } catch (err) {
        console.error('Bulk compression error:', err);
        completedCount++;
        return null;
      }
    };

    try {
      const results = await Promise.all(files.map((f, i) => processFile(f, i)));
      const validNewPhotos = results.filter((p): p is GalleryPhoto => p !== null);

      if (validNewPhotos.length > 0) {
        const updated = deduplicatePhotos([...validNewPhotos, ...galleryPhotos]);
        setGalleryPhotos(updated);
        await savePhotosToStorage(updated);
        showToast(lang === 'en' ? `Successfully compressed and added ${validNewPhotos.length} photos into gallery!` : `Uspešno kompresovano i dodato ${validNewPhotos.length} slika u galeriju!`);
      } else {
        alert(lang === 'en' ? 'No valid photos could be processed.' : 'Nijedna slika nije uspešno obrađena.');
      }
    } catch (err) {
      console.error('Bulk upload error:', err);
      alert(lang === 'en' ? 'Error processing photos. Please try again.' : 'Greška pri obradi slika. Pokušajte ponovo.');
    } finally {
      setIsBulkUploading(false);
      setBulkUploadProgress('');
      if (bulkFileInputRef.current) {
        bulkFileInputRef.current.value = '';
      }
    }
  };

  // Auto Image Compression State
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    original: string;
    compressed: string;
    savings: number;
    width: number;
    height: number;
    format: string;
  } | null>(null);

  // ---------------- PRODUCT FORM STATE ----------------
  const [prodNameSr, setProdNameSr] = useState('');
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodCategory, setProdCategory] = useState<ProductCategory>('subare');
  const [prodPriceRsd, setProdPriceRsd] = useState('');
  const [prodPriceEur, setProdPriceEur] = useState('');
  const [prodDescSr, setProdDescSr] = useState('');
  const [prodDescEn, setProdDescEn] = useState('');
  const [prodAltSr, setProdAltSr] = useState('');
  const [prodAltEn, setProdAltEn] = useState('');
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [allCustomProducts, setAllCustomProducts] = useState<Product[]>([]);

  // ---------------- BLOG FORM STATE ----------------
  const [customBlogs, setCustomBlogs] = useState<BlogPost[]>(() => {
    try {
      const saved = localStorage.getItem('koreni_custom_blog_posts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [blogTitleSr, setBlogTitleSr] = useState('');
  const [blogTitleEn, setBlogTitleEn] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [blogExcerptSr, setBlogExcerptSr] = useState('');
  const [blogExcerptEn, setBlogExcerptEn] = useState('');
  const [blogContentSr, setBlogContentSr] = useState('');
  const [blogContentEn, setBlogContentEn] = useState('');
  const [blogImage, setBlogImage] = useState('');

  // ---------------- LANDING PAGE STATE ----------------
  const [customLandingPages, setCustomLandingPages] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('koreni_custom_landing_pages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [landingSlug, setLandingSlug] = useState('');
  const [landingTitleSr, setLandingTitleSr] = useState('');
  const [landingTitleEn, setLandingTitleEn] = useState('');
  const [landingSubtitleSr, setLandingSubtitleSr] = useState('');
  const [landingSubtitleEn, setLandingSubtitleEn] = useState('');
  const [landingBadgeSr, setLandingBadgeSr] = useState('Zanatska Tradicija');
  const [landingBadgeEn, setLandingBadgeEn] = useState('Artisan Heritage');
  const [landingKeyHighlights, setLandingKeyHighlights] = useState<any[]>([]);
  const [landingContentSections, setLandingContentSections] = useState<any[]>([]);
  const [landingFaqs, setLandingFaqs] = useState<any[]>([]);
  const [landingTargetKeywords, setLandingTargetKeywords] = useState<string[]>([]);
  const [landingCategoryFilter, setLandingCategoryFilter] = useState<any>('nosnje');
  const [isSeoMakerOpen, setIsSeoMakerOpen] = useState(false);
  const [seoMakerInitialMode, setSeoMakerInitialMode] = useState<'blog' | 'landing'>('landing');

  // ---------------- PRODUCT IMAGE EDIT STATE ----------------
  const [productForImageEdit, setProductForImageEdit] = useState<Product | null>(null);
  const [isProductImageModalOpen, setIsProductImageModalOpen] = useState(false);
  const [productSearchFilter, setProductSearchFilter] = useState('');
  const [liveProducts, setLiveProducts] = useState<Product[]>(products);

  // ---------------- LANDING PAGE IMAGE EDIT STATE ----------------
  const [allLandingPagesMap, setAllLandingPagesMap] = useState<Record<string, SeoLandingPageData>>(() => loadAllLandingPages());
  const [landingForImageEdit, setLandingForImageEdit] = useState<SeoLandingPageData | null>(null);
  const [isLandingImageModalOpen, setIsLandingImageModalOpen] = useState(false);
  const [landingHeroImage, setLandingHeroImage] = useState('');
  const [landingSecondaryImage, setLandingSecondaryImage] = useState('');
  const [isCompressingLandingHero, setIsCompressingLandingHero] = useState(false);
  const [isCompressingLandingSec, setIsCompressingLandingSec] = useState(false);
  const landingHeroFileInputRef = useRef<HTMLInputElement>(null);
  const landingSecFileInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const blogFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Sync live products
  const refreshLiveProducts = async () => {
    try {
      const custom = await loadCustomProductsFromStorage();
      const customMap = new Map(custom.map(p => [p.id, p]));
      const base = products.length > 0 ? products : productsData;
      const merged = base.map(p => customMap.get(p.id) || p);
      const existingIds = new Set(base.map(p => p.id));
      const newCustom = custom.filter(p => !existingIds.has(p.id));
      setLiveProducts([...newCustom, ...merged]);
    } catch (err) {
      console.warn("Greška pri osvežavanju proizvoda:", err);
    }
  };

  const refreshLandingPages = () => {
    setAllLandingPagesMap(loadAllLandingPages());
  };

  useEffect(() => {
    refreshLiveProducts();
    const handleCustomUpdate = () => {
      refreshLiveProducts();
    };
    window.addEventListener('custom-products-updated', handleCustomUpdate);
    return () => window.removeEventListener('custom-products-updated', handleCustomUpdate);
  }, [products]);

  useEffect(() => {
    refreshLandingPages();
    const handleLandingUpdate = () => {
      refreshLandingPages();
    };
    window.addEventListener('landing-pages-updated', handleLandingUpdate);
    return () => window.removeEventListener('landing-pages-updated', handleLandingUpdate);
  }, []);

  // Load custom data
  const loadData = async () => {
    try {
      const p = await getCustomProducts();
      setAllCustomProducts(p);
      const photos = await loadPhotosFromStorage();
      setGalleryPhotos(photos && photos.length > 0 ? photos : initialGalleryPhotos);
    } catch (e) {
      console.error(e);
      setGalleryPhotos(initialGalleryPhotos);
    }
  };

  const handleAddGalleryPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galTitleSr.trim() || !galImageUrl.trim()) {
      showToast("Molimo unesite naziv slike i sliku (URL ili otpremanje).");
      return;
    }

    let translatedTitle = galTitleEn.trim();
    let translatedCaption = galCaptionEn.trim();

    if (!translatedTitle) {
      try {
        translatedTitle = await translateTextToEnglish(galTitleSr);
      } catch {
        translatedTitle = galTitleSr;
      }
    }

    if (!translatedCaption && galCaptionSr.trim()) {
      try {
        translatedCaption = await translateTextToEnglish(galCaptionSr);
      } catch {
        translatedCaption = galCaptionSr;
      }
    }

    const newPhoto: GalleryPhoto = {
      id: `custom_gal_${Date.now()}`,
      title: galTitleSr.trim(),
      titleEn: translatedTitle || galTitleSr.trim(),
      category: galCategory,
      imageUrl: galImageUrl.trim(),
      caption: galCaptionSr.trim(),
      captionEn: translatedCaption || galCaptionSr.trim(),
      isCustomUploaded: true,
      dateAdded: new Date().toISOString()
    };

    const updated = [newPhoto, ...galleryPhotos];
    setGalleryPhotos(updated);
    await savePhotosToStorage(updated);

    setGalTitleSr('');
    setGalTitleEn('');
    setGalCaptionSr('');
    setGalCaptionEn('');
    setGalImageUrl('');
    showToast("Uspešno dodata nova slika u galeriju!");
  };

  const handleDeleteGalleryPhoto = async (id: string) => {
    if (!window.confirm("Da li ste sigurni da želite da obrišete ovu sliku iz galerije?")) return;
    const updated = galleryPhotos.filter(p => p.id !== id);
    setGalleryPhotos(updated);
    await savePhotosToStorage(updated);
    showToast("Slika je obrisana iz galerije.");
  };

  const handleDeduplicateGallery = async () => {
    const beforeCount = galleryPhotos.length;
    const deduped = deduplicatePhotos(galleryPhotos);
    setGalleryPhotos(deduped);
    await savePhotosToStorage(deduped);
    const removed = beforeCount - deduped.length;
    if (removed > 0) {
      showToast(`✨ Uklonjeno ${removed} duplikata! Galerija sada ima ${deduped.length} jedinstvenih slika.`);
    } else {
      showToast(`Sve slike su već jedinstvene (${deduped.length} slika). Nema duplikata!`);
    }
  };

  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      // Visoko-efikasna kompresija u WebP sa bicubic smoothing-om i max 1920px
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });

      setGalImageUrl(res.dataUrl);
      setCompressionInfo({
        original: formatBytes(res.originalSize),
        compressed: formatBytes(res.compressedSize),
        savings: res.savingsPercent,
        width: res.width,
        height: res.height,
        format: res.format.replace('image/', '').toUpperCase()
      });

      showToast(`⚡ Automatski kompresovano: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (-${res.savingsPercent}%)`);
    } catch (err) {
      console.warn("Automatska kompresija nije uspela, fallback čitanje:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        if (res) setGalImageUrl(res);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pinInput)) {
      setIsAuthenticated(true);
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      setAuthError(false);
      showToast("Uspešna prijava! Dobrodošli u Admin Panel.");
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setPinInput('');
  };

  // ---------------- IMAGE COMPRESSION & UPLOAD FOR PRODUCTS ----------------
  const handleImageFile = async (file: File, callback: (base64Url: string) => void) => {
    setIsCompressing(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });

      setCompressionInfo({
        original: formatBytes(res.originalSize),
        compressed: formatBytes(res.compressedSize),
        savings: res.savingsPercent,
        width: res.width,
        height: res.height,
        format: res.format.replace('image/', '').toUpperCase()
      });

      showToast(`⚡ Optimizovano: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (-${res.savingsPercent}%)`);
      callback(res.dataUrl);
    } catch (err) {
      console.warn("Fallback kompresije proizvoda:", err);
      const reader = new FileReader();
      reader.onload = (e) => {
        callback(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  // ---------------- AUTO TRANSLATE HELPERS ----------------
  const handleTranslateProduct = async () => {
    if (!prodNameSr && !prodDescSr) {
      alert("Prvo unesite naziv ili opis na srpskom jeziku.");
      return;
    }
    setIsTranslating(true);
    try {
      if (prodNameSr && !prodNameEn) {
        const trName = await translateTextToEnglish(prodNameSr);
        setProdNameEn(trName);
        if (!prodAltEn) setProdAltEn(`Handcrafted ${trName} - Serbian Heritage`);
      }
      if (prodDescSr && !prodDescEn) {
        const trDesc = await translateTextToEnglish(prodDescSr);
        setProdDescEn(trDesc);
      }
      if (prodNameSr && !prodAltSr) {
        setProdAltSr(`${prodNameSr} ručni rad tradicionalna izrada Srbija`);
      }
      showToast("✨ Prevod uspešno generisan!");
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateBlog = async () => {
    if (!blogTitleSr && !blogExcerptSr) {
      alert("Prvo unesite naslov ili kratak opis na srpskom jeziku.");
      return;
    }
    setIsTranslating(true);
    try {
      if (blogTitleSr && !blogTitleEn) {
        const trTitle = await translateTextToEnglish(blogTitleSr);
        setBlogTitleEn(trTitle);
      }
      if (blogExcerptSr && !blogExcerptEn) {
        const trExcerpt = await translateTextToEnglish(blogExcerptSr);
        setBlogExcerptEn(trExcerpt);
      }
      if (blogContentSr && !blogContentEn) {
        const trContent = await translateTextToEnglish(blogContentSr);
        setBlogContentEn(trContent);
      }
      showToast("✨ Prevod bloga generisan!");
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateLanding = async () => {
    if (!landingTitleSr && !landingSubtitleSr) {
      alert("Prvo unesite naslov na srpskom.");
      return;
    }
    setIsTranslating(true);
    try {
      if (landingTitleSr && !landingTitleEn) {
        const trTitle = await translateTextToEnglish(landingTitleSr);
        setLandingTitleEn(trTitle);
      }
      if (landingSubtitleSr && !landingSubtitleEn) {
        const trSub = await translateTextToEnglish(landingSubtitleSr);
        setLandingSubtitleEn(trSub);
      }
      showToast("✨ Prevod stranice generisan!");
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  // ---------------- SAVE PRODUCT ----------------
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNameSr.trim() || prodImages.length === 0) {
      alert("Molimo unesite naziv na srpskom i postavite bar jednu sliku proizvoda.");
      return;
    }

    const priceRsdNum = parseInt(prodPriceRsd.replace(/\D/g, ''), 10) || 4500;
    const priceEurNum = parseInt(prodPriceEur.replace(/\D/g, ''), 10) || Math.round(priceRsdNum / 117);

    const finalAltSr = prodAltSr.trim() || `${prodNameSr.trim()} - Ručni rad Savremeni Koreni`;
    const finalAltEn = prodAltEn.trim() || `${prodNameEn.trim() || prodNameSr.trim()} - Handcrafted Serbian Heritage`;

    const newProd: Product = {
      id: `custom-${Date.now()}`,
      name: prodNameSr.trim(),
      nameEn: prodNameEn.trim() || undefined,
      category: prodCategory,
      priceRsd: priceRsdNum,
      priceEur: priceEurNum,
      image: prodImages[0],
      images: prodImages.length > 1 ? prodImages.slice(1, 4) : [],
      alt: finalAltSr,
      altEn: finalAltEn,
      description: prodDescSr.trim() || 'Ručno rađeni unikatni etno artikal vrhunskog kvaliteta.',
      descriptionEn: prodDescEn.trim() || undefined,
      craftTechniques: ['Ručni rad'],
      materials: ['Prirodni materijali'],
      inStock: true,
      leadTimeDays: 3
    };

    try {
      await saveCustomProduct(newProd);
      await loadData();
      if (onProductCreated) onProductCreated();
      showToast(`Proizvod "${newProd.name}" je uspešno sačuvan i vidljiv na sajtu!`);
      // Reset
      setProdNameSr('');
      setProdNameEn('');
      setProdPriceRsd('');
      setProdPriceEur('');
      setProdDescSr('');
      setProdDescEn('');
      setProdAltSr('');
      setProdAltEn('');
      setProdImages([]);
    } catch (err) {
      console.error(err);
      alert("Greška prilikom čuvanja proizvoda.");
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (confirm("Da li ste sigurni da želite da obrišete ovaj proizvod?")) {
      await deleteCustomProduct(prodId);
      await loadData();
      if (onProductCreated) onProductCreated();
      showToast("Proizvod je uklonjen.");
    }
  };

  // ---------------- LANDING IMAGE COMPRESSION HANDLERS ----------------
  const handleLandingHeroFile = async (file: File) => {
    setIsCompressingLandingHero(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });
      setLandingHeroImage(res.dataUrl);
      showToast(`⚡ Glavna hero slika kompresovana u WebP (-${res.savingsPercent}%)`);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => setLandingHeroImage(e.target?.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingLandingHero(false);
    }
  };

  const handleLandingSecondaryFile = async (file: File) => {
    setIsCompressingLandingSec(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });
      setLandingSecondaryImage(res.dataUrl);
      showToast(`⚡ Druga slika kompresovana u WebP (-${res.savingsPercent}%)`);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => setLandingSecondaryImage(e.target?.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingLandingSec(false);
    }
  };

  // ---------------- APPLY GENERATED LANDING PAGE ----------------
  const handleApplyGeneratedLandingPage = (res: SeoLandingPageData) => {
    setLandingSlug(res.slug);
    setLandingTitleSr(res.titleSr);
    setLandingTitleEn(res.titleEn);
    setLandingSubtitleSr(res.subtitleSr);
    setLandingSubtitleEn(res.subtitleEn);
    setLandingBadgeSr(res.badgeSr || 'Zanatska Tradicija');
    setLandingBadgeEn(res.badgeEn || 'Artisan Heritage');
    if (res.heroImage) setLandingHeroImage(res.heroImage);
    if (res.secondaryImage) setLandingSecondaryImage(res.secondaryImage);
    setLandingKeyHighlights(res.keyHighlights || []);
    setLandingContentSections(res.contentSections || []);
    setLandingFaqs(res.faqs || []);
    setLandingTargetKeywords(res.targetKeywords || []);
    if (res.productCategoryFilter) setLandingCategoryFilter(res.productCategoryFilter);

    // Automatski sačuvaj celu bogatu landing stranicu
    saveCustomLandingPage(res);
    refreshLandingPages();
    showToast(`✨ Ciljana Landing Stranica "/${res.slug}" je uspešno sačuvana sa H1, prednostima, sekcijama i FAQ!`);
  };

  // ---------------- SAVE LANDING PAGE ----------------
  const handleSaveLandingPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!landingTitleSr.trim() || !landingSlug.trim()) {
      alert("Molimo unesite naslov i URL slug.");
      return;
    }

    const cleanSlug = generateSeoSlug(landingSlug.trim() || landingTitleSr.trim());

    const newPage: SeoLandingPageData = {
      slug: cleanSlug,
      path: `/${cleanSlug}`,
      titleSr: landingTitleSr.trim(),
      titleEn: landingTitleEn.trim() || landingTitleSr.trim(),
      subtitleSr: landingSubtitleSr.trim() || 'Tradicija i zanatska izvornost',
      subtitleEn: landingSubtitleEn.trim() || 'Artisan heritage and handmade craft',
      metaTitleSr: `${landingTitleSr} | Savremeni Koreni`,
      metaTitleEn: `${landingTitleEn || landingTitleSr} | Contemporary Roots`,
      metaDescriptionSr: landingSubtitleSr || landingTitleSr,
      metaDescriptionEn: landingSubtitleEn || landingTitleEn || landingTitleSr,
      badgeSr: landingBadgeSr || 'Zanatska Tradicija',
      badgeEn: landingBadgeEn || 'Artisan Heritage',
      heroImage: landingHeroImage || '/images/savremeni_hero_banner_1789021835867.jpg',
      secondaryImage: landingSecondaryImage || '/images/homoljska_narodna_nosnja_1789032467664.jpg',
      targetKeywords: landingTargetKeywords.length > 0 ? landingTargetKeywords : [cleanSlug.replace(/-/g, ' ')],
      productCategoryFilter: landingCategoryFilter,
      targetProductIds: [],
      keyHighlights: landingKeyHighlights,
      contentSections: landingContentSections,
      faqs: landingFaqs,
      relatedBlogSlugs: []
    };

    saveCustomLandingPage(newPage);
    refreshLandingPages();
    showToast(`Landing stranica "/${cleanSlug}" je sačuvana sa slikama!`);

    setLandingSlug('');
    setLandingTitleSr('');
    setLandingTitleEn('');
    setLandingSubtitleSr('');
    setLandingSubtitleEn('');
    setLandingHeroImage('');
    setLandingSecondaryImage('');
    setLandingKeyHighlights([]);
    setLandingContentSections([]);
    setLandingFaqs([]);
  };

  // ---------------- LOGIN SCREEN ----------------
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-[#1A1512] border border-[#C2872A]/40 rounded-2xl max-w-md w-full p-8 text-[#FAF7F2] shadow-2xl relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-white transition-colors p-2"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#C2872A]/15 border border-[#C2872A]/40 flex items-center justify-center mx-auto mb-4 text-[#E8D0A9] shadow-[0_0_20px_rgba(194,135,42,0.2)]">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif tracking-wide text-[#E8D0A9]">Administratorski Panel</h2>
            <p className="text-xs text-stone-400 mt-1">Savremeni Koreni • Pristup za vlasnika (Tanja Petrić)</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#E8D0A9]/90 mb-2 font-medium">
                Unesite Administratorski PIN / Lozinku
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-[#C2872A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type={showLoginPassword ? "text" : "password"}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (authError) setAuthError(false);
                  }}
                  placeholder="••••••••"
                  autoFocus
                  className={`w-full bg-[#121212] border ${authError ? 'border-red-500 focus:ring-red-500' : 'border-stone-700 focus:border-[#C2872A] focus:ring-[#C2872A]'} rounded-xl pl-11 pr-11 py-3 text-white placeholder-stone-600 focus:outline-none focus:ring-1 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 cursor-pointer"
                  title={showLoginPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {authError && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Netačna lozinka. Pokušajte ponovo.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#9E3E26] to-[#C2872A] hover:opacity-90 text-white font-medium py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer font-serif tracking-wide"
            >
              <span>Otključaj Panel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-stone-800 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#C2872A]" />
            <span>Zaštićeni pristup za administratora ateljea Savremeni Koreni</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- AUTHENTICATED ADMIN DASHBOARD ----------------
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md text-[#FAF7F2] p-3 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      <div className="max-w-6xl mx-auto bg-[#181310] border border-[#C2872A]/30 rounded-2xl shadow-2xl overflow-hidden min-h-[90vh] flex flex-col">
        
        {/* Toast poruka */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 bg-[#C2872A] text-stone-950 font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Gornji Header */}
        <div className="bg-[#241D19] border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C2872A]/20 border border-[#C2872A]/40 flex items-center justify-center text-[#E8D0A9]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-serif text-[#E8D0A9]">Savremeni Koreni • Upravljanje Sajtom</h1>
              <p className="text-xs text-stone-400">Prijavljeni ste kao Tanja Petrić (Administrator)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              className="px-3.5 py-2 text-xs font-medium text-[#E8D0A9] hover:text-white bg-[#C2872A]/15 hover:bg-[#C2872A]/30 border border-[#C2872A]/40 hover:border-[#C2872A] rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Promenite administratorsku lozinku"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#C2872A]" />
              <span>Promeni Lozinku</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 text-xs font-medium text-stone-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Odjavi se</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-950 bg-[#E8D0A9] hover:bg-[#FAF7F2] rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Zatvori & Pogledaj Sajt</span>
            </button>
          </div>
        </div>

        {/* Tabovi navigacije */}
        <div className="bg-[#1C1613] border-b border-white/10 px-6 flex space-x-1 sm:space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'products'
                ? 'border-[#C2872A] text-[#E8D0A9]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <PackagePlus className="w-4 h-4" />
            <span>Proizvodi & Fotografije ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('blogs')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'blogs'
                ? 'border-[#C2872A] text-[#E8D0A9]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>SEO Blog Članci ({blogPostsData.length + customBlogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('landing')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'landing'
                ? 'border-[#C2872A] text-[#E8D0A9]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Landing Stranice ({Object.keys(seoLandingPages).length + customLandingPages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'gallery'
                ? 'border-[#C2872A] text-[#E8D0A9]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-[#C2872A]" />
            <span>Galerija Slika ({galleryPhotos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('emails')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'emails'
                ? 'border-[#C2872A] text-[#E8D0A9]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Mail className="w-4 h-4 text-[#C2872A]" />
            <span>E-mail & Welcome Sekvenca (4 Stuba)</span>
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'tracking'
                ? 'border-[#C2872A] text-[#E8D0A9]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span>Google AdSense & Meta Pixel</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'database'
                ? 'border-[#C2872A] text-[#E8D0A9]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Baza & Rezervna Kopija</span>
          </button>
        </div>


        {/* Glavni sadržaj tabova */}
        <div className="p-6 flex-1 overflow-y-auto">

          {/* ===================== TAB 1: PROIZVODI ===================== */}
          {activeTab === 'products' && (
            <div className="space-y-8">
              {/* Forma za novi proizvod */}
              <div className="bg-[#241D19] border border-[#C2872A]/30 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-serif text-[#E8D0A9] flex items-center gap-2">
                      <Plus className="w-5 h-5 text-[#C2872A]" />
                      Dodaj Novi Proizvod / Fotografiju
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Unesite detalje na srpskom, pa kliknite čarobno dugme za automatski engleski prevod!
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleTranslateProduct}
                    disabled={isTranslating}
                    className="px-4 py-2 bg-gradient-to-r from-[#9E3E26] to-[#C2872A] hover:opacity-95 text-white font-medium text-xs rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-4 h-4 ${isTranslating ? 'animate-spin' : ''}`} />
                    <span>{isTranslating ? 'Prevođenje u toku...' : '✨ Prevedi na Engleski jednim klikom'}</span>
                  </button>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-6">
                  {/* Fotografije proizvoda (Do 4 slike) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs uppercase tracking-wider text-[#E8D0A9] font-medium">
                        Fotografije Proizvoda (Možete dodati do 4 slike) *
                      </label>
                      <span className="text-[11px] text-stone-400">
                        {prodImages.length} / 4 dodato {prodImages.length > 0 && '(Prva slika je glavna)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[0, 1, 2, 3].map((index) => {
                        const img = prodImages[index];
                        return (
                          <div key={index} className="relative">
                            {img ? (
                              <div className="relative aspect-square rounded-xl overflow-hidden border border-[#C2872A] group bg-black/40 shadow-md">
                                <img src={img} alt={`Slika ${index + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute top-1 left-1 bg-black/70 text-[10px] text-white px-1.5 py-0.5 rounded font-bold">
                                  {index === 0 ? 'Glavna' : `#${index + 1}`}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = prodImages.filter((_, i) => i !== index);
                                    setProdImages(updated);
                                  }}
                                  className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity cursor-pointer"
                                  title="Ukloni sliku"
                                >
                                  <Trash2 className="w-6 h-6" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  if (fileInputRef.current) {
                                    fileInputRef.current.click();
                                  }
                                }}
                                className="aspect-square border-2 border-dashed border-white/20 hover:border-[#C2872A] rounded-xl flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors bg-black/20 group"
                              >
                                <Upload className="w-5 h-5 text-[#C2872A] mb-1 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] text-stone-300 font-medium">+ Dodaj sliku</span>
                                <span className="text-[9px] text-stone-500 mt-0.5">Slika {index + 1}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <input 
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageFile(file, (compressedUrl) => {
                            if (prodImages.length < 4) {
                              setProdImages([...prodImages, compressedUrl]);
                            } else {
                              alert("Maksimalno možete dodati 4 slike po proizvodu.");
                            }
                          });
                        }
                        e.target.value = '';
                      }}
                    />
                    <p className="text-[11px] text-stone-400 mt-2">
                      💡 Savet: Dodavanjem do 4 slike iz različitih uglova znatno povećavate poverenje kupaca i SEO konverziju.
                    </p>
                  </div>

                  {/* Dvojezični Naziv */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium flex items-center gap-1.5">
                        <span className="text-base">🇷🇸</span> Naziv Proizvoda (Srpski) *
                      </label>
                      <input
                        type="text"
                        required
                        value={prodNameSr}
                        onChange={(e) => setProdNameSr(e.target.value)}
                        placeholder="npr. Vunena Šubara Homolje"
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium flex items-center gap-1.5">
                        <span className="text-base">🇬🇧</span> Product Name (English)
                      </label>
                      <input
                        type="text"
                        value={prodNameEn}
                        onChange={(e) => setProdNameEn(e.target.value)}
                        placeholder="npr. Handmade Wool Shepherd Hat"
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Kategorija & Cene */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                        Kategorija
                      </label>
                      <select
                        value={prodCategory}
                        onChange={(e: any) => setProdCategory(e.target.value)}
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#C2872A] focus:outline-none cursor-pointer"
                      >
                        <option value="torbice">👜 UNIKATNE TORBICE</option>
                        <option value="subare">🎩 ŠUBARE</option>
                        <option value="carape">🧦 VEZENE ČARAPE</option>
                        <option value="kosulje">👔 VEZENE KOŠULJE</option>
                        <option value="nakit">📿 HEKLANI NAKIT</option>
                        <option value="dom-pokloni">🎁 UNIKATNI POKLONI</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                        Cena u Dinarima (RSD) *
                      </label>
                      <input
                        type="text"
                        value={prodPriceRsd}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProdPriceRsd(val);
                          const num = parseInt(val.replace(/\D/g, ''), 10);
                          if (num && !prodPriceEur) {
                            setProdPriceEur(Math.round(num / 117).toString());
                          }
                        }}
                        placeholder="npr. 4500"
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                        Cena u Evrima (€ EUR za inostranstvo)
                      </label>
                      <input
                        type="text"
                        value={prodPriceEur}
                        onChange={(e) => setProdPriceEur(e.target.value)}
                        placeholder="npr. 39"
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Dvojezični Opis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium flex items-center gap-1.5">
                        <span className="text-base">🇷🇸</span> Opis Proizvoda (Srpski)
                      </label>
                      <textarea
                        rows={3}
                        value={prodDescSr}
                        onChange={(e) => setProdDescSr(e.target.value)}
                        placeholder="Opišite tradiciju, materijal (100% prirodna vuna, ručni rad)..."
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl p-3 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium flex items-center gap-1.5">
                        <span className="text-base">🇬🇧</span> Description (English)
                      </label>
                      <textarea
                        rows={3}
                        value={prodDescEn}
                        onChange={(e) => setProdDescEn(e.target.value)}
                        placeholder="Handcrafted authentic heritage piece made with 100% natural wool..."
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl p-3 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Google Image Alt oznake sa automatskim SEO generatorom */}
                  <div className="p-4 bg-black/30 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-[#E8D0A9] font-medium flex items-center gap-1.5">
                        ✨ Automatska SEO Optimizacija Slika (Alt Tagovi)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!prodNameSr.trim()) {
                            alert("Prvo unesite naziv proizvoda na srpskom.");
                            return;
                          }
                          const name = prodNameSr.trim();
                          const desc = prodDescSr.trim();
                          const cat = prodCategory;
                          setProdAltSr(`${name} - ${cat} - ${desc ? desc.slice(0, 50) : 'Ručni rad unikat'} | Savremeni Koreni`);
                          setProdAltEn(`${prodNameEn || name} - Handcrafted Heritage Piece (${cat})`);
                          showToast("✨ SEO Alt tagovi uspešno generisani!");
                        }}
                        className="px-3 py-1 bg-[#C2872A]/20 hover:bg-[#C2872A]/40 border border-[#C2872A]/50 text-[#E8D0A9] rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1"
                      >
                        🤖 Generiši Alt Tagove na osnovu opisa
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-stone-400 mb-1 font-medium">
                          Google Alt Tag za sliku (🇷🇸)
                        </label>
                        <input
                          type="text"
                          value={prodAltSr}
                          onChange={(e) => setProdAltSr(e.target.value)}
                          placeholder="Automatski ili ručni alt tag za Google pretragu slika"
                          className="w-full bg-[#121212] border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-[#C2872A] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-400 mb-1 font-medium">
                          Google Alt Tag for Image (🇬🇧)
                        </label>
                        <input
                          type="text"
                          value={prodAltEn}
                          onChange={(e) => setProdAltEn(e.target.value)}
                          placeholder="Automatic or manual alt tag for English search"
                          className="w-full bg-[#121212] border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:border-[#C2872A] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dugme za čuvanje */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-8 py-3 bg-[#C2872A] hover:bg-[#a87422] text-stone-950 font-medium rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer font-serif tracking-wide"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Objavi Proizvod na Sajtu</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista postojećih proizvoda */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-serif text-[#E8D0A9] flex items-center gap-2">
                      <PackagePlus className="w-4 h-4 text-[#C2872A]" />
                      <span>Proizvodi u Prodavnici ({liveProducts.length})</span>
                    </h3>
                    <p className="text-xs text-stone-400 font-sans">
                      Zamenite ili dodajte fotografije bez brisanja opisa na srpskom i engleskom jeziku
                    </p>
                  </div>

                  <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productSearchFilter}
                      onChange={(e) => setProductSearchFilter(e.target.value)}
                      placeholder="Pretraži artikle..."
                      className="w-full bg-[#121212] border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-[#C2872A] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveProducts
                    .filter((p) => 
                      !productSearchFilter.trim() ||
                      p.name.toLowerCase().includes(productSearchFilter.toLowerCase()) ||
                      (p.nameEn && p.nameEn.toLowerCase().includes(productSearchFilter.toLowerCase())) ||
                      p.id.toLowerCase().includes(productSearchFilter.toLowerCase())
                    )
                    .map((p) => {
                      const totalPhotos = 1 + (p.images && p.images.length > 0 ? p.images.length : 0);
                      const isCustom = p.id.startsWith('custom-');

                      return (
                        <div 
                          key={p.id}
                          className="bg-[#241D19] border border-white/10 hover:border-[#C2872A]/60 rounded-xl p-3 flex flex-col justify-between gap-3 group transition-all shadow-md"
                        >
                          <div className="flex gap-3 items-center">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 border border-stone-800">
                              <img 
                                src={p.image} 
                                alt={p.name} 
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 right-0 bg-black/80 text-[10px] text-[#E8D0A9] px-1.5 py-0.5 rounded-tl font-mono font-medium">
                                {totalPhotos} 📷
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-medium text-stone-200 truncate">{p.name}</h4>
                              {p.nameEn && (
                                <p className="text-[11px] text-stone-400 truncate italic">{p.nameEn}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-serif text-[#E8D0A9] font-medium">{p.priceRsd} RSD</span>
                                {p.priceEur && (
                                  <span className="text-[10px] text-stone-400">({p.priceEur} €)</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => {
                                setProductForImageEdit(p);
                                setIsProductImageModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-[#C2872A]/20 hover:bg-[#C2872A] text-[#E8D0A9] hover:text-stone-950 border border-[#C2872A]/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow flex-1 justify-center"
                              title="Zamenite ili dodajte fotografije bez brisanja opisa"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Uredi Slike ({totalPhotos})</span>
                            </button>

                            {isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-stone-500 hover:text-red-400 transition-colors cursor-pointer border border-transparent hover:border-red-400/30 rounded-lg"
                                title="Obriši proizvod"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: BLOG ČLANCI ===================== */}
          {activeTab === 'blogs' && (
            <BlogAdminPanel 
              customBlogs={customBlogs} 
              setCustomBlogs={setCustomBlogs} 
              showToast={showToast} 
              isTranslating={isTranslating} 
              onTranslateBlog={handleTranslateBlog} 
            />
          )}

          {/* ===================== TAB 3: LANDING STRANICE ===================== */}
          {activeTab === 'landing' && (
            <div className="space-y-8">
              <div className="bg-[#241D19] border border-[#C2872A]/30 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-serif text-[#E8D0A9] flex items-center gap-2">
                      <Globe className="w-5 h-5 text-[#C2872A]" />
                      Kreiraj Novu Ciljanu SEO Landing Stranicu
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Napravite novu namensku stranicu za Google pretragu (npr. „Pokloni za Slavu“, „Zlatovez Homolje“).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSeoMakerInitialMode('landing');
                        setIsSeoMakerOpen(true);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-[#C2872A] to-[#9E3E26] hover:opacity-95 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-stone-950" />
                      <span>⚡ SEO + AEO + GEO Generator Landing Stranica</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTranslateLanding}
                      disabled={isTranslating}
                      className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs rounded-xl flex items-center gap-2 transition-all border border-stone-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className={`w-4 h-4 ${isTranslating ? 'animate-spin' : ''}`} />
                      <span>{isTranslating ? 'Prevođenje...' : '✨ Prevedi na Engleski'}</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveLandingPage} className="space-y-6">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                      URL Adresa Stranice (Slug) *
                    </label>
                    <div className="flex items-center">
                      <span className="bg-stone-800 px-3 py-2.5 text-xs text-stone-400 rounded-l-xl border border-r-0 border-stone-700">
                        /
                      </span>
                      <input
                        type="text"
                        required
                        value={landingSlug}
                        onChange={(e) => setLandingSlug(e.target.value)}
                        placeholder="pokloni-za-slavu"
                        className="w-full bg-[#121212] border border-stone-700 rounded-r-xl px-3 py-2.5 text-xs text-[#E8D0A9] focus:border-[#C2872A] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Dvojezični Naslov */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                        🇷🇸 Glavni Naslov (H1) *
                      </label>
                      <input
                        type="text"
                        required
                        value={landingTitleSr}
                        onChange={(e) => setLandingTitleSr(e.target.value)}
                        placeholder="npr. Autentični Slavski Pokloni i Etno Detalji"
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                        🇬🇧 Main Headline (English)
                      </label>
                      <input
                        type="text"
                        value={landingTitleEn}
                        onChange={(e) => setLandingTitleEn(e.target.value)}
                        placeholder="e.g. Authentic Heritage Slava Gifts & Folk Details"
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Podnaslov / Tekst */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                        🇷🇸 Podnaslov & Opis
                      </label>
                      <textarea
                        rows={2}
                        value={landingSubtitleSr}
                        onChange={(e) => setLandingSubtitleSr(e.target.value)}
                        placeholder="Tradicionalni ručni rad, prirodna vuna i vez za posebne svečanosti..."
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl p-3 text-xs text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                        🇬🇧 Subtitle & Description (English)
                      </label>
                      <textarea
                        rows={2}
                        value={landingSubtitleEn}
                        onChange={(e) => setLandingSubtitleEn(e.target.value)}
                        placeholder="Handcrafted authentic pieces made with traditional care..."
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl p-3 text-xs text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Slike za Landing Stranicu sa WebP kompresijom */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-black/30 rounded-xl border border-white/5">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                        Glavna Hero Slika
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => landingHeroFileInputRef.current?.click()}
                          disabled={isCompressingLandingHero}
                          className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-stone-300 text-xs rounded-xl flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4 text-[#C2872A]" />
                          <span>{isCompressingLandingHero ? 'Optimizacija...' : 'Izaberi Hero Sliku'}</span>
                        </button>
                        <input
                          ref={landingHeroFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLandingHeroFile(file);
                          }}
                        />
                        {landingHeroImage && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#C2872A]">
                            <img src={landingHeroImage} alt="Hero preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                        Druga Sekcijska Slika
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => landingSecFileInputRef.current?.click()}
                          disabled={isCompressingLandingSec}
                          className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-stone-300 text-xs rounded-xl flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4 text-[#C2872A]" />
                          <span>{isCompressingLandingSec ? 'Optimizacija...' : 'Izaberi Drugu Sliku'}</span>
                        </button>
                        <input
                          ref={landingSecFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLandingSecondaryFile(file);
                          }}
                        />
                        {landingSecondaryImage && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#C2872A]">
                            <img src={landingSecondaryImage} alt="Sec preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-8 py-3 bg-[#C2872A] hover:bg-[#a87422] text-stone-950 font-medium rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer font-serif tracking-wide"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Sačuvaj Landing Stranicu</span>
                  </button>
                </form>
              </div>

              {/* Lista Landing stranica sa upravljanjem slikama */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-serif text-[#E8D0A9] mb-1">
                    Aktivne SEO Stranice ({Object.keys(allLandingPagesMap).length})
                  </h3>
                  <p className="text-xs text-stone-400">
                    Pregledajte sve stranice i menjajte ili brišite njihove slike po želji
                  </p>
                </div>

                <div className="space-y-3">
                  {Object.values(allLandingPagesMap).map((l: any) => {
                    const isCustom = !seoLandingPages[l.slug];
                    return (
                      <div 
                        key={l.slug}
                        className={`bg-[#241D19] border ${
                          isCustom ? 'border-[#C2872A]/40' : 'border-white/10'
                        } rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-[#C2872A]/70 transition-all`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Image Previews */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-black/40 border border-stone-800 relative" title="Glavna Hero slika">
                              {l.heroImage ? (
                                <img src={l.heroImage} alt="Hero" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-600 text-[10px]">Nema</div>
                              )}
                              <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-[#E8D0A9] px-1 font-mono">Hero</span>
                            </div>

                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-black/40 border border-stone-800 relative" title="Druga sekcijska slika">
                              {l.secondaryImage ? (
                                <img src={l.secondaryImage} alt="Secondary" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-600 text-[10px]">Nema</div>
                              )}
                              <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-stone-300 px-1 font-mono">2. slika</span>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${
                                isCustom 
                                  ? 'text-[#E8D0A9] bg-[#C2872A]/20 border border-[#C2872A]/40'
                                  : 'text-stone-400 bg-white/5 border border-white/10'
                              }`}>
                                {isCustom ? 'Prilagođena Stranica' : 'Sistemska SEO Stranica'}
                              </span>
                              <span className="text-xs text-emerald-400/90 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Google Rangirano
                              </span>
                            </div>

                            <h4 className="text-sm font-medium text-stone-200 mt-1 truncate">{l.titleSr}</h4>
                            {l.titleEn && (
                              <p className="text-xs text-stone-400 truncate italic">{l.titleEn}</p>
                            )}
                            <p className="text-xs text-[#C2872A] font-mono mt-0.5">/{l.slug}</p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setLandingForImageEdit(l);
                              setIsLandingImageModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-[#C2872A]/20 hover:bg-[#C2872A] text-[#E8D0A9] hover:text-stone-950 border border-[#C2872A]/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                            title="Zameni ili obriši slike za ovu landing stranicu"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Upravljaj Slikama</span>
                          </button>

                          {isCustom && (
                            <button
                              type="button"
                              onClick={() => {
                                deleteCustomLandingPage(l.slug);
                                refreshLandingPages();
                                showToast("Stranica obrisana.");
                              }}
                              className="p-2 text-stone-500 hover:text-red-400 transition-colors cursor-pointer"
                              title="Obriši prilagođenu stranicu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB: GALERIJA SLIKA ===================== */}
          {activeTab === 'gallery' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
              <div className="bg-[#1A1512] border border-stone-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C2872A]/20 border border-[#C2872A]/40 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-[#C2872A]" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FAF7F2]">Galerija Slika & Pametna Kompresija</h2>
                      <p className="text-xs sm:text-sm text-stone-400">Automatska kompresija slika visoke rezolucije (WebP 1920px) bez gubitka kvaliteta i oštrine za maksimalnu brzinu Cloudflare Pages sajta.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeduplicateGallery}
                    className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-[#E8D0A9] border border-[#C2872A]/40 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer shrink-0"
                    title="Uklanja sve duple i ponovljene fotografije iz galerije"
                  >
                    <Sparkles className="w-4 h-4 text-[#C2872A]" />
                    <span>Očisti sve duplikate ({galleryPhotos.length})</span>
                  </button>
                </div>

                {/* 📱 GRUPNO DODAVANJE SLIKA IZ TELEFONA (DO 50 KOMADA) */}
                <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-[#241D19] to-[#121212] border border-[#C2872A]/30 shadow-lg">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#C2872A]/20 text-[#E8D0A9] text-xs font-bold border border-[#C2872A]/40">
                        <Upload className="w-4 h-4" />
                        <span>Grupno dodavanje iz telefona (Do 50 slika)</span>
                      </div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                        Brzo otpremanje i automatska kompresija
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-400 max-w-xl">
                        Izaberite kategoriju, izaberite do 50 slika sa vašeg telefona ili računara. Nisu potrebna imena (automatski se generišu), slike se kompresuju u WebP format i direktno ubacuju u galeriju.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                      <select
                        value={bulkUploadCategory}
                        onChange={(e) => setBulkUploadCategory(e.target.value)}
                        className="w-full sm:w-auto bg-[#121212] border border-stone-700 rounded-xl px-4 py-3 text-xs font-semibold text-white focus:border-[#C2872A] focus:outline-none cursor-pointer"
                      >
                        <option value="Torbice">👜 Torbice</option>
                        <option value="Šubare">🎩 Šubare</option>
                        <option value="Čarape">🧦 Čarape</option>
                        <option value="Košulje">👔 Košulje</option>
                        <option value="Nakit">📿 Nakit</option>
                        <option value="Pokloni">🎁 Pokloni</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => bulkFileInputRef.current?.click()}
                        disabled={isBulkUploading}
                        className="w-full sm:w-auto px-6 py-3 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{bulkUploadProgress || (isBulkUploading ? 'Obrada...' : 'Izaberi slike sa telefona (Do 50)')}</span>
                      </button>
                      <input
                        ref={bulkFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleBulkGalleryUpload}
                      />
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAddGalleryPhoto} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-2">Naziv slike (Srpski) *</label>
                      <input
                        type="text"
                        value={galTitleSr}
                        onChange={(e) => setGalTitleSr(e.target.value)}
                        placeholder="npr. Tradicionalni vez na vunenim čarapama"
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#C2872A] focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-2">Naziv slike (Engleski - Opciono)</label>
                      <input
                        type="text"
                        value={galTitleEn}
                        onChange={(e) => setGalTitleEn(e.target.value)}
                        placeholder="npr. Traditional embroidery on woolen socks"
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-2">Kategorija galerije *</label>
                      <select
                        value={galCategory}
                        onChange={(e) => setGalCategory(e.target.value)}
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#C2872A] focus:outline-none cursor-pointer"
                      >
                        <option value="Torbice">👜 UNIKATNE TORBICE</option>
                        <option value="Šubare">🎩 ŠUBARE</option>
                        <option value="Čarape">🧦 VEZENE ČARAPE</option>
                        <option value="Košulje">👔 VEZENE KOŠULJE</option>
                        <option value="Nakit">📿 HEKLANI NAKIT</option>
                        <option value="Pokloni">🎁 UNIKATNI POKLONI</option>
                        <option value="Radionica">🪡 Radionica i Proces</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-2">Izvor slike (Otpremi fajl ili URL) *</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={galImageUrl}
                          onChange={(e) => setGalImageUrl(e.target.value)}
                          placeholder="https://... ili otpremiti sliku"
                          className="flex-1 bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#C2872A] focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => galleryFileInputRef.current?.click()}
                          className="px-4 py-2 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Izaberi & Kompresuj</span>
                        </button>
                        <input
                          ref={galleryFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleGalleryFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {isCompressing && (
                    <div className="flex items-center gap-3 p-3 bg-[#C2872A]/10 border border-[#C2872A]/30 rounded-xl text-xs text-[#E8D0A9] animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#C2872A]" />
                      <span>Visoko-efikasni kompresor obrađuje sliku u ultra-lagan WebP format uz očuvanje oštrine...</span>
                    </div>
                  )}

                  {compressionInfo && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>Kompresija uspešna:</strong> Original {compressionInfo.original} ➔ Optimizovano {compressionInfo.compressed} ({compressionInfo.format} {compressionInfo.width}x{compressionInfo.height}px)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-200 font-bold rounded-md shrink-0">
                        -{compressionInfo.savings}% veličine
                      </span>
                    </div>
                  )}

                  {galImageUrl && (
                    <div className="flex items-center gap-4 p-3 bg-stone-900/80 rounded-xl border border-stone-800">
                      <img src={galImageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-stone-700" />
                      <div className="text-xs text-stone-300">
                        <span className="font-medium text-[#E8D0A9]">Pregled slike učitan i optimizovan.</span> Spreman za postavljanje na sajt bez usporavanja.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-2">Opis / Caption (Srpski)</label>
                      <textarea
                        value={galCaptionSr}
                        onChange={(e) => setGalCaptionSr(e.target.value)}
                        placeholder="Detaljan opis rukotvorine ili priče iza slike..."
                        rows={2}
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2 text-sm text-white focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-2">Opis / Caption (Engleski)</label>
                      <textarea
                        value={galCaptionEn}
                        onChange={(e) => setGalCaptionEn(e.target.value)}
                        placeholder="English caption description..."
                        rows={2}
                        className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2 text-sm text-white focus:border-[#C2872A] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#C2872A] hover:bg-[#d49635] text-stone-950 font-bold rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Dodaj Sliku u Galeriju</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista postojećih slika u galeriji */}
              <div className="bg-[#1A1512] border border-stone-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-serif font-bold text-[#FAF7F2]">
                    Postojeće Slike u Galeriji ({galleryPhotos.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleDeduplicateGallery}
                    className="text-xs text-[#C2872A] hover:text-[#e0a240] flex items-center gap-1.5 cursor-pointer font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ukloni duplikate</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryPhotos.map((photo) => (
                    <div key={photo.id} className="bg-[#121212] border border-stone-800 rounded-xl overflow-hidden flex flex-col">
                      <div className="relative h-40 bg-stone-900">
                        <img src={photo.imageUrl} alt={photo.title} className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 backdrop-blur-sm text-[#E8D0A9] text-[10px] font-medium rounded-md">
                          {photo.category}
                        </span>
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{photo.title}</h4>
                          <p className="text-[11px] text-stone-400 line-clamp-2">{photo.caption || 'Bez opisa'}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-stone-800 flex items-center justify-between">
                          <span className="text-[10px] text-stone-500 font-mono">ID: {photo.id.substring(0, 10)}...</span>
                          <button
                            onClick={() => handleDeleteGalleryPhoto(photo.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Obriši sliku"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 4: EMAIL KASKADA & WELCOME SEKVENCA ===================== */}
          {activeTab === 'emails' && (
            <EmailCascadeAdminPanel showToast={showToast} />
          )}

          {/* ===================== TAB 5: MARKETING, ADSENSE & META PIXEL ===================== */}
          {activeTab === 'tracking' && (
            <MarketingTrackingAdminPanel showToast={showToast} />
          )}

          {/* ===================== TAB 6: BAZA & REZERVNA KOPIJA (SUPABASE) ===================== */}
          {activeTab === 'database' && (
            <DatabaseAdminPanel 
              showToast={showToast} 
              onOpenChangePassword={() => setIsChangePasswordOpen(true)} 
            />
          )}

        </div>

        {/* Modali za napredno uređivanje i zamenu slika */}
        <ProductImageEditModal
          product={productForImageEdit}
          isOpen={isProductImageModalOpen}
          onClose={() => {
            setIsProductImageModalOpen(false);
            setProductForImageEdit(null);
          }}
          onSaved={(updated) => {
            refreshLiveProducts();
            if (onProductCreated) onProductCreated();
            showToast(`Slike za proizvod "${updated.name}" su uspešno ažurirane!`);
          }}
          showToast={showToast}
        />

        <LandingPageImageEditModal
          landingPage={landingForImageEdit}
          isOpen={isLandingImageModalOpen}
          onClose={() => {
            setIsLandingImageModalOpen(false);
            setLandingForImageEdit(null);
          }}
          onSaved={() => {
            refreshLandingPages();
            if (landingForImageEdit) {
              showToast(`Slike za stranicu "${landingForImageEdit.titleSr}" su uspešno ažurirane!`);
            }
          }}
          showToast={showToast}
        />

        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          showToast={showToast}
        />

        {/* Modal za SEO + AEO + GEO Generisanje Blogova i Ciljanih Landing Stranica */}
        <SeoAeoGeoBlogModal
          isOpen={isSeoMakerOpen}
          onClose={() => setIsSeoMakerOpen(false)}
          onApplyLandingPage={handleApplyGeneratedLandingPage}
          showToast={showToast}
          initialMode={seoMakerInitialMode}
        />

      </div>
    </div>
  );
};
