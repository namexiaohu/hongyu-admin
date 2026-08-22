import '@/lib/env';

import { getStorefrontBrandNarrativeBySlug } from '@/server/storefront/brand-narratives';

const SLUGS = ['about', 'patents', 'history', 'training'] as const;

async function main() {
  for (const slug of SLUGS) {
    const page = await getStorefrontBrandNarrativeBySlug(slug, 'zh');
    if (!page) {
      throw new Error(`Missing published narrative: ${slug}`);
    }
    const sectionTypes = page.sections.map((section) => String(section.type));
    console.log(`\n=== ${slug} ===`);
    console.log(`hero: ${page.hero.title.slice(0, 20)}...`);
    console.log(`stats: ${page.stats?.length ?? 0}`);
    console.log(`sections: ${sectionTypes.join(' → ')}`);
  }
  console.log('\nAll four narratives verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
