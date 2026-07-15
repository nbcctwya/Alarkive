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
  FileText,
  Heading1,
  Heading2,
  Image,
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
  X,
} from "lucide-react";
import Link from "next/link";
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
}: {
  document: DocumentSummary;
  saveState: SaveState;
  onSave: () => void;
  preview: boolean;
  onTogglePreview: () => void;
  onOpenSidebar: () => void;
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
      <Link
        href="/library"
        className="ui-button icon ghost"
        aria-label="返回 Library"
      >
        <ArrowLeft size={19} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="muted mb-0.5 hidden text-xs sm:block">
          Library / Document / Editor
        </div>
        <h1 className="truncate font-semibold">{document.title}</h1>
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
      <Link
        className="ui-button primary"
        href={`/documents/${document.id}/read`}
      >
        <BookOpen size={16} />
        <span className="hidden md:inline">进入阅读</span>
      </Link>
    </header>
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
        <button
          className="grid size-8 shrink-0 place-items-center"
          onClick={() => hasChildren && onToggle(node.id)}
          aria-label={hasChildren ? "展开或收起" : undefined}
        >
          {hasChildren ? (
            expanded.has(node.id) ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            )
          ) : (
            <FileText size={14} />
          )}
        </button>
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
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRename: (id: string, currentTitle: string) => void;
}) {
  const [expanded, setExpanded] = useState(() => new Set(["stage-1"]));
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
  { label: "图片", icon: Image, before: "![说明](", after: ")" },
  { label: "分割线", icon: Minus, before: "\n---\n", after: "" },
];

function MarkdownToolbar({
  onInsert,
}: {
  onInsert: (before: string, after: string) => void;
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
  const [operationError, setOperationError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
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

    const task = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
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
    saveQueueRef.current = task;
    try {
      await task;
      return true;
    } catch (error) {
      if (chapterId === selectedIdRef.current) setSaveState("failed");
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
  const createChapter = async () => {
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
  const remove = async (id: string) => {
    const chapterTitle = flattenTree(tree).find(
      (node) => node.id === id,
    )?.title;
    if (!window.confirm(`确定删除“${chapterTitle ?? "这个章节"}”吗？`)) return;
    const result = await deleteChapterAction(id);
    if (!result.ok) {
      setOperationError(result.error);
      return;
    }
    setTree((currentTree) => removeNode(currentTree, id));
    if (id === selectedId)
      setSelectedId(flattenTree(removeNode(tree, id))[0]?.id ?? "");
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
  const rename = async (id: string, currentTitle: string) => {
    const title = window.prompt("修改章节标题", currentTitle)?.trim();
    if (!title || title === currentTitle) return;
    const result = await updateChapterAction(id, { title });
    if (!result.ok) {
      setOperationError(result.error);
      return;
    }
    setTree((currentTree) => renameNode(currentTree, id, result.data.title));
    setContents((all) => ({
      ...all,
      [id]: { ...all[id], title: result.data.title },
    }));
    setOperationError("");
  };
  const selectChapter = async (id: string) => {
    if (id === selectedId) return;
    if (saveState === "dirty" || saveState === "failed") {
      if (!(await persistCurrent())) return;
    } else if (saveState === "saving") {
      const saved = await saveQueueRef.current.then(
        () => true,
        () => false,
      );
      if (!saved) return;
    }
    revisionRef.current += 1;
    setSelectedId(id);
    setSaveState("saved");
  };
  const switchMode = async (nextMode: "content" | "scratchpad") => {
    if (nextMode === mode) return;
    if (saveState === "dirty" || saveState === "failed") {
      if (!(await persistCurrent())) return;
    } else if (saveState === "saving") {
      const saved = await saveQueueRef.current.then(
        () => true,
        () => false,
      );
      if (!saved) return;
    }
    revisionRef.current += 1;
    setMode(nextMode);
    setSaveState("saved");
  };
  const manualSave = () => void persistCurrent();
  const currentTitle = useMemo(
    () =>
      flattenTree(tree).find((node) => node.id === selectedId)?.title ??
      "未选择章节",
    [tree, selectedId],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--background)]">
      <EditorHeader
        document={document}
        saveState={saveState}
        onSave={manualSave}
        preview={preview}
        onTogglePreview={() => setPreview((value) => !value)}
        onOpenSidebar={() => setSidebarOpen(true)}
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
          onDelete={remove}
          onMove={(id, direction) => void move(id, direction)}
          onRename={(id, title) => void rename(id, title)}
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
          <div className="surface mx-auto flex h-full max-w-6xl flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="muted text-xs">当前章节</p>
                <h2 className="font-semibold">{currentTitle}</h2>
              </div>
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
                <MarkdownToolbar onInsert={insert} />
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
    </div>
  );
}
