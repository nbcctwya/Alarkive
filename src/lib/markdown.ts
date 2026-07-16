import GithubSlugger from "github-slugger";

type MarkdownNode = {
  type?: string;
  value?: string;
  children?: MarkdownNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
};

const calloutTypes = new Set([
  "NOTE",
  "TIP",
  "IMPORTANT",
  "WARNING",
  "CAUTION",
]);

export function remarkCallouts() {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (node.type === "blockquote") {
        const firstText = node.children?.[0]?.children?.[0];
        const match = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i.exec(
          firstText?.value ?? "",
        );
        const type = match?.[1].toUpperCase();
        if (firstText && match && type && calloutTypes.has(type)) {
          firstText.value = (firstText.value ?? "").slice(match[0].length);
          node.data = {
            ...node.data,
            hName: "aside",
            hProperties: {
              className: [
                "markdown-callout",
                `markdown-callout-${type.toLowerCase()}`,
              ],
              "data-callout": type.toLowerCase(),
            },
          };
        }
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .trim();
}

export interface MarkdownHeading {
  level: number;
  title: string;
  id: string;
}

export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
  const slugger = new GithubSlugger();
  const headings: MarkdownHeading[] = [];
  let fence: { marker: string; length: number } | null = null;
  for (const line of content.split("\n")) {
    const fenceMatch = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = { marker, length: fenceMatch[1].length };
      else if (
        fence.marker === marker &&
        fenceMatch[1].length >= fence.length &&
        !fenceMatch[2].trim()
      )
        fence = null;
      continue;
    }
    if (fence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const title = stripInlineMarkdown(match[2]);
    if (title) {
      headings.push({
        level: match[1].length,
        title,
        id: slugger.slug(title),
      });
    }
  }
  return headings;
}

export interface MarkdownFormatResult {
  formatted: string;
  changes: string[];
}

export function formatMarkdownSafely(content: string): MarkdownFormatResult {
  const changes = new Set<string>();
  const source = content
    .replace(/^\uFEFF/, () => {
      changes.add("移除文件开头的 BOM");
      return "";
    })
    .replace(/[\u200B-\u200D\u2060]/g, () => {
      changes.add("移除网页复制产生的不可见字符");
      return "";
    });
  const output: string[] = [];
  let fence: { marker: "`" | "~"; length: number } | null = null;
  let blankCount = 0;

  for (const originalLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    let line = originalLine;
    const fenceMatch = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      const marker = fenceMatch?.[1][0] as "`" | "~" | undefined;
      if (
        fenceMatch &&
        marker === fence.marker &&
        fenceMatch[1].length >= fence.length &&
        !fenceMatch[2].trim()
      ) {
        const normalized = marker.repeat(fenceMatch[1].length);
        if (line !== normalized) changes.add("规范代码围栏和语言标识");
        output.push(normalized);
        fence = null;
        blankCount = 0;
      } else {
        output.push(line);
      }
      continue;
    }
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as "`" | "~";
      fence = { marker, length: fenceMatch[1].length };
      const language = fenceMatch[2].trim().replace(/^\{?\.?|\}?$/g, "");
      const normalized = `${marker.repeat(fence.length)}${language}`;
      if (line !== normalized) changes.add("规范代码围栏和语言标识");
      output.push(normalized);
      blankCount = 0;
      continue;
    }

    line = line
      .replace(/^([\t　]+)/, (indent) => {
        changes.add("规范列表前的制表符和全角空格");
        return indent.replace(/\t/g, "  ").replace(/　/g, "  ");
      })
      .replace(/\u00a0/g, () => {
        changes.add("将异常空格替换为普通空格");
        return " ";
      })
      .replace(/[ \t]+$/g, () => {
        changes.add("移除无意义的行尾空格");
        return "";
      });

    line = line.replace(
      /(?<!\$)\$[ \t]+([^$\n]+?)[ \t]+\$(?!\$)/g,
      (_match, formula: string) => {
        changes.add("整理行内公式边界空格");
        return `$${formula.trim()}$`;
      },
    );

    if (!line.trim()) {
      blankCount += 1;
      if (blankCount > 2) {
        changes.add("压缩连续多余空行");
        continue;
      }
    } else {
      blankCount = 0;
    }
    output.push(line);
  }

  const formatted = output.join("\n").replace(/\n{3,}$/g, "\n");
  return { formatted, changes: [...changes] };
}
