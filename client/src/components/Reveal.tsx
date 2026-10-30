import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from "react";

type RevealProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article";
  delay?: number;
  variant?: "rise" | "slide" | "zoom";
};

type RevealEnvironment = {
  media: Pick<MediaQueryList, "matches" | "addEventListener" | "removeEventListener">;
  Observer?: typeof IntersectionObserver;
};

/** Reveal once when the content is actually in view, never just when data mounts. */
export function observeReveal(element: HTMLElement, reveal: () => void, { media, Observer }: RevealEnvironment) {
  let observer: IntersectionObserver | undefined;
  let complete = false;
  const show = () => {
    if (complete) return;
    complete = true;
    observer?.disconnect();
    reveal();
  };
  const onPreferenceChange = () => { if (media.matches) show(); };
  if (media.matches || !Observer) {
    show();
    return () => {};
  }
  observer = new Observer((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) show();
  }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
  observer.observe(element);
  // Keyboard users must never land on a visually hidden control.
  element.addEventListener("focusin", show);
  media.addEventListener("change", onPreferenceChange);
  return () => {
    observer?.disconnect();
    element.removeEventListener("focusin", show);
    media.removeEventListener("change", onPreferenceChange);
  };
}

export default function Reveal({ as: Tag = "div", delay = 0, variant = "rise", className = "", style, ...props }: RevealProps) {
  const elementRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!elementRef.current) return;
    return observeReveal(elementRef.current, () => setVisible(true), {
      media: window.matchMedia("(prefers-reduced-motion: reduce)"),
      Observer: window.IntersectionObserver,
    });
  }, []);

  return <Tag {...props} ref={elementRef as React.Ref<HTMLElement & HTMLDivElement>}
    data-reveal-state={visible ? "visible" : "pending"}
    data-reveal-variant={variant}
    className={`motion-reveal ${className}`}
    style={{ "--reveal-delay": `${Math.min(Math.max(delay, 0), 600)}ms`, ...style } as CSSProperties} />;
}
