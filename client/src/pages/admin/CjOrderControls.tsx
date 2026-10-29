import { RefreshCw, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { errorMessage, useConfirm, type AdminOrder } from "./ui";

export default function CjOrderControls({ order }: { order: AdminOrder }) {
  const utils = trpc.useUtils();
  const confirm = useConfirm();
  const status = trpc.admin.cjSyncStatus.useQuery();
  const canOperate = Boolean(status.data?.autoOrderEnabled);
  const canTrack = Boolean(status.data?.configured && order.cjOrderId);
  const reconcile = trpc.admin.reconcileCjOrder.useMutation({
    onSuccess: (result) => {
      if (result.outcome === "reconciled") toast.success("CJ order matched to this order");
      else if (result.outcome === "not-found") toast.info("No matching CJ order was found. No new supplier order was created.");
      else if (result.outcome === "mismatch") toast.error("CJ returned a different order. No tracking details for this store order were changed.");
      else toast.error("CJ order could not be checked. No new order was created.");
      utils.admin.orders.invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not check the CJ order.")),
  });
  const retry = trpc.admin.retryCjOrder.useMutation({
    onSuccess: (result) => {
      if (result.outcome === "created_unpaid") toast.success("Supplier order created; payment was not sent");
      else if (result.outcome === "reconciled") toast.success("An existing CJ order was found; no duplicate was created");
      else toast.error(result.message || "No supplier order was submitted. Check the existing CJ order before trying again.");
      utils.admin.orders.invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "CJ order retry failed.")),
  });
  const tracking = trpc.admin.syncCjTracking.useMutation({
    onSuccess: (result) => { toast.success(result.trackingNumber ? "CJ tracking refreshed" : "CJ order refreshed; tracking number is not available yet"); utils.admin.orders.invalidate(); },
    onError: (error) => toast.error(errorMessage(error, "CJ tracking refresh failed.")),
  });

  const requestRetry = async () => {
    const ok = await confirm({
      title: `Retry blocked CJ order for #${order.id}?`,
      description: "This retry is available only when the order was stopped before a supplier order request was sent. We will first check for an existing CJ order. Continue only after confirming in CJ that no matching supplier order exists. A retry creates an unpaid CJ order and never sends payment to CJ.",
      confirmLabel: "I verified no matching CJ order",
      destructive: true,
    });
    if (ok) retry.mutate({ orderId: order.id, confirmedNoMatchingOrder: true });
  };

  if (!order.cjSubmissionStatus && !order.cjOrderId && !order.cjOrderNumber) return null;
  const statusLabel = order.cjSubmissionStatus?.replaceAll("_", " ") ?? "not submitted";
  return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">CJ supplier order</h3><span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold capitalize text-slate-700">{statusLabel}</span></div>
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs"><dt className="text-slate-500">Store order reference</dt><dd className="break-all font-mono">{order.cjOrderNumber || "—"}</dd>{order.cjOrderCode && <><dt className="text-slate-500">CJ order</dt><dd className="break-all font-mono">{order.cjOrderCode}</dd></>}{order.cjOrderStatus && <><dt className="text-slate-500">CJ status</dt><dd>{order.cjOrderStatus}</dd></>}{order.trackingNumber && <><dt className="text-slate-500">Tracking number</dt><dd className="break-all font-mono">{order.trackingNumber}</dd></>}{order.trackingStatus && <><dt className="text-slate-500">Tracking status</dt><dd>{order.trackingStatus}</dd></>}{order.trackingProvider && <><dt className="text-slate-500">Carrier</dt><dd>{order.trackingProvider}</dd></>}</dl>
    {order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#1f5b9f]">Open carrier tracking</a>}
    {order.cjSubmissionError && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{order.cjSubmissionError}</p>}
    {order.verifiedPaymentMode === "test" && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">Test payments are not eligible for supplier order submission.</p>}
    {!canOperate && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Automatic supplier orders and retries are disabled on this site.</p>}
    <div className="mt-3 flex flex-wrap gap-2">{canOperate && order.cjSubmissionStatus !== "created_unpaid" && <button type="button" disabled={reconcile.isPending} onClick={() => reconcile.mutate({ orderId: order.id })} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"><Search size={13}/>{reconcile.isPending ? "Checking…" : "Check CJ order"}</button>}{canOperate && order.cjSubmissionStatus === "blocked" && <button type="button" disabled={retry.isPending} onClick={() => void requestRetry()} className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"><RotateCcw size={13}/>{retry.isPending ? "Retrying…" : "Retry after checking"}</button>}{canTrack && <button type="button" disabled={tracking.isPending} onClick={() => tracking.mutate({ orderId: order.id })} className="inline-flex items-center gap-1 rounded-full bg-[#0b1736] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><RefreshCw size={13} className={tracking.isPending ? "animate-spin" : ""}/>{tracking.isPending ? "Refreshing…" : "Refresh tracking"}</button>}</div>
  </section>;
}
