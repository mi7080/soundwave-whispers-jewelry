export const SOUL_PAGE_BASE_URL = "https://animuswaves.com";

export interface SoulPageData {
  petName: string;
  photoUrl: string;
  audioUrl: string;
  videoUrl?: string;
  textMessage?: string;
}

export interface SoulPageOrderRecord {
  pet_name: string;
  pet_photo_url: string | null;
  audio_url: string | null;
  text_message?: string | null;
  soul_video_url?: string | null;
}

export function buildSoulPageUrl(orderId: string): string {
  return `${SOUL_PAGE_BASE_URL}/soul/${orderId}`;
}

export function mapOrderToSoulPageData(order: SoulPageOrderRecord): SoulPageData | null {
  return {
    petName: order.pet_name?.trim() || "Memorial",
    photoUrl: order.pet_photo_url?.trim() || "",
    audioUrl: order.audio_url?.trim() || "",
    videoUrl: order.soul_video_url?.trim() || "",
    textMessage: order.text_message?.trim() || "",
  };
}
