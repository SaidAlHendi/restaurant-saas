export const IMAGE_WIDTHS = [400, 800, 1200] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export function imageObjectKey(prefix: string, width: ImageWidth): string {
  return `${prefix}-${String(width)}.webp`;
}

export function imageUrlsFromPrefix(
  storage: ObjectStorage,
  prefix: string | null | undefined,
): { url400: string; url800: string; url1200: string } | null {
  if (!prefix) {
    return null;
  }
  return {
    url400: storage.publicUrl(imageObjectKey(prefix, 400)),
    url800: storage.publicUrl(imageObjectKey(prefix, 800)),
    url1200: storage.publicUrl(imageObjectKey(prefix, 1200)),
  };
}
