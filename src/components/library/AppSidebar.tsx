"use client";

import { Clock3, Files, Library, Tags, X } from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "Library", icon: Library, href: "#library-top", active: true },
  { label: "全部文档", icon: Files, href: "#all-documents" },
  { label: "最近阅读", icon: Clock3, href: "#recent-documents" },
  { label: "标签", icon: Tags, href: "#library-tag-filter" },
];

export function AppSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-[var(--border)] bg-[var(--surface)] p-5 transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="mb-9 flex items-center justify-between">
        <Link href="/library" className="text-2xl font-bold tracking-tight">
          Alarkive
        </Link>
        <button
          className="ui-button icon ghost lg:hidden"
          onClick={onClose}
          aria-label="关闭导航"
        >
          <X size={20} />
        </button>
      </div>
      <nav className="space-y-1" aria-label="应用导航">
        {navItems.map(({ label, icon: Icon, href, active }) => (
          <a
            key={label}
            href={href}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "muted hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"}`}
            onClick={onClose}
          >
            <Icon size={18} />
            {label}
          </a>
        ))}
      </nav>
      <div className="absolute right-5 bottom-6 left-5 rounded-xl bg-[var(--surface-muted)] p-4 text-xs leading-5 text-[var(--text-muted)]">
        <p className="mb-1 font-semibold text-[var(--text)]">个人学习空间</p>
        文档仅保存在你的知识库中。V0.1 不连接外部 AI。
      </div>
    </aside>
  );
}
