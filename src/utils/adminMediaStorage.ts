import { GalleryPhoto } from '../types';
import { loadPhotosFromStorage, savePhotosToStorage } from './photoStorage';

const HIDDEN_KEY = 'savremeni_koreni_admin_hidden_media_v1';

export type AdminMediaMeta = GalleryPhoto & {
  fileName?: string;
  originalName?: string;
  hiddenFromSite?: boolean;
  role?: string;
  alt?: string;
  altEn?: string;
};

function readHidden(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeHidden(ids: Set<string>) {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...ids]));
  } catch {
    // IndexedDB remains the source for uploaded image bytes.
  }
}

export async function loadAdminUploadedMedia(): Promise<AdminMediaMeta[]> {
  const photos = (await loadPhotosFromStorage()) || [];
  const hidden = readHidden();
  return photos.map(p => ({ ...p, hiddenFromSite: hidden.has(String(p.id)) }));
}

export async function setMediaSiteVisibility(id: string, visible: boolean): Promise<void> {
  const hidden = readHidden();
  if (visible) hidden.delete(String(id));
  else hidden.add(String(id));
  writeHidden(hidden);
  window.dispatchEvent(new CustomEvent('admin-media-updated'));
}

export async function updateAdminMediaMeta(id: string, patch: Partial<AdminMediaMeta>): Promise<void> {
  const photos = (await loadPhotosFromStorage()) || [];
  const next = photos.map(p => p.id === id ? ({ ...p, ...patch, id: p.id, imageUrl: p.imageUrl }) : p);
  await savePhotosToStorage(next);
  window.dispatchEvent(new CustomEvent('admin-media-updated'));
}

export async function addAdminMediaFile(file: File): Promise<AdminMediaMeta> {
  if (!file.type.startsWith('image/')) throw new Error('Dozvoljeni su samo image fajlovi.');

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Čitanje slike nije uspelo.'));
    reader.readAsDataURL(file);
  });

  const id = 'admin-media-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const item: AdminMediaMeta = {
    id,
    title: file.name.replace(/.[^.]+$/, ''),
    titleEn: file.name.replace(/.[^.]+$/, ''),
    category: 'Admin Upload',
    imageUrl: dataUrl,
    originalName: file.name,
    fileName: file.name,
    isCustomUploaded: true,
    hiddenFromSite: false
  };

  const photos = (await loadPhotosFromStorage()) || [];
  await savePhotosToStorage([item as GalleryPhoto, ...photos]);
  window.dispatchEvent(new CustomEvent('admin-media-updated'));
  return item;
}
