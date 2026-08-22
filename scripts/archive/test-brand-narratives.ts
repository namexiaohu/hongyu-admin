import '@/lib/env';

import {
  createAdminBrandNarrative,
  deleteAdminBrandNarrative,
  getAdminBrandNarrativeDetail,
  getAdminBrandNarrativeList,
  updateAdminBrandNarrative,
  upsertAdminBrandNarrativeTranslation,
} from '@/server/admin/brand-narratives';
import { getStorefrontBrandNarrativeBySlug } from '@/server/storefront/brand-narratives';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const slug = `test-narrative-${Date.now()}`;
  let createdId: string | undefined;

  try {
    try {
      await createAdminBrandNarrative({
        slug: 'admin',
        translation: {
          locale: 'zh',
          title: '保留',
          payload: {
            hero: { smallTitle: '保留', largeTitle: '', description: '', coverImage: '' },
          },
        },
      });
      throw new Error('reserved slug should fail');
    } catch (error) {
      assert(error instanceof Error && error.message === 'SLUG_RESERVED', 'reserved slug should throw SLUG_RESERVED');
    }
    console.log('PASS reserved slug');

    const created = await createAdminBrandNarrative({
      slug,
      status: 'draft',
      blocks: [
        {
          id: 'block-split-1',
          type: 'split',
          layout: 'image-left',
          carouselImages: [{ id: 'slide-1', url: '/images/about-hero.jpg' }],
          locales: {
            zh: { smallTitle: '使命', largeTitle: '让手术更安全', description: '描述', buttonLabel: '' },
          },
          items: [],
        },
        {
          id: 'block-summary-1',
          type: 'summary',
          layout: 'multi-3',
          locales: {
            zh: { smallTitle: '价值', largeTitle: '核心价值', description: '', buttonLabel: '' },
          },
          items: [
            {
              id: 'item-1',
              icon: 'layers',
              locales: {
                zh: { smallTitle: '', largeTitle: '技术创新', description: '持续投入研发', buttonLabel: '' },
              },
            },
          ],
        },
        {
          id: 'block-timeline-1',
          type: 'timeline',
          locales: {
            zh: { smallTitle: '历程', largeTitle: '发展节点', description: '', buttonLabel: '' },
          },
          items: [
            {
              id: 'item-t1',
              coverImage: '/images/about-hero.jpg',
              locales: {
                zh: { smallTitle: '2014', largeTitle: '成立', description: '公司成立', buttonLabel: '' },
              },
            },
          ],
        },
      ],
      translation: {
        locale: 'zh',
        title: '测试小标题',
        payload: {
          hero: {
            smallTitle: '测试小标题',
            largeTitle: '测试大标题',
            description: '测试描述',
            coverImage: '/images/about-hero.jpg',
          },
          stats: [{ label: '年', value: '12+' }],
        },
      },
    });

    createdId = created.id;
    assert(created, 'create should return detail');
    assert(created.slug === slug, 'slug should match');
    assert(created.status === 'draft', 'status should be draft');
    assert(created.blocks.length === 3, 'three content blocks should persist');
    assert(created.blocks[0].type === 'split', 'first block should be split');
    assert(created.blocks[1].type === 'summary' && created.blocks[1].items[0]?.icon === 'layers', 'summary item icon should persist in JSON');
    assert(created.blocks[2].type === 'timeline' && created.blocks[2].items[0]?.coverImage, 'timeline cover should persist in JSON');
    assert(created.translations[0]?.payload.hero.smallTitle === '测试小标题', 'hero smallTitle should persist');
    console.log('PASS create');

    const listed = await getAdminBrandNarrativeList({ keyword: slug });
    assert(listed.items.some((item) => item.id === created.id), 'list should include created item');
    console.log('PASS list');

    const en = await upsertAdminBrandNarrativeTranslation(created.id, {
      locale: 'en',
      title: 'Test title',
      payload: {
        hero: {
          smallTitle: 'Test title',
          largeTitle: 'Headline',
          description: 'Lead',
          coverImage: '',
        },
        stats: [],
      },
    });
    assert(en?.locale === 'en', 'english translation should upsert');
    console.log('PASS upsert translation');

    const published = await updateAdminBrandNarrative(created.id, {
      status: 'published',
      blocks: [
        ...created.blocks,
        {
          id: 'block-cta-1',
          type: 'cta',
          href: '/contact',
          locales: {
            zh: { smallTitle: '合作', largeTitle: '咨询我们', description: '', buttonLabel: '联系' },
          },
          items: [],
        },
      ],
    });
    assert(published?.status === 'published', 'should publish');
    assert(published?.publishedAt, 'publishedAt should be set when publishing');
    assert(published?.blocks.length === 4, 'should append cta block');
    console.log('PASS patch status+blocks');

    const detail = await getAdminBrandNarrativeDetail(created.id);
    assert(detail?.translations.length === 2, 'should have two locales');
    console.log('PASS detail');

    const storefront = await getStorefrontBrandNarrativeBySlug(slug, 'zh');
    assert(storefront, 'published slug should be readable from front mapper');
    assert(storefront.hero.eyebrow === '测试小标题', 'front hero eyebrow should map from smallTitle');
    assert(storefront.hero.title === '测试大标题', 'front hero headline should map from largeTitle');
    assert(storefront.sections.some((section) => section.type === 'split-content'), 'split block should map to storefront section');
    assert(storefront.sections.some((section) => section.type === 'header-grid'), 'summary block should map to header-grid');
    assert(storefront.sections.some((section) => section.type === 'timeline'), 'timeline block should map to storefront section');
    assert(storefront.sections.some((section) => section.type === 'cta'), 'cta block should map to storefront section');
    assert(!('seoTitle' in (detail?.translations[0]?.payload ?? {})), 'i18n payload should not keep seoTitle');
    console.log('PASS storefront mapping');

    const unpublished = await getStorefrontBrandNarrativeBySlug(slug, 'zh');
    await updateAdminBrandNarrative(created.id, { status: 'draft' });
    const hidden = await getStorefrontBrandNarrativeBySlug(slug, 'zh');
    assert(unpublished, 'was published before unpublish');
    assert(!hidden, 'draft should hide from storefront');
    console.log('PASS unpublish hides from storefront');

    const removed = await deleteAdminBrandNarrative(created.id);
    assert(removed, 'delete should succeed');
    createdId = undefined;
    const missing = await getAdminBrandNarrativeDetail(created.id);
    assert(!missing, 'deleted detail should be gone');
    console.log('PASS delete');

    console.log('All brand narrative admin tests passed.');
  } finally {
    if (createdId) {
      await deleteAdminBrandNarrative(createdId);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
