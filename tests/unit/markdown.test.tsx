import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { extractMarkdownHeadings, formatMarkdownSafely } from "@/lib/markdown";
import { normalizeMarkdownMath } from "@/lib/markdown-math";

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

  it("renders AI-style LaTeX delimiters and copied bracket formula blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        content={`Inline (\\tau=8) and \\(x^2\\).

[
x_{u,t}\\in\\mathbb{R}^{F}
]

[
(\\text{股票 }u,\\text{时间 }i)
]

[
L=\\sum_{u\\in S}(r_u-\\hat r_u)^2
]

[
\\lambda_{u,t}
=============

\\operatorname{softmax}
\\left(z_{u,t}^{\\top}W_\\lambda z_{u,T}\\right)
]

\\[
X\\overset{\\text{Gate}}{\\longrightarrow}H
\\]`}
      />,
    );

    expect(html.match(/class="katex/g)?.length).toBeGreaterThanOrEqual(6);
    expect(html).toContain("katex-display");
    expect(html).not.toContain("=============");
    expect(html).not.toContain("katex-error");
  });

  it("does not reinterpret code, links, task lists or ordinary brackets", () => {
    const source = `[
ordinary notes
]

Heading
${"=".repeat(7)}

[documentation](https://example.com)

- [x] task

\`(\\tau)\`

\`\`\`markdown
[
x_{u,t}\\in R
]
\`\`\``;

    expect(normalizeMarkdownMath(source)).toBe(source);
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
