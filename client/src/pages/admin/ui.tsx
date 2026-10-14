import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { formatNairaAmount } from "@/lib/money";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type AdminProduct = RouterOutputs["admin"]["products"][number];
export type AdminOrder = RouterOutputs["admin"]["orders"][number];
export type AdminInquiry = RouterOutputs["inquiries"]["adminList"][number];
export type AdminContactMessage = RouterOutputs["admin"]["contactMessages"][number];
export type AdminBlogPost = RouterOutputs["admin"]["blogPosts"][number];

export type AdminSection = "overview" | "products" | "orders" | "inquiries" | "content";

export const PRODUCT_CATEGORIES = ["Electronics", "Fashion", "Agro Products"] as const;

export const formatNaira = (kobo: number) => formatNairaAmount(kobo / 100);

export const formatDate = (value: Date | string | null | undefined, withTime = false) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-NG", withTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" });
};

export const slugify = (value: string) => value
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 200);

export const errorMessage = (error: unknown, fallback = "Something went wrong. Please try again.") => {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    const message = (error as { message: string }).message;
    // zod errors from tRPC arrive as a JSON array string; show the first readable message.
    if (message.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(message) as Array<{ message?: string }>;
        if (parsed[0]?.message) return parsed[0].message;
      } catch { /* fall through */ }
    }
    return message || fallback;
  }
  return fallback;
};

const statusTones: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  processing: "bg-sky-100 text-sky-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-teal-100 text-teal-700",
  cancelled: "bg-rose-100 text-rose-700",
  new: "bg-amber-100 text-amber-700",
  reviewing: "bg-sky-100 text-sky-700",
  quoted: "bg-indigo-100 text-indigo-700",
  closed: "bg-slate-200 text-slate-600",
  draft: "bg-slate-200 text-slate-600",
  published: "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold capitalize ${statusTones[status] ?? "bg-slate-100 text-slate-600"}`}>{label ?? status}</span>;
}

export function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-4 break-words text-3xl font-semibold tracking-[-.04em] text-[#0b1736]">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></div>;
}

export function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return <div className="min-w-0 rounded-3xl bg-white p-4 shadow-sm sm:p-6"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{title}</h2>{action && <button type="button" onClick={onAction} className="inline-flex items-center gap-2 rounded-full bg-[#0b1736] px-4 py-2 text-xs font-bold text-white"><Plus size={14}/>{action}</button>}</div>{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">{children}</div>;
}

export function Pager({ page, pageCount, total, onPage }: { page: number; pageCount: number; total: number; onPage: (page: number) => void }) {
  if (pageCount <= 1) return <p className="pt-4 text-xs text-slate-400">{total} {total === 1 ? "record" : "records"}</p>;
  return <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-xs text-slate-500"><span>{total} records · page {page} of {pageCount}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="min-h-10 rounded-full border border-slate-200 px-4 font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)} className="min-h-10 rounded-full border border-slate-200 px-4 font-semibold disabled:opacity-40">Next</button></div></div>;
}

// ---- Confirmation dialog -------------------------------------------------

type ConfirmOptions = { title: string; description?: ReactNode; confirmLabel?: string; destructive?: boolean };
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const confirm = useCallback<ConfirmFn>((next) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOptions(next);
  }), []);
  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };
  return <ConfirmContext.Provider value={confirm}>{children}<AlertDialog open={!!options} onOpenChange={(open) => { if (!open) settle(false); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{options?.title}</AlertDialogTitle>{options?.description && <AlertDialogDescription asChild><div>{options.description}</div></AlertDialogDescription>}</AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => settle(false)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => settle(true)} className={options?.destructive ? "bg-rose-600 text-white hover:bg-rose-700" : undefined}>{options?.confirmLabel ?? "Confirm"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></ConfirmContext.Provider>;
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider");
  return confirm;
}

// ---- CSV -----------------------------------------------------------------

export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const escape = (value: string | number | null | undefined) => {
    let text = value === null || value === undefined ? "" : String(value);
    // Neutralise spreadsheet formula injection.
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image"));
  reader.onerror = () => reject(new Error("Could not read image"));
  reader.readAsDataURL(file);
});

export async function uploadProductImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) throw new Error("Choose a PNG, JPEG, WEBP, or GIF image smaller than 8 MB.");
  const dataUrl = await readFileAsDataUrl(file);
  const response = await fetch("/api/admin/product-image", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ dataUrl }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body.url !== "string") throw new Error(body.error || "Image upload failed");
  return body.url;
}
