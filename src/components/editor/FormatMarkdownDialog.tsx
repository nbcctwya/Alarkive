"use client";

import { WandSparkles, X } from "lucide-react";
import { useModalFocus } from "@/lib/use-modal-focus";
import type { MarkdownFormatResult } from "@/lib/markdown";

export function FormatMarkdownDialog({
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
