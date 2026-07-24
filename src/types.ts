export interface EbayItemResult {
    url: string;
    itemId: string;
    title: string;
    price: { value: number; currency: string } | null;
    condition: string | null;
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
        shippingDetails?: {
            shippingRate?: { value?: string; currency?: string };
            shippingDestination?: { addressCountry?: string };
        }[];
    };
}
