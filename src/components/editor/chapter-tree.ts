import type { ChapterNode } from "@/types/chapters";

export function flattenTree(nodes: ChapterNode[]): ChapterNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function removeNode(nodes: ChapterNode[], id: string): ChapterNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNode(node.children, id) }));
}

export function appendChild(
  nodes: ChapterNode[],
  parentId: string,
  child: ChapterNode,
): ChapterNode[] {
  return nodes.map((node) =>
    node.id === parentId
      ? { ...node, children: [...node.children, child] }
      : { ...node, children: appendChild(node.children, parentId, child) },
  );
}

export function moveNode(
  nodes: ChapterNode[],
  id: string,
  direction: -1 | 1,
): ChapterNode[] {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    const target = index + direction;
    if (target < 0 || target >= nodes.length) return nodes;
    const copy = [...nodes];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    return copy.map((node, orderIndex) => ({ ...node, orderIndex }));
  }
  return nodes.map((node) => ({
    ...node,
    children: moveNode(node.children, id, direction),
  }));
}

export function renameNode(
  nodes: ChapterNode[],
  id: string,
  title: string,
): ChapterNode[] {
  return nodes.map((node) =>
    node.id === id
      ? { ...node, title }
      : { ...node, children: renameNode(node.children, id, title) },
  );
}
