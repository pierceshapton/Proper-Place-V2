/**
 * Server-side CMS content helper.
 * Used in Next.js Server Components to fetch editable content from the backend.
 * Caches for 60 seconds (ISR) - changes made in the CRM editor are visible within ~1 minute.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://octopus-app-lxh2t.ondigitalocean.app';

export type CmsContent = Record<string, string>;

export async function getCmsContent(): Promise<CmsContent> {
  try {
    const res = await fetch(`${API_URL}/cms/content`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    return (data.content as CmsContent) || {};
  } catch {
    return {};
  }
}

/** Get a content value by key, falling back to a hardcoded default. */
export function c(content: CmsContent, key: string, fallback: string): string {
  return content[key] !== undefined ? content[key] : fallback;
}
