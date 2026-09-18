import React from 'react';
import { Package, Compass, ArrowRight, Sparkles, FolderTree } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SeoCategoryLinksSectionProps {
  onSelectCategory?: (catId: string) => void;
  onNavigateLandingPage?: (slug: string) => void;
}

export const SeoCategoryLinksSection: React.FC<SeoCategoryLinksSectionProps> = ({
  onSelectCategory,
  onNavigateLandingPage
}) => {
  const { isEn } = useLanguage();

  const landingLinks = [
    { slug: 'subare-homolje', labelSr: 'Homoljske & Vlaške Šubare', labelEn: 'Homolje Fur Hats (Šubare)', descSr: '100% prirodno jagnjeće krzno sa Homolja' },
    { slug: 'nosnje-i-vez', labelSr: 'Narodna Nošnja i Ručni Vez', labelEn: 'Folk Costumes & Embroidery', descSr: 'Košulje od srpskog platna i autentični vez' },
    { slug: 'vunene-carape', labelSr: 'Ručno Pletene Vunene Čarape', labelEn: 'Hand-Knitted Wool Socks', descSr: 'Pletenje na 5 igala sa etno motivima' },
    { slug: 'etno-pokloni-za-inostranstvo', labelSr: 'Etno Pokloni za Inostranstvo', labelEn: 'Serbian Ethno Gifts for Abroad', descSr: 'Autentični unikatni darovi za dijasporu' },
    { slug: 'unikatne-makrame-torbe', labelSr: 'Unikatne Makrame Torbe', labelEn: 'Unique Macramé Handbags', descSr: 'Prirodni pamučni kanap i drvene ručke' },
    { slug: 'zlatovez-i-srma', labelSr: 'Tradicionalni Srpski Zlatovez', labelEn: 'Traditional Serbian Goldwork', descSr: 'Zlatna i srebrna srma na plišu' },
    { slug: 'heklani-nakit-i-ogrlice', labelSr: 'Heklani Nakit i Etno Ogrlice', labelEn: 'Crocheted Ethno Jewelry', descSr: 'Perolaki mikro-heklani nakit sa drvetom' },
    { slug: 'opanci-i-folklorna-obuca', labelSr: 'Opanci za Folklor sa Kljunom', labelEn: 'Traditional Leather Opanci', descSr: 'Ručno pleteni opanci od goveđe kože' },
    { slug: 'vezene-kosulje-za-svadbe-i-slave', labelSr: 'Svečane Košulje za Venčanja i Slave', labelEn: 'Ceremonial Wedding & Slava Shirts', descSr: 'Srpsko domaće platno sa ruskom kragnom' },
    { slug: 'homoljski-suveniri-i-josanica', labelSr: 'Autentični Suveniri iz Homolja', labelEn: 'Homolje & Jošanica Souvenirs', descSr: 'Ekološki umetnički radovi iz Jošanice' }
  ];

  const categoryQuickList = [
    { id: 'torbice', nameSr: 'Unikatne Etno Torbice', nameEn: 'Unique Ethno Handbags', count: 34, hash: '#katalog' },
    { id: 'subare', nameSr: 'Homoljske Šubare', nameEn: 'Homolje Fur Hats', count: 5, hash: '#katalog' },
    { id: 'carape', nameSr: 'Vunene Čarape (5 Igala)', nameEn: 'Woven Wool Socks', count: 6, hash: '#katalog' },
    { id: 'kosulje', nameSr: 'Vezene Košulje & Nošnje', nameEn: 'Embroidered Folk Shirts', count: 3, hash: '#katalog' },
    { id: 'nakit', nameSr: 'Heklani Nakit & Ogrlice', nameEn: 'Crocheted Ethno Jewelry', count: 10, hash: '#katalog' },
    { id: 'pokloni', nameSr: 'Unikatni Pokloni & Darovi', nameEn: 'Handcrafted Ethno Gifts', count: 2, hash: '#katalog' }
  ];

  const handleLandingClick = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    if (onNavigateLandingPage) {
      onNavigateLandingPage(slug);
    } else {
      window.location.href = `/${slug}`;
    }
  };

  const handleCategoryClick = (e: React.MouseEvent, catId: string) => {
    e.preventDefault();
    const catalogEl = document.getElementById('katalog');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  return (
    <section id="brzi-linkovi-kategorije" className="py-14 bg-[#F4E8E3]/60 dark:bg-[#1E1713] border-y border-[#E8E0D5] dark:border-[#382C24]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#2A211B] border border-[#9E3E26]/20 shadow-xs text-xs font-bold text-[#9E3E26] dark:text-[#E8D0A9]">
            <FolderTree className="w-4 h-4 text-[#C2872A]" />
            <span>{isEn ? 'Direct Catalog & Heritage Index' : 'Brza navigacija kroz sve kategorije i kolekcije'}</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#241D19] dark:text-[#FAF7F2]">
            {isEn ? 'Explore All Product Categories & Specialized Collections' : 'Istražite sve kategorije proizvoda i tematske celine'}
          </h2>
          <p className="text-xs sm:text-sm text-[#241D19]/75 dark:text-[#FAF7F2]/75 leading-relaxed">
            {isEn
              ? 'Direct links to authentic handcrafted collections from Savremeni Koreni atelier in Jošanica, Homolje.'
              : 'Direktni linkovi ka svim unikatnim rukotvorinama i tematskim vodičima radionice Savremeni Koreni u Jošanici.'}
          </p>
        </div>

        {/* 1. Main Product Categories Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9E3E26] dark:text-[#E8D0A9]">
            <Package className="w-4 h-4 text-[#C2872A]" />
            <span>{isEn ? 'Main Product Categories:' : 'Glavne kategorije rukotvorina:'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categoryQuickList.map((cat) => (
              <a
                key={cat.id}
                href={cat.hash}
                onClick={(e) => handleCategoryClick(e, cat.id)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#261F1A] border border-[#E2D6C5] dark:border-[#3D3027] hover:border-[#9E3E26] dark:hover:border-[#C2872A] shadow-2xs hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#FAF5EF] dark:bg-[#382B22] text-[#9E3E26] dark:text-[#E8D0A9] border border-[#9E3E26]/20 inline-block mb-2">
                    {cat.count} {isEn ? 'items' : 'rada'}
                  </span>
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[#241D19] dark:text-[#FAF7F2] group-hover:text-[#9E3E26] dark:group-hover:text-[#E8D0A9] transition-colors leading-snug">
                    {isEn ? cat.nameEn : cat.nameSr}
                  </h3>
                </div>
                <div className="flex items-center justify-between mt-3 text-[11px] font-semibold text-[#9E3E26] dark:text-[#E8D0A9]">
                  <span>{isEn ? 'View' : 'Pogledaj'}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* 2. Thematic Heritage & SEO Landing Page Guides */}
        <div className="space-y-4 pt-4 border-t border-[#E8E0D5]/80 dark:border-[#382C24]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9E3E26] dark:text-[#E8D0A9]">
            <Compass className="w-4 h-4 text-[#C2872A]" />
            <span>{isEn ? 'Thematic Heritage Guides & Regional Collections:' : 'Tematske celine i kulturni vodiči po merilima tradicije:'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {landingLinks.map((item) => (
              <a
                key={item.slug}
                href={`/${item.slug}`}
                onClick={(e) => handleLandingClick(e, item.slug)}
                className="p-3.5 rounded-xl bg-white/80 dark:bg-[#261F1A]/80 border border-[#E2D6C5] dark:border-[#3D3027] hover:border-[#9E3E26] dark:hover:border-[#C2872A] shadow-2xs hover:shadow-xs transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="font-serif font-bold text-xs text-[#241D19] dark:text-[#FAF7F2] group-hover:text-[#9E3E26] dark:group-hover:text-[#E8D0A9] transition-colors">
                    {isEn ? item.labelEn : item.labelSr}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-[#C2872A] shrink-0" />
                </div>
                <p className="text-[11px] text-[#241D19]/70 dark:text-[#FAF7F2]/70 leading-normal line-clamp-2">
                  {item.descSr}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
