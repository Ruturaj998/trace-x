import { useEffect } from "react";
import { getCanonicalUrl, getOgImageUrl } from "../utils/seo";

/**
 * Updates document head metadata dynamically on client-side route transitions.
 * Supports unique page titles, descriptions, index/noindex controls,
 * Open Graph, Twitter cards, canonical tags, and JSON-LD schema injection.
 */
export default function PageMeta({
  title,
  description,
  path = "/",
  noIndex = false,
  schema = null,
}) {
  useEffect(() => {
    // 1. Title
    const formattedTitle = title
      ? `${title} — TRACE-X`
      : "TRACE-X — Device Security & Stolen-Device Telemetry Command Center";
    document.title = formattedTitle;

    // Helper to get or create meta tag
    const setMetaTag = (attributeName, attributeValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attributeName, attributeValue);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // 2. Standard Meta Description & Robots
    const defaultDesc =
      "TRACE-X stolen-device tracking and security command console. Real-time telemetry, geographic coordinates, and lost-device status management.";
    const activeDescription = description || defaultDesc;
    setMetaTag("name", "description", activeDescription);
    setMetaTag(
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow"
    );

    // 3. Canonical URL
    const canonicalUrl = getCanonicalUrl(path);
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalUrl);

    // 4. Open Graph Social Cards
    const ogImage = getOgImageUrl();
    setMetaTag("property", "og:title", formattedTitle);
    setMetaTag("property", "og:description", activeDescription);
    setMetaTag("property", "og:url", canonicalUrl);
    setMetaTag("property", "og:image", ogImage);
    setMetaTag("property", "og:type", "website");
    setMetaTag("property", "og:site_name", "TRACE-X");

    // 5. Twitter / X Cards
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", formattedTitle);
    setMetaTag("name", "twitter:description", activeDescription);
    setMetaTag("name", "twitter:image", ogImage);

    // 6. JSON-LD Structured Data
    const scriptId = "tracex-jsonld-schema";
    let jsonLdScript = document.getElementById(scriptId);

    if (schema) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement("script");
        jsonLdScript.id = scriptId;
        jsonLdScript.type = "application/ld+json";
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(schema);
    } else if (jsonLdScript) {
      jsonLdScript.remove();
    }

    return () => {
      // Clean up injected structured data when switching views
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [title, description, path, noIndex, schema]);

  return null;
}
