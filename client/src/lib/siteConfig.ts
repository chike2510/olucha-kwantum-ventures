export const WHATSAPP_NUMBER = "2348137232498";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

// Leave empty until the official Facebook page is ready. The UI keeps the destination visibly reserved without exposing a dead link.
export const FACEBOOK_PAGE_URL = "";

export const OKV_MARK_ONLY_URL = "https://raw.githubusercontent.com/chike2510/olucha-kwantum-ventures/b9202f6/assets/okv-mark-only.png";

export const OKV_WORDMARK_URL = "https://raw.githubusercontent.com/chike2510/olucha-kwantum-ventures/ab935a1/assets/okv-wordmark.png";

/**
 * Business details used by the footer and legal pages.
 * Empty optional values are omitted publicly until the business confirms them.
 */
export const BUSINESS = {
  legalName: "Olucha Kwantum Ventures Limited",
  shortName: "Olucha Kwantum Ventures",
  tagline: "Quality products, trusted globally.",
  rcNumber: "9716150",
  registeredAddress: "10 Gideon Ubiebor, Ughelli, Delta State",
  supportEmail: "oluchakwantumventures@gmail.com",
  privacyEmail: "oluchakwantumventures@gmail.com",
  supportPhone: "0907 497 5086",
  whatsappDisplay: "0813 723 2498",
  businessHours: "",
  flatShippingNaira: 2500,
  freeShippingThresholdNaira: 100000,
  vatRatePercent: 0, // prices are VAT-inclusive; no VAT added at checkout
  returnWindowDays: "",
  refundProcessingDays: "",
  policiesLastUpdated: "",
} as const;
