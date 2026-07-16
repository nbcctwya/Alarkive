"use client";

import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { ChapterNode } from "@/types/chapters";

export function BookTableOfContents({
  tree,
  currentId,
  open,
  onClose,
  onSelect,
}: {
  tree: ChapterNode[];
  currentId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(
    () =>
      new Set(
        tree.filter((node) => node.children.length).map((node) => node.id),
      ),
  );
  const render = (nodes: ChapterNode[], depth = 0) =>
    nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      return (
        <li key={node.id}>
          <div
            className={`flex items-center rounded-lg ${node.id === currentId ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "hover:bg-[var(--surface-muted)]"}`}
            style={{ paddingLeft: `${depth * 10}px` }}
          >
            {hasChildren ? (
              <button
                className="grid size-8 shrink-0 place-items-center"
                onClick={() => {
                  setExpanded((value) => {
                    const next = new Set(value);
                    if (next.has(node.id)) next.delete(node.id);
                    else next.add(node.id);
                    return next;
                  });
                }}
                aria-label={expanded.has(node.id) ? "收起章节" : "展开章节"}
              >
                {expanded.has(node.id) ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            ) : (
              <span
                className="grid size-8 shrink-0 place-items-center"
                aria-hidden="true"
              >
                <span className="size-1 rounded-full bg-current opacity-40" />
              </span>
            )}
            <button
              className="min-w-0 flex-1 truncate py-2 pr-2 text-left text-sm"
              onClick={() => {
                onSelect(node.id);
                if (window.innerWidth < 1024) onClose();
              }}
            >
              {node.title}
            </button>
          </div>
          {hasChildren && expanded.has(node.id) && (
            <ul>{render(node.children, depth + 1)}</ul>
          )}
        </li>
      );
    });
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div>
          <p className="muted text-xs">CONTENTS</p>
          <h2 className="mt-1 font-semibold">全书目录</h2>
        </div>
        <button
          className="ui-button icon ghost lg:hidden"
          onClick={onClose}
          aria-label="关闭目录"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="全书目录">
        <ul className="space-y-0.5">{render(tree)}</ul>
      </nav>
      <div className="border-t border-[var(--border)] p-4">
        <p className="muted text-xs leading-5">
          阅读位置会自动保存到本地数据库。
        </p>
      </div>
    </aside>
  );
}
