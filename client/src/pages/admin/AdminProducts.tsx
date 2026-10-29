import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { CheckCircle2, ImageOff, Link2, Pencil, Plus, RefreshCw, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { EmptyState, Panel, PRODUCT_CATEGORIES, StatusBadge, errorMessage, formatNaira, slugify, uploadProductImage, useConfirm, type AdminProduct } from "./ui";

type Draft = { name: string; slug: string; category: string; description: string; price: string; unit: string; imageUrl: string };
const emptyDraft: Draft = { name: "", slug: "", category: "Electronics", description: "", price: "", unit: "per item", imageUrl: "" };

function ProductThumb({ product }: { product: Pick<AdminProduct, "imageUrl" | "name"> }) {
  const [failed, setFailed] = useState(false);
  if (!product.imageUrl || failed) return <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-300" aria-label="No image"><ImageOff size={18}/></div>;
  return <img src={product.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"/>;
}

function CjMappingRow({ product, configured }: { product: AdminProduct; configured: boolean }) {
  const utils = trpc.useUtils();
  const [cjProductId, setCjProductId] = useState(product.cjLink?.cjProductId ?? "");
  const [cjVariantId, setCjVariantId] = useState(product.cjLink?.cjVariantId ?? "");
  const [editing, setEditing] = useState(!product.cjLink);
  const save = trpc.admin.saveCjMapping.useMutation({
    onSuccess: () => { toast.success("CJ mapping saved"); setEditing(false); utils.admin.products.invalidate(); },
    onError: (error) => toast.error(errorMessage(error, "Could not save the CJ mapping.")),
  });
  const sync = trpc.admin.syncCjProduct.useMutation({
    onSuccess: (result) => { toast.success(`Stock refreshed${result.stockQuantity === null ? "" : `: ${result.stockQuantity} available`}`); utils.admin.products.invalidate(); },
    onError: (error) => toast.error(errorMessage(error, "CJ stock refresh failed.")),
  });
  const mapped = product.cjLink;
  return <div className="rounded-2xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><ProductThumb product={product}/><div className="min-w-0"><p className="font-semibold">{product.name}</p><p className="text-xs text-slate-500">{mapped ? `${mapped.cjProductName || mapped.cjProductId} · ${mapped.cjVariantName || mapped.cjVariantId}` : "No CJ product or variant mapped"}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#1f5b9f]"><Link2 size={12}/>{editing ? "Close" : "Edit mapping"}</button>{mapped && <button type="button" disabled={sync.isPending || !configured} title={configured ? "Refresh read-only CJ stock" : "CJ sync is not configured for this Preview deployment"} onClick={() => sync.mutate({ productId: product.id })} className="inline-flex items-center gap-1 rounded-full bg-[#0b1736] px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={12} className={sync.isPending ? "animate-spin" : ""}/>{sync.isPending ? "Refreshing…" : configured ? "Refresh stock" : "Sync unavailable"}</button>}</div></div>
    {editing && <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="field">CJ product ID<input value={cjProductId} onChange={(event) => setCjProductId(event.target.value)} placeholder="CJ product ID" autoComplete="off"/></label><label className="field">CJ variant ID<input value={cjVariantId} onChange={(event) => setCjVariantId(event.target.value)} placeholder="CJ variant ID" autoComplete="off"/></label><button type="button" disabled={save.isPending || !cjProductId.trim() || !cjVariantId.trim()} onClick={() => save.mutate({ productId: product.id, cjProductId: cjProductId.trim(), cjVariantId: cjVariantId.trim() })} className="rounded-full bg-[#f7b32b] px-4 py-2 text-xs font-bold text-[#0b1736] disabled:opacity-50">{save.isPending ? "Saving…" : "Save mapping"}</button></div>}
    {mapped && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 size={13}/>Mapped</span><span>Stock: {mapped.stockQuantity === null ? "not synced" : mapped.stockQuantity}</span><span>Last sync: {mapped.stockSyncedAt ? new Date(mapped.stockSyncedAt).toLocaleString("en-NG") : "never"}</span></div>}
  </div>;
}

function ProductForm({ product, onDone }: { product: AdminProduct | null; onDone: () => void }) {
  const utils = trpc.useUtils();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Draft>(() => product ? {
    name: product.name,
    slug: product.slug,
    category: product.category,
    description: product.description,
    price: String(product.priceKobo / 100),
    unit: product.unit,
    imageUrl: product.imageUrl ?? "",
  } : emptyDraft);
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageMode, setImageMode] = useState<"upload" | "link">("upload");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const onSuccess = (message: string) => { toast.success(message); utils.admin.products.invalidate(); onDone(); };
  const onError = (error: unknown) => { const message = errorMessage(error, "The product could not be saved."); setFormError(message); toast.error(message); };
  const createProduct = trpc.admin.createProduct.useMutation({ onSuccess: () => onSuccess("Product added"), onError });
  const updateProduct = trpc.admin.updateProduct.useMutation({ onSuccess: () => onSuccess("Product updated"), onError });
  const saving = createProduct.isPending || updateProduct.isPending || uploading;
  const priceNumber = Number(draft.price);
  const priceInvalid = draft.price !== "" && (!Number.isFinite(priceNumber) || priceNumber <= 0);
  const previewSrc = imagePreview || draft.imageUrl;

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const chooseImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      const message = "Choose a PNG, JPEG, WEBP, or GIF image smaller than 8 MB.";
      setFormError(message);
      toast.error(message);
      return;
    }
    setFormError("");
    setImageFile(file);
    setImageMode("upload");
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    chooseImage(event.dataTransfer.files?.[0] ?? null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const slug = slugify(draft.slug || draft.name);
    if (!slug) return setFormError("Enter a product name so a slug can be generated.");
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) return setFormError("Price must be greater than ₦0.");
    const priceKobo = Math.round(priceNumber * 100);
    if (product && priceKobo !== product.priceKobo) {
      const ok = await confirm({ title: "Change this price?", description: <>The storefront price of <strong>{product.name}</strong> will change from {formatNaira(product.priceKobo)} to {formatNaira(priceKobo)}. New carts and checkouts will use the new price.</>, confirmLabel: "Change price" });
      if (!ok) return;
    }
    let imageUrl: string | null = draft.imageUrl.trim() || null;
    if (imageFile) {
      setUploading(true);
      try { imageUrl = await uploadProductImage(imageFile); }
      catch (error) { const message = errorMessage(error, "Image upload failed"); setFormError(message); toast.error(message); return; }
      finally { setUploading(false); }
    }
    const values = { name: draft.name.trim(), slug, category: draft.category, description: draft.description.trim(), priceKobo, unit: draft.unit.trim() || "per item" };
    if (product) updateProduct.mutate({ id: product.id, ...values, imageUrl });
    else createProduct.mutate({ ...values, currency: "NGN", specifications: { availability: "Available to order" }, imageUrl: imageUrl ?? undefined });
  };

  return <form onSubmit={submit} className="mb-5 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1f5b9f]">{product ? "Edit catalogue item" : "New catalogue item"}</p><h3 className="mt-1 text-xl font-semibold text-[#0b1736]">{product ? `Edit ${product.name}` : "Add product"}</h3></div><button type="button" onClick={onDone} aria-label="Close form" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><label className="field">Product name<input required minLength={2} maxLength={180} value={draft.name} onChange={(event) => { const name = event.target.value; setDraft((current) => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) })); }} placeholder="Product name"/></label><label className="field">Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{(PRODUCT_CATEGORIES as readonly string[]).includes(draft.category) ? null : <option value={draft.category}>{draft.category}</option>}{PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]"><label className="field">Price (₦)<input required type="number" min="0.01" step="0.01" inputMode="decimal" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="e.g. 25000" aria-invalid={priceInvalid}/><span className={`text-[11px] font-normal ${priceInvalid ? "text-rose-600" : "text-slate-400"}`}>{priceInvalid ? "Price must be greater than ₦0." : draft.price ? formatNaira(Math.round(priceNumber * 100)) : "Shown to customers in naira"}</span></label><label className="field">Unit<input value={draft.unit} maxLength={40} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="per item"/></label></div>
        <details className="rounded-2xl border border-slate-200 px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">URL details</summary><label className="field mt-3">Slug (URL)<input required pattern="[a-z0-9-]+" maxLength={200} value={draft.slug} onChange={(event) => { setSlugTouched(true); setDraft({ ...draft, slug: event.target.value.toLowerCase() }); }} onBlur={() => setDraft((current) => ({ ...current, slug: slugify(current.slug) }))} placeholder="product-slug"/><span className="text-[11px] font-normal text-slate-400">/products/{draft.slug || "…"}</span></label></details>
        <div><div className="mb-2 flex gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setImageMode("upload")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${imageMode === "upload" ? "bg-white text-[#0b1736] shadow-sm" : "text-slate-500"}`}>Upload</button><button type="button" onClick={() => setImageMode("link")} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${imageMode === "link" ? "bg-white text-[#0b1736] shadow-sm" : "text-slate-500"}`}>Link</button></div>{imageMode === "upload" ? <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${dragging ? "border-[#1f5b9f] bg-blue-50" : "border-slate-200 bg-slate-50"}`}><UploadCloud className="mx-auto mb-2 text-[#1f5b9f]" size={24}/><p className="text-sm font-semibold text-slate-700">Drag and drop an image, or click to browse</p><p className="mt-1 text-xs text-slate-400">PNG, JPEG, WEBP, or GIF up to 8 MB.</p><label className="mt-3 inline-flex cursor-pointer rounded-full bg-[#0b1736] px-4 py-2 text-xs font-bold text-white">Choose image<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => chooseImage(event.target.files?.[0] ?? null)}/></label>{imageFile && <p className="mt-2 text-xs text-slate-500">Selected: {imageFile.name}</p>}</div> : <label className="field">Image URL<input type="url" value={draft.imageUrl} onChange={(event) => { setImageFile(null); setDraft({ ...draft, imageUrl: event.target.value }); }} placeholder="https://…"/><span className="text-[11px] font-normal text-slate-400">Use a secure HTTPS image URL.</span></label>}</div>
        <label className="field">Description<textarea required minLength={10} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Product description (at least 10 characters)" rows={5}/></label>
        {formError && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">{formError}</p>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onDone} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving || priceInvalid} className="rounded-full bg-[#f7b32b] px-5 py-3 text-sm font-bold text-[#0b1736] disabled:opacity-60">{uploading ? "Uploading photo…" : saving ? "Saving…" : product ? "Save changes" : "Save product"}</button></div>
      </div>
      <aside className="rounded-3xl border border-slate-200 bg-[#f8fafc] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1f5b9f]">Live Preview</p><p className="mt-1 text-xs text-slate-500">Draft only · not a real product or cart</p></div><span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Preview</span></div><div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"><div className="aspect-[4/3] bg-slate-100">{previewSrc ? <img src={previewSrc} alt="Draft product" className="h-full w-full object-cover"/> : <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300"><ImageOff size={32}/><span className="text-xs">Product image</span></div>}</div><div className="space-y-3 p-5"><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1f5b9f]">{draft.category || "Category"}</span><h4 className="min-h-7 text-xl font-bold text-[#0b1736]">{draft.name || "Product name"}</h4><p className="text-2xl font-bold text-[#0b1736]">{draft.price && !priceInvalid ? formatNaira(Math.round(priceNumber * 100)) : "₦0"}<span className="ml-1 text-sm font-medium text-slate-400">{draft.unit || "per item"}</span></p><p className="min-h-12 whitespace-pre-line text-sm leading-6 text-slate-500">{draft.description || "Your product description will appear here."}</p><button type="button" disabled className="w-full rounded-full bg-slate-200 px-4 py-3 text-sm font-bold text-slate-500">Preview only</button></div></div></aside>
    </div>
  </form>;
}

export default function AdminProducts({ products, loading, error }: { products: AdminProduct[]; loading: boolean; error: boolean }) {
  const utils = trpc.useUtils();
  const confirm = useConfirm();
  const cjSyncStatus = trpc.admin.cjSyncStatus.useQuery();
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  const [category, setCategory] = useState("All products");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const toggle = trpc.admin.updateProduct.useMutation({
    onSuccess: (_, variables) => { toast.success(variables.isActive ? "Product activated" : "Product deactivated"); utils.admin.products.invalidate(); },
    onError: (error) => toast.error(errorMessage(error, "Could not change product status.")),
  });
  const categories = useMemo(() => Array.from(new Set([...PRODUCT_CATEGORIES, ...products.map((product) => product.category)])), [products]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => (category === "All products" || product.category === category)
      && (statusFilter === "all" || (statusFilter === "active" ? product.isActive === 1 : product.isActive !== 1))
      && (!query || product.name.toLowerCase().includes(query) || product.slug.includes(query)));
  }, [category, products, search, statusFilter]);

  const toggleActive = async (product: AdminProduct) => {
    const activate = product.isActive !== 1;
    if (!activate) {
      const ok = await confirm({ title: `Deactivate ${product.name}?`, description: "It will be hidden from the storefront and can no longer be bought. You can reactivate it at any time.", confirmLabel: "Deactivate", destructive: true });
      if (!ok) return;
    }
    toggle.mutate({ id: product.id, isActive: activate ? 1 : 0 });
  };

  const actions = (product: AdminProduct) => <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setEditing(product); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-slate-200 px-4 text-xs font-bold text-[#1f5b9f]"><Pencil size={12}/>Edit</button><button type="button" disabled={toggle.isPending} onClick={() => toggleActive(product)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${product.isActive === 1 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{product.isActive === 1 ? "Deactivate" : "Activate"}</button></div>;

  return <>
    <div className="mb-5 flex justify-end"><button type="button" onClick={() => setEditing((value) => value === "new" ? null : "new")} className="inline-flex items-center gap-2 rounded-full bg-[#0b1736] px-4 py-2 text-xs font-bold text-white"><Plus size={14}/>{editing === "new" ? "Close form" : "Add product"}</button></div>
    {editing && <ProductForm key={editing === "new" ? "new" : editing.id} product={editing === "new" ? null : editing} onDone={() => setEditing(null)}/>}
    <Panel title="Catalogue management">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products" className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"/>
        <select aria-label="Filter catalogue by category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f5b9f]"><option value="All products">All products</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select aria-label="Filter catalogue by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f5b9f]"><option value="all">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </div>
      {loading ? <EmptyState>Loading catalogue…</EmptyState> : error ? <EmptyState>Catalogue is temporarily unavailable. Reload the page to retry.</EmptyState> : !filtered.length ? <EmptyState>{products.length ? "No products match these filters." : "No database catalogue items yet."}</EmptyState> : <>
        <div className="hidden md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400"><tr><th className="py-3">Product</th><th>Category</th><th>Price</th><th>Status</th><th className="text-right">Actions</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id} className="border-b border-slate-100 align-middle"><td className="py-3"><div className="flex items-center gap-3"><ProductThumb product={product}/><div className="min-w-0"><p className="font-semibold">{product.name}</p><p className="truncate text-xs text-slate-400">/{product.slug}</p></div></div></td><td>{product.category}</td><td className="whitespace-nowrap">{formatNaira(product.priceKobo)}<span className="block text-xs text-slate-400">{product.unit}</span></td><td><StatusBadge status={product.isActive === 1 ? "active" : "inactive"} label={product.isActive === 1 ? "Active" : "Inactive"}/></td><td className="py-3"><div className="flex justify-end">{actions(product)}</div></td></tr>)}</tbody></table></div>
        <div className="space-y-3 md:hidden">{filtered.map((product) => <div key={product.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start gap-3"><ProductThumb product={product}/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="font-semibold">{product.name}</p><StatusBadge status={product.isActive === 1 ? "active" : "inactive"} label={product.isActive === 1 ? "Active" : "Inactive"}/></div><p className="mt-1 text-xs text-slate-500">{product.category} · {formatNaira(product.priceKobo)} {product.unit}</p></div></div><div className="mt-3">{actions(product)}</div></div>)}</div>
      </>}
      <div className="mt-8 border-t border-slate-200 pt-6"><div className="mb-3"><h3 className="font-semibold">CJ Dropshipping read-only stock</h3><p className="mt-1 text-xs leading-5 text-slate-500">Map a store product to a CJ product and variant, then refresh supplier details and stock. This never creates a supplier order or payment.</p><p className={`mt-2 rounded-xl p-3 text-xs ${cjSyncStatus.data?.configured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{cjSyncStatus.data?.configured ? "Read-only CJ sync is configured for this Preview deployment." : "CJ stock refresh is unavailable until the Preview deployment is configured with the server-side CJ key."}</p></div><div className="space-y-3">{filtered.map((product) => <CjMappingRow key={`cj-${product.id}`} product={product} configured={Boolean(cjSyncStatus.data?.configured)}/>)}</div></div>
    </Panel>
  </>;
}
