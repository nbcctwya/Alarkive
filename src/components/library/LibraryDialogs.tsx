"use client";

import { X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { updateDocumentAction } from "@/actions/documents";
import { importFileAction, inspectImportAction } from "@/actions/import-export";
import { useModalFocus } from "@/lib/use-modal-focus";
import type { DocumentSummary } from "@/types/documents";
import type { ImportInspection } from "@/types/portability";

export function CreateDocumentDialog({
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

export function ImportDocumentDialog({
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
    if (!file) return setError("请选择 Markdown 或 Alarkive ZIP 文件");
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
    if (!result.ok) return setError(result.error);
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError("文档标题不能为空");
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
    if (!result.ok) return setError(result.error);
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
