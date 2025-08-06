

export function applyTemplate(template, data) {
    return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    return key in data ? data[key] : '';
  });
}