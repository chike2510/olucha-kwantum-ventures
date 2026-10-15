/**
 * The asset layer serves index.html for unknown paths (single-page-app fallback). That is right for
 * page routes, but a missing *file* (e.g. /old-script.js) should be a real 404, not the HTML shell.
 */
export function isMissingFileFallback(pathname: string, contentType: string | null): boolean {
  const lastSegment = pathname.split("/").pop() ?? "";
  const looksLikeFile = /\.[a-z0-9]+$/i.test(lastSegment) && !/\.html?$/i.test(lastSegment);
  return looksLikeFile && (contentType ?? "").toLowerCase().startsWith("text/html");
}
