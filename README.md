# eBay Item Scraper

An [Apify Actor](https://apify.com) that extracts full product data from a single eBay item page — title, price, condition, images, seller, shipping, item specifics, variants, description, and reviews.

Built with [Crawlee](https://crawlee.dev) + [Playwright](https://playwright.dev) and TypeScript.

## What it does

Give it the URL of any eBay item page and it returns a single structured record with:

| Field | Description |
|---|---|
| `url` / `itemId` | Source URL and eBay item ID |
| `title` | Item title |
| `price` | `{ value, currency }` |
| `condition` | Item condition (e.g. "New", "Used") |
| `availability` | `{ inStock, quantityAvailable, quantitySold }` |
| `images` | Array of full-size image URLs |
| `seller` | `{ username, feedbackScore, positiveFeedbackPercent }` |
| `shipping` | `{ cost, location, estimatedDelivery }` |
| `itemSpecifics` | Key/value map of the "Item specifics" table |
| `description` | Full text of the item description |
| `variants` | Available options (e.g. size, color) |
| `reviews` | `{ averageRating, totalReviews }` |
| `scrapedAt` | ISO timestamp of the scrape |

## Input

```json
{
  "url": "https://www.ebay.com/itm/286949138543",
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `url` | string | yes | Full URL of the eBay item page |
| `proxyConfiguration` | object | no | Defaults to Apify's `RESIDENTIAL` proxy group |

> **Note:** eBay blocks Apify's shared datacenter proxy IPs. Use the `RESIDENTIAL` proxy group (requires that add-on on your Apify plan) for reliable results.

See [`.actor/input_schema.json`](.actor/input_schema.json) for the full schema.

## Output

Results are pushed to the Actor's default [dataset](https://docs.apify.com/platform/storage/dataset), one item per run. See [`src/types.ts`](src/types.ts) for the exact TypeScript shape (`EbayItemResult`).

## Running locally

```bash
npm install
npm run start:dev   # compile + run once with local input
```

Provide input via `storage/key_value_stores/default/INPUT.json`, or set it through the Apify CLI / Apify Console when running on the platform.

### Scripts

| Command | Purpose |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Build, then run the compiled Actor |
| `npm run start:dev` | Compile and run in one step (for local iteration) |

## Deploying to Apify

```bash
apify login
apify push
```

The Actor's platform metadata lives in [`.actor/`](.actor) (`actor.json`, `input_schema.json`, `output_schema.json`, `dataset_schema.json`, `Dockerfile`).

## Reporting bugs / requesting features

Please use the issue templates:
- [Report a bug](.github/ISSUE_TEMPLATE/bug_report.md)
- [Request a feature](.github/ISSUE_TEMPLATE/feature_request.md)

## License

Licensed under [CC BY 4.0](LICENSE) — free to use, modify, and redistribute, including commercially, as long as you credit **Alejandro Marín González**.
