"use client";

import { extractMarkdownHeadings } from "@/lib/markdown";

export function ChapterTableOfContents({
  content,
  activeId,
  onNavigate,
}: {
  content: string;
  activeId: string;
  onNavigate?: () => void;
}) {
  const headings = extractMarkdownHeadings(content).filter(
    (heading) => heading.level >= 2,
  );
  return (
    <section className="surface p-4">
      <p className="muted text-xs font-semibold tracking-widest uppercase">
        On this page
      </p>
      <h2 className="mt-1 mb-3 font-semibold">本章导航</h2>
      {headings.length ? (
        <nav>
          <ul className="space-y-1">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a
                  className={`block rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)] ${heading.id === activeId ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-strong)]" : "muted"}`}
                  style={{
                    paddingLeft: heading.level === 3 ? "1.25rem" : ".5rem",
                  }}
                  href={`#${heading.id}`}
                  aria-current={
                    heading.id === activeId ? "location" : undefined
                  }
                  onClick={onNavigate}
                >
                  {heading.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <p className="muted text-sm">本章暂无小标题</p>
      )}
    </section>
  );
}
