import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { extractMarkdownHeadings, formatMarkdownSafely } from "@/lib/markdown";

describe("Markdown rendering", () => {
  it("renders callouts, formulas, task lists, images and language-labelled code", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        content={`# Title

> [!WARNING]
> Check this result.

- [x] verified

![diagram](/assets/example.png)

Inline $x^2$.

$$
\\sum_{i=1}^n i
$$

\`\`\`typescript
const answer = 42;
\`\`\``}
      />,
    );

    expect(html).toContain("markdown-callout-warning");
    expect(html).not.toContain("[!WARNING]");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("katex");
    expect(html).toContain("typescript");
    expect(html).toContain("language-typescript");
  });

  it("creates stable, unique heading ids while ignoring fenced code headings", () => {
    const headings = extractMarkdownHeadings(`# **Overview**
## Overview
\`\`\`
## Not a heading
\`\`\`
#### Details`);
    expect(headings).toEqual([
      { level: 1, title: "Overview", id: "overview" },
      { level: 2, title: "Overview", id: "overview-1" },
      { level: 4, title: "Details", id: "details" },
    ]);
  });
});

describe("safe Markdown formatting", () => {
  it("normalizes copied noise without changing fenced code content", () => {
    const input =
      "\uFEFF# Title\u200B   \n\n\n\n\t- item\u00a0text\n\n``` python  \nconst value = '  keep  ';  \n```   \n\n$x$";
    const result = formatMarkdownSafely(input);

    expect(result.formatted).toContain("# Title");
    expect(result.formatted).toContain("  - item text");
    expect(result.formatted).toContain("```python");
    expect(result.formatted).toContain("const value = '  keep  ';  ");
    expect(result.changes.length).toBeGreaterThan(3);
  });

  it("preserves long fences that protect nested backticks", () => {
    const input = "```` markdown  \n```js\ninside\n```\n````   ";
    const result = formatMarkdownSafely(input);
    expect(result.formatted).toBe("````markdown\n```js\ninside\n```\n````");
  });
});
