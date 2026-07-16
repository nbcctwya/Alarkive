"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { updateDocumentAction } from "@/actions/documents";
import { useModalFocus } from "@/lib/use-modal-focus";
import type { DocumentSummary } from "@/types/documents";

export function EditDocumentDialog({
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

export function RenameChapterDialog({
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

export function ImportChapterDialog({
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
