import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import BrandHeader from "@/components/BrandHeader";

const fallbackArticles = [
  { slug: "buying-electronics-online", tag: "Buying guide", title: "What to check before buying electronics online", body: "A practical guide to choosing useful devices, confirming specifications, and ordering with confidence." },
  { slug: "better-everyday-products", tag: "Store note", title: "Choosing better products for everyday use", body: "How clear product information and dependable service shape a better online shopping experience." },
  { slug: "three-store-categories", tag: "Product focus", title: "Everyday essentials across three categories", body: "Explore how electronics, fashion, and agro products come together in one trusted store." },
];

export default function News() {
  const posts = trpc.news.list.useQuery();
  const articles = posts.data?.length ? posts.data.map((post) => ({ slug: post.slug, tag: "Olucha guide", title: post.title, body: post.excerpt })) : fallbackArticles;
  return <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]"><BrandHeader backHref="/" backLabel="Home" section="Olucha news" actionHref="/shop" actionLabel="Shop" /><main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20"><div className="max-w-3xl"><p className="eyebrow inline-flex items-center gap-2"><Newspaper size={15}/> Product news & guides</p><h1 className="section-title">Helpful information for better buying.</h1><p className="mt-5 text-lg leading-8 text-slate-600">Read practical guidance from Olucha Kwantum Ventures as you compare products and plan your next purchase.</p></div><div className="mt-12 grid gap-5 md:grid-cols-3">{articles.map((article) => <article key={article.slug} className="interactive-card rounded-3xl bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-700">{article.tag}</p><h2 className="mt-5 text-2xl font-semibold leading-tight text-[#0b1736]">{article.title}</h2><p className="mt-4 text-sm leading-7 text-slate-500">{article.body}</p><Link href={`/news/${article.slug}`} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#0b1736]">Read more <ArrowRight size={15}/></Link></article>)}</div></main></div>;
}

