import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../../server/routers/index";
import { PRODUCT_CATEGORIES, errorMessage, slugify } from "./ui";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SearchResult = RouterOutputs["admin"]["searchCjCatalog"];
type CjProduct = RouterOutputs["admin"]["getCjCatalogProduct"];

type RetailDraft = { name: string; slug: string; category: string; description: string; price: string; unit: string };
const emptyDraft: RetailDraft = { name: "", slug: "", category: "Electronics", description: "", price: "", unit: "per item" };

export default function CjProductImport({ configured }: { configured: boolean }) {
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [product, setProduct] = useState<CjProduct | null>(null);
  const [variantId, setVariantId] = useState("");
  const [draft, setDraft] = useState<RetailDraft>(emptyDraft);
  const [searchError, setSearchError] = useState("");

  const search = trpc.admin.searchCjCatalog.useMutation({
    onSuccess: (value) => { setResults(value); setSearchError(""); setPage(value.page); },
    onError: (error) => setSearchError(errorMessage(error, "CJ catalogue search failed.")),
  });
  const details = trpc.admin.getCjCatalogProduct.useMutation({
    onSuccess: (value) => {
      setProduct(value);
      const variant = value.variants[0];
      setVariantId(variant?.id ?? "");
      const name = variant && value.variants.length > 1 ? `${value.name} — ${variant.name}` : value.name;
      setDraft({
        name,
        slug: slugify(name),
        category: (PRODUCT_CATEGORIES as readonly string[]).includes(value.category ?? "") ? value.category! : "Electronics",
        description: value.description || `${value.name} imported from CJ Dropshipping. Review and edit this description before activation.`,
        price: "",
        unit: variant?.unit ?? value.unit ?? "per item",
      });
    },
    onError: (error) => toast.error(errorMessage(error, "CJ product details could not be loaded.")),
  });
  const importDraft = trpc.admin.importCjProductDraft.useMutation({
    onSuccess: () => {
      toast.success("Imported as an unpublished draft. Review the product, check stock, and activate it when ready.");
      utils.admin.products.invalidate();
      setProduct(null);
      setVariantId("");
      setDraft(emptyDraft);
    },
    onError: (error) => toast.error(errorMessage(error, "CJ product draft could not be imported.")),
  });

  const runSearch = (requestedPage = 1) => {
    const normalized = searchTerm.trim();
    if (normalized.length < 2) {
      setSearchError("Enter at least two characters to search CJ.");
      return;
    }
    search.mutate({ searchTerm: normalized, page: requestedPage });
  };

  const selectProduct = (id: string) => details.mutate({ productId: id });
  const selectVariant = (id: string) => {
    setVariantId(id);
    if (!product) return;
    const selected = product.variants.find((item) => item.id === id);
    if (!selected) return;
    const name = product.variants.length > 1 ? `${product.name} — ${selected.name}` : product.name;
    setDraft((current) => ({ ...current, name, slug: slugify(name), unit: selected.unit ?? current.unit }));
  };

  const submitImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product || !variantId) return;
    const price = Number(draft.price);
    const priceKobo = Math.round(price * 100);
    if (!Number.isSafeInteger(priceKobo) || priceKobo < 1) {
      toast.error("Set a retail price greater than ₦0 before importing.");
      return;
    }
    importDraft.mutate({
      cjProductId: product.id,
      cjVariantId: variantId,
      name: draft.name.trim(),
      slug: slugify(draft.slug || draft.name),
      category: draft.category,
      description: draft.description.trim(),
      specifications: {},
      priceKobo,
      unit: draft.unit.trim() || "per item",
    });
  };

  const chosenVariant = product?.variants.find((item) => item.id === variantId) ?? null;
  const priceValid = Number.isFinite(Number(draft.price)) && Number(draft.price) > 0;

  return <section className="mb-6 rounded-3xl border border-blue-100 bg-blue-50/50 p-4 sm:p-6">
    <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1f5b9f]">CJ catalogue import</p><h3 className="mt-1 text-lg font-semibold text-[#0b1736]">Search, review and import a product option</h3><p className="mt-1 text-sm leading-6 text-slate-600">CJ imports remain unpublished drafts. Review the retail content, check stock, and activate only when the listing is ready.</p></div>
    {!configured ? <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Connect CJ to browse products. Imports remain unpublished drafts until you review the retail content, check stock, and activate them.</p> : <>
      <form onSubmit={(event) => { event.preventDefault(); runSearch(1); }} className="flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="cj-search">Search CJ products</label><input id="cj-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} minLength={2} maxLength={200} placeholder="Search CJ product catalogue" className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"/><button type="submit" disabled={search.isPending} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0b1736] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"><Search size={15}/>{search.isPending ? "Searching…" : "Search CJ"}</button></form>
      {searchError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{searchError}</p>}
      {results && <div className="mt-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{results.products.map((item) => <button key={item.id} type="button" disabled={details.isPending} onClick={() => selectProduct(item.id)} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-[#1f5b9f]"><span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">{item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover"/> : <span className="flex h-full items-center justify-center text-[10px] text-slate-400">No image</span>}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#0b1736]">{item.name}</span><span className="block truncate text-xs text-slate-500">{item.sku || item.id}</span><span className="block text-[11px] text-slate-400">{item.supplierPriceUsd === null ? "Supplier price not listed" : `CJ ref. $${item.supplierPriceUsd.toFixed(2)} USD`}</span></span></button>)}</div>{!results.products.length && <p className="rounded-xl bg-white p-4 text-sm text-slate-500">No CJ products found on this page.</p>}<div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Page {results.page} of {results.totalPages}</span><span className="flex gap-2"><button type="button" disabled={results.page <= 1 || search.isPending} onClick={() => runSearch(results.page - 1)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 font-semibold disabled:opacity-40"><ArrowLeft size={13}/>Previous</button><button type="button" disabled={results.page >= results.totalPages || search.isPending} onClick={() => runSearch(results.page + 1)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 font-semibold disabled:opacity-40">Next<ArrowRight size={13}/></button></span></div></div>}
      {details.isPending && <p role="status" className="mt-4 text-sm text-slate-500">Loading product details and options…</p>}
      {product && <form onSubmit={submitImport} className="mt-5 grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <div><div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">{(chosenVariant?.imageUrl ?? product.imageUrl) && <img src={chosenVariant?.imageUrl ?? product.imageUrl ?? ""} alt="" className="h-full w-full object-cover"/>}</div><h4 className="mt-3 font-semibold text-[#0b1736]">{product.name}</h4><p className="mt-1 text-xs leading-5 text-slate-500">{product.description || "No supplier description provided."}</p><p className="mt-2 text-xs text-slate-500">Selected CJ reference: {chosenVariant?.sku || "No option SKU"} · Stock snapshot: {chosenVariant?.stockQuantity === null || chosenVariant?.stockQuantity === undefined ? "unknown; will not be assumed" : chosenVariant.stockQuantity}</p></div>
        <div className="space-y-3"><label className="field">CJ option<select required value={variantId} onChange={(event) => selectVariant(event.target.value)}>{product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}{variant.sku ? ` · ${variant.sku}` : " · no SKU"}{variant.supplierPriceUsd === null ? "" : ` · $${variant.supplierPriceUsd.toFixed(2)} USD`}</option>)}</select></label><label className="field">Retail product name<input required minLength={2} maxLength={180} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value, slug: slugify(event.target.value) }))}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="field">Store category<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>{PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label className="field">Retail price (₦)<input required type="number" min="0.01" step="0.01" inputMode="decimal" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}/></label></div><label className="field">Unit<input required maxLength={40} value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}/></label><label className="field">Customer-facing description<textarea required minLength={10} maxLength={8000} rows={4} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}/></label><label className="field">Product page address<input required pattern="[a-z0-9-]+" maxLength={200} value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: slugify(event.target.value) }))}/></label><button type="submit" disabled={importDraft.isPending || !chosenVariant || !priceValid || !draft.slug} className="w-full rounded-full bg-[#f7b32b] px-5 py-3 text-sm font-bold text-[#0b1736] disabled:opacity-50">{importDraft.isPending ? "Importing draft…" : "Import as unpublished draft"}</button><p className="text-[11px] leading-5 text-slate-500">This saves one selected CJ option. It remains hidden from shoppers until reviewed, stock is checked, and it is activated. Stock must be checked before checkout can pass.</p></div>
      </form>}
    </>}
  </section>;
}
