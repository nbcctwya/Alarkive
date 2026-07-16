"use client";

import { Check, Copy } from "lucide-react";
import {
  Children,
  createElement,
  isValidElement,
  useState,
  type ReactNode,
} from "react";
import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import GithubSlugger from "github-slugger";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkCallouts } from "@/lib/markdown";

function textContent(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement(child)
          ? textContent(
              (child.props as { children?: ReactNode }).children ?? "",
            )
          : "",
    )
    .join("");
}

function Pre({ children }: { children?: ReactNode }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const code = isValidElement<{ children?: ReactNode }>(children)
    ? String(children.props.children).replace(/\n$/, "")
    : String(children ?? "");
  const language = isValidElement<{ className?: string }>(children)
    ? children.props.className?.replace(/^language-/, "")
    : undefined;

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(code);
      else {
        const textarea = window.document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        window.document.body.append(textarea);
        textarea.select();
        const copied = window.document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("copy command failed");
      }
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <div className="group relative">
      {language && (
        <span className="absolute top-2 left-3 z-10 text-[11px] font-medium tracking-wide text-white/45 uppercase">
          {language}
        </span>
      )}
      <button
        className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs text-white/75 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
        onClick={copy}
        type="button"
        aria-live="polite"
      >
        {copyState === "copied" ? <Check size={13} /> : <Copy size={13} />}{" "}
        {copyState === "copied"
          ? "已复制"
          : copyState === "failed"
            ? "复制失败"
            : "复制"}
      </button>
      <pre>{children}</pre>
    </div>
  );
}

function createComponents(): Components {
  const slugger = new GithubSlugger();
  const heading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    const HeadingComponent = ({ children }: { children?: ReactNode }) =>
      createElement(
        `h${level}`,
        { id: slugger.slug(textContent(children)) },
        children,
      );
    HeadingComponent.displayName = `MarkdownHeading${level}`;
    return HeadingComponent;
  };
  return {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ),
    pre: ({ children }) => <Pre>{children}</Pre>,
    table: ({ children }) => (
      <div className="table-wrap">
        <table>{children}</table>
      </div>
    ),
    img: ({ src, alt }) => (
      // Markdown images have user-provided URLs and no known dimensions, so
      // next/image cannot safely infer an optimization contract here.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ""} loading="lazy" />
    ),
  };
}

export function MarkdownRenderer({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const components = createComponents();
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkCallouts]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
