import '@/lib/env';

import { seedBrandNarratives } from '@/server/db/seed-brand-narratives';

const trainingOnly = process.argv.includes('--training');

seedBrandNarratives(trainingOnly ? { slugs: ['training'] } : undefined).catch((error) => {
  console.error(error);
  process.exit(1);
});
