"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  Menu,
  Pencil,
  Save,
} from "lucide-react";
import type { DocumentSummary } from "@/types/documents";

export type SaveState = "saved" | "saving" | "dirty" | "failed";

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

export function EditorHeader({
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
