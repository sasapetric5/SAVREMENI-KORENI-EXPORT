import React, { useMemo, useState } from 'react';
import { permanentGalleryPhotosData } from '../data/permanentGalleryPhotosData';
import { permanentProductsData } from '../data/permanentProductsData';

type Filter = 'ALL' | 'PRODUCT' | 'GALLERY' | 'UNUSED';

// This page intentionally works from the permanent reference index.
// It does NOT claim that reference records equal physical files on disk.
function classify(_path: string, assigned: boolean) {
  return assigned ? 'PRODUCT' : 'GALLERY';
}

export function AdminMediaLibraryPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<any | null>(null);

  const usage = useMemo(() => {
    const map = new Map<string, Array<{ product: string; slot: string }>>();
    (permanentProductsData as any[]).forEach(p => {
      const slots = [
        ['MAIN', p.image],
        ['G0', p.images?.[2]],
        ['G1', p.images?.[1]],
        ['G2', p.images?.[0]]
      ] as const;
      slots.forEach(([slot, path]) => {
        if (!path) return;
        const list = map.get(path) || [];
        list.push({ product: p.name, slot });
        map.set(path, list);
      });
    });
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('sr-Latn');
    return (permanentGalleryPhotosData as any[]).filter(m => {
      const links = usage.get(m.imageUrl) || [];
      const kind = classify(m.imageUrl, links.length > 0);
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'PRODUCT' && kind === 'PRODUCT') ||
        (filter === 'GALLERY' && kind === 'GALLERY') ||
        (filter === 'UNUSED' && links.length === 0);
      const haystack = [m.id, m.title, m.titleEn, m.category, m.imageUrl, ...links.map(x => x.product + ' ' + x.slot)]
        .join(' ').toLocaleLowerCase('sr-Latn');
      return matchesFilter && (!q || haystack.includes(q));
    });
  }, [query, filter, usage]);

  const assignedCount = (permanentGalleryPhotosData as any[]).filter(m => (usage.get(m.imageUrl) || []).length).length;
  const unusedCount = permanentGalleryPhotosData.length - assignedCount;
  const uniquePathCount = new Set((permanentGalleryPhotosData as any[]).map(m => m.imageUrl).filter(Boolean)).size;
  const duplicateReferenceCount = permanentGalleryPhotosData.length - uniquePathCount;
  const assignmentCount = [...usage.values()].reduce((sum, links) => sum + links.length, 0);
  const referencedProductPaths = new Set([...usage.keys()]);
  const missingReferenceCount = [...referencedProductPaths].filter(path => !(permanentGalleryPhotosData as any[]).some(m => m.imageUrl === path)).length;

  return (
    <div className="min-h-screen bg-[#f6f1e9] text-[#241d19]">
      <header className="sticky top-0 z-40 border-b border-[#ded3c7] bg-white/95 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold tracking-[0.24em] text-[#9e3e26]">SAVREMENI KORENI • ADMIN 2.0</div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">🖼 Media / Biblioteka</h1>
            <p className="text-xs text-gray-500 mt-1">FAZA 1 — READ ONLY • pregled postojećih medija</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin-v2" className="px-4 py-2 rounded-xl border border-[#cdbfb0] bg-white text-sm font-semibold">← Admin 2.0</a>
            <span className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center">NEMA UPISA • NEMA BRISANJA</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-8">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Stat label="REFERENCE ZAPISI" value={permanentGalleryPhotosData.length} note="trenutni permanent index" />
          <Stat label="POVEZANO" value={assignedCount} note="jedinstvenih referenci sa proizvodom" />
          <Stat label="NEPOVEZANO" value={unusedCount} note="referentnih zapisa bez product veze" />
          <Stat label="PROIZVODI" value={permanentProductsData.length} note="referentni katalog" />
        </section>

        <section className="bg-white rounded-2xl border border-[#ded3c7] shadow-sm p-4 md:p-5 mb-6">
          <div className="text-[10px] font-bold tracking-[0.18em] text-[#9e3e26]">A / B / C / D INVENTAR — SAMO ČITANJE</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
            <Stat label="A • REFERENCE" value={permanentGalleryPhotosData.length} note="zapisi u indeksu" />
            <Stat label="A • UNIQUE PATH" value={uniquePathCount} note="jedinstvenih putanja" />
            <Stat label="B • ASSIGNMENTS" value={assignmentCount} note="47 × 4 očekivanje" />
            <Stat label="C • DUPLIKATI" value={duplicateReferenceCount} note="duplirani reference zapisi" />
            <Stat label="D • MISSING REF" value={missingReferenceCount} note="product putanje bez reference" />
          </div>
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <b>Važno:</b> ovde još ne tvrdimo koliko fizičkih fajlova postoji na disku/ZIP-u. To je zaseban <b>B — PHYSICAL INVENTORY</b> korak. Takođe, slotovi MAIN/G0/G1/G2 su trenutno referentno mapirani iz postojećeg product modela; njihova <b>vizuelna semantika nije potvrđena</b>.
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#ded3c7] shadow-sm p-4 md:p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Pretraži fajl, ID, naziv, kategoriju ili proizvod..."
              className="flex-1 px-4 py-3 rounded-xl border border-[#cdbfb0] outline-none focus:ring-2 focus:ring-[#9e3e26]"
            />
            <div className="flex flex-wrap gap-2">
              {([
                ['ALL', 'Sve'],
                ['PRODUCT', 'Proizvodne'],
                ['GALLERY', 'Galerija / ostalo'],
                ['UNUSED', 'Nepovezane']
              ] as [Filter, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={filter === key ? 'px-4 py-2 rounded-xl bg-[#241d19] text-white text-sm font-bold' : 'px-4 py-2 rounded-xl border border-[#cdbfb0] bg-white text-sm font-semibold'}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">Prikazano: <b>{filtered.length}</b> / {permanentGalleryPhotosData.length}</div>
        </section>

        <section className="bg-white rounded-2xl border border-[#ded3c7] shadow-sm p-4 md:p-6">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500">Nema rezultata za zadati filter/pretragu.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {filtered.map((m: any) => {
                const links = usage.get(m.imageUrl) || [];
                return (
                  <button key={m.id + m.imageUrl} onClick={() => setSelected(m)}
                    className="text-left rounded-xl border border-[#e5ddd4] bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <div className="aspect-square bg-[#eee8df] relative">
                      <img src={m.imageUrl} alt={m.title || m.id} loading="lazy" className="w-full h-full object-cover" />
                      <span className={links.length ? 'absolute top-2 left-2 px-2 py-1 rounded-lg bg-green-700 text-white text-[9px] font-bold' : 'absolute top-2 left-2 px-2 py-1 rounded-lg bg-gray-700 text-white text-[9px] font-bold'}>
                        {links.length ? 'POVEZANA' : 'NEPOVEZANA'}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <div className="text-[10px] font-bold truncate" title={m.id}>{m.id}</div>
                      <div className="text-[10px] text-gray-500 truncate">{m.title || 'Bez naslova'}</div>
                      <div className="text-[9px] text-gray-500 truncate mt-1">{m.imageUrl}</div>
                      {links.length > 0 && <div className="mt-1 text-[9px] font-bold">{links.map(x => x.slot).join(' • ')}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-[10px] tracking-[0.18em] font-bold text-[#9e3e26]">MEDIA ASSET • READ ONLY</div>
                <h2 className="text-xl font-bold mt-1">{selected.title || selected.id}</h2>
                <div className="text-xs text-gray-500 break-all mt-1">{selected.imageUrl}</div>
              </div>
              <button onClick={() => setSelected(null)} className="px-3 py-2 rounded-xl bg-gray-100 font-semibold">Zatvori</button>
            </div>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5">
              <div className="rounded-xl bg-[#eee8df] p-2">
                <img src={selected.imageUrl} alt={selected.title || selected.id} className="w-full max-h-[65vh] object-contain rounded-lg" />
              </div>
              <div className="space-y-3">
                <Info label="ID" value={selected.id} />
                <Info label="Naziv" value={selected.title || '—'} />
                <Info label="Kategorija" value={selected.category || '—'} />
                <Info label="Putanja" value={selected.imageUrl || '—'} />
                <div className="rounded-xl bg-[#f6f1e9] p-3">
                  <div className="text-[10px] font-bold tracking-wider mb-2">KORIŠĆENJE</div>
                  {(usage.get(selected.imageUrl) || []).length
                    ? usage.get(selected.imageUrl)!.map(x => <div key={x.product + x.slot} className="text-sm py-1 border-b border-[#ded3c7] last:border-0">{x.product} — <b>{x.slot}</b></div>)
                    : <div className="text-sm text-gray-500">Nije povezana sa proizvodnim slotom.</div>}
                </div>
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  Ova faza je samo pregled. Originalni fajl, proizvodni podaci i assignments se ne menjaju.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({label,value,note}:{label:string;value:number;note:string}) {
  return <div className="bg-white rounded-2xl border border-[#ded3c7] p-4 shadow-sm"><div className="text-[10px] tracking-wider text-gray-500 font-bold">{label}</div><div className="text-2xl md:text-3xl font-bold mt-1">{value}</div><div className="text-[10px] text-gray-500 mt-1">{note}</div></div>;
}
function Info({label,value}:{label:string;value:string}) {
  return <div className="rounded-xl border border-[#ded3c7] p-3"><div className="text-[10px] font-bold text-gray-500">{label}</div><div className="text-xs break-all mt-1">{value}</div></div>;
}
