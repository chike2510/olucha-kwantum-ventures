import { Search, ShoppingBag, ArrowRight, SlidersHorizontal } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useMemo, useState } from "react";
import { formatNaira, storeCategories, storeProducts } from "@/lib/storeCatalog";

export default function Shop() {
  const [, params] = useRoute("/shop/:category");
  const initialCategory = params?.category ? decodeURIComponent(params.category) : "All products";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const filtered = useMemo(() => storeProducts.filter((product) => {
    const categoryMatch = category === "All products" || product.category === category;
    const queryMatch = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatch && queryMatch;
  }), [category, query]);

  return <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"><Link href="/" className="text-sm font-bold tracking-[.18em] text-[#0b1736]">OLUCHA <span className="font-normal text-slate-400">STORE</span></Link><nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex"><Link href="/shop" className="text-cyan-700">Shop</Link><Link href="/shop/Electronics">Electronics</Link><Link href="/shop/Fashion">Fashion</Link><Link href="/shop/Agro%20Products">Agro products</Link></nav><Link href="/cart" className="inline-flex items-center gap-2 rounded-full bg-[#0b1736] px-4 py-2 text-sm font-bold text-white"><ShoppingBag size={16}/> Cart</Link></div></header>
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="eyebrow">Olucha online store</p><h1 className="section-title max-w-2xl">Shop products chosen for everyday life.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Browse electronics first, then explore fashion and agro products. Every item has a clear price, practical description, and a direct path to order.</p></div><div className="relative w-full md:max-w-sm"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the store" className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"/></div></div>
      <div className="mt-12 flex items-center gap-3 overflow-x-auto pb-2"><SlidersHorizontal size={17} className="shrink-0 text-cyan-700"/>{storeCategories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${category === item ? "bg-[#0b1736] text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>{item}</button>)}</div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((product) => <article key={product.slug} className="interactive-card overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white"><Link href={`/products/${product.slug}`} className={`relative flex h-64 items-end bg-gradient-to-br ${product.color} p-6 text-white`}><span className="absolute left-5 top-5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] backdrop-blur">{product.tag}</span><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/70">{product.category}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">{product.name}</h2></div></Link><div className="p-6"><p className="min-h-12 text-sm leading-6 text-slate-500">{product.description}</p><div className="mt-6 flex items-end justify-between"><div><p className="text-xl font-bold text-[#0b1736]">{formatNaira(product.price)}</p><p className="text-xs text-slate-400">{product.unit}</p></div><Link href={`/products/${product.slug}`} className="inline-flex items-center gap-1 rounded-full bg-[#f7b32b] px-4 py-2 text-xs font-bold text-[#0b1736]">View item <ArrowRight size={14}/></Link></div></div></article>)}</div>
      {!filtered.length && <div className="mt-8 rounded-3xl bg-white p-12 text-center text-slate-500">No products match that search yet.</div>}
    </main>
  </div>;
}
