/**
 * Central product configuration for ANIMUS Memorial Pendant
 * Flat $89 across all variants — Founders Pricing.
 */

import dogtagSteel from "@/assets/dogtag-steel.jpg";
import dogtagGold from "@/assets/dogtag-gold.jpg";

export const PRODUCT_CONFIG = {
  shineonProductId: 30338,
  shineonTemplate: "PT-2151",

  title: "The Universal Memorial Pendant",
  description:
    "A luxury laser-engraved dog-tag pendant in 316L Stainless Steel or 18K Yellow Gold finish. Soundwave on the front, custom text on the back, and a scannable QR Soul Page.",

  // Flat Founders Pricing
  fullPrice: 89,
  foundersPrice: 89,
  currency: "USD",

  material: "316L Surgical Stainless Steel",
  pendantSize: '1.1" × 2" (28.5 × 51 mm) — Classic Dog-Tag Shape',
  chainLength: '24" Military-Style Ball Chain (61 cm)',
  clasp: "Lobster Clasp Attachment",
  engraving: "Laser-Etched Soundwave (Front) · Custom Text (Back)",
  packaging: "Complimentary Luxury Gift Box",
  shipping: "Free US Shipping — 7–14 Business Days",

  variants: [
    {
      id: "variant-steel",
      title: "Polished Stainless Steel",
      fullPrice: 89,
      foundersPrice: 89,
      image: dogtagSteel,
      imageAlt: "ANIMUS Memorial Pendant — Polished Stainless Steel Dog Tag",
    },
    {
      id: "variant-gold",
      title: "14K Gold Finish",
      fullPrice: 89,
      foundersPrice: 89,
      image: dogtagGold,
      imageAlt: "ANIMUS Memorial Pendant — 14K Gold Dog Tag",
    },
  ],

  galleryImages: [
    { src: dogtagGold, alt: "ANIMUS Memorial Pendant — 18K Yellow Gold Dog Tag Front" },
    { src: dogtagSteel, alt: "ANIMUS Memorial Pendant — Polished Stainless Steel Dog Tag Front" },
  ],
} as const;
