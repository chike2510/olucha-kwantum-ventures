import { ArrowLeft, ShoppingBag, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { OKV_WORDMARK_URL } from "@/lib/siteConfig";

type BrandHeaderProps = {
  backHref?: string;
  backLabel?: string;
  section?: string;
  actionHref?: string;
  actionLabel?: string;
  /** Label used below the `sm` breakpoint. Pass "" for an icon-only button on phones. Defaults to actionLabel when it is short. */
  actionShortLabel?: string;
  actionIcon?: LucideIcon;
};

export default function BrandHeader({ backHref = "/", backLabel = "Back to store", section, actionHref, actionLabel, actionShortLabel, actionIcon: ActionIcon = ShoppingBag }: BrandHeaderProps) {
  const shortLabel = actionShortLabel ?? (actionLabel && actionLabel.length <= 8 ? actionLabel : "");
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href={backHref} aria-label={backLabel} title={backLabel} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full text-sm font-bold text-[#1f5b9f] hover:bg-[#1f5b9f]/10 max-md:w-11 md:px-3">
            <ArrowLeft size={18} aria-hidden="true" />
            <span className="hidden whitespace-nowrap md:inline">{backLabel}</span>
          </Link>
          <Link href="/" aria-label="Olucha Kwantum Ventures home" className="flex h-11 w-[9.5rem] min-w-0 shrink items-center overflow-hidden rounded-xl bg-white px-2 py-1 shadow-sm ring-1 ring-[#d2a63b]/50 min-[400px]:w-[11rem] sm:w-[15rem]">
            <img src={OKV_WORDMARK_URL} alt="Olucha Kwantum Ventures — Quality products, trusted globally." className="h-full w-full object-contain object-left" />
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {section && <span className="hidden whitespace-nowrap text-xs font-bold uppercase tracking-[.18em] text-[#0b1736] lg:block">{section}</span>}
          {actionHref && actionLabel && (
            <Link href={actionHref} aria-label={actionLabel} className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#0b1736] text-sm font-bold text-white hover:bg-[#1f5b9f] ${shortLabel ? "px-4" : "w-11 sm:w-auto sm:px-4"}`}>
              <ActionIcon size={16} aria-hidden="true" className="shrink-0" />
              {shortLabel ? <><span className="sm:hidden">{shortLabel}</span><span className="hidden sm:inline">{actionLabel}</span></> : <span className="hidden sm:inline">{actionLabel}</span>}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
