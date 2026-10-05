import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import BrandHeader from "@/components/BrandHeader";
import { useStoreCart } from "@/hooks/useStoreCart";
import { formatNaira } from "@/lib/storeCatalog";
import { trpc } from "@/lib/trpc";

type PendingAuthorization = { authorizationUrl: string; totalKobo: number };

const PAYMENT_MESSAGES: Record<string, string> = {
  success: "Payment verified. Your order was created after the server confirmed the test transaction.",
  cancelled: "Payment cancelled. Your cart is unchanged and no order was created.",
  failed: "Payment was not verified. No order was created; you can safely try again.",
  pending: "Payment confirmation is still pending. No order is marked paid unless Paystack verification succeeds.",
};

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useStoreCart();
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pendingAuthorization, setPendingAuthorization] = useState<PendingAuthorization | null>(null);
  const [form, setForm] = useState({ fullName: user?.name || "", email: user?.email || "", phone: "", country: "Nigeria", address: "" });
  const paymentStatus = new URLSearchParams(window.location.search).get("payment") || "";
  const orderId = new URLSearchParams(window.location.search).get("order");
  const coupon = localStorage.getItem("olucha-cart-coupon") || "";
  const discount = coupon.toUpperCase() === "OLUCHA10" ? Math.round(subtotal * 0.1) : 0;
  const shipping = subtotal === 0 ? 0 : subtotal >= 100000 ? 0 : 2500;
  const tax = Math.round((subtotal - discount) * 0.075);
  const total = subtotal - discount + shipping + tax;
  const update = (field: keyof typeof form, value: string) => {
    setPendingAuthorization(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (paymentStatus === "success") clear();
  }, [paymentStatus, clear]);

  const initializePayment = trpc.payments.initialize.useMutation({
    onSuccess: (result) => {
      if (result.totalKobo !== Math.round(total * 100)) {
        setPendingAuthorization({ authorizationUrl: result.authorizationUrl, totalKobo: result.totalKobo });
        setNotice("The store's current server-side prices changed the amount. Review the verified amount below, then continue if you want to pay it.");
        return;
      }
      window.location.assign(result.authorizationUrl);
    },
    onError: (error) => setNotice(error.message),
  });

  const validate = () => {
    const next: string[] = [];
    if (form.fullName.trim().length < 2) next.push("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.push("Enter a valid email address.");
    if (!/^\+?[0-9\s()-]{7,}$/.test(form.phone)) next.push("Enter a valid phone number.");
    if (form.address.trim().length < 8) next.push("Enter a complete delivery address.");
    if (!items.length) next.push("Your cart is empty. Add a product before checkout.");
    setErrors(next);
    return next.length === 0;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingAuthorization) {
      window.location.assign(pendingAuthorization.authorizationUrl);
      return;
    }
    if (!user) { startLogin(); return; }
    if (!validate()) return;
    setNotice("");
    initializePayment.mutate({
      customerName: form.fullName,
      customerEmail: form.email,
      customerPhone: form.phone,
      deliveryCountry: form.country,
      deliveryAddress: form.address,
      coupon: coupon || undefined,
      items: items.map(({ product, quantity }) => ({
        slug: product.slug,
        quantity,
        ...(product.variant ? { variant: product.variant } : {}),
      })),
    });
  };

  const summaryLines = useMemo(
    () => items.map(({ product, quantity }) => ({
      name: `${product.name}${product.variant?.size || product.variant?.color ? ` (${[product.variant.size, product.variant.color].filter(Boolean).join(", ")})` : ""} × ${quantity}`,
      total: product.price * quantity,
    })),
    [items],
  );
  const serverTotal = pendingAuthorization ? pendingAuthorization.totalKobo / 100 : null;

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
      <BrandHeader backHref="/cart" backLabel="Edit cart" section="Secure checkout" actionHref="/shop" actionLabel="Keep shopping" />
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20">
        <div className="mb-10">
          <p className="eyebrow">Complete your order</p>
          <h1 className="section-title">Buy with confidence.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Enter your details so Olucha can confirm delivery and prepare your secure Paystack test checkout.</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <form className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-9" onSubmit={submit} noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="field">Full name<input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="Your full name" /></label>
              <label className="field">Email address<input value={form.email} onChange={(event) => update("email", event.target.value)} type="email" placeholder="name@example.com" /></label>
              <label className="field">Phone number<input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+234 ..." /></label>
              <label className="field">Country<select value={form.country} onChange={(event) => update("country", event.target.value)}><option>Nigeria</option><option>Ghana</option><option>United Kingdom</option><option>United States</option></select></label>
              <label className="field sm:col-span-2">Delivery address<textarea value={form.address} onChange={(event) => update("address", event.target.value)} rows={4} placeholder="Street, city, state, and delivery notes" /></label>
            </div>
            {errors.length > 0 && <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-800" role="alert"><p className="font-bold">Please correct the following:</p><ul className="mt-2 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
            <div className="mt-8 rounded-2xl border border-[#1f5b9f]/20 bg-[#1f5b9f]/10 p-4 text-sm text-[#0b1736]">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#1f5b9f]" size={18} /><p><strong>Paystack test mode.</strong> Your order is created only after the server verifies a successful test transaction, its reference, amount, and currency. No live key is accepted.</p></div>
            </div>
            {paymentStatus && PAYMENT_MESSAGES[paymentStatus] && (
              <p className={`mt-5 rounded-2xl p-4 text-sm font-semibold leading-6 ${paymentStatus === "success" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`} role="status">
                {PAYMENT_MESSAGES[paymentStatus]}{paymentStatus === "success" && orderId ? ` Order #${orderId}.` : ""}
              </p>
            )}
            {notice && <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800" role="alert">{notice}</p>}
            <button className="mt-7 w-full rounded-full bg-[#f7b32b] px-5 py-3.5 text-sm font-bold text-[#0b1736] disabled:cursor-wait disabled:opacity-60" disabled={initializePayment.isPending}>
              {initializePayment.isPending ? "Preparing secure checkout…" : pendingAuthorization ? `Continue to Paystack · ${formatNaira(serverTotal || 0)}` : !user ? "Sign in to continue" : "Continue to Paystack test checkout"}
            </button>
            <div className="mt-3 flex justify-center gap-4 text-center text-xs text-slate-400"><Link href="/cart" className="font-semibold text-[#1f5b9f] underline">Edit cart</Link><span>No order is created if you cancel or payment is not verified.</span></div>
          </form>
          <aside className="h-fit rounded-[2rem] bg-[#0b1736] p-7 text-white">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#e1ba56]">Your order</p>
            <div className="mt-7 space-y-4">{summaryLines.map((line, index) => <div key={`${line.name}-${index}`} className="flex justify-between gap-4 text-sm"><span className="text-white/70">{line.name}</span><span className="font-semibold">{formatNaira(line.total)}</span></div>)}{!items.length && <p className="text-sm text-white/60">Your cart is empty. <Link href="/shop" className="text-[#e1ba56] underline">Browse products</Link></p>}</div>
            <div className="my-7 space-y-3 border-t border-white/15 pt-6 text-sm"><div className="flex justify-between text-white/70"><span>Subtotal</span><span>{formatNaira(subtotal)}</span></div><div className="flex justify-between text-white/70"><span>Shipping</span><span>{shipping ? formatNaira(shipping) : "Free"}</span></div><div className="flex justify-between text-white/70"><span>Estimated tax</span><span>{formatNaira(tax)}</span></div><div className="flex justify-between text-white/70"><span>Discount</span><span>{discount ? `−${formatNaira(discount)}` : formatNaira(0)}</span></div></div>
            <div className="flex items-end justify-between"><span className="font-semibold">Estimated total</span><span className="text-2xl font-bold">{formatNaira(total)}</span></div>
            {serverTotal !== null && <p className="mt-3 text-sm font-semibold text-[#e1ba56]">Verified server-side total: {formatNaira(serverTotal)}</p>}
            <p className="mt-4 text-xs leading-5 text-white/50">The server recalculates product prices, coupon, delivery, and tax from the current catalogue before initializing payment. Paystack's hosted page shows the amount to be paid.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
