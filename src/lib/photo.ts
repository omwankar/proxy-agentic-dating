/** Local files in /public are served directly. Remote CDN links go through the proxy. */
export function photoSrc(photo?: string) {
  if (!photo) return "";
  if (photo.startsWith("/")) return photo;
  return `/api/img?u=${encodeURIComponent(photo)}`;
}
