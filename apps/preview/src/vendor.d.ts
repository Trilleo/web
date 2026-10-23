// Types the bundler provides (Vite's `?url` imports: a file's address once built).

declare module "*?url" {
  const url: string;
  export default url;
}

// Stylesheets imported for their side effect (the bundler adds them to the page).
declare module "*.css";
