import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "https://olucha-kwantum-ventures.onovochikeziri84.workers.dev";
const fixtureMode = process.env.MOTION_FIXTURE === "1";
const local = ["localhost", "127.0.0.1"].includes(new URL(base).hostname);
if (fixtureMode && !local) throw new Error("Fixtures are forbidden on a remote Preview; use a local server only.");
const artifactDir = process.env.ARTIFACT_DIR || "/tmp/okv-motion-check";
await fs.mkdir(artifactDir, { recursive: true });
const report = { base, dataMode: fixtureMode ? "isolated local fixture; no database writes" : "unaltered live catalogue", checks: {}, errors: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ["--no-sandbox"] });
const fixture = { id: -1, slug: "motion-test-only", name: "Motion test item", category: "Fashion", priceKobo: 2500000, unit: "per item", description: "Isolated browser test data; never published.", specifications: {}, imageUrl: "https://olucha-kwantum-ventures.onovochikeziri84.workers.dev/manus-storage/product-images/ba105e62-7628-4c0f-9f26-e8bff1b50f77.jpg", isActive: 1, supplierMapped: false, supplierVariantFixed: false, supplierStock: null, supplierStockSyncedAt: null };

async function newContext(options) {
  const context = await browser.newContext(options);
  context.setDefaultTimeout(10_000);
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    assert.equal(request.method(), "GET", "Browser verification must never submit orders, payments or other API writes");
    const url = new URL(request.url());
    if (fixtureMode && url.pathname.includes("/api/trpc/")) {
      const names = url.pathname.split("/").at(-1).split(",");
      const data = names.map((name) => {
        assert.ok(["catalogue.list", "catalogue.bySlug", "news.list"].includes(name), `Unexpected fixture query: ${name}`);
        return { result: { data: { json: name === "catalogue.list" ? [fixture] : name === "catalogue.bySlug" ? fixture : [] } } };
      });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(url.searchParams.has("batch") ? data : data[0]) });
    } else if (local && process.env.API_ORIGIN) {
      const response = await route.fetch({ url: new URL(url.pathname + url.search, process.env.API_ORIGIN).href });
      await route.fulfill({ response });
    } else await route.continue();
  });
  await context.addInitScript(() => {
    window.__okvMotion = { events: [], hero: [] };
    document.addEventListener("animationstart", (event) => {
      window.__okvMotion.events.push({ name: event.animationName, id: event.target.id, className: String(event.target.className), delay: getComputedStyle(event.target).animationDelay });
    });
    let started;
    const sample = (time) => {
      const hero = document.querySelector("h1.motion-rise");
      if (hero) {
        started ??= time;
        const style = getComputedStyle(hero);
        window.__okvMotion.hero.push({ time: time - started, opacity: Number(style.opacity), transform: style.transform });
      }
      if (!started || time - started < 1800) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  context.on("page", (page) => page.on("pageerror", (error) => report.errors.push(error.message)));
  return context;
}

const style = (locator) => locator.evaluate((element) => {
  const css = getComputedStyle(element);
  const matrix = new DOMMatrixReadOnly(css.transform === "none" ? undefined : css.transform);
  return { opacity: Number(css.opacity), transform: css.transform, y: matrix.m42, scale: matrix.a, height: element.getBoundingClientRect().height, animation: css.animationName, state: element.dataset.revealState };
});

try {
  const desktop = await newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  const page = await desktop.newPage();
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator("h1.motion-rise").waitFor();
  await page.waitForTimeout(1900);
  const captured = await page.evaluate(() => window.__okvMotion);
  assert.ok(captured.hero.some((frame) => frame.opacity < 0.8), "Hero must visibly fade/slide, not just declare CSS");
  assert.ok(captured.hero.some((frame) => frame.opacity > 0.99), "Hero must finish visible");
  assert.ok(new Set(captured.hero.map((frame) => frame.transform)).size > 3, "Hero transform must actually change across frames");
  assert.ok(captured.events.some((event) => event.name === "olucha-slide"), "Hero artwork must run its slide entrance");
  report.checks.hero = { frames: captured.hero.length, minOpacity: Math.min(...captured.hero.map((frame) => frame.opacity)), maxOpacity: Math.max(...captured.hero.map((frame) => frame.opacity)), artworkSlide: true };

  const badge = page.locator(".motion-float");
  const badgeStart = await style(badge);
  await page.waitForTimeout(350);
  const badgeEnd = await style(badge);
  assert.notEqual(badgeStart.y, badgeEnd.y, "Floating signature must actually move");
  report.checks.floatingSignature = { fromY: badgeStart.y, toY: badgeEnd.y };

  const cta = page.locator(".shimmer-button");
  await cta.hover();
  await page.waitForTimeout(200);
  const ctaStyle = await style(cta);
  assert.ok(ctaStyle.y < -2, "Primary button must visibly lift on hover");
  assert.equal(await cta.evaluate((el) => getComputedStyle(el, "::after").animationName), "olucha-shimmer");
  report.checks.buttonHover = ctaStyle;
  await page.mouse.move(2, 2);
  await page.screenshot({ path: path.join(artifactDir, "desktop-home.png") });

  const about = page.locator("#about");
  assert.equal((await style(about)).state, "pending", "Below-fold section must wait for scrolling");
  assert.equal((await style(about)).opacity, 0);
  await about.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("#about")?.dataset.revealState === "visible");
  await page.waitForTimeout(75);
  const aboutDuring = await style(about);
  assert.ok(aboutDuring.opacity > 0 && aboutDuring.opacity < 1 && aboutDuring.y > 0, "Section must visibly animate after scrolling into view");
  await page.waitForTimeout(1100);
  const aboutAfter = await style(about);
  assert.equal(aboutAfter.opacity, 1);
  assert.equal(aboutAfter.transform, "none");
  await page.locator("h1").scrollIntoViewIfNeeded();
  await about.scrollIntoViewIfNeeded();
  const aboutEvents = await page.evaluate(() => window.__okvMotion.events.filter((event) => event.id === "about").length);
  assert.equal(aboutEvents, 1, "Section must not replay on every scroll");
  report.checks.scrollReveal = { during: aboutDuring, after: aboutAfter, entranceCount: aboutEvents };

  await page.getByRole("region", { name: "Shop by category", exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  const stagger = await page.locator('[aria-label="Shop by category"] .motion-reveal').evaluateAll((elements) => elements.map((el) => getComputedStyle(el).animationDelay));
  assert.deepEqual(stagger, ["0s", "0.12s", "0.24s"]);
  report.checks.categoryStagger = stagger;

  const cards = page.locator(".store-product-card");
  const cardCount = await cards.count();
  report.checks.publicProductCardCount = cardCount;
  if (cardCount) {
    const card = cards.first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    assert.equal((await style(card)).transform, "none", "Entrance must release transform ownership before hover");
    await card.hover();
    await page.waitForTimeout(1100);
    const lifted = await style(card);
    const photo = card.locator(".store-product-photo");
    assert.ok(lifted.y < -8, "Card must actually lift after its entrance completes");
    if (await photo.count()) assert.ok((await style(photo)).scale > 1.07, "Product photo must visibly zoom");
    report.checks.cardHover = { liftY: lifted.y, photoScale: await photo.count() ? (await style(photo)).scale : null };
    await page.screenshot({ path: path.join(artifactDir, "desktop-product-hover.png") });
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500);
    assert.equal((await style(card)).transform, "none");

    if (fixtureMode) {
      await card.getByRole("button", { name: "Quick view", exact: true }).click();
      await page.getByRole("dialog").waitFor();
      assert.equal(await page.locator(".product-lightbox").evaluate((el) => getComputedStyle(el).animationName), "olucha-dialog");
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").count(), 0);
      await card.getByRole("link", { name: `View ${fixture.name}`, exact: true }).click();
      await page.getByRole("heading", { name: fixture.name, exact: true }).waitFor();
      await page.getByRole("button", { name: /Add to cart/ }).click();
      await page.getByText("Please choose a size.", { exact: true }).waitFor();
      assert.equal(await page.getByText("Please choose a size.", { exact: true }).count(), 1);
      assert.equal(await page.evaluate(() => localStorage.getItem("olucha-store-cart")), null);
      await page.getByRole("radiogroup", { name: "Size", exact: true }).getByRole("radio", { name: "M", exact: true }).click();
      await page.getByRole("radiogroup", { name: "Colour", exact: true }).getByRole("radio", { name: "Black", exact: true }).click();
      await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
      await page.getByRole("button", { name: /Add to cart/ }).click();
      const lines = await page.evaluate(() => JSON.parse(localStorage.getItem("olucha-store-cart")));
      assert.equal(lines[0].quantity, 2);
      assert.equal(lines[0].product.variant.size, "Medium");
      assert.equal(lines[0].product.variant.color, "Black");
      await page.getByRole("banner").getByRole("link", { name: "Cart", exact: true }).click();
      await page.getByRole("heading", { name: fixture.name, exact: true }).waitFor();
      assert.ok((await page.locator("body").innerText()).includes("₦50,000"));
      report.checks.localCommerce = "variant validation, quantity, cart persistence and subtotal passed; no API writes";
    }
  } else report.checks.cardHover = "Not available on public Preview: catalogue was already empty before this change. Covered with isolated local fixture only.";

  await page.goto(`${base}/shop`, { waitUntil: "domcontentloaded" });
  await page.getByRole("searchbox", { name: "Search the store", exact: true }).waitFor();
  await page.getByRole("button", { name: "Fashion", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Fashion", exact: true }).getAttribute("aria-pressed"), "true");
  await page.getByRole("searchbox", { name: "Search the store", exact: true }).fill("no-match-motion-check");
  await page.waitForTimeout(250);
  assert.equal(await page.locator(".store-product-card").count(), 0);
  report.checks.filters = "category and search still update correctly";
  await desktop.close();

  const mobile = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, hasTouch: true, reducedMotion: "no-preference" });
  const phone = await mobile.newPage();
  await phone.goto(base, { waitUntil: "domcontentloaded" });
  await phone.getByRole("button", { name: "Open menu", exact: true }).waitFor();
  await phone.waitForTimeout(1800);
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Mobile must not overflow horizontally");
  const shell = phone.locator(".store-mobile-menu");
  assert.equal((await style(shell)).height, 0);
  assert.equal(await shell.evaluate((el) => el.inert), true);
  await phone.getByRole("button", { name: "Open menu", exact: true }).click();
  await phone.waitForTimeout(70);
  const menuDuring = await style(shell);
  await phone.waitForTimeout(500);
  const menuOpen = await style(shell);
  assert.ok(menuDuring.height > 0 && menuDuring.height < menuOpen.height, "Menu must visibly expand, not appear abruptly");
  assert.equal(await shell.getAttribute("aria-hidden"), "false");
  await phone.keyboard.press("Escape");
  await phone.waitForTimeout(500);
  assert.equal((await style(shell)).height, 0);
  assert.equal(await shell.evaluate((el) => el.inert), true);
  report.checks.mobileMenu = { duringHeight: menuDuring.height, openHeight: menuOpen.height, closedHeight: 0, escapeClose: true, noHorizontalOverflow: true };
  await phone.screenshot({ path: path.join(artifactDir, "mobile-home.png") });
  await mobile.close();

  const reduced = await newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const still = await reduced.newPage();
  await still.goto(base, { waitUntil: "domcontentloaded" });
  await still.locator("h1").waitFor();
  await still.waitForTimeout(250);
  const heroStill = await style(still.locator("h1"));
  assert.equal(heroStill.animation, "none");
  assert.equal(heroStill.opacity, 1);
  const pendingStill = await style(still.locator("#about"));
  assert.equal(pendingStill.opacity, 1);
  assert.equal(pendingStill.transform, "none");
  assert.equal((await style(still.locator(".motion-float"))).animation, "none");
  await still.locator(".shimmer-button").hover();
  assert.equal((await style(still.locator(".shimmer-button"))).transform, "none");
  if (await still.locator(".store-product-card").count()) {
    const card = still.locator(".store-product-card").first();
    await card.hover();
    assert.equal((await style(card)).transform, "none");
    const photo = card.locator(".store-product-photo");
    if (await photo.count()) assert.equal((await style(photo)).transform, "none");
  }
  report.checks.reducedMotion = "hero, pending sections, floating signature, buttons and available cards remain visible and still";
  await reduced.close();
  assert.deepEqual(report.errors, [], "No browser runtime exceptions");
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  report.failurePages = [];
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      report.failurePages.push({ url: page.url(), text: (await page.locator("body").innerText()).slice(0, 4000) });
      await page.screenshot({ path: path.join(artifactDir, `failure-${report.failurePages.length}.png`) });
    }
  }
  process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(path.join(artifactDir, "motion-verification.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
