"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Eye,
  Download,
  FileText,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Link2,
  List,
  Menu,
  Minus,
  PanelLeftClose,
  Pencil,
  Plus,
  Quote,
  Save,
  Sigma,
  Table2,
  Trash2,
  Upload,
  RotateCcw,
  WandSparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { ChapterContent, ChapterNode, DocumentSummary } from "@/types";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import {
  createChapterAction,
  deleteChapterAction,
  reorderChapterAction,
  updateChapterAction,
} from "@/actions/chapters";
import { updateDocumentAction } from "@/actions/documents";
import { importMarkdownChapterAction } from "@/actions/import-export";
import {
  deleteDocumentAssetAction,
  listDocumentAssetsAction,
  uploadDocumentImageAction,
} from "@/actions/assets";
import type { DocumentAsset } from "@/services/assets";
import { useModalFocus } from "@/lib/use-modal-focus";
import { SerialTaskQueue } from "@/lib/serial-task-queue";
import {
  formatMarkdownSafely,
  type MarkdownFormatResult,
} from "@/lib/markdown";

type SaveState = "saved" | "saving" | "dirty" | "failed";

function flattenTree(nodes: ChapterNode[]): ChapterNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

function removeNode(nodes: ChapterNode[], id: string): ChapterNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNode(node.children, id) }));
}

function appendChild(
  nodes: ChapterNode[],
  parentId: string,
  child: ChapterNode,
): ChapterNode[] {
  return nodes.map((node) =>
    node.id === parentId
      ? { ...node, children: [...node.children, child] }
      : { ...node, children: appendChild(node.children, parentId, child) },
  );
}

function moveNode(
  nodes: ChapterNode[],
  id: string,
  direction: -1 | 1,
): ChapterNode[] {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    const target = index + direction;
    if (target < 0 || target >= nodes.length) return nodes;
    const copy = [...nodes];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    return copy.map((node, orderIndex) => ({ ...node, orderIndex }));
  }
  return nodes.map((node) => ({
    ...node,
    children: moveNode(node.children, id, direction),
  }));
}

