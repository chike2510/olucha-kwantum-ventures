import { useState, type FormEvent } from "react";
import { Eye, Newspaper, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Panel, StatusBadge, errorMessage, formatDate, slugify, useConfirm, type AdminBlogPost } from "./ui";

type ArticleDraft = { title: string; slug: string; excerpt: string; content: string; status: "draft" | "published" };
const emptyArticle: ArticleDraft = { title: "", slug: "", excerpt: "", content: "", status: "draft" };

function ArticlePreview({ article, onClose }: { article: (ArticleDraft & { publishedAt?: Date | null }) | null; onClose: () => void }) {
  return <Sheet open={!!article} onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
      {article && <>
        <SheetHeader><SheetTitle>Preview</SheetTitle><SheetDescription>How the article reads at /news/{article.slug || "…"}{article.status === "draft" ? " (draft — not public)" : ""}</SheetDescription></SheetHeader>
        <article className="px-4 pb-10">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#cfa43a]">Olucha guide</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-[#0b1736]">{article.title || "Untitled article"}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{article.excerpt}</p>
          {article.publishedAt && <p className="mt-2 text-xs text-slate-400">Published {formatDate(article.publishedAt)}</p>}
          <div className="mt-6 space-y-4 leading-7 text-slate-700">{article.content.split(/\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        </article>
      </>}
    </SheetContent>
  </Sheet>;
}

export default function AdminContent({ posts, loading, error }: { posts: AdminBlogPost[]; loading: boolean; error: boolean }) {
  const utils = trpc.useUtils();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<ArticleDraft>(emptyArticle);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [preview, setPreview] = useState<(ArticleDraft & { publishedAt?: Date | null }) | null>(null);
  const reset = () => { setShowForm(false); setEditingId(null); setSlugTouched(false); setDraft(emptyArticle); };
  const refresh = () => utils.admin.blogPosts.invalidate();
  const onError = (fallback: string) => (error: unknown) => toast.error(errorMessage(error, fallback));
  const createPost = trpc.admin.createBlogPost.useMutation({ onSuccess: () => { toast.success("Article saved"); reset(); refresh(); }, onError: onError("The article could not be saved.") });
  const updatePost = trpc.admin.updateBlogPost.useMutation({ onSuccess: () => { toast.success("Article updated"); reset(); refresh(); }, onError: onError("The article could not be updated.") });
  const setStatus = trpc.admin.updateBlogPost.useMutation({ onSuccess: (_, variables) => { toast.success(variables.status === "published" ? "Article published" : "Article unpublished"); refresh(); }, onError: onError("Could not change the article status.") });
  const deletePost = trpc.admin.deleteBlogPost.useMutation({ onSuccess: () => { toast.success("Article deleted"); refresh(); }, onError: onError("The article could not be deleted.") });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = { ...draft, slug: slugify(draft.slug || draft.title) };
    if (editingId) updatePost.mutate({ id: editingId, ...values });
    else createPost.mutate(values);
  };
  const edit = (post: AdminBlogPost) => { setEditingId(post.id); setSlugTouched(true); setDraft({ title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, status: post.status }); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const remove = async (post: AdminBlogPost) => {
    const ok = await confirm({ title: `Delete “${post.title}”?`, description: post.status === "published" ? "This article is live. Deleting it removes it from the site permanently and its link will stop working." : "This draft will be removed permanently.", confirmLabel: "Delete article", destructive: true });
    if (ok) { deletePost.mutate({ id: post.id }); if (editingId === post.id) reset(); }
  };
  const toggleStatus = async (post: AdminBlogPost) => {
    if (post.status === "published") {
      const ok = await confirm({ title: `Unpublish “${post.title}”?`, description: "It will be hidden from the news page and saved as a draft.", confirmLabel: "Unpublish" });
      if (!ok) return;
      setStatus.mutate({ id: post.id, status: "draft" });
    } else setStatus.mutate({ id: post.id, status: "published" });
  };
  const saving = createPost.isPending || updatePost.isPending;

  return <>
    <div className="mb-5 flex justify-end"><button type="button" onClick={() => showForm ? reset() : setShowForm(true)} className="inline-flex items-center gap-2 rounded-full bg-[#0b1736] px-4 py-2 text-xs font-bold text-white"><Plus size={14}/>{showForm ? "Close form" : "New article"}</button></div>
    {showForm && <form onSubmit={submit} className="mb-5 grid gap-4 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{editingId ? "Edit article" : "New article"}</h3><button type="button" onClick={reset} aria-label="Close form" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div>
      <label className="field">Title<input required minLength={4} maxLength={220} value={draft.title} onChange={(event) => { const title = event.target.value; setDraft((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) })); }} placeholder="Article title"/></label>
      <label className="field">Slug<input required pattern="[a-z0-9-]+" maxLength={240} value={draft.slug} onChange={(event) => { setSlugTouched(true); setDraft({ ...draft, slug: event.target.value.toLowerCase() }); }} placeholder="article-slug"/></label>
      <label className="field">Excerpt<input required minLength={10} value={draft.excerpt} onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })} placeholder="Short excerpt (at least 10 characters)"/></label>
      <label className="field">Content<textarea required minLength={20} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="Article content. Separate paragraphs with a blank line." rows={8}/></label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.status === "published"} onChange={(event) => setDraft({ ...draft, status: event.target.checked ? "published" : "draft" })}/> Published</label><div className="flex gap-2"><button type="button" onClick={() => setPreview(draft)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"><Eye size={14}/>Preview</button><button disabled={saving} className="rounded-full bg-[#f7b32b] px-5 py-3 text-sm font-bold text-[#0b1736] disabled:opacity-60">{saving ? "Saving…" : editingId ? "Update article" : "Save article"}</button></div></div>
    </form>}
    <Panel title="Blog & news"><div className="space-y-3">
      {posts.map((post) => <div key={post.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{post.title}</p><StatusBadge status={post.status}/></div><p className="mt-1 truncate text-xs text-slate-500">/news/{post.slug} · {post.status === "published" ? `published ${formatDate(post.publishedAt)}` : `updated ${formatDate(post.updatedAt)}`}</p></div><div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPreview({ title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, status: post.status, publishedAt: post.publishedAt })} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-700"><Eye size={12}/>Preview</button>
        <button type="button" onClick={() => edit(post)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold text-[#1f5b9f]"><Pencil size={12}/>Edit</button>
        <button type="button" disabled={setStatus.isPending} onClick={() => toggleStatus(post)} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-700">{post.status === "published" ? "Unpublish" : "Publish"}</button>
        <button type="button" disabled={deletePost.isPending} onClick={() => remove(post)} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><Trash2 size={12}/>Delete</button>
      </div></div>)}
      {loading ? <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Loading articles…</div> : error ? <div className="rounded-2xl bg-rose-50 p-8 text-center text-sm text-rose-700">Articles are temporarily unavailable. Reload the page to retry.</div> : !posts.length && <div className="rounded-2xl bg-slate-50 p-8 text-center"><Newspaper className="mx-auto mb-3 text-slate-300" size={34}/><p className="font-semibold">Your editorial workspace</p><p className="mt-2 text-sm text-slate-500">Draft and publish company news, product guides, and product stories from this area.</p></div>}
      {!loading && !error && <div className="flex justify-center gap-3 pt-3 text-xs font-bold"><span className="rounded-full bg-white px-3 py-2 text-slate-600">{posts.filter((post) => post.status === "draft").length} drafts</span><span className="rounded-full bg-emerald-100 px-3 py-2 text-emerald-700">{posts.filter((post) => post.status === "published").length} published</span></div>}
    </div></Panel>
    <ArticlePreview article={preview} onClose={() => setPreview(null)}/>
  </>;
}
