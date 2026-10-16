// 快捷方式的网址处理。

/** 补全协议并校验，无效时返回 null。 */
export function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (!/^https?:$/.test(url.protocol) || !url.hostname) return null;
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    return url.href;
  } catch {
    return null;
  }
}

/** 从网址推一个默认名称：github.com → Github */
export function nameFromUrl(href: string): string {
  const host = new URL(href).hostname.replace(/^www\./, '');
  const label = host.split('.')[0] ?? host;
  return label.charAt(0).toUpperCase() + label.slice(1);
}
