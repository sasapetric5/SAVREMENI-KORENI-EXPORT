import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, FileText, Cookie, RotateCcw, Building2, 
  Printer, Check, Mail, Phone, MapPin, Search, ArrowRight 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { legalDocumentsData, LegalDocTab, LegalDocument } from '../data/legalDocumentsData';
import { companyDetails } from '../data/companyData';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalDocTab;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, initialTab = 'privacy' }) => {
  const { isEn } = useLanguage();
  const [activeTab, setActiveTab] = useState<LegalDocTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDoc: LegalDocument = legalDocumentsData[activeTab];

  const tabs: { id: LegalDocTab; label: string; labelEn: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'privacy', label: 'Politika Privatnosti', labelEn: 'Privacy Policy', icon: ShieldCheck },
    { id: 'terms', label: 'Uslovi Korišćenja', labelEn: 'Terms of Service', icon: FileText },
    { id: 'cookies', label: 'Politika Kolačića', labelEn: 'Cookie Policy', icon: Cookie },
    { id: 'returns', label: 'Povraćaj & Reklamacije', labelEn: 'Returns & Refunds', icon: RotateCcw },
    { id: 'impresum', label: 'Impresum / APR Podaci', labelEn: 'Impressum / Legal Info', icon: Building2 },
  ];

  const handlePrint = () => {
    window.print();
  };

  const filteredSections = currentDoc.sections.filter(sec => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = isEn ? sec.titleEn.toLowerCase() : sec.title.toLowerCase();
    const body = isEn ? sec.contentEn.join(' ').toLowerCase() : sec.content.join(' ').toLowerCase();
    return title.includes(q) || body.includes(q);
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#FAF7F2] dark:bg-[#1C1612] border border-[#C2872A]/40 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden relative text-[#1C1612] dark:text-[#FAF7F2]">
        
        {/* Header Bar */}
        <div className="bg-[#1A1512] text-[#FAF7F2] p-4 sm:p-5 border-b border-[#C2872A]/30 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C2872A]/20 border border-[#C2872A] flex items-center justify-center text-[#E8D0A9] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Savremeni Koreni</span>
                <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-[#C2872A]/30 text-[#E8D0A9] font-medium border border-[#C2872A]/40">
                  {isEn ? 'Legal & Compliance' : 'Pravna Dokumentacija'}
                </span>
              </h2>
              <p className="text-xs text-[#E8D0A9]/80 font-serif italic">
                {isEn ? 'Official store policies & APR RS registration info' : 'Zvanični uslovi, politika privatnosti i registarski podaci APR RS'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#E8D0A9] hover:text-white transition-colors cursor-pointer text-xs font-medium hidden sm:flex items-center gap-1.5"
              title={isEn ? 'Print this document' : 'Odštampaj dokument'}
            >
              <Printer className="w-4 h-4" />
              <span>{isEn ? 'Print' : 'Štampa'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={isEn ? 'Close' : 'Zatvori'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="bg-[#2A221C] text-white/90 p-2 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C2872A] text-white shadow-md font-bold'
                    : 'hover:bg-white/10 text-white/70 hover:text-white'
                }`}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span>{isEn ? tab.labelEn : tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Top Info Banner for Document */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF1E4] dark:bg-[#251E19] border border-[#C2872A]/30 space-y-2 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#C2872A]/20 pb-2">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#8C5E1A] dark:text-[#E8D0A9]">
                {isEn ? currentDoc.titleEn : currentDoc.title}
              </h3>
              <span className="text-[11px] text-[#8C5E1A]/80 dark:text-[#E8D0A9]/80 font-mono">
                {isEn ? `Last updated: ${currentDoc.lastUpdatedEn}` : `Ažurirano: ${currentDoc.lastUpdated}`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#1C1612]/80 dark:text-[#FAF7F2]/80 leading-relaxed font-light">
              {isEn ? currentDoc.summaryEn : currentDoc.summary}
            </p>
          </div>

          {/* Search Input Filter */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#C2872A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search within document...' : 'Pretražite unutar dokumenta...'}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-[#251E19] border border-[#C2872A]/30 focus:border-[#C2872A] outline-none text-[#1C1612] dark:text-white shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>

          {/* Document Content Sections */}
          <div className="space-y-6">
            {filteredSections.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                {isEn ? 'No matching sections found for search query.' : 'Nema pronalazaka za navedeni pojam pretrage.'}
              </p>
            ) : (
              filteredSections.map((sec, idx) => (
                <div 
                  key={idx} 
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#221A15] border border-black/5 dark:border-white/10 shadow-xs space-y-3"
                >
                  <h4 className="font-serif text-base font-bold text-[#8C5E1A] dark:text-[#E8D0A9] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C2872A]"></span>
                    <span>{isEn ? sec.titleEn : sec.title}</span>
                  </h4>
                  <div className="space-y-2 text-xs sm:text-sm text-[#1C1612]/85 dark:text-[#FAF7F2]/85 leading-relaxed font-light">
                    {(isEn ? sec.contentEn : sec.content).map((paragraph, pIdx) => (
                      <p key={pIdx} className={paragraph.startsWith('•') ? 'pl-4 text-[#8C5E1A] dark:text-[#E8D0A9] font-medium' : ''}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Official Company Verification Box */}
          <div className="mt-8 p-5 rounded-2xl bg-[#1A1512] text-[#FAF7F2] border border-[#C2872A]/40 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <h5 className="font-serif text-sm font-bold text-[#E8D0A9]">
                  {companyDetails.legalName}
                </h5>
                <p className="text-xs text-white/70">
                  {isEn ? 'Officially registered sole proprietorship workshop in Serbia (APR RS)' : 'Službeno registrovan preduzetnik kod APR Republike Srbije'}
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs text-[#E8D0A9]">
                <span>PIB: <strong>{companyDetails.pib}</strong></span>
                <span>•</span>
                <span>MB: <strong>{companyDetails.maticniBroj}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white/80 font-sans">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C2872A] shrink-0" />
                <span>Peskuša 9, 12318 Jošanica (Žagubica)</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#C2872A] shrink-0" />
                <a href={`tel:${companyDetails.phone}`} className="hover:underline text-[#E8D0A9]">
                  {companyDetails.phoneFormatted}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#C2872A] shrink-0" />
                <a href={`mailto:${companyDetails.email}`} className="hover:underline text-[#E8D0A9]">
                  {companyDetails.email}
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="bg-[#1A1512] text-white p-4 border-t border-white/10 flex items-center justify-between gap-4 shrink-0">
          <p className="text-[11px] text-[#E8D0A9]/80 hidden sm:block">
            © 2026 Savremeni Koreni. {isEn ? 'All rights reserved.' : 'Sva prava zadržana.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 text-xs font-bold rounded-xl bg-[#C2872A] hover:bg-[#d19435] text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isEn ? 'Close & Continue Browsing' : 'Zatvori i Nastavi Pregled Sajta'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
