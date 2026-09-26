import React, { useEffect, useMemo, useState } from 'react';
import { permanentGalleryPhotosData } from '../data/permanentGalleryPhotosData';
import { permanentProductsData } from '../data/permanentProductsData';
import { addAdminMediaFile, AdminMediaMeta, loadAdminUploadedMedia, setMediaSiteVisibility, updateAdminMediaMeta } from '../utils/adminMediaStorage';

type Filter = 'ALL' | 'USED' | 'UNUSED' | 'HIDDEN' | 'UPLOADED';
type Row = AdminMediaMeta & { source: 'PERMANENT' | 'UPLOADED'; hiddenFromSite: boolean };

function buildUsage() {
  const map = new Map<string, Array<{ product: string; slot: string }>>();
  (permanentProductsData as any[]).forEach(p => {
    [['MAIN', p.image], ['G0', p.images?.[2]], ['G1', p.images?.[1]], ['G2', p.images?.[0]]].forEach(([slot, path]) => {
      if (!path) return;
      const list = map.get(String(path)) || [];
      list.push({ product: p.name, slot: String(slot) });
      map.set(String(path), list);
    });
  });
  return map;
}

export function AdminMediaLibraryPage() {
  const [uploaded, setUploaded] = useState<AdminMediaMeta[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const usage = useMemo(buildUsage, []);

  const reload = async () => setUploaded(await loadAdminUploadedMedia());
  useEffect(() => {
    try {
      const x = JSON.parse(localStorage.getItem('savremeni_koreni_admin_hidden_media_v1') || '[]');
      setHidden(new Set(Array.isArray(x) ? x.map(String) : []));
    } catch {}
    reload();
    const fn = () => reload();
    window.addEventListener('admin-media-updated', fn);
    return () => window.removeEventListener('admin-media-updated', fn);
  }, []);

  const rows = useMemo<Row[]>(() => [
    ...(permanentGalleryPhotosData as any[]).map(m => ({ ...m, source: 'PERMANENT' as const, hiddenFromSite: hidden.has(String(m.id)) })),
    ...uploaded.map(m => ({ ...m, source: 'UPLOADED' as const, hiddenFromSite: Boolean(m.hiddenFromSite) }))
  ], [uploaded, hidden]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('sr-Latn');
    return rows.filter(m => {
      const used = (usage.get(m.imageUrl) || []).length > 0;
      const ok = filter === 'ALL' || (filter === 'USED' && used) || (filter === 'UNUSED' && !used) || (filter === 'HIDDEN' && m.hiddenFromSite) || (filter === 'UPLOADED' && m.source === 'UPLOADED');
      const hay = [m.id, m.title, m.titleEn, m.category, m.imageUrl, m.originalName].join(' ').toLocaleLowerCase('sr-Latn');
      return ok && (!q || hay.includes(q));
    });
  }, [rows, query, filter, usage]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setMessage('');
    try {
      for (const file of Array.from(files)) await addAdminMediaFile(file);
      await reload();
      setMessage('Upload završen. Originalni postojeći mediji nisu menjani.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Upload nije uspeo.'); }
    finally { setBusy(false); }
  };

  const toggle = async (row: Row) => {
    setBusy(true);
    try {
      if (row.source === 'UPLOADED') {
        await setMediaSiteVisibility(row.id, row.hiddenFromSite);
      } else {
        const next = new Set(hidden);
        if (row.hiddenFromSite) next.delete(String(row.id)); else next.add(String(row.id));
        setHidden(next);
        localStorage.setItem('savremeni_koreni_admin_hidden_media_v1', JSON.stringify([...next]));
        window.dispatchEvent(new CustomEvent('admin-media-updated'));
      }
      setSelected(null);
      setMessage(row.hiddenFromSite ? 'Slika je vraćena.' : 'Slika je označena za uklanjanje sa sajta. Original ostaje u biblioteci.');
    } finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-[#f6f1e9] text-[#241d19]">
    <header className="sticky top-0 z-40 border-b border-[#ded3c7] bg-white/95 backdrop-blur">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div><div className="text-[10px] font-bold tracking-[0.24em] text-[#9e3e26]">SAVREMENI KORENI • ADMIN 2.0</div><h1 className="text-2xl md:text-3xl font-bold mt-1">🖼 Media Manager</h1><p className="text-xs text-gray-500 mt-1">FAZA 3A — NEDESTRUKTIVNO UPRAVLJANJE MEDIJIMA</p></div>
        <div className="flex gap-2">
          <label className="px-4 py-2 rounded-xl bg-[#241d19] text-white text-sm font-bold cursor-pointer">{busy ? 'RAD...' : '+ Dodaj slike'}<input type="file" accept="image/*" multiple className="hidden" disabled={busy} onChange={e => upload(e.target.files)} /></label>
          <a href="/admin-v2" className="px-4 py-2 rounded-xl border border-[#cdbfb0] bg-white text-sm font-semibold">← Admin 2.0</a>
        </div>
      </div>
    </header>
    <main className="max-w-[1600px] mx-auto p-4 md:p-8">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Stat label="SVE U BIBLIOTECI" value={rows.length} note="permanent + upload" />
        <Stat label="POVEZANO" value={rows.filter(x => (usage.get(x.imageUrl)||[]).length).length} note="trenutne veze" />
        <Stat label="NEPOVEZANO" value={rows.filter(x => !(usage.get(x.imageUrl)||[]).length).length} note="bez product veze" />
        <Stat label="PERMANENT" value={rows.filter(x => x.source==='PERMANENT').length} note="originali" />
        <Stat label="NOVI UPLOAD" value={uploaded.length} note="IndexedDB" />
      </div>
      <section className="bg-white rounded-2xl border border-[#ded3c7] p-4 md:p-5 mb-6">
        <div className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-900 mb-4"><b>BEZBEDNOSNO PRAVILO:</b> Ukloni sa sajta nikada ne znači DELETE. Original ostaje u biblioteci.</div>
        {message && <div className="rounded-xl border border-[#cdbfb0] bg-[#f6f1e9] p-3 text-xs font-semibold mb-4">{message}</div>}
        <div className="flex flex-col lg:flex-row gap-3">
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pretraži naziv, fajl ili kategoriju..." className="flex-1 px-4 py-3 rounded-xl border border-[#cdbfb0]" />
          <div className="flex flex-wrap gap-2">{([['ALL','Sve'],['USED','Korišćene'],['UNUSED','Nepovezane'],['HIDDEN','Uklonjene'],['UPLOADED','Novi upload']] as [Filter,string][]).map(([k,l])=><button key={k} onClick={()=>setFilter(k)} className={filter===k?'px-3 py-2 rounded-xl bg-[#241d19] text-white text-xs font-bold':'px-3 py-2 rounded-xl border border-[#cdbfb0] bg-white text-xs font-semibold'}>{l}</button>)}</div>
        </div>
        <div className="mt-3 text-xs text-gray-500">Prikaz: <b>{filtered.length}</b> / {rows.length}</div>
      </section>
      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {filtered.map(m => {
          const links=usage.get(m.imageUrl)||[];
          return <button key={m.source+m.id} onClick={()=>setSelected(m)} className="text-left rounded-xl border border-[#e5ddd4] bg-white overflow-hidden hover:shadow-lg">
            <div className="aspect-square bg-[#eee8df] relative"><img src={m.imageUrl} alt={m.title||m.id} loading="lazy" className={'w-full h-full object-cover '+(m.hiddenFromSite?'opacity-45 grayscale':'')} /><span className={(m.hiddenFromSite?'bg-red-700':'bg-green-700')+' absolute top-2 left-2 px-2 py-1 rounded-lg text-white text-[9px] font-bold'}>{m.hiddenFromSite?'UKLONJENA':m.source==='UPLOADED'?'NOVO':'AKTIVNA'}</span></div>
            <div className="p-2.5"><div className="text-[10px] font-bold truncate">{m.title||m.id}</div><div className="text-[9px] text-gray-500 truncate">{m.originalName||m.imageUrl}</div>{links.length>0&&<div className="mt-1 text-[9px] font-bold">{links.map(x=>x.product+' • '+x.slot).join(' | ')}</div>}</div>
          </button>;
        })}
      </section>
    </main>
    {selected&&<MediaModal row={selected} usage={usage.get(selected.imageUrl)||[]} busy={busy} onClose={()=>setSelected(null)} onToggle={()=>toggle(selected)} onSaved={async patch=>{if(selected.source==='UPLOADED'){await updateAdminMediaMeta(selected.id,patch);await reload();setMessage('Metapodaci sačuvani.')}}}/>}
  </div>;
}

function MediaModal({row,usage,busy,onClose,onToggle,onSaved}:{row:Row;usage:Array<{product:string;slot:string}>;busy:boolean;onClose:()=>void;onToggle:()=>void;onSaved:(p:Partial<AdminMediaMeta>)=>Promise<void>}) {
  const [title,setTitle]=useState(row.title||''); const [alt,setAlt]=useState((row as any).alt||''); const [altEn,setAltEn]=useState((row as any).altEn||'');
  return <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" onClick={onClose}><div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-auto p-5" onClick={e=>e.stopPropagation()}>
    <div className="flex justify-between gap-3 mb-4"><div><div className="text-[10px] font-bold text-[#9e3e26]">MEDIA ASSET</div><h2 className="text-xl font-bold">{row.title||row.id}</h2></div><button onClick={onClose} className="px-3 py-2 rounded-xl bg-gray-100">Zatvori</button></div>
    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5"><div className="rounded-xl bg-[#eee8df] p-2 flex items-center justify-center"><img src={row.imageUrl} alt={row.title||row.id} className="w-full max-h-[68vh] object-contain rounded-lg"/></div>
    <div className="space-y-3"><Info label="Izvor" value={row.source==='PERMANENT'?'PERMANENT — original ostaje':'ADMIN UPLOAD — IndexedDB'}/><Info label="Korišćenje" value={usage.length?usage.map(x=>x.product+' / '+x.slot).join(', '):'Nije vezana za proizvod'}/>
    {row.source==='UPLOADED'&&<><Field label="Naziv" value={title} onChange={setTitle}/><Field label="ALT SR" value={alt} onChange={setAlt}/><Field label="ALT EN" value={altEn} onChange={setAltEn}/><button disabled={busy} onClick={()=>onSaved({title,alt,altEn})} className="w-full px-4 py-2 rounded-xl bg-[#241d19] text-white text-sm font-bold">Sačuvaj metapodatke</button></>}
    <button disabled={busy} onClick={onToggle} className={row.hiddenFromSite?'w-full px-4 py-2 rounded-xl bg-green-700 text-white font-bold':'w-full px-4 py-2 rounded-xl bg-red-700 text-white font-bold'}>{row.hiddenFromSite?'Vrati na sajt':'Ukloni sa sajta (NE BRIŠI)'}</button>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Sledeća faza povezuje Media ID direktno sa MAIN/G0/G1/G2, Galerijom, Blogom, Landing Page i Početnom. Ovaj ekran namerno ne menja postojeći mapping.</div></div></div>
  </div></div>;
}
function Field({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="block text-xs font-semibold">{label}<input value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-[#cdbfb0]"/></label>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-[#ded3c7] p-3"><div className="text-[10px] font-bold text-gray-500">{label}</div><div className="text-xs break-all mt-1">{value}</div></div>}
function Stat({label,value,note}:{label:string;value:number;note:string}){return <div className="bg-white rounded-2xl border border-[#ded3c7] p-4 shadow-sm"><div className="text-[10px] tracking-wider text-gray-500 font-bold">{label}</div><div className="text-2xl md:text-3xl font-bold mt-1">{value}</div><div className="text-[10px] text-gray-500 mt-1">{note}</div></div>}
