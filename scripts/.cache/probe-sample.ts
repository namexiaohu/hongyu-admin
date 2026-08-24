import '@/lib/env';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  console.log('products', await sql`SELECT locale, name FROM product_translations LIMIT 5`);
  console.log('solutions', await sql`SELECT locale, title, left(description,60) d FROM solutions_i18n LIMIT 5`);
  console.log('summits', await sql`SELECT locale, title FROM summits_i18n LIMIT 5`);
  console.log('blogs', await sql`SELECT locale, title, left(coalesce(summary,''),80) s FROM editorial_content_translations WHERE locale='en' LIMIT 3`);
  console.log('company', await sql`SELECT locale, company_name FROM company_profiles_i18n`);
  console.log('homepage', await sql`SELECT locale, left(banner_title,40) t FROM homepage_configs_i18n`);
  console.log('bn', await sql`SELECT locale, title FROM brand_narratives_i18n`);
  console.log('social', await sql`SELECT locale, jsonb_array_length(featured_posts) n FROM social_media_profiles_i18n`);
  console.log('blog locales', await sql`SELECT locale, count(*)::int n FROM editorial_content_translations GROUP BY locale`);
  console.log('product locales', await sql`SELECT locale, count(*)::int n FROM product_translations GROUP BY locale`);

  // Check if en-only rows are actually Chinese
  const { detectLang, collectText } = await import('../lib/locale-detect');
  const products = await sql`SELECT locale, name, short_description, description FROM product_translations`;
  for (const row of products) {
    const lang = detectLang(collectText([row.name, row.short_description, row.description]));
    if (lang === 'zh' || lang === 'mixed') {
      console.log('product lang issue', row.locale, lang, row.name);
    }
  }
  const solutions = await sql`SELECT locale, title, large_title, description FROM solutions_i18n`;
  for (const row of solutions) {
    const lang = detectLang(collectText([row.title, row.large_title, row.description]));
    if (row.locale.startsWith('en') && (lang === 'zh' || lang === 'mixed')) {
      console.log('solution lang issue', row.locale, lang, row.title);
    }
  }
  const summits = await sql`SELECT locale, title, description FROM summits_i18n`;
  for (const row of summits) {
    const lang = detectLang(collectText([row.title, row.description]));
    if (row.locale.startsWith('en') && (lang === 'zh' || lang === 'mixed')) {
      console.log('summit lang issue', row.locale, lang, row.title);
    }
  }

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
