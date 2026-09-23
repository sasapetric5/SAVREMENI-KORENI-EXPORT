import React, { useMemo, useState } from 'react';
import { permanentProductsData } from '../data/permanentProductsData';
import { permanentGalleryPhotosData } from '../data/permanentGalleryPhotosData';

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
