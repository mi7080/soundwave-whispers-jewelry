

## Pass Personalization Data as Shopify Cart Line Item Attributes

Shopify's Storefront API supports `attributes` on cart line items — key/value pairs that appear in the Shopify Admin order details. We'll thread the pet name, right-side engraving, and audio URL through the cart system.

### Changes

**1. `src/components/ProductSection.tsx`**
- Add state for right-side engraving (`rightSideText`) — currently the input has no `value`/`onChange`
- Build a `customAttributes` array from non-empty values: `Pet Name`, `Right Side Engraving`, `Audio URL`
- Pass `customAttributes` into `addItem()`

**2. `src/lib/shopify.ts`**
- Add `customAttributes?: Array<{ key: string; value: string }>` to the `CartItem` interface
- Update `createShopifyCart` to include `attributes` in the cart line input: `{ quantity, merchandiseId, attributes }`
- Update `addLineToShopifyCart` similarly
- The Storefront API `CartLineInput` already supports `attributes: [AttributeInput!]` natively — no mutation changes needed, just pass the data in the variables

**3. `src/stores/cartStore.ts`**
- No structural changes needed — `customAttributes` flows through the existing `CartItem` type automatically

### How It Works in Shopify Admin

Once attributes are passed, each order line item will show:
- **Pet Name**: Buddy
- **Right Side Engraving**: 04.12.2019
- **Audio URL**: https://res.cloudinary.com/dsmbuwxqf/...

These appear under "Line item properties" in the Shopify order detail, visible to fulfillment partners.

### Technical Detail

The `CartLineInput` in Shopify's Storefront API accepts:
```graphql
input CartLineInput {
  merchandiseId: ID!
  quantity: Int!
  attributes: [AttributeInput!]  # ← we add this
}
```
Where `AttributeInput` is `{ key: String!, value: String! }`.

No GraphQL mutation text changes are required — just passing the `attributes` array in the variables.

