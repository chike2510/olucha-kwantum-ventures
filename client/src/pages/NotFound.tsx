import { ArrowRight, Compass, Home } from "lucide-react";
import { Link } from "wouter";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
      <BrandHeader backHref="/" backLabel="Back to store" actionHref="/shop" actionLabel="Shop" />
      <main className="px-5 py-16 lg:py-24">
        <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f5b9f]/10 text-[#1f5b9f]"><Compass size={26} aria-hidden="true" /></span>
          <p className="eyebrow mt-6">Error 404</p>
          <h1 className="text-3xl font-semibold tracking-[-.04em] text-[#0b1736] sm:text-4xl">We couldn't find that page.</h1>
          <p className="mt-4 leading-7 text-slate-600">The link may be out of date, or the page may have moved. Try the shop or head back to the home page.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0b1736] px-6 text-sm font-bold text-white hover:bg-[#1f5b9f]"><Home size={16} aria-hidden="true" />Go to home</Link>
            <Link href="/shop" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f7b32b] px-6 text-sm font-bold text-[#0b1736] hover:bg-[#cfa43a]">Browse products<ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">Need help? <Link href="/faq" className="font-semibold text-[#1f5b9f] underline">Read the FAQ</Link></p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
