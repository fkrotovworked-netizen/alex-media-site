// Files from public/, addressed from the site's base. Locally the site lives at `/`; on
// GitHub Pages it lives at `/<repo>/`, and a bare `/brand/…` would point outside it.
// (CSS `url()` and index.html are rewritten by Vite; strings in code are not.)
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
