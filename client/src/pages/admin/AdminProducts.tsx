import { useMemo, useState, type FormEvent } from "react";
import { ImageOff, Pencil, Plus, X } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const onSuccess = (message: string) => { toast.success(message); utils.admin.products.invalidate(); onDone(); };
  const onError = (error: unknown) => { const message = errorMessage(error, "The product could not be saved."); setFormError(message); toast.error(message); };
  const createProduct = trpc.admin.createProduct.useMutation({ onSuccess: () => onSuccess("Product added"), onError });
  const updateProduct = trpc.admin.updateProduct.useMutation({ onSuccess: () => onSuccess("Product updated"), onError });
  const saving = createProduct.isPending || updateProduct.isPending || uploading;
  const priceNumber = Number(draft.price);
  const priceInvalid = draft.price !== "" && (!Number.isFinite(priceNumber) || priceNumber <= 0);

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

  const previewSrc = imagePreview || draft.imageUrl;
  return <form onSubmit={submit} className="mb-5 grid gap-4 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-6">
    <div className="flex items-center justify-between sm:col-span-2"><h3 className="text-lg font-semibold">{product ? `Edit ${product.name}` : "Add product"}</h3><button type="button" onClick={onDone} aria-label="Close form" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div>
    <label className="field">Product name<input required minLength={2} maxLength={180} value={draft.name} onChange={(event) => { const name = event.target.value; setDraft((current) => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) })); }} placeholder="Product name"/></label>
    <label className="field">Slug (URL)<input required pattern="[a-z0-9-]+" maxLength={200} value={draft.slug} onChange={(event) => { setSlugTouched(true); setDraft({ ...draft, slug: event.target.value.toLowerCase() }); }} onBlur={() => setDraft((current) => ({ ...current, slug: slugify(current.slug) }))} placeholder="product-slug"/><span className="text-[11px] font-normal text-slate-400">/products/{draft.slug || "…"}</span></label>
    <label className="field">Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{(PRODUCT_CATEGORIES as readonly string[]).includes(draft.category) ? null : <option value={draft.category}>{draft.category}</option>}{PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
    <label className="field">Price (₦)<input required type="number" min="0.01" step="0.01" inputMode="decimal" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="e.g. 25000" aria-invalid={priceInvalid}/><span className={`text-[11px] font-normal ${priceInvalid ? "text-rose-600" : "text-slate-400"}`}>{priceInvalid ? "Price must be greater than ₦0." : draft.price ? formatNaira(Math.round(priceNumber * 100)) : "Shown to customers in naira"}</span></label>
    <label className="field">Unit<input value={draft.unit} maxLength={40} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="per item"/></label>
    <div className="space-y-2"><label className="field">Product photo<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0] ?? null; setImageFile(file); setImagePreview(file ? URL.createObjectURL(file) : ""); }}/><span className="text-[11px] font-normal text-slate-400">PNG, JPEG, WEBP, or GIF up to 8 MB. Replaces the current image.</span></label></div>
    <label className="field">Image URL<input type="url" value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="https://… (optional)"/></label>
    <div className="flex items-center gap-3">{previewSrc ? <img src={previewSrc} alt="Product preview" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200"/> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-300"><ImageOff size={20}/></div>}<p className="text-xs text-slate-500">{imageFile ? `Selected: ${imageFile.name}` : previewSrc ? "Current image" : "No image yet"}</p>{(draft.imageUrl || imageFile) && <button type="button" onClick={() => { setImageFile(null); setImagePreview(""); setDraft({ ...draft, imageUrl: "" }); }} className="text-xs font-semibold text-rose-600">Remove</button>}</div>
    <label className="field sm:col-span-2">Description<textarea required minLength={10} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Product description (at least 10 characters)" rows={4}/></label>
    {formError && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 sm:col-span-2" role="alert">{formError}</p>}
    <button disabled={saving || priceInvalid} className="rounded-full bg-[#f7b32b] px-5 py-3 text-sm font-bold text-[#0b1736] disabled:opacity-60 sm:col-span-2">{uploading ? "Uploading photo…" : saving ? "Saving…" : product ? "Save changes" : "Save product"}</button>
  </form>;
}

export default function AdminProducts({ products, loading }: { products: AdminProduct[]; loading: boolean }) {
  const utils = trpc.useUtils();
  const confirm = useConfirm();
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
      {loading ? <EmptyState>Loading catalogue…</EmptyState> : !filtered.length ? <EmptyState>{products.length ? "No products match these filters." : "No database catalogue items yet."}</EmptyState> : <>
        <div className="hidden md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400"><tr><th className="py-3">Product</th><th>Category</th><th>Price</th><th>Status</th><th className="text-right">Actions</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id} className="border-b border-slate-100 align-middle"><td className="py-3"><div className="flex items-center gap-3"><ProductThumb product={product}/><div className="min-w-0"><p className="font-semibold">{product.name}</p><p className="truncate text-xs text-slate-400">/{product.slug}</p></div></div></td><td>{product.category}</td><td className="whitespace-nowrap">{formatNaira(product.priceKobo)}<span className="block text-xs text-slate-400">{product.unit}</span></td><td><StatusBadge status={product.isActive === 1 ? "active" : "inactive"} label={product.isActive === 1 ? "Active" : "Inactive"}/></td><td className="py-3"><div className="flex justify-end">{actions(product)}</div></td></tr>)}</tbody></table></div>
        <div className="space-y-3 md:hidden">{filtered.map((product) => <div key={product.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-start gap-3"><ProductThumb product={product}/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="font-semibold">{product.name}</p><StatusBadge status={product.isActive === 1 ? "active" : "inactive"} label={product.isActive === 1 ? "Active" : "Inactive"}/></div><p className="mt-1 text-xs text-slate-500">{product.category} · {formatNaira(product.priceKobo)} {product.unit}</p></div></div><div className="mt-3">{actions(product)}</div></div>)}</div>
      </>}
    </Panel>
  </>;
}
