import { ArrowLeft, Search, ShoppingBag, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { OKV_WORDMARK_URL } from "@/lib/siteConfig";
import { formatNaira } from "@/lib/storeCatalog";
import type { ProductSearchSuggestion } from "@/lib/productSuggestions";

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
  searchSuggestions?: readonly ProductSearchSuggestion[];
  suggestionsLoading?: boolean;
  suggestionsError?: boolean;
};

export default function BrandHeader({
  backHref = "/",
  backLabel = "Back to store",
  section,
  actionHref,
  actionLabel,
  actionShortLabel,
  actionIcon: ActionIcon = ShoppingBag,
  searchValue = "",
  onSearchChange,
  searchSuggestions,
  suggestionsLoading = false,
  suggestionsError = false,
}: BrandHeaderProps) {
  const shortLabel = actionShortLabel ?? (actionLabel && actionLabel.length <= 8 ? actionLabel : "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const [, navigate] = useLocation();
  const suggestions = searchSuggestions ?? [];
  const hasQuery = searchValue.trim().length > 0;
  const canNavigateSuggestions = Boolean(
    onSearchChange && searchOpen && hasQuery && !suggestionsLoading && !suggestionsError && suggestions.length,
  );
  const suggestionsVisible = Boolean(canNavigateSuggestions && !suggestionsDismissed);
  const statusText = !onSearchChange || !searchOpen || !hasQuery || suggestionsDismissed
    ? ""
    : suggestionsLoading
      ? "Loading active product suggestions…"
      : suggestionsError
        ? "Product suggestions are unavailable right now."
        : searchSuggestions === undefined
          ? ""
          : suggestions.length
            ? `${suggestions.length} active product suggestions. Use the arrow keys to navigate.`
            : "No matching active products.";

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const selectSuggestion = (product: ProductSearchSuggestion) => {
    setSearchOpen(false);
    setActiveSuggestionIndex(-1);
    setSuggestionsDismissed(false);
    navigate(`/products/${encodeURIComponent(product.slug)}`);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && canNavigateSuggestions) {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveSuggestionIndex((current) => current < 0 ? 0 : (current + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp" && canNavigateSuggestions) {
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveSuggestionIndex((current) => current < 0 ? suggestions.length - 1 : (current - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === "Enter" && suggestionsVisible && activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestionIndex]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (suggestionsVisible) {
        setSuggestionsDismissed(true);
        setActiveSuggestionIndex(-1);
      } else {
        setSearchOpen(false);
        setSuggestionsDismissed(false);
        setActiveSuggestionIndex(-1);
        searchButtonRef.current?.focus();
      }
    }
  };

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
          {onSearchChange && <button
            ref={searchButtonRef}
            type="button"
            onClick={() => {
              setSearchOpen((open) => !open);
              setActiveSuggestionIndex(-1);
              setSuggestionsDismissed(false);
            }}
            aria-label={searchOpen ? "Close product search" : "Search products"}
            aria-expanded={searchOpen}
            aria-controls="brand-header-search"
            title="Search products"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0b1736] transition hover:border-[#cfa43a] hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f5b9f]"
          >
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
          <div className="relative sm:max-w-lg">
            <input
              ref={searchInputRef}
              id="store-search"
              type="search"
              role="combobox"
              value={searchValue}
              onChange={(event) => {
                onSearchChange(event.target.value);
                setActiveSuggestionIndex(-1);
                setSuggestionsDismissed(false);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search the store"
              autoComplete="off"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded={suggestionsVisible}
              aria-controls="brand-header-search-suggestions"
              aria-activedescendant={suggestionsVisible && activeSuggestionIndex >= 0 ? `brand-header-search-suggestion-${activeSuggestionIndex}` : undefined}
              aria-describedby={statusText ? "brand-header-search-status" : undefined}
              className="min-h-12 w-full rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-base text-[#0b1736] outline-none transition placeholder:text-slate-400 focus:border-[#cfa43a] focus:ring-4 focus:ring-[#cfa43a]/20 sm:text-sm"
            />
            {statusText && <p id="brand-header-search-status" role="status" className={`${suggestionsVisible ? "sr-only" : "mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500"}`}>
              {statusText}
            </p>}
            <div
              id="brand-header-search-suggestions"
              role="listbox"
              aria-label="Product suggestions"
              hidden={!suggestionsVisible}
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              {suggestions.map((product, index) => (
                <button
                  key={product.id}
                  id={`brand-header-search-suggestion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeSuggestionIndex === index}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                  onClick={() => selectSuggestion(product)}
                  className={`flex min-h-16 w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#1f5b9f] ${activeSuggestionIndex === index ? "bg-[#fffaf0]" : "hover:bg-slate-50"}`}
                >
                  {product.imageUrl
                    ? <img src={product.imageUrl} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-xl bg-slate-100 object-cover" />
                    : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#1f5b9f]"><ShoppingBag size={18} aria-hidden="true" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#0b1736]">{product.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{product.category}</span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-[#1f5b9f]">{formatNaira(product.price)}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>}
    </header>
  );
}
