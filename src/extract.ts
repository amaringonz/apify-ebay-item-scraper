import type { CheerioAPI } from 'cheerio';
import type { EbayItemResult, ProductJsonLd } from './types';

const cleanText = (text: string): string => text.replace(/\s+/g, ' ').trim();

const HTML_ENTITIES: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
};

const decodeHtmlEntities = (text: string): string =>
    text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, (entity) => HTML_ENTITIES[entity]);

export function extractItemId(url: string): string {
    const match = url.match(/\/itm\/(?:[^/?]+\/)?(\d+)/);
    if (!match) {
        throw new Error(`Could not extract item id from URL: ${url}`);
    }
    return match[1];
}

export function extractProductJsonLd($: CheerioAPI): ProductJsonLd | null {
    let product: ProductJsonLd | null = null;
    $('script[type="application/ld+json"]').each((_, el) => {
        const raw = $(el).contents().text();
        if (!raw) return;
        try {
            const parsed = JSON.parse(decodeHtmlEntities(raw));
            if (parsed && parsed['@type'] === 'Product') {
                product = parsed as ProductJsonLd;
            }
        } catch {
            // Not valid/parseable JSON-LD, ignore.
        }
    });
    return product;
}

export function extractImages(product: ProductJsonLd | null, $: CheerioAPI): string[] {
    if (product?.image) {
        return Array.isArray(product.image) ? product.image : [product.image];
    }
    const images: string[] = [];
    $('[data-testid="ux-image-carousel"] img, .ux-image-carousel img').each((_, el) => {
        const src = $(el).attr('src') ?? $(el).attr('data-src');
        if (src) images.push(src);
    });
    return [...new Set(images)];
}

export function extractSeller($: CheerioAPI): EbayItemResult['seller'] {
    const usernameEl = $('[data-testid="x-sellercard-atf"] .x-sellercard-atf__info__about-seller a span.ux-textspans--BOLD').first();
    const username = usernameEl.length ? cleanText(usernameEl.text()) : null;

    const feedbackCountText = $('[data-testid="x-sellercard-atf__about-seller"] span.ux-textspans--SECONDARY').first().text();
    const feedbackCountMatch = feedbackCountText.match(/\(([\d,]+)\)/);
    const feedbackScore = feedbackCountMatch ? Number(feedbackCountMatch[1].replace(/,/g, '')) : undefined;

    const positiveText = $('[data-testid="x-sellercard-atf__data-item"] span.ux-textspans--PSEUDOLINK')
        .filter((_, el) => /%/.test($(el).text()))
        .first()
        .text();
    const positiveMatch = positiveText.match(/([\d.]+)%/);
    const positiveFeedbackPercent = positiveMatch ? Number(positiveMatch[1]) : undefined;

    return { username, feedbackScore, positiveFeedbackPercent };
}

export function extractShipping($: CheerioAPI): EbayItemResult['shipping'] {
    const shipping: EbayItemResult['shipping'] = {};

    const costText = $('[data-testid="ux-labels-values"].ux-labels-values--shipping span.ux-textspans--BOLD').first().text();
    if (costText) shipping.cost = cleanText(costText);

    $('.ux-textspans--SECONDARY').each((_, el) => {
        const text = cleanText($(el).text());
        if (text.startsWith('Located in:')) {
            shipping.location = cleanText(text.replace('Located in:', ''));
        }
    });

    const deliveryText = $('[data-testid="ux-labels-values"].ux-labels-values--deliverto span.ux-textspans--BOLD').first().text();
    if (deliveryText) shipping.estimatedDelivery = cleanText(deliveryText);

    return shipping;
}

export function extractAvailability($: CheerioAPI, product: ProductJsonLd | null): EbayItemResult['availability'] {
    const inStock = product?.offers?.availability?.includes('InStock') ?? true;

    const availabilityTexts = $('#qtyAvailability .ux-textspans')
        .map((_, el) => $(el).text())
        .get();

    let quantityAvailable: number | undefined;
    let quantitySold: number | undefined;
    for (const text of availabilityTexts) {
        const availableMatch = text.match(/([\d,]+)\s+available/i);
        const soldMatch = text.match(/([\d,]+)\s+sold/i);
        if (availableMatch) quantityAvailable = Number(availableMatch[1].replace(/,/g, ''));
        if (soldMatch) quantitySold = Number(soldMatch[1].replace(/,/g, ''));
    }

    return { inStock, quantityAvailable, quantitySold };
}

