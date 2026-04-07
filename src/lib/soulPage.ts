const CLOUDINARY_CLOUD_NAME = "dsmbuwxqf";

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
  cloudinary_folder_url?: string | null;
}

export function buildSoulPageUrl(orderId: string): string {
  return `${SOUL_PAGE_BASE_URL}/soul/${orderId}`;
}

function encodeCloudinaryPublicId(publicId: string): string {
  return publicId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildCloudinaryAssetUrl(resourceType: "image" | "video", publicId: string): string {
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/${encodeCloudinaryPublicId(publicId)}`;
}

function extractRootFolderFromConsoleUrl(folderUrl?: string | null): string | null {
  if (!folderUrl) return null;

  try {
    const parsedUrl = new URL(folderUrl);
    const folderMarker = "/folders/";
    const markerIndex = parsedUrl.pathname.indexOf(folderMarker);

    if (markerIndex === -1) return null;

    const encodedFolder = parsedUrl.pathname.slice(markerIndex + folderMarker.length);
    return encodedFolder ? decodeURIComponent(encodedFolder) : null;
  } catch {
    return null;
  }
}

export function deriveSoulPageAssets(folderUrl?: string | null) {
  const rootFolder = extractRootFolderFromConsoleUrl(folderUrl);
  if (!rootFolder) return null;

  return {
    rootFolder,
    photoUrl: buildCloudinaryAssetUrl("image", `${rootFolder}/SoulPage_Assets/customer_photo.jpg`),
    audioUrl: buildCloudinaryAssetUrl("video", `${rootFolder}/SoulPage_Assets/customer_audio.webm`),
  };
}

export function mapOrderToSoulPageData(order: SoulPageOrderRecord): SoulPageData | null {
  const derivedAssets = deriveSoulPageAssets(order.cloudinary_folder_url);
  const photoUrl = order.pet_photo_url?.trim() || derivedAssets?.photoUrl || "";
  const audioUrl = order.audio_url?.trim() || derivedAssets?.audioUrl || "";

  if (!photoUrl && !audioUrl) {
    return null;
  }

  return {
    petName: order.pet_name?.trim() || "Memorial",
    photoUrl,
    audioUrl,
  };
}