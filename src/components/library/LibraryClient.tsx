"use client";

import {
  BookOpen,
  Clock3,
  Download,
  FilePlus2,
  Files,
  Library,
  Menu,
  Pencil,
  Search,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  createDocumentAction,
  deleteDocumentAction,
  updateDocumentAction,
} from "@/actions/documents";
import { importFileAction, inspectImportAction } from "@/actions/import-export";
import type { ImportInspection } from "@/services/portability";
import type { DocumentSummary } from "@/types";
import { useModalFocus } from "@/lib/use-modal-focus";

const navItems = [
  { label: "Library", icon: Library, href: "#library-top", active: true },
  { label: "全部文档", icon: Files, href: "#all-documents" },
  { label: "最近阅读", icon: Clock3, href: "#recent-documents" },
  { label: "标签", icon: Tags, href: "#library-tag-filter" },
];

function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-[var(--border)] bg-[var(--surface)] p-5 transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="mb-9 flex items-center justify-between">
        <Link href="/library" className="text-2xl font-bold tracking-tight">
          Alarkive
        </Link>
        <button
          className="ui-button icon ghost lg:hidden"
          onClick={onClose}
          aria-label="关闭导航"
        >
          <X size={20} />
        </button>
      </div>
      <nav className="space-y-1" aria-label="应用导航">
        {navItems.map(({ label, icon: Icon, href, active }) => (
          <a
            key={label}
            href={href}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "muted hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"}`}
            onClick={onClose}
          >
            <Icon size={18} />
            {label}
          </a>
        ))}
      </nav>
      <div className="absolute right-5 bottom-6 left-5 rounded-xl bg-[var(--surface-muted)] p-4 text-xs leading-5 text-[var(--text-muted)]">
        <p className="mb-1 font-semibold text-[var(--text)]">个人学习空间</p>
        文档仅保存在你的知识库中。V0.1 不连接外部 AI。
      </div>
    </aside>
  );
}

function DocumentCard({
  document,
  featured = false,
  onDelete,
  onEdit,
}: {
  document: DocumentSummary;
  featured?: boolean;
  onDelete: (document: DocumentSummary) => void;
  onEdit: (document: DocumentSummary) => void;
}) {
  return (
    <article
      className={`surface group flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)] ${featured ? "min-h-55" : "min-h-64"}`}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <BookOpen size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/documents/${document.id}/read`}
            className="leading-6 font-semibold hover:text-[var(--accent)]"
          >
            {document.title}
          </Link>
          <p className="muted mt-1 line-clamp-2 text-sm leading-6">
            {document.description}
          </p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {document.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--text-muted)]"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="muted mt-auto flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>{document.chapterCount} 个章节</span>
        <span>
          更新于{" "}
          {new Intl.DateTimeFormat("zh-CN", {
            month: "short",
            day: "numeric",
          }).format(new Date(document.updatedAt))}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="progress-track flex-1">
          <div
            className="progress-fill"
            style={{ width: `${document.progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold">{document.progress}%</span>
      </div>
      <div className="mt-4 flex gap-2 border-t border-[var(--border)] pt-4">
        <Link
          className="ui-button primary flex-1"
          href={`/documents/${document.id}/read`}
        >
          继续阅读
        </Link>
        <Link className="ui-button" href={`/documents/${document.id}/edit`}>
          编辑
        </Link>
        <button
          className="ui-button icon"
          onClick={() => onEdit(document)}
          aria-label={`修改${document.title}信息`}
          title="修改文档信息"
        >
          <Pencil size={16} />
        </button>
        <a
          className="ui-button icon"
          href={`/api/documents/${document.id}/export`}
          aria-label={`导出${document.title}`}
          title="导出文档"
        >
          <Download size={16} />
        </a>
        <button
          className="ui-button icon text-[var(--text-muted)] hover:text-[var(--danger)]"
          onClick={() => onDelete(document)}
          aria-label={`删除${document.title}`}
          title="删除文档"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

function CreateDocumentDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, description: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useModalFocus<HTMLDivElement>(onClose);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="surface w-full max-w-md p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 id="create-title" className="text-lg font-semibold">
              新建学习文档
            </h2>
            <p className="muted mt-1 text-sm">从一个清晰的主题开始。</p>
          </div>
          <button
            className="ui-button icon ghost"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={19} />
          </button>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim()) {
              setError(true);
              return;
            }
            setSubmitting(true);
            const created = await onCreate(title.trim(), description.trim());
            if (!created) setSubmitting(false);
          }}
        >
          <label className="mb-4 block text-sm font-medium">
            文档标题
            <input
              autoFocus
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError(false);
              }}
              placeholder="例如：概率论学习笔记"
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-[var(--accent)]"
            />
            {error && (
              <span className="mt-1 block text-xs text-[var(--danger)]">
                请输入文档标题
              </span>
            )}
          </label>
          <label className="block text-sm font-medium">
            简介
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="这份文档准备学习什么？"
              rows={4}
              className="mt-2 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button className="ui-button" type="button" onClick={onClose}>
              取消
            </button>
            <button
              className="ui-button primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "创建中…" : "创建文档"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportDocumentDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (document: DocumentSummary) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<ImportInspection | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useModalFocus<HTMLElement>(onClose);

  const inspect = async () => {
    if (!file) {
      setError("请选择 Markdown 或 Alarkive ZIP 文件");
      return;
    }
    setBusy(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await inspectImportAction(formData);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      setInspection(null);
      return;
    }
    setError("");
    setInspection(result.data);
  };

  const commit = async () => {
    if (!file || !inspection) return;
    setBusy(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await importFileAction(formData);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onImported(result.data);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
      role="presentation"
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="surface w-full max-w-lg p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="import-title" className="text-lg font-semibold">
              导入学习文档
            </h2>
            <p className="muted mt-1 text-sm">
              支持单个 Markdown 或 Alarkive 导出的 ZIP。
            </p>
          </div>
          <button
            className="ui-button icon ghost"
            onClick={onClose}
            aria-label="关闭导入"
          >
            <X size={18} />
          </button>
        </div>
        <label className="block text-sm font-medium">
          选择文件
          <input
            autoFocus
            className="mt-2 block w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm"
            type="file"
            accept=".md,.zip,text/markdown,application/zip"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setInspection(null);
              setError("");
            }}
          />
        </label>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {inspection && (
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <p className="text-xs font-semibold tracking-wider text-[var(--accent)] uppercase">
              导入检查通过
            </p>
            <h3 className="mt-1 font-semibold">{inspection.title}</h3>
            <p className="muted mt-1 text-sm">
              {inspection.chapterCount} 个章节 ·{" "}
              {inspection.kind === "markdown" ? "Markdown" : "Alarkive ZIP"}
            </p>
            {inspection.tags.length > 0 && (
              <p className="muted mt-2 text-xs">
                标签：{inspection.tags.join("、")}
              </p>
            )}
            <ul className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
              {inspection.warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button className="ui-button" onClick={onClose}>
            取消
          </button>
          {inspection ? (
            <button
              className="ui-button primary"
              disabled={busy}
              onClick={() => void commit()}
            >
              {busy ? "导入中…" : "确认导入"}
            </button>
          ) : (
            <button
              className="ui-button primary"
              disabled={busy || !file}
              onClick={() => void inspect()}
            >
              {busy ? "检查中…" : "检查文件"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function EditDocumentDialog({
  document,
  onClose,
  onUpdated,
}: {
  document: DocumentSummary;
  onClose: () => void;
  onUpdated: (document: DocumentSummary) => void;
}) {
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description);
  const [tags, setTags] = useState(document.tags.join("，"));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useModalFocus<HTMLElement>(onClose);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("文档标题不能为空");
      return;
    }
    setBusy(true);
    const result = await updateDocumentAction(document.id, {
      title,
      description,
      tags: tags
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUpdated(result.data);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="surface w-full max-w-md p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-document-title"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="edit-document-title" className="text-lg font-semibold">
              修改文档信息
            </h2>
            <p className="muted mt-1 text-sm">
              标题、简介和标签会立即用于 Library 搜索。
            </p>
          </div>
          <button
            className="ui-button icon ghost"
            onClick={onClose}
            aria-label="关闭修改文档"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">
            标题
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium">
            简介
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            />
          </label>
          <label className="block text-sm font-medium">
            标签<span className="muted ml-2 text-xs">使用逗号分隔</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="机器学习，论文"
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="ui-button" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="ui-button primary" disabled={busy}>
              {busy ? "保存中…" : "保存修改"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

type SortOption = "updated" | "lastRead" | "title" | "progress";

export function LibraryClient({
  initialDocuments,
  initialError,
}: {
  initialDocuments: DocumentSummary[];
  initialError?: string;
}) {
  const [items, setItems] = useState(initialDocuments);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<DocumentSummary | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  const [sort, setSort] = useState<SortOption>("updated");
  const [operationError, setOperationError] = useState(initialError ?? "");
  useEffect(() => setItems(initialDocuments), [initialDocuments]);
  const allTags = useMemo(
    () => [...new Set(items.flatMap((item) => item.tags))].sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    const matches = items.filter(
      (item) =>
        (!selectedTag || item.tags.includes(selectedTag)) &&
        (!value ||
          [
            item.title,
            item.description,
            ...item.tags,
            ...(item.chapterTitles ?? []),
          ].some((field) => field.toLowerCase().includes(value))),
    );
    return matches.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "zh-CN");
      if (sort === "progress") return b.progress - a.progress;
      if (sort === "lastRead")
        return (b.lastReadAt ?? "").localeCompare(a.lastReadAt ?? "");
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [items, query, selectedTag, sort]);
  const recent = [...items]
    .filter((item) => item.lastReadAt)
    .sort((a, b) => (b.lastReadAt ?? "").localeCompare(a.lastReadAt ?? ""))
    .slice(0, 2);
  const emptyLibrary = !query && !selectedTag && items.length === 0;
  const create = async (title: string, description: string) => {
    const result = await createDocumentAction(title, description);
    if (!result.ok) {
      setOperationError(result.error);
      return false;
    }
    setItems((current) => [result.data, ...current]);
    setOperationError("");
    setDialogOpen(false);
    return true;
  };
  const remove = async (document: DocumentSummary) => {
    if (!window.confirm(`确定删除“${document.title}”及其全部章节吗？`)) return;
    const result = await deleteDocumentAction(document.id);
    if (!result.ok) {
      setOperationError(result.error);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== document.id));
    setOperationError("");
  };

  return (
    <div id="library-top" className="flex min-h-screen">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="关闭导航遮罩"
        />
      )}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color:var(--background)]/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <button
              className="ui-button icon lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="打开导航"
            >
              <Menu size={19} />
            </button>
            <div className="relative max-w-xl flex-1">
              <Search
                className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
                size={18}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、简介、标签或章节…"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pr-10 pl-10 outline-none focus:border-[var(--accent)]"
              />
              {query && (
                <button
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--text-muted)]"
                  onClick={() => setQuery("")}
                  aria-label="清除搜索"
                >
                  <X size={17} />
                </button>
              )}
            </div>
            <a
              className="ui-button hidden sm:inline-flex"
              href="#recent-documents"
            >
              <Clock3 size={17} />
              最近阅读
            </a>
            <button className="ui-button" onClick={() => setImportOpen(true)}>
              <Upload size={17} />
              <span className="hidden sm:inline">导入</span>
            </button>
            <button
              className="ui-button primary"
              onClick={() => setDialogOpen(true)}
            >
              <FilePlus2 size={17} />
              <span className="hidden sm:inline">新建文档</span>
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
          {operationError && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{operationError}</span>
              <button
                onClick={() => setOperationError("")}
                aria-label="关闭错误提示"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="mb-9">
            <p className="muted mb-2 text-sm font-medium">你的个人学习空间</p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              继续让知识生长
            </h1>
            <p className="muted mt-3 max-w-2xl leading-7">
              整理从外部 AI 获得的材料，把零散内容变成可以反复阅读的个人教材。
            </p>
          </div>
          {!query && recent.length > 0 && (
            <section id="recent-documents" className="mb-10 scroll-mt-24">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-[var(--accent)] uppercase">
                    Continue learning
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">最近学习</h2>
                </div>
                <span className="muted text-sm">从上次离开的地方继续</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {recent.map((item) => (
                  <DocumentCard
                    key={item.id}
                    document={item}
                    featured
                    onDelete={remove}
                    onEdit={setEditingDocument}
                  />
                ))}
              </div>
            </section>
          )}
          <section id="all-documents" className="scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-widest text-[var(--accent)] uppercase">
                  Your library
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {query
                    ? `“${query}”的搜索结果`
                    : selectedTag
                      ? `标签：${selectedTag}`
                      : "全部文档"}
                </h2>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <label className="sr-only" htmlFor="library-tag-filter">
                  按标签筛选
                </label>
                <select
                  id="library-tag-filter"
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  value={selectedTag}
                  onChange={(event) => setSelectedTag(event.target.value)}
                >
                  <option value="">全部标签</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="library-sort">
                  文档排序
                </label>
                <select
                  id="library-sort"
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as SortOption)
                  }
                >
                  <option value="updated">最近修改</option>
                  <option value="lastRead">最近阅读</option>
                  <option value="title">标题</option>
                  <option value="progress">阅读进度</option>
                </select>
                <span className="muted text-sm">{filtered.length} 份文档</span>
              </div>
            </div>
            {filtered.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => (
                  <DocumentCard
                    key={item.id}
                    document={item}
                    onDelete={remove}
                    onEdit={setEditingDocument}
                  />
                ))}
              </div>
            ) : (
              <div className="surface grid min-h-64 place-items-center px-6 text-center">
                <div>
                  <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[var(--surface-muted)]">
                    <Search size={21} />
                  </div>
                  <h3 className="font-semibold">
                    {emptyLibrary ? "知识库还是空的" : "没有找到匹配的文档"}
                  </h3>
                  <p className="muted mt-2 text-sm">
                    {emptyLibrary
                      ? "创建第一份学习文档开始整理。"
                      : "换个关键词，或创建一份新的学习文档。"}
                  </p>
                  <div className="mt-5 flex justify-center gap-2">
                    {!emptyLibrary && (
                      <button
                        className="ui-button"
                        onClick={() => {
                          setQuery("");
                          setSelectedTag("");
                        }}
                      >
                        清除筛选
                      </button>
                    )}
                    <button
                      className="ui-button primary"
                      onClick={() => setDialogOpen(true)}
                    >
                      新建文档
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      {dialogOpen && (
        <CreateDocumentDialog
          onClose={() => setDialogOpen(false)}
          onCreate={create}
        />
      )}
      {importOpen && (
        <ImportDocumentDialog
          onClose={() => setImportOpen(false)}
          onImported={(document) => {
            setItems((current) => [document, ...current]);
            setImportOpen(false);
            setOperationError("");
          }}
        />
      )}
      {editingDocument && (
        <EditDocumentDialog
          document={editingDocument}
          onClose={() => setEditingDocument(null)}
          onUpdated={(document) => {
            setItems((current) =>
              current.map((item) =>
                item.id === document.id ? document : item,
              ),
            );
            setEditingDocument(null);
            setOperationError("");
          }}
        />
      )}
    </div>
  );
}
