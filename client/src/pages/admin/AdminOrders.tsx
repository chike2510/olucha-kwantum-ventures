import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildManualHandoffPayload, isManualHandoffEligible } from "@/lib/manualHandoff";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { allowedManualTransitions, ORDER_STATUSES, type OrderStatus } from "@shared/orderStatus";
import { EmptyState, Pager, Panel, StatusBadge, downloadCsv, errorMessage, formatDate, formatNaira, useConfirm, type AdminOrder } from "./ui";
import CjOrderControls from "./CjOrderControls";

const PAGE_SIZE = 20;
const statusLabels: Record<OrderStatus, string> = { pending: "Pending payment", paid: "Paid", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };

function downloadManualHandoff(order: AdminOrder) {
  const payload = buildManualHandoffPayload(order);
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `olucha-preview-order-${order.id}-manual-review.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success("Manual review draft downloaded");
}

function StatusControl({ order, compact = false }: { order: AdminOrder; compact?: boolean }) {
  const utils = trpc.useUtils();
  const confirm = useConfirm();
  const update = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: (result) => { toast.success(`Order #${order.id} marked ${result.status}`); utils.admin.orders.invalidate(); },
    onError: (error) => toast.error(errorMessage(error, "Could not update the order status.")),
  });
  const next = allowedManualTransitions(order.status);
  if (!next.length) return <StatusBadge status={order.status}/>;
  const change = async (status: OrderStatus) => {
    const cancelling = status === "cancelled";
    const ok = await confirm({
      title: cancelling ? `Cancel order #${order.id}?` : `Mark order #${order.id} as ${status}?`,
      description: cancelling
        ? order.status === "pending" ? "This unpaid order will be closed. This cannot be undone from the admin console." : "This order has been paid. Cancelling does not refund the customer automatically — issue any refund in Paystack. This cannot be undone from the admin console."
        : `The order moves from ${order.status} to ${status}.`,
      confirmLabel: cancelling ? "Cancel order" : `Mark ${status}`,
      destructive: cancelling,
    });
    if (ok) update.mutate({ id: order.id, status });
  };
  return <select aria-label={`Update order ${order.id} status`} value="" disabled={update.isPending} onClick={(event) => event.stopPropagation()} onChange={(event) => { const value = event.target.value as OrderStatus; if (value) void change(value); }} className={`rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold ${compact ? "" : "w-full sm:w-auto"}`}>
    <option value="">{update.isPending ? "Updating…" : `${statusLabels[order.status]} — change…`}</option>
    {next.map((status) => <option key={status} value={status}>{status === "cancelled" ? "Cancel order" : `Mark ${status}`}</option>)}
  </select>;
}

