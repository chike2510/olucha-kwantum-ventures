import { useMemo, useState } from "react";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { formatNaira } from "@/lib/storeCatalog";
import { useStoreCart } from "@/hooks/useStoreCart";
import { trpc } from "@/lib/trpc";

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal } = useStoreCart();
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState({ fullName: user?.name || "", email: user?.email || "", phone: "", country: "Nigeria", address: "" });
  const coupon = localStorage.getItem("olucha-cart-coupon") || "";
  const discount = coupon === "OLUCHA10" ? Math.round(subtotal * 0.1) : 0;
  const shipping = subtotal === 0 ? 0 : subtotal >= 100000 ? 0 : 2500;
  const tax = Math.round((subtotal - discount) * 0.075);
  const total = subtotal - discount + shipping + tax;
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
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
    if (!user) { startLogin(); return; }
    if (!validate()) return;
    setNotice("Your details are valid. Paystack test payment is not available yet, so no order has been created or confirmed. You can edit the cart or leave checkout safely.");
  };
  const summaryLines = useMemo(() => items.map(({ product, quantity }) => ({ name: `${product.name} × ${quantity}`, total: product.price * quantity })), [items]);

  return <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8"><Link href="/cart" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-700"><ArrowLeft size={17}/> Back to cart</Link><p className="text-sm font-bold tracking-[.18em] text-[#0b1736]">CHECKOUT</p><span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700"><LockKeyhole size={15}/> Secure checkout</span></div></header><main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-20"><div className="mb-10"><p className="eyebrow">Complete your order</p><h1 className="section-title">Buy with confidence.</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Enter your details so Olucha can confirm delivery and prepare your Paystack payment.</p></div><div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]"><form className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-9" onSubmit={submit} noValidate><div className="grid gap-5 sm:grid-cols-2"><label className="field">Full name<input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="Your full name"/></label><label className="field">Email address<input value={form.email} onChange={(event) => update("email", event.target.value)} type="email" placeholder="name@example.com"/></label><label className="field">Phone number<input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+234 ..."/></label><label className="field">Country<select value={form.country} onChange={(event) => update("country", event.target.value)}><option>Nigeria</option><option>Ghana</option><option>United Kingdom</option><option>United States</option></select></label><label className="field sm:col-span-2">Delivery address<textarea value={form.address} onChange={(event) => update("address", event.target.value)} rows={4} placeholder="Street, city, state, and delivery notes"/></label></div>{errors.length > 0 && <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-800" role="alert"><p className="font-bold">Please correct the following:</p><ul className="mt-2 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}<div className="mt-8 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-900"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-cyan-700" size={18}/><p><strong>Paystack test mode.</strong> Payment initialization will open after the secure test credentials are connected. No payment success is fabricated.</p></div></div>{notice && <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800" role="status">{notice}</p>}<button className="mt-7 w-full rounded-full bg-[#f7b32b] px-5 py-3.5 text-sm font-bold text-[#0b1736]">{!user ? "Sign in to continue" : "Validate order details"}</button><div className="mt-3 flex justify-center gap-4 text-center text-xs text-slate-400"><Link href="/cart" className="font-semibold text-cyan-700 underline">Edit cart</Link><span>You can stop here; no order or payment is created.</span></div></form><aside className="h-fit rounded-[2rem] bg-[#0b1736] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Your order</p><div className="mt-7 space-y-4">{summaryLines.map((line) => <div key={line.name} className="flex justify-between gap-4 text-sm"><span className="text-white/70">{line.name}</span><span className="font-semibold">{formatNaira(line.total)}</span></div>)}{!items.length && <p className="text-sm text-white/60">Your cart is empty. <Link href="/shop" className="text-cyan-300 underline">Browse products</Link></p>}</div><div className="my-7 space-y-3 border-t border-white/15 pt-6 text-sm"><div className="flex justify-between text-white/70"><span>Subtotal</span><span>{formatNaira(subtotal)}</span></div><div className="flex justify-between text-white/70"><span>Shipping</span><span>{shipping ? formatNaira(shipping) : "Free"}</span></div><div className="flex justify-between text-white/70"><span>Estimated tax</span><span>{formatNaira(tax)}</span></div><div className="flex justify-between text-white/70"><span>Discount</span><span>{discount ? `−${formatNaira(discount)}` : formatNaira(0)}</span></div></div><div className="flex items-end justify-between"><span className="font-semibold">Estimated total</span><span className="text-2xl font-bold">{formatNaira(total)}</span></div><p className="mt-4 text-xs leading-5 text-white/50">Totals use the current store rules. Final payment remains disabled until Paystack test credentials are securely configured.</p></aside></div></main></div>;
}
