import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { findStoreProduct, formatNaira, type StoreProduct } from "@/lib/storeCatalog";
import { useStoreCart } from "@/hooks/useStoreCart";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:slug");
  const product = trpc.catalogue.bySlug.useQuery({ slug: params?.slug || "" });
  const [notice, setNotice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const { add } = useStoreCart();

  if (product.isLoading) return <div className="min-h-screen bg-[#f6f7fb] p-10 text-slate-500">Loading product…</div>;
  const previewItem = findStoreProduct(params?.slug || "");
  if (!product.data && !previewItem) return <div className="min-h-screen bg-[#f6f7fb] p-10"><Link href="/" className="font-bold text-cyan-700">← Back to store</Link><div className="mx-auto mt-20 max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-semibold text-[#0b1736]">Product not found</h1><p className="mt-3 text-slate-500">This item may have been removed or is not available yet.</p></div></div>;

  const item = product.data;
  const specifications = item ? Object.entries(item.specifications || {}) : Object.entries(previewItem?.specs || {});
  const itemName = item?.name || previewItem?.name || "Olucha product";
  const itemCategory = item?.category || previewItem?.category || "Product";
  const itemDescription = item?.description || previewItem?.description || "A quality product selected by Olucha Kwantum Ventures.";
  const numericPrice = item ? item.priceKobo / 100 : previewItem?.price || 0;
  const itemPrice = formatNaira(numericPrice);
  const itemUnit = item?.unit || previewItem?.unit || "available to order";
  const itemColor = previewItem?.color || "from-[#123a67] via-cyan-700 to-[#f7b32b]";
  const normalizedCategory: StoreProduct["category"] = itemCategory.toLowerCase().includes("fashion") ? "Fashion" : itemCategory.toLowerCase().includes("agro") ? "Agro Products" : "Electronics";
  const baseCartProduct: StoreProduct = previewItem || { id: item?.id || 999, slug: params?.slug || "product", name: itemName, category: normalizedCategory, price: numericPrice, unit: itemUnit, description: itemDescription, color: itemColor, tag: "Available", specs: Object.fromEntries(specifications) };
  const cartProduct: StoreProduct = { ...baseCartProduct, variant: { size: size || undefined, color: color || undefined } };
  const isFashion = itemCategory.toLowerCase().includes("fashion");
  const isElectronics = itemCategory.toLowerCase().includes("electronic");
  const canAdd = !isFashion || Boolean(size);

  return <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8"><Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-700"><ArrowLeft size={17}/> Back to shop</Link><p className="text-sm font-bold tracking-[.16em] text-[#0b1736]">OLUCHA KWANTUM VENTURES</p><Link href="/cart" aria-label="Open cart"><ShoppingBag size={20} className="text-[#0b1736]"/></Link></div></header><main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20"><div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-start"><div className={`relative flex min-h-[460px] items-end overflow-hidden rounded-[2rem] bg-gradient-to-br ${itemColor} p-8 shadow-xl`} style={item?.imageUrl ? { backgroundImage: `url(${item.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><div className="absolute inset-0 bg-gradient-to-t from-[#0b1736]/80 via-[#0b1736]/20 to-transparent"/><p className="relative max-w-lg text-5xl font-semibold tracking-[-.05em] text-white">{itemName}</p></div><div className="rounded-[2rem] bg-white p-7 shadow-sm sm:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-700">{itemCategory}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.05em] text-[#0b1736]">{itemName}</h1><p className="mt-6 leading-7 text-slate-600">{itemDescription}</p><div className="mt-8 border-y border-slate-200 py-6"><p className="text-3xl font-bold text-[#0b1736]">{itemPrice}</p><p className="mt-1 text-sm text-slate-400">{itemUnit}</p></div>{isFashion && <label className="mt-7 block text-sm font-semibold text-slate-700">Size<select value={size} onChange={(event) => setSize(event.target.value)} className="field mt-2"><option value="">Select a size</option><option>Small</option><option>Medium</option><option>Large</option><option>XL</option></select></label>}{(isFashion || isElectronics) && <label className="mt-4 block text-sm font-semibold text-slate-700">Color<select value={color} onChange={(event) => setColor(event.target.value)} className="field mt-2"><option value="">Select a color</option><option>Black</option><option>White</option><option>Blue</option><option>Natural</option></select></label>}<div className="mt-6 flex items-center gap-4"><span className="text-sm font-semibold text-slate-700">Quantity</span><div className="flex items-center rounded-full border border-slate-200"><button aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="p-3 text-slate-600"><Minus size={15}/></button><span className="min-w-8 text-center font-bold">{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="p-3 text-slate-600"><Plus size={15}/></button></div></div><button disabled={!canAdd} onClick={() => { add(cartProduct, quantity); setNotice("Product added to cart. Open the cart to continue."); }} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#f7b32b] px-6 py-3.5 text-sm font-bold text-[#0b1736] disabled:cursor-not-allowed disabled:opacity-50"><ShoppingBag size={17}/> {canAdd ? "Add to cart" : "Select a size first"}</button>{notice && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-700"><Check size={16}/>{notice}</p>}<div className="mt-10"><h2 className="font-semibold text-[#0b1736]">Specifications</h2><div className="mt-4 space-y-3">{specifications.map(([key, value]) => <div key={key} className="flex justify-between gap-5 border-b border-slate-100 pb-3 text-sm"><span className="capitalize text-slate-400">{key}</span><span className="text-right font-semibold text-slate-700">{value}</span></div>)}</div></div><div className="mt-10 border-t border-slate-200 pt-7"><div className="flex items-center gap-2"><Star size={17} className="text-amber-500"/><h2 className="font-semibold text-[#0b1736]">Customer reviews</h2></div><p className="mt-3 text-sm leading-6 text-slate-500">No customer reviews have been published for this product yet. Reviews will appear here after verified customer purchases.</p></div></div></div></main></div>;
}