function OrderDetail({ order, onClose }: { order: AdminOrder | null; onClose: () => void }) {
  return <Sheet open={!!order} onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
      {order && <>
        <SheetHeader><SheetTitle>Order #{order.id}</SheetTitle><SheetDescription>Placed {formatDate(order.createdAt, true)}</SheetDescription></SheetHeader>
        <div className="space-y-5 px-4 pb-8 text-sm">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge status={order.status}/><StatusControl order={order} compact/>{isManualHandoffEligible(order) && <button type="button" onClick={() => downloadManualHandoff(order)} className="inline-flex items-center gap-1 rounded-full bg-[#0b1736] px-3 py-1.5 text-xs font-bold text-white"><Download size={13}/>Download manual review</button>}</div>
          {isManualHandoffEligible(order) && <p className="rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-800">Payment was verified server-side. This review/download draft is for administrator handoff only; it does not create a CJ order or authorize supplier payment.</p>}
          {order.status === "pending" && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Payment has not been verified. Pending orders move to paid automatically when Paystack confirms payment; they can only be cancelled by hand.</p>}
          <CjOrderControls order={order}/>
          <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Customer</h3><dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5"><dt className="text-slate-500">Name</dt><dd className="font-semibold">{order.customerName}</dd><dt className="text-slate-500">Email</dt><dd className="break-all"><a href={`mailto:${order.customerEmail}`} className="text-[#1f5b9f]">{order.customerEmail}</a></dd><dt className="text-slate-500">Phone</dt><dd>{order.customerPhone ? <a href={`tel:${order.customerPhone}`} className="text-[#1f5b9f]">{order.customerPhone}</a> : "—"}</dd></dl></section>
          <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Delivery</h3><p>{order.deliveryAddress || "—"}</p>{order.deliveryAddress2 && <p>{order.deliveryAddress2}</p>}<p>{[order.deliveryCity, order.deliveryRegion, order.deliveryPostalCode].filter(Boolean).join(", ")}</p><p className="mt-1 font-semibold">{order.deliveryCountry || "—"}</p></section>
          <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Items</h3>{order.items.length ? <div className="divide-y divide-slate-100 rounded-2xl bg-slate-50">{order.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 p-3"><div className="min-w-0"><p className="font-semibold">{item.productName}</p><p className="text-xs text-slate-500">{item.quantity} × {formatNaira(item.unitPriceKobo)}{item.variant && (item.variant.size || item.variant.color) ? ` · ${[item.variant.size, item.variant.color].filter(Boolean).join(" / ")}` : ""}</p></div><p className="whitespace-nowrap font-semibold">{formatNaira(item.quantity * item.unitPriceKobo)}</p></div>)}</div> : <p className="text-slate-500">No line items recorded.</p>}<div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-semibold"><span>Total</span><span>{formatNaira(order.totalKobo)}</span></div></section>
          <section><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Payment</h3><dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5"><dt className="text-slate-500">Paystack ref</dt><dd className="break-all font-mono text-xs">{order.paystackReference || "—"}</dd><dt className="text-slate-500">Currency</dt><dd>{order.currency}</dd><dt className="text-slate-500">Verified mode</dt><dd className="capitalize">{order.verifiedPaymentMode || "not recorded"}</dd></dl></section>
        </div>
      </>}
    </SheetContent>
  </Sheet>;
}

export default function AdminOrders({ orders, loading, error }: { orders: AdminOrder[]; loading: boolean; error: boolean }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase().replace(/^#/, "");
    return orders.filter((order) => (status === "all" || order.status === status) && (!query
      || String(order.id) === query
      || order.customerName.toLowerCase().includes(query)
      || order.customerEmail.toLowerCase().includes(query)
      || (order.paystackReference ?? "").toLowerCase().includes(query)));
  }, [orders, search, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [search, status]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = orders.find((order) => order.id === selectedId) ?? null;

  const exportCsv = () => {
    downloadCsv(`okv-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Order ID", "Created", "Status", "Customer", "Email", "Phone", "Country", "Address", "Items", "Total (NGN)", "Paystack reference"],
      ...filtered.map((order) => [
        order.id,
        new Date(order.createdAt).toISOString(),
        order.status,
        order.customerName,
        order.customerEmail,
        order.customerPhone,
        order.deliveryCountry,
        order.deliveryAddress,
        order.items.map((item) => `${item.quantity} x ${item.productName}`).join("; "),
        (order.totalKobo / 100).toFixed(2),
        order.paystackReference,
      ]),
    ]);
    toast.success(`Exported ${filtered.length} ${filtered.length === 1 ? "order" : "orders"}`);
  };

  return <Panel title="Orders">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, reference or #id" aria-label="Search orders" className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"/>
      <select aria-label="Filter orders by status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#1f5b9f]"><option value="all">All statuses</option>{ORDER_STATUSES.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select>
      <button type="button" disabled={!filtered.length} onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"><Download size={14}/>Export CSV</button>
    </div>
    {loading ? <EmptyState>Loading orders…</EmptyState> : error ? <EmptyState>Orders are temporarily unavailable. Reload the page to retry.</EmptyState> : !visible.length ? <EmptyState>{orders.length ? "No orders match these filters." : "No customer orders yet."}</EmptyState> : <>
      <div className="hidden md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400"><tr><th className="py-3">Order</th><th>Date</th><th>Customer</th><th className="text-right">Total</th><th className="pl-4">Status</th><th></th></tr></thead><tbody>{visible.map((order) => <tr key={order.id} onClick={() => setSelectedId(order.id)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"><td className="py-3 font-semibold">#{order.id}<span className="block max-w-[10rem] truncate font-mono text-[11px] font-normal text-slate-400">{order.paystackReference || "no reference"}</span></td><td className="whitespace-nowrap text-slate-600">{formatDate(order.createdAt, true)}</td><td><p className="font-semibold">{order.customerName}</p><p className="max-w-[14rem] truncate text-xs text-slate-400">{order.customerEmail}</p></td><td className="whitespace-nowrap text-right font-semibold text-[#1f5b9f]">{formatNaira(order.totalKobo)}</td><td className="pl-4"><StatusBadge status={order.status}/></td><td className="py-3 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(order.id); }} className="min-h-10 rounded-full border border-slate-200 px-4 text-xs font-bold text-[#1f5b9f]">View</button></td></tr>)}</tbody></table></div>
      <div className="space-y-3 md:hidden">{visible.map((order) => <button type="button" key={order.id} onClick={() => setSelectedId(order.id)} className="block w-full rounded-2xl bg-slate-50 p-4 text-left"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-semibold">#{order.id} · {order.customerName}</p><p className="truncate text-xs text-slate-500">{order.customerEmail}</p></div><StatusBadge status={order.status}/></div><div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>{formatDate(order.createdAt, true)}</span><span className="text-sm font-semibold text-[#1f5b9f]">{formatNaira(order.totalKobo)}</span></div></button>)}</div>
      <Pager page={page} pageCount={pageCount} total={filtered.length} onPage={setPage}/>
    </>}
    <OrderDetail order={selected} onClose={() => setSelectedId(null)}/>
  </Panel>;
}
