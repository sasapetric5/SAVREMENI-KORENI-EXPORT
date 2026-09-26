import React, { useEffect, useMemo, useState } from 'react';
import { permanentProductsData } from '../data/permanentProductsData';
import { permanentGalleryPhotosData } from '../data/permanentGalleryPhotosData';

type Slot = 'MAIN' | 'G0' | 'G1' | 'G2';
type DraftAssignments = Record<string, Partial<Record<Slot, string>>>;

const KEY = 'savremeni_koreni_admin_product_image_drafts_v1';

function readDrafts(): DraftAssignments {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function writeDrafts(value: DraftAssignments) {
  localStorage.setItem(KEY, JSON.stringify(value));
}

function currentSlots(p: any): Record<Slot, string> {
  return {
    MAIN: p.image || '',
    // Legacy array order is preserved only for read/display compatibility.
    G0: p.images?.[2] || '',
    G1: p.images?.[1] || '',
    G2: p.images?.[0] || ''
  };
}

function label(slot: Slot) {
  return slot === 'MAIN' ? 'MAIN — Glavna' :
    slot === 'G0' ? 'G0 — Krupan plan' :
    slot === 'G1' ? 'G1 — Otvoren proizvod' : 'G2 — Model / maneken';
}

export function AdminProductImageManagerPage() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(permanentProductsData[0]?.id || '');
  const [drafts, setDrafts] = useState<DraftAssignments>(readDrafts);
  const [picker, setPicker] = useState<{slot: Slot} | null>(null);
  const [mediaQuery, setMediaQuery] = useState('');
  const [message, setMessage] = useState('');

  const products = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('sr-Latn');
    return (permanentProductsData as any[]).filter(p =>
      !q || [p.name, p.nameEn, p.category, p.id].join(' ').toLocaleLowerCase('sr-Latn').includes(q)
    );
  }, [query]);

  const product = (permanentProductsData as any[]).find(p => p.id === selectedId) || products[0];
  const media = useMemo(() => {
    const q = mediaQuery.trim().toLocaleLowerCase('sr-Latn');
    return (permanentGalleryPhotosData as any[]).filter(m =>
      !q || [m.id, m.title, m.titleEn, m.category, m.imageUrl].join(' ').toLocaleLowerCase('sr-Latn').includes(q)
    );
  }, [mediaQuery]);

  useEffect(() => {
    if (product && product.id !== selectedId) setSelectedId(product.id);
  }, [products.length]);

  if (!product) return <div className="p-8">Nema proizvoda.</div>;

  const base = currentSlots(product);
  const effective = (slot: Slot) => drafts[product.id]?.[slot] || base[slot];

  const choose = (slot: Slot, imageUrl: string) => {
    const next = { ...drafts, [product.id]: { ...(drafts[product.id] || {}), [slot]: imageUrl } };
    setDrafts(next);
    writeDrafts(next);
    setPicker(null);
    setMessage(label(slot) + ' je promenjen samo u Admin draftu. Javni sajt još nije menjan.');
  };

  const resetProduct = () => {
    const next = { ...drafts };
    delete next[product.id];
    setDrafts(next);
    writeDrafts(next);
    setMessage('Draft ovog proizvoda je vraćen na postojeće stanje.');
  };

  return <div className="min-h-screen bg-[#f6f1e9] text-[#241d19]">
    <header className="sticky top-0 z-40 border-b border-[#ded3c7] bg-white/95 backdrop-blur">
      <div className="max-w-[1700px] mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold tracking-[0.24em] text-[#9e3e26]">SAVREMENI KORENI • ADMIN 2.0</div>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">🖼 Product Image Manager</h1>
          <p className="text-xs text-gray-500 mt-1">FAZA 3B — VIZUELNA DODELA MAIN / G0 / G1 / G2</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin-v2" className="px-4 py-2 rounded-xl border border-[#cdbfb0] bg-white text-sm font-semibold">← Admin 2.0</a>
          <a href="/admin-v2/media" className="px-4 py-2 rounded-xl border border-[#cdbfb0] bg-white text-sm font-semibold">Media Library</a>
        </div>
      </div>
    </header>

    <main className="max-w-[1700px] mx-auto p-4 md:p-8">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 mb-6 text-sm text-amber-950">
        <b>BEZBEDNOSNI REŽIM:</b> izbori se trenutno čuvaju kao Admin draft u ovom browseru.
        Ne menjaju permanentProductsData, 47 proizvoda, fizičke fajlove niti javni Cloudflare sajt.
        Nema automatskog publish-a.
      </div>

      <div className="grid lg:grid-cols-[330px_minmax(0,1fr)] gap-5">
        <aside className="bg-white rounded-2xl border border-[#ded3c7] overflow-hidden">
          <div className="p-4 border-b border-[#eee6de]">
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pretraži proizvod..." className="w-full px-3 py-2.5 rounded-xl border border-[#cdbfb0]" />
            <div className="text-xs text-gray-500 mt-2">{products.length} / 47 proizvoda</div>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {products.map(p => <button key={p.id} onClick={()=>{setSelectedId(p.id);setMessage('')}} className={'w-full text-left p-3 border-b border-[#eee6de] '+(p.id===product.id?'bg-[#f2e8dd]':'hover:bg-[#faf7f2]')}>
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-[10px] text-gray-500">{p.category} • {p.id}</div>
              {drafts[p.id] && <div className="text-[9px] font-bold text-amber-700 mt-1">IMA DRAFT IZMENU</div>}
            </button>)}
          </div>
        </aside>

        <section className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#ded3c7] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="text-[10px] text-gray-500 font-bold">PROIZVOD</div><h2 className="text-2xl font-bold">{product.name}</h2><div className="text-xs text-gray-500 mt-1">{product.id}</div></div>
              <button onClick={resetProduct} className="px-3 py-2 rounded-xl border border-red-200 text-red-700 text-xs font-bold">Vrati ovaj proizvod</button>
            </div>
            {message && <div className="mt-4 rounded-xl border border-[#cdbfb0] bg-[#f6f1e9] p-3 text-xs font-semibold">{message}</div>}
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {(['MAIN','G0','G1','G2'] as Slot[]).map(slot => {
              const src = effective(slot);
              const changed = Boolean(drafts[product.id]?.[slot]);
              return <div key={slot} className="bg-white rounded-2xl border border-[#ded3c7] overflow-hidden">
                <div className="aspect-[4/3] bg-[#eee8df]"><img src={src} alt={label(slot)} className="w-full h-full object-contain" /></div>
                <div className="p-3">
                  <div className="font-bold text-sm">{label(slot)}</div>
                  <div className="text-[9px] text-gray-500 truncate mt-1">{src}</div>
                  {changed && <div className="text-[9px] font-bold text-amber-700 mt-1">DRAFT IZMENJENO</div>}
                  <button onClick={()=>{setPicker({slot});setMediaQuery('')}} className="w-full mt-3 px-3 py-2 rounded-xl bg-[#241d19] text-white text-xs font-bold">Zameni sliku</button>
                </div>
              </div>;
            })}
          </div>

          <div className="bg-white rounded-2xl border border-[#ded3c7] p-5">
            <div className="font-bold">Trenutni režim</div>
            <p className="text-xs text-gray-600 mt-2">Ovaj ekran namerno ne koristi naziv fajla kao dokaz da je fotografija MAIN, G0, G1 ili G2. U sledećem koraku draft će dobiti trajni Media ID assignment model.</p>
          </div>
        </section>
      </div>
    </main>

    {picker && <div className="fixed inset-0 z-50 bg-black/70 p-3 md:p-6 flex items-center justify-center" onClick={()=>setPicker(null)}>
      <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[94vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="p-4 border-b border-[#ded3c7] flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-[10px] text-gray-500 font-bold">IZBOR FOTOGRAFIJE</div><h3 className="text-xl font-bold">{label(picker.slot)}</h3></div>
          <input value={mediaQuery} onChange={e=>setMediaQuery(e.target.value)} placeholder="Pretraži biblioteku..." className="w-full md:w-80 px-3 py-2.5 rounded-xl border border-[#cdbfb0]" />
          <button onClick={()=>setPicker(null)} className="px-3 py-2 rounded-xl bg-gray-100 text-sm">Zatvori</button>
        </div>
        <div className="p-4 overflow-auto max-h-[78vh]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {media.map(m => <button key={m.id} onClick={()=>choose(picker.slot,m.imageUrl)} className="text-left rounded-xl border border-[#e5ddd4] overflow-hidden hover:shadow-lg bg-white">
              <div className="aspect-square bg-[#eee8df]"><img src={m.imageUrl} alt={m.title||m.id} loading="lazy" className="w-full h-full object-cover" /></div>
              <div className="p-2"><div className="text-[10px] font-bold truncate">{m.title||m.id}</div><div className="text-[9px] text-gray-500 truncate">{m.imageUrl}</div></div>
            </button>)}
          </div>
          {!media.length && <div className="p-8 text-center text-sm text-gray-500">Nema rezultata.</div>}
        </div>
      </div>
    </div>}
  </div>;
}
