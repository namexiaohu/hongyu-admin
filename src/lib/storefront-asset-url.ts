const DEV_SITE_URL = 'http://localhost:5000';

function siteOrigin() {
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL
    || process.env.SITE_URL
    || DEV_SITE_URL
  ).trim().replace(/\/$/, '');
  return origin || DEV_SITE_URL;
}

/** 后台预览相对路径图片时，指向前台站点（如 /images/xxx.jpg → http://localhost:5000/images/xxx.jpg）。 */
export function resolveStorefrontAssetUrl(value: string | undefined) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${siteOrigin()}${path}`;
}
