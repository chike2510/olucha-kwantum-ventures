import { Link } from "wouter";
import { ArrowRight, FileText, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { BUSINESS, WHATSAPP_URL } from "@/lib/siteConfig";
import { formatNaira } from "@/lib/storeCatalog";
import InfoLayout, { POLICY_LINKS, Ph } from "./InfoLayout";

const ICONS: Record<string, typeof ShieldCheck> = {
  "/policies/privacy": ShieldCheck,
  "/policies/shipping": Truck,
  "/policies/returns": RotateCcw,
  "/terms": FileText,
};

const flat = formatNaira(BUSINESS.flatShippingNaira);
const threshold = formatNaira(BUSINESS.freeShippingThresholdNaira);

function ContactBlock() {
  return (
    <ul>
      <li>Email: <Ph>{BUSINESS.supportEmail}</Ph></li>
      <li>Phone: <Ph>{BUSINESS.supportPhone}</Ph></li>
      <li>WhatsApp: <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">{BUSINESS.whatsappDisplay}</a></li>
      <li>Post: {BUSINESS.legalName}, <Ph>{BUSINESS.registeredAddress}</Ph></li>
      <li>Hours: <Ph>{BUSINESS.businessHours}</Ph></li>
    </ul>
  );
}

export function PoliciesHub() {
  return (
    <InfoLayout eyebrow="Store policies" title="Our policies" intro={<p>Clear rules make for confident shopping. These pages explain how {BUSINESS.legalName} handles your data, delivers your orders and deals with returns.</p>} prose={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        {POLICY_LINKS.map((policy) => {
          const Icon = ICONS[policy.href] ?? FileText;
          return (
            <Link key={policy.href} href={policy.href} className="interactive-card group flex flex-col rounded-3xl border border-slate-200 bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f5b9f]/10 text-[#1f5b9f]"><Icon size={21} aria-hidden="true" /></span>
              <h2 className="mt-6 text-xl font-semibold text-[#0b1736]">{policy.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{policy.summary}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#1f5b9f]">Read policy <ArrowRight size={15} aria-hidden="true" /></span>
            </Link>
          );
        })}
      </div>
      <p className="mt-8 rounded-2xl bg-white p-5 text-sm leading-6 text-slate-500 shadow-sm">Questions about any policy? Read the <Link href="/faq" className="font-semibold text-[#1f5b9f] underline">FAQ</Link> or <a href="/#contact" className="font-semibold text-[#1f5b9f] underline">contact us</a>.</p>
    </InfoLayout>
  );
}

export function PrivacyPolicy() {
  const toc = [
    { id: "who-we-are", label: "Who we are" },
    { id: "data-we-collect", label: "Data we collect" },
    { id: "how-we-use", label: "How and why we use it" },
    { id: "sharing", label: "Who we share it with" },
    { id: "transfers", label: "International transfers" },
    { id: "retention", label: "How long we keep it" },
    { id: "security", label: "Security" },
    { id: "your-rights", label: "Your rights" },
    { id: "cookies", label: "Cookies & storage" },
    { id: "children", label: "Children" },
    { id: "changes", label: "Changes" },
    { id: "contact", label: "Contact us" },
  ];
  return (
    <InfoLayout eyebrow="Store policies" title="Privacy Policy" backHref="/policies" backLabel="All policies" lastUpdated toc={toc}
      intro={<p>We respect your privacy. This policy explains how we collect and use personal data in line with the Nigeria Data Protection Act 2023 (NDPA), the Nigeria Data Protection Regulation (NDPR) and guidance from the Nigeria Data Protection Commission (NDPC).</p>}
      related={[{ href: "/terms", title: "Terms & Conditions" }, { href: "/policies", title: "All policies" }]}>
      <h2 id="who-we-are">1. Who we are</h2>
      <p>{BUSINESS.legalName} (RC <Ph>{BUSINESS.rcNumber}</Ph>), of <Ph>{BUSINESS.registeredAddress}</Ph>, Nigeria ("Olucha", "we", "us") runs this online store. We are the data controller for the personal data described here.</p>
      <p>Data protection contact: <Ph>{BUSINESS.privacyEmail}</Ph>. <Ph>[Name of Data Protection Officer, if one has been appointed]</Ph></p>

      <h2 id="data-we-collect">2. Personal data we collect</h2>
      <ul>
        <li><strong>Account details</strong>: your name, email address and sign-in details when you have an account.</li>
        <li><strong>Order and delivery details</strong>: name, email, phone number, country and delivery address, the items you order and the order history.</li>
        <li><strong>Payment information</strong>: payments are processed by Paystack. We receive a payment reference, the amount, currency and status. <strong>We do not receive or store your full card number or PIN.</strong></li>
        <li><strong>Messages</strong>: what you send us through the contact or inquiry forms, email or WhatsApp.</li>
        <li><strong>Technical data</strong>: basic information your browser sends when you visit (such as IP address, device and browser type), used to keep the site secure and working.</li>
      </ul>

      <h2 id="how-we-use">3. How and why we use your data</h2>
      <p>We only process personal data where we have a lawful basis under the NDPA:</p>
      <ul>
        <li><strong>To perform our contract with you</strong>: taking payment, fulfilling and delivering orders, handling returns and customer support.</li>
        <li><strong>To comply with legal obligations</strong>: keeping tax and accounting records, responding to lawful requests from authorities.</li>
        <li><strong>Our legitimate interests</strong>: preventing fraud, securing our systems and improving the store, balanced against your rights.</li>
        <li><strong>Your consent</strong>: for optional marketing messages. You can withdraw consent at any time without affecting earlier processing.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2 id="sharing">4. Who we share it with</h2>
      <p>We share personal data only with service providers who need it to run the store, under contracts that require them to protect it:</p>
      <ul>
        <li><strong>Paystack</strong>: payment processing.</li>
        <li><strong>Hosting and database providers</strong> (currently Cloudflare and Supabase): to host the website, store accounts and orders.</li>
        <li><strong>Delivery and logistics partners</strong>: your name, phone number and address so they can deliver your order. <Ph>[List of courier/logistics partners]</Ph></li>
        <li><strong>Professional advisers and authorities</strong>: where the law requires it.</li>
      </ul>

      <h2 id="transfers">5. International transfers</h2>
      <p>Some of our service providers may store or process data on servers outside Nigeria. Where this happens we rely on the transfer grounds allowed by the NDPA, such as adequate protection in the destination country, appropriate contractual safeguards, or transfers necessary to perform our contract with you (for example, an export order to another country).</p>

      <h2 id="retention">6. How long we keep it</h2>
      <p>We keep order and payment records for as long as the law requires for tax and accounting purposes, <Ph>[retention period for order records, e.g. 6 years]</Ph>. Account data is kept while your account is active. Messages are kept for <Ph>[retention period for enquiries]</Ph> after the matter is resolved. We then delete or anonymise the data.</p>

      <h2 id="security">7. Security</h2>
      <p>We use encrypted connections (HTTPS), access controls and reputable providers to protect your data. No online service is completely risk-free. If a personal data breach is likely to put your rights at risk, we will notify the NDPC within 72 hours of becoming aware of it and tell affected customers without undue delay, as the NDPA requires.</p>

      <h2 id="your-rights">8. Your rights</h2>
      <p>Under the NDPA you have the right to:</p>
      <ul>
        <li>be told how your data is used, and get a copy of it;</li>
        <li>have inaccurate data corrected;</li>
        <li>have your data deleted where there is no good reason for us to keep it;</li>
        <li>restrict or object to certain processing, including direct marketing;</li>
        <li>receive your data in a commonly used format (data portability);</li>
        <li>withdraw consent at any time where we rely on consent;</li>
        <li>not be subject to decisions based solely on automated processing that significantly affect you.</li>
      </ul>
      <p>To exercise a right, contact <Ph>{BUSINESS.privacyEmail}</Ph>. We will respond within the time the law allows. If you are not satisfied, you can complain to the Nigeria Data Protection Commission (NDPC).</p>

      <h2 id="cookies">9. Cookies and local storage</h2>
      <p>We use essential browser storage to keep you signed in and to remember your cart and coupon on your device. These are needed for the store to work. <Ph>[State whether any analytics or advertising cookies are used. None are used at present.]</Ph></p>

      <h2 id="children">10. Children</h2>
      <p>The store is meant for adults. We do not knowingly collect personal data from children under 18. If you think a child has given us personal data, please contact us so we can delete it.</p>

      <h2 id="changes">11. Changes to this policy</h2>
      <p>We may update this policy from time to time. The latest version will always be on this page with its "last updated" date.</p>

      <h2 id="contact">12. Contact us</h2>
      <ContactBlock />
    </InfoLayout>
  );
}

export function ShippingPolicy() {
  const toc = [
    { id: "fees", label: "Delivery fees" },
    { id: "coverage", label: "Where we deliver" },
    { id: "timelines", label: "Delivery timelines" },
    { id: "tracking", label: "Order status" },
    { id: "receiving", label: "Receiving your order" },
    { id: "export", label: "International & export orders" },
    { id: "issues", label: "Delays, damage & loss" },
    { id: "contact", label: "Contact us" },
  ];
  return (
    <InfoLayout eyebrow="Store policies" title="Shipping & Delivery" backHref="/policies" backLabel="All policies" lastUpdated toc={toc}
      intro={<p>How and when we deliver orders from {BUSINESS.shortName}, and what delivery costs.</p>}
      related={[{ href: "/policies/returns", title: "Returns & Refunds" }, { href: "/faq", title: "FAQ" }]}>
      <h2 id="fees">1. Delivery fees</h2>
      <ul>
        <li><strong>Within Nigeria:</strong> a flat delivery fee of <strong>{flat}</strong> per order.</li>
        <li><strong>Free delivery</strong> on orders with a product subtotal of <strong>{threshold}</strong> or more.</li>
        <li>The delivery fee, estimated VAT ({BUSINESS.vatRatePercent}%) and any discount are shown in your cart and at checkout before you pay. The amount on Paystack's payment page is the amount you will be charged.</li>
      </ul>

      <h2 id="coverage">2. Where we deliver</h2>
      <p>We deliver to addresses across Nigeria. <Ph>[Confirm any states or areas not covered, or where extra charges apply]</Ph></p>

      <h2 id="timelines">3. Delivery timelines</h2>
      <p>Orders are processed after your payment has been verified. Typical delivery times once an order is dispatched:</p>
      <ul>
        <li>Within <Ph>[city/state of dispatch]</Ph>: <Ph>[e.g. 1–3 business days]</Ph></li>
        <li>Other states in Nigeria: <Ph>[e.g. 3–7 business days]</Ph></li>
      </ul>
      <p>These are estimates, not guarantees. Public holidays, weather, security situations and courier delays can affect delivery. Agro products are subject to seasonal availability, and we will contact you if an item is unavailable.</p>

      <h2 id="tracking">4. Order status</h2>
      <p>Signed-in customers can see each order's status (paid, processing, shipped, delivered) on the <Link href="/account/orders">My orders</Link> page. We may also contact you by phone, email or WhatsApp to arrange delivery.</p>

      <h2 id="receiving">5. Receiving your order</h2>
      <ul>
        <li>Please give a complete address and a phone number you can be reached on.</li>
        <li>Check the package when it arrives. If it is visibly damaged, note this with the courier and contact us within <Ph>[e.g. 48 hours]</Ph> of delivery.</li>
        <li>If delivery fails because the address was wrong or nobody was available, a re-delivery fee may apply. <Ph>[Confirm re-delivery policy]</Ph></li>
      </ul>

      <h2 id="export">6. International and export orders</h2>
      <p>We supply buyers outside Nigeria, especially for agro products and bulk orders. Export shipments are quoted individually based on product, quantity, destination, packaging and documentation. For a quote, <a href="/#contact">send us an inquiry</a> or message us on WhatsApp. <Ph>[Confirm how international orders placed through online checkout are charged and fulfilled]</Ph></p>
      <p>Import duties, taxes and customs clearance in the destination country are the buyer's responsibility unless we agree otherwise in writing.</p>

      <h2 id="issues">7. Delays, damage and loss</h2>
      <p>If your order is late, arrives damaged or goes missing in transit, contact us and we will work with the courier to resolve it, by re-sending the item or refunding you under our <Link href="/policies/returns">Returns & Refunds policy</Link>.</p>

      <h2 id="contact">8. Contact us</h2>
      <ContactBlock />
    </InfoLayout>
  );
}

export function ReturnsPolicy() {
  const toc = [
    { id: "window", label: "Return window" },
    { id: "eligible", label: "What can be returned" },
    { id: "exceptions", label: "Exceptions" },
    { id: "faulty", label: "Faulty, damaged or wrong items" },
    { id: "how", label: "How to return" },
    { id: "refunds", label: "Refunds" },
    { id: "exchanges", label: "Exchanges" },
    { id: "contact", label: "Contact us" },
  ];
  return (
    <InfoLayout eyebrow="Store policies" title="Returns & Refunds" backHref="/policies" backLabel="All policies" lastUpdated toc={toc}
      intro={<p>If something is not right with your order, we will help put it right. This policy does not affect your rights under the Federal Competition and Consumer Protection Act 2018.</p>}
      related={[{ href: "/policies/shipping", title: "Shipping & Delivery" }, { href: "/faq", title: "FAQ" }]}>
      <h2 id="window">1. Return window</h2>
      <p>You can ask to return eligible items within <Ph>{BUSINESS.returnWindowDays}</Ph> days of delivery.</p>

      <h2 id="eligible">2. What can be returned</h2>
      <p>To be eligible, an item must be:</p>
      <ul>
        <li>unused, in the same condition you received it, with all tags, accessories and manuals;</li>
        <li>in its original packaging, where possible;</li>
        <li>accompanied by your order number or Paystack payment reference.</li>
      </ul>

      <h2 id="exceptions">3. Exceptions</h2>
      <p>For health, safety and hygiene reasons, the following cannot be returned unless they are faulty, damaged or not what you ordered:</p>
      <ul>
        <li>agro and food products, including perishable produce, once delivered;</li>
        <li>underwear, swimwear and other intimate apparel;</li>
        <li>items that have been used, altered or damaged after delivery;</li>
        <li>custom or bulk orders made to your specification, unless agreed in writing.</li>
      </ul>
      <p><Ph>[Confirm or adjust this list of non-returnable items]</Ph></p>

      <h2 id="faulty">4. Faulty, damaged or wrong items</h2>
      <p>If an item arrives faulty, damaged or different from what you ordered, contact us within <Ph>[e.g. 48 hours]</Ph> of delivery with photos and your order number. We will offer a replacement, repair or full refund, including the delivery fee. Electronics may need a short inspection to confirm the fault.</p>

      <h2 id="how">5. How to return an item</h2>
      <ol>
        <li>Contact us using the details below with your order number and the reason for the return.</li>
        <li>We will confirm whether the item is eligible and tell you how to send it back.</li>
        <li>Pack the item securely. Unless the item is faulty or wrong, return delivery costs are paid by you. <Ph>[Confirm who pays return shipping]</Ph></li>
        <li>Once we receive and inspect the item, we will let you know whether your refund is approved.</li>
      </ol>

      <h2 id="refunds">6. Refunds</h2>
      <ul>
        <li>Approved refunds go back to your original payment method through Paystack.</li>
        <li>We start the refund within <Ph>{BUSINESS.refundProcessingDays}</Ph> of approving it. Your bank or card issuer may take extra time to show it.</li>
        <li>The original delivery fee is refunded only if the item was faulty, damaged or wrong, or the whole order is cancelled before dispatch.</li>
        <li>If you cancel a paid order before it is dispatched, we will refund it in full.</li>
      </ul>

      <h2 id="exchanges">7. Exchanges</h2>
      <p>For a different size or colour, contact us. If the item is in stock we can arrange an exchange. Otherwise we will refund the eligible item and you can place a new order.</p>

      <h2 id="contact">8. Contact us</h2>
      <ContactBlock />
    </InfoLayout>
  );
}

export function Terms() {
  const toc = [
    { id: "about", label: "About these terms" },
    { id: "eligibility", label: "Using the store" },
    { id: "accounts", label: "Accounts" },
    { id: "products", label: "Products & prices" },
    { id: "orders", label: "Orders & payment" },
    { id: "delivery", label: "Delivery, returns & refunds" },
    { id: "bulk", label: "Bulk & export orders" },
    { id: "conduct", label: "Acceptable use" },
    { id: "ip", label: "Intellectual property" },
    { id: "liability", label: "Liability" },
    { id: "law", label: "Governing law & disputes" },
    { id: "changes", label: "Changes" },
    { id: "contact", label: "Contact us" },
  ];
  return (
    <InfoLayout eyebrow="Legal" title="Terms & Conditions" backHref="/policies" backLabel="All policies" lastUpdated toc={toc}
      intro={<p>Please read these terms before using the store or placing an order. By using the site or buying from us, you agree to them.</p>}
      related={[{ href: "/policies/privacy", title: "Privacy Policy" }, { href: "/policies/returns", title: "Returns & Refunds" }]}>
      <h2 id="about">1. About these terms</h2>
      <p>This website is operated by {BUSINESS.legalName}, a company registered in Nigeria (RC <Ph>{BUSINESS.rcNumber}</Ph>), with its registered office at <Ph>{BUSINESS.registeredAddress}</Ph>. These terms, together with our <Link href="/policies/privacy">Privacy Policy</Link>, <Link href="/policies/shipping">Shipping & Delivery</Link> and <Link href="/policies/returns">Returns & Refunds</Link> policies, apply to your use of the store.</p>

      <h2 id="eligibility">2. Using the store</h2>
      <p>You must be at least 18 years old, or have the permission of a parent or guardian, to place an order. You agree to give accurate information when you check out.</p>

      <h2 id="accounts">3. Accounts</h2>
      <p>You are responsible for keeping your sign-in details private and for activity on your account. Tell us straight away if you think someone else has used your account.</p>

      <h2 id="products">4. Products and prices</h2>
      <ul>
        <li>We sell electronics, fashion and agro products. We try to describe and picture every product accurately, but colours and appearance may vary slightly, and agro products are natural goods that vary by season and batch.</li>
        <li>All prices are in Nigerian Naira (₦). Delivery, estimated VAT and any discount are shown before you pay.</li>
        <li>If a price is clearly wrong because of an error, we may cancel the order and refund you in full, even after payment.</li>
        <li>All products are subject to availability.</li>
      </ul>

      <h2 id="orders">5. Orders and payment</h2>
      <ul>
        <li>Payments are processed securely by Paystack. We never see or store your full card details.</li>
        <li>An order is only created after our server verifies a successful payment with Paystack. If you cancel or the payment is not verified, no order is created.</li>
        <li>Our acceptance of your order takes effect when we confirm it. We may decline or cancel an order (for example, if an item is out of stock or the payment looks fraudulent), and we will refund any amount paid.</li>
        <li>Coupons and promotions are subject to their own conditions, cannot be exchanged for cash, and may be withdrawn at any time.</li>
      </ul>

      <h2 id="delivery">6. Delivery, returns and refunds</h2>
      <p>Delivery is covered by our <Link href="/policies/shipping">Shipping & Delivery policy</Link>, and returns and refunds by our <Link href="/policies/returns">Returns & Refunds policy</Link>. Risk in the goods passes to you on delivery.</p>

      <h2 id="bulk">7. Bulk, wholesale and export orders</h2>
      <p>Bulk, wholesale and export orders may be agreed separately through an inquiry, quotation or written contract. Where they are, those terms (including price, packaging, Incoterms, documentation and payment schedule) apply in addition to these terms, and take priority if the two conflict.</p>

      <h2 id="conduct">8. Acceptable use</h2>
      <p>You must not misuse the site. This includes attempting to break its security, interfering with payments, scraping it at scale, or using it for anything unlawful or fraudulent.</p>

      <h2 id="ip">9. Intellectual property</h2>
      <p>The Olucha name, logo, website design and content belong to {BUSINESS.legalName} or its licensors. You may not copy or reuse them without our written permission.</p>

      <h2 id="liability">10. Liability</h2>
      <p>Nothing in these terms limits any rights you have as a consumer under Nigerian law, including the Federal Competition and Consumer Protection Act 2018, or our liability for death or personal injury caused by our negligence, or for fraud. Otherwise, we are not responsible for losses that were not foreseeable, for business losses when you buy as a consumer, or for delays caused by events outside our reasonable control. Our total liability for any order is limited to the amount you paid for it.</p>

      <h2 id="law">11. Governing law and disputes</h2>
      <p>These terms are governed by the laws of the Federal Republic of Nigeria. If something goes wrong, please contact us first and we will try to resolve it quickly and fairly. If we cannot, disputes will be handled by the courts of <Ph>[State whose courts will have jurisdiction, e.g. Delta State or Lagos State]</Ph>, Nigeria. <Ph>[Optional: arbitration or mediation clause]</Ph></p>

      <h2 id="changes">12. Changes to these terms</h2>
      <p>We may update these terms from time to time. The version on this page when you place an order applies to that order.</p>

      <h2 id="contact">13. Contact us</h2>
      <ContactBlock />
    </InfoLayout>
  );
}
