import { BlogPost } from '../types';
import { blogPostsData } from '../data/blogData';

const CUSTOM_BLOGS_KEY = 'koreni_custom_blog_posts';
const BLOG_OVERRIDES_KEY = 'koreni_blog_image_overrides';

export interface BlogImageOverride {
  coverImage?: string;
  sectionImages?: Record<number, string>;
}

export function loadBlogOverrides(): Record<string, BlogImageOverride> {
  try {
    const saved = localStorage.getItem(BLOG_OVERRIDES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function loadCustomBlogs(): BlogPost[] {
  try {
    const saved = localStorage.getItem(CUSTOM_BLOGS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function loadAllBlogPosts(): BlogPost[] {
  const custom = loadCustomBlogs();
  const overrides = loadBlogOverrides();

  // Combine system posts and custom posts
  const combined = [...custom, ...blogPostsData];

  // Apply overrides if any
  return combined.map((post) => {
    const override = overrides[post.id] || overrides[post.slug];
    if (!override) return post;

    const updatedSections = post.sections ? post.sections.map((sec, idx) => {
      if (override.sectionImages && override.sectionImages[idx] !== undefined) {
        return {
          ...sec,
          image: override.sectionImages[idx]
        };
      }
      return sec;
    }) : [];

    return {
      ...post,
      coverImage: override.coverImage !== undefined ? override.coverImage : post.coverImage,
      sections: updatedSections.length > 0 ? updatedSections : post.sections
    };
  });
}

export function saveCustomBlog(post: BlogPost): void {
  const current = loadCustomBlogs();
  const existingIdx = current.findIndex(b => b.id === post.id || b.slug === post.slug);
  let updated: BlogPost[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = post;
  } else {
    updated = [post, ...current];
  }
  localStorage.setItem(CUSTOM_BLOGS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('blog-posts-updated', { detail: updated }));
}

export function deleteCustomBlog(idOrSlug: string): void {
  const current = loadCustomBlogs();
  const filtered = current.filter(b => b.id !== idOrSlug && b.slug !== idOrSlug);
  localStorage.setItem(CUSTOM_BLOGS_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new CustomEvent('blog-posts-updated', { detail: filtered }));
}

export function updateBlogPostImages(
  idOrSlug: string, 
  coverImage?: string, 
  sectionImages?: Record<number, string>
): void {
  // Update custom blogs if this post is a custom one
  const custom = loadCustomBlogs();
  const customIdx = custom.findIndex(b => b.id === idOrSlug || b.slug === idOrSlug);
  if (customIdx >= 0) {
    const p = custom[customIdx];
    const newSections = p.sections ? p.sections.map((sec, idx) => {
      if (sectionImages && sectionImages[idx] !== undefined) {
        return { ...sec, image: sectionImages[idx] };
      }
      return sec;
    }) : [];

    custom[customIdx] = {
      ...p,
      coverImage: coverImage !== undefined ? coverImage : p.coverImage,
      sections: newSections.length > 0 ? newSections : p.sections
    };
    localStorage.setItem(CUSTOM_BLOGS_KEY, JSON.stringify(custom));
  }

  // Update overrides map (works for both system and custom blogs)
  const overrides = loadBlogOverrides();
  const existing = overrides[idOrSlug] || {};
  overrides[idOrSlug] = {
    ...existing,
    ...(coverImage !== undefined ? { coverImage } : {}),
    ...(sectionImages !== undefined ? { sectionImages: { ...(existing.sectionImages || {}), ...sectionImages } } : {})
  };
  localStorage.setItem(BLOG_OVERRIDES_KEY, JSON.stringify(overrides));

  window.dispatchEvent(new CustomEvent('blog-posts-updated'));
}

export function deleteBlogPostCoverImage(idOrSlug: string): void {
  updateBlogPostImages(idOrSlug, '');
}

export function deleteBlogPostSectionImage(idOrSlug: string, sectionIndex: number): void {
  updateBlogPostImages(idOrSlug, undefined, { [sectionIndex]: '' });
}
