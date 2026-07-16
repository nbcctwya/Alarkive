const windowsReservedName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export function safeFileName(value: string, fallback = "untitled"): string {
  let name = value
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
  if (!name || windowsReservedName.test(name)) name = fallback;
  return [...name].slice(0, 80).join("");
}

export function isSafeArchivePath(value: string): boolean {
  if (!value || value.startsWith("/") || value.startsWith("\\")) return false;
  const normalized = value.replace(/\\/g, "/");
  return !normalized.split("/").some((part) => part === ".." || part === "");
}
