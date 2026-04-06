

## Add Product Specifications Section

Create a new `ProductSpecs` component that displays the dog tag's technical details in an elegant, text-only layout (no product image), and insert it after `ProductGallery` in the page.

### New file: `src/components/ProductSpecs.tsx`

A styled section with `bg-background` background containing:
- Section header: "Product Details" with gold accent label
- A centered grid (2×3 on desktop, 1 column on mobile) of spec cards, each with a Lucide icon in gold and the detail text:
  - **Pendant Size**: 1.1" × 2" (28.5mm × 51mm)
  - **Chain**: 24" Military-Style Ball Chain (61cm)
  - **Clasp**: Lobster Clasp Attachment
  - **Material**: Polished Stainless Steel / 18K Yellow Gold
  - **Engraving**: Laser-Etched Soundwave & QR Code
  - **Packaging**: Complimentary Luxury Gift Box

Style matches existing sections (gold accents, serif heading, muted body text).

### Modified file: `src/pages/Index.tsx`

Import `ProductSpecs` and place it directly after `<ProductGallery />` (line 24).

