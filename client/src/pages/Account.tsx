import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { UserRound, PackageCheck, MapPin, MailCheck, KeyRound } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import BrandHeader from "@/components/BrandHeader";
import SiteFooter from "@/components/SiteFooter";
import { OKV_WORDMARK_URL } from "@/lib/siteConfig";
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

type AuthView = "signin" | "signup" | "forgot" | "reset";

const inputClass = "mt-2 block min-h-12 w-full rounded-2xl border border-white/15 bg-white px-4 !text-base text-[#0b1736] outline-none placeholder:text-slate-400 focus:border-[#cfa43a] focus:ring-4 focus:ring-[#cfa43a]/30";
const primaryButtonClass = "min-h-12 w-full rounded-full bg-[#f7b32b] px-6 py-3 text-sm font-bold text-[#0b1736] disabled:cursor-wait disabled:opacity-60";
const linkButtonClass = "inline-flex min-h-11 items-center font-semibold text-[#f7b32b] underline underline-offset-4 hover:text-white";

function isResetRequest() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("reset") === "1" || window.location.hash.includes("type=recovery");
}

function readUrlAuthError() {
  if (typeof window === "undefined") return "";
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const description = hash.get("error_description") ?? query.get("error_description");
  if (!description) return "";
  return /expired|invalid/i.test(description)
    ? "That link has expired or was already used. Please request a new one."
    : description.replace(/\+/g, " ");
}

function friendlyAuthError(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : "";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first. Check your inbox for the link we sent.";
  if (/invalid login credentials/i.test(message)) return "That email and password don’t match. Check your details and try again.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts right now. Please wait a few minutes and try again.";
  if (/already registered/i.test(message)) return "An account with this email already exists. Try signing in instead.";
  return message || fallback;
}

