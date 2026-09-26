import React, { useEffect, useMemo, useState } from 'react';
import { permanentProductsData } from '../data/permanentProductsData';
import { permanentGalleryPhotosData } from '../data/permanentGalleryPhotosData';

type Slot = 'MAIN' | 'G0' | 'G1' | 'G2';
const slots: Slot[] = ['MAIN', 'G0', 'G1', 'G2'];

const getSlots = (p: any): Record<Slot, string> => ({
  MAIN: p.image || '',
  G0: p.images?.[2] || '',
  G1: p.images?.[1] || '',
  G2: p.images?.[0] || '',
});

type PhysicalStatus = 'CHECKING' | 'FOUND' | 'MISSING' | 'ERROR';

export function AdminMediaIntegrityAuditPage() {
  const products = permanentProductsData as any[];
  const media = permanentGalleryPhotosData as any[];

  const rows = useMemo(() => products.flatMap(p => {
    const s = getSlots(p);
    return slots.map(slot => ({
      key: p.id + ':' + slot,
      productId: p.id,
      productName: p.name,
      slot,
      path: s[slot],
      inIndex: Boolean(s[slot] && media.some(m => m.imageUrl === s[slot])),
    }));
  }), [products, media]);

  const [physical, setPhysical] = useState<Record<string, PhysicalStatus>>({});

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const next: Record<string, PhysicalStatus> = {};
      await Promise.all(rows.map(async row => {
        if (!row.path) {
          next[row.key] = 'MISSING';
          return;
        }
        try {
          const response = await fetch(row.path, { method: 'HEAD', cache: 'no-store' });
          next[row.key] = response.ok ? 'FOUND' : 'MISSING';
        } catch {
          next[row.key] = 'ERROR';
        }
      }));
      if (!cancelled) setPhysical(next);
    };
    check();
    return () => { cancelled = true; };
  }, [rows]);

  const pathOwners = useMemo(() => {
    const map = new Map<string, string[]>();
    rows.forEach(r => {
      if (!r.path) return;
      const list = map.get(r.path) || [];
      list.push(r.productName + ' / ' + r.slot);
      map.set(r.path, list);
    });
    return map;
  }, [rows]);

  const missingIndex = rows.filter(r => !r.path || !r.inIndex);
  const physicalMissing = rows.filter(r => physical[r.key] === 'MISSING');
  const physicalChecking = rows.filter(r => !physical[r.key] || physical[r.key] === 'CHECKING');
  const duplicates = rows.filter(r => r.path && (pathOwners.get(r.path)?.length || 0) > 1);

  const productSummary = useMemo(() => products.map(p => {
    const productRows = rows.filter(r => r.productId === p.id);
    return {
      id: p.id,
      name: p.name,
      complete: productRows.length === 4 && productRows.every(r => Boolean(r.path)),
      indexed: productRows.every(r => r.inIndex),
      physical: productRows.every(r => physical[r.key] === 'FOUND'),
    };
  }), [products, rows, physical]);

  return (
    <div className="min-h-screen bg-[#f7f3ed] text-[#241d19] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <div className="text-xs font-bold tracking-[0.2em] text-[#9e3e26]">SAVREMENI KORENI • ADMIN 2.0</div>
            <h1 className="text-3xl font-bold mt-1">Media Integrity Audit</h1>
            <p className="text-sm text-gray-600 mt-1">FAZA 3B — READ ONLY • 47 × 4 kontrola bez ikakvog upisa</p>
          </div>
          <div className="px-4 py-2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
            NEMA UPISA • NEMA BRISANJA • NEMA REMAPIRANJA
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <AuditCard label="PROIZVODI" value={products.length} target="47" ok={products.length === 47} />
          <AuditCard label="SLOTOVI" value={rows.length} target="188" ok={rows.length === 188} />
          <AuditCard label="U MEDIA INDEKSU" value={rows.filter(r => r.inIndex).length} target="188" ok={rows.every(r => r.inIndex)} />
          <AuditCard label="FIZIČKI PRONAĐENO" value={rows.filter(r => physical[r.key] === 'FOUND').length} target="188" ok={rows.length === 188 && rows.every(r => physical[r.key] === 'FOUND')} />
          <AuditCard label="DUPLIKATI" value={duplicates.length} target="0*" ok={duplicates.length === 0} />
        </div>

        <div className="rounded-2xl bg-white border-2 border-[#9e3e26] p-5 mb-6">
          <h2 className="font-bold text-lg">Šta ovaj audit dokazuje?</h2>
          <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
            <Info title="1. Referenca" text="Da li proizvod ima putanju za MAIN/G0/G1/G2." />
            <Info title="2. Indeks" text="Da li se ta putanja nalazi u permanentGalleryPhotosData." />
            <Info title="3. Fajl" text="Da li browser može fizički da dohvati navedeni fajl sa sajta." />
          </div>
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            VAŽNO: ovaj ekran ne odlučuje da li je fotografija semantički ispravna. Ne pretpostavlja da naziv fajla određuje MAIN/G0/G1/G2. Vizuelna potvrda uloga dolazi tek nakon tehničkog audita.
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#e8e0d5] p-5 mb-6">
          <div className="flex flex-wrap justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-lg">47 × 4 — kompletna kontrolna tabela</h2>
              <p className="text-xs text-gray-500 mt-1">Trenutna legacy mapa se samo čita; ništa se ne menja.</p>
            </div>
            <a href="/admin-v2" className="px-4 py-2 rounded-xl bg-[#241d19] text-white text-xs font-bold">← Admin 2.0</a>
          </div>

          <div className="overflow-auto max-h-[70vh] border rounded-xl">
            <table className="w-full text-xs min-w-[1050px]">
              <thead className="sticky top-0 bg-[#f1ebe3] z-10">
                <tr>
                  <th className="p-2 text-left">Proizvod</th>
                  {slots.map(s => <th key={s} className="p-2 text-left">{s}</th>)}
                  <th className="p-2">Status proizvoda</th>
                </tr>
              </thead>
              <tbody>
                {productSummary.map(p => {
                  const productRows = rows.filter(r => r.productId === p.id);
                  return (
                    <tr key={p.id} className="border-t border-[#eee7df] align-top">
                      <td className="p-2 min-w-[180px]">
                        <div className="font-bold">{p.name}</div>
                        <div className="text-[9px] text-gray-500">{p.id}</div>
                      </td>
                      {slots.map(slot => {
                        const r = productRows.find(x => x.slot === slot)!;
                        const ps = physical[r.key];
                        const state = !r.path ? 'NEMA PUTANJE' : !r.inIndex ? 'NEMA U INDEKSU' : ps === 'FOUND' ? 'FIZIČKI OK' : ps === 'MISSING' ? 'FAJL 404' : ps === 'ERROR' ? 'GREŠKA PROVERE' : 'PROVERA...';
                        const good = state === 'FIZIČKI OK';
                        return (
                          <td key={slot} className="p-2 min-w-[200px]">
                            <div className="font-bold mb-1">{slot}</div>
                            {r.path ? (
                              <a
                                href={r.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Otvori originalnu fotografiju u novom tabu"
                                className="block w-fit rounded border-2 border-transparent hover:border-[#9e3e26] focus:outline-none focus:ring-2 focus:ring-[#9e3e26]"
                              >
                                <img src={r.path} alt={`${p.name} — ${slot}`} className="w-24 h-20 object-contain rounded bg-gray-50 cursor-zoom-in" loading="lazy" />
                              </a>
                            ) : <div className="w-24 h-20 rounded border bg-red-50 mb-1 flex items-center justify-center text-[10px] text-red-700">NEMA</div>}
                            <a href={r.path || '#'} target="_blank" rel="noopener noreferrer" className={r.path ? "block break-all text-[9px] text-blue-700 hover:underline" : "block break-all text-[9px] text-gray-500"}>{r.path || '—'}</a>
                            <div className={good ? 'mt-1 text-green-700 font-bold' : 'mt-1 text-red-700 font-bold'}>{state}</div>
                            {!r.inIndex && r.path && <div className="mt-1 text-amber-700 font-semibold">⚠ nije u Media indeksu</div>}
                          </td>
                        );
                      })}
                      <td className="p-2">
                        <div className={p.complete ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>{p.complete ? '4/4 PUTANJE' : 'NEPOTPUNO'}</div>
                        <div className={p.indexed ? 'text-green-700' : 'text-red-700'}>{p.indexed ? 'INDEX OK' : 'INDEX PROBLEM'}</div>
                        <div className={p.physical ? 'text-green-700' : physicalChecking.length ? 'text-gray-500' : 'text-red-700'}>{p.physical ? 'FAJLOVI OK' : physicalChecking.length ? 'PROVERA...' : 'FAJL PROBLEM'}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <ProblemBox title={'REFERENCE VAN MEDIA INDEKSA — ' + missingIndex.length} tone="red">
            {missingIndex.length === 0 ? <div>Nema problema.</div> : missingIndex.map(r => (
              <div key={r.key} className="py-2 border-b border-red-100">
                <b>{r.productName}</b> — {r.slot}<br />
                <span className="break-all">{r.path || 'NEMA PUTANJE'}</span>
              </div>
            ))}
          </ProblemBox>

          <ProblemBox title={'FIZIČKI FAJLOVI KOJI NISU PRONAĐENI — ' + physicalMissing.length} tone="amber">
            {physicalChecking.length > 0 && <div className="mb-2 text-gray-600">Provera još traje za {physicalChecking.length} slotova...</div>}
            {physicalMissing.length === 0 && physicalChecking.length === 0 ? <div>Nema fizičkih 404 fajlova.</div> : physicalMissing.map(r => (
              <div key={r.key} className="py-2 border-b border-amber-100">
                <b>{r.productName}</b> — {r.slot}<br />
                <span className="break-all">{r.path || 'NEMA PUTANJE'}</span>
              </div>
            ))}
          </ProblemBox>
        </div>

        <div className="rounded-2xl bg-white border border-[#e8e0d5] p-5 mb-6">
          <h2 className="font-bold text-lg">Duplikati putanja</h2>
          <p className="text-xs text-gray-500 mt-1">Ista fizička putanja korišćena na više slotova. Ovo je samo nalaz, ne izmena.</p>
          <div className="mt-3">
            {duplicates.length === 0 ? <div className="text-green-700 font-bold">NEMA DUPLIKATA</div> : duplicates.map(r => (
              <div key={r.key} className="py-2 border-b border-[#eee7df] text-xs">
                <span className="break-all font-semibold">{r.path}</span>
                <div className="mt-1">{(pathOwners.get(r.path) || []).join(' • ')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#241d19] text-white p-5 text-sm">
          <b>BEZBEDNOSNA GARANCIJA:</b> FAZA 3B ne poziva saveCustomProduct, ne menja permanentProductsData, ne menja Media biblioteku, ne piše IndexedDB/localStorage i ne vrši GitHub/Cloudflare publish.
        </div>
      </div>
    </div>
  );
}

function AuditCard({label,value,target,ok}:{label:string;value:number;target:string;ok:boolean}) {
  return <div className="bg-white border border-[#e8e0d5] rounded-2xl p-4 shadow-sm">
    <div className="text-[10px] tracking-wider text-gray-500">{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
    <div className={ok ? 'text-xs text-green-700 font-semibold' : 'text-xs text-red-700 font-semibold'}>{ok ? 'DA' : 'NE'} • cilj {target}</div>
  </div>;
}

function Info({title,text}:{title:string;text:string}) {
  return <div className="p-3 rounded-xl bg-[#f7f3ed] border border-[#e8e0d5]"><div className="font-bold">{title}</div><div className="text-xs text-gray-600 mt-1">{text}</div></div>;
}

function ProblemBox({title,children,tone}:{title:string;children:React.ReactNode;tone:'red'|'amber'}) {
  const cls = tone === 'red' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900';
  return <div className={'rounded-2xl border p-5 ' + cls}><h2 className="font-bold mb-3">{title}</h2><div className="max-h-[420px] overflow-auto">{children}</div></div>;
}
