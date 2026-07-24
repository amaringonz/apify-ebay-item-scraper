import { Actor } from 'apify';
import type { ProxyConfigurationOptions } from 'apify';
import { PlaywrightCrawler, log } from 'crawlee';
import * as cheerio from 'cheerio';
import type { EbayItemResult } from './types';
import {
    extractAvailability,
    extractCondition,
    extractDescriptionText,
    extractImages,
    extractItemId,
    extractItemSpecifics,
    extractPrice,
    extractProductJsonLd,
    extractReviews,
    extractSeller,
    extractShipping,
    extractTitle,
    extractVariants,
} from './extract';

interface Input {
    url: string;
    proxyConfiguration?: ProxyConfigurationOptions;
}

async function main() {
    await Actor.init();

    const input = await Actor.getInput<Input>();
    if (!input?.url) {
        throw new Error('Input is missing the required "url" field.');
    }

    const { url } = input;
    const itemId = extractItemId(url);
    const proxyConfiguration = await Actor.createProxyConfiguration(
        input.proxyConfiguration ?? { groups: ['RESIDENTIAL'] },
    );

    let extractionSucceeded = false;

    const crawler = new PlaywrightCrawler({
        proxyConfiguration,
        maxRequestRetries: 5,
        requestHandlerTimeoutSecs: 60,
        preNavigationHooks: [
            async ({ page, request }) => {
                if (request.userData?.warmedUp) return;
                request.userData ??= {};
                request.userData.warmedUp = true;
                await page.goto('https://www.ebay.com/', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
            },
        ],
        async requestHandler({ page, parseWithCheerio, request }) {
            await page.waitForSelector('h1.x-item-title__mainTitle, [data-testid="x-price-primary"]', { timeout: 15_000 }).catch(() => {});
            const $ = await parseWithCheerio();

            const product = extractProductJsonLd($);
            const title = extractTitle($, product);
            const price = extractPrice($, product);

            if (!title || !price) {
                throw new Error('Essential fields (title/price) could not be parsed - page may be a block/challenge page.');
            }

            const itemSpecifics = extractItemSpecifics($);

            let description: string | null = null;
            try {
                const iframeHandle = await page.$('#desc_ifr');
                if (iframeHandle) {
                    await iframeHandle.scrollIntoViewIfNeeded().catch(() => {});
                    const descFrame = await iframeHandle.contentFrame();
                    if (descFrame) {
                        await descFrame.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
                        const html = await descFrame.content();
                        const $desc = cheerio.load(html);
                        description = extractDescriptionText($desc);
                    }
                }
            } catch (error) {
                log.warning(`Could not extract description iframe for ${request.url}: ${(error as Error).message}`);
            }

            const result: EbayItemResult = {
                url: request.url,
                itemId,
                title,
                price,
                condition: extractCondition(product, itemSpecifics),
                availability: extractAvailability($, product),
                images: extractImages(product, $),
                seller: extractSeller($),
                shipping: extractShipping($),
                itemSpecifics,
                description,
                variants: extractVariants($),
                reviews: extractReviews($),
                scrapedAt: new Date().toISOString(),
            };

            await Actor.pushData(result);
            extractionSucceeded = true;
        },
        async failedRequestHandler({ request }, error) {
            log.error(`Failed to extract item ${request.url}: ${(error as Error).message}`);
        },
    });

    await crawler.run([url]);

    if (!extractionSucceeded) {
        await Actor.fail(
            `Could not extract item ${url}: the page may be blocked (anti-bot challenge) or the item is no longer available.`,
        );
    }

    await Actor.exit();
}

main();
