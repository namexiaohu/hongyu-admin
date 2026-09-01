import { LOCALE_REQUEST_HEADER } from '@/lib/i18n';

/** Supplementary CORS headers for route handlers. Allow-Origin is set in middleware only. */
export function frontCorsHeaders(_requestOrigin?: string | null) {
  return {
    'Access-Control-Allow-Headers': `Content-Type, Authorization, X-Cart-Token, X-Guest-Order-Token, ${LOCALE_REQUEST_HEADER}`,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  };
}
