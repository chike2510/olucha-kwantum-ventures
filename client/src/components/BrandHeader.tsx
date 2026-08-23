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
  return <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8"><Link href={backHref} className="inline-flex min-w-0 items-center gap-3" aria-label={backLabel}><span className="flex h-11 w-[12rem] shrink-0 items-center justify-start overflow-hidden rounded-xl bg-white px-2 py-1 shadow-sm ring-1 ring-[#d2a63b]/50 sm:w-[17rem]"><img src="/manus-storage/okv-wordmark-tagline_547f64ef.png" alt="Olucha Kwantum Ventures — Quality products, trusted globally." className="h-full w-full object-contain object-left" /></span><span className="ml-1 inline-flex items-center gap-1 text-sm font-bold text-[#1f5b9f]"><ArrowLeft size={15}/><span className="hidden md:inline">{backLabel}</span></span></Link><div className="flex items-center gap-3"><span className="hidden text-xs font-bold uppercase tracking-[.18em] text-[#0b1736] sm:block">{section}</span>{actionHref && actionLabel && <Link href={actionHref} className="inline-flex items-center gap-2 rounded-full bg-[#0b1736] px-4 py-2 text-xs font-bold text-white hover:bg-[#1f5b9f]"><ShoppingBag size={14}/>{actionLabel}</Link>}</div></div></header>;
}
