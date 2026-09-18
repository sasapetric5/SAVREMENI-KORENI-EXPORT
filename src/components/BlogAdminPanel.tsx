import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  Upload, 
  RefreshCw, 
  Link as LinkIcon, 
  AlertCircle, 
  Globe, 
  Check, 
  Copy,
  Image as ImageIcon,
  Camera,
  Search,
  SlidersHorizontal
} from 'lucide-react';
import { generateSeoSlug } from '../utils/slug';
import { blogPostsData } from '../data/blogData';
import { BlogPost } from '../types';
import { BlogImageEditModal } from './BlogImageEditModal';
import { SeoAeoGeoBlogModal } from './SeoAeoGeoBlogModal';
import { GeneratedBlogPostResult } from '../utils/seoAeoGeoBlogGenerator';
import { loadAllBlogPosts, deleteCustomBlog } from '../utils/blogStorage';
import { saveCustomLandingPage } from '../utils/landingPageStorage';
import { compressImageFile, formatBytes } from '../utils/imageCompressor';

export interface BlogAdminPanelProps {
  customBlogs: any[];
  setCustomBlogs: (blogs: any[]) => void;
  showToast: (message: string) => void;
  isTranslating?: boolean;
  onTranslateBlog?: () => void;
}

export const BlogAdminPanel: React.FC<BlogAdminPanelProps> = ({
  customBlogs,
  setCustomBlogs,
  showToast,
  isTranslating = false,
  onTranslateBlog
}) => {
  const [blogTitleSr, setBlogTitleSr] = useState('');
  const [blogTitleEn, setBlogTitleEn] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [slugSource, setSlugSource] = useState<'sr' | 'en' | 'manual'>('sr');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  
  const [blogExcerptSr, setBlogExcerptSr] = useState('');
  const [blogExcerptEn, setBlogExcerptEn] = useState('');
  const [blogContentSr, setBlogContentSr] = useState('');
  const [blogContentEn, setBlogContentEn] = useState('');
  const [blogImage, setBlogImage] = useState('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [allPosts, setAllPosts] = useState<BlogPost[]>(() => loadAllBlogPosts());
  const [selectedBlogForImages, setSelectedBlogForImages] = useState<BlogPost | null>(null);
  const [isBlogImageModalOpen, setIsBlogImageModalOpen] = useState(false);
  const [isSeoMakerOpen, setIsSeoMakerOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isCompressingNew, setIsCompressingNew] = useState(false);
  const [compressStats, setCompressStats] = useState<string | null>(null);

  const handleApplyGeneratedArticle = (res: GeneratedBlogPostResult) => {
    setBlogTitleSr(res.titleSr);
    setBlogTitleEn(res.titleEn);
    setBlogSlug(res.slug);
    setBlogExcerptSr(res.excerptSr);
    setBlogExcerptEn(res.excerptEn);
    setBlogContentSr(res.contentSr);
    setBlogContentEn(res.contentEn);
    setIsSlugManuallyEdited(true);
    setSlugSource('sr');
    showToast(`✨ Članak "${res.titleSr}" je uspešno učitan u formu! Pregledajte ga i sačuvajte.`);
  };

  const blogFileInputRef = useRef<HTMLInputElement>(null);

  const refreshAllPosts = () => {
    setAllPosts(loadAllBlogPosts());
  };

  useEffect(() => {
    refreshAllPosts();
    const handler = () => {
      refreshAllPosts();
    };
    window.addEventListener('blog-posts-updated', handler);
    return () => window.removeEventListener('blog-posts-updated', handler);
  }, []);

  // Helper to convert and compress image file to WebP
  const handleImageFile = async (file: File, callback: (base64: string) => void) => {
    setIsCompressingNew(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 1920,
        quality: 0.85,
        preferredFormat: 'image/webp'
      });
      callback(res.dataUrl);
      setCompressStats(`⚡ Slika kompresovana u WebP: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)} (-${res.savingsPercent}%)`);
      showToast(`Slika za blog uspešno optimizovana! (-${res.savingsPercent}%)`);
    } catch (err) {
      console.warn("Kompresija blog slike:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          callback(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingNew(false);
    }
  };

  // Handle Serbian Title change with auto slug generation
  const handleTitleSrChange = (value: string) => {
    setBlogTitleSr(value);
    if (!isSlugManuallyEdited && slugSource === 'sr') {
      const generated = generateSeoSlug(value);
      setBlogSlug(generated);
    }
  };

  // Handle English Title change with auto slug generation
  const handleTitleEnChange = (value: string) => {
    setBlogTitleEn(value);
    if (!isSlugManuallyEdited && slugSource === 'en') {
      const generated = generateSeoSlug(value);
      setBlogSlug(generated);
    }
  };

  // Handle manual Slug edit
  const handleSlugInputChange = (value: string) => {
    setIsSlugManuallyEdited(true);
    setSlugSource('manual');
    // Sanitize in real-time while keeping user typing clean
    setBlogSlug(generateSeoSlug(value));
  };

  // Force recalculate slug from Serbian title
  const handleRegenerateFromSr = () => {
    const generated = generateSeoSlug(blogTitleSr);
    setBlogSlug(generated);
    setSlugSource('sr');
    setIsSlugManuallyEdited(false);
    showToast("SEO Slug je automatski generisan iz srpskog naslova! 🇷🇸");
  };

  // Force recalculate slug from English title
  const handleRegenerateFromEn = () => {
    if (!blogTitleEn.trim()) {
      showToast("Prvo unesite naslov na engleskom jeziku.");
      return;
    }
    const generated = generateSeoSlug(blogTitleEn);
    setBlogSlug(generated);
    setSlugSource('en');
    setIsSlugManuallyEdited(false);
    showToast("SEO Slug is automatically generated from English title! 🇬🇧");
  };

  // Save new blog post
  const handleSaveBlog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitleSr.trim()) {
      showToast("Molimo unesite naslov blog članka.");
      return;
    }

    const cleanSlug = blogSlug.trim() 
      ? generateSeoSlug(blogSlug)
      : generateSeoSlug(blogTitleSr);

    if (!cleanSlug) {
      showToast("Greška pri kreiranju URL slug-a.");
      return;
    }

    const newPost = {
      id: `custom-blog-${Date.now()}`,
      slug: cleanSlug,
      title: blogTitleSr.trim(),
      title_en: blogTitleEn.trim() || undefined,
      excerpt: blogExcerptSr.trim() || blogTitleSr.trim(),
      excerpt_en: blogExcerptEn.trim() || undefined,
      heroImage: blogImage || '/luxury_black_gold_emblem.jpg',
      author: 'Tanja Petrić',
      authorRole: 'Osnivač i majstor ručnog rada, Savremeni Koreni',
      publishDate: new Date().toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' }),
      readingTime: '4 min čitanja',
      wordCount: (blogContentSr || '').split(/\s+/).length || 300,
      category: 'tradicija',
      categoryLabel: 'Ručni Rad & Tradicija',
      metaTitle: `${blogTitleSr} | Savremeni Koreni Blog`,
      metaDescription: blogExcerptSr || blogTitleSr,
      targetKeywords: [blogTitleSr, cleanSlug.replace(/-/g, ' ')],
      contentSections: [
        {
          heading: blogTitleSr,
          paragraphs: [blogContentSr || blogExcerptSr]
        }
      ]
    };

    const updated = [newPost, ...customBlogs];
    setCustomBlogs(updated);
    localStorage.setItem('koreni_custom_blog_posts', JSON.stringify(updated));
    showToast(`Članak "${newPost.title}" je sačuvan sa SEO linkom: /blog/${cleanSlug}`);

    // Reset form
    setBlogTitleSr('');
    setBlogTitleEn('');
    setBlogSlug('');
    setBlogExcerptSr('');
    setBlogExcerptEn('');
    setBlogContentSr('');
    setBlogContentEn('');
    setBlogImage('');
    setIsSlugManuallyEdited(false);
    setSlugSource('sr');
  };

  const handleCopyLink = (slug: string) => {
    const fullUrl = `${window.location.origin}/blog/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    showToast("URL link kopiran u clipboard!");
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Blog Input Card */}
      <div className="bg-[#241D19] border border-[#C2872A]/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-serif text-[#E8D0A9] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C2872A]" />
              Napiši Novi SEO Blog Članak & Generiši URL Slug
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Automatsko kreiranje SEO-optimizovanih URL adresa sa podrškom za srpska slova (š, đ, č, ć, ž / ш, ђ, ч, ћ, ж) i engleski.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSeoMakerOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#C2872A] to-[#9E3E26] hover:opacity-95 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-stone-950" />
              <span>⚡ SEO + AEO + GEO Maker (Ljudski stil)</span>
            </button>

            {onTranslateBlog && (
              <button
                type="button"
                onClick={onTranslateBlog}
                disabled={isTranslating}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs rounded-xl flex items-center gap-2 transition-all border border-stone-700 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${isTranslating ? 'animate-spin' : ''}`} />
                <span>{isTranslating ? 'Prevođenje...' : '✨ Prevedi na Engleski'}</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveBlog} className="space-y-6">
          {/* Naslovi (SR & EN) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>🇷🇸</span> Naslov Članka (Srpski) *
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  {blogTitleSr.length} karaktera
                </span>
              </label>
              <input
                type="text"
                required
                value={blogTitleSr}
                onChange={(e) => handleTitleSrChange(e.target.value)}
                placeholder="npr. 5 Razloga Zašto Izabrati Homoljsku Šubaru Sa Đulom"
                className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>🇬🇧</span> Article Title (English)
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  {blogTitleEn.length} characters
                </span>
              </label>
              <input
                type="text"
                value={blogTitleEn}
                onChange={(e) => handleTitleEnChange(e.target.value)}
                placeholder="e.g. 5 Reasons to Choose Authentic Wool Shepherd Hat"
                className="w-full bg-[#121212] border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
              />
            </div>
          </div>

          {/* SEO Slug Generator Box */}
          <div className="bg-[#181310] border border-[#C2872A]/40 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs uppercase tracking-wider text-[#E8D0A9] font-medium flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#C2872A]" />
                SEO Optimizovani URL Slug (Google Link)
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerateFromSr}
                  className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-[#E8D0A9] text-[11px] rounded-lg border border-stone-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Generiši slug iz srpskog naslova"
                >
                  <RefreshCw className="w-3 h-3 text-[#C2872A]" />
                  <span>Generiši iz SR 🇷🇸</span>
                </button>

                <button
                  type="button"
                  onClick={handleRegenerateFromEn}
                  className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-[#E8D0A9] text-[11px] rounded-lg border border-stone-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Generiši slug iz engleskog naslova"
                >
                  <RefreshCw className="w-3 h-3 text-[#C2872A]" />
                  <span>Generate from EN 🇬🇧</span>
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <span className="bg-stone-900 px-3 py-2.5 text-xs text-stone-400 rounded-l-xl border border-r-0 border-stone-700 font-mono shrink-0">
                https://savremenikoreni.rs/blog/
              </span>
              <input
                type="text"
                value={blogSlug}
                onChange={(e) => handleSlugInputChange(e.target.value)}
                placeholder="npr. 5-razloga-zasto-izabrati-homoljsku-subaru-sa-djulom"
                className="w-full bg-[#121212] border border-stone-700 rounded-r-xl px-3 py-2.5 text-xs text-[#E8D0A9] focus:border-[#C2872A] focus:outline-none font-mono tracking-wide"
              />
            </div>

            {/* Live SEO Slug Status & Character Transliteration Info */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400 pt-1">
              <div className="flex items-center gap-2">
                {blogSlug ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Čist SEO URL ({blogSlug.length} karaktera)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400/80">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Unesite naslov za automatsko kreiranje linka
                  </span>
                )}
                {isSlugManuallyEdited && (
                  <span className="bg-stone-800 px-2 py-0.5 rounded text-[10px] text-stone-300">
                    Ručno izmenjeno
                  </span>
                )}
              </div>

              <div className="text-[10px] text-stone-500 italic">
                Sva slova (Š, Đ, Č, Ć, Ž / Ш, Ђ, Ч, Ћ, Ж) se automatski pretvaraju u s, dj, c, z
              </div>
            </div>
          </div>

          {/* Glavna Slika Upload */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
              Glavna Slika Članka (Upload)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => blogFileInputRef.current?.click()}
                disabled={isCompressingNew}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-stone-300 text-xs rounded-xl flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-[#C2872A]" />
                <span>{isCompressingNew ? 'Optimizacija...' : 'Izaberi Sliku za Blog'}</span>
              </button>

              <input
                ref={blogFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageFile(file, (base64) => setBlogImage(base64));
                  }
                }}
              />

              {blogImage && (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#C2872A] relative group">
                  <img src={blogImage} alt="Blog thumb" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {compressStats && (
              <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{compressStats}</span>
              </p>
            )}
          </div>

          {/* Excerpt / Sažetak (SR & EN) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                🇷🇸 Uvodni Pasus / Sažetak (Srpski)
              </label>
              <textarea
                rows={2}
                value={blogExcerptSr}
                onChange={(e) => setBlogExcerptSr(e.target.value)}
                placeholder="Kratak uvod od 2-3 rečenice o tradiciji i ručnom radu..."
                className="w-full bg-[#121212] border border-stone-700 rounded-xl p-3 text-xs text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                🇬🇧 Short Excerpt (English)
              </label>
              <textarea
                rows={2}
                value={blogExcerptEn}
                onChange={(e) => setBlogExcerptEn(e.target.value)}
                placeholder="Short summary for English readers..."
                className="w-full bg-[#121212] border border-stone-700 rounded-xl p-3 text-xs text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
              />
            </div>
          </div>

          {/* Full Content (SR & EN) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                🇷🇸 Pun Tekst Članka (Srpski)
              </label>
              <textarea
                rows={5}
                value={blogContentSr}
                onChange={(e) => setBlogContentSr(e.target.value)}
                placeholder="Tekst članka o tradiciji, materijalima, savetima za kupce..."
                className="w-full bg-[#121212] border border-stone-700 rounded-xl p-3 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
                🇬🇧 Full Article Content (English)
              </label>
              <textarea
                rows={5}
                value={blogContentEn}
                onChange={(e) => setBlogContentEn(e.target.value)}
                placeholder="English translation of the full story..."
                className="w-full bg-[#121212] border border-stone-700 rounded-xl p-3 text-sm text-white placeholder-stone-600 focus:border-[#C2872A] focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-8 py-3 bg-[#C2872A] hover:bg-[#a87422] text-stone-950 font-medium rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer font-serif tracking-wide"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Objavi Blog Članak sa SEO Linkom</span>
          </button>
        </form>
      </div>

      {/* List of Published Articles */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-serif text-[#E8D0A9]">
              Objavljeni Članci na Sajtu ({allPosts.length})
            </h3>
            <p className="text-xs text-stone-400">
              Upravljajte slikama, naslovnim fotografijama i sekcijama za svaki blog članak
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Pretraži članke..."
              className="w-full bg-[#121212] border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-[#C2872A] focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-3">
          {allPosts
            .filter(b => 
              !searchFilter.trim() || 
              b.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
              (b.titleEn && b.titleEn.toLowerCase().includes(searchFilter.toLowerCase())) ||
              b.slug.toLowerCase().includes(searchFilter.toLowerCase())
            )
            .map((b) => {
              const isCustom = b.id.startsWith('custom-');
              return (
                <div 
                  key={b.id}
                  className={`bg-[#241D19] border ${
                    isCustom ? 'border-[#C2872A]/40' : 'border-white/10'
                  } rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[#C2872A]/60 transition-all`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/50 border border-stone-800 shrink-0 relative">
                      {b.coverImage ? (
                        <img 
                          src={b.coverImage} 
                          alt={b.title} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-600">
                          <ImageIcon className="w-5 h-5" />
                          <span className="text-[9px] mt-0.5">Nema slike</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium ${
                          isCustom 
                            ? 'text-[#E8D0A9] bg-[#C2872A]/20 border border-[#C2872A]/40'
                            : 'text-stone-400 bg-white/5 border border-white/10'
                        }`}>
                          {isCustom ? 'Vaš Članak' : 'SEO Vodič'}
                        </span>
                        <span className="text-[11px] text-stone-400">{b.categoryLabel || 'Blog'}</span>
                      </div>

                      <h4 className="text-sm font-medium text-stone-200 mt-1 truncate">{b.title}</h4>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-[#E8D0A9] font-mono bg-stone-900/80 px-2 py-0.5 rounded border border-stone-800 truncate">
                          /blog/{b.slug}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(b.slug)}
                          className="text-stone-400 hover:text-white transition-colors cursor-pointer p-1"
                          title="Kopiraj pun SEO link"
                        >
                          {copiedSlug === b.slug ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBlogForImages(b);
                        setIsBlogImageModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#C2872A]/20 hover:bg-[#C2872A] text-[#E8D0A9] hover:text-stone-950 border border-[#C2872A]/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                      title="Postavi, zameni ili obriši slike u ovom članku"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upravljaj Slikama</span>
                    </button>

                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          const f = customBlogs.filter(x => x.id !== b.id);
                          setCustomBlogs(f);
                          deleteCustomBlog(b.id);
                          showToast("Članak obrisan.");
                        }}
                        className="p-2 text-stone-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Obriši članak"
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

      {/* Modal za upravljanje slikama u blogu */}
      <BlogImageEditModal
        blog={selectedBlogForImages}
        isOpen={isBlogImageModalOpen}
        onClose={() => {
          setIsBlogImageModalOpen(false);
          setSelectedBlogForImages(null);
        }}
        onSaved={() => {
          refreshAllPosts();
        }}
        showToast={showToast}
      />

      {/* Modal za SEO + AEO + GEO Generisanje Blogova i Ciljanih Landing Stranica */}
      <SeoAeoGeoBlogModal
        isOpen={isSeoMakerOpen}
        onClose={() => setIsSeoMakerOpen(false)}
        onApplyArticle={handleApplyGeneratedArticle}
        onApplyLandingPage={(landingRes) => {
          saveCustomLandingPage(landingRes);
          showToast(`✨ Ciljana Landing Stranica "/${landingRes.slug}" je uspešno sačuvana!`);
        }}
        showToast={showToast}
        initialMode="blog"
      />
    </div>
  );
};
