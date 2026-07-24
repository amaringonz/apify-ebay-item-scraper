import { Actor } from 'apify';
import type { ProxyConfigurationOptions } from 'apify';
import { CheerioCrawler, log } from 'crawlee';
import * as cheerio from 'cheerio';
import type { EbayItemResult } from './types';
import {
    extractAvailability,
    extractCondition,
    extractDescriptionIframeUrl,
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

    const crawler = new CheerioCrawler({
        proxyConfiguration,
        maxRequestRetries: 5,
        requestHandlerTimeoutSecs: 60,
        async requestHandler({ $, request, sendRequest }) {
            const product = extractProductJsonLd($);
            const title = extractTitle($, product);
            const price = extractPrice($, product);

            if (!title || !price) {
                throw new Error('Essential fields (title/price) could not be parsed - page may be a block/challenge page.');
            }

            const itemSpecifics = extractItemSpecifics($);

            let description: string | null = null;
            const descIframeUrl = extractDescriptionIframeUrl($);
            if (descIframeUrl) {
                try {
                    const descResponse = await sendRequest({ url: descIframeUrl });
                    const $desc = cheerio.load(descResponse.body);
                    description = extractDescriptionText($desc);
                } catch (error) {
                    log.warning(`Could not fetch description iframe for ${request.url}: ${(error as Error).message}`);
                }
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
