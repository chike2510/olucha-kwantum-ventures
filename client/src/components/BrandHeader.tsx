import { ArrowLeft, Search, ShoppingBag, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { OKV_WORDMARK_URL } from "@/lib/siteConfig";
import { useEffect, useRef, useState } from "react";

type BrandHeaderProps = {
  backHref?: string;
  backLabel?: string;
  section?: string;
  actionHref?: string;
  actionLabel?: string;
  /** Label used below the `sm` breakpoint. Pass "" for an icon-only button on phones. Defaults to actionLabel when it is short. */
  actionShortLabel?: string;
  actionIcon?: LucideIcon;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export default function BrandHeader({ backHref = "/", backLabel = "Back to store", section, actionHref, actionLabel, actionShortLabel, actionIcon: ActionIcon = ShoppingBag, searchValue = "", onSearchChange }: BrandHeaderProps) {
  const shortLabel = actionShortLabel ?? (actionLabel && actionLabel.length <= 8 ? actionLabel : "");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

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
          {onSearchChange && <button ref={searchButtonRef} type="button" onClick={() => setSearchOpen((open) => !open)} aria-label={searchOpen ? "Close product search" : "Search products"} aria-expanded={searchOpen} aria-controls="brand-header-search" title="Search products" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b1736] transition hover:border-[#cfa43a] hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5b9f]">
            <Search size={19} aria-hidden="true" />
          </button>}
          {actionHref && actionLabel && (
            <Link href={actionHref} aria-label={actionLabel} className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#0b1736] text-sm font-bold text-white hover:bg-[#1f5b9f] ${shortLabel ? "px-4" : "w-11 sm:w-auto sm:px-4"}`}>
              <ActionIcon size={16} aria-hidden="true" className="shrink-0" />
              {shortLabel ? <><span className="sm:hidden">{shortLabel}</span><span className="hidden sm:inline">{actionLabel}</span></> : <span className="hidden sm:inline">{actionLabel}</span>}
            </Link>
          )}
        </div>
      </div>
      {onSearchChange && <div id="brand-header-search" hidden={!searchOpen} className="border-t border-slate-100 bg-white/95 px-4 py-3 sm:px-5 lg:px-8">
        <form role="search" onSubmit={(event) => event.preventDefault()} className="mx-auto max-w-7xl">
          <label htmlFor="store-search" className="sr-only">Search products</label>
          <input ref={searchInputRef} id="store-search" type="search" value={searchValue} onChange={(event) => onSearchChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { setSearchOpen(false); searchButtonRef.current?.focus(); } }} placeholder="Search the store" autoComplete="off" className="min-h-12 w-full rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-base text-[#0b1736] outline-none transition placeholder:text-slate-400 focus:border-[#cfa43a] focus:ring-4 focus:ring-[#cfa43a]/20 sm:max-w-lg sm:text-sm" />
        </form>
      </div>}
    </header>
  );
}
