import '@/lib/env';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = postgres(url, { max: 1 });

  const product = await sql`
    SELECT locale, left(name,40) AS name,
      length(regexp_replace(coalesce(name,'')||coalesce(short_description,'')||coalesce(description,''), '[^\u4e00-\u9fff]', '', 'g')) AS cjk
    FROM product_translations
    WHERE locale ILIKE 'en%'
      AND length(regexp_replace(coalesce(name,'')||coalesce(short_description,'')||coalesce(description,''), '[^\u4e00-\u9fff]', '', 'g')) >= 4
    ORDER BY cjk DESC LIMIT 10`;
  console.log('product zh_in_en', product);

  const surgeon = await sql`
    SELECT locale, left(name,40) AS name,
      length(regexp_replace(coalesce(name,'')||coalesce(position,'')||coalesce(institution,'')||coalesce(detail_description,''), '[^\u4e00-\u9fff]', '', 'g')) AS cjk
    FROM surgeons_i18n
    WHERE locale ILIKE 'en%'
      AND length(regexp_replace(coalesce(name,'')||coalesce(position,'')||coalesce(institution,'')||coalesce(detail_description,''), '[^\u4e00-\u9fff]', '', 'g')) >= 4
    ORDER BY cjk DESC LIMIT 10`;
  console.log('surgeon zh_in_en', surgeon);

  const solution = await sql`
    SELECT locale, left(title,40) AS title,
      length(regexp_replace(coalesce(title,'')||coalesce(large_title,'')||coalesce(description,''), '[^\u4e00-\u9fff]', '', 'g')) AS cjk
    FROM solutions_i18n
    WHERE locale ILIKE 'en%'
      AND length(regexp_replace(coalesce(title,'')||coalesce(large_title,'')||coalesce(description,''), '[^\u4e00-\u9fff]', '', 'g')) >= 4
    ORDER BY cjk DESC LIMIT 10`;
  console.log('solution zh_in_en', solution);

  const blog = await sql`
    SELECT locale, left(title,40) AS title,
      length(regexp_replace(coalesce(title,'')||coalesce(summary,''), '[^\u4e00-\u9fff]', '', 'g')) AS cjk
    FROM editorial_content_translations
    WHERE locale ILIKE 'en%'
      AND length(regexp_replace(coalesce(title,'')||coalesce(summary,''), '[^\u4e00-\u9fff]', '', 'g')) >= 4
    ORDER BY cjk DESC LIMIT 10`;
  console.log('blog zh_in_en', blog);

  const productMiss = await sql`
    SELECT COUNT(*)::int AS cnt FROM (
      SELECT p.id FROM products p
      JOIN product_translations t ON t.product_id = p.id AND t.locale ILIKE 'zh%'
      WHERE NOT EXISTS (
        SELECT 1 FROM product_translations e
        WHERE e.product_id = p.id AND e.locale ILIKE 'en%' AND length(trim(e.name)) > 0
      )
    ) s`;
  console.log('products missing en row', productMiss);

  const summitMiss = await sql`
    SELECT COUNT(*)::int AS cnt FROM (
      SELECT s.id FROM summits s
      JOIN summits_i18n t ON t.summit_id = s.id AND t.locale ILIKE 'zh%'
      WHERE NOT EXISTS (
        SELECT 1 FROM summits_i18n e WHERE e.summit_id = s.id AND e.locale ILIKE 'en%' AND length(trim(e.title)) > 0
      )
    ) s`;
  console.log('summits missing en', summitMiss);

  const centerMiss = await sql`
    SELECT COUNT(*)::int AS cnt FROM (
      SELECT c.id FROM partner_centers c
      JOIN partner_centers_i18n t ON t.center_id = c.id AND t.locale ILIKE 'zh%'
      WHERE NOT EXISTS (
        SELECT 1 FROM partner_centers_i18n e WHERE e.center_id = c.id AND e.locale ILIKE 'en%' AND length(trim(e.name)) > 0
      )
    ) s`;
  console.log('centers missing en', centerMiss);

  const surgeonMiss = await sql`
    SELECT COUNT(*)::int AS cnt FROM (
      SELECT s.id FROM surgeons s
      JOIN surgeons_i18n t ON t.surgeon_id = s.id AND t.locale ILIKE 'zh%'
      WHERE NOT EXISTS (
        SELECT 1 FROM surgeons_i18n e WHERE e.surgeon_id = s.id AND e.locale ILIKE 'en%' AND length(trim(e.name)) > 0
      )
    ) s`;
  console.log('surgeons missing en', surgeonMiss);

  const localeCounts = await sql`
    SELECT 'product' AS m, locale, count(*)::int AS n FROM product_translations GROUP BY locale
    UNION ALL
    SELECT 'surgeon', locale, count(*)::int FROM surgeons_i18n GROUP BY locale
    UNION ALL
    SELECT 'solution', locale, count(*)::int FROM solutions_i18n GROUP BY locale
    UNION ALL
    SELECT 'summit', locale, count(*)::int FROM summits_i18n GROUP BY locale
    UNION ALL
    SELECT 'center', locale, count(*)::int FROM partner_centers_i18n GROUP BY locale
    UNION ALL
    SELECT 'blog', locale, count(*)::int FROM editorial_content_translations GROUP BY locale
    ORDER BY 1,2`;
  console.log('locale counts', localeCounts);

  await sql.end({ timeout: 5 });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
