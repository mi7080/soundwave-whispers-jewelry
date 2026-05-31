/**
 * Central product configuration for ANIMUS Memorial Pendant
 * Flat $89 across all variants — Founders Pricing.
 */

import dogtagSteel from "@/assets/dogtag-steel.jpg";
import dogtagGold from "@/assets/dogtag-gold.jpg";

export const PRODUCT_CONFIG = {
  shineonProductId: 30338,
  shineonTemplate: "PT-2151",

  // ShineOn API variant SKUs for "The ANIMUS Soulwave Pendant" (Partner CSV/API store).
  // Variant axis: finish (steel/gold) × back engraving (add_name_to_back yes/no).
  // Confirmed against the product's Variations table in the ShineOn app.
  shineonSkus: {
    steel: { engraved: "SO-15845643", plain: "SO-15845642" },
    gold: { engraved: "SO-15845645", plain: "SO-15845644" },
  },

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
      finish: "steel",
      title: "Polished Stainless Steel",
      fullPrice: 89,
      foundersPrice: 89,
      image: dogtagSteel,
      imageAlt: "ANIMUS Memorial Pendant — Polished Stainless Steel Dog Tag",
    },
    {
      id: "variant-gold",
      finish: "gold",
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

export type PendantFinish = keyof typeof PRODUCT_CONFIG.shineonSkus;

/**
 * Resolve the ShineOn variant SKU for a given finish + whether the buyer added
 * back engraving (animus_orders.add_name_to_back). Falls back to steel if the
 * finish is unknown. Single source of truth for the SKU sent to ShineOn.
 */
export function resolveShineonSku(finish: string | null | undefined, engraved: boolean): string {
  const set = PRODUCT_CONFIG.shineonSkus[(finish as PendantFinish)] ?? PRODUCT_CONFIG.shineonSkus.steel;
  return engraved ? set.engraved : set.plain;
}
