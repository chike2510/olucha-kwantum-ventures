import { useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { findStoreProduct, formatNaira, type StoreProduct } from "@/lib/storeCatalog";
import { customerSpecs } from "@/lib/productSpecs";
import { useStoreCart } from "@/hooks/useStoreCart";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import VariantSelector, { type VariantOption, type VariantSelectorHandle } from "@/components/VariantSelector";

const SIZE_OPTIONS: VariantOption[] = [
  { value: "Small", label: "S" },
  { value: "Medium", label: "M" },
  { value: "Large", label: "L" },
  { value: "XL", label: "XL" },
];

const COLOR_OPTIONS: VariantOption[] = [
  { value: "Black", swatch: "#111827" },
  { value: "White", swatch: "#ffffff" },
  { value: "Blue", swatch: "#1f5b9f" },
  { value: "Natural", swatch: "#d8c3a0" },
];

export default function ProductDetail() {
  const [, params] = useRoute("/products/:slug");
  const product = trpc.catalogue.bySlug.useQuery({ slug: params?.slug || "" });
  const [notice, setNotice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const sizeRef = useRef<VariantSelectorHandle>(null);
  const colorRef = useRef<VariantSelectorHandle>(null);
  const { add } = useStoreCart();

  if (product.isLoading) {
    return <div className="min-h-screen bg-[#f6f7fb]"><BrandHeader backHref="/shop" backLabel="Back to shop" actionHref="/cart" actionLabel="Cart" /><main className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-2 lg:px-8 lg:py-20" aria-busy="true" aria-label="Loading product"><div className="h-72 animate-pulse rounded-[2rem] bg-slate-200 sm:h-[460px]" /><div className="space-y-4 rounded-[2rem] bg-white p-7"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /><div className="h-9 w-3/4 animate-pulse rounded bg-slate-200" /><div className="h-20 animate-pulse rounded bg-slate-100" /></div></main></div>;
  }
  const previewItem = findStoreProduct(params?.slug || "");
  if (!product.data && !previewItem) {
    return <div className="min-h-screen bg-[#f6f7fb]"><BrandHeader backHref="/shop" backLabel="Back to shop" actionHref="/cart" actionLabel="Cart" /><main className="px-5 py-16"><div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm"><ShoppingBag className="mx-auto mb-4 text-slate-300" size={38} aria-hidden="true" /><h1 className="text-2xl font-semibold text-[#0b1736]">Product not found</h1><p className="mt-3 text-slate-500">This item may have been removed or is not available yet.</p><Link href="/shop" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f7b32b] px-5 text-sm font-bold text-[#0b1736]"><ArrowLeft size={16} aria-hidden="true" />Back to shop</Link></div></main><SiteFooter /></div>;
  }

  const item = product.data;
  const rawSpecs: Record<string, unknown> = item ? (item.specifications || {}) : (previewItem?.specs || {});
  const specifications = customerSpecs(rawSpecs);
  const itemName = item?.name || previewItem?.name || "Olucha product";
  const itemCategory = item?.category || previewItem?.category || "Product";
  const itemDescription = item?.description || previewItem?.description || "A quality product selected by Olucha Kwantum Ventures.";
  const numericPrice = item ? item.priceKobo / 100 : previewItem?.price || 0;
  const itemPrice = formatNaira(numericPrice);
  const itemUnit = item?.unit || previewItem?.unit || "available to order";
  const itemColor = previewItem?.color || "from-[#1f5b9f] via-[#0b1736] to-[#cfa43a]";
  const normalizedCategory: StoreProduct["category"] = itemCategory.toLowerCase().includes("fashion") ? "Fashion" : itemCategory.toLowerCase().includes("agro") ? "Agro Products" : "Electronics";
  const baseCartProduct: StoreProduct = item ? { id: item.id, slug: params?.slug || "product", name: itemName, category: normalizedCategory, price: numericPrice, unit: itemUnit, description: itemDescription, color: itemColor, tag: "Available", specs: Object.fromEntries(Object.entries(rawSpecs).map(([key, value]) => [key, String(value)])) } : previewItem!;
  const cartProduct: StoreProduct = { ...baseCartProduct, variant: { size: size || undefined, color: color || undefined } };
  const isFashion = itemCategory.toLowerCase().includes("fashion");
  const isElectronics = itemCategory.toLowerCase().includes("electronic");
  const sizeError = isFashion && !size ? "Please choose a size." : "";
  const colorError = isFashion && !color ? "Please choose a colour." : "";

  const addToCart = () => {
    if (sizeError || colorError) {
      setShowErrors(true);
      setNotice("");
      (sizeError ? sizeRef : colorRef).current?.focus();
      return;
    }
    add(cartProduct, quantity);
    setShowErrors(false);
    setNotice(`${itemName}${size || color ? ` (${[size, color].filter(Boolean).join(", ")})` : ""} × ${quantity} added to your cart.`);
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
      <BrandHeader backHref="/shop" backLabel="Back to shop" section="Product details" actionHref="/cart" actionLabel="Cart" />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr] lg:items-start lg:gap-10">
          <div className={`relative flex min-h-[280px] items-end overflow-hidden rounded-[2rem] bg-gradient-to-br ${itemColor} p-6 shadow-xl sm:min-h-[460px] sm:p-8`} style={item?.imageUrl ? { backgroundImage: `url(${item.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1736]/80 via-[#0b1736]/20 to-transparent" />
            <p className="relative max-w-lg text-3xl font-semibold leading-tight tracking-[-.04em] text-white sm:text-5xl" aria-hidden="true">{itemName}</p>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1f5b9f]">{itemCategory}</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-.04em] text-[#0b1736] sm:text-4xl">{itemName}</h1>
            <p className="mt-5 leading-7 text-slate-600">{itemDescription}</p>
            <div className="mt-7 border-y border-slate-200 py-6"><p className="text-3xl font-bold text-[#0b1736]">{itemPrice}</p><p className="mt-1 text-sm text-slate-500">{itemUnit}</p></div>

            {isFashion && <VariantSelector ref={sizeRef} label="Size" options={SIZE_OPTIONS} value={size} onChange={(next) => { setSize(next); setNotice(""); }} required error={showErrors ? sizeError : ""} />}
            {(isFashion || isElectronics) && <VariantSelector ref={colorRef} kind="swatch" label="Colour" options={COLOR_OPTIONS} value={color} onChange={(next) => { setColor(next); setNotice(""); }} required={isFashion} error={showErrors ? colorError : ""} />}

            <div className="mt-7 flex items-center justify-between gap-4 sm:justify-start">
              <span id="qty-label" className="text-sm font-semibold text-slate-700">Quantity</span>
              <div className="flex items-center rounded-full border border-slate-200" role="group" aria-labelledby="qty-label">
                <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-40"><Minus size={16} /></button>
                <span className="min-w-8 text-center font-bold" aria-live="polite">{quantity}</span>
                <button type="button" aria-label="Increase quantity" disabled={quantity >= 99} onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-40"><Plus size={16} /></button>
              </div>
            </div>

            <button type="button" onClick={addToCart} className="pressable mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f7b32b] px-6 text-sm font-bold text-[#0b1736] hover:bg-[#cfa43a] sm:w-auto"><ShoppingBag size={17} aria-hidden="true" /> Add to cart · {formatNaira(numericPrice * quantity)}</button>
            {notice && <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between" role="status"><p className="flex items-start gap-2 font-semibold"><Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{notice}</p><Link href="/cart" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-white px-4 font-bold text-[#0b1736] ring-1 ring-emerald-200">View cart</Link></div>}

            {specifications.length > 0 && <div className="mt-10"><h2 className="font-semibold text-[#0b1736]">Specifications</h2><dl className="mt-4 space-y-3">{specifications.map(([key, value]) => <div key={key} className="flex justify-between gap-5 border-b border-slate-100 pb-3 text-sm"><dt className="text-slate-500">{key}</dt><dd className="text-right font-semibold text-slate-700">{value}</dd></div>)}</dl></div>}
            <div className="mt-10 border-t border-slate-200 pt-7"><div className="flex items-center gap-2"><Star size={17} className="text-amber-500" aria-hidden="true" /><h2 className="font-semibold text-[#0b1736]">Customer reviews</h2></div><p className="mt-3 text-sm leading-6 text-slate-500">No customer reviews have been published for this product yet. Reviews will appear here after verified customer purchases.</p></div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
