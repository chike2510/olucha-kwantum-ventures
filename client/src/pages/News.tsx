import { ArrowRight, Newspaper } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { mapNewsPosts } from "@/lib/newsContent";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";

export default function News() {
  const posts = trpc.news.list.useQuery();
  const articles = mapNewsPosts(posts.data);
  return <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]"><BrandHeader backHref="/" backLabel="Home" section="Olucha news" actionHref="/shop" actionLabel="Shop" /><main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-20"><div className="max-w-3xl"><p className="eyebrow inline-flex items-center gap-2"><Newspaper size={15}/> Product news & guides</p><h1 className="section-title">Helpful information for better buying.</h1><p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Read practical guidance from Olucha Kwantum Ventures as you compare products and plan your next purchase.</p></div>
      {posts.isLoading && <p className="mt-12 rounded-3xl bg-white p-8 text-center text-slate-500" role="status">Loading published articles…</p>}
      {posts.isError && <p className="mt-12 rounded-3xl bg-white p-8 text-center text-rose-700" role="alert">We could not load news and guides. Please try again shortly.</p>}
      {!posts.isLoading && !posts.isError && !articles.length && <p className="mt-12 rounded-3xl bg-white p-8 text-center text-slate-500">No news or guides have been published yet.</p>}
      {!posts.isLoading && !posts.isError && articles.length > 0 && <div className="mt-12 grid gap-5 md:grid-cols-3">{articles.map((article) => <article key={article.slug} className="interactive-card rounded-3xl bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1f5b9f]">{article.tag}</p><h2 className="mt-5 text-2xl font-semibold leading-tight text-[#0b1736]">{article.title}</h2><p className="mt-4 text-sm leading-7 text-slate-500">{article.body}</p><Link href={`/news/${article.slug}`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#0b1736] hover:text-[#1f5b9f]">Read more <ArrowRight size={15}/></Link></article>)}</div>}
    </main><SiteFooter /></div>;
}
