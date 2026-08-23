import { Search, ShoppingBag, ArrowRight, SlidersHorizontal } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { pageRange, paginate } from "@/lib/pagination";
import { formatNaira, storeCategories, storeProducts, type StoreProduct } from "@/lib/storeCatalog";
import { filterProducts } from "@/lib/productFilter";
import { trpc } from "@/lib/trpc";
import BrandHeader from "@/components/BrandHeader";

export default function Shop() {
  const [, params] = useRoute("/shop/:category");
  const initialCategory = params?.category ? decodeURIComponent(params.category) : "All products";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(1);
  const catalogue = trpc.catalogue.list.useQuery();
  const sourceProducts = useMemo<StoreProduct[]>(() => catalogue.data?.length ? catalogue.data.map((product) => ({ id: product.id, slug: product.slug, name: product.name, category: product.category.toLowerCase().includes("fashion") ? "Fashion" : product.category.toLowerCase().includes("agro") ? "Agro Products" : "Electronics", price: product.priceKobo / 100, unit: product.unit, description: product.description, color: "from-[#1f5b9f] via-[#0b1736] to-[#cfa43a]", tag: product.isActive ? "Available" : "Unavailable", specs: product.specifications || {}, imageUrl: product.imageUrl || undefined })) : storeProducts, [catalogue.data]);
  const filtered = useMemo(() => filterProducts(sourceProducts, category, query), [category, query, sourceProducts]);
  const paged = useMemo(() => paginate(filtered, page, 4), [filtered, page]);
  useEffect(() => setPage(1), [category, query]);

  return <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
    <BrandHeader backHref="/" backLabel="Back to store" section="Shop catalogue" actionHref="/cart" actionLabel="Cart" />
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="eyebrow">Olucha online store</p><h1 className="section-title max-w-2xl">Shop products chosen for everyday life.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Browse electronics first, then explore fashion and agro products. Every item has a clear price, practical description, and a direct path to order.</p></div><div className="relative w-full md:max-w-sm"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the store" className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#cfa43a] focus:ring-4 focus:ring-[#cfa43a]/20"/></div></div>
      <div className="mt-12 flex items-center gap-3 overflow-x-auto pb-2"><SlidersHorizontal size={17} className="shrink-0 text-[#1f5b9f]"/>{storeCategories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`okv-filter whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${category === item ? "okv-filter-active" : ""}`}>{item}</button>)}</div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{paged.items.map((product) => <article key={product.slug} className="interactive-card overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white"><Link href={`/products/${product.slug}`} className={`link-lift relative flex h-64 items-end bg-gradient-to-br ${product.color} bg-cover bg-center p-6 text-white`} style={product.imageUrl ? { backgroundImage: `linear-gradient(to top, rgba(11,23,54,.82), rgba(11,23,54,.12)), url(${product.imageUrl})` } : undefined}><span className="absolute left-5 top-5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] backdrop-blur">{product.tag}</span><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/70">{product.category}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">{product.name}</h2></div></Link><div className="p-6"><p className="min-h-12 text-sm leading-6 text-slate-500">{product.description}</p><div className="mt-6 flex items-end justify-between"><div><p className="text-xl font-bold text-[#0b1736]">{formatNaira(product.price)}</p><p className="text-xs text-slate-400">{product.unit}</p></div><Link href={`/products/${product.slug}`} className="pressable inline-flex items-center gap-1 rounded-full bg-[#f7b32b] px-4 py-2 text-xs font-bold text-[#0b1736] hover:bg-[#cfa43a] hover:shadow-lg hover:shadow-[#cfa43a]/25">View item <ArrowRight size={14}/></Link></div></div></article>)}</div>
      {filtered.length > paged.pageSize && <nav className="mt-8 flex flex-wrap items-center justify-between gap-4" aria-label="Shop pagination"><p className="text-sm text-slate-500">Showing {((paged.page - 1) * paged.pageSize) + 1}–{Math.min(paged.page * paged.pageSize, paged.total)} of {paged.total} products</p><div className="flex items-center gap-2"><button type="button" disabled={paged.page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="pressable rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f5b9f] disabled:cursor-not-allowed disabled:opacity-40">Previous</button>{pageRange(paged.page, paged.pageCount).map((item) => <button type="button" key={item} onClick={() => setPage(item)} aria-current={item === paged.page ? "page" : undefined} className={`okv-filter rounded-full px-3 py-2 text-sm font-semibold ${item === paged.page ? "okv-filter-active" : ""}`}>{item}</button>)}<button type="button" disabled={paged.page === paged.pageCount} onClick={() => setPage((current) => Math.min(paged.pageCount, current + 1))} className="pressable rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f5b9f] disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></nav>}
      {!filtered.length && <div className="mt-8 rounded-3xl bg-white p-12 text-center text-slate-500">No products match that search yet.</div>}
    </main>
  </div>;
}
