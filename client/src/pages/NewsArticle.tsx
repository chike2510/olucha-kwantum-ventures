import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import { Link, useRoute } from "wouter";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";

const fallbackArticles: Record<string, { tag: string; title: string; body: string; paragraphs: string[] }> = {
  "buying-electronics-online": { tag: "Buying guide", title: "What to check before buying electronics online", body: "A practical guide to choosing useful devices, confirming specifications, and ordering with confidence.", paragraphs: ["Start with the job the product needs to do. Clear product descriptions help you compare practical features rather than choosing on appearance alone.", "Next, check the quantity, unit, delivery location, and any support included with the order. Olucha keeps these details visible so customers can make informed choices.", "Finally, review your cart and delivery details carefully before payment. A dependable buying experience combines useful products with clear service at every step."] },
  "better-everyday-products": { tag: "Store note", title: "Choosing better products for everyday use", body: "How clear product information and dependable service shape a better online shopping experience.", paragraphs: ["Quality is more than a label. It includes a product that fits the customer's needs, a price that is easy to understand, and support when questions come up.", "Our catalogue brings together everyday electronics, fashion, and agro products so customers can shop from a focused selection with confidence.", "We continue to improve the store around clear information, responsible fulfilment, and long-term customer relationships."] },
  "three-store-categories": { tag: "Product focus", title: "Everyday essentials across three categories", body: "Explore how electronics, fashion, and agro products come together in one trusted store.", paragraphs: ["Electronics lead the store with practical devices and power accessories for homes, travel, and small businesses.", "Fashion adds curated apparel and accessories for personal wardrobes, gifting, and retail buyers.", "Agro products complete the range with carefully sourced produce for households, retailers, and food businesses."] },
};

export default function NewsArticle() {
  const [, params] = useRoute("/news/:slug");
  const slug = params?.slug || "";
  const post = trpc.news.bySlug.useQuery({ slug });
  const fallback = fallbackArticles[slug];
  const article = post.data ? { tag: "Olucha guide", title: post.data.title, body: post.data.excerpt, paragraphs: post.data.content.split(/\n+/).filter(Boolean) } : fallback;
  if (post.isLoading) return <div className="min-h-screen bg-[#f6f7fb]"><BrandHeader backHref="/news" backLabel="All news" actionHref="/shop" actionLabel="Shop" /><p className="p-10 text-slate-500" role="status">Loading article…</p></div>;
  if (!article) return <div className="min-h-screen bg-[#f6f7fb]"><BrandHeader backHref="/news" backLabel="All news" actionHref="/shop" actionLabel="Shop" /><main className="px-5 py-16"><div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm"><Newspaper className="mx-auto mb-4 text-slate-300" size={36} aria-hidden="true" /><h1 className="text-2xl font-semibold text-[#0b1736]">Article not found</h1><p className="mt-3 text-slate-500">It may have been unpublished or moved.</p><Link href="/news" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f7b32b] px-5 text-sm font-bold text-[#0b1736]"><ArrowLeft size={16} aria-hidden="true" />All news</Link></div></main><SiteFooter /></div>;
  return <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]"><BrandHeader backHref="/news" backLabel="All news" section="Olucha news" actionHref="/shop" actionLabel="Shop" /><main className="mx-auto max-w-3xl px-5 py-10 lg:py-20"><p className="eyebrow">{article.tag}</p><h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-.04em] text-[#0b1736] sm:text-5xl">{article.title}</h1><p className="mt-5 text-lg leading-8 text-slate-600 sm:text-xl">{article.body}</p><div className="mt-10 space-y-6 rounded-[2rem] bg-white p-6 shadow-sm sm:p-10">{article.paragraphs.map((paragraph) => <p key={paragraph} className="text-base leading-8 text-slate-600 sm:text-lg">{paragraph}</p>)}<Link href="/shop" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f7b32b] px-5 text-sm font-bold text-[#0b1736]">Shop the store <ArrowRight size={15}/></Link></div></main><SiteFooter /></div>;
}

