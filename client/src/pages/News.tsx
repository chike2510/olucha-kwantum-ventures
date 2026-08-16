import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import { Link } from "wouter";

const articles = [
  { tag: "Buying guide", title: "What to check before buying electronics online", body: "A practical guide to choosing useful devices, confirming specifications, and ordering with confidence." },
  { tag: "Store note", title: "Choosing better products for everyday use", body: "How clear product information and dependable service shape a better online shopping experience." },
  { tag: "Product focus", title: "Everyday essentials across three categories", body: "Explore how electronics, fashion, and agro products come together in one trusted store." },
];

export default function News() {
  return <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-700"><ArrowLeft size={17}/> Home</Link><p className="text-sm font-bold tracking-[.18em] text-[#0b1736]">OLUCHA NEWS</p><Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-[#0b1736] px-4 py-2 text-sm font-bold text-white">Shop <ArrowRight size={15}/></Link></div></header><main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20"><div className="max-w-3xl"><p className="eyebrow inline-flex items-center gap-2"><Newspaper size={15}/> Product news & guides</p><h1 className="section-title">Helpful information for better buying.</h1><p className="mt-5 text-lg leading-8 text-slate-600">Read practical guidance from Olucha Kwantum Ventures as you compare products and plan your next purchase.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{articles.map((article) => <article key={article.title} className="interactive-card rounded-3xl bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-700">{article.tag}</p><h2 className="mt-5 text-2xl font-semibold leading-tight text-[#0b1736]">{article.title}</h2><p className="mt-4 text-sm leading-7 text-slate-500">{article.body}</p><button className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#0b1736]">Read more <ArrowRight size={15}/></button></article>)}</div></main></div>;
}
