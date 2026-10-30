import type { ReactNode } from "react";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { Link } from "wouter";
import type { StoreProduct } from "@/lib/storeCatalog";
import { formatNaira } from "@/lib/storeCatalog";
import Reveal from "./Reveal";

type StoreProductCardProps = {
  product: StoreProduct;
  action?: ReactNode;
  index?: number;
  imagePriority?: boolean;
  spotlight?: boolean;
};

export default function StoreProductCard({ product, action, index = 0, imagePriority = false, spotlight = false }: StoreProductCardProps) {
  return (
    <Reveal as="article" delay={Math.min(index, 4) * 120} className={`store-product-card group overflow-hidden rounded-[1.65rem] border border-slate-200/80 bg-white ${spotlight ? "sm:grid sm:grid-cols-[1.05fr_.95fr]" : ""}`}>
      <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`} className={`store-product-visual relative isolate flex aspect-[1.14/1] items-end overflow-hidden bg-gradient-to-br ${product.color} text-left ${spotlight ? "sm:aspect-auto sm:min-h-[25rem] lg:min-h-[29rem]" : ""}`}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" loading={imagePriority ? "eager" : "lazy"} fetchPriority={imagePriority ? "high" : "auto"} decoding="async" className="store-product-photo absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#1f5b9f] via-[#10244d] to-[#cfa43a]"><ImageOff aria-hidden="true" className="h-9 w-9 text-white/45" strokeWidth={1.4} /></div>
        )}
        <span className="absolute inset-0 z-0 bg-gradient-to-t from-[#07112a]/85 via-[#07112a]/15 to-transparent" aria-hidden="true" />
        <span className="absolute left-4 top-4 z-10 rounded-full border border-white/25 bg-[#07112a]/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-white shadow-sm backdrop-blur-md">{product.tag}</span>
        <span className="relative z-10 flex w-full items-end justify-between gap-4 p-5 sm:p-6">
          <span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[.2em] text-white/75">{product.category}</span><span className="mt-2 block line-clamp-2 font-[Manrope] text-[1.4rem] font-bold leading-tight tracking-[-.035em] text-white sm:text-2xl">{product.name}</span></span>
          <span className="store-card-arrow mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/35 bg-white/10 text-white backdrop-blur transition duration-300 group-hover:-translate-y-1 group-hover:bg-white group-hover:text-[#0b1736]" aria-hidden="true"><ArrowUpRight size={18} /></span>
        </span>
      </Link>
      <div className={spotlight ? "flex flex-col justify-center p-5 sm:p-8 lg:p-12" : "p-5 sm:p-6"}>
        {spotlight && <><p className="eyebrow">From our collection</p><h2 className="mb-5 font-[Manrope] text-3xl font-bold leading-tight tracking-[-.045em] text-[#0b1736] lg:text-4xl">{product.name}</h2></>}
        <p className={`store-product-description text-slate-500 ${spotlight ? "text-base leading-7 sm:text-lg sm:leading-8" : "line-clamp-2 min-h-[3rem] text-sm leading-6"}`}>{product.description}</p>
        <div className={`flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-4 ${spotlight ? "mt-8" : "mt-5"}`}>
          <div className="min-w-0"><p className="text-xl font-bold tracking-tight text-[#0b1736]">{formatNaira(product.price)}</p><p className="mt-0.5 truncate text-xs text-slate-400">{product.unit}</p></div>
          {action ?? <Link href={`/products/${product.slug}`} className="pressable inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#0b1736] px-4 text-xs font-bold text-white transition hover:bg-[#1f5b9f] focus-visible:outline-offset-4">View item <ArrowUpRight size={14} aria-hidden="true" /></Link>}
        </div>
      </div>
    </Reveal>
  );
}
