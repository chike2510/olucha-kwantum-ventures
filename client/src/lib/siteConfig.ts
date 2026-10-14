export const WHATSAPP_NUMBER = "2348137232498";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

// Leave empty until the official Facebook page is ready. The UI keeps the destination visibly reserved without exposing a dead link.
export const FACEBOOK_PAGE_URL = "";

export const OKV_MARK_ONLY_URL = "https://raw.githubusercontent.com/chike2510/olucha-kwantum-ventures/b9202f6/assets/okv-mark-only.png";

export const OKV_WORDMARK_URL = "https://raw.githubusercontent.com/chike2510/olucha-kwantum-ventures/ab935a1/assets/okv-wordmark.png";

/**
 * Business details used by the footer and legal pages.
 * Values in [square brackets] are placeholders the owner must confirm before launch.
 */
export const BUSINESS = {
  legalName: "Olucha Kwantum Ventures Limited",
  shortName: "Olucha Kwantum Ventures",
  tagline: "Quality products, trusted globally.",
  rcNumber: "[RC number]",
  registeredAddress: "[Registered office address]",
  supportEmail: "[support email address]",
  privacyEmail: "[privacy / data-protection contact email]",
  supportPhone: "[customer support phone number]",
  whatsappDisplay: "0813 723 2498",
  businessHours: "[business hours, e.g. Monday–Friday, 9am–5pm WAT]",
  flatShippingNaira: 2500,
  freeShippingThresholdNaira: 100000,
  vatRatePercent: 7.5,
  returnWindowDays: "[return window, e.g. 7]",
  refundProcessingDays: "[refund processing time, e.g. 5–10 business days]",
  policiesLastUpdated: "[date of last review]",
} as const;
