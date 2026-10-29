import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import { Link, useRoute } from "wouter";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import { mapNewsArticle } from "@/lib/newsContent";
import { trpc } from "@/lib/trpc";

export default function NewsArticle() {
  const [, params] = useRoute("/news/:slug");
  const slug = params?.slug || "";
  const post = trpc.news.bySlug.useQuery({ slug });
  const article = mapNewsArticle(post.data);
  if (post.isLoading) return <div className="min-h-screen bg-[#f6f7fb]"><BrandHeader backHref="/news" backLabel="All news" actionHref="/shop" actionLabel="Shop" /><p className="p-10 text-slate-500" role="status">Loading article…</p></div>;
  if (post.isError) return <div className="min-h-screen bg-[#f6f7fb]"><BrandHeader backHref="/news" backLabel="All news" actionHref="/shop" actionLabel="Shop" /><main className="px-5 py-16"><div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm"><Newspaper className="mx-auto mb-4 text-slate-300" size={36} aria-hidden="true" /><h1 className="text-2xl font-semibold text-[#0b1736]">Article unavailable</h1><p className="mt-3 text-slate-500" role="alert">We could not load this article. Please try again shortly.</p><Link href="/news" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f7b32b] px-5 text-sm font-bold text-[#0b1736]"><ArrowLeft size={16} aria-hidden="true" />All news</Link></div></main><SiteFooter /></div>;
  if (!article) return <div className="min-h-screen bg-[#f6f7fb]"><BrandHeader backHref="/news" backLabel="All news" actionHref="/shop" actionLabel="Shop" /><main className="px-5 py-16"><div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm"><Newspaper className="mx-auto mb-4 text-slate-300" size={36} aria-hidden="true" /><h1 className="text-2xl font-semibold text-[#0b1736]">Article not found</h1><p className="mt-3 text-slate-500">It may have been unpublished or moved.</p><Link href="/news" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f7b32b] px-5 text-sm font-bold text-[#0b1736]"><ArrowLeft size={16} aria-hidden="true" />All news</Link></div></main><SiteFooter /></div>;
  return <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]"><BrandHeader backHref="/news" backLabel="All news" section="Olucha news" actionHref="/shop" actionLabel="Shop" /><main className="mx-auto max-w-3xl px-5 py-10 lg:py-20"><p className="eyebrow">{article.tag}</p><h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-.04em] text-[#0b1736] sm:text-5xl">{article.title}</h1><p className="mt-5 text-lg leading-8 text-slate-600 sm:text-xl">{article.body}</p><div className="mt-10 space-y-6 rounded-[2rem] bg-white p-6 shadow-sm sm:p-10">{(article.paragraphs ?? []).map((paragraph, index) => <p key={`${index}-${paragraph}`} className="text-base leading-8 text-slate-600 sm:text-lg">{paragraph}</p>)}<Link href="/shop" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f7b32b] px-5 text-sm font-bold text-[#0b1736]">Shop the store <ArrowRight size={15}/></Link></div></main><SiteFooter /></div>;
}
