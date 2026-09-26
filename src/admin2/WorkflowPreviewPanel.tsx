import React from 'react';

export type WorkflowPreviewChange = {
  key: string;
  productId: string;
  productName: string;
  slot: string;
  path: string;
  oldSr: string;
  oldEn: string;
  newSr: string;
  newEn: string;
  source: string;
  valid: boolean;
};

export interface WorkflowPreviewPanelProps {
  open: boolean;
  changes: WorkflowPreviewChange[];
  approvedCount: number;
  reviewed: boolean;
  onReviewedChange: (value: boolean) => void;
  onClose: () => void;
  onApprove: () => void;
}

export default function WorkflowPreviewPanel({
  open,
  changes,
  approvedCount,
  reviewed,
  onReviewedChange,
  onClose,
  onApprove,
}: WorkflowPreviewPanelProps) {
  if (!open) return null;

  const validCount = changes.filter((change) => change.valid).length;
  const blockedCount = changes.length - validCount;
  const ready = changes.length > 0 && blockedCount === 0 && reviewed;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="workflow-preview-title"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.72)', padding: 24, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', background: '#fff', color: '#111', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>ADMIN 2.0 · WORKFLOW PREVIEW</div>
            <h2 id="workflow-preview-title">Pregled predloženih promena</h2>
            <p>Samo pregled. Ovaj ekran ne menja proizvode, slike niti fajlove.</p>
          </div>
          <button type="button" onClick={onClose}>Zatvori</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, margin: '20px 0' }}>
          {[
            ['PROMENE', changes.length],
            ['VALIDNE', validCount],
            ['BLOKIRANE', blockedCount],
            ['ODOBRENE', approvedCount],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800 }}>{label}</div>
              <div style={{ fontSize: 25, fontWeight: 800 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ border: '2px solid ' + (ready ? '#16803c' : '#b45309'), borderRadius: 12, padding: 14 }}>
          <strong>{ready ? 'READY FOR APPROVE' : 'NOT READY'}</strong>
          <div>{ready ? 'Sve promene su validne i pregled je potvrđen.' : 'Potvrdite pregled i uklonite blokirane promene.'}</div>
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          {changes.length === 0 ? (
            <div style={{ padding: 24, border: '1px dashed #bbb' }}>Nema predloženih promena za pregled.</div>
          ) : changes.map((change) => (
            <article key={change.key} style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><strong>{change.productName}</strong><div>{change.productId} · {change.slot}</div></div>
                <b>{change.valid ? 'VALIDNO' : 'BLOKIRANO'}</b>
              </div>
              {change.path && <div style={{ fontSize: 12, marginTop: 8 }}>Slika: {change.path}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div style={{ background: '#f7f7f7', padding: 12, borderRadius: 10 }}>
                  <b>STARA VREDNOST</b>
                  <div><b>SR:</b> {change.oldSr || '—'}</div>
                  <div><b>EN:</b> {change.oldEn || '—'}</div>
                </div>
                <div style={{ background: '#f1f8f3', padding: 12, borderRadius: 10 }}>
                  <b>NOVA VREDNOST</b>
                  <div><b>SR:</b> {change.newSr || '—'}</div>
                  <div><b>EN:</b> {change.newEn || '—'}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, marginTop: 8 }}>AI izvor: {change.source || 'nije naveden'}</div>
            </article>
          ))}
        </div>

        <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 20, padding: 14, border: '1px solid #ddd', borderRadius: 12 }}>
          <input type="checkbox" checked={reviewed} onChange={(event) => onReviewedChange(event.target.checked)} />
          Potvrđujem da sam pregledao predložene promene.
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onClose}>Nazad</button>
          <button type="button" disabled={!ready} onClick={onApprove}>Odobri i nastavi</button>
        </div>
      </div>
    </div>
  );
}
