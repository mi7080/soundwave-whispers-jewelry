/**
 * Central product configuration for ShineOn PT-2151
 * Edit prices, materials, shipping, and variant details here.
 */

import dogtagSteel from "@/assets/dogtag-steel.jpg";
import dogtagGold from "@/assets/dogtag-gold.jpg";

export const PRODUCT_CONFIG = {
  // ShineOn identifiers
  shineonProductId: 30338,
  shineonTemplate: "PT-2151",

  // Shopify identifiers (for cart creation)
  shopifyGid: "gid://shopify/Product/10550449602872",
  shopifyHandle: "animus-personalized-soundwave-jewelry-with-scannable-memory-page",

  // Product info
  title: "The Universal Memorial Pendant",
  description:
    "A luxury laser-engraved dog-tag pendant in 316L Stainless Steel or 18K Yellow Gold finish. Soundwave on the front, custom name on the back, and a scannable QR Soul Page.",

  // Pricing
  fullPrice: 89.90,
  foundersPrice: 49.90, // ~40% off
  currency: "USD",

  // Specs
  material: "316L Surgical Stainless Steel",
  pendantSize: '1.1" × 2" (28.5 × 51 mm) — Classic Dog-Tag Shape',
  chainLength: '24" Military-Style Ball Chain (61 cm)',
  clasp: "Lobster Clasp Attachment",
  engraving: "Laser-Etched Soundwave (Front) · Custom Name (Back)",
  packaging: "Complimentary Luxury Gift Box",
  shipping: "Free US Shipping — 7–14 Business Days",

  // Variants
  variants: [
    {
      id: "gid://shopify/ProductVariant/52167512162616",
      title: "Polished Stainless Steel",
      fullPrice: 89.90,
      foundersPrice: 49.90,
      image: dogtagSteel,
      imageAlt: "ANIMUS Memorial Pendant — Polished Stainless Steel Dog Tag",
    },
    {
      id: "gid://shopify/ProductVariant/52167512129848",
      title: "18K Yellow Gold Finish",
      fullPrice: 109.90,
      foundersPrice: 59.90,
      image: dogtagGold,
      imageAlt: "ANIMUS Memorial Pendant — 18K Yellow Gold Dog Tag",
    },
  ],

  // Gallery images (used by ProductGallery)
  galleryImages: [
    { src: dogtagGold, alt: "ANIMUS Memorial Pendant — 18K Yellow Gold Dog Tag Front" },
    { src: dogtagSteel, alt: "ANIMUS Memorial Pendant — Polished Stainless Steel Dog Tag Front" },
  ],
} as const;