function renameNode(
  nodes: ChapterNode[],
  id: string,
  title: string,
): ChapterNode[] {
  return nodes.map((node) =>
    node.id === id
      ? { ...node, title }
      : { ...node, children: renameNode(node.children, id, title) },
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  return (
    <span className="muted inline-flex items-center gap-1.5 text-xs">
      {state === "saved" ? (
        <Check size={14} className="text-emerald-600" />
      ) : (
        <span
          className={`size-2 rounded-full ${state === "saving" ? "animate-pulse bg-amber-500" : state === "failed" ? "bg-red-500" : "bg-[var(--accent)]"}`}
        />
      )}
      {state === "saved"
        ? "已自动保存"
        : state === "saving"
          ? "保存中…"
          : state === "failed"
            ? "保存失败，请重试"
            : "有未保存更改"}
    </span>
  );
}

function EditorHeader({
  document,
  saveState,
  onSave,
  preview,
  onTogglePreview,
  onOpenSidebar,
  onEditDocument,
  onExit,
  onRead,
}: {
  document: DocumentSummary;
  saveState: SaveState;
  onSave: () => void;
  preview: boolean;
  onTogglePreview: () => void;
  onOpenSidebar: () => void;
  onEditDocument: () => void;
  onExit: () => void;
  onRead: () => void;
}) {
  return (
    <header className="flex min-h-18 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 md:px-6">
      <button
        className="ui-button icon xl:hidden"
        onClick={onOpenSidebar}
        aria-label="打开章节目录"
      >
        <Menu size={19} />
      </button>
      <button
        type="button"
        className="ui-button icon ghost"
        aria-label="返回 Library"
        onClick={onExit}
      >
        <ArrowLeft size={19} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="muted mb-0.5 hidden text-xs sm:block">
          Library / Document / Editor
        </div>
        <button
          type="button"
          className="flex max-w-full items-center gap-2 text-left"
          onClick={onEditDocument}
          title="修改文档信息"
        >
          <h1 className="truncate font-semibold">{document.title}</h1>
          <Pencil className="muted shrink-0" size={13} />
        </button>
      </div>
      <SaveStatus state={saveState} />
      <button className="ui-button hidden sm:inline-flex" onClick={onSave}>
        <Save size={16} />
        保存
      </button>
      <button
        className={`ui-button hidden sm:inline-flex ${preview ? "border-[var(--accent)] text-[var(--accent)]" : ""}`}
        onClick={onTogglePreview}
      >
        <Eye size={16} />
        {preview ? "继续编辑" : "预览"}
      </button>
      <button type="button" className="ui-button primary" onClick={onRead}>
        <BookOpen size={16} />
        <span className="hidden md:inline">进入阅读</span>
      </button>
    </header>
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
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="surface w-full max-w-md p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-document-dialog-title"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="editor-document-dialog-title" className="font-semibold">
              修改文档信息
            </h2>
            <p className="muted mt-1 text-sm">同步更新 Library 中的信息。</p>
          </div>
          <button
            className="ui-button icon ghost"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
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
          }}
        >
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
            标签
            <span className="muted ml-2 text-xs">使用逗号分隔</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            />
          </label>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="ui-button" onClick={onClose}>
              取消
            </button>
            <button className="ui-button primary" disabled={busy}>
              {busy ? "保存中…" : "保存修改"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function RenameChapterDialog({
  initialTitle,
  onClose,
  onRename,
}: {
  initialTitle: string;
  onClose: () => void;
  onRename: (title: string) => Promise<string | null>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useModalFocus<HTMLElement>(onClose);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="surface w-full max-w-sm p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-chapter-title"
      >
        <h2 id="rename-chapter-title" className="font-semibold">
          修改章节标题
        </h2>
        <form
          className="mt-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim()) {
              setError("章节标题不能为空");
              return;
            }
            setBusy(true);
            const nextError = await onRename(title.trim());
            setBusy(false);
            if (nextError) setError(nextError);
          }}
        >
          <label className="block text-sm font-medium">
            章节标题
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
            />
          </label>
          {error && (
            <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="ui-button" onClick={onClose}>
              取消
            </button>
            <button className="ui-button primary" disabled={busy}>
              {busy ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ImportChapterDialog({
  file,
  hasTitleConflict,
  onClose,
  onConfirm,
}: {
  file: File;
  hasTitleConflict: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const dialogRef = useModalFocus<HTMLElement>(onClose);
  const title = file.name.replace(/\.md$/i, "") || "导入章节";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="surface w-full max-w-md p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-chapter-title"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="import-chapter-title" className="font-semibold">
              确认导入 Markdown 章节
            </h2>
            <p className="muted mt-1 text-sm">
              文件检查通过后才会写入当前文档。
            </p>
          </div>
          <button
            className="ui-button icon ghost"
            onClick={onClose}
            aria-label="关闭章节导入"
          >
            <X size={18} />
          </button>
        </div>
        <dl className="mt-5 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2 rounded-xl bg-[var(--surface-muted)] p-4 text-sm">
          <dt className="muted">章节标题</dt>
          <dd className="truncate font-medium" title={title}>
            {title}
          </dd>
          <dt className="muted">文件大小</dt>
          <dd>{Math.max(1, Math.ceil(file.size / 1024))} KB</dd>
          <dt className="muted">导入位置</dt>
          <dd>顶层章节末尾</dd>
        </dl>
        {hasTitleConflict && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            已存在同名章节。导入会保留两份内容，不会覆盖原章节。
          </p>
        )}
        <p className="muted mt-3 text-xs">
          仅支持不超过 5MB 的 .md 文件；导入失败不会创建空章节。
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="ui-button" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button
            autoFocus
            className="ui-button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const imported = await onConfirm();
              setBusy(false);
              if (imported) onClose();
            }}
          >
            {busy ? "导入中…" : "确认导入"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TreeNode({
  node,
  selectedId,
  expanded,
  onSelect,
  onToggle,
  onDelete,
  onMove,
  onRename,
}: {
  node: ChapterNode;
  selectedId: string;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRename: (id: string, currentTitle: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const selected = node.id === selectedId;
  return (
    <li>
      <div
        className={`group flex items-center rounded-lg pr-1 ${selected ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "hover:bg-[var(--surface-muted)]"}`}
      >
        {hasChildren ? (
          <button
            className="grid size-8 shrink-0 place-items-center"
            onClick={() => onToggle(node.id)}
            aria-label={expanded.has(node.id) ? "收起章节" : "展开章节"}
          >
            {expanded.has(node.id) ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            )}
          </button>
        ) : (
          <span
            className="grid size-8 shrink-0 place-items-center"
            aria-hidden="true"
          >
            <FileText size={14} />
          </span>
        )}
        <button
          className="min-w-0 flex-1 truncate py-2 text-left text-sm font-medium"
          onClick={() => onSelect(node.id)}
        >
          {node.title}
        </button>
        <div className="hidden items-center group-focus-within:flex group-hover:flex">
          <button
            className="muted p-1 hover:text-[var(--text)]"
            onClick={() => onRename(node.id, node.title)}
            aria-label="修改标题"
          >
            <Pencil size={13} />
          </button>
          <button
            className="muted p-1 hover:text-[var(--text)]"
            onClick={() => onMove(node.id, -1)}
            aria-label="上移"
          >
            <ArrowUp size={13} />
          </button>
          <button
            className="muted p-1 hover:text-[var(--text)]"
            onClick={() => onMove(node.id, 1)}
            aria-label="下移"
          >
            <ArrowDown size={13} />
          </button>
          <button
            className="muted p-1 hover:text-[var(--danger)]"
            onClick={() => onDelete(node.id)}
            aria-label="删除"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {hasChildren && expanded.has(node.id) && (
        <ul className="ml-4 border-l border-[var(--border)] pl-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
              onDelete={onDelete}
              onMove={onMove}
              onRename={onRename}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function ChapterSidebar({
  tree,
  selectedId,
  open,
  onClose,
  onSelect,
  onCreateChapter,
  onCreateChild,
  onImportChapter,
  onDelete,
  onMove,
  onRename,
}: {
  tree: ChapterNode[];
  selectedId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreateChapter: () => void;
  onCreateChild: () => void;
  onImportChapter: () => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRename: (id: string, currentTitle: string) => void;
}) {
  const [expanded, setExpanded] = useState(
    () =>
      new Set(
        flattenTree(tree)
          .filter((node) => node.children.length)
          .map((node) => node.id),
      ),
  );
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-76 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform xl:static xl:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
        <div>
          <h2 className="font-semibold">章节目录</h2>
          <p className="muted mt-0.5 text-xs">
            {flattenTree(tree).length} 个章节与小节
          </p>
        </div>
        <button
          className="ui-button icon ghost xl:hidden"
          onClick={onClose}
          aria-label="关闭章节目录"
        >
          <X size={19} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 border-b border-[var(--border)] p-3">
        <button className="ui-button" onClick={onCreateChapter}>
          <Plus size={15} />
          新建章节
        </button>
        <button className="ui-button" onClick={onCreateChild}>
          <Plus size={15} />
          新建小节
        </button>
        <button className="ui-button col-span-2" onClick={onImportChapter}>
          <Upload size={15} />
          导入 Markdown 章节
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tree.length ? (
          <ul className="space-y-1">
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                selectedId={selectedId}
                expanded={expanded}
                onSelect={(id) => {
                  onSelect(id);
                  if (window.innerWidth < 1280) onClose();
                }}
                onToggle={(id) =>
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                onDelete={onDelete}
                onMove={onMove}
                onRename={onRename}
              />
            ))}
          </ul>
        ) : (
          <div className="muted px-4 py-12 text-center text-sm">
            还没有章节。
            <br />
            新建一个章节开始整理。
          </div>
        )}
      </div>
      <div className="border-t border-[var(--border)] p-3">
        <p className="muted flex items-center gap-2 text-xs">
          <PanelLeftClose size={14} />
          拖拽排序将在后续版本提供
        </p>
      </div>
    </aside>
  );
}

const tools = [
  { label: "H1", icon: Heading1, before: "# ", after: "" },
  { label: "H2", icon: Heading2, before: "## ", after: "" },
  { label: "列表", icon: List, before: "- ", after: "" },
  { label: "引用", icon: Quote, before: "> ", after: "" },
  { label: "链接", icon: Link2, before: "[", after: "](https://)" },
  { label: "代码", icon: Code2, before: "```\n", after: "\n```" },
  {
    label: "表格",
    icon: Table2,
    before: "| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |",
    after: "",
  },
  { label: "公式", icon: Sigma, before: "$$\n", after: "\n$$" },
  { label: "图片", icon: ImageIcon, before: "![说明](", after: ")" },
  { label: "分割线", icon: Minus, before: "\n---\n", after: "" },
];

function MarkdownToolbar({
  onInsert,
  onFormat,
  onUploadImage,
  onManageImages,
}: {
  onInsert: (before: string, after: string) => void;
  onFormat: () => void;
  onUploadImage: () => void;
  onManageImages: () => void;
}) {
  return (
    <div className="flex overflow-x-auto border-b border-[var(--border)] bg-[var(--surface-muted)] p-2">
      {tools.map(({ label, icon: Icon, before, after }) => (
        <button
          key={label}
          className="ui-button ghost shrink-0 px-2.5"
          title={label}
          onClick={() => onInsert(before, after)}
        >
          <Icon size={16} />
          <span className="hidden 2xl:inline">{label}</span>
        </button>
      ))}
      <span className="mx-1 w-px shrink-0 bg-[var(--border)]" />
      <button
        className="ui-button ghost shrink-0 px-2.5"
        title="整理 Markdown 格式"
        onClick={onFormat}
      >
        <WandSparkles size={16} />
        <span className="hidden 2xl:inline">整理格式</span>
      </button>
      <span className="mx-1 w-px shrink-0 bg-[var(--border)]" />
      <button
        className="ui-button ghost shrink-0 px-2.5"
        title="上传图片并插入 Markdown"
        onClick={onUploadImage}
      >
        <Upload size={16} />
        <span className="hidden 2xl:inline">上传图片</span>
      </button>
      <button
        className="ui-button ghost shrink-0 px-2.5"
        title="管理本文档的图片"
        onClick={onManageImages}
      >
        <ImageIcon size={16} />
        <span className="hidden 2xl:inline">图片资源</span>
      </button>
    </div>
  );
}

function AssetManagerDialog({
  documentId,
  onClose,
  onInsert,
}: {
  documentId: string;
  onClose: () => void;
  onInsert: (asset: DocumentAsset) => void;
}) {
  const [assets, setAssets] = useState<DocumentAsset[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const dialogRef = useModalFocus<HTMLElement>(onClose);
  useEffect(() => {
    void listDocumentAssetsAction(documentId).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error);
      else setAssets(result.data);
    });
  }, [documentId]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="surface flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-manager-title"
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] p-5">
          <div>
            <h2 id="asset-manager-title" className="font-semibold">
              图片资源
            </h2>
            <p className="muted mt-1 text-sm">
              插入现有图片，或删除不再使用的文件。
            </p>
          </div>
          <button
            className="ui-button icon ghost"
            onClick={onClose}
            aria-label="关闭图片资源"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-40 flex-1 overflow-y-auto p-5">
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : loading ? (
            <p className="muted text-sm">正在读取图片…</p>
          ) : assets.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {assets.map((asset) => (
                <li
                  key={asset.name}
                  className="overflow-hidden rounded-xl border border-[var(--border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt=""
                    className="h-32 w-full bg-[var(--surface-muted)] object-contain"
                  />
                  <div className="p-3">
                    <p className="truncate text-xs" title={asset.name}>
                      {asset.name}
                    </p>
                    <p className="muted mt-1 text-xs">
                      {Math.max(1, Math.round(asset.size / 1024))} KB
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="ui-button flex-1 px-2 py-1 text-xs"
                        onClick={() => onInsert(asset)}
                      >
                        插入
                      </button>
                      <button
                        className="ui-button icon min-h-8 text-[var(--danger)]"
                        aria-label={`删除${asset.name}`}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `确定删除图片“${asset.name}”吗？正文中的引用将失效。`,
                            )
                          )
                            return;
                          const result = await deleteDocumentAssetAction(
                            documentId,
                            asset.name,
                          );
                          if (!result.ok) setError(result.error);
                          else
                            setAssets((current) =>
                              current.filter(
                                (item) => item.name !== asset.name,
                              ),
                            );
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid min-h-40 place-items-center text-center">
              <div>
                <ImageIcon className="muted mx-auto mb-2" />
                <p className="font-medium">还没有上传图片</p>
                <p className="muted mt-1 text-sm">
                  关闭窗口后使用工具栏中的“上传图片”。
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FormatMarkdownDialog({
  before,
  result,
  onCancel,
  onApply,
}: {
  before: string;
  result: MarkdownFormatResult;
  onCancel: () => void;
  onApply: () => void;
}) {
  const dialogRef = useModalFocus<HTMLElement>(onCancel);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="surface flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="format-dialog-title"
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] p-5">
          <div>
            <h2 id="format-dialog-title" className="text-lg font-semibold">
              预览 Markdown 整理结果
            </h2>
            <p className="muted mt-1 text-sm">
              应用后仍可在编辑器底部一键撤销，不会自动保存未经确认的结果。
            </p>
          </div>
          <button
            className="ui-button icon ghost"
            onClick={onCancel}
            aria-label="关闭整理预览"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="flex flex-wrap gap-2 border-b border-[var(--border)] px-5 py-3">
          {result.changes.map((change) => (
            <li
              key={change}
              className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent-strong)]"
            >
              {change}
            </li>
          ))}
        </ul>
        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-5 md:grid-cols-2">
          <label className="flex min-h-64 flex-col gap-2 text-sm font-medium">
            整理前
            <textarea
              readOnly
              value={before}
              className="min-h-64 flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 font-mono text-xs leading-6"
            />
          </label>
          <label className="flex min-h-64 flex-col gap-2 text-sm font-medium">
            整理后
            <textarea
              readOnly
              value={result.formatted}
              className="min-h-64 flex-1 resize-none rounded-lg border border-[var(--accent)] bg-[var(--surface)] p-3 font-mono text-xs leading-6"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] p-4">
          <button className="ui-button" onClick={onCancel}>
            取消
          </button>
          <button className="ui-button primary" onClick={onApply}>
            <WandSparkles size={16} />
            应用整理
          </button>
        </div>
      </section>
    </div>
  );
}

