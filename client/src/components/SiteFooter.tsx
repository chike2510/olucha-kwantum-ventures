import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import { BUSINESS, FACEBOOK_PAGE_URL, OKV_MARK_ONLY_URL, WHATSAPP_URL } from "@/lib/siteConfig";

const columns: Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  { title: "Shop", links: [
    { label: "All products", href: "/shop" },
    { label: "Electronics", href: "/shop/Electronics" },
    { label: "Fashion", href: "/shop/Fashion" },
    { label: "Agro products", href: "/shop/Agro%20Products" },
    { label: "Cart", href: "/cart" },
  ] },
  { title: "Help", links: [
    { label: "FAQ", href: "/faq" },
    { label: "Shipping & delivery", href: "/policies/shipping" },
    { label: "Returns & refunds", href: "/policies/returns" },
    { label: "My account & orders", href: "/account" },
    { label: "Contact us", href: "/#contact" },
  ] },
  { title: "Company", links: [
    { label: "About us", href: "/about" },
    { label: "News & guides", href: "/news" },
    { label: "Policies", href: "/policies" },
    { label: "Privacy policy", href: "/policies/privacy" },
    { label: "Terms & conditions", href: "/terms" },
  ] },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-sm text-slate-500">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-[#cfa43a]/60"><img src={OKV_MARK_ONLY_URL} alt="" className="h-full w-full object-contain" /></span>
            <p className="leading-5"><span className="block font-semibold text-[#0b1736]">{BUSINESS.legalName}</span><span className="font-semibold text-[#cfa43a]">{BUSINESS.tagline}</span></p>
          </div>
          <p className="mt-5 max-w-sm leading-6">Electronics, fashion and agro products for customers in Nigeria, plus export supply for buyers abroad. Secure payments by Paystack.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white"><MessageCircle size={16} aria-hidden="true" />WhatsApp {BUSINESS.whatsappDisplay}</a>
            {FACEBOOK_PAGE_URL && <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-[#0b1736]">Facebook</a>}
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer navigation">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#0b1736]">{column.title}</p>
              <ul className="mt-3 space-y-0.5">
                {column.links.map((link) => <li key={link.href}>{link.href.includes("#") ? <a href={link.href} className="inline-flex min-h-10 items-center hover:text-[#1f5b9f]">{link.label}</a> : <Link href={link.href} className="inline-flex min-h-10 items-center hover:text-[#1f5b9f]">{link.label}</Link>}</li>)}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
