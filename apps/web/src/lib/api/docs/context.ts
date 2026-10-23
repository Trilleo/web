/** Where the docs are being read from, so their links and examples point there. */
export interface DocContext {
  /** The API's origin: https://api.trilleo.net (or api.localhost:<port>). */
  api: string;
  /** The main site's origin. */
  site: string;
}
