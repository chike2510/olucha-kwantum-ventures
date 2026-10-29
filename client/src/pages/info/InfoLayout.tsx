import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import { BUSINESS } from "@/lib/siteConfig";

/** Shared wrapper for confirmed business details. */
export function Ph({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const POLICY_LINKS = [
  { href: "/policies/privacy", title: "Privacy Policy", summary: "What personal data we collect, why, and your rights under the NDPA." },
  { href: "/policies/shipping", title: "Shipping & Delivery", summary: "Delivery fees, timelines, coverage and export orders." },
  { href: "/policies/returns", title: "Returns & Refunds", summary: "How to return an item and when refunds are paid." },
  { href: "/terms", title: "Terms & Conditions", summary: "The rules that apply when you use the store and place an order." },
];

type InfoLayoutProps = {
  title: string;
  eyebrow: string;
  intro: ReactNode;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  lastUpdated?: boolean;
  toc?: Array<{ id: string; label: string }>;
  related?: Array<{ href: string; title: string }>;
  /** Wrap children in the long-form prose card (default true). */
  prose?: boolean;
};

export default function InfoLayout({ title, eyebrow, intro, children, backHref = "/", backLabel = "Back to store", lastUpdated, toc, related, prose = true }: InfoLayoutProps) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | ${BUSINESS.shortName}`;
    return () => { document.title = previous; };
  }, [title]);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
      <BrandHeader backHref={backHref} backLabel={backLabel} section={eyebrow} actionHref="/shop" actionLabel="Shop" />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="section-title">{title}</h1>
          <div className="mt-5 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{intro}</div>
          {lastUpdated && BUSINESS.policiesLastUpdated && <p className="mt-4 text-sm text-slate-500">Last updated: <Ph>{BUSINESS.policiesLastUpdated}</Ph></p>}
        </div>
        <div className={`mt-10 grid gap-8 ${toc?.length ? "lg:grid-cols-[15rem_1fr]" : ""}`}>
          {toc?.length ? (
            <div className="min-w-0">
              <details className="group rounded-3xl bg-white shadow-sm lg:hidden">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-xs font-bold uppercase tracking-[.16em] text-[#0b1736] [&::-webkit-details-marker]:hidden">On this page<ChevronDown size={16} className="text-[#1f5b9f] transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
                <ol className="grid gap-0.5 px-5 pb-4 text-sm">
                  {toc.map((item) => <li key={item.id}><a href={`#${item.id}`} className="flex min-h-10 items-center text-slate-600 hover:text-[#1f5b9f]">{item.label}</a></li>)}
                </ol>
              </details>
              <nav aria-label="On this page" className="hidden h-fit rounded-3xl bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:block">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#0b1736]">On this page</p>
                <ol className="mt-3 grid gap-0.5 text-sm">
                  {toc.map((item) => <li key={item.id}><a href={`#${item.id}`} className="flex min-h-10 items-center text-slate-600 hover:text-[#1f5b9f]">{item.label}</a></li>)}
                </ol>
              </nav>
            </div>
          ) : null}
          <div className="min-w-0">
            {prose ? <article className="okv-prose rounded-[2rem] bg-white p-6 shadow-sm sm:p-10">{children}</article> : children}
            {related?.length ? (
              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#0b1736]">Related</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {related.map((link) => <Link key={link.href} href={link.href} className="interactive-card flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#0b1736]">{link.title}<ArrowRight size={16} className="shrink-0 text-[#1f5b9f]" aria-hidden="true" /></Link>)}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
