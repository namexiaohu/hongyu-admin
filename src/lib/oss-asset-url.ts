import { resolveStorefrontAssetUrl } from '@/lib/storefront-asset-url';

const LOCAL_PUBLIC_PATH = /^\/(images|hero|media|files)\//i;
const ABSOLUTE_URL = /^(https?:)?\/\//i;

export function getPublicOssDomain() {
  const raw = (
    process.env.NEXT_PUBLIC_R2_DOMAIN
    || process.env.R2_DOMAIN
    || ''
  ).trim();
  return raw.replace(/\/$/, '');
}

export function isOssCdnUrl(url: string) {
  const domain = getPublicOssDomain();
  if (!domain) return false;
  return url.startsWith(`${domain}/`);
}

function storageHostCandidates() {
  const hosts = new Set<string>();
  const domain = getPublicOssDomain();
  if (domain) {
    try {
      hosts.add(new URL(domain).host);
    } catch {
      // ignore invalid domain
    }
  }
  return hosts;
}

function isOssHostedAbsoluteUrl(value: string) {
  if (isOssCdnUrl(value)) return true;
  try {
    const parsed = new URL(value.startsWith('//') ? `https:${value}` : value);
    return storageHostCandidates().has(parsed.host);
  } catch {
    return false;
  }
}

/** Whether a src/href should be treated as an OSS/local asset reference. */
export function isRewritableOssAssetRef(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith('data:')
    || trimmed.startsWith('blob:')
    || trimmed.startsWith('mailto:')
    || trimmed.startsWith('tel:')
    || trimmed.startsWith('#')
  ) {
    return false;
  }
  if (ABSOLUTE_URL.test(trimmed)) {
    return isOssHostedAbsoluteUrl(trimmed);
  }
  if (LOCAL_PUBLIC_PATH.test(trimmed) || trimmed.startsWith('/images/')) {
    return true;
  }
  // bare storage key, e.g. products/covers/xxx.jpg
  return !trimmed.includes('://') && !trimmed.startsWith('/');
}

/** 把完整对象存储 URL 收成库里存的 key；本地 /images 路径保持原样。 */
export function toOssStorageKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (LOCAL_PUBLIC_PATH.test(trimmed) || trimmed.startsWith('/images/')) {
    return trimmed;
  }

  const domain = getPublicOssDomain();
  if (domain && trimmed.startsWith(`${domain}/`)) {
    return trimmed.slice(domain.length + 1);
  }

  try {
    const parsed = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
    if (storageHostCandidates().has(parsed.host)) {
      return parsed.pathname.replace(/^\//, '');
    }
  } catch {
    // not an absolute URL
  }

  return trimmed.replace(/^\//, '');
}

/** 页面展示：存储 key 拼域名；遗留完整 URL / 本地静态路径保持兼容。 */
export function resolveOssAssetUrl(value: string | undefined | null) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (LOCAL_PUBLIC_PATH.test(trimmed) || trimmed.startsWith('/images/')) {
    return resolveStorefrontAssetUrl(trimmed);
  }

  const domain = getPublicOssDomain();
  const key = trimmed.replace(/^\//, '');
  if (!key) return '';
  if (!domain) return key;
  return `${domain}/${key}`;
}

/**
 * Rewrite src/href in HTML between storage keys and public CDN URLs.
 * Only touches OSS-hosted absolute URLs, local public paths, and bare keys.
 */
export function rewriteHtmlOssAssets(html: string, mode: 'toStorageKey' | 'toPublicUrl') {
  const source = html ?? '';
  if (!source.trim()) return source;

  return source.replace(
    /(src|href)=(["'])([^"']*)\2/gi,
    (full, attr: string, quote: string, rawValue: string) => {
      const value = rawValue.trim();
      if (!isRewritableOssAssetRef(value)) return full;
      const next = mode === 'toStorageKey'
        ? toOssStorageKey(value)
        : resolveOssAssetUrl(value);
      if (!next || next === value) return full;
      return `${attr}=${quote}${next}${quote}`;
    },
  );
}
