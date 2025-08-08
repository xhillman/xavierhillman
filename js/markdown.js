import fs from "fs";
import matter from "gray-matter";
import { marked } from "marked";

export function normalizeSlug(input) {
  return String(input || "").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function renderMarkdown(markdownString) {
  return marked(markdownString || "");
}

export function parseMarkdownFile(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);
  const html = renderMarkdown(content);

  const fileName = filePath.split(/[/\\]/).pop() || "";
  const baseName = fileName.replace(/\.md$/i, "");
  const normalizedSlug = normalizeSlug(data.slug || baseName);
  const parsedDate = data.date ? new Date(data.date) : null;

  return {
    data: {
      ...data,
      slug: normalizedSlug,
      date: parsedDate,
      pageTitle: data.metaTitle || data.title || "",
      metaDescription: data.metaDescription || data.description || "",
    },
    html,
  };
}

export function loadCollection(directoryPath) {
  if (!fs.existsSync(directoryPath)) return [];

  const files = fs.readdirSync(directoryPath).filter((f) => f.endsWith(".md"));

  const items = files
    .map((file) => parseMarkdownFile(`${directoryPath}/${file}`))
    .map(({ data, html }) => ({ ...data, html }))
    .filter((item) => !!item.slug);

  // Warn on duplicate slugs
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.slug)) {
      console.warn(`Duplicate slug detected: ${item.slug}. Later items may overwrite earlier ones.`);
    } else {
      seen.add(item.slug);
    }
  }

  // Sort: by date desc when present, otherwise by title asc
  items.sort((a, b) => {
    if (a.date && b.date) return b.date - a.date;
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  return items;
}
