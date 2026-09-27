import React, { useEffect, useMemo, useState } from 'react';
import { generateProductImageAlt, AiImageAltResult } from '../utils/imageSeo';
import { permanentProductsData } from '../data/permanentProductsData';
import { permanentGalleryPhotosData } from '../data/permanentGalleryPhotosData';
import WorkflowPreviewPanel, { WorkflowPreviewChange } from './WorkflowPreviewPanel';
import AdminImageWorkspace from './AdminImageWorkspace';
import { publicCustomProductsManifest } from '../data/publicCustomProductsManifest';

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
  const [mediaFilter, setMediaFilter] = useState<'all' | 'assigned' | 'unassigned' | 'removed' | 'newUpload'>('all');
  const [mediaImageErrors, setMediaImageErrors] = useState<Record<string, boolean>>({});
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [altSuggestions, setAltSuggestions] = useState<Record<string, AiImageAltResult>>({});
  const [altGenerating, setAltGenerating] = useState<string | null>(null);
  const [altDrafts, setAltDrafts] = useState<Record<string, { alt: string; altEn: string }>>({});
  const [altApproved, setAltApproved] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('admin2_alt_approved_v2') || '{}'); } catch { return {}; } });
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
  const [publishKey, setPublishKey] = useState<string>(() => sessionStorage.getItem('admin2_publish_key') || '');
  const [publishBusy, setPublishBusy] = useState(false);
  const [draftVersion, setDraftVersion] = useState(0);
  const [sitemapStatus, setSitemapStatus] = useState<'UNKNOWN' | 'PASS' | 'FAIL'>('UNKNOWN');
  const [imageCheckStatus, setImageCheckStatus] = useState<'UNKNOWN' | 'PASS' | 'FAIL'>('UNKNOWN');
  const [altGeneratingDraft, setAltGeneratingDraft] = useState(false);
  const [visualReviewStatus, setVisualReviewStatus] = useState<'UNKNOWN' | 'PASS'>('UNKNOWN');
  const [seoImpactStatus, setSeoImpactStatus] = useState<'UNKNOWN' | 'PASS'>('UNKNOWN');
  const [finalPublicPreviewStatus, setFinalPublicPreviewStatus] = useState<'UNKNOWN' | 'PASS'>('UNKNOWN');
  const [publicMediaStatus, setPublicMediaStatus] = useState<'UNKNOWN' | 'PASS' | 'FAIL'>('UNKNOWN');
  const [dimensionsStatus, setDimensionsStatus] = useState<'UNKNOWN' | 'PASS' | 'FAIL'>('UNKNOWN');
  const [brokenImageStatus, setBrokenImageStatus] = useState<'UNKNOWN' | 'PASS' | 'FAIL'>('UNKNOWN');

  const invalidatePrePublish = () => {
    setWorkflowStage('DRAFT');
    setPreviewReviewed(false);
    setVisualReviewStatus('UNKNOWN');
    setSeoImpactStatus('UNKNOWN');
    setFinalPublicPreviewStatus('UNKNOWN');
    setPublicMediaStatus('UNKNOWN');
    setDimensionsStatus('UNKNOWN');
    setBrokenImageStatus('UNKNOWN');
    setImageCheckStatus('UNKNOWN');
  };

  useEffect(() => {
    const onDraftMutation = () => invalidatePrePublish();
    window.addEventListener('admin2-draft-mutated', onDraftMutation);
    window.addEventListener('admin2-draft-saved', onDraftMutation);
    return () => {
      window.removeEventListener('admin2-draft-mutated', onDraftMutation);
      window.removeEventListener('admin2-draft-saved', onDraftMutation);
    };
  }, []);

  const validation = useMemo(() => {
    const products = permanentProductsData as any[];
    const media = publicCustomProductsManifest as string[];
    const paths = products.flatMap(p => Object.values(slotPaths(p))).filter(Boolean) as string[];
    const manifestPaths = new Set((publicCustomProductsManifest as string[]).map(file => '/custom_products/' + file));
    const missing = paths.filter(path => !manifestPaths.has(path));
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

  const auditProblems = slotAudit.filter(x => x.status === 'MISSING');
  const auditDuplicateWarnings = slotAudit.filter(x => x.status === 'DUPLICATE');
  const approvedAltCount = Object.values(altApproved).filter(Boolean).length;
  const workflowValidationOk = validation.productCount === 47 && validation.mediaCount === 504 && validation.assignments === 188 && validation.missing.length === 0 && validation.invalid.length === 0;

  const readAdminDraft = () => {
    try {
      const assignments = JSON.parse(localStorage.getItem('admin2_assignments_v2') || '{}');
      const removedProducts = JSON.parse(localStorage.getItem('admin2_removed_products_v2') || '{}');
      const removedMedia = JSON.parse(localStorage.getItem('admin2_removed_media_v2') || '{}');
      const uploads = JSON.parse(localStorage.getItem('admin2_media_v2') || '[]');
      const repoPath = (id: string) => id.startsWith('repo-') ? '/custom_products/' + id.slice(5) : id;
      const normalizedAssignments: Record<string, Record<string, string>> = {};
      for (const [productId, slots] of Object.entries(assignments)) {
        normalizedAssignments[productId] = {};
        for (const [slot, id] of Object.entries(slots as any)) {
          normalizedAssignments[productId][slot] = repoPath(String(id));
        }
      }
      const removedMediaPaths = Object.entries(removedMedia).filter(([,v]) => Boolean(v)).map(([id]) => repoPath(id));
      const activeUploads = Array.isArray(uploads) ? uploads.filter((u:any) => u?.source === 'upload' && u?.data).slice(0,20) : [];
      return { assignments: normalizedAssignments, removedProductIds: Object.entries(removedProducts).filter(([,v]) => Boolean(v)).map(([id]) => id), removedMediaPaths, uploads: activeUploads };
    } catch {
      return { assignments: {}, removedProductIds: [], removedMediaPaths: [], uploads: [] };
    }
  };

  const draftSnapshot = useMemo(() => readAdminDraft(), [draftVersion]);
  const draftChangeCount = Object.values(draftSnapshot.assignments).reduce((n, slots) => n + Object.keys(slots).length, 0) + draftSnapshot.removedProductIds.length + draftSnapshot.removedMediaPaths.length + draftSnapshot.uploads.length + Object.keys(altDrafts).length;
  const draftProductIds = [...new Set([...Object.keys(draftSnapshot.assignments), ...draftSnapshot.removedProductIds])];

  const draftImageRows = useMemo(() => {
    const uploads = draftSnapshot.uploads || [];
    const resolve = (id: string) => {
      if (id.startsWith('repo-')) return '/custom_products/' + id.slice(5);
      return uploads.find((x: any) => x.id === id)?.data || id;
    };
    const rows: Array<{key:string;productId:string;productName:string;slot:Slot;imageId:string;image:string;oldImage:string;altSr:string;altEn:string}> = [];
    for (const [productId, slotsMap] of Object.entries(draftSnapshot.assignments || {})) {
      const product = (permanentProductsData as any[]).find(p => p.id === productId);
      if (!product) continue;
      const current = slotPaths(product);
      for (const [slotName, imageId] of Object.entries(slotsMap as any)) {
        const slot = slotName as Slot;
        const image = resolve(String(imageId));
        const index: Record<Slot, number> = { MAIN:0, G0:1, G1:2, G2:3 };
        const canonicalAlt = Array.isArray(product.imageAlts) ? product.imageAlts[index[slot]] || {} : {};
        const draftAlt = altDrafts[productId + ':' + slot];
        rows.push({ key: productId + ':' + slot, productId, productName: product.name, slot, imageId:String(imageId), image, oldImage:current[slot] || '', altSr:String(draftAlt?.alt || canonicalAlt.alt || ''), altEn:String(draftAlt?.altEn || canonicalAlt.altEn || '') });
      }
    }
    return rows;
  }, [draftSnapshot, altDrafts]);

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

  const effectiveAltAudit = useMemo(() => altAudit.map(row => {
    const key = row.productId + ':' + row.slot;
    const draft = altDrafts[key];
    const approved = Boolean(altApproved[key]);
    const sr = draft?.alt?.trim() || row.sr.trim();
    const en = draft?.altEn?.trim() || row.en.trim();
    return { ...row, effectiveSr: sr, effectiveEn: en, confirmed: Boolean(sr && en && (row.status === 'OK' || approved)) };
  }), [altAudit, altDrafts, altApproved]);

  const prePublishChecks = useMemo(() => {
    const changed = draftImageRows;
    const imagePass = changed.length === 0 || changed.every(x => Boolean(x.image) && ['MAIN','G0','G1','G2'].includes(x.slot));
    const slotLayoutPass = workflowValidationOk && slotAudit.length === 188 && auditProblems.length === 0 && changed.every(x => Boolean(x.image));
    const altSrCount = effectiveAltAudit.filter(x => Boolean(x.effectiveSr)).length;
    const altEnCount = effectiveAltAudit.filter(x => Boolean(x.effectiveEn)).length;
    const altConfirmedCount = effectiveAltAudit.filter(x => x.confirmed).length;
    const altApprovedPass = altConfirmedCount === 188;
    const uploads = draftSnapshot.uploads || [];
    const uploadPass = uploads.every((u:any) => u.source !== 'upload' || (u.data && u.data.startsWith('data:image/webp') && Number(u.width) > 0 && Number(u.height) > 0 && Number(u.width) <= 1600 && Number(u.height) <= 1600 && Number(u.size) > 0));
    const schemaPass = draftProductIds.every(id => {
      const p=(permanentProductsData as any[]).find(x=>x.id===id);
      if (!p) return true;
      const schema = buildProductSchema(p);
      try {
        const json = JSON.stringify(schema);
        return Boolean(
          schema['@context'] === 'https://schema.org' &&
          schema['@type'] === 'Product' &&
          String(schema.name || '').trim() &&
          String(schema.category || '').trim() &&
          Array.isArray(schema.image) &&
          schema.image.length > 0 &&
          schema.offers?.['@type'] === 'Offer' &&
          String(schema.offers?.priceCurrency || '').trim() &&
          String(schema.offers?.availability || '').trim() &&
          json.includes('"@type":"Product"')
        );
      } catch { return false; }
    });
    return [
      {key:'images',label:'IZMENE SLIKA',pass:imagePass,detail:changed.length ? changed.length + ' izmenjenih slotova u DRAFT-u' : 'nema izmena slika'},
      {key:'layout',label:'MAIN / G0 / G1 / G2 RASPORED',pass:slotLayoutPass,detail:slotLayoutPass ? '188/188 tehnički validno' : 'potrebna validacija rasporeda'},
      {key:'visual',label:'VIZUELNA PROVERA NOVIH SLIKA',pass:visualReviewStatus==='PASS',detail:visualReviewStatus==='PASS'?'ručno potvrđeno':'potrebna ručna potvrda'},
      {key:'physical',label:'SVE FIZIČKE SLIKE POSTOJE',pass:publicMediaStatus==='PASS',detail:publicMediaStatus==='PASS'?'504 javne slike proverene':'potrebno pokrenuti proveru 504 javne slike'},
      {key:'media',label:'504 MEDIA FAJLA',pass:publicCustomProductsManifest.length===504,detail:publicCustomProductsManifest.length + '/504 u canonical manifestu'},
      {key:'slots',label:'188 SLOTOVA',pass:validation.assignments===188,detail:validation.assignments + '/188 slot referenci'},
      {key:'altSr',label:'ALT SR',pass:altSrCount===188 && altApprovedPass,detail:altSrCount + '/188 • potvrđeno ' + altConfirmedCount + '/188'},
      {key:'altEn',label:'ALT EN',pass:altEnCount===188 && altApprovedPass,detail:altEnCount + '/188 • potvrđeno ' + altConfirmedCount + '/188'},
      {key:'compression',label:'KOMPRESIJA NOVIH UPLOAD-A',pass:uploadPass,detail:uploads.length ? uploads.length + ' upload-a provereno' : 'nema novih upload-a'},
      {key:'dimensions',label:'DIMENZIJE / FORMATI',pass:dimensionsStatus==='PASS',detail:dimensionsStatus==='PASS'?'proverene javne slike':'potrebno proveriti'},
      {key:'sitemap',label:'SITEMAP',pass:sitemapStatus==='PASS',detail:sitemapStatus==='PASS'?'sitemap.xml dostupan':'potrebno proveriti'},
      {key:'seo',label:'SEO / AEO / GEO POSLEDICE',pass:seoImpactStatus==='PASS',detail:seoImpactStatus==='PASS'?'ručno potvrđeno':'potrebna provera posledica izmene'},
      {key:'schema',label:'SCHEMA',pass:schemaPass,detail:schemaPass?'osnovni Product podaci validni':'nedostaju obavezni podaci'},
      {key:'broken',label:'BROKEN IMAGE CHECK',pass:brokenImageStatus==='PASS',detail:brokenImageStatus==='PASS'?'nema HTTP grešaka':'potrebno proveriti javne slike'},
      {key:'finalPreview',label:'FINALNI PUBLIC PREVIEW',pass:finalPublicPreviewStatus==='PASS',detail:finalPublicPreviewStatus==='PASS'?'ručno potvrđeno':'potrebno otvoriti i potvrditi javni preview'}
    ];
  }, [draftImageRows,draftSnapshot,draftProductIds,sitemapStatus,visualReviewStatus,seoImpactStatus,finalPublicPreviewStatus,publicMediaStatus,dimensionsStatus,brokenImageStatus,effectiveAltAudit,workflowValidationOk,slotAudit,auditProblems,validation]);

  const allPrePublishPass = prePublishChecks.every(check => check.pass);

  const generateAltForDraftImages = async () => {
    if (!draftImageRows.length || altGeneratingDraft) return;
    setAltGeneratingDraft(true);
    try {
      for (const row of draftImageRows) {
        if (row.altSr.trim() && row.altEn.trim()) continue;
        const product=(permanentProductsData as any[]).find(p=>p.id===row.productId);
        const result=await generateProductImageAlt({
          imageUrl: row.image,
          productNameSr: product?.name || row.productName,
          productNameEn: product?.nameEn || row.productName,
          keywords:[product?.category,...(product?.materials||[]),...(product?.craftTechniques||[])].filter(Boolean),
          imageRole: row.slot==='MAIN'?'main':row.slot==='G0'?'closeup':row.slot==='G1'?'interior':'model',
          apiKey:localStorage.getItem('koreni_gemini_api_key')||''
        });
        setAltSuggestions(prev=>({...prev,[row.key]:result}));
        setAltDrafts(prev=>({...prev,[row.key]:{alt:result.altSr,altEn:result.altEn}}));
      }
      setPublishResult('ALT SR + EN predlozi su pripremljeni za sve izmenjene slotove. Pregledajte ih pre APPROVE.');
    } finally { setAltGeneratingDraft(false); }
  };

  const checkDraftImages = async () => {
    let ok=true;
    for(const row of draftImageRows){
      await new Promise<void>(resolve=>{
        if(row.image.startsWith('data:image/')){resolve();return;}
        const img=new Image(); const timer=window.setTimeout(()=>{ok=false;resolve()},5000);
        img.onload=()=>{clearTimeout(timer);resolve()}; img.onerror=()=>{clearTimeout(timer);ok=false;resolve()}; img.src=row.image;
      });
    }
    setImageCheckStatus(ok?'PASS':'FAIL');
    setVisualReviewStatus('UNKNOWN');
  };

  const checkPublicMedia = async () => {
    const manifest = publicCustomProductsManifest.map((f:string) => '/custom_products/' + f);
    let broken=0, badDimensions=0, index=0;
    const worker=async()=>{ while(index<manifest.length){ const path=manifest[index++]; await new Promise<void>(resolve=>{
      const img=new Image(); const timer=window.setTimeout(()=>{broken++;resolve()},6000);
      img.onload=()=>{clearTimeout(timer); if(img.naturalWidth<=0||img.naturalHeight<=0||img.naturalWidth>10000||img.naturalHeight>10000) badDimensions++; resolve();};
      img.onerror=()=>{clearTimeout(timer);broken++;resolve();}; img.src=path+'?adminCheck=1';
    }); }};
    await Promise.all(Array.from({length:8},worker));
    const formatOk=manifest.every((p:string)=>/\.(jpe?g|png|webp|avif)$/i.test(p));
    const ok=broken===0;
    setPublicMediaStatus(ok?'PASS':'FAIL');
    setBrokenImageStatus(ok?'PASS':'FAIL');
    setDimensionsStatus(ok&&badDimensions===0&&formatOk?'PASS':'FAIL');
    setImageCheckStatus(ok?'PASS':'FAIL');
    setPublishResult(ok ? '504 javne slike proverene: nema broken image grešaka.' : 'Provera javnih slika je našla nedostupne fajlove. Publish ostaje zaključan.');
  };

  const checkSitemap = async () => {
    try {
      const r=await fetch('/sitemap.xml',{cache:'no-store'});
      const body=await r.text();
      const locs=[...body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m=>m[1].trim());
      const validXml=r.ok && /<urlset\b/i.test(body) && /<url>\s*<loc>/i.test(body) && locs.length > 0;
      const canonicalHost=locs.every(url => /^https:\/\/savremenikoreni\.com\//i.test(url));
      const homeIncluded=locs.some(url => url.replace(/\/$/,'') === 'https://savremenikoreni.com');
      setSitemapStatus(validXml && canonicalHost && homeIncluded ? 'PASS' : 'FAIL');
      setPublishResult(validXml && canonicalHost && homeIncluded
        ? `Sitemap PASS: ${locs.length} URL-ova, canonical domen i početna stranica provereni.`
        : 'Sitemap FAIL: XML, canonical domen ili početna URL provera nije prošla.');
    } catch { setSitemapStatus('FAIL'); setPublishResult('Sitemap FAIL: fajl nije dostupan za proveru.'); }
  };

  const confirmVisualReview = () => {
    setVisualReviewStatus('PASS');
    setPublishResult(draftImageRows.length ? 'Vizuelna provera novih fotografija je ručno potvrđena.' : 'Nema novih fotografija za vizuelnu proveru.');
  };
  const confirmSeoImpact = async () => {
    try {
      const r=await fetch('/',{cache:'no-store'});
      const html=await r.text();
      const title=(html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]||'').trim();
      const description=(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]||'').trim();
      const canonical=(html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]||'').trim();
      const jsonLd=[...html.matchAll(/<script[^>]+type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi)].map(m=>m[1]);
      const schemaValid=jsonLd.some(raw=>{try{const x=JSON.parse(raw);return Boolean(x && (x['@context']==='https://schema.org' || x['@graph']));}catch{return false;}});
      const pass=r.ok && Boolean(title) && Boolean(description) && /^https:\\/\\/savremenikoreni\\.com\\/?$/i.test(canonical) && schemaValid;
      setSeoImpactStatus(pass?'PASS':'UNKNOWN');
      setPublishResult(pass
        ? 'SEO/AEO/GEO osnovna provera PASS: title, description, canonical i JSON-LD postoje.'
        : 'SEO/AEO/GEO provera NIJE PASS: proverite title, meta description, canonical ili JSON-LD.');
    } catch {
      setSeoImpactStatus('UNKNOWN');
      setPublishResult('SEO/AEO/GEO provera nije mogla da se izvrši.');
    }
  };
  const confirmFinalPublicPreview = () => {
    window.open('/', '_blank', 'noopener,noreferrer');
    const confirmed = window.confirm('Da li ste pregledali javni sajt i potvrđujete da je finalni public preview ispravan?');
    if (confirmed) { setFinalPublicPreviewStatus('PASS'); setPublishResult('Finalni public preview je ručno potvrđen.'); }
    else { setFinalPublicPreviewStatus('UNKNOWN'); setPublishResult('Finalni public preview nije potvrđen.'); }
  };

  const publishApprovedDraft = async () => {
    if (workflowStage !== 'APPROVED') { setPublishResult('PUBLISH BLOKIRAN: prvo VALIDATE → PREVIEW → APPROVE.'); return; }
    if (!draftChangeCount) { setPublishResult('PUBLISH BLOKIRAN: nema novih Admin izmena za objavljivanje.'); return; }
    if (!allPrePublishPass) { setPublishResult('PUBLISH BLOKIRAN: sve PRE-PUBLISH kontrole moraju biti PASS.'); return; }
    if (!publishKey.trim()) { setPublishResult('PUBLISH BLOKIRAN: unesite ADMIN PUBLISH KEY.'); return; }
    setPublishBusy(true);
    try {
      const canonical: Record<string, any> = {};
      for (const p of (permanentProductsData as any[])) {
        canonical[p.id] = { image: p.image || '', images: Array.isArray(p.images) ? [...p.images] : [] };
      }
      const response = await fetch('/api/admin/publish', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publishKey: publishKey.trim(), assignments: draftSnapshot.assignments, canonical, removedProductIds: draftSnapshot.removedProductIds, removedMediaPaths: draftSnapshot.removedMediaPaths, uploads: draftSnapshot.uploads, altDrafts: Object.fromEntries(Object.entries(altDrafts).filter(([key]) => Boolean(altApproved[key]))) })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) throw new Error(result?.error || ('HTTP ' + response.status));
      sessionStorage.setItem('admin2_publish_key', publishKey.trim());
      setWorkflowStage('PUBLISHED');
      setPublishResult('PUBLISHED: GitHub commit ' + (result.commit || 'potvrđen') + ' • izmene: ' + draftChangeCount + ' • Cloudflare će nakon automatskog builda preuzeti novo stanje.');
    } catch (error) {
      setPublishResult('PUBLISH NIJE USPEO: ' + (error instanceof Error ? error.message : String(error)));
    } finally { setPublishBusy(false); }
  };

  const workflowPreviewChanges = useMemo<WorkflowPreviewChange[]>(() => {
    const slotIndex: Record<Slot, number> = { MAIN: 0, G0: 1, G1: 2, G2: 3 };
    const imageChanges: WorkflowPreviewChange[] = [];
    const draft = draftSnapshot.assignments || {};
    let uploads: any[] = [];
    try { uploads = JSON.parse(localStorage.getItem('admin2_media_v2') || '[]'); } catch {}
    const resolveDraftImage = (id: string) => {
      if (!id) return '';
      if (id.startsWith('repo-')) return '/custom_products/' + id.slice(5);
      const upload = uploads.find((x: any) => x.id === id);
      return upload?.data || id;
    };
    Object.entries(draft).forEach(([productId, slots]) => {
      const product = (permanentProductsData as any[]).find(p => p.id === productId);
      if (!product) return;
      const current = slotPaths(product);
      Object.entries(slots).forEach(([slotValue, imageId]) => {
        const slot = slotValue as Slot;
        if (!imageId) return;
        const newImage = resolveDraftImage(String(imageId));
        const oldImage = current[slot] || '';
        imageChanges.push({
          key: 'image:' + productId + ':' + slot,
          productId,
          productName: product.name,
          slot,
          path: newImage,
          oldSr: '',
          oldEn: '',
          newSr: '',
          newEn: '',
          source: 'Admin Image Workspace',
          valid: Boolean(newImage),
          kind: 'IMAGE',
          oldImage,
          newImage,
        });
      });
    });

    const altChanges = Object.entries(altDrafts).filter(([key]) => Boolean(altApproved[key])).map(([key, draft]) => {
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
        kind: 'ALT' as const,
      };
    });
    return [...imageChanges, ...altChanges];
  }, [altDrafts, altSuggestions, draftSnapshot]);

  const altProblems = altAudit.filter(x => x.status !== 'OK');

  const generateAllMissingAlt = async () => {
    if (altGenerating) return;
    const missing = effectiveAltAudit.filter(x => !x.effectiveSr || !x.effectiveEn);
    if (!missing.length) { setPublishResult('Svi ALT SR/EN već postoje.'); return; }
    for (const row of missing) await handleGenerateAltSuggestion(row);
    setPublishResult('Predlozi ALT SR + EN su generisani za sve nedostajuće slotove. Nijedan nije automatski odobren.');
  };

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
    const approvedKeys = Object.keys(altApproved).filter(key => altApproved[key] && altDrafts[key]?.alt?.trim() && altDrafts[key]?.altEn?.trim());
    localStorage.setItem('admin2_alt_approved_v2', JSON.stringify(altApproved));
    localStorage.setItem('admin2_alt_drafts_v2', JSON.stringify(altDrafts));
    setPublishResult(`${approvedKeys.length} ALT predloga je potvrđeno u DRAFT-u. Nema javnog upisa; PUBLISH endpoint ih obrađuje tek nakon pune kapije.`);
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
      const matchesFilter =
        mediaFilter === 'all' ||
        (mediaFilter === 'assigned' ? links.length > 0 :
        mediaFilter === 'unassigned' ? links.length === 0 :
        mediaFilter === 'newUpload' ? Boolean(m.isCustomUploaded) :
        false);
      const haystack = [m.id, m.title, m.category, m.imageUrl, ...(links.map(x => x.productName + ' ' + x.slot))].join(' ').toLowerCase();
      return matchesFilter && (!q || haystack.includes(q));
    });
  }, [mediaQuery, mediaFilter, mediaIndex]);

  const assignedMediaCount = useMemo(() => (permanentGalleryPhotosData as any[]).filter(m => (mediaIndex.get(m.imageUrl) || []).length > 0).length, [mediaIndex]);
  const unassignedMediaCount = permanentGalleryPhotosData.length - assignedMediaCount;
  const newUploadMediaCount = permanentGalleryPhotosData.filter(m => Boolean((m as any).isCustomUploaded)).length;

  return (
    <div className="min-h-screen bg-[#f7f3ed] text-[#241d19] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div><div className="text-xs font-bold tracking-[0.2em] text-[#9e3e26]">SAVREMENI KORENI</div><h1 className="text-3xl md:text-4xl font-bold mt-1">Admin 2.0</h1><p className="text-sm text-gray-600 mt-1">FAZA 2 — READ ONLY / VALIDACIJA</p></div>
          <div className="px-4 py-2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-sm font-semibold">DRAFT • BEZ FIZIČKOG BRISANJA • PUBLISH KONTROLISAN</div>
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
              <div className="font-bold mt-1">SLIKE + PROIZVODI + ALT</div>
              <div className="text-[10px] text-gray-500 mt-1">Izmene ostaju Draft dok ih ne odobrite i objavite.</div>
            </div>
          </div>
          <div className="mb-4 p-4 rounded-xl bg-[#fbfaf8] border-2 border-[#d8cec1]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><b>PRE-PUBLISH CHECKLIST</b><div className="text-[10px] text-gray-500">Svaka kontrola mora biti PASS pre PUBLISH.</div></div>
              <div className="flex flex-wrap gap-2">
                <button onClick={async()=>{ await generateAltForDraftImages(); }} disabled={!draftImageRows.length || altGeneratingDraft} className="px-3 py-2 rounded-lg border text-[10px] font-bold disabled:opacity-40">{altGeneratingDraft?'ALT...':'ALT ZA DRAFT SLIKE'}</button><button onClick={generateAllMissingAlt} disabled={Boolean(altGenerating)} className="px-3 py-2 rounded-lg border text-[10px] font-bold disabled:opacity-40">{altGenerating?'ALT...':'ALT ZA SVIH 188'}</button>
                <button onClick={checkPublicMedia} disabled={publicMediaStatus==='PASS'} className="px-3 py-2 rounded-lg border text-[10px] font-bold disabled:opacity-40">PROVERI 504 JAVNE SLIKE</button>
                <button onClick={checkDraftImages} className="px-3 py-2 rounded-lg border text-[10px] font-bold">PROVERI DRAFT SLIKE</button>
                <button onClick={checkSitemap} className="px-3 py-2 rounded-lg border text-[10px] font-bold">PROVERI SITEMAP</button>
                <button onClick={confirmVisualReview} className="px-3 py-2 rounded-lg border text-[10px] font-bold">POTVRDI VIZUELNU PROVERU</button>
                <button onClick={confirmSeoImpact} className="px-3 py-2 rounded-lg border text-[10px] font-bold">POTVRDI SEO/AEO/GEO</button>
                <button onClick={confirmFinalPublicPreview} className="px-3 py-2 rounded-lg border text-[10px] font-bold">FINALNI PUBLIC PREVIEW</button>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-2 mt-3">
              {prePublishChecks.map(c=><div key={c.key} className={c.pass?'p-3 rounded-lg border border-green-300 bg-green-50':'p-3 rounded-lg border border-amber-300 bg-amber-50'}>
                <div className={c.pass?'text-green-800 font-bold text-[10px]':'text-amber-900 font-bold text-[10px]'}>{c.pass?'✓ PASS':'○ ČEKA'} {c.label}</div>
                <div className="text-[10px] mt-1">{c.detail}</div>
              </div>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => {
              setDraftVersion(v => v + 1); setWorkflowStage('VALIDATE');
              setVisualReviewStatus('UNKNOWN'); setSeoImpactStatus('UNKNOWN'); setFinalPublicPreviewStatus('UNKNOWN');
              setPublicMediaStatus('UNKNOWN'); setDimensionsStatus('UNKNOWN'); setBrokenImageStatus('UNKNOWN');
              setPublishResult(draftChangeCount ? 'VALIDATE: osnovni integritet je potvrđen. Sada pokrenite PRE-PUBLISH kontrole.' : 'VALIDATE: osnovni integritet je potvrđen, ali nema Admin izmena.');
            }} className="px-4 py-2 rounded-xl border border-[#cdbfb0] text-xs font-bold">1. VALIDATE</button>
            <button disabled={workflowStage !== 'VALIDATE' || !workflowValidationOk || draftChangeCount === 0} onClick={() => { setWorkflowStage('PREVIEW'); setPreviewReviewed(false); setWorkflowPreviewOpen(true); setPublishResult('PREVIEW: proverite izabrane izmene pre APPROVE.'); }} className="px-4 py-2 rounded-xl border border-[#cdbfb0] text-xs font-bold disabled:opacity-40">2. PREVIEW</button>
            <button disabled={workflowStage !== 'PREVIEW' || !previewReviewed || !allPrePublishPass} onClick={() => {
              if (!allPrePublishPass) { setPublishResult('APPROVE BLOKIRAN: sve PRE-PUBLISH kontrole moraju biti PASS.'); return; }
              setWorkflowStage('APPROVED'); setWorkflowPreviewOpen(false); setPublishResult('APPROVE potvrđen: sve PRE-PUBLISH kontrole su PASS.');
            }} className="px-4 py-2 rounded-xl bg-[#241d19] text-white text-xs font-bold disabled:opacity-40">3. APPROVE</button>
            <button disabled={workflowStage !== 'APPROVED' || draftChangeCount === 0 || !allPrePublishPass || publishBusy} onClick={publishApprovedDraft} className="px-4 py-2 rounded-xl bg-green-700 text-white text-xs font-bold disabled:opacity-40">{publishBusy ? 'PUBLISH...' : '4. PUBLISH NA SAJT'}</button>
            <input type="password" value={publishKey} onChange={e => setPublishKey(e.target.value)} placeholder="ADMIN PUBLISH KEY" className="border rounded-xl px-3 py-2 text-xs w-48" />
          </div>
          {publishResult && <div className="mt-4 p-3 rounded-xl bg-[#f7f3ed] border border-[#d8cec1] text-xs font-semibold">{publishResult}</div>}
          <div className="mt-3 text-[10px] text-gray-500">Admin nacrt: <b>{draftChangeCount}</b> izmena • Workflow sada koristi /api/admin/publish; ništa se ne objavljuje bez APPROVE.</div>
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
            <Status ok={validation.missing.length === 0} text={'Sve reference postoje u javnom media manifestu: ' + (validation.missing.length === 0 ? 'DA' : 'NE')} />
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

        <AdminImageWorkspace />

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

    <div className="mt-5 text-xs text-gray-500">Izvor: permanentProductsData.ts + javni media manifest (504 fajla). Ova validacija putanja proverava fizički javni media manifest; ne menja proizvode, slike, GitHub niti Cloudflare.</div>
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
