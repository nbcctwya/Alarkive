"use client";

import { BookOpen, Download, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { DocumentSummary } from "@/types/documents";

export function DocumentCard({
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
