"use client";

import {
  BookOpen,
  Edit3,
  Library,
  Menu,
  PanelRight,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import type { DocumentSummary } from "@/types/documents";

export function ReaderHeader({
  document,
  progress,
  onOpenToc,
  onOpenChapterToc,
  onToggleSettings,
}: {
  document: DocumentSummary;
  progress: number;
  onOpenToc: () => void;
  onOpenChapterToc: () => void;
  onToggleSettings: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-[var(--border)] bg-[color:var(--surface)]/95 px-3 backdrop-blur md:px-5">
      <button
        className="ui-button icon lg:hidden"
        onClick={onOpenToc}
        aria-label="打开全书目录"
      >
        <Menu size={18} />
      </button>
      <Link
        href="/library"
        className="flex shrink-0 items-center gap-2 font-bold"
      >
        <BookOpen size={21} className="text-[var(--accent)]" />
        <span className="hidden sm:inline">Alarkive</span>
      </Link>
      <span className="hidden h-7 w-px bg-[var(--border)] sm:block" />
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold md:text-base">
        {document.title}
      </h1>
      <div className="hidden w-52 items-center gap-3 lg:flex">
        <span className="muted text-xs">阅读进度</span>
        <div className="progress-track flex-1">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-semibold">{progress}%</span>
      </div>
      <Link className="ui-button hidden sm:inline-flex" href="/library">
        <Library size={16} />
        返回 Library
      </Link>
      <Link
        className="ui-button primary"
        href={`/documents/${document.id}/edit`}
      >
        <Edit3 size={16} />
        <span className="hidden md:inline">进入编辑</span>
      </Link>
      <button
        className="ui-button icon xl:hidden"
        onClick={onToggleSettings}
        aria-label="阅读设置"
      >
        <Settings2 size={18} />
      </button>
      <button
        className="ui-button icon xl:hidden"
        onClick={onOpenChapterToc}
        aria-label="打开本章导航"
      >
        <PanelRight size={18} />
      </button>
    </header>
  );
}