export default function Account() {
  const { user, loading, logout, signIn, signUp, requestPasswordReset, updatePassword, authConfigured } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<AuthView>(() => (isResetRequest() ? "reset" : "signin"));
  const orders = trpc.account.orders.useQuery(undefined, { enabled: Boolean(user) && view !== "reset" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(() => readUrlAuthError());
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<{ kind: "signup" | "reset"; email: string } | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  const switchView = (next: AuthView) => {
    setView(next);
    setError("");
    setNotice("");
    setSentTo(null);
    setPassword("");
    setConfirmPassword("");
  };

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("reset");
        setHasRecoverySession(Boolean(session));
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view !== "reset") return;
    if (!supabase) {
      setHasRecoverySession(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => setHasRecoverySession(Boolean(data.session)));
  }, [view]);

  const submitSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      setPassword("");
      setLocation(getSafeReturnPath());
    } catch (cause) {
      setError(friendlyAuthError(cause, "Sign-in failed. Check your details and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords don’t match.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await signUp(name, email, password);
      setPassword("");
      setConfirmPassword("");
      if (result.needsConfirmation) setSentTo({ kind: "signup", email: email.trim() });
      else setLocation(getSafeReturnPath());
    } catch (cause) {
      setError(friendlyAuthError(cause, "We couldn’t create your account. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitForgot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSentTo({ kind: "reset", email: email.trim() });
    } catch (cause) {
      setError(friendlyAuthError(cause, "We couldn’t send the reset email. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords don’t match.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      window.history.replaceState(null, "", "/account");
      setView("signin");
      setNotice("Your password has been updated.");
    } catch (cause) {
      setError(friendlyAuthError(cause, "We couldn’t update your password. Please request a new reset link."));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (window.location.pathname === "/account/orders" && orders.data) {
      document.getElementById("orders")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [orders.data]);

  if (loading && view !== "reset") return <div className="min-h-screen bg-[#f6f7fb] p-10 text-slate-500">Loading account…</div>;

  if (!user || view === "reset") {
    const heading = sentTo
      ? "Check your email"
      : view === "signup" ? "Create account"
      : view === "forgot" ? "Reset your password"
      : view === "reset" ? "Set a new password"
      : "Sign in";
    const intro = sentTo
      ? null
      : view === "signup" ? "Create an account to check out faster and follow the status of your orders."
      : view === "forgot" ? "Enter the email you use with us and we’ll send you a link to choose a new password."
      : view === "reset" ? "Choose a new password for your account."
      : "Sign in to check out faster and follow the status of your orders.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1736] p-5 text-white">
        <div className="w-full max-w-md rounded-3xl bg-white/10 p-6 sm:p-8">
          <div className="mx-auto mb-6 w-40 rounded-2xl bg-white p-2 shadow-lg">
            <img src={OKV_WORDMARK_URL} alt="Olucha Kwantum Ventures" className="h-10 w-full object-contain" />
          </div>
          {sentTo
            ? <MailCheck className="mx-auto mb-5 text-[#cfa43a]" size={40} />
            : view === "forgot" || view === "reset"
              ? <KeyRound className="mx-auto mb-5 text-[#cfa43a]" size={40} />
              : <UserRound className="mx-auto mb-5 text-[#cfa43a]" size={40} />}
          <h1 className="text-center text-3xl font-semibold">{heading}</h1>
          {intro && <p className="mt-3 text-center leading-7 text-white/65">{intro}</p>}

          {(view === "signin" || view === "signup") && !sentTo && (
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1" role="tablist" aria-label="Account options">
              <button type="button" role="tab" aria-selected={view === "signin"} className={`min-h-11 rounded-full text-sm font-bold transition ${view === "signin" ? "bg-white text-[#0b1736]" : "text-white/75 hover:text-white"}`} onClick={() => switchView("signin")}>Sign in</button>
              <button type="button" role="tab" aria-selected={view === "signup"} className={`min-h-11 rounded-full text-sm font-bold transition ${view === "signup" ? "bg-white text-[#0b1736]" : "text-white/75 hover:text-white"}`} onClick={() => switchView("signup")}>Create account</button>
            </div>
          )}

          {!authConfigured && <p className="mt-5 rounded-xl bg-rose-400/15 p-3 text-sm text-rose-100" role="alert">Sign-in is temporarily unavailable. Please try again later or contact us on WhatsApp.</p>}
          {notice && <p className="mt-5 rounded-xl bg-emerald-400/15 p-3 text-sm text-emerald-100" role="status">{notice}</p>}
          {error && <p className="mt-5 rounded-xl bg-rose-400/15 p-3 text-sm text-rose-100" role="alert">{error}</p>}

          {sentTo && (
            <div className="mt-5 space-y-4 text-center" role="status">
              <p className="leading-7 text-white/75">
                {sentTo.kind === "signup"
                  ? <>We’ve sent a confirmation link to <strong className="break-all text-white">{sentTo.email}</strong>. Open it to activate your account, then sign in.</>
                  : <>If an account exists for <strong className="break-all text-white">{sentTo.email}</strong>, we’ve sent a link to reset your password.</>}
              </p>
              <p className="text-sm leading-6 text-white/55">Can’t find it? Check your spam or promotions folder. The link expires after a while.</p>
              <button type="button" className={primaryButtonClass} onClick={() => { setEmail(sentTo.email); switchView("signin"); }}>Back to sign in</button>
            </div>
          )}

          {!sentTo && view === "signin" && (
            <form className="mt-6 space-y-4" onSubmit={submitSignIn}>
              <label className="block text-sm font-semibold text-white/80">Email address
                <input className={inputClass} placeholder="name@example.com" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-white/80">Password
                <input className={inputClass} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <div className="-mt-1 flex justify-end">
                <button type="button" className={linkButtonClass + " text-sm"} onClick={() => switchView("forgot")}>Forgot password?</button>
              </div>
              <button className={primaryButtonClass} type="submit" disabled={!authConfigured || submitting}>
                {submitting ? "Signing in…" : "Sign in securely"}
              </button>
            </form>
          )}

          {!sentTo && view === "signup" && (
            <form className="mt-6 space-y-4" onSubmit={submitSignUp}>
              <label className="block text-sm font-semibold text-white/80">Full name
                <input className={inputClass} placeholder="Your name" type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-white/80">Email address
                <input className={inputClass} placeholder="name@example.com" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="block text-sm font-semibold text-white/80">Password
                <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="password-hint" />
                <span id="password-hint" className="mt-1 block text-xs font-normal text-white/50">At least 8 characters.</span>
              </label>
              <label className="block text-sm font-semibold text-white/80">Confirm password
                <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
              <button className={primaryButtonClass} type="submit" disabled={!authConfigured || submitting}>
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          {!sentTo && view === "forgot" && (
            <form className="mt-6 space-y-4" onSubmit={submitForgot}>
              <label className="block text-sm font-semibold text-white/80">Email address
                <input className={inputClass} placeholder="name@example.com" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <button className={primaryButtonClass} type="submit" disabled={!authConfigured || submitting}>
                {submitting ? "Sending…" : "Send reset link"}
              </button>
              <p className="text-center text-sm"><button type="button" className={linkButtonClass} onClick={() => switchView("signin")}>Back to sign in</button></p>
            </form>
          )}

          {!sentTo && view === "reset" && hasRecoverySession === null && <p className="mt-6 text-center text-sm text-white/60">Checking your reset link…</p>}
          {!sentTo && view === "reset" && hasRecoverySession === false && (
            <div className="mt-6 space-y-4 text-center">
              {!error && <p className="rounded-xl bg-rose-400/15 p-3 text-sm text-rose-100" role="alert">This reset link has expired or was already used. Please request a new one.</p>}
              <button type="button" className={primaryButtonClass} onClick={() => { window.history.replaceState(null, "", "/account"); switchView("forgot"); }}>Request a new link</button>
            </div>
          )}
          {!sentTo && view === "reset" && hasRecoverySession && (
            <form className="mt-6 space-y-4" onSubmit={submitNewPassword}>
              <label className="block text-sm font-semibold text-white/80">New password
                <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
                <span className="mt-1 block text-xs font-normal text-white/50">At least 8 characters.</span>
              </label>
              <label className="block text-sm font-semibold text-white/80">Confirm new password
                <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
              <button className={primaryButtonClass} type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save new password"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-white/60"><Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-white">Return to store</Link></p>
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
          <h1 className="text-3xl font-semibold tracking-[-.05em] text-[#0b1736] sm:text-4xl">Welcome back, {user.name || "customer"}.</h1>
          <button className="min-h-11 rounded-full border border-slate-300 px-5 text-sm font-semibold hover:border-[#1f5b9f] hover:text-[#1f5b9f]" onClick={() => { void logout(); }}>Sign out</button>
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
              {orders.data?.slice(0, 4).map((order) => <a href="#orders" key={order.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="font-semibold">Order #{order.id}</span><span className="ml-auto font-semibold text-[#1f5b9f]">{formatNaira(order.totalKobo / 100)}</span><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${statusTone(order.status)}`}>{order.status}</span></a>)}
              {!orders.data?.length && <span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">No orders yet</span>}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <MapPin className="text-[#1f5b9f]" size={22} />
            <h2 className="mt-6 font-semibold">Delivery tracking</h2>
            <p className="mt-2 text-sm text-slate-500">See synchronized carrier updates for orders that have tracking information.</p>
            <span className="mt-6 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-500">{orders.data?.[0]?.trackingStatus || orders.data?.[0]?.status || "Ready for first order"}</span>
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
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusTone(order.status)}`}>{order.status}</span>
                  </div>
                </div>
                {order.items.length > 0 && <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">{order.items.map((item) => <li key={item.id} className="flex justify-between gap-4"><span className="min-w-0">{item.productName} × {item.quantity}</span><span>{formatNaira((item.unitPriceKobo * item.quantity) / 100)}</span></li>)}</ul>}
                {order.deliveryAddress && <p className="mt-3 text-xs text-slate-500">Deliver to: {[order.deliveryAddress, order.deliveryAddress2, order.deliveryCity, order.deliveryRegion, order.deliveryPostalCode, order.deliveryCountry].filter(Boolean).join(", ")}</p>}
                {(order.trackingNumber || order.trackingStatus) && <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-900"><p className="font-semibold">{order.trackingStatus || "Tracking update"}</p>{order.trackingNumber && <p className="mt-1 break-all font-mono">{order.trackingNumber}</p>}{order.trackingProvider && <p className="mt-1">Carrier: {order.trackingProvider}</p>}{order.trackingUrl?.startsWith("https://") && <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold underline">Open carrier tracking</a>}</div>}
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
