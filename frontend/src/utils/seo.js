/**
 * TRACE-X SEO and Metadata Utilities
 * Provides canonical URL generation, absolute preview image paths,
 * and standard schema definitions without hardcoded domain assumptions.
 */

export const getSiteUrl = () => {
  // Configured via environment variable VITE_SITE_URL in production,
  // falling back to window.location.origin in browser, or documented placeholder.
  const envUrl = import.meta.env.VITE_SITE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.replace(/\/+$/, "");
  }

  if (
    typeof window !== "undefined" &&
    window.location &&
    window.location.origin &&
    !window.location.origin.includes("localhost") &&
    !window.location.origin.includes("127.0.0.1")
  ) {
    return window.location.origin;
  }

  // Documented canonical placeholder for pre-deployment validation
  return "https://tracex.example.com";
};

export const getCanonicalUrl = (path = "/") => {
  const baseUrl = getSiteUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

export const getOgImageUrl = () => {
  return `${getSiteUrl()}/og-preview.png`;
};
