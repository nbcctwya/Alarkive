import type { ChapterNode } from "@/types/chapters";

export function flattenTree(nodes: ChapterNode[]): ChapterNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}
