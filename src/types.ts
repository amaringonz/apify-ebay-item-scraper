export interface EbayItemResult {
    url: string;
    itemId: string;
    title: string;
    price: { value: number; currency: string; originalValue?: number; discountPercentage?: number } | null;
    condition: string | null;
    brand: string | null;
    availability: {
        inStock: boolean;
        quantityAvailable?: number;
        quantitySold?: number;
    };
    images: string[];
    seller: {
        username: string | null;
        feedbackScore?: number;
        positiveFeedbackPercent?: number;
    };
    shipping: {
        cost?: string;
        location?: string;
        estimatedDelivery?: string;
    };
    itemSpecifics: Record<string, string>;
    weightRaw: string | null;
    dimensionsRaw: string | null;
    description: string | null;
    variants?: {
        name: string;
        options: { value: string; available: boolean }[];
    }[];
    reviews?: {
        averageRating?: number;
        totalReviews?: number;
    };
    scrapedAt: string;
}

export interface ProductJsonLd {
    '@type': 'Product';
    name?: string;
    image?: string[] | string;
    color?: string;
    model?: string;
    brand?: { name?: string };
    offers?: {
        url?: string;
        itemCondition?: string;
        availability?: string;
        priceCurrency?: string;
        price?: string;
        priceSpecification?: { price?: string; priceCurrency?: string; name?: string };
        shippingDetails?: {
            shippingRate?: { value?: string; currency?: string };
            shippingDestination?: { addressCountry?: string };
        }[];
    };
}
