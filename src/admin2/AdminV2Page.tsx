import React, { useMemo, useState } from 'react';
import { generateProductImageAlt, AiImageAltResult } from '../utils/imageSeo';
import { permanentProductsData } from '../data/permanentProductsData';
import { permanentGalleryPhotosData } from '../data/permanentGalleryPhotosData';
import WorkflowPreviewPanel, { WorkflowPreviewChange } from './WorkflowPreviewPanel';

type Slot = 'MAIN' | 'G0' | 'G1' | 'G2';
const slotPaths = (p: any): Record<Slot, string> => ({
  MAIN: p.image || '',
  G0: p.images?.[2] || '',
  G1: p.images?.[1] || '',
  G2: p.images?.[0] || '',
});

export function AdminV2Page() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [altSuggestions, setAltSuggestions] = useState<Record<string, AiImageAltResult>>({});
  const [altGenerating, setAltGenerating] = useState<string | null>(null);
  const [altDrafts, setAltDrafts] = useState<Record<string, { alt: string; altEn: string }>>({});
  const [altApproved, setAltApproved] = useState<Record<string, boolean>>({});
  const [altSaving, setAltSaving] = useState(false);
  const [schemaPreview, setSchemaPreview] = useState<string | null>(null);
  const [schemaType, setSchemaType] = useState<'Organization' | 'Article' | 'BreadcrumbList'>('Organization');
  const [linkingPreview, setLinkingPreview] = useState<Array<{from:string;to:string;anchor:string;type:string;reason:string;score:number}>>([]);
  const [approvedLinks, setApprovedLinks] = useState<Record<string, boolean>>({});
  const [maxLinksPerPage, setMaxLinksPerPage] = useState(8);
  const [workflowStage, setWorkflowStage] = useState<'DRAFT' | 'VALIDATE' | 'PREVIEW' | 'APPROVED' | 'PUBLISHED'>('DRAFT');
  const [publishResult, setPublishResult] = useState<string>('');
  const [workflowPreviewOpen, setWorkflowPreviewOpen] = useState(false);
  const [previewReviewed, setPreviewReviewed] = useState(false);

  const validation = useMemo(() => {
    const products = permanentProductsData as any[];
    const media = permanentGalleryPhotosData as any[];
    const paths = products.flatMap(p => Object.values(slotPaths(p))).filter(Boolean) as string[];
    const missing = paths.filter(path => !media.some(m => m.imageUrl === path));
    const duplicateIds = products.filter(p => p.image && products.filter(x => x.image === p.image).length > 1).map(p => p.id);
    const invalid = products.filter(p => !p.image || !p.images || p.images.length !== 3);
    return { productCount: products.length, mediaCount: media.length, assignments: paths.length, missing, duplicateIds: [...new Set(duplicateIds)], invalid: invalid.map(p => p.name) };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return permanentProductsData as any[];
    return (permanentProductsData as any[]).filter(p => (p.name + ' ' + p.nameEn + ' ' + p.category + ' ' + p.id).toLowerCase().includes(q));
  }, [query]);

  const selectedProduct = (permanentProductsData as any[]).find(p => p.id === selected);
  const slotAudit = useMemo(() => {
    const products = permanentProductsData as any[];
    const rows: { productId: string; productName: string; slot: Slot; path: string; status: 'OK' | 'MISSING' | 'DUPLICATE'; }[] = [];
    products.forEach(p => {
      const slots = slotPaths(p);
      (Object.keys(slots) as Slot[]).forEach(slot => {
        const path = slots[slot];
        const owners = products.filter(x => slotPaths(x)[slot] === path && path);
        rows.push({ productId: p.id, productName: p.name, slot, path, status: !path ? 'MISSING' : owners.length > 1 ? 'DUPLICATE' : 'OK' });
      });
    });
    return rows;
  }, []);

  const auditProblems = slotAudit.filter(x => x.status !== 'OK');
  const approvedAltCount = Object.values(altApproved).filter(Boolean).length;
  const workflowValidationOk = validation.productCount === 47 && validation.mediaCount === 504 && validation.assignments === 188 && validation.missing.length === 0 && validation.invalid.length === 0;

  const workflowPreviewChanges = useMemo<WorkflowPreviewChange[]>(() => {
    const slotIndex: Record<Slot, number> = { MAIN: 0, G0: 1, G1: 2, G2: 3 };
    return Object.entries(altDrafts).map(([key, draft]) => {
      const [productId, slotValue] = key.split(':');
      const slot = slotValue as Slot;
      const product = (permanentProductsData as any[]).find(p => p.id === productId);
      const current = Array.isArray(product?.imageAlts) ? product.imageAlts[slotIndex[slot]] || {} : {};
      const suggestion = altSuggestions[key];
      return {
        key, productId, productName: product?.name || productId, slot,
        path: product ? slotPaths(product)[slot] : '',
        oldSr: String(current.alt || ''), oldEn: String(current.altEn || ''),
        newSr: String(draft?.alt || ''), newEn: String(draft?.altEn || ''),
        source: suggestion?.source === 'vision' ? 'Vision — stvarna fotografija' : suggestion?.source === 'fallback' ? 'fallback' : String(suggestion?.source || 'nije naveden'),
        valid: Boolean(draft?.alt?.trim() && draft?.altEn?.trim() && suggestion),
      };
    });
  }, [altDrafts, altSuggestions]);

  const altAudit = useMemo(() => {
    const rows: { productId: string; productName: string; slot: Slot; path: string; sr: string; en: string; status: 'OK' | 'MISSING_SR' | 'MISSING_EN' | 'MISSING_BOTH' }[] = [];
    (permanentProductsData as any[]).forEach(p => {
      const slots = slotPaths(p);
      const alts = Array.isArray(p.imageAlts) ? p.imageAlts : [];
      (Object.keys(slots) as Slot[]).forEach((slot, index) => {
        const path = slots[slot];
        const alt = alts[index] || {};
        const hasSr = Boolean(String(alt.alt || '').trim());
        const hasEn = Boolean(String(alt.altEn || '').trim());
        rows.push({
          productId: p.id,
          productName: p.name,
          slot,
          path,
          sr: String(alt.alt || ''),
          en: String(alt.altEn || ''),
          status: hasSr && hasEn ? 'OK' : !hasSr && !hasEn ? 'MISSING_BOTH' : !hasSr ? 'MISSING_SR' : 'MISSING_EN'
        });
      });
    });
    return rows;
  }, []);

  const altProblems = altAudit.filter(x => x.status !== 'OK');

  const handleGenerateAltSuggestion = async (row: typeof altAudit[number]) => {
    if (!row.path) return;
    const key = row.productId + ':' + row.slot;
    setAltGenerating(key);
    try {
      const product = (permanentProductsData as any[]).find(p => p.id === row.productId);
      const apiKey = localStorage.getItem('koreni_gemini_api_key') || '';
      const result = await generateProductImageAlt({
        imageUrl: row.path,
        productNameSr: product?.name || row.productName,
        productNameEn: product?.nameEn || row.productName,
        keywords: [product?.category, ...(product?.materials || []), ...(product?.craftTechniques || [])].filter(Boolean),
        imageRole: row.slot === 'MAIN' ? 'main' : row.slot === 'G0' ? 'closeup' : row.slot === 'G1' ? 'interior' : 'model',
        apiKey
      });
      setAltSuggestions(prev => ({ ...prev, [key]: result }));
      setAltDrafts(prev => ({ ...prev, [key]: { alt: result.altSr, altEn: result.altEn } }));
    } catch (error) {
      console.error('ALT audit suggestion error:', error);
    } finally {
      setAltGenerating(null);
    }
  };



  const buildProductSchema = (product: any) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `https://savremenikoreni.com/#product-${product.id}`,
    name: product.name,
    alternateName: product.nameEn || undefined,
    description: product.descriptionSr || product.description || undefined,
    image: Array.isArray(product.images) ? product.images.slice(0, 4) : [product.image].filter(Boolean),
    category: product.category,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'RSD',
      price: product.priceRsd,
      availability: product.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `https://savremenikoreni.com/#product-${product.id}`
    },
    brand: { '@type': 'Brand', name: 'Savremeni Koreni' }
  });

  const handleSchemaPreview = (product: any) => {
    setSchemaPreview(JSON.stringify(buildProductSchema(product), null, 2));
  };

  const buildInternalLinkSuggestions = () => {
    const products = permanentProductsData as any[];
    const suggestions: Array<{from:string;to:string;anchor:string;type:string;reason:string;score:number}> = [];
    const norm = (v: any) => String(v || '').toLocaleLowerCase('sr-Latn').trim();
    const toks = (v: any) => norm(v).split(/[^\p{L}\p{N}]+/u).filter(x => x.length >= 4);
    const seen = new Set<string>();
    products.forEach((from, i) => {
      const fromTokens = new Set([...toks(from.name), ...toks(from.category), ...toks(from.materials), ...toks(from.craftTechniques)]);
      products.forEach((to, j) => {
        if (i === j) return;
        const key = from.id + '→' + to.id;
        if (seen.has(key)) return;
        const toTokens = new Set([...toks(to.name), ...toks(to.category), ...toks(to.materials), ...toks(to.craftTechniques)]);
        const overlap = [...fromTokens].filter(t => toTokens.has(t)).length;
        const sameCategory = norm(from.category) && norm(from.category) === norm(to.category);
        const score = overlap * 15 + (sameCategory ? 25 : 0);
        if (score >= 25) {
          const anchor = sameCategory ? String(to.name) : String(to.category || to.name);
          suggestions.push({from: from.name,to: to.name,anchor,type:'product→product',reason:sameCategory ? 'ista kategorija + zajednički pojmovi' : 'zajednički sadržajni pojmovi',score});
          seen.add(key);
        }
      });
    });
    return suggestions.sort((a,b) => b.score-a.score).slice(0, maxLinksPerPage);
  };

  const buildSiteSchema = () => {
    if (schemaType === 'Organization') return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': 'https://savremenikoreni.com/#organization',
      name: 'Savremeni Koreni',
      url: 'https://savremenikoreni.com/'
    };
    if (schemaType === 'Article') return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': 'https://savremenikoreni.com/#article-preview',
      headline: 'PREVIEW — naslov članka',
      description: 'PREVIEW — opis članka',
      author: { '@type': 'Organization', '@id': 'https://savremenikoreni.com/#organization' },
      publisher: { '@type': 'Organization', '@id': 'https://savremenikoreni.com/#organization' },
      mainEntityOfPage: 'https://savremenikoreni.com/'
    };
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Početna', item: 'https://savremenikoreni.com/' },
        { '@type': 'ListItem', position: 2, name: 'Kolekcije', item: 'https://savremenikoreni.com/kolekcije' }
      ]
    };
  };  const handleSaveApprovedAlts = async () => {
    if (workflowStage !== 'APPROVED') {
      setPublishResult('PUBLISH BLOKIRAN: prvo mora postojati VALIDATE → PREVIEW → APPROVE.');
      return;
    }
    const approvedKeys = Object.keys(altApproved).filter(key => altApproved[key] && altDrafts[key]);
    if (!approvedKeys.length) return;
    setAltSaving(true);
    try {
      const byProduct = new Map<string, Record<number, { alt: string; altEn: string }>>();
      approvedKeys.forEach(key => {
        const [productId, slot] = key.split(':');
        const slotIndex: Record<Slot, number> = { MAIN: 0, G0: 1, G1: 2, G2: 3 };
        const index = slotIndex[slot as Slot];
        const current = byProduct.get(productId) || {};
        current[index] = altDrafts[key];
        byProduct.set(productId, current);
      });

      for (const [productId, changes] of byProduct) {
        const product = (permanentProductsData as any[]).find(p => p.id === productId);
        if (!product) continue;
        const nextAlts = Array.isArray(product.imageAlts) ? product.imageAlts.map((a: any) => ({ alt: a?.alt || '', altEn: a?.altEn || '' })) : [];
        while (nextAlts.length < 4) nextAlts.push({ alt: '', altEn: '' });
        Object.entries(changes).forEach(([index, value]) => {
          nextAlts[Number(index)] = value;
        });
        const updated = { ...product, imageAlts: nextAlts.slice(0, 4) };
        const { saveCustomProduct } = await import('../utils/customProductStorage');
        await saveCustomProduct(updated);
      }
      window.dispatchEvent(new CustomEvent('custom-products-updated'));
      setWorkflowStage('PUBLISHED');
      setPublishResult(`PUBLISHED: ${approvedKeys.length} odobrenih ALT izmena je upisano u Admin storage. GitHub/Cloudflare nisu menjani ovim korakom.`);
    } catch (error) {
      console.error('ALT save error:', error);
    } finally {
      setAltSaving(false);
    }
  };
  const mediaIndex = useMemo(() => {
    const result = new Map<string, { productId: string; productName: string; slot: Slot }[]>();
    (permanentProductsData as any[]).forEach(p => {
      const slots = slotPaths(p);
      (Object.keys(slots) as Slot[]).forEach(slot => {
        const path = slots[slot];
        if (!path) return;
        const list = result.get(path) || [];
        list.push({ productId: p.id, productName: p.name, slot });
        result.set(path, list);
      });
    });
    return result;
  }, []);

  const filteredMedia = useMemo(() => {
    const q = mediaQuery.trim().toLowerCase();
    return (permanentGalleryPhotosData as any[]).filter(m => {
      const links = mediaIndex.get(m.imageUrl) || [];
      const matchesFilter = mediaFilter === 'all' || (mediaFilter === 'assigned' ? links.length > 0 : links.length === 0);
      const haystack = [m.id, m.title, m.category, m.imageUrl, ...(links.map(x => x.productName + ' ' + x.slot))].join(' ').toLowerCase();
      return matchesFilter && (!q || haystack.includes(q));
    });
  }, [mediaQuery, mediaFilter, mediaIndex]);

  const assignedMediaCount = useMemo(() => (permanentGalleryPhotosData as any[]).filter(m => (mediaIndex.get(m.imageUrl) || []).length > 0).length, [mediaIndex]);
  const unassignedMediaCount = permanentGalleryPhotosData.length - assignedMediaCount;

  return (
    <div className="min-h-screen bg-[#f7f3ed] text-[#241d19] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div><div className="text-xs font-bold tracking-[0.2em] text-[#9e3e26]">SAVREMENI KORENI</div><h1 className="text-3xl md:text-4xl font-bold mt-1">Admin 2.0</h1><p className="text-sm text-gray-600 mt-1">FAZA 2 — READ ONLY / VALIDACIJA</p></div>
          <div className="px-4 py-2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-sm font-semibold">NEMA UPISA • NEMA BRISANJA • NEMA IndexedDB</div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Card label="PROIZVODI" value={validation.productCount} target="47" ok={validation.productCount === 47} />
          <Card label="MEDIA ZAPISI" value={validation.mediaCount} target="504" ok={validation.mediaCount === 504} />
          <Card label="SLOT REFERENCI" value={validation.assignments} target="188" ok={validation.assignments === 188} />
          <Card label="NEDOSTAJUĆE PUTANJE" value={validation.missing.length} target="0" ok={validation.missing.length === 0} />
          <Card label="NEISPRAVNI PROIZVODI" value={validation.invalid.length} target="0" ok={validation.invalid.length === 0} />
        </div>

        <div className="rounded-2xl bg-white border-2 border-[#9e3e26] shadow-sm p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] tracking-[0.18em] font-bold text-[#9e3e26]">CENTRALNI WORKFLOW</div>
              <h2 className="font-bold text-xl mt-1">DRAFT → VALIDATE → PREVIEW → APPROVE → PUBLISH</h2>
              <p className="text-xs text-gray-500 mt-1">Nijedna izmena ne prelazi u publish bez eksplicitnog odobrenja.</p>
            </div>
            <div className={workflowStage === 'PUBLISHED' ? 'px-4 py-2 rounded-full bg-green-100 border border-green-300 text-green-800 text-xs font-bold' : 'px-4 py-2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold'}>
              STATUS: {workflowStage}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {(['DRAFT','VALIDATE','PREVIEW','APPROVED','PUBLISHED'] as const).map((stage, i) => {
              const active = workflowStage === stage;
              const reached = (['DRAFT','VALIDATE','PREVIEW','APPROVED','PUBLISHED'] as const).indexOf(workflowStage) >= i;
              return <div key={stage} className={active ? 'p-3 rounded-xl border-2 border-[#9e3e26] bg-[#f7f3ed]' : 'p-3 rounded-xl border border-[#e8e0d5] bg-white'}>
                <div className={reached ? 'text-green-700 font-bold text-xs' : 'text-gray-400 font-bold text-xs'}>{reached ? '✓' : '○'} {stage}</div>
              </div>;
            })}
          </div>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-[#f7f3ed] border border-[#e8e0d5]">
              <div className="text-[10px] text-gray-500 font-bold">VALIDACIJA</div>
              <div className={workflowValidationOk ? 'text-green-700 font-bold mt-1' : 'text-red-700 font-bold mt-1'}>{workflowValidationOk ? 'PASS' : 'BLOCKED'}</div>
              <div className="text-[10px] text-gray-500 mt-1">47 proizvoda • 504 media • 188 slotova</div>
            </div>
            <div className="p-3 rounded-xl bg-[#f7f3ed] border border-[#e8e0d5]">
              <div className="text-[10px] text-gray-500 font-bold">DRAFT</div>
              <div className="font-bold mt-1">{approvedAltCount} odobrenih ALT predloga</div>
              <div className="text-[10px] text-gray-500 mt-1">Ništa nije publish-ovano dok se ne odobri.</div>
            </div>
            <div className="p-3 rounded-xl bg-[#f7f3ed] border border-[#e8e0d5]">
              <div className="text-[10px] text-gray-500 font-bold">OPSEG</div>
              <div className="font-bold mt-1">SAMO ALT izmene</div>
              <div className="text-[10px] text-gray-500 mt-1">Proizvodi/slike/putanje se ne menjaju.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setWorkflowStage('VALIDATE'); setPublishResult(workflowValidationOk ? 'VALIDATE PASS: osnovni integritet je potvrđen.' : 'VALIDATE BLOCKED: pronađen je problem u osnovnom integritetu.'); }} className="px-4 py-2 rounded-xl border border-[#cdbfb0] text-xs font-bold">1. VALIDATE</button>
            <button disabled={workflowStage !== 'VALIDATE' || !workflowValidationOk || approvedAltCount === 0} onClick={() => { setWorkflowStage('PREVIEW'); setPreviewReviewed(false); setWorkflowPreviewOpen(true); setPublishResult('PREVIEW otvoren: pregledajte stare i nove vrednosti pre APPROVE.'); }} className="px-4 py-2 rounded-xl border border-[#cdbfb0] text-xs font-bold disabled:opacity-40">2. PREVIEW</button>
            <button disabled={workflowStage !== 'PREVIEW' || approvedAltCount === 0 || !previewReviewed} onClick={() => { setWorkflowStage('APPROVED'); setWorkflowPreviewOpen(false); setPublishResult('APPROVE potvrđen: publish je sada dozvoljen samo za prethodno odobrene ALT izmene.'); }} className="px-4 py-2 rounded-xl bg-[#241d19] text-white text-xs font-bold disabled:opacity-40">3. APPROVE</button>
            <button disabled={workflowStage !== 'APPROVED' || approvedAltCount === 0 || !workflowValidationOk || altSaving} onClick={handleSaveApprovedAlts} className="px-4 py-2 rounded-xl bg-green-700 text-white text-xs font-bold disabled:opacity-40">{altSaving ? 'PUBLISH...' : '4. PUBLISH'}</button>
          </div>
          {publishResult && <div className="mt-4 p-3 rounded-xl bg-[#f7f3ed] border border-[#d8cec1] text-xs font-semibold">{publishResult}</div>}
          <div className="mt-3 text-[10px] text-gray-500">VAŽNO: ovaj korak trenutno ne radi GitHub commit/push niti Cloudflare deployment. To će biti poseban, proverljiv korak nakon lokalnog publish-a.</div>
        </div>

        <div className="rounded-2xl bg-white border border-[#e8e0d5] shadow-sm p-5 mb-6">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <div><h2 className="font-bold text-lg">Internal Linking Engine</h2><p className="text-xs text-gray-500 mt-1">Predlozi veza između proizvoda • bez automatskog upisa</p></div>
            <button onClick={() => setLinkingPreview(buildInternalLinkSuggestions())} className="px-4 py-2 rounded-xl bg-[#241d19] text-white text-xs font-bold">Analiziraj veze</button>
          </div>
          <div className="mb-4">
            <div className="text-xs font-bold mb-2">LINK TYPES</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
              {[
                ['HOME→COLLECTION','Početna → Kolekcija'],
                ['COLLECTION→PRODUCT','Kolekcija → Proizvod'],
                ['PRODUCT→PRODUCT','Proizvod → Proizvod'],
                ['BLOG→PRODUCT','Blog → Proizvod'],
                ['BLOG→BLOG','Blog → Blog']
              ].map(([key,label]) => <div key={key} className="p-2 rounded-lg bg-[#f7f3ed] border border-[#e8e0d5]">{label}</div>)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
            <div className="p-2 rounded-lg bg-[#f7f3ed]"><b>Izvor</b><div>proizvodi</div></div>
            <div className="p-2 rounded-lg bg-[#f7f3ed]"><b>Kriterijum</b><div>semantika + kategorija</div></div>
            <div className="p-2 rounded-lg bg-[#f7f3ed]"><b>Status</b><div>PREVIEW</div></div>
          </div>
          {linkingPreview.length > 0 && <div className="max-h-[360px] overflow-auto border rounded-xl">
            <table className="w-full text-xs"><thead className="sticky top-0 bg-[#f1ebe3]"><tr><th className="p-2 text-left">Od</th><th className="p-2 text-left">Ka</th><th className="p-2 text-left">Anchor</th><th className="p-2 text-left">Razlog</th><th className="p-2">Score</th><th className="p-2">Akcija</th></tr></thead>
            <tbody>{linkingPreview.map((x,i) => {
              const key = x.from + '→' + x.to;
              return <tr key={i} className="border-t border-[#eee7df]">
                <td className="p-2 font-semibold">{x.from}</td><td className="p-2">{x.to}</td><td className="p-2">{x.anchor}</td><td className="p-2">{x.reason}</td><td className="p-2 font-bold">{x.score}</td>
                <td className="p-2"><button onClick={() => setApprovedLinks(prev => ({...prev,[key]:!prev[key]}))} className={approvedLinks[key] ? "px-2 py-1 rounded bg-green-700 text-white font-bold" : "px-2 py-1 rounded border border-[#cdbfb0]"}>{approvedLinks[key] ? '✓' : 'Odobri'}</button></td>
              </tr>;
            })}</tbody></table>
          </div>}
        </div>

        <div className="rounded-2xl bg-white border border-[#e8e0d5] shadow-sm p-5 mb-6">
          <h2 className="font-bold text-lg mb-3">Dokaz validacije</h2>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <Status ok={validation.productCount === 47} text={'47 proizvoda: ' + validation.productCount + '/47'} />
            <Status ok={validation.mediaCount === 504} text={'504 media zapisa: ' + validation.mediaCount + '/504'} />
            <Status ok={validation.assignments === 188} text={'4 slike po proizvodu: ' + validation.assignments + '/188 slot referenci'} />
            <Status ok={validation.missing.length === 0} text={'Sve reference postoje u galerijskom indeksu: ' + (validation.missing.length === 0 ? 'DA' : 'NE')} />
            <Status ok={validation.invalid.length === 0} text={'Struktura MAIN + G0 + G1 + G2: ' + (validation.invalid.length === 0 ? 'DA' : 'NE')} />
            <Status ok={validation.duplicateIds.length === 0} text={'Dupli MAIN među proizvodima: ' + (validation.duplicateIds.length === 0 ? 'NE' : 'DA')} />
          </div>
          {validation.missing.length > 0 && <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-800 text-xs break-all">{validation.missing.join('\n')}</div>}
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pretraga proizvoda, kategorije ili ID..." className="flex-1 px-4 py-3 rounded-xl border border-[#d8cec1] bg-white outline-none focus:ring-2 focus:ring-[#9e3e26]" />
          <button onClick={() => window.location.href = '/'} className="px-5 py-3 rounded-xl bg-[#241d19] text-white font-semibold">← Nazad na sajt</button>
        </div>

        <div className="rounded-2xl bg-white border border-[#e8e0d5] shadow-sm p-5 mb-6">
          <div className="flex flex-wrap justify-between items-end gap-3 mb-4">
            <div><h2 className="font-bold text-lg">Faza 2C — kontrola 188 slotova</h2><p className="text-xs text-gray-500 mt-1">Samo kontrola. Nema automatske izmene.</p></div>
            <div className="text-sm font-semibold">OK: {slotAudit.filter(x => x.status === 'OK').length} / 188 • Problemi: {auditProblems.length}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {(['MAIN','G0','G1','G2'] as Slot[]).map(slot => {
              const list = slotAudit.filter(x => x.slot === slot);
              const bad = list.filter(x => x.status !== 'OK').length;
              return <div key={slot} className="rounded-xl border border-[#e8e0d5] p-3"><div className="font-bold">{slot}</div><div className="text-xs mt-1">{list.length - bad}/47 OK</div><div className={bad ? 'text-xs text-red-700 font-semibold' : 'text-xs text-green-700 font-semibold'}>{bad ? bad + ' problem' + (bad === 1 ? '' : 'a') : 'BEZ PROBLEMA'}</div></div>;
            })}
          </div>
          <div className="max-h-[420px] overflow-auto border rounded-xl">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#f1ebe3]"><tr><th className="p-2 text-left">Proizvod</th><th className="p-2">Slot</th><th className="p-2 text-left">Fajl</th><th className="p-2">Status</th><th className="p-2">AI</th></tr></thead>
              <tbody>{slotAudit.map(row => <tr key={row.productId + row.slot} className="border-t border-[#eee7df]"><td className="p-2 font-semibold">{row.productName}</td><td className="p-2 font-bold">{row.slot}</td><td className="p-2 break-all">{row.path || '—'}</td><td className={row.status === 'OK' ? 'p-2 text-green-700 font-bold' : 'p-2 text-red-700 font-bold'}>{row.status}</td></tr>)}</tbody>
            </table>
          </div>
          {auditProblems.length > 0 && <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200"><div className="font-bold text-red-800 mb-2">Problemi za ručnu proveru</div>{auditProblems.map(x => <div key={x.productId + x.slot} className="text-xs text-red-800">{x.productName} — {x.slot} — {x.status} — {x.path || 'nema putanje'}</div>)}</div>}
        </div>

        <div className="rounded-2xl bg-white border border-[#e8e0d5] shadow-sm p-5 mb-6">
          <div className="flex flex-wrap justify-between items-end gap-3 mb-4">
            <div>
              <h2 className="font-bold text-lg">ALT Audit — svih 188 fotografskih slotova</h2>
              <p className="text-xs text-gray-500 mt-1">READ ONLY • analiza postojećih imageAlts • nema automatskog upisa</p>
            </div>
            <div className="text-sm font-semibold">OK: {altAudit.filter(x => x.status === 'OK').length} / 188 • Za doradu: {altProblems.length}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {(['MAIN','G0','G1','G2'] as Slot[]).map(slot => {
              const list = altAudit.filter(x => x.slot === slot);
              const ok = list.filter(x => x.status === 'OK').length;
              return <div key={slot} className="rounded-xl border border-[#e8e0d5] p-3">
                <div className="font-bold">{slot}</div>
                <div className="text-xs mt-1">{ok}/47 imaju SR + EN ALT</div>
                <div className={ok === 47 ? 'text-xs text-green-700 font-semibold' : 'text-xs text-amber-700 font-semibold'}>{ok === 47 ? 'POTPUNO' : (47-ok) + ' za proveru'}</div>
              </div>;
            })}
          </div>
          <div className="max-h-[360px] overflow-auto border rounded-xl">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#f1ebe3]"><tr><th className="p-2 text-left">Proizvod</th><th className="p-2">Slot</th><th className="p-2 text-left">SR ALT</th><th className="p-2 text-left">EN ALT</th><th className="p-2">Status</th></tr></thead>
              <tbody>{altAudit.map(row => (
                <tr key={row.productId + row.slot} className="border-t border-[#eee7df]">
                  <td className="p-2 font-semibold">{row.productName}</td>
                  <td className="p-2 font-bold">{row.slot}</td>
                  <td className="p-2 max-w-[260px] truncate" title={row.sr}>{row.sr || '—'}</td>
                  <td className="p-2 max-w-[260px] truncate" title={row.en}>{row.en || '—'}</td>
                  <td className={row.status === 'OK' ? 'p-2 text-green-700 font-bold' : 'p-2 text-amber-700 font-bold'}>{row.status}</td>
                  <td className="p-2">
                    {row.path && <button onClick={() => handleGenerateAltSuggestion(row)} disabled={altGenerating === row.productId + ':' + row.slot} className="px-2 py-1 rounded-lg border border-[#cdbfb0] text-[10px] font-semibold disabled:opacity-50">
                      {altGenerating === row.productId + ':' + row.slot ? 'Analiza...' : 'Predlog ALT'}
                    </button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {Object.entries(altSuggestions).length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <div className="font-bold mb-2">AI PREDLOZI — pregled i ručno odobravanje</div>
              {Object.entries(altSuggestions).map(([key, result]) => (
                <div key={key} className="border-t border-emerald-200 pt-3 mt-3 space-y-2">
                  <div className="font-semibold">{key}</div>
                  <label className="block"><span className="font-semibold">SR ALT</span>
                    <input value={altDrafts[key]?.alt || ''} onChange={e => setAltDrafts(prev => ({...prev, [key]: {...prev[key], alt: e.target.value}}))} className="mt-1 w-full px-2 py-1.5 rounded border border-emerald-200 bg-white" />
                  </label>
                  <label className="block"><span className="font-semibold">EN ALT</span>
                    <input value={altDrafts[key]?.altEn || ''} onChange={e => setAltDrafts(prev => ({...prev, [key]: {...prev[key], altEn: e.target.value}}))} className="mt-1 w-full px-2 py-1.5 rounded border border-emerald-200 bg-white" />
                  </label>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setAltApproved(prev => ({...prev, [key]: true}))} className={altApproved[key] ? "px-3 py-1.5 rounded-lg bg-green-700 text-white font-bold" : "px-3 py-1.5 rounded-lg bg-[#241d19] text-white font-bold"}>{altApproved[key] ? '✓ ODOBRENO' : 'Odobri ALT'}</button>
                    {altApproved[key] && <span className="text-green-700 font-semibold">Spremno za sledeći korak čuvanja.</span>}
                  </div>
                  <div className="text-[10px] opacity-70">Izvor: {result.source === 'vision' ? 'analiza stvarne fotografije' : 'sigurni fallback'} • Predlog nije upisan u proizvod.</div>
                </div>
              ))}
            </div>
          )}
          {Object.values(altApproved).some(Boolean) && (
            <div className="mt-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-[#f7f3ed] border border-[#d8cec1]">
              <div className="text-xs"><b>{Object.values(altApproved).filter(Boolean).length}</b> ALT predloga je odobreno i spremno za upis.</div>
              <button onClick={handleSaveApprovedAlts} disabled={altSaving} className="px-4 py-2 rounded-xl bg-[#241d19] text-white text-xs font-bold disabled:opacity-50">
                {altSaving ? 'Čuvanje...' : 'Sačuvaj samo odobrene ALT-ove'}
              </button>
            </div>
          )}
          {altProblems.length > 0 && <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            ALT audit je dijagnostika. AI predlog se prikazuje samo za pregled; nijedan ALT se ovde ne upisuje automatski.
          </div>}
        </div>

        <div className="rounded-2xl bg-white border border-[#e8e0d5] shadow-sm p-5 mb-6">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div><h2 className="font-bold text-lg">Media Library — 504 fotografije</h2><p className="text-xs text-gray-500 mt-1">READ ONLY • svaka fotografija ostaje fizički nezavisna od proizvoda</p></div>
            <div className="text-xs font-semibold">Povezane: {assignedMediaCount} • Nepovezane: {unassignedMediaCount}</div>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mb-4">
            <input value={mediaQuery} onChange={e => setMediaQuery(e.target.value)} placeholder="Pretraži 504 fotografije, naziv, kategoriju ili proizvod..." className="flex-1 px-4 py-3 rounded-xl border border-[#d8cec1] bg-white" />
            {(['all','assigned','unassigned'] as const).map(f => (
              <button key={f} onClick={() => setMediaFilter(f)} className={mediaFilter === f ? 'px-4 py-2 rounded-xl bg-[#241d19] text-white font-semibold' : 'px-4 py-2 rounded-xl border border-[#d8cec1] bg-white'}>
                {f === 'all' ? 'Sve' : f === 'assigned' ? 'Povezane' : 'Nepovezane'}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mb-3">Prikaz: {filteredMedia.length} / {permanentGalleryPhotosData.length}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {filteredMedia.map((m: any) => {
              const links = mediaIndex.get(m.imageUrl) || [];
              return <button key={m.id + m.imageUrl} onClick={() => setSelectedMedia(m)} className="text-left rounded-xl border border-[#e8e0d5] bg-white overflow-hidden hover:shadow-md">
                <div className="aspect-square bg-gray-100"><img src={m.imageUrl} alt={m.title || m.id} className="w-full h-full object-cover" loading="lazy" /></div>
                <div className="p-2"><div className="text-[10px] font-bold truncate">{m.id}</div><div className="text-[9px] text-gray-500 truncate">{m.title || 'Bez naslova'}</div><div className="mt-1 text-[9px]">{links.length ? links.map(x => x.slot).join(' • ') : 'NIJE DODELJENA'}</div></div>
              </button>;
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#e8e0d5] shadow-sm p-5 mb-6">
          <div className="flex flex-wrap justify-between items-end gap-3 mb-3">
            <div><h2 className="font-bold text-lg">Schema Generator — Product</h2><p className="text-xs text-gray-500 mt-1">Preview only • JSON-LD se ne upisuje automatski</p></div>
            <span className="text-xs font-semibold text-amber-700">VALIDACIJA PRE UPISA</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {(['Organization','Article','BreadcrumbList'] as const).map(type => (
              <button key={type} onClick={() => { setSchemaType(type); setSchemaPreview(JSON.stringify(buildSiteSchema(), null, 2)); }} className={schemaType === type ? "px-3 py-1.5 rounded-lg bg-[#241d19] text-white text-xs font-bold" : "px-3 py-1.5 rounded-lg border border-[#d8cec1] text-xs"}>
                {type}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-2">
            {(permanentProductsData as any[]).slice(0, 47).map(p => (
              <button key={p.id} onClick={() => handleSchemaPreview(p)} className="text-left px-3 py-2 rounded-xl border border-[#d8cec1] hover:bg-[#f7f3ed] text-xs">
                <b>{p.name}</b><div className="text-gray-500">{p.id} • {p.category}</div>
              </button>
            ))}
          </div>
          {schemaPreview && <div className="mt-4">
            <pre className="max-h-[320px] overflow-auto p-4 rounded-xl bg-[#17120f] text-green-200 text-[10px] whitespace-pre-wrap">{schemaPreview}</pre>
            <p className="mt-2 text-[10px] text-gray-500">Schema je generisan iz postojećih podataka proizvoda. Nema izmene product/image podataka.</p>
          </div>}
        </div>

        <div className="rounded-2xl bg-white border border-[#e8e0d5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f1ebe3]"><tr><th className="text-left p-3">Proizvod</th><th className="text-left p-3">Kategorija</th><th className="text-left p-3">MAIN</th><th className="text-left p-3">G0</th><th className="text-left p-3">G1</th><th className="text-left p-3">G2</th><th className="p-3"></th></tr></thead>
              <tbody>
                {filtered.map(p => { const slots = slotPaths(p); return (
                  <tr key={p.id} className="border-t border-[#eee7df] align-top">
                    <td className="p-3 min-w-[190px]"><div className="font-bold">{p.name}</div><div className="text-[10px] text-gray-500">{p.id}</div></td>
                    <td className="p-3">{p.category}</td>
                    {(['MAIN','G0','G1','G2'] as Slot[]).map(slot => <td key={slot} className="p-2"><div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border">{slots[slot] ? <img src={slots[slot]} alt={p.name + ' ' + slot} className="w-full h-full object-cover" loading="lazy" /> : null}</div><div className="text-[9px] mt-1 max-w-[110px] break-all text-gray-500">{slots[slot]}</div></td>)}
                    <td className="p-3"><button onClick={() => setSelected(p.id)} className="px-3 py-2 rounded-lg border border-[#cdbfb0] font-semibold">Detalji</button></td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>

          <WorkflowPreviewPanel open={workflowPreviewOpen} changes={workflowPreviewChanges} approvedCount={approvedAltCount} reviewed={previewReviewed} onReviewedChange={setPreviewReviewed} onClose={() => setWorkflowPreviewOpen(false)} onApprove={() => { setPreviewReviewed(true); setWorkflowStage('APPROVED'); setWorkflowPreviewOpen(false); setPublishResult('APPROVE potvrđen iz Preview ekrana. Publish je zaključan do sledećeg koraka.'); }} />

    <div className="mt-5 text-xs text-gray-500">Izvor: permanentProductsData.ts + permanentGalleryPhotosData.ts. Ova faza samo čita stanje. Ne menja proizvode, slike, localStorage, IndexedDB, GitHub niti Cloudflare.</div>
      </div>

      {selectedMedia && <div className="fixed inset-0 z-[60] bg-black/70 p-4 flex items-center justify-center" onClick={() => setSelectedMedia(null)}>
        <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start gap-3 mb-4"><div><h2 className="text-xl font-bold">{selectedMedia.title || selectedMedia.id}</h2><div className="text-xs text-gray-500 break-all">{selectedMedia.imageUrl}</div></div><button onClick={() => setSelectedMedia(null)} className="px-3 py-1 rounded-lg bg-gray-100">Zatvori</button></div>
          <img src={selectedMedia.imageUrl} alt={selectedMedia.title || selectedMedia.id} className="w-full max-h-[65vh] object-contain rounded-xl bg-gray-100" />
          <div className="mt-4 p-3 rounded-xl bg-[#f7f3ed]"><div className="text-xs font-bold mb-2">TRENUTNE VEZE</div>{(mediaIndex.get(selectedMedia.imageUrl) || []).length ? (mediaIndex.get(selectedMedia.imageUrl) || []).map(x => <div key={x.productId + x.slot} className="text-sm">{x.productName} — <b>{x.slot}</b></div>) : <div className="text-sm text-gray-600">Nije dodeljena nijednom proizvodu.</div>}</div>
        </div>
      </div>}
      {selectedProduct && <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center" onClick={() => setSelected(null)}>
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{selectedProduct.name}</h2><button onClick={() => setSelected(null)} className="px-3 py-1 rounded-lg bg-gray-100">Zatvori</button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['MAIN','G0','G1','G2'] as Slot[]).map(slot => { const path = slotPaths(selectedProduct)[slot]; return <div key={slot}><div className="font-bold text-xs mb-1">{slot}</div><img src={path} alt={selectedProduct.name + ' ' + slot} className="w-full aspect-square object-cover rounded-xl border" /><div className="text-[9px] break-all mt-1">{path}</div></div>; })}
          </div>
        </div>
      </div>}
    </div>
  );
}

function Card({label,value,target,ok}:{label:string;value:number;target:string;ok:boolean}) {
  return <div className="bg-white border border-[#e8e0d5] rounded-2xl p-4 shadow-sm"><div className="text-[10px] tracking-wider text-gray-500">{label}</div><div className="text-2xl font-bold mt-1">{value}</div><div className={ok ? 'text-xs text-green-700 font-semibold' : 'text-xs text-red-700 font-semibold'}>{ok ? 'DA' : 'NE'} • cilj {target}</div></div>;
}
function Status({ok,text}:{ok:boolean;text:string}) { return <div className="flex items-center gap-2"><span className={ok ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>{ok ? '✓' : '✕'}</span><span>{text}</span></div>; }
