import { Marked, type Tokens } from 'marked';

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

/**
 * Minimal token-based syntax highlighter for code blocks.
 * Groups common keywords and applies coloured spans — no external dependency needed.
 */
function highlightCode(code: string, lang: string): string {
  const escaped = escapeHtml(code);
  // Only apply keyword highlighting for known languages
  const knownLangs = /^(js|javascript|ts|typescript|py|python|java|c|cpp|cs|csharp|go|rust|kotlin|swift|bash|sh|sql|html|css|json|yaml|yml|xml|r|ruby|rb|php)$/i;
  if (!knownLangs.test(lang)) return escaped;

  type TokenDef = { pattern: RegExp; className: string };
  const tokenDefs: TokenDef[] = [
    // String literals (double-quote, single-quote, template literal, triple-quoted py)
    { pattern: /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, className: 'hl-string' },
    // Line comments
    { pattern: /\/\/[^\n]*|#[^\n]*/g, className: 'hl-comment' },
    // Block comments
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'hl-comment' },
    // Numbers
    { pattern: /\b0x[\da-fA-F]+|\b\d+(\.\d+)?([eE][+-]?\d+)?\b/g, className: 'hl-number' },
    // Common keywords (works across JS/TS/Python/Java/C/Go/Rust/SQL)
    {
      pattern: /\b(abstract|and|as|assert|async|await|base|break|case|catch|class|const|continue|debugger|declare|def|default|del|delete|do|elif|else|enum|except|export|extends|finally|for|from|func|fun|function|global|goto|if|implements|import|in|instanceof|interface|is|lambda|let|match|module|namespace|new|nil|None|not|null|object|of|or|override|package|pass|private|protected|public|raise|readonly|return|select|self|static|struct|super|switch|this|throw|throws|trait|try|type|typeof|undefined|unless|until|use|val|var|virtual|void|where|while|with|yield)\b/g,
      className: 'hl-keyword',
    },
    // Built-in functions / types
    {
      pattern: /\b(Array|Boolean|Buffer|console|Date|document|Error|Exception|False|Float|function|int|Integer|List|Map|Math|Number|Object|print|println|Promise|Set|String|True|TypeError|undefined|window)\b/g,
      className: 'hl-builtin',
    },
  ];

  // We tokenize by finding non-overlapping matches in priority order
  // Use a replacement map to avoid double-encoding HTML
  interface Chunk { start: number; end: number; className: string }
  const chunks: Chunk[] = [];
  for (const { pattern, className } of tokenDefs) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(escaped)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      // Only add if it doesn't overlap with an existing higher-priority match
      if (!chunks.some((c) => start < c.end && end > c.start)) {
        chunks.push({ start, end, className });
      }
    }
  }
  if (!chunks.length) return escaped;
  chunks.sort((a, b) => a.start - b.start);
  let result = '';
  let pos = 0;
  for (const chunk of chunks) {
    if (chunk.start > pos) result += escaped.slice(pos, chunk.start);
    result += `<span class="${chunk.className}">${escaped.slice(chunk.start, chunk.end)}</span>`;
    pos = chunk.end;
  }
  result += escaped.slice(pos);
  return result;
}

