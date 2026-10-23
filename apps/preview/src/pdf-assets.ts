/**
 * Where pdf.js's data files are served: the CMaps that CJK and other non-Latin PDFs
 * need, the 14 standard fonts, and the WebAssembly image decoders (JPEG 2000, JBIG2,
 * colour profiles). Without them those PDFs draw blank text or missing pictures.
 * The site copies them there (./integration.ts); the version keeps old pages working
 * across an upgrade.
 */
export const PDF_ASSET_ROOT = "/_pdfjs/";

export const PDF_ASSET_DIRS = ["cmaps", "standard_fonts", "wasm"] as const;

export function pdfAssetUrl(
  version: string,
  dir: (typeof PDF_ASSET_DIRS)[number],
): string {
  return `${PDF_ASSET_ROOT}${version}/${dir}/`;
}
