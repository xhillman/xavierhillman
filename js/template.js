function escapeHtml(rawValue) {
  const value = String(rawValue ?? "");
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function applyTemplate(template, data, options = {}) {
  const safeKeys = new Set(options.safeKeys || ["content", "posts", "projects"]);
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    if (!(key in data)) return "";
    const value = data[key];
    return safeKeys.has(key) ? String(value ?? "") : escapeHtml(value);
  });
}