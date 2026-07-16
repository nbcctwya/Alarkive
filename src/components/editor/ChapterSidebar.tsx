"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FileText,
  PanelLeftClose,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { flattenTree } from "@/components/editor/chapter-tree";
import type { ChapterNode } from "@/types/chapters";

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

export function ChapterSidebar({
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
