import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { paginate } from "@/lib/pagination";
import { catalogueToStoreProduct, storeCategories, type StoreProduct } from "@/lib/storeCatalog";
import { filterProducts } from "@/lib/productFilter";
import { getProductSuggestions } from "@/lib/productSuggestions";
import { trpc } from "@/lib/trpc";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import StoreProductCard from "@/components/StoreProductCard";
import Reveal from "@/components/Reveal";
import { getSupplierStockStatus } from "@shared/supplierStock";

export default function Shop() {
  const [, params] = useRoute("/shop/:category");
  const initialCategory = params?.category ? decodeURIComponent(params.category) : "All products";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(1);
  const catalogue = trpc.catalogue.list.useQuery();

  const sourceProducts = useMemo<StoreProduct[]>(() => (catalogue.data || [])
    .filter((product) => Boolean(product.isActive))
    .map((item) => {
      const product = catalogueToStoreProduct(item);
      const status = getSupplierStockStatus({ mapped: item.supplierMapped, stock: item.supplierStock, syncedAt: item.supplierStockSyncedAt });
      const tag = status === "refresh-required" ? "Availability being confirmed" : status === "out-of-stock" ? "Out of stock" : "Available";
      return { ...product, tag };
    }), [catalogue.data]);

  const filtered = useMemo(() => filterProducts(sourceProducts, category, query), [category, query, sourceProducts]);
  const searchSuggestions = useMemo(() => getProductSuggestions(sourceProducts, query), [query, sourceProducts]);
  const paged = useMemo(() => paginate(filtered, page, 4), [filtered, page]);
  useEffect(() => setPage(1), [category, query]);
  useEffect(() => setCategory(initialCategory), [initialCategory]);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
      <BrandHeader
        backHref="/"
        backLabel="Back to store"
        section="Shop"
        actionHref="/cart"
        actionLabel="Cart"
        searchValue={query}
        onSearchChange={setQuery}
        searchSuggestions={searchSuggestions}
        suggestionsLoading={catalogue.isLoading}
        suggestionsError={catalogue.isError}
      />
      <main>
        <section className="relative isolate overflow-hidden bg-[#0b1736] text-white">
          <div className="hero-ambient pointer-events-none absolute -right-20 -top-32 -z-10 h-[26rem] w-[26rem] rounded-full bg-[#1f5b9f]/35 blur-3xl" aria-hidden="true" />
          <div className="hero-ambient hero-ambient-gold pointer-events-none absolute -bottom-40 left-[32%] -z-10 h-[24rem] w-[24rem] rounded-full bg-[#cfa43a]/15 blur-3xl" aria-hidden="true" />
          <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
            <p className="motion-rise inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-[#e1ba56]"><span className="h-px w-8 bg-[#cfa43a]" /> Olucha online store</p>
          </div>
          <div className="mx-auto max-w-7xl px-5 pb-5 lg:px-8">
            <p className="text-xs font-semibold text-white/45">{category === "All products" ? "Browse the collection" : `Browsing ${category}`}</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 pt-8 lg:px-8 lg:pb-28 lg:pt-12" aria-label="Store catalogue">
          <Reveal className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">The collection</p>
              <h2 className="font-[Manrope] text-2xl font-bold tracking-[-.04em] text-[#0b1736] sm:text-3xl">Explore products</h2>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-500"><SlidersHorizontal size={16} className="text-[#1f5b9f]" aria-hidden="true" /><span>Choose a category to refine your view</span></div>
          </Reveal>
          <div className="-mx-5 flex items-center gap-2 overflow-x-auto px-5 pb-3 lg:mx-0 lg:px-0" role="group" aria-label="Filter by category">
            {storeCategories.map((item, index) => (
              <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={`okv-filter min-h-12 shrink-0 whitespace-nowrap rounded-full px-5 text-sm font-semibold ${category === item ? "okv-filter-active" : ""}`}>
                {index === 0 ? "All products" : item}
              </button>
            ))}
          </div>

          {catalogue.isLoading && <p className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500" role="status">Loading products…</p>}
          {catalogue.isError && <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center"><p className="font-semibold text-[#0b1736]">We couldn’t load the products.</p><p className="mt-2 text-sm text-slate-500">Please try again shortly.</p></div>}
          {!catalogue.isLoading && !catalogue.isError && <>
            <div className={`mt-7 grid items-start gap-5 xl:gap-6 ${paged.items.length === 1 ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
              {paged.items.map((product, index) => <StoreProductCard key={product.id} product={product} index={index} spotlight={paged.items.length === 1} imagePriority={index === 0} action={<Link href={`/products/${product.slug}`} className="pressable inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#f7b32b] px-4 text-xs font-bold text-[#0b1736] transition hover:bg-[#e4a21d] focus-visible:outline-offset-4">View item <ArrowRight size={14} aria-hidden="true" /></Link>} />)}
            </div>
            {!filtered.length && <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500"><p className="font-semibold text-[#0b1736]">{sourceProducts.length ? "No products match that search yet." : "No products are available yet."}</p>{sourceProducts.length > 0 && <button type="button" onClick={() => { setQuery(""); setCategory("All products"); }} className="mt-4 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-[#1f5b9f] transition hover:border-[#1f5b9f]">Clear filters</button>}</div>}
            {filtered.length > paged.pageSize && <nav className="mt-10 flex items-center justify-between gap-4 border-t border-slate-200 pt-6" aria-label="Shop pagination"><button type="button" disabled={paged.page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="pressable min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-[#1f5b9f] disabled:cursor-not-allowed disabled:opacity-40">Previous</button><span className="text-sm text-slate-500">Page {paged.page} of {paged.pageCount}</span><button type="button" disabled={paged.page === paged.pageCount} onClick={() => setPage((current) => Math.min(paged.pageCount, current + 1))} className="pressable min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-[#1f5b9f] disabled:cursor-not-allowed disabled:opacity-40">Next</button></nav>}
          </>}
          <Link href="/" className="mt-10 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#1f5b9f] transition hover:gap-3"><ArrowRight size={16} className="rotate-180" aria-hidden="true" /> Back to home</Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
