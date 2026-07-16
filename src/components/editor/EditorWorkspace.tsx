"use client";

import { Download, Eye, FileText, RotateCcw, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createChapterAction,
  deleteChapterAction,
  reorderChapterAction,
  updateChapterAction,
} from "@/actions/chapters";
import { importMarkdownChapterAction } from "@/actions/import-export";
import { uploadDocumentImageAction } from "@/actions/assets";
import { AssetManagerDialog } from "@/components/editor/AssetManagerDialog";
import { ChapterSidebar } from "@/components/editor/ChapterSidebar";
import {
  appendChild,
  flattenTree,
  moveNode,
  removeNode,
  renameNode,
} from "@/components/editor/chapter-tree";
import {
  EditDocumentDialog,
  ImportChapterDialog,
  RenameChapterDialog,
} from "@/components/editor/EditorDialogs";
import { EditorHeader, type SaveState } from "@/components/editor/EditorHeader";
import { FormatMarkdownDialog } from "@/components/editor/FormatMarkdownDialog";
import {
  MarkdownEditor,
  MarkdownToolbar,
} from "@/components/editor/MarkdownControls";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import {
  formatMarkdownSafely,
  type MarkdownFormatResult,
} from "@/lib/markdown";
import { SerialTaskQueue } from "@/lib/serial-task-queue";
import type { DocumentAsset } from "@/types/assets";
import type { ChapterContent, ChapterNode } from "@/types/chapters";
import type { DocumentSummary } from "@/types/documents";

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
    flattenTree(initialTree)[0]?.id ?? "",
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