export async function renderMarkdownHtml(markdown: string): Promise<string> {
  const renderer = new Marked({ gfm: true, breaks: false });
  renderer.use({
    renderer: {
      html({ text }) {
        // Sanitize raw HTML blocks — escape them so they appear as literal text
        return escapeHtml(text);
      },
      link({ href, title, text }) {
        if (!safeUrl(href)) return escapeHtml(text);
        const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
        return `<a href="${escapeHtml(href)}"${titleAttribute}>${text}</a>`;
      },
      image({ href, title, text }) {
        if (!safeUrl(href)) return escapeHtml(text);
        const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttribute} loading="eager">`;
      },
      // Code blocks: apply syntax highlighting
      code({ text, lang }) {
        const language = (lang || '').split(/[\s{]/)[0].toLowerCase();
        const highlighted = highlightCode(text, language);
        const langLabel = language
          ? `<span class="code-lang">${escapeHtml(language)}</span>`
          : '';
        return `<pre class="code-block">${langLabel}<code class="lang-${escapeHtml(language)}">${highlighted}</code></pre>`;
      },
      // GFM task list items
      listitem(token: Tokens.ListItem) {
        let body = token.text ?? '';
        let checkbox = '';
        // GFM task list: starts with [ ] or [x]
        const taskMatch = /^\[([ xX])\]\s+/.exec(body);
        if (taskMatch) {
          const checked = taskMatch[1].toLowerCase() === 'x';
          checkbox = `<input type="checkbox" class="task-checkbox" disabled${checked ? ' checked' : ''}> `;
          body = body.slice(taskMatch[0].length);
        }
        return `<li>${checkbox}${body}</li>`;
      },
    },
  });
  const body = await renderer.parse(markdown);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
/* ── Page layout ── */
@page{size:612pt 792pt;margin:54pt 54pt 54pt 54pt}
html,body{margin:0;padding:0;background:#fff;color:#1a1a2e;font-family:Georgia,"Times New Roman",serif;font-size:11.5pt;line-height:1.65}
body{width:612pt;box-sizing:border-box}

/* ── Headings ── */
h1{font-size:22pt;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;border-bottom:2pt solid #1a1a2e;padding-bottom:4pt;margin:0 0 14pt;page-break-after:avoid;break-after:avoid;font-weight:700}
h2{font-size:17pt;font-family:Arial,Helvetica,sans-serif;color:#2d3a6e;border-bottom:1pt solid #c0c8e8;padding-bottom:3pt;margin:18pt 0 10pt;page-break-after:avoid;break-after:avoid;font-weight:700}
h3{font-size:14pt;font-family:Arial,Helvetica,sans-serif;color:#3a4a80;margin:16pt 0 8pt;page-break-after:avoid;break-after:avoid;font-weight:600}
h4{font-size:12pt;font-family:Arial,Helvetica,sans-serif;color:#4a5a90;margin:14pt 0 6pt;page-break-after:avoid;break-after:avoid;font-weight:600}
h5{font-size:11.5pt;font-family:Arial,Helvetica,sans-serif;color:#5a6aa0;margin:12pt 0 5pt;page-break-after:avoid;break-after:avoid;font-weight:600}
h6{font-size:11pt;font-family:Arial,Helvetica,sans-serif;color:#6a7aaa;margin:10pt 0 4pt;page-break-after:avoid;break-after:avoid;font-weight:600}

/* ── Body text ── */
p{margin:0 0 9pt;orphans:2;widows:2}
ul,ol{margin:0 0 9pt;padding-left:20pt}
li{margin-bottom:4pt}
li>ul,li>ol{margin-top:3pt;margin-bottom:3pt}

/* ── Task list ── */
.task-checkbox{margin-right:4pt;vertical-align:middle;accent-color:#2d3a6e}
li:has(.task-checkbox){list-style:none;margin-left:-16pt}

/* ── Blockquote ── */
blockquote{border-left:3.5pt solid #4a6fa5;margin:10pt 0;padding:8pt 12pt;background:#f0f4fa;color:#3a4a70;font-style:italic}
blockquote p{margin:0}

/* ── Code ── */
code{font-family:"Cascadia Code","Fira Mono","Courier New",monospace;font-size:9.5pt;background:#f1f3f8;border:0.5pt solid #d0d6e8;border-radius:2pt;padding:1pt 3pt}
.code-block{position:relative;white-space:pre-wrap;overflow-wrap:anywhere;background:#f8f9fc;border:1pt solid #d0d6e8;border-left:3pt solid #4a6fa5;border-radius:4pt;padding:10pt 12pt 10pt 12pt;margin:0 0 10pt;page-break-inside:avoid;break-inside:avoid;font-size:9pt}
.code-block code{background:transparent;border:none;padding:0;font-size:9pt}
.code-lang{position:absolute;top:3pt;right:6pt;font-size:7.5pt;color:#888;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5pt}

/* ── Syntax highlighting ── */
.hl-keyword{color:#0033a0;font-weight:600}
.hl-string{color:#006400}
.hl-comment{color:#808080;font-style:italic}
.hl-number{color:#a31515}
.hl-builtin{color:#0070c0}

/* ── Tables ── */
table{width:100%;border-collapse:collapse;margin:0 0 10pt;table-layout:auto;page-break-inside:auto;break-inside:auto;font-size:10.5pt}
thead{display:table-header-group;background:#2d3a6e;color:#fff}
thead th{color:#fff;font-weight:600;padding:6pt 8pt;border:1pt solid #2d3a6e;text-align:left;vertical-align:top}
tbody tr:nth-child(even){background:#f0f4fa}
tbody tr:nth-child(odd){background:#fff}
td{border:1pt solid #b0bcd0;padding:5pt 8pt;text-align:left;vertical-align:top}
tr{page-break-inside:avoid;break-inside:avoid}

/* ── Misc ── */
a{color:#1a4fa0;text-decoration:underline}
hr{border:0;border-top:1.5pt solid #c0c8d0;margin:14pt 0}
img{max-width:100%;height:auto;display:block;margin:8pt auto;page-break-inside:avoid;break-inside:avoid}
del{text-decoration:line-through;color:#888}
ins{text-decoration:underline;color:#226622}
mark{background:#fff59d;padding:1pt 2pt}
strong{font-weight:700}
em{font-style:italic}
abbr{text-decoration:underline dotted;cursor:help}
</style></head><body>${body}</body></html>`;
}
