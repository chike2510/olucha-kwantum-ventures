import { useState } from "react";
import {
  ArrowRight,
  Lock,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { useStoreCart } from "@/hooks/useStoreCart";
import { formatNaira } from "@/lib/storeCatalog";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import { BUSINESS } from "@/lib/siteConfig";

const COUPON_KEY = "olucha-cart-coupon";

export default function Cart() {
  const { items, update, remove, subtotal, catalogueLoading, catalogueError } =
    useStoreCart();
  const [coupon, setCoupon] = useState(
    () => localStorage.getItem(COUPON_KEY) || ""
  );
  const [couponInput, setCouponInput] = useState(coupon);
  const [couponMessage, setCouponMessage] = useState("");
  const catalogueUnavailable = catalogueLoading || catalogueError;
  const discount =
    coupon.toUpperCase() === "OLUCHA10" ? Math.round(subtotal * 0.1) : 0;
  const shipping =
    subtotal === 0
      ? 0
      : subtotal >= BUSINESS.freeShippingThresholdNaira
        ? 0
        : BUSINESS.flatShippingNaira;
  const total = subtotal - discount + shipping;
  const shippingLabel =
    subtotal >= BUSINESS.freeShippingThresholdNaira
      ? "Free delivery"
      : formatNaira(shipping);

  const applyCoupon = () => {
    const normalized = couponInput.trim().toUpperCase();
    if (!normalized) {
      setCoupon("");
      localStorage.removeItem(COUPON_KEY);
      setCouponMessage("");
      return;
    }
    if (normalized !== "OLUCHA10") {
      setCouponMessage(
        "That coupon code is not valid. Please check it and try again."
      );
      return;
    }
    setCoupon(normalized);
    localStorage.setItem(COUPON_KEY, normalized);
    setCouponMessage("Coupon applied: 10% off eligible products.");
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#14213d]">
      <BrandHeader
        backHref="/shop"
        backLabel="Continue shopping"
        section="Your cart"
        actionHref="/checkout"
        actionLabel="Checkout"
        actionShortLabel=""
        actionIcon={Lock}
      />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <section className="min-w-0">
            <p className="eyebrow">Ready when you are</p>
            <h1 className="section-title">Review your cart.</h1>
            <div className="mt-8 space-y-4">
              {catalogueLoading && (
                <div
                  className="rounded-3xl bg-white p-12 text-center"
                  role="status"
                >
                  <ShoppingBag
                    className="mx-auto mb-4 text-slate-300"
                    size={38}
                  />
                  <h2 className="text-xl font-semibold text-[#0b1736]">
                    Loading the latest catalogue…
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    We’re checking which products are currently available.
                  </p>
                </div>
              )}
              {catalogueError && (
                <div
                  className="rounded-3xl bg-white p-12 text-center"
                  role="alert"
                >
                  <ShoppingBag
                    className="mx-auto mb-4 text-rose-300"
                    size={38}
                  />
                  <h2 className="text-xl font-semibold text-[#0b1736]">
                    We couldn’t load the catalogue
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Your saved cart is unchanged. Please try again shortly.
                  </p>
                </div>
              )}
              {!catalogueUnavailable &&
                items.map(({ product, quantity }) => (
                  <article
                    key={`${product.slug}-${product.variant?.size || ""}-${product.variant?.color || ""}`}
                    className="flex gap-4 rounded-3xl bg-white p-4 shadow-sm sm:p-5"
                  >
                    <div
                      className={`h-20 w-20 shrink-0 rounded-2xl sm:h-28 sm:w-28 bg-gradient-to-br ${product.color} bg-cover bg-center`}
                      style={
                        product.imageUrl
                          ? { backgroundImage: `url(${product.imageUrl})` }
                          : undefined
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-[.14em] text-[#1f5b9f]">
                        {product.category}
                      </p>
                      <h2 className="mt-1 break-words text-base font-semibold leading-snug text-[#0b1736] sm:text-lg">
                        <Link
                          href={`/products/${product.slug}`}
                          className="hover:text-[#1f5b9f]"
                        >
                          {product.name}
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatNaira(product.price)} · {product.unit}
                      </p>
                      {(product.variant?.size || product.variant?.color) && (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {product.variant.size
                            ? `Size: ${product.variant.size}`
                            : ""}
                          {product.variant.size && product.variant.color
                            ? " · "
                            : ""}
                          {product.variant.color
                            ? `Colour: ${product.variant.color}`
                            : ""}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center rounded-full border border-slate-200">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${product.name}`}
                            onClick={() => update(product.slug, -1)}
                            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100"
                          >
                            <Minus size={15} />
                          </button>
                          <span
                            className="min-w-6 text-center text-sm font-bold"
                            aria-live="polite"
                          >
                            {quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${product.name}`}
                            onClick={() => update(product.slug, 1)}
                            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-[#0b1736]">
                          {formatNaira(product.price * quantity)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(product.slug)}
                        className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full text-xs font-bold text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </article>
                ))}
              {!catalogueUnavailable && !items.length && (
                <div className="rounded-3xl bg-white p-12 text-center">
                  <ShoppingBag
                    className="mx-auto mb-4 text-slate-300"
                    size={38}
                  />
                  <h2 className="text-xl font-semibold text-[#0b1736]">
                    Your cart is empty
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Browse the catalogue and add items to see them here.
                  </p>
                  <Link
                    href="/shop"
                    className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#f7b32b] px-5 text-sm font-bold text-[#0b1736]"
                  >
                    Browse products
                  </Link>
                </div>
              )}
            </div>
          </section>
          <aside className="h-fit rounded-[2rem] bg-[#0b1736] p-7 text-white shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#cfa43a]">
              Order summary
            </p>
            {catalogueUnavailable ? (
              <p className="mt-6 text-sm text-white/70" role={catalogueError ? "alert" : "status"}>
                {catalogueLoading ? "Order totals will appear after the current catalogue has been checked." : "Order totals are unavailable because the current catalogue could not be verified."}
              </p>
            ) : (
              <>
            <div className="mt-7 flex justify-between text-sm text-white/70">
              <span>Subtotal</span>
              <span>{formatNaira(subtotal)}</span>
            </div>
            <div className="mt-3 flex justify-between text-sm text-white/70">
              <span>Shipping</span>
              <span>{shippingLabel}</span>
            </div>
            <div className="mt-3 flex justify-between text-sm text-white/70">
              <span>Discount</span>
              <span>
                {discount ? `−${formatNaira(discount)}` : formatNaira(0)}
              </span>
            </div>
            <div className="mt-6 flex min-w-0 gap-2">
              <input
                value={couponInput}
                onChange={event => setCouponInput(event.target.value)}
                placeholder="Coupon code"
                aria-label="Coupon code"
                className="min-h-11 w-0 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-[#cfa43a] sm:text-sm"
              />
              <button
                type="button"
                onClick={applyCoupon}
                className="min-h-11 shrink-0 rounded-full bg-white px-5 text-sm font-bold text-[#0b1736]"
              >
                Apply
              </button>
            </div>
            {couponMessage && (
              <p
                className="mt-3 text-xs leading-5 text-[#e1ba56]"
                role="status"
              >
                {couponMessage}
              </p>
            )}
            <div className="my-6 border-t border-white/15 pt-6">
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold">{formatNaira(total)}</span>
              </div>
            </div>
              </>
            )}
            <Link
              href={
                !catalogueUnavailable && items.length ? "/checkout" : "/shop"
              }
              aria-disabled={catalogueUnavailable || undefined}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f7b32b] px-5 text-sm font-bold text-[#0b1736]"
            >
              {catalogueLoading
                ? "Loading catalogue…"
                : catalogueError
                  ? "Catalogue unavailable"
                  : items.length
                    ? "Continue to checkout"
                    : "Browse products"}{" "}
              <ArrowRight size={16} />
            </Link>
            <p className="mt-4 text-xs leading-5 text-white/50">
              Prices include VAT where applicable. Delivery is shown before
              payment.
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
