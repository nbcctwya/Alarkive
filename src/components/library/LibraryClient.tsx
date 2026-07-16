"use client";

import { Clock3, FilePlus2, Menu, Search, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createDocumentAction,
  deleteDocumentAction,
} from "@/actions/documents";
import { AppSidebar } from "@/components/library/AppSidebar";
import { DocumentCard } from "@/components/library/DocumentCard";
import {
  CreateDocumentDialog,
  EditDocumentDialog,
  ImportDocumentDialog,
} from "@/components/library/LibraryDialogs";
import type { DocumentSummary } from "@/types/documents";

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
