const latexSignal = /\\(?:[A-Za-z]+|[^A-Za-z\s])|[_^]\s*(?:\{|[A-Za-z0-9\\])/;

function looksLikeLatex(value: string): boolean {
  return latexSignal.test(value);
}

function normalizeProseMath(source: string): string {
  const protectedValues: string[] = [];
  const protect = (value: string) => {
    const token = `\uE000ALARKIVE_MATH_${protectedValues.length}\uE001`;
    protectedValues.push(value);
    return token;
  };

  // Existing Markdown math and inline code are already valid. Protect them so
  // compatibility normalization cannot reinterpret their contents.
  let output = source
    .replace(/(`+)([\s\S]*?)\1/g, (value) => protect(value))
    .replace(/\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\n])+\$/g, (value) =>
      protect(value),
    );

  // Standard LaTeX delimiters are common in AI responses, while remark-math
  // intentionally recognizes Markdown's dollar delimiters.
  output = output
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula: string) =>
      protect(`$$\n${formula.trim()}\n$$`),
    )
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula: string) =>
      protect(`$${formula.trim()}$`),
    );

  // Some rendered AI web pages lose the delimiter backslashes when copied,
  // leaving a formula between standalone [ and ] lines. Only convert blocks
  // with clear TeX signals; ordinary brackets, links and task lists stay text.
  output = output.replace(
    /(^|\n)[ \t]*\[[ \t]*\n([\s\S]*?)\n[ \t]*\][ \t]*(?=\n|$)/g,
    (match, prefix: string, formula: string) =>
      looksLikeLatex(formula)
        ? `${prefix}${protect(`$$\n${formula.trim()}\n$$`)}`
        : match,
  );

  // Handle compact variants such as [x_{u,t}\in R] and the frequently copied
  // parenthesized TeX command form (\tau=8). Single-letter prose like (T) is
  // deliberately left alone because it cannot be identified safely.
  output = output
    .replace(/\[([^\]\n]+)\](?!\()/g, (match, formula: string) =>
      looksLikeLatex(formula) ? protect(`$${formula.trim()}$`) : match,
    )
    .replace(
      /\(([^()\n]*\\[A-Za-z]+[^()\n]*)\)/g,
      (_match, formula: string) => `$${formula.trim()}$`,
    );

  return output.replace(
    /\uE000ALARKIVE_MATH_(\d+)\uE001/g,
    (_match, index: string) => protectedValues[Number(index)] ?? _match,
  );
}

/**
 * Normalize common AI-generated LaTeX delimiters for remark-math without
 * changing the stored Markdown. Fenced and inline code remain byte-for-byte
 * unchanged.
 */
export function normalizeMarkdownMath(content: string): string {
  const lines = content.split("\n");
  const output: string[] = [];
  let prose: string[] = [];
  let fence: { marker: "`" | "~"; length: number } | null = null;

  const flushProse = () => {
    if (!prose.length) return;
    output.push(...normalizeProseMath(prose.join("\n")).split("\n"));
    prose = [];
  };

  for (const line of lines) {
    const match = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (!fence && match) {
      flushProse();
      fence = {
        marker: match[1][0] as "`" | "~",
        length: match[1].length,
      };
      output.push(line);
      continue;
    }
    if (fence) {
      output.push(line);
      if (
        match &&
        match[1][0] === fence.marker &&
        match[1].length >= fence.length &&
        !match[2].trim()
      ) {
        fence = null;
      }
      continue;
    }
    prose.push(line);
  }
  flushProse();
  return output.join("\n");
}
