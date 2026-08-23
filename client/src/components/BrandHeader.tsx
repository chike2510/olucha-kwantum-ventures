import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Link } from "wouter";

type BrandHeaderProps = {
  backHref?: string;
  backLabel?: string;
  section?: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function BrandHeader({ backHref = "/", backLabel = "Back to store", section, actionHref, actionLabel }: BrandHeaderProps) {
  return <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8"><Link href={backHref} className="inline-flex min-w-0 items-center gap-3" aria-label={backLabel}><span className="flex h-11 w-[4.4rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-[#d2a63b]/50"><img src="/manus-storage/okv-mark_ccda29a8.jpg" alt="Olucha Kwantum Ventures logo" className="h-full w-full object-contain" /></span><span className="block min-w-0 max-w-[9.5rem] text-left sm:max-w-[14rem]"><span className="block truncate text-[8px] font-bold uppercase tracking-[.12em] text-[#1f5b9f] sm:text-[10px] sm:tracking-[.16em]">Olucha Kwantum Ventures Limited</span><span className="mt-1 block truncate text-[7px] font-bold uppercase tracking-[.08em] text-[#cfa43a] sm:text-[9px] sm:tracking-[.14em]">Quality products. Trusted quality.</span></span><span className="ml-1 inline-flex items-center gap-1 text-sm font-bold text-[#1f5b9f]"><ArrowLeft size={15}/><span className="hidden md:inline">{backLabel}</span></span></Link><div className="flex items-center gap-3"><span className="hidden text-xs font-bold uppercase tracking-[.18em] text-[#0b1736] sm:block">{section}</span>{actionHref && actionLabel && <Link href={actionHref} className="inline-flex items-center gap-2 rounded-full bg-[#0b1736] px-4 py-2 text-xs font-bold text-white hover:bg-[#1f5b9f]"><ShoppingBag size={14}/>{actionLabel}</Link>}</div></div></header>;
}
