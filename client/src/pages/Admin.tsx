import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { trpc } from "@/lib/trpc";
import { LayoutDashboard, Package, ClipboardList, Inbox, Newspaper, LogOut, ShieldAlert } from "lucide-react";
import AdminOverview, { greeting } from "./admin/AdminOverview";
import AdminProducts from "./admin/AdminProducts";
import AdminOrders from "./admin/AdminOrders";
import AdminInquiries from "./admin/AdminInquiries";
import AdminContent from "./admin/AdminContent";
import { ConfirmProvider, type AdminSection } from "./admin/ui";

const sections: Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "inquiries", label: "Inquiries & messages", icon: Inbox },
  { id: "content", label: "Blog & news", icon: Newspaper },
];

export default function Admin() {
  const { user, loading, logout, login, error: loginError } = useAdminAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [section, setSection] = useState<AdminSection>("overview");
  const isAdmin = user?.role === "admin";
  const products = trpc.admin.products.useQuery(undefined, { enabled: isAdmin });
  const inquiries = trpc.inquiries.adminList.useQuery(undefined, { enabled: isAdmin });
  const orders = trpc.admin.orders.useQuery(undefined, { enabled: isAdmin });
  const blogPosts = trpc.admin.blogPosts.useQuery(undefined, { enabled: isAdmin });
  const contactMessages = trpc.admin.contactMessages.useQuery(undefined, { enabled: isAdmin && (section === "inquiries" || section === "overview") });
  const newInquiryCount = inquiries.error ? null : inquiries.data?.filter((item) => item.status === "new").length ?? 0;

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] text-slate-500">Loading operations workspace…</div>;
  if (!user) return <div className="flex min-h-screen items-center justify-center bg-[#0b1736] p-5 text-white"><form onSubmit={async (event) => { event.preventDefault(); setLoginPending(true); await login(loginEmail, loginPassword); setLoginPending(false); }} className="w-full max-w-md rounded-3xl bg-white/10 p-8"><div className="mx-auto mb-6 w-40 rounded-2xl bg-white p-2 shadow-lg"><img src="https://raw.githubusercontent.com/chike2510/olucha-kwantum-ventures/ab935a1/assets/okv-wordmark.png" alt="Olucha Kwantum Ventures" className="w-full object-contain" /></div><ShieldAlert className="mx-auto mb-5 text-[#cfa43a]" size={38}/><h1 className="text-center text-3xl font-semibold">Admin sign-in</h1><p className="mt-3 text-center leading-7 text-white/65">Use the administrator credentials configured for this Olucha Kwantum Ventures deployment.</p><label className="mt-7 block text-sm font-semibold text-white/80">Email<input required type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} className="mt-2 block min-h-12 w-full rounded-2xl border border-white/15 bg-white px-4 text-base text-[#0b1736] outline-none focus:border-[#cfa43a] focus:ring-4 focus:ring-[#cfa43a]/30" autoComplete="username" /></label><label className="mt-4 block text-sm font-semibold text-white/80">Password<input required type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} className="mt-2 block min-h-12 w-full rounded-2xl border border-white/15 bg-white px-4 text-base text-[#0b1736] outline-none focus:border-[#cfa43a] focus:ring-4 focus:ring-[#cfa43a]/30" autoComplete="current-password" /></label>{loginError && <p className="mt-4 rounded-xl bg-rose-400/15 p-3 text-sm text-rose-100" role="alert">{loginError}</p>}<button disabled={loginPending} className="mt-6 w-full rounded-full bg-[#f7b32b] px-6 py-3 text-sm font-bold text-[#0b1736]">{loginPending ? "Signing in…" : "Sign in securely"}</button></form></div>;
  if (user.role !== "admin") return <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] p-5"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"><ShieldAlert className="mx-auto mb-5 text-amber-500" size={38}/><h1 className="text-3xl font-semibold text-[#0b1736]">Access restricted</h1><p className="mt-3 leading-7 text-slate-500">This workspace is reserved for approved administrators.</p></div></div>;

  const navBadge = (id: AdminSection) => id === "inquiries" && newInquiryCount !== null && newInquiryCount > 0 ? <span className="ml-auto rounded-full bg-[#f7b32b] px-2 py-0.5 text-[10px] font-bold text-[#0b1736]">{newInquiryCount}</span> : null;
  const firstName = (user.name || "").trim().split(/\s+/)[0];

  return <ConfirmProvider><div className="min-h-screen overflow-x-hidden bg-[#f6f7fb] text-[#14213d]">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-[#0b1736] p-5 text-white lg:flex"><div className="mb-10"><div className="w-40 rounded-2xl bg-white p-2 shadow-lg shadow-black/10"><img src="https://raw.githubusercontent.com/chike2510/olucha-kwantum-ventures/ab935a1/assets/okv-wordmark.png" alt="Olucha Kwantum Ventures" className="h-auto w-full object-contain" /></div><p className="mt-4 text-[10px] font-bold uppercase tracking-[.22em] text-[#cfa43a]">Operations console</p></div><nav className="space-y-2">{sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${section === id ? "bg-white text-[#0b1736]" : "text-white/65 hover:bg-white/10 hover:text-white"}`}><Icon size={17}/>{label}{navBadge(id)}</button>)}</nav><div className="mt-auto rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/55">Signed in as</p><p className="mt-1 truncate text-sm font-semibold">{user.name || user.email}</p><button type="button" onClick={() => logout()} className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#e1ba56]"><LogOut size={14}/> Sign out</button></div></aside>
    <main className="min-w-0 lg:ml-64">
      <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1f5b9f]">Admin workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-[-.04em] text-[#0b1736] sm:text-3xl">{section === "overview" ? `${greeting()}${firstName ? `, ${firstName}` : ", team"}.` : sections.find((s) => s.id === section)?.label}</h1></div><div className="flex items-center gap-2"><a href="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">View storefront</a><button type="button" onClick={() => logout()} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 lg:hidden" aria-label="Sign out"><LogOut size={16}/></button></div></div></header>
      <div className="p-4 sm:p-8">
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">{sections.map(({ id, label }) => <button key={id} type="button" onClick={() => setSection(id)} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${section === id ? "bg-[#0b1736] text-white" : "bg-white text-slate-600"}`}>{label}{navBadge(id)}</button>)}</div>
        {section === "overview" && <AdminOverview products={products.data ?? []} orders={orders.data ?? []} inquiries={inquiries.data ?? []} posts={blogPosts.data ?? []} loading={{ products: products.isLoading, orders: orders.isLoading, inquiries: inquiries.isLoading, posts: blogPosts.isLoading }} errors={{ products: !!products.error, orders: !!orders.error, inquiries: !!inquiries.error, posts: !!blogPosts.error }} onNavigate={setSection}/>}
        {section === "products" && <AdminProducts products={products.data ?? []} loading={products.isLoading} error={!!products.error}/>}
        {section === "orders" && <AdminOrders orders={orders.data ?? []} loading={orders.isLoading} error={!!orders.error}/>}
        {section === "inquiries" && <AdminInquiries inquiries={inquiries.data ?? []} inquiriesLoading={inquiries.isLoading} inquiriesError={!!inquiries.error} messages={contactMessages.data ?? []} messagesLoading={contactMessages.isLoading} messagesError={!!contactMessages.error}/>}
        {section === "content" && <AdminContent posts={blogPosts.data ?? []} loading={blogPosts.isLoading} error={!!blogPosts.error}/>}
      </div>
    </main>
  </div></ConfirmProvider>;
}
