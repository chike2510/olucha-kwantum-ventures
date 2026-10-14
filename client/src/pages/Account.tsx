import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { UserRound, PackageCheck, MapPin } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import BrandHeader from "@/components/BrandHeader";
import { formatNaira } from "@/lib/storeCatalog";

function statusTone(status: string) {
  if (status === "paid" || status === "delivered") return "bg-emerald-100 text-emerald-700";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  if (status === "shipped" || status === "processing") return "bg-sky-100 text-sky-700";
  return "bg-amber-100 text-amber-700";
}

function getSafeReturnPath() {
  const requested = new URLSearchParams(window.location.search).get("next") ?? "/account";
  return requested.startsWith("/") && !requested.startsWith("//") ? requested : "/account";
}

export default function Account() {
  const { user, loading, logout, signIn, authConfigured } = useAuth();
  const [, setLocation] = useLocation();
  const orders = trpc.account.orders.useQuery(undefined, { enabled: Boolean(user) });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const submitSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSigningIn(true);
    try {
      await signIn(email, password);
      setPassword("");
      setLocation(getSafeReturnPath());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed. Check your details and try again.");
    } finally {
      setSigningIn(false);
    }
  };

  useEffect(() => {
    if (window.location.pathname === "/account/orders" && orders.data) {
      document.getElementById("orders")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [orders.data]);

  if (loading) return <div className="min-h-screen bg-[#f6f7fb] p-10 text-slate-500">Loading account…</div>;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1736] p-5 text-white">
        <div className="w-full max-w-md rounded-3xl bg-white/10 p-8">
          <div className="mx-auto mb-6 w-40 rounded-2xl bg-white p-2 shadow-lg">
            <img src="https://raw.githubusercontent.com/chike2510/olucha-kwantum-ventures/ab935a1/assets/okv-wordmark.png" alt="Olucha Kwantum Ventures" className="w-full object-contain" />
          </div>
          <UserRound className="mx-auto mb-5 text-[#cfa43a]" size={40} />
          <h1 className="text-center text-3xl font-semibold">Your Olucha account</h1>
          <p className="mt-3 text-center leading-7 text-white/65">Sign in with an existing account in the isolated Olucha Preview Supabase Auth project.</p>
          <p className="mt-2 text-center text-sm leading-6 text-white/55">This Preview sign-in does not create or register a new account.</p>
          {!authConfigured && <p className="mt-5 rounded-xl bg-rose-400/15 p-3 text-sm text-rose-100" role="alert">Supabase Auth is not configured for this Preview deployment.</p>}
          {error && <p className="mt-5 rounded-xl bg-rose-400/15 p-3 text-sm text-rose-100" role="alert">{error}</p>}
          <form className="mt-6 space-y-4" onSubmit={submitSignIn}>
            <label className="block text-sm font-semibold text-white/80">Email address
              <input className="field mt-2 w-full bg-white text-[#0b1736]" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-white/80">Password
              <input className="field mt-2 w-full bg-white text-[#0b1736]" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="w-full rounded-full bg-[#f7b32b] px-6 py-3 text-sm font-bold text-[#0b1736] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={!authConfigured || signingIn}>
              {signingIn ? "Signing in…" : "Sign in securely"}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-white/55"><Link href="/" className="underline">Return to store</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
      <BrandHeader backHref="/" backLabel="Back to store" section="Customer account" actionHref="/shop" actionLabel="Shop" />
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#1f5b9f]">Customer account</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-[-.05em] text-[#0b1736]">Welcome back, {user.name || "customer"}.</h1>
          <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => { void logout(); }}>Sign out</button>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <UserRound className="text-[#1f5b9f]" size={22} />
            <h2 className="mt-6 font-semibold">Profile details</h2>
            <p className="mt-2 text-sm text-slate-500">{user.email || "Email not supplied"}</p>
            <p className="mt-1 text-sm text-slate-500">Update your contact details during checkout.</p>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <PackageCheck className="text-[#1f5b9f]" size={22} />
            <h2 className="mt-6 font-semibold">Order history</h2>
            <p className="mt-2 text-sm text-slate-500">Your orders and current payment status.</p>
            <div className="mt-5 space-y-2">
              {orders.data?.slice(0, 4).map((order) => <a href="#orders" key={order.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="font-semibold">Order #{order.id}</span><span className="ml-auto font-semibold text-[#1f5b9f]">{formatNaira(order.totalKobo / 100)}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusTone(order.status)}`}>{order.status}</span></a>)}
              {!orders.data?.length && <span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">No orders yet</span>}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <MapPin className="text-[#1f5b9f]" size={22} />
            <h2 className="mt-6 font-semibold">Delivery tracking</h2>
            <p className="mt-2 text-sm text-slate-500">Track processing, dispatch, and delivery status from one place.</p>
            <span className="mt-6 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{orders.data?.[0]?.status || "Ready for first order"}</span>
          </div>
        </div>
        <section id="orders" className="mt-10 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0b1736]">Your orders</h2>
          {orders.isLoading && <p className="mt-4 text-sm text-slate-500">Loading orders…</p>}
          {!orders.isLoading && !orders.data?.length && <p className="mt-4 text-sm text-slate-500">No orders yet. <Link href="/shop" className="font-semibold text-[#1f5b9f] underline">Browse products</Link></p>}
          <div className="mt-5 space-y-4">
            {orders.data?.map((order) => (
              <article key={order.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#0b1736]">Order #{order.id}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}{order.paystackReference ? ` · Ref ${order.paystackReference}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[#0b1736]">{formatNaira(order.totalKobo / 100)}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(order.status)}`}>{order.status}</span>
                  </div>
                </div>
                {order.items.length > 0 && <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">{order.items.map((item) => <li key={item.id} className="flex justify-between gap-4"><span>{item.productName} × {item.quantity}</span><span>{formatNaira((item.unitPriceKobo * item.quantity) / 100)}</span></li>)}</ul>}
                {order.deliveryAddress && <p className="mt-3 text-xs text-slate-500">Deliver to: {order.deliveryAddress}</p>}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