function MarkdownEditor({
  value,
  onChange,
  textareaRef,
}: {
  value: string;
  onChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
      className="min-h-0 flex-1 resize-none bg-[var(--surface)] p-5 font-mono text-sm leading-7 outline-none md:p-7"
      aria-label="Markdown 编辑区"
    />
  );
}

export function EditorWorkspace({
  document,
  initialTree,
  initialContents,
}: {
  document: DocumentSummary;
  initialTree: ChapterNode[];
  initialContents: Record<string, ChapterContent>;
}) {
  const router = useRouter();
  const [documentState, setDocumentState] = useState(document);
  const [tree, setTree] = useState(initialTree);
  const [contents, setContents] = useState(initialContents);
  const [selectedId, setSelectedId] = useState(
    initialContents.framework
      ? "framework"
      : (flattenTree(initialTree)[0]?.id ?? ""),
  );
  const [mode, setMode] = useState<"content" | "scratchpad">("content");
  const [preview, setPreview] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [assetManagerOpen, setAssetManagerOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [pendingChapterImport, setPendingChapterImport] = useState<File | null>(
    null,
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [operationNotice, setOperationNotice] = useState("");
  const [formatPreview, setFormatPreview] =
    useState<MarkdownFormatResult | null>(null);
  const [formatUndo, setFormatUndo] = useState<{
    chapterId: string;
    mode: "content" | "scratchpad";
    value: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const saveQueueRef = useRef(new SerialTaskQueue());
  const revisionRef = useRef(0);
  const selectedIdRef = useRef(selectedId);
  const current = contents[selectedId];
  const value = current?.[mode] ?? "";

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const persistCurrent = useCallback(async () => {
    if (!selectedId) return true;
    const chapterId = selectedId;
    const field = mode;
    const snapshot = value;
    const revision = revisionRef.current;
    setSaveState("saving");

    const task = saveQueueRef.current.enqueue(async () => {
      const result = await updateChapterAction(chapterId, {
        [field]: snapshot,
      });
      if (!result.ok) throw new Error(result.error);
      setContents((all) => ({
        ...all,
        [chapterId]: {
          ...all[chapterId],
          updatedAt: result.data.updatedAt,
        },
      }));
      if (
        revision === revisionRef.current &&
        chapterId === selectedIdRef.current
      ) {
        setSaveState("saved");
        setOperationError("");
      }
    });
    try {
      await task;
      return true;
    } catch (error) {
      if (chapterId === selectedIdRef.current) {
        setSaveState(revision === revisionRef.current ? "failed" : "dirty");
      }
      setOperationError(
        error instanceof Error ? error.message : "保存章节失败，请重试。",
      );
      return false;
    }
  }, [mode, selectedId, value]);

  useEffect(() => {
    if (saveState !== "dirty") return;
    const timer = window.setTimeout(() => {
      void persistCurrent();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [persistCurrent, saveState, value]);

  const update = (next: string) => {
    if (!selectedId) return;
    revisionRef.current += 1;
    setContents((all) => ({
      ...all,
      [selectedId]: {
        ...all[selectedId],
        [mode]: next,
        updatedAt: new Date().toISOString(),
      },
    }));
    setSaveState("dirty");
    setOperationError("");
  };
  const insert = (before: string, after: string) => {
    const element = textareaRef.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    update(
      value.slice(0, start) +
        before +
        value.slice(start, end) +
        after +
        value.slice(end),
    );
    window.setTimeout(() => {
      element?.focus();
      element?.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };
  const insertAsset = (asset: DocumentAsset) => {
    const alt = asset.name.replace(/\.[^.]+$/, "").replace(/[\[\]]/g, "");
    insert(`![${alt}](${asset.url})`, "");
    setAssetManagerOpen(false);
  };
  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.set("image", file);
    setUploadingImage(true);
    const result = await uploadDocumentImageAction(documentState.id, formData);
    setUploadingImage(false);
    if (!result.ok) {
      setOperationError(result.error);
      return;
    }
    insertAsset(result.data);
    setOperationError("");
    setOperationNotice(`图片“${result.data.name}”已上传并插入正文。`);
  };
  const ensureCurrentSaved = async () => {
    if (saveState === "dirty" || saveState === "failed") {
      return persistCurrent();
    }
    if (saveState === "saving") {
      try {
        await saveQueueRef.current.wait();
        return true;
      } catch {
        return false;
      }
    }
    return true;
  };
  const createChapter = async () => {
    if (!(await ensureCurrentSaved())) return;
    const title = `新章节 ${tree.length + 1}`;
    const result = await createChapterAction({
      documentId: document.id,
      title,
    });
    if (!result.ok) {
      setOperationError(result.error);
      return;
    }
    const chapter = result.data;
    setTree((currentTree) => [
      ...currentTree,
      {
        id: chapter.id,
        documentId: document.id,
        parentId: null,
        title: chapter.title,
        orderIndex: chapter.orderIndex,
        children: [],
      },
    ]);
    setContents((all) => ({ ...all, [chapter.id]: chapter }));
    setSelectedId(chapter.id);
    setMode("content");
    setSaveState("saved");
  };
  const createChild = async () => {
    if (!selectedId) return createChapter();
    if (!(await ensureCurrentSaved())) return;
    const selectedNode = flattenTree(tree).find(
      (node) => node.id === selectedId,
    );
    const parentId = selectedNode?.parentId ?? selectedId;
    const title = "新建小节";
    const result = await createChapterAction({
      documentId: document.id,
      parentId,
      title,
    });
    if (!result.ok) {
      setOperationError(result.error);
      return;
    }
    const chapter = result.data;
    setTree((currentTree) =>
      appendChild(currentTree, parentId, {
        id: chapter.id,
        documentId: document.id,
        parentId,
        title: chapter.title,
        orderIndex: chapter.orderIndex,
        children: [],
      }),
    );
    setContents((all) => ({ ...all, [chapter.id]: chapter }));
    setSelectedId(chapter.id);
    setMode("content");
    setSaveState("saved");
  };
  const importChapter = async (file: File) => {
    if (!(await ensureCurrentSaved())) return false;
    const formData = new FormData();
    formData.set("file", file);
    const result = await importMarkdownChapterAction(
      documentState.id,
      null,
      formData,
    );
    if (!result.ok) {
      setOperationError(result.error);
      return false;
    }
    const chapter = result.data;
    const node: ChapterNode = {
      id: chapter.id,
      documentId: chapter.documentId,
      parentId: chapter.parentId,
      title: chapter.title,
      orderIndex: chapter.orderIndex,
      children: [],
    };
    setTree((currentTree) =>
      chapter.parentId
        ? appendChild(currentTree, chapter.parentId, node)
        : [...currentTree, node],
    );
    setContents((all) => ({ ...all, [chapter.id]: chapter }));
    revisionRef.current += 1;
    setSelectedId(chapter.id);
    setMode("content");
    setSaveState("saved");
    setOperationError("");
    setOperationNotice(`已导入章节“${chapter.title}”。`);
    return true;
  };
  const remove = async (id: string) => {
    const targetNode = flattenTree(tree).find((node) => node.id === id);
    const chapterTitle = targetNode?.title;
    if (!window.confirm(`确定删除“${chapterTitle ?? "这个章节"}”吗？`)) return;
    if (!(await ensureCurrentSaved())) return;
    const result = await deleteChapterAction(id);
    if (!result.ok) {
      setOperationError(result.error);
      return;
    }
    const removedIds = new Set(
      targetNode ? flattenTree([targetNode]).map((node) => node.id) : [id],
    );
    const nextTree = removeNode(tree, id);
    setTree(nextTree);
    setContents((all) =>
      Object.fromEntries(
        Object.entries(all).filter(([chapterId]) => !removedIds.has(chapterId)),
      ),
    );
    if (removedIds.has(selectedId)) {
      revisionRef.current += 1;
      setSelectedId(flattenTree(nextTree)[0]?.id ?? "");
      setSaveState("saved");
    }
    setOperationError("");
  };
  const move = async (id: string, direction: -1 | 1) => {
    const result = await reorderChapterAction(id, direction);
    if (!result.ok) {
      setOperationError(result.error);
      return;
    }
    setTree((currentTree) => moveNode(currentTree, id, direction));
    setOperationError("");
  };
  const rename = async (id: string, title: string) => {
    const result = await updateChapterAction(id, { title });
    if (!result.ok) {
      return result.error;
    }
    setTree((currentTree) => renameNode(currentTree, id, result.data.title));
    setContents((all) => ({
      ...all,
      [id]: { ...all[id], title: result.data.title },
    }));
    setOperationError("");
    setRenameTarget(null);
    return null;
  };
  const selectChapter = async (id: string) => {
    if (id === selectedId) return;
    if (!(await ensureCurrentSaved())) return;
    revisionRef.current += 1;
    setSelectedId(id);
    setSaveState("saved");
  };
  const switchMode = async (nextMode: "content" | "scratchpad") => {
    if (nextMode === mode) return;
    if (!(await ensureCurrentSaved())) return;
    revisionRef.current += 1;
    setMode(nextMode);
    setSaveState("saved");
  };
  const manualSave = () => void persistCurrent();
  const navigateAfterSave = async (href: string) => {
    if (!(await ensureCurrentSaved())) {
      setOperationError("当前内容尚未保存，保存成功后才能离开编辑器。");
      return;
    }
    router.push(href);
  };
  const previewFormatting = () => {
    const result = formatMarkdownSafely(value);
    if (!result.changes.length || result.formatted === value) {
      setOperationNotice("当前 Markdown 已经很整洁，无需调整。");
      return;
    }
    setOperationNotice("");
    setFormatPreview(result);
  };
  const applyFormatting = () => {
    if (!formatPreview || !selectedId) return;
    setFormatUndo({ chapterId: selectedId, mode, value });
    update(formatPreview.formatted);
    setFormatPreview(null);
    setOperationNotice("已应用格式整理；保存前后都可以撤销本次整理。");
  };
  const undoFormatting = () => {
    if (
      !formatUndo ||
      formatUndo.chapterId !== selectedId ||
      formatUndo.mode !== mode
    )
      return;
    update(formatUndo.value);
    setFormatUndo(null);
    setOperationNotice("已撤销上一次格式整理。");
  };

  useEffect(() => {
    if (saveState === "saved") return;
    const protectUnsavedChanges = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", protectUnsavedChanges);
    return () =>
      window.removeEventListener("beforeunload", protectUnsavedChanges);
  }, [saveState]);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        void persistCurrent();
      } else if (key === "b" && !preview) {
        event.preventDefault();
        insert("**", "**");
      } else if (key === "p" && event.shiftKey) {
        event.preventDefault();
        setPreview((currentPreview) => !currentPreview);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });
  const currentTitle = useMemo(
    () =>
      flattenTree(tree).find((node) => node.id === selectedId)?.title ??
      "未选择章节",
    [tree, selectedId],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--background)]">
      <EditorHeader
        document={documentState}
        saveState={saveState}
        onSave={manualSave}
        preview={preview}
        onTogglePreview={() => setPreview((value) => !value)}
        onOpenSidebar={() => setSidebarOpen(true)}
        onEditDocument={() => setDocumentDialogOpen(true)}
        onExit={() => void navigateAfterSave("/library")}
        onRead={() =>
          void navigateAfterSave(`/documents/${documentState.id}/read`)
        }
      />
      <div className="flex min-h-0 flex-1">
        <ChapterSidebar
          tree={tree}
          selectedId={selectedId}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelect={(id) => void selectChapter(id)}
          onCreateChapter={createChapter}
          onCreateChild={createChild}
          onImportChapter={() => importInputRef.current?.click()}
          onDelete={remove}
          onMove={(id, direction) => void move(id, direction)}
          onRename={(id, title) => setRenameTarget({ id, title })}
        />
        {sidebarOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/20 xl:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭目录遮罩"
          />
        )}
        <main className="min-w-0 flex-1 p-3 md:p-5">
          {operationError && (
            <div className="mx-auto mb-3 flex max-w-6xl items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              <span>{operationError}</span>
              <button
                onClick={() => setOperationError("")}
                aria-label="关闭错误提示"
              >
                <X size={15} />
              </button>
            </div>
          )}
          {operationNotice && (
            <div className="mx-auto mb-3 flex max-w-6xl items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
              <span>{operationNotice}</span>
              <button
                onClick={() => setOperationNotice("")}
                aria-label="关闭提示"
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="surface mx-auto flex h-full max-w-6xl flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="muted text-xs">当前章节</p>
                <h2 className="font-semibold">{currentTitle}</h2>
              </div>
              <div className="flex items-center gap-2">
                {selectedId && (
                  <a
                    className="ui-button icon"
                    href={`/api/documents/${documentState.id}/chapters/${selectedId}/export`}
                    aria-label="导出当前章节 Markdown"
                    title="导出当前章节 Markdown"
                  >
                    <Download size={16} />
                  </a>
                )}
                <div className="flex rounded-lg bg-[var(--surface-muted)] p-1">
                  <button
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${mode === "content" ? "bg-[var(--surface)] shadow-sm" : "muted"}`}
                    onClick={() => void switchMode("content")}
                  >
                    正文
                  </button>
                  <button
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${mode === "scratchpad" ? "bg-[var(--surface)] shadow-sm" : "muted"}`}
                    onClick={() => void switchMode("scratchpad")}
                  >
                    素材
                  </button>
                </div>
              </div>
            </div>
            {!current ? (
              <div className="grid flex-1 place-items-center text-center">
                <div>
                  <FileText className="muted mx-auto mb-3" />
                  <h3 className="font-semibold">选择或新建一个章节</h3>
                  <p className="muted mt-1 text-sm">章节内容会显示在这里。</p>
                </div>
              </div>
            ) : preview ? (
              <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <MarkdownRenderer
                  content={value}
                  className="mx-auto max-w-3xl"
                />
              </div>
            ) : (
              <>
                <MarkdownToolbar
                  onInsert={insert}
                  onFormat={previewFormatting}
                  onUploadImage={() => imageInputRef.current?.click()}
                  onManageImages={() => setAssetManagerOpen(true)}
                />
                <MarkdownEditor
                  value={value}
                  onChange={update}
                  textareaRef={textareaRef}
                />
              </>
            )}
            <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2">
              <span className="muted text-xs">
                Markdown · {value.length} 字符
              </span>
              {formatUndo &&
                formatUndo.chapterId === selectedId &&
                formatUndo.mode === mode && (
                  <button
                    className="ui-button ghost min-h-8 px-2 py-1 text-xs"
                    onClick={undoFormatting}
                  >
                    <RotateCcw size={14} />
                    撤销整理
                  </button>
                )}
              <div className="flex gap-2 sm:hidden">
                <button
                  className="ui-button"
                  onClick={() => setPreview((item) => !item)}
                >
                  <Eye size={15} />
                  预览
                </button>
                <button className="ui-button" onClick={manualSave}>
                  <Save size={15} />
                  保存
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      {formatPreview && (
        <FormatMarkdownDialog
          before={value}
          result={formatPreview}
          onCancel={() => setFormatPreview(null)}
          onApply={applyFormatting}
        />
      )}
      <input
        ref={importInputRef}
        className="sr-only"
        type="file"
        accept=".md,text/markdown"
        aria-label="选择要导入的 Markdown 章节"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && !/\.md$/i.test(file.name))
            setOperationError("章节导入仅支持 .md 文件。");
          else if (file && file.size > 5 * 1024 * 1024)
            setOperationError("Markdown 文件超过 5MB 限制。");
          else if (file) {
            setOperationError("");
            setPendingChapterImport(file);
          }
          event.target.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        aria-label="选择要上传的图片"
        disabled={uploadingImage}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadImage(file);
          event.target.value = "";
        }}
      />
      {documentDialogOpen && (
        <EditDocumentDialog
          document={documentState}
          onClose={() => setDocumentDialogOpen(false)}
          onUpdated={(updated) => {
            setDocumentState(updated);
            setDocumentDialogOpen(false);
            setOperationNotice("文档信息已更新。");
          }}
        />
      )}
      {assetManagerOpen && (
        <AssetManagerDialog
          documentId={documentState.id}
          onClose={() => setAssetManagerOpen(false)}
          onInsert={insertAsset}
        />
      )}
      {renameTarget && (
        <RenameChapterDialog
          initialTitle={renameTarget.title}
          onClose={() => setRenameTarget(null)}
          onRename={(title) => rename(renameTarget.id, title)}
        />
      )}
      {pendingChapterImport && (
        <ImportChapterDialog
          file={pendingChapterImport}
          hasTitleConflict={flattenTree(tree).some(
            (node) =>
              node.title.toLocaleLowerCase("zh-CN") ===
              pendingChapterImport.name
                .replace(/\.md$/i, "")
                .toLocaleLowerCase("zh-CN"),
          )}
          onClose={() => setPendingChapterImport(null)}
          onConfirm={() => importChapter(pendingChapterImport)}
        />
      )}
    </div>
  );
}
