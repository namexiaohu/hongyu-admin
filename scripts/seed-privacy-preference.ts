/**
 * Ensure privacy_preference column exists and seed zh-CN / en / es copy.
 *
 * Usage: npx tsx scripts/seed-privacy-preference.ts
 */
import '@/lib/env';

import postgres from 'postgres';

const LOCALES = {
  'zh-CN': {
    title: 'Cookie 使用说明',
    summary: [
      '<p>本站使用 Cookie 以保障网站正常运行（例如语言偏好与登录会话），并在征得您同意后用于访问分析与体验优化。您可接受全部、拒绝非必要项，或按类别保存设置。</p>',
      '<p>您可随时通过页脚「隐私偏好设置」更改选择。完整说明请参阅我们的',
      '<a href="/pages/privacy-policy">隐私政策</a>',
      '与',
      '<a href="/pages/terms-of-service">服务条款</a>',
      '。</p>',
    ].join(''),
    detailHtml: [
      '<p>宏宇医疗网站可能使用以下几类技术：</p>',
      '<ul>',
      '<li><strong>必要 Cookie</strong>：用于语言切换、登录会话与基础安全，网站核心功能依赖此类 Cookie，无法关闭。</li>',
      '<li><strong>统计与营销 Cookie</strong>：仅在您同意后启用，用于了解站点使用情况并改进内容与服务。当前站点尚未接入第三方追踪脚本，您的选择会被保存，以便将来启用时生效。</li>',
      '</ul>',
      '<p>您可随时通过页脚「隐私偏好设置」重新打开本面板。详情见',
      '<a href="/pages/privacy-policy">隐私政策</a>',
      '。</p>',
    ].join(''),
  },
  en: {
    title: 'Use of Cookies',
    summary: [
      '<p>This website uses cookies to keep the site working properly (for example language preference and signed-in sessions) and, with your consent, to understand how visitors use the site and improve the experience. You can accept all cookies, reject non-essential cookies, or save settings by category.</p>',
      '<p>You may change your choice at any time via “Privacy Settings” in the footer. For full details, see our ',
      '<a href="/pages/privacy-policy">Privacy Policy</a>',
      ' and ',
      '<a href="/pages/terms-of-service">Terms of Service</a>',
      '.</p>',
    ].join(''),
    detailHtml: [
      '<p>Hongyu Medical may use the following categories:</p>',
      '<ul>',
      '<li><strong>Necessary cookies</strong>: required for language preference, login sessions, and basic security. These are always active.</li>',
      '<li><strong>Statistics and marketing cookies</strong>: used only with your consent to measure usage and improve content and services. Third-party tracking scripts are not loaded yet; your preference is stored so it can apply when analytics are enabled later.</li>',
      '</ul>',
      '<p>You can reopen this panel anytime from “Privacy Settings” in the footer. See our ',
      '<a href="/pages/privacy-policy">Privacy Policy</a>',
      ' for more information.</p>',
    ].join(''),
  },
  es: {
    title: 'Uso de cookies',
    summary: [
      '<p>Este sitio utiliza cookies para el funcionamiento básico (por ejemplo, el idioma y la sesión de inicio) y, con su consentimiento, para analizar el uso y mejorar la experiencia. Puede aceptar todas, rechazar las no esenciales o guardar ajustes por categoría.</p>',
      '<p>Puede cambiar su elección en cualquier momento desde «Configuración de privacidad» en el pie de página. Para más detalles, consulte nuestra ',
      '<a href="/pages/privacy-policy">Política de privacidad</a>',
      ' y los ',
      '<a href="/pages/terms-of-service">Términos de servicio</a>',
      '.</p>',
    ].join(''),
    detailHtml: [
      '<p>Hongyu Medical puede utilizar las siguientes categorías:</p>',
      '<ul>',
      '<li><strong>Cookies necesarias</strong>: imprescindibles para el idioma, la sesión de acceso y la seguridad básica. Siempre activas.</li>',
      '<li><strong>Cookies de estadísticas y marketing</strong>: solo con su consentimiento, para medir el uso y mejorar el contenido. Aún no se cargan scripts de terceros; su preferencia se guarda para aplicarla cuando se activen.</li>',
      '</ul>',
      '<p>Puede volver a abrir este panel desde «Configuración de privacidad» en el pie de página. Más información en la ',
      '<a href="/pages/privacy-policy">Política de privacidad</a>',
      '.</p>',
    ].join(''),
  },
} as const;

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await sql`
      ALTER TABLE website_configs
      ADD COLUMN IF NOT EXISTS privacy_preference jsonb NOT NULL DEFAULT '{"locales":{}}'::jsonb
    `;

    const rows = await sql<{ id: string }[]>`
      SELECT id FROM website_configs LIMIT 1
    `;

    const payload = JSON.stringify({ locales: LOCALES });

    if (!rows.length) {
      await sql`
        INSERT INTO website_configs (privacy_preference)
        VALUES (${payload}::jsonb)
      `;
      console.log('Inserted website_configs row with privacy_preference seed.');
    } else {
      await sql`
        UPDATE website_configs
        SET privacy_preference = ${payload}::jsonb,
            updated_at = NOW()
        WHERE id = ${rows[0].id}
      `;
      console.log(`Updated privacy_preference for website_configs ${rows[0].id}`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
