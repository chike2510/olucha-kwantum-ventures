import { CheckCircle2, Circle } from "lucide-react";
import { FACEBOOK_PAGE_URL, WHATSAPP_NUMBER } from "@/lib/siteConfig";
import { EmptyState, Stat, StatusBadge, formatNaira, type AdminBlogPost, type AdminInquiry, type AdminOrder, type AdminProduct, type AdminSection } from "./ui";

/** Orders that have been paid for, including those further along fulfilment. */
const PAID_STATUSES = new Set(["paid", "processing", "shipped", "delivered"]);
const DAY_MS = 24 * 60 * 60 * 1000;

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function AdminOverview({ products, orders, inquiries, posts, onNavigate }: { products: AdminProduct[]; orders: AdminOrder[]; inquiries: AdminInquiry[]; posts: AdminBlogPost[]; onNavigate: (section: AdminSection) => void }) {
  const paidOrders = orders.filter((order) => PAID_STATUSES.has(order.status));
  const paidRevenue = paidOrders.reduce((sum, order) => sum + order.totalKobo, 0);
  const weekAgo = Date.now() - 7 * DAY_MS;
  const paidLastWeek = paidOrders.filter((order) => new Date(order.createdAt).getTime() >= weekAgo).length;
  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const newInquiries = inquiries.filter((item) => item.status === "new").length;
  const activeProducts = products.filter((product) => product.isActive === 1);
  const activeWithImages = activeProducts.filter((product) => !!product.imageUrl).length;
  const publishedPosts = posts.filter((post) => post.status === "published").length;

  const checklist = [
    { label: "At least one active product in the catalogue", done: activeProducts.length > 0, detail: `${activeProducts.length} active` },
    { label: "Every active product has an image", done: activeProducts.length > 0 && activeWithImages === activeProducts.length, detail: `${activeWithImages} of ${activeProducts.length} with images` },
    { label: "WhatsApp contact number configured", done: WHATSAPP_NUMBER.trim().length > 0, detail: WHATSAPP_NUMBER ? "set in site config" : "missing in site config" },
    { label: "Facebook page linked", done: FACEBOOK_PAGE_URL.trim().length > 0, detail: FACEBOOK_PAGE_URL ? "linked" : "not set yet" },
    { label: "At least one published news article", done: publishedPosts > 0, detail: `${publishedPosts} published` },
  ];
  const doneCount = checklist.filter((item) => item.done).length;

  return <>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Paid revenue" value={formatNaira(paidRevenue)} note={`${paidOrders.length} paid ${paidOrders.length === 1 ? "order" : "orders"}, all time`}/>
      <Stat label="Paid orders · last 7 days" value={String(paidLastWeek)} note="paid, processing, shipped or delivered"/>
      <Stat label="Pending orders" value={String(pendingOrders)} note="awaiting Paystack payment"/>
      <Stat label="New inquiries" value={String(newInquiries)} note="needs review"/>
    </div>
    <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="min-w-0 rounded-3xl bg-white p-4 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#1f5b9f]">Export desk</p><h2 className="mt-1 text-xl font-semibold">Recent inquiries</h2></div><button type="button" onClick={() => onNavigate("inquiries")} className="text-sm font-bold text-[#1f5b9f]">View all</button></div>
        <div className="mt-6 space-y-3">{inquiries.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"><div className="min-w-0"><p className="truncate font-semibold">{item.productInterest}</p><p className="mt-1 truncate text-xs text-slate-500">{item.fullName} · {item.destinationCountry}</p></div><StatusBadge status={item.status}/></div>)}{!inquiries.length && <EmptyState>New export inquiries will appear here.</EmptyState>}</div>
      </div>
      <div className="rounded-3xl bg-[#0b1736] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#cfa43a]">Launch checklist</p><h2 className="mt-2 text-xl font-semibold">{doneCount} of {checklist.length} complete</h2><p className="mt-1 text-xs text-white/50">Checked live from the catalogue, content and site config.</p>
        <ul className="mt-6 space-y-4 text-sm">{checklist.map((item) => <li key={item.label} className="flex items-start gap-3">{item.done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400"/> : <Circle size={18} className="mt-0.5 shrink-0 text-white/35"/>}<span><span className={item.done ? "text-white" : "text-white/75"}>{item.label}</span><span className="block text-xs text-white/45">{item.detail}</span></span></li>)}</ul>
      </div>
    </div>
  </>;
}
