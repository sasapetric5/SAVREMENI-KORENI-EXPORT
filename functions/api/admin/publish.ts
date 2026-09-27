const REPO = 'sasapetric5/SAVREMENI-KORENI-EXPORT';
const BRANCH = 'main';
const STATE_PATH = 'src/data/adminPublishedState.ts';

type Env = {
  GITHUB_TOKEN?: string;
  ADMIN_PUBLISH_KEY?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function github(request: Request, env: Env, path: string, init: RequestInit = {}) {
  if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN nije podešen u Cloudflare-u.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${env.GITHUB_TOKEN}`);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('X-GitHub-Api-Version', '2022-11-28');
  headers.set('Content-Type', 'application/json');
  return fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, { ...init, headers });
}

async function getFile(env: Env, path: string) {
  const r = await github(new Request('https://local'), env, path);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path}: HTTP ${r.status}`);
  const data = await r.json() as any;
  const content = atob(String(data.content || '').replace(/\\n/g, ''));
  return { sha: String(data.sha), content };
}

async function putFile(env: Env, path: string, content: string, message: string, sha?: string) {
  const body: any = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  const r = await github(new Request('https://local'), env, path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`GitHub PUT ${path}: HTTP ${r.status} ${detail.slice(0, 500)}`);
  }
  return await r.json() as any;
}

function safeName(name: string) {
  const base = String(name || 'upload.webp').split('/').pop()!.replace(/[^a-zA-Z0-9._-]+/g, '-');
  return base.toLowerCase().endsWith('.webp') ? base.toLowerCase() : `${base.toLowerCase().replace(/\\.[^.]+$/, '')}.webp`;
}

function dataUrlToBytes(data: string) {
  const match = String(data || '').match(/^data:[^;]+;base64,(.+)$/);
  if (!match) throw new Error('Upload nema validan data URL.');
  return match[1];
}

export const onRequestGet = async ({ env }: { env: Env }) => {
  return json({ ok: true, githubConfigured: Boolean(env.GITHUB_TOKEN), publishKeyConfigured: Boolean(env.ADMIN_PUBLISH_KEY) });
};

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    if (!env.GITHUB_TOKEN || !env.ADMIN_PUBLISH_KEY) {
      return json({ ok: false, error: 'Publish nije konfigurisan: potrebni su GITHUB_TOKEN i ADMIN_PUBLISH_KEY.' }, 503);
    }
    const body = await request.json() as any;
    if (body?.publishKey !== env.ADMIN_PUBLISH_KEY) return json({ ok: false, error: 'Neispravan publish ključ.' }, 401);

    const assignments = body?.assignments && typeof body.assignments === 'object' ? body.assignments : {};
    const removedProductIds = Array.isArray(body?.removedProductIds) ? body.removedProductIds.map(String) : [];
    const removedMediaPaths = Array.isArray(body?.removedMediaPaths) ? body.removedMediaPaths.map(String) : [];
    const uploads = Array.isArray(body?.uploads) ? body.uploads : [];
    const altDrafts = body?.altDrafts && typeof body.altDrafts === 'object' ? body.altDrafts : {};

    const uploadPathById: Record<string, string> = {};
    for (const u of uploads.slice(0, 20)) {
      const id = String(u?.id || '');
      if (!id || !u?.data) continue;
      const filename = safeName(String(u.name || `${id}.webp`));
      const path = `public/custom_products/${filename}`;
      const existing = await getFile(env, path);
      await putFile(env, path, decodeURIComponent(escape(atob(dataUrlToBytes(String(u.data))))), `Admin 2.0: upload media ${filename}`, existing?.sha);
      uploadPathById[id] = `/custom_products/${filename}`;
    }

    const productOverrides: Record<string, any> = {};
    for (const [productId, slots] of Object.entries(assignments)) {
      const product = slots as any;
      const current = body?.canonical?.[productId] || {};
      const paths = Array.isArray(current.images) ? [...current.images] : [];
      let main = current.image || '';
      const mapSlot = (slot: string, value: string | undefined) => {
        if (!value) return;
        const resolved = uploadPathById[value] || value;
        if (slot === 'MAIN') main = resolved;
        if (slot === 'G2') paths[0] = resolved;
        if (slot === 'G1') paths[1] = resolved;
        if (slot === 'G0') paths[2] = resolved;
      };
      for (const slot of ['MAIN','G0','G1','G2']) mapSlot(slot, product?.[slot]);
      if (main || paths.some(Boolean)) productOverrides[productId] = { image: main, images: paths };
    }

    const altOverrides: Record<string, any> = {};
    for (const [key, value] of Object.entries(altDrafts)) {
      const [productId, slot] = String(key).split(':');
      if (!productId || !['MAIN','G0','G1','G2'].includes(slot)) continue;
      const sr = String((value as any)?.alt || '').trim();
      const en = String((value as any)?.altEn || '').trim();
      if (sr && en) (altOverrides[productId] ||= {})[slot] = { alt: sr, altEn: en };
    }

    const stateContent = `import { Product } from '../types';

export type AdminPublishedState = {
  version: 1;
  updatedAt: string;
  productOverrides: Record<string, Partial<Pick<Product, 'image' | 'images'>>>;
  removedProductIds: string[];
  removedMediaPaths: string[];
  altOverrides: Record<string, Record<string, { alt: string; altEn: string }>>;
};

export const adminPublishedState: AdminPublishedState = ${JSON.stringify({
  version: 1,
  updatedAt: new Date().toISOString(),
  productOverrides,
  removedProductIds,
  removedMediaPaths,
  altOverrides,
}, null, 2)};
`;
    const existingState = await getFile(env, STATE_PATH);
    const saved = await putFile(env, STATE_PATH, stateContent, 'Admin 2.0: publish approved changes', existingState?.sha);
    return json({ ok: true, commit: saved.commit?.sha || saved.content?.sha || null, uploaded: Object.keys(uploadPathById).length, overrides: Object.keys(productOverrides).length });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
};
