import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, Globe2, HeartHandshake, Leaf, MessageCircle, Shirt, ShieldCheck, Smartphone, Truck } from "lucide-react";
import { BUSINESS, WHATSAPP_URL } from "@/lib/siteConfig";
import { formatNaira } from "@/lib/storeCatalog";
import InfoLayout, { Ph } from "./InfoLayout";

export function About() {
  const categories = [
    { icon: Smartphone, title: "Electronics", text: "Practical devices, smart-home essentials and power accessories for homes, travel and small businesses.", href: "/shop/Electronics" },
    { icon: Shirt, title: "Fashion", text: "Curated apparel and leather goods for personal wardrobes, gifting and retail buyers.", href: "/shop/Fashion" },
    { icon: Leaf, title: "Agro products", text: "Carefully sourced produce such as dried ginger and cashew nuts, for households, food businesses and export.", href: "/shop/Agro%20Products" },
  ];
  const values = [
    { icon: ShieldCheck, title: "Integrity", text: "Clear prices, honest descriptions and secure Paystack payments. No surprises at checkout." },
    { icon: HeartHandshake, title: "Care", text: "Real people who answer questions, help you choose and follow up until your order arrives." },
    { icon: Globe2, title: "Global reach", text: "Serving customers across Nigeria and supplying buyers abroad through export." },
  ];
  return (
    <InfoLayout eyebrow="About us" title="Quality products, trusted globally." prose={false}
      intro={<p>{BUSINESS.legalName} is a Nigerian company that brings together electronics, fashion and agro products in one dependable store, and supplies quality Nigerian produce to buyers around the world.</p>}>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-10">
          <h2 className="text-2xl font-semibold tracking-[-.03em] text-[#0b1736]">Our story</h2>
          <div className="okv-prose mt-2">
            <p>Olucha Kwantum Ventures was founded on a simple idea: buying online in Nigeria should feel as dependable as buying from someone you trust. We pick products for how well they do their job, describe them clearly and stand behind every order.</p>
            <p>Today we serve households, retailers and growing businesses across Nigeria, and work with international buyers who want reliable supply of Nigerian agro products.</p>
          </div>
        </div>
        <div className="rounded-[2rem] bg-[#0b1736] p-6 text-white sm:p-10">
          <h2 className="text-2xl font-semibold tracking-[-.03em]">Our mission</h2>
          <p className="mt-4 leading-7 text-white/75">To provide high-quality products and excellent customer service through innovation, integrity and efficient business practices, while building long-term relationships with customers worldwide.</p>
          <h2 className="mt-8 text-2xl font-semibold tracking-[-.03em]">Our vision</h2>
          <p className="mt-4 leading-7 text-white/75">To become a trusted online store, delivering quality products and creating lasting value for customers, partners and communities.</p>
        </div>
      </section>

      <section className="mt-12">
        <p className="eyebrow">What we sell</p>
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map(({ icon: Icon, title, text, href }) => (
            <Link key={title} href={href} className="interactive-card flex flex-col rounded-3xl border border-slate-200 bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f5b9f]/10 text-[#1f5b9f]"><Icon size={21} aria-hidden="true" /></span>
              <h3 className="mt-6 text-xl font-semibold text-[#0b1736]">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{text}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#1f5b9f]">Shop {title.toLowerCase()} <ArrowRight size={15} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] bg-[#f7b32b] p-6 text-[#0b1736] sm:p-10">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/40"><Truck size={21} aria-hidden="true" /></span>
          <div>
            <h2 className="text-2xl font-semibold tracking-[-.03em]">Export and bulk supply</h2>
            <p className="mt-3 max-w-2xl leading-7 text-[#0b1736]/80">We supply agro products and other goods in bulk to buyers in Nigeria and abroad. Tell us the product, quantity and destination and we will prepare a quotation covering packaging, documentation and shipping.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="/#contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0b1736] px-6 text-sm font-bold text-white">Request a quote <ArrowRight size={16} aria-hidden="true" /></a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#0b1736]"><MessageCircle size={16} aria-hidden="true" />WhatsApp us</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <p className="eyebrow">What we stand for</p>
        <div className="grid gap-4 md:grid-cols-3">
          {values.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl bg-white p-6 shadow-sm">
              <Icon size={22} className="text-[#cfa43a]" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold text-[#0b1736]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] bg-white p-6 shadow-sm sm:p-10">
        <h2 className="text-2xl font-semibold tracking-[-.03em] text-[#0b1736]">Company details</h2>
        <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Registered name</dt><dd className="mt-1 font-semibold text-[#0b1736]">{BUSINESS.legalName}</dd></div>
          <div><dt className="text-slate-500">RC number</dt><dd className="mt-1 font-semibold text-[#0b1736]"><Ph>{BUSINESS.rcNumber}</Ph></dd></div>
          <div><dt className="text-slate-500">Registered office</dt><dd className="mt-1 font-semibold text-[#0b1736]"><Ph>{BUSINESS.registeredAddress}</Ph></dd></div>
          <div><dt className="text-slate-500">Email</dt><dd className="mt-1 font-semibold text-[#0b1736]"><Ph>{BUSINESS.supportEmail}</Ph></dd></div>
          <div><dt className="text-slate-500">Phone</dt><dd className="mt-1 font-semibold text-[#0b1736]"><Ph>{BUSINESS.supportPhone}</Ph></dd></div>
          <div><dt className="text-slate-500">WhatsApp</dt><dd className="mt-1 font-semibold text-[#0b1736]"><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">{BUSINESS.whatsappDisplay}</a></dd></div>
        </dl>
      </section>
    </InfoLayout>
  );
}

type Faq = { q: string; a: React.ReactNode };

export function FaqPage() {
  const flat = formatNaira(BUSINESS.flatShippingNaira);
  const threshold = formatNaira(BUSINESS.freeShippingThresholdNaira);
  const groups: Array<{ id: string; title: string; items: Faq[] }> = [
    { id: "ordering", title: "Ordering", items: [
      { q: "How do I place an order?", a: <>Choose a product, pick any size or colour, and tap <strong>Add to cart</strong>. Open your cart, check the items and continue to checkout. Enter your delivery details and pay securely with Paystack.</> },
      { q: "Do I need an account to order?", a: <>Yes, you need to sign in at checkout so we can link the order to you and show its status on the <Link href="/account/orders">My orders</Link> page.</> },
      { q: "Can I change or cancel my order?", a: <>Contact us as soon as possible. If your order has not been dispatched we can change it or cancel it and refund you in full. See <Link href="/policies/returns">Returns & Refunds</Link>.</> },
    ] },
    { id: "payment", title: "Payment", items: [
      { q: "How can I pay?", a: <>All payments are processed by Paystack, which supports cards, bank transfer, USSD and other methods it offers in your country. We never see or store your full card details.</> },
      { q: "When is my order confirmed?", a: <>Only after Paystack confirms a successful payment. If you cancel payment or it cannot be confirmed, no order is placed.</> },
      { q: "Are prices inclusive of VAT?", a: <>Yes. Product prices are shown in Naira and include VAT where applicable. Only delivery is added, and it is shown in your cart and at checkout before you pay.</> },
    ] },
    { id: "delivery", title: "Delivery", items: [
      { q: "How much is delivery?", a: <>Delivery within Nigeria is a flat {flat} per order, and free on orders of {threshold} or more. See <Link href="/policies/shipping">Shipping & Delivery</Link>.</> },
      { q: "How long will delivery take?", a: <>Delivery times depend on your location. Contact us for an estimated timeframe for your order. Estimates are not guarantees.</> },
      { q: "How do I track my order?", a: <>Sign in and open <Link href="/account/orders">My orders</Link> to see each order's status. We may also contact you by phone or WhatsApp to arrange delivery.</> },
      { q: "Do you ship outside Nigeria?", a: <>Yes, we supply export and international buyers. Export shipments are quoted individually. <a href="/#contact">Send us an inquiry</a> with the product, quantity and destination.</> },
    ] },
    { id: "returns", title: "Returns & refunds", items: [
      { q: "Can I return an item?", a: <>{BUSINESS.returnWindowDays ? <>Eligible, unused items can be returned within {BUSINESS.returnWindowDays} days of delivery.</> : <>Contact us to confirm the return window and whether your item is eligible.</>} Some items, such as food and agro products, cannot be returned unless faulty. See <Link href="/policies/returns">Returns & Refunds</Link>.</> },
      { q: "What if my item arrives damaged or wrong?", a: <>Contact us promptly after delivery with photos and your order number. We will replace it or refund you, including delivery.</> },
      { q: "How long do refunds take?", a: <>Approved refunds go back to your original payment method through Paystack. {BUSINESS.refundProcessingDays ? <>We start the refund within {BUSINESS.refundProcessingDays}.</> : <>We will confirm the processing timeframe when your refund is approved.</>} Your bank may take extra time to show it.</> },
    ] },
    { id: "bulk", title: "Bulk & business orders", items: [
      { q: "Do you offer wholesale or bulk prices?", a: <>Yes. For bulk, wholesale or export quantities, <a href="/#contact">send an inquiry</a> or WhatsApp us on {BUSINESS.whatsappDisplay} for a quotation.</> },
    ] },
    { id: "privacy", title: "Account & privacy", items: [
      { q: "How do you use my personal data?", a: <>Only to process and deliver your orders, support you and keep the store secure, in line with the Nigeria Data Protection Act 2023. Read our <Link href="/policies/privacy">Privacy Policy</Link>.</> },
      { q: "How can I contact you?", a: <>WhatsApp {BUSINESS.whatsappDisplay}, email <Ph>{BUSINESS.supportEmail}</Ph>, or use the <a href="/#contact">contact form</a>.</> },
    ] },
  ];

  return (
    <InfoLayout eyebrow="Help centre" title="Frequently asked questions" prose={false}
      intro={<p>Quick answers about ordering, payment, delivery and returns. Can't find what you need? <a href="/#contact" className="font-semibold text-[#1f5b9f] underline underline-offset-4">Contact us</a>.</p>}
      toc={groups.map((group) => ({ id: group.id, label: group.title }))}
      related={[{ href: "/policies/shipping", title: "Shipping & Delivery" }, { href: "/policies/returns", title: "Returns & Refunds" }]}>
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.id} id={group.id} className="scroll-mt-24">
            <h2 className="font-['Manrope'] text-xl font-bold tracking-[-.02em] text-[#0b1736]">{group.title}</h2>
            <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm">
              {group.items.map((item) => <FaqItem key={item.q} item={item} />)}
            </div>
          </section>
        ))}
      </div>
    </InfoLayout>
  );
}

function FaqItem({ item }: { item: Faq }) {
  const [open, setOpen] = useState(false);
  const id = item.q.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={`${id}-panel`} id={`${id}-button`} onClick={() => setOpen(!open)} className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-[#0b1736] hover:bg-slate-50 sm:px-6">
          <span>{item.q}</span>
          <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-[#1f5b9f] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </h3>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-button`} hidden={!open} className="okv-prose px-5 pb-5 text-[.95rem] sm:px-6">
        <p className="!mt-0">{item.a}</p>
      </div>
    </div>
  );
}
