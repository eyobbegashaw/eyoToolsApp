import { Marked } from 'marked';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url: string): boolean {
  return /^(https?:|mailto:|\/|#|\.\/|\.\.\/)/i.test(url) &&
    !/[\u0000-\u001f]/.test(url);
}

export async function renderMarkdownHtml(markdown: string): Promise<string> {
  const renderer = new Marked({ gfm: true });
  renderer.use({
    renderer: {
      html({ text }) {
        return escapeHtml(text);
      },
      link({ href, title, text }) {
        if (!safeUrl(href)) return text;
        const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
        return `<a href="${escapeHtml(href)}"${titleAttribute}>${text}</a>`;
      },
      image({ href, title, text }) {
        if (!safeUrl(href)) return escapeHtml(text);
        const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttribute}>`;
      },
    },
  });
  const body = await renderer.parse(markdown);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:612pt 792pt;margin:54pt}
html,body{margin:0;padding:0;background:#fff;color:#202124;font-family:Arial,sans-serif;font-size:11pt;line-height:1.5}
body{width:612pt;box-sizing:border-box}
h1,h2,h3,h4,h5,h6{line-height:1.2;margin:18pt 0 8pt;page-break-after:avoid;break-after:avoid}
p,ul,ol,blockquote,pre,table{margin:0 0 10pt}
ul,ol{padding-left:24pt}
blockquote{border-left:3pt solid #9ca3af;padding-left:12pt;color:#4b5563}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f4f6;padding:10pt;border-radius:4pt}
code{font-family:monospace;background:#f3f4f6}
pre code{background:transparent}
table{width:100%;border-collapse:collapse;table-layout:auto}
th,td{border:1px solid #9ca3af;padding:5pt;text-align:left;vertical-align:top}
thead{display:table-header-group}
tr,img{break-inside:avoid}
a{color:#075985;text-decoration:underline}
hr{border:0;border-top:1px solid #9ca3af;margin:16pt 0}
img{max-width:100%;height:auto}
</style></head><body>${body}</body></html>`;
}
