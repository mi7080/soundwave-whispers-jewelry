export const SOUL_PAGE_BASE_URL = "https://animuswave.com";

export interface SoulPageData {
  petName: string;
  photoUrl: string;
  audioUrl: string;
}

export interface SoulPageOrderRecord {
  pet_name: string;
  pet_photo_url: string | null;
  audio_url: string | null;
}

export function buildSoulPageUrl(orderId: string): string {
  return `${SOUL_PAGE_BASE_URL}/soul/${orderId}`;
}

export function mapOrderToSoulPageData(order: SoulPageOrderRecord): SoulPageData | null {
  const photoUrl = order.pet_photo_url?.trim() || "";
  const audioUrl = order.audio_url?.trim() || "";

  if (!photoUrl && !audioUrl) {
    return null;
  }

  return {
    petName: order.pet_name?.trim() || "Memorial",
    photoUrl,
    audioUrl,
  };
}
