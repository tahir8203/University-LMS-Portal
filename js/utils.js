export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function setText(el, value) {
  if (el) el.textContent = value ?? "";
}

export function fmtDate(value) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value?.toDate?.() ?? new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export function studentKey(rollNo, name) {
  return `${(rollNo || "").trim().toLowerCase()}__${(name || "").trim().toLowerCase()}`;
}

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const [header, ...rows] = lines;
  const cols = header.split(",").map((v) => v.trim().toLowerCase());
  return rows.map((row) => {
    const vals = row.split(",").map((v) => v.trim());
    const obj = {};
    cols.forEach((c, i) => {
      obj[c] = vals[i] ?? "";
    });
    return obj;
  });
}

export function escapeHtml(value) {
  return (value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function uniqueById(items) {
  return Array.from(new Map(items.map((i) => [i.id, i])).values());
}
