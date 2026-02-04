import React, { useEffect } from "react";

type Props = {
  title?: string;
  description?: string;
  image?: string;
  canonicalPath?: string;
};

export function Seo({ title, description, image, canonicalPath }: Props){
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setProp = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    if (description) setMeta("description", description);

    // basic OG tags
    if (title) setProp("og:title", title);
    if (description) setProp("og:description", description);
    if (image) setProp("og:image", image);
    setProp("og:type", "website");

    if (canonicalPath) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      const origin = window.location.origin;
      link.href = origin + canonicalPath;
    }
  }, [title, description, image, canonicalPath]);

  return null;
}
