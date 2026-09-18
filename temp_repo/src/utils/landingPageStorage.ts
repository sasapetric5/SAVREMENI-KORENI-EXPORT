import { seoLandingPages, SeoLandingPageData } from '../data/seoLandingPagesData';

const CUSTOM_LANDING_KEY = 'koreni_custom_landing_pages';
const LANDING_OVERRIDES_KEY = 'koreni_landing_image_overrides';

export interface LandingImageOverride {
  heroImage?: string;
  secondaryImage?: string;
}

export function loadLandingOverrides(): Record<string, LandingImageOverride> {
  try {
    const saved = localStorage.getItem(LANDING_OVERRIDES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function loadCustomLandingPages(): SeoLandingPageData[] {
  try {
    const saved = localStorage.getItem(CUSTOM_LANDING_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function loadAllLandingPages(): Record<string, SeoLandingPageData> {
  const custom = loadCustomLandingPages();
  const overrides = loadLandingOverrides();

  const map: Record<string, SeoLandingPageData> = { ...seoLandingPages };

  // Add custom landing pages
  custom.forEach((page) => {
    map[page.slug] = page;
  });

  // Apply image overrides
  Object.keys(map).forEach((slug) => {
    const override = overrides[slug];
    if (override) {
      map[slug] = {
        ...map[slug],
        ...(override.heroImage !== undefined ? { heroImage: override.heroImage } : {}),
        ...(override.secondaryImage !== undefined ? { secondaryImage: override.secondaryImage } : {})
      };
    }
  });

  return map;
}

export function getLandingPageBySlug(slug: string): SeoLandingPageData | undefined {
  const all = loadAllLandingPages();
  return all[slug];
}

export function saveCustomLandingPage(page: SeoLandingPageData): void {
  const current = loadCustomLandingPages();
  const existingIdx = current.findIndex(p => p.slug === page.slug);
  let updated: SeoLandingPageData[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = page;
  } else {
    updated = [page, ...current];
  }
  localStorage.setItem(CUSTOM_LANDING_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('landing-pages-updated', { detail: updated }));
}

export function deleteCustomLandingPage(slug: string): void {
  const current = loadCustomLandingPages();
  const filtered = current.filter(p => p.slug !== slug);
  localStorage.setItem(CUSTOM_LANDING_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new CustomEvent('landing-pages-updated', { detail: filtered }));
}

export function updateLandingPageImages(
  slug: string, 
  heroImage?: string, 
  secondaryImage?: string
): void {
  // Update custom landing pages if custom
  const custom = loadCustomLandingPages();
  const customIdx = custom.findIndex(p => p.slug === slug);
  if (customIdx >= 0) {
    custom[customIdx] = {
      ...custom[customIdx],
      ...(heroImage !== undefined ? { heroImage } : {}),
      ...(secondaryImage !== undefined ? { secondaryImage } : {})
    };
    localStorage.setItem(CUSTOM_LANDING_KEY, JSON.stringify(custom));
  }

  // Update overrides map (works for system landing pages as well)
  const overrides = loadLandingOverrides();
  overrides[slug] = {
    ...(overrides[slug] || {}),
    ...(heroImage !== undefined ? { heroImage } : {}),
    ...(secondaryImage !== undefined ? { secondaryImage } : {})
  };
  localStorage.setItem(LANDING_OVERRIDES_KEY, JSON.stringify(overrides));

  window.dispatchEvent(new CustomEvent('landing-pages-updated'));
}

export function deleteLandingPageImage(slug: string, imageType: 'hero' | 'secondary'): void {
  if (imageType === 'hero') {
    updateLandingPageImages(slug, '', undefined);
  } else {
    updateLandingPageImages(slug, undefined, '');
  }
}
