import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Check, Maximize2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { catalogueToStoreProduct, formatNaira, type StoreProduct } from "@/lib/storeCatalog";
import { customerSpecs } from "@/lib/productSpecs";
import { useStoreCart } from "@/hooks/useStoreCart";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import VariantSelector, { type VariantOption, type VariantSelectorHandle } from "@/components/VariantSelector";
import Reveal from "@/components/Reveal";
import { getSupplierStockStatus } from "@shared/supplierStock";

const SIZE_OPTIONS: VariantOption[] = [{ value: "Small", label: "S" }, { value: "Medium", label: "M" }, { value: "Large", label: "L" }, { value: "XL", label: "XL" }];
const COLOR_OPTIONS: VariantOption[] = [{ value: "Black", swatch: "#111827" }, { value: "White", swatch: "#fff" }, { value: "Blue", swatch: "#1f5b9f" }, { value: "Natural", swatch: "#d8c3a0" }];

export default function ProductDetail() {
  const [, params] = useRoute("/products/:slug");
  const product = trpc.catalogue.bySlug.useQuery({ slug: params?.slug || "" });
  const [notice, setNotice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const sizeRef = useRef<VariantSelectorHandle>(null);
  const colorRef = useRef<VariantSelectorHandle>(null);
  const { add } = useStoreCart();

  useEffect(() => {
    if (!imageExpanded) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setImageExpanded(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [imageExpanded]);

  if (product.isLoading) return <div className="min-h-screen bg-[#f6f7fb]"><BrandHeader backHref="/shop" backLabel="Back to shop" actionHref="/cart" actionLabel="Cart"/><main className="mx-auto max-w-7xl px-5 py-20"><p role="status" className="animate-pulse text-slate-500">Loading product…</p></main></div>;
  if (product.isError || !product.data || !product.data.isActive) return <div className="min-h-screen bg-[#f6f7fb]"><BrandHeader backHref="/shop" backLabel="Back to shop" actionHref="/cart" actionLabel="Cart"/><main className="px-5 py-16"><div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><ShoppingBag className="mx-auto mb-4 text-slate-300" size={38}/><h1 className="text-2xl font-semibold text-[#0b1736]">Product not found</h1><p className="mt-3 text-slate-500">This item may have been removed or is not available yet.</p><Link href="/shop" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f7b32b] px-5 text-sm font-bold"><ArrowLeft size={16}/>Back to shop</Link></div></main><SiteFooter/></div>;

  const item = product.data;
  const base = catalogueToStoreProduct(item);
  const specifications = customerSpecs(item.specifications || {});
  const isFashion = item.category.toLowerCase().includes("fashion");
  const isElectronics = item.category.toLowerCase().includes("electronic");
  const supportsCustomerVariants = !item.supplierVariantFixed;
  const stockStatus = getSupplierStockStatus({ mapped: item.supplierMapped, stock: item.supplierStock, syncedAt: item.supplierStockSyncedAt });
  const unavailable = stockStatus === "out-of-stock" || stockStatus === "refresh-required" || (item.supplierStock != null && quantity > item.supplierStock);
  const sizeError = supportsCustomerVariants && isFashion && !size ? "Please choose a size." : "";
  const colorError = supportsCustomerVariants && isFashion && !color ? "Please choose a colour." : "";
  const cartProduct: StoreProduct = { ...base, variant: supportsCustomerVariants ? { size: size || undefined, color: color || undefined } : undefined };
  const addProduct = () => {
    if (sizeError || colorError) {
      setShowErrors(true);
      (sizeError ? sizeRef : colorRef).current?.focus();
      return;
    }
    if (unavailable) return;
    add(cartProduct, quantity);
    setNotice(`${item.name} × ${quantity} added to your cart.`);
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
      <BrandHeader backHref="/shop" backLabel="Back to shop" section="Product details" actionHref="/cart" actionLabel="Cart" />
      <main className="mx-auto max-w-7xl px-5 pb-16 pt-6 sm:pt-10 lg:px-8 lg:pb-24 lg:pt-12">
        <nav aria-label="Breadcrumb" className="motion-rise mb-6 flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="transition hover:text-[#1f5b9f]">Home</Link><span aria-hidden="true">/</span><Link href="/shop" className="transition hover:text-[#1f5b9f]">Shop</Link><span aria-hidden="true">/</span><span className="max-w-[48vw] truncate text-[#0b1736]" aria-current="page">{item.name}</span>
        </nav>

        <div className="grid items-start gap-5 lg:grid-cols-[1.08fr_.92fr] lg:gap-8">
          <Reveal as="section" variant="zoom" className="min-w-0" aria-label={`${item.name} product image`}>
            <div className={`product-image-stage group relative isolate overflow-hidden rounded-[1.7rem] border border-white/70 bg-gradient-to-br ${base.color} sm:rounded-[2rem]`}>
              <div className="aspect-[.92/1] max-h-[42rem] min-h-[19rem] sm:aspect-[1.05/1] lg:aspect-[.93/1]">
                {item.imageUrl ? (
                  <button type="button" onClick={() => setImageExpanded(true)} aria-label={`View a larger photo of ${item.name}`} className="product-image-button relative block h-full w-full cursor-zoom-in text-left focus-visible:outline-offset-[-5px]">
                    <img src={item.imageUrl} alt={item.name} fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 bg-gradient-to-t from-[#07112a]/70 via-transparent to-[#07112a]/10" aria-hidden="true" />
                    <span className="absolute left-5 top-5 rounded-full border border-white/35 bg-[#07112a]/35 px-4 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-white backdrop-blur-md">{item.category}</span>
                    <span className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#07112a]/50 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition group-hover:bg-white group-hover:text-[#0b1736]"><Maximize2 size={14}/> View photo</span>
                  </button>
                ) : (
                  <div className="grid h-full place-items-center bg-gradient-to-br from-[#1f5b9f] via-[#10244d] to-[#cfa43a] p-8 text-center text-white"><div><ShoppingBag size={32} className="mx-auto opacity-65"/><p className="mt-4 text-sm font-semibold">Product image not available</p></div></div>
                )}
              </div>
            </div>
            <p className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500"><span>{item.name}</span>{item.imageUrl && <span>Tap photo to enlarge</span>}</p>
          </Reveal>

          <Reveal as="section" delay={160} className="product-detail-panel rounded-[1.7rem] border border-slate-100 bg-white p-5 sm:rounded-[2rem] sm:p-8 lg:p-9" aria-labelledby="product-title">
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="eyebrow mb-0">{item.category}</p><span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] ${stockStatus === "out-of-stock" ? "bg-rose-50 text-rose-700" : stockStatus === "refresh-required" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>{stockStatus === "out-of-stock" ? "Out of stock" : stockStatus === "refresh-required" ? "Availability being confirmed" : "Available"}</span></div>
            <h1 id="product-title" className="mt-4 font-[Manrope] text-3xl font-bold leading-tight tracking-[-.05em] text-[#0b1736] sm:text-4xl">{item.name}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{item.description}</p>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-[#f6f7fb] p-4 sm:mt-7 sm:p-5">
              <div><p className="font-[Manrope] text-3xl font-bold tracking-[-.04em] text-[#0b1736]">{formatNaira(base.price)}</p><p className="mt-1 text-xs text-slate-500">{item.unit}</p></div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500">Price shown at checkout</span>
            </div>
            {stockStatus === "out-of-stock" && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">This product is currently out of stock.</p>}
            {stockStatus === "refresh-required" && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-800">We’re confirming availability before checkout. Please try again shortly.</p>}

            {supportsCustomerVariants && isFashion && <VariantSelector ref={sizeRef} label="Size" options={SIZE_OPTIONS} value={size} onChange={setSize} required error={showErrors ? sizeError : ""} />}
            {supportsCustomerVariants && (isFashion || isElectronics) && <VariantSelector ref={colorRef} kind="swatch" label="Colour" options={COLOR_OPTIONS} value={color} onChange={setColor} required={isFashion} error={showErrors ? colorError : ""} />}

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">Quantity</p><div className="mt-2 inline-flex h-12 items-center rounded-full border border-slate-200 bg-white p-1"><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-10 w-10 place-items-center rounded-full text-[#0b1736] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"><Minus size={15}/></button><span className="min-w-9 text-center text-sm font-bold tabular-nums" aria-live="polite">{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="grid h-10 w-10 place-items-center rounded-full text-[#0b1736] transition hover:bg-slate-100"><Plus size={15}/></button></div></div>
              <button type="button" disabled={unavailable} onClick={addProduct} className="pressable shimmer-button inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#f7b32b] px-5 text-sm font-bold text-[#0b1736] shadow-[0_10px_24px_rgba(247,179,43,.2)] transition hover:bg-[#e5a31e] hover:shadow-[0_14px_28px_rgba(247,179,43,.28)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none sm:flex-none sm:px-7"><ShoppingBag size={17}/>{unavailable ? "Unavailable" : `Add to cart · ${formatNaira(base.price * quantity)}`}</button>
            </div>
            {notice && <p role="status" className="motion-toast mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><Check size={16}/>{notice}</p>}

            {specifications.length > 0 && <div className="mt-8 border-t border-slate-100 pt-6"><h2 className="font-[Manrope] text-lg font-bold text-[#0b1736]">Product details</h2><dl className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">{specifications.map(([key, value]) => <div key={key} className="flex justify-between gap-5 py-3 text-sm"><dt className="text-slate-500">{key}</dt><dd className="text-right font-semibold text-slate-700">{value}</dd></div>)}</dl></div>}
            <div className="mt-7 border-t border-slate-100 pt-5"><h2 className="font-semibold text-[#0b1736]">Customer reviews</h2><p className="mt-2 text-sm leading-6 text-slate-500">No customer reviews have been published for this product yet.</p></div>
          </Reveal>
        </div>
      </main>
      <SiteFooter />

      {imageExpanded && item.imageUrl && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#07112a]/90 p-3 backdrop-blur-md sm:p-8" role="dialog" aria-modal="true" aria-label={`Larger photo of ${item.name}`} onClick={() => setImageExpanded(false)}><button type="button" autoFocus onClick={() => setImageExpanded(false)} aria-label="Close enlarged photo" className="absolute right-4 top-4 z-10 grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition hover:rotate-90 hover:bg-white/20"><X size={21}/></button><div className="product-lightbox relative max-h-full max-w-full overflow-hidden rounded-2xl" onClick={(event) => event.stopPropagation()}><img src={item.imageUrl} alt={item.name} className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"/><p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07112a]/80 to-transparent px-5 pb-5 pt-12 text-sm font-semibold text-white">{item.name}</p></div></div>}
    </div>
  );
}
