import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import { BUSINESS } from "@/lib/siteConfig";
import { useStoreCart } from "@/hooks/useStoreCart";
import { formatNaira } from "@/lib/storeCatalog";
import { trpc } from "@/lib/trpc";

type PendingAuthorization = { authorizationUrl: string; totalKobo: number };

const PAYMENT_MESSAGES: Record<string, string> = {
  success: "Payment received. Thank you — your order is confirmed.",
  cancelled:
    "Payment cancelled. Your cart is unchanged and no order was created.",
  failed:
    "We couldn’t confirm your payment, so no order was placed. You can safely try again.",
  pending:
    "We are still confirming your payment. Your order will appear in your account as soon as Paystack confirms it.",
};
const DELIVERY_COUNTRY_CODES: Record<string, "NG" | "GH" | "GB" | "US"> = {
  Nigeria: "NG",
  Ghana: "GH",
  "United Kingdom": "GB",
  "United States": "US",
};

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear, catalogueLoading, catalogueError } =
    useStoreCart();
  const catalogueUnavailable = catalogueLoading || catalogueError;
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pendingAuthorization, setPendingAuthorization] =
    useState<PendingAuthorization | null>(null);
  const [form, setForm] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    country: "Nigeria",
    address: "",
    address2: "",
    city: "",
    region: "",
    postalCode: "",
  });
  const paymentStatus =
    new URLSearchParams(window.location.search).get("payment") || "";
  const orderId = new URLSearchParams(window.location.search).get("order");
  const coupon = localStorage.getItem("olucha-cart-coupon") || "";
  const discount =
    coupon.toUpperCase() === "OLUCHA10" ? Math.round(subtotal * 0.1) : 0;
  const shipping =
    subtotal === 0
      ? 0
      : subtotal >= BUSINESS.freeShippingThresholdNaira
        ? 0
        : BUSINESS.flatShippingNaira;
  const tax = 0; // prices are VAT-inclusive
  const total = subtotal - discount + shipping + tax;
  const update = (field: keyof typeof form, value: string) => {
    setPendingAuthorization(null);
    setForm(current => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (paymentStatus === "success") clear();
  }, [paymentStatus, clear]);

  const accountOrders = trpc.account.orders.useQuery(undefined, {
    enabled: Boolean(user) && paymentStatus === "success" && Boolean(orderId),
  });
  const confirmedOrder = accountOrders.data?.find(
    order => String(order.id) === orderId
  );

  const initializePayment = trpc.payments.initialize.useMutation({
    onSuccess: result => {
      if (result.totalKobo !== Math.round(total * 100)) {
        setPendingAuthorization({
          authorizationUrl: result.authorizationUrl,
          totalKobo: result.totalKobo,
        });
        setNotice(
          "The latest store prices changed your total. Review the updated total below, then continue if you would like to pay it."
        );
        return;
      }
      window.location.assign(result.authorizationUrl);
    },
    onError: error => setNotice(error.message),
  });

  const validate = () => {
    const next: string[] = [];
    if (form.fullName.trim().length < 2) next.push("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.push("Enter a valid email address.");
    if (!/^\+?[0-9\s()-]{7,}$/.test(form.phone))
      next.push("Enter a valid phone number.");
    if (form.address.trim().length < 8)
      next.push("Enter a complete street address.");
    if (form.city.trim().length < 2) next.push("Enter your delivery city.");
    if (form.region.trim().length < 2) next.push("Enter your state or region.");
    if (!items.length)
      next.push("Your cart is empty. Add a product before checkout.");
    setErrors(next);
    return next.length === 0;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (catalogueUnavailable) {
      setNotice(
        catalogueLoading
          ? "We’re still checking product availability. Please wait a moment before starting checkout."
          : "We couldn’t confirm the latest product information, so checkout is temporarily unavailable. Please try again shortly."
      );
      return;
    }
    if (pendingAuthorization) {
      window.location.assign(pendingAuthorization.authorizationUrl);
      return;
    }
    if (!user) {
      startLogin("/checkout");
      return;
    }
    if (!validate()) return;
    setNotice("");
    initializePayment.mutate({
      customerName: form.fullName,
      customerEmail: form.email,
      customerPhone: form.phone,
      deliveryCountry: form.country,
      deliveryCountryCode: DELIVERY_COUNTRY_CODES[form.country] ?? "NG",
      deliveryAddress: form.address,
      deliveryAddress2: form.address2,
      deliveryCity: form.city,
      deliveryRegion: form.region,
      deliveryPostalCode: form.postalCode,
      coupon: coupon || undefined,
      items: items.map(({ product, quantity }) => ({
        slug: product.slug,
        quantity,
        ...(product.variant ? { variant: product.variant } : {}),
      })),
    });
  };

  const summaryLines = useMemo(
    () =>
      items.map(({ product, quantity }) => ({
        name: `${product.name}${product.variant?.size || product.variant?.color ? ` (${[product.variant.size, product.variant.color].filter(Boolean).join(", ")})` : ""} × ${quantity}`,
        total: product.price * quantity,
      })),
    [items]
  );
  const paymentMode = trpc.payments.mode.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
  const testMode = paymentMode.data?.testMode === true;
  const serverTotal = pendingAuthorization
    ? pendingAuthorization.totalKobo / 100
    : null;

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
      <BrandHeader
        backHref="/cart"
        backLabel="Edit cart"
        section="Secure checkout"
        actionHref="/shop"
        actionLabel="Keep shopping"
        actionShortLabel="Shop"
      />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-20">
        <div className="mb-8 lg:mb-10">
          <p className="eyebrow">Complete your order</p>
          <h1 className="section-title">Buy with confidence.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Enter your delivery details, then pay securely with Paystack.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <form
            className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-9"
            onSubmit={submit}
            noValidate
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="field">
                Full name
                <input
                  value={form.fullName}
                  onChange={event => update("fullName", event.target.value)}
                  placeholder="Your full name"
                />
              </label>
              <label className="field">
                Email address
                <input
                  value={form.email}
                  onChange={event => update("email", event.target.value)}
                  type="email"
                  placeholder="name@example.com"
                />
              </label>
              <label className="field">
                Phone number
                <input
                  value={form.phone}
                  onChange={event => update("phone", event.target.value)}
                  placeholder="+234 ..."
                />
              </label>
              <label className="field">
                Country
                <select
                  value={form.country}
                  onChange={event => update("country", event.target.value)}
                >
                  <option>Nigeria</option>
                  <option>Ghana</option>
                  <option>United Kingdom</option>
                  <option>United States</option>
                </select>
              </label>
              <label className="field">
                City
                <input
                  value={form.city}
                  onChange={event => update("city", event.target.value)}
                  autoComplete="address-level2"
                  placeholder="Your city"
                />
              </label>
              <label className="field">
                State or region
                <input
                  value={form.region}
                  onChange={event => update("region", event.target.value)}
                  autoComplete="address-level1"
                  placeholder="Your state or region"
                />
              </label>
              <label className="field">
                Postal code <span className="text-xs font-normal text-slate-400">(optional)</span>
                <input
                  value={form.postalCode}
                  onChange={event => update("postalCode", event.target.value)}
                  autoComplete="postal-code"
                  placeholder="Postal code"
                />
              </label>
              <label className="field sm:col-span-2">
                Street address
                <textarea
                  value={form.address}
                  onChange={event => update("address", event.target.value)}
                  rows={4}
                  autoComplete="address-line1"
                  placeholder="House number and street"
                />
              </label>
              <label className="field sm:col-span-2">
                Additional address details <span className="text-xs font-normal text-slate-400">(optional)</span>
                <input
                  value={form.address2}
                  onChange={event => update("address2", event.target.value)}
                  autoComplete="address-line2"
                  placeholder="Apartment, suite, landmark"
                />
              </label>
            </div>
            {catalogueLoading && (
              <div
                className="mt-6 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-800"
                role="status"
              >
                <p className="font-bold">Checking the latest products…</p>
                <p className="mt-1">
                  We’re checking that the products in your cart are still available and up to date.
                </p>
              </div>
            )}
            {catalogueError && (
              <div
                className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-800"
                role="alert"
              >
                <p className="font-bold">We couldn’t load the latest products.</p>
                <p className="mt-1">
                  Your cart is unchanged. Checkout will be available once we confirm the latest product prices and availability.
                </p>
              </div>
            )}
            {errors.length > 0 && (
              <div
                className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-800"
                role="alert"
              >
                <p className="font-bold">Please correct the following:</p>
                <ul className="mt-2 list-disc pl-5">
                  {errors.map(error => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#1f5b9f]/20 bg-[#1f5b9f]/10 p-4 text-sm text-[#0b1736]">
              <ShieldCheck
                className="mt-0.5 shrink-0 text-[#1f5b9f]"
                size={18}
              />
              <p className="min-w-0 flex-1">
                <strong>Secure payment by Paystack.</strong> Pay by card, bank
                transfer or USSD on Paystack's secure page. Your order is
                confirmed as soon as payment is received.
              </p>
              {testMode && (
                <span
                  className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700"
                  title="Payments are in Paystack test mode"
                >
                  Test payments
                </span>
              )}
            </div>
            {paymentStatus && PAYMENT_MESSAGES[paymentStatus] && (
              <p
                className={`mt-5 rounded-2xl p-4 text-sm font-semibold leading-6 ${paymentStatus === "success" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
                role="status"
              >
                {PAYMENT_MESSAGES[paymentStatus]}
                {paymentStatus === "success" && orderId
                  ? ` Order #${orderId}.`
                  : ""}
              </p>
            )}
            {confirmedOrder && (
              <div
                className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5 text-sm"
                aria-label="Order confirmation"
              >
                <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">
                  Order confirmed
                </p>
                <p className="mt-2 text-lg font-semibold text-[#0b1736]">
                  Order #{confirmedOrder.id} ·{" "}
                  {formatNaira(confirmedOrder.totalKobo / 100)}
                </p>
                {confirmedOrder.paystackReference && (
                  <p className="mt-1 break-all text-xs text-slate-500">
                    Payment reference: {confirmedOrder.paystackReference}
                  </p>
                )}
                <ul className="mt-3 space-y-1 text-slate-600">
                  {confirmedOrder.items.map(item => (
                    <li key={item.id} className="flex justify-between gap-4">
                      <span>
                        {item.productName} × {item.quantity}
                      </span>
                      <span>
                        {formatNaira(
                          (item.unitPriceKobo * item.quantity) / 100
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/account/orders"
                  className="mt-4 inline-block font-semibold text-[#1f5b9f] underline"
                >
                  View all orders
                </Link>
              </div>
            )}
            {notice && (
              <p
                className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800"
                role="alert"
              >
                {notice}
              </p>
            )}
            <button
              type="submit"
              className="pressable mt-7 min-h-12 w-full rounded-full bg-[#f7b32b] px-5 py-3.5 text-sm font-bold text-[#0b1736] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={initializePayment.isPending || catalogueUnavailable}
            >
              {catalogueLoading
                ? "Checking product availability…"
                : catalogueError
                  ? "Products temporarily unavailable"
                  : initializePayment.isPending
                    ? "Preparing secure checkout…"
                    : pendingAuthorization
                      ? `Continue to Paystack · ${formatNaira(serverTotal || 0)}`
                      : !user
                        ? "Sign in to continue"
                        : "Pay securely with Paystack"}
            </button>
            <Link
              href="/cart"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-[#0b1736] hover:border-[#1f5b9f]/40 hover:text-[#1f5b9f]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Edit cart
            </Link>
            <p className="mx-auto mt-4 max-w-sm text-center text-xs leading-5 text-slate-500">
              If you cancel payment or we can’t confirm it, no order will be placed. By
              continuing you agree to our{" "}
              <Link
                href="/terms"
                className="font-semibold text-[#1f5b9f] underline"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/policies/privacy"
                className="font-semibold text-[#1f5b9f] underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>
          <aside className="h-fit rounded-[2rem] bg-[#0b1736] p-7 text-white">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#e1ba56]">
              Your order
            </p>
            <div className="mt-7 space-y-4">
              {catalogueLoading && (
                <p className="text-sm text-white/70" role="status">
                  Checking the latest products…
                </p>
              )}
              {catalogueError && (
                <p className="text-sm text-rose-200" role="alert">
                  Products temporarily unavailable. Your saved cart is unchanged.
                </p>
              )}
              {!catalogueUnavailable &&
                summaryLines.map((line, index) => (
                  <div
                    key={`${line.name}-${index}`}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <span className="min-w-0 text-white/70">{line.name}</span>
                    <span className="shrink-0 font-semibold">
                      {formatNaira(line.total)}
                    </span>
                  </div>
                ))}
              {!catalogueUnavailable && !items.length && (
                <p className="text-sm text-white/60">
                  Your cart is empty.{" "}
                  <Link href="/shop" className="text-[#e1ba56] underline">
                    Browse products
                  </Link>
                </p>
              )}
            </div>
            {catalogueUnavailable ? (
              <p className="my-7 border-t border-white/15 pt-6 text-sm text-white/70" role={catalogueError ? "alert" : "status"}>
                {catalogueLoading ? "Your order total will appear once we confirm the latest product prices and availability." : "We can’t show your order total because we couldn’t confirm the latest product prices and availability. Please try again shortly."}
              </p>
            ) : (
              <>
            <div className="my-7 space-y-3 border-t border-white/15 pt-6 text-sm">
              <div className="flex justify-between text-white/70">
                <span>Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Shipping</span>
                <span>{shipping ? formatNaira(shipping) : "Free"}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Discount</span>
                <span>
                  {discount ? `−${formatNaira(discount)}` : formatNaira(0)}
                </span>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold">{formatNaira(total)}</span>
            </div>
            {serverTotal !== null && (
              <p className="mt-3 text-sm font-semibold text-[#e1ba56]">
                Total to pay: {formatNaira(serverTotal)}
              </p>
            )}
              </>
            )}
            <p className="mt-4 text-xs leading-5 text-white/50">
              Prices include VAT where applicable. Your final total, delivery cost and
              discount will be confirmed when you continue. Paystack’s secure payment page
              shows the exact amount before you pay.
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
