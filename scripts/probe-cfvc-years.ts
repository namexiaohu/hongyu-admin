import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://cfvcseek.com';
const years = [2024, 2021] as const;
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'scrape-output');

(async () => {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  for (const year of years) {
    const url = `${BASE}/cfvc/${year}-cfvc`;
    console.log('fetch', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(2000);
    const html = await page.content();
    await writeFile(path.join(outDir, `info${year}.html`), html, 'utf8');

    const $ = cheerio.load(html);
    console.log('\n===', year, '===');
    console.log('title:', $('title').text().trim());
    console.log(
      'stats:',
      $('.fvca_top li')
        .map((_, li) => {
          const v = $(li).find('.counter').text().trim();
          const s = $(li).find('.etl i').text().trim();
          const l = $(li)
            .find('.zieb,.etr')
            .map((_, e) => $(e).text().trim())
            .get()
            .join(' / ');
          return `${v}${s} ${l}`;
        })
        .get(),
    );
    console.log('desc preview:', $('.fvca_bottom .cc p').first().text().trim().slice(0, 160));
    console.log(
      'imgs:',
      $('.fvca_bottom img, .CFVC_A img, .fvca_top img')
        .map((_, img) => $(img).attr('src'))
        .get()
        .filter(Boolean)
        .slice(0, 8),
    );
  }

  await browser.close();
})();