export function extractItemSpecifics($: CheerioAPI): Record<string, string> {
    const specifics: Record<string, string> = {};

    $('.ux-layout-section--features [data-testid="ux-labels-values"]').each((_, dl) => {
        const label = cleanText($(dl).find('.ux-labels-values__labels-content').first().text());
        if (!label) return;

        const valuesContent = $(dl).find('.ux-labels-values__values-content').first();
        const hiddenFull = valuesContent.find('.ux-expandable-textual-display-block-inline.hide [data-testid="text"]').first();
        const visibleTruncated = valuesContent.find('[data-testid="text"]').first();

        // The full/truncated text blocks may also contain a trailing "See all
        // condition definitions" link nested in the same element; restrict to
        // the direct text span so that link text isn't appended to the value.
        let value: string;
        if (hiddenFull.length) {
            const directText = hiddenFull.children('span.ux-textspans').first();
            value = cleanText(directText.length ? directText.text() : hiddenFull.text());
        } else if (visibleTruncated.length) {
            const directText = visibleTruncated.children('span.ux-textspans').first();
            value = cleanText(directText.length ? directText.text() : visibleTruncated.text());
        } else {
            value = cleanText(valuesContent.text());
        }

        if (value) specifics[label] = value;
    });

    return specifics;
}

export function extractVariants($: CheerioAPI): EbayItemResult['variants'] {
    const variants: NonNullable<EbayItemResult['variants']> = [];

    $('[data-testid="x-msku-evo"] .x-sku').each((_, skuBlock) => {
        const name = cleanText($(skuBlock).find('.btn__label').first().text()).replace(/:$/, '');
        if (!name) return;

        const options = $(skuBlock)
            .find('.listbox__option[data-sku-value-name]')
            .map((_, opt) => $(opt).attr('data-sku-value-name'))
            .get()
            .filter((v): v is string => Boolean(v));

        if (options.length) variants.push({ name, options });
    });

    return variants.length ? variants : undefined;
}

export function extractTitle($: CheerioAPI, product: ProductJsonLd | null): string | null {
    if (product?.name) return cleanText(product.name);
    const fallback = $('h1.x-item-title__mainTitle').first().text();
    return fallback ? cleanText(fallback) : null;
}

export function extractPrice($: CheerioAPI, product: ProductJsonLd | null): EbayItemResult['price'] {
    if (product?.offers?.price && product.offers.priceCurrency) {
        return { value: Number(product.offers.price), currency: product.offers.priceCurrency };
    }
    const priceText = $('[data-testid="x-price-primary"] .ux-textspans').first().text();
    const match = priceText.match(/([\d,]+\.\d{2})/);
    if (!match) return null;
    return { value: Number(match[1].replace(/,/g, '')), currency: 'USD' };
}

export function extractCondition(product: ProductJsonLd | null, itemSpecifics: Record<string, string>): string | null {
    if (itemSpecifics.Condition) return itemSpecifics.Condition;
    const schemaCondition = product?.offers?.itemCondition;
    if (schemaCondition) {
        const suffix = schemaCondition.split('/').pop() ?? '';
        const label = suffix.replace(/Condition$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
        if (label) return label;
    }
    return null;
}

export function extractDescriptionIframeUrl($: CheerioAPI): string | null {
    return $('#desc_ifr').attr('src') ?? null;
}

export function extractDescriptionText($: CheerioAPI): string {
    return cleanText($('body').text());
}

export function extractReviews($: CheerioAPI): EbayItemResult['reviews'] {
    const ratingEl = $('[data-testid="x-star-rating-section"], [data-testid="x-product-reviews"]').first();
    if (!ratingEl.length) return undefined;

    const averageText = ratingEl.find('[itemprop="ratingValue"]').first().text()
        || ratingEl.attr('aria-label')
        || '';
    const countText = ratingEl.find('[itemprop="reviewCount"], [itemprop="ratingCount"]').first().text();

    const averageMatch = averageText.match(/([\d.]+)/);
    const countMatch = countText.match(/([\d,]+)/);

    if (!averageMatch && !countMatch) return undefined;

    return {
        averageRating: averageMatch ? Number(averageMatch[1]) : undefined,
        totalReviews: countMatch ? Number(countMatch[1].replace(/,/g, '')) : undefined,
    };
}
