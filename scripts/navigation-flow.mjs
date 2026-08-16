import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const root = "http://localhost:3000";

await page.goto(`${root}/`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: "Explore catalogue" }).click();
await page.waitForURL("**/shop");
if (!(await page.getByText("Shop products chosen for everyday life.").count())) throw new Error("Explore catalogue CTA did not reach the shop");

await page.goto(`${root}/`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: "Shop electronics" }).click();
await page.waitForURL("**/shop/Electronics");
if (!(await page.getByText("Electronics").count())) throw new Error("Electronics category link failed");

for (const category of ["Electronics", "Fashion", "Agro products"]) {
  await page.goto(`${root}/`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: category }).first().click();
  await page.waitForURL(`**/shop/${category === "Agro products" ? "Agro%20Products" : category}`);
}

await page.goto(`${root}/news`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: "Read more" }).first().click();
await page.waitForURL("**/news/buying-electronics-online");
await page.waitForFunction(() => document.body.innerText.includes("What to check before buying electronics online"));
if (!(await page.getByText("What to check before buying electronics online").count())) throw new Error("News listing-to-article link failed");

await page.goto(`${root}/`, { waitUntil: "networkidle" });
await page.getByLabel("Customer account").click();
await page.waitForURL("**/account");
await page.waitForFunction(() => document.body.innerText.includes("Your Olucha account") || document.body.innerText.includes("Welcome back"));
if (!(await page.getByText(/Your Olucha account|Welcome back/i).count())) throw new Error("Account entry link failed");

await page.goto(`${root}/`, { waitUntil: "networkidle" });
const contactLink = page.getByRole("link", { name: "Contact" }).first();
if ((await contactLink.getAttribute("href")) !== "#contact") throw new Error("Contact link destination is incorrect");
const whatsappLink = page.getByRole("link", { name: "WhatsApp us" });
if ((await whatsappLink.getAttribute("href")) !== "https://wa.me/2348000000000") throw new Error("WhatsApp destination is incorrect");

const footerChecks = [
  ["Shop all", "/shop"],
  ["News & guides", "/news"],
  ["Customer account", "/account"],
  ["Cart", "/cart"],
];
for (const [label, expectedPath] of footerChecks) {
  await page.goto(`${root}/`, { waitUntil: "networkidle" });
  await page.locator("footer").getByRole("link", { name: label }).click();
  await page.waitForURL(`**${expectedPath}`);
}
await page.goto(`${root}/`, { waitUntil: "networkidle" });
await page.locator("footer").getByRole("link", { name: "Contact" }).click();
await page.waitForFunction(() => location.hash === "#contact");
if ((await page.locator("footer").getByRole("link", { name: "WhatsApp" }).getAttribute("href")) !== "https://wa.me/2348000000000") throw new Error("Footer WhatsApp destination is incorrect");

await page.goto(`${root}/admin`, { waitUntil: "networkidle" });
if (!(await page.getByText(/Admin workspace|Admin sign-in required|Admin sign-in|Access restricted/i).count())) throw new Error("Admin gating state did not render");

const unauthContext = await browser.newContext();
const unauthPage = await unauthContext.newPage();
await unauthPage.goto(`${root}/admin`, { waitUntil: "networkidle" });
await unauthPage.waitForFunction(() => document.body.innerText.includes("Admin sign-in"));
if (!(await unauthPage.getByText("Admin sign-in").count())) throw new Error("Unauthenticated admin gating failed");
await unauthContext.close();

console.log("navigation-flow: homepage CTAs, categories, footer routes, news article, account, contact, WhatsApp, and unauthenticated admin gating passed");
await browser.close();
