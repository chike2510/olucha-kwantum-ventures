import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { EmptyState, Pager, Panel, StatusBadge, errorMessage, formatDate, type AdminContactMessage, type AdminInquiry } from "./ui";

const INQUIRY_STATUSES = ["new", "reviewing", "quoted", "closed"] as const;
type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
const PAGE_SIZE = 15;

function Inquiries({ inquiries, loading }: { inquiries: AdminInquiry[]; loading: boolean }) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<"all" | InquiryStatus>("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const updateStatus = trpc.admin.updateInquiryStatus.useMutation({
    onSuccess: (_, variables) => { toast.success(`Inquiry marked ${variables.status}`); utils.inquiries.adminList.invalidate(); },
    onError: (error) => toast.error(errorMessage(error, "Could not update the inquiry.")),
  });
  const filtered = useMemo(() => inquiries.filter((item) => status === "all" || item.status === status), [inquiries, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  return <Panel title="Export inquiries">
    <div className="mb-4 flex flex-wrap gap-2">{(["all", ...INQUIRY_STATUSES] as const).map((item) => <button key={item} type="button" onClick={() => { setStatus(item); setPage(1); }} className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${status === item ? "bg-[#0b1736] text-white" : "bg-slate-100 text-slate-600"}`}>{item}{item !== "all" && ` (${inquiries.filter((inquiry) => inquiry.status === item).length})`}</button>)}</div>
    {loading ? <EmptyState>Loading inquiries…</EmptyState> : !visible.length ? <EmptyState>{inquiries.length ? "No inquiries with this status." : "New export inquiries will appear here."}</EmptyState> : <div className="space-y-3">{visible.map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-semibold">{item.productInterest}</p><p className="mt-1 text-xs text-slate-500">{item.fullName} · {item.destinationCountry} · {item.quantity || "Quantity not specified"} · {formatDate(item.createdAt, true)}</p></div><div className="flex items-center gap-2"><StatusBadge status={item.status}/><select aria-label={`Update inquiry ${item.id} status`} value={item.status} disabled={updateStatus.isPending} onChange={(event) => updateStatus.mutate({ id: item.id, status: event.target.value as InquiryStatus })} className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold capitalize">{INQUIRY_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></div></div>
      <button type="button" onClick={() => setExpanded(expanded === item.id ? null : item.id)} className="mt-2 text-xs font-bold text-[#1f5b9f]">{expanded === item.id ? "Hide details" : "Show details"}</button>
      {expanded === item.id && <div className="mt-3 space-y-1.5 rounded-xl bg-white p-3 text-xs"><p><span className="text-slate-500">Email:</span> <a className="break-all text-[#1f5b9f]" href={`mailto:${item.email}`}>{item.email}</a></p><p><span className="text-slate-500">Phone:</span> {item.phone ? <a className="text-[#1f5b9f]" href={`tel:${item.phone}`}>{item.phone}</a> : "—"}</p>{item.message && <p className="whitespace-pre-line pt-1 text-slate-700">{item.message}</p>}</div>}
    </div>)}<Pager page={currentPage} pageCount={pageCount} total={filtered.length} onPage={setPage}/></div>}
  </Panel>;
}

function ContactInbox({ messages, loading }: { messages: AdminContactMessage[]; loading: boolean }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(messages.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = messages.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  return <Panel title="Contact messages">
    <p className="-mt-3 mb-4 text-sm text-slate-500">Messages sent from the storefront contact form. Reply by email.</p>
    {loading ? <EmptyState>Loading messages…</EmptyState> : !visible.length ? <EmptyState>No contact messages yet.</EmptyState> : <div className="space-y-3">{visible.map((message) => <div key={message.id} className="rounded-2xl bg-slate-50 p-4 text-sm"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-semibold">{message.fullName}</p><a href={`mailto:${message.email}`} className="break-all text-xs text-[#1f5b9f]">{message.email}</a></div><span className="text-xs text-slate-400">{formatDate(message.createdAt, true)}</span></div><p className="mt-2 whitespace-pre-line break-words text-slate-700">{message.message}</p></div>)}<Pager page={currentPage} pageCount={pageCount} total={messages.length} onPage={setPage}/></div>}
  </Panel>;
}

export default function AdminInquiries({ inquiries, inquiriesLoading, messages, messagesLoading }: { inquiries: AdminInquiry[]; inquiriesLoading: boolean; messages: AdminContactMessage[]; messagesLoading: boolean }) {
  return <div className="grid min-w-0 gap-5 xl:grid-cols-2"><Inquiries inquiries={inquiries} loading={inquiriesLoading}/><ContactInbox messages={messages} loading={messagesLoading}/></div>;
}
