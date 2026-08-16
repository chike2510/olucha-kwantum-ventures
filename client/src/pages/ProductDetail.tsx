import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Check, ShoppingBag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { findStoreProduct, formatNaira } from "@/lib/storeCatalog";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:slug");
  const product = trpc.catalogue.bySlug.useQuery({ slug: params?.slug || "" });
  const [notice, setNotice] = useState("");
  if (product.isLoading) return <div className="min-h-screen bg-[#f6f7fb] p-10 text-slate-500">Loading product…</div>;
  const previewItem = findStoreProduct(params?.slug || "");
  if (!product.data && !previewItem) return <div className="min-h-screen bg-[#f6f7fb] p-10"><Link href="/" className="font-bold text-cyan-700">← Back to store</Link><div className="mx-auto mt-20 max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-semibold text-[#0b1736]">Product not found</h1><p className="mt-3 text-slate-500">This item may have been removed or is not available yet.</p></div></div>;
  const item = product.data;
  const specifications = item ? Object.entries(item.specifications || {}) : Object.entries(previewItem?.specs || {});
  const itemName = item?.name || previewItem?.name || "Olucha product";
  const itemCategory = item?.category || previewItem?.category || "Product";
  const itemDescription = item?.description || previewItem?.description || "A quality product selected by Olucha Kwantum Ventures.";
  const itemPrice = item ? formatNaira(item.priceKobo / 100) : formatNaira(previewItem?.price || 0);
  const itemUnit = item?.unit || previewItem?.unit || "available to order";
  const itemColor = previewItem?.color || "from-[#123a67] via-cyan-700 to-[#f7b32b]";
  return <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-700"><ArrowLeft size={17}/> Back to store</Link><p className="text-sm font-bold tracking-[.16em] text-[#0b1736]">OLUCHA KWANTUM VENTURES</p><ShoppingBag size={20} className="text-[#0b1736]"/></div></header><main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20"><div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-start"><div className={`flex min-h-[460px] items-end rounded-[2rem] bg-gradient-to-br ${itemColor} p-8 shadow-xl`}><p className="max-w-lg text-5xl font-semibold tracking-[-.05em] text-white">{itemName}</p></div><div className="rounded-[2rem] bg-white p-7 shadow-sm sm:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">{itemCategory}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.05em] text-[#0b1736]">{itemName}</h1><p className="mt-6 leading-7 text-slate-600">{itemDescription}</p><div className="mt-8 border-y border-slate-200 py-6"><p className="text-3xl font-bold text-[#0b1736]">{itemPrice}</p><p className="mt-1 text-sm text-slate-400">{itemUnit}</p></div><button onClick={() => setNotice("Product added to cart. Open the store cart to continue.")} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#f7b32b] px-6 py-3.5 text-sm font-bold text-[#0b1736]"><ShoppingBag size={17}/> Add to cart</button>{notice && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-700"><Check size={16}/>{notice}</p>}<div className="mt-10"><h2 className="font-semibold text-[#0b1736]">Specifications</h2><div className="mt-4 space-y-3">{specifications.map(([key, value]) => <div key={key} className="flex justify-between gap-5 border-b border-slate-100 pb-3 text-sm"><span className="capitalize text-slate-400">{key}</span><span className="text-right font-semibold text-slate-700">{value}</span></div>)}</div></div></div></div></main></div>;
}
