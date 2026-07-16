export type AllowedImageMime =
  "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export interface DocumentAsset {
  name: string;
  url: string;
  size: number;
  mimeType: AllowedImageMime;
  updatedAt: string;
}
