import { DOMParser, type Document as XmlDocument, type Element as XmlElement } from '@xmldom/xmldom';
import { strFromU8 } from 'fflate';

type OfficeEntries = Record<string, Uint8Array>;
type XmlParent = XmlDocument | XmlElement;

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const PRESENTATION_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const RELATIONSHIPS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const WORD_DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';

function parseXml(xml: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('The Office document contains malformed XML.');
  }
  return document;
}

function elements(node: XmlParent | undefined, namespace: string, localName: string): XmlElement[] {
  if (!node) return [];
  return Array.from(node.childNodes).filter(
    (child): child is XmlElement =>
      child.nodeType === 1 &&
      (child as XmlElement).namespaceURI === namespace &&
      (child as XmlElement).localName === localName
  );
}

function descendants(node: XmlParent | undefined, namespace: string, localName: string): XmlElement[] {
  if (!node) return [];
  return Array.from(node.getElementsByTagNameNS(namespace, localName));
}

function first(node: XmlParent | undefined, namespace: string, localName: string): XmlElement | undefined {
  return elements(node, namespace, localName)[0];
}

function attribute(node: XmlElement | undefined, name: string, namespace?: string): string {
  if (!node) return '';
  return namespace ? node.getAttributeNS(namespace, name) || '' : node.getAttribute(name) || '';
}

function xmlText(node: XmlParent, namespace: string, localName: string): string {
  return descendants(node, namespace, localName).map((text) => text.textContent || '').join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function base64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const firstByte = bytes[i];
    const secondByte = bytes[i + 1];
    const thirdByte = bytes[i + 2];
    result += alphabet[firstByte >> 2];
    result += alphabet[((firstByte & 3) << 4) | ((secondByte ?? 0) >> 4)];
    result += secondByte === undefined
      ? '=='
      : `${alphabet[((secondByte & 15) << 2) | ((thirdByte ?? 0) >> 6)]}${thirdByte === undefined ? '=' : alphabet[thirdByte & 63]}`;
  }
  return result;
}

function mimeType(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'svg') return 'image/svg+xml';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'bmp') return 'image/bmp';
  return 'image/png';
}

function resolveTarget(sourcePath: string, target: string): string {
  const segments = target.startsWith('/') ? [] : sourcePath.split('/').slice(0, -1);
  for (const segment of target.replace(/^\/+/, '').split('/')) {
    if (segment === '..') segments.pop();
    else if (segment !== '.' && segment) segments.push(segment);
  }
  return segments.join('/');
}

function relationships(entries: OfficeEntries, sourcePath: string): Map<string, string> {
  const fileName = sourcePath.split('/').pop() || '';
  const directory = sourcePath.split('/').slice(0, -1).join('/');
  const relsPath = `${directory}/_rels/${fileName}.rels`;
  const rels = entries[relsPath];
  if (!rels) return new Map();

  const document = parseXml(strFromU8(rels));
  const result = new Map<string, string>();
  for (const relation of Array.from(document.getElementsByTagName('*'))) {
    const id = attribute(relation, 'Id');
    const target = attribute(relation, 'Target');
    if (id && target) {
      result.set(
        id,
        attribute(relation, 'TargetMode') === 'External'
          ? target
          : resolveTarget(sourcePath, target)
      );
    }
  }
  return result;
}

function imageDataUri(entries: OfficeEntries, path: string | undefined): string {
  if (!path || !entries[path]) return '';
  return `data:${mimeType(path)};base64,${base64(entries[path])}`;
}

// ─── Named Word highlight colours ──────────────────────────────────────────────
const WORD_HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff',
  blue: '#0000ff', red: '#ff0000', darkBlue: '#00008b', darkCyan: '#008b8b',
  darkGreen: '#006400', darkMagenta: '#8b008b', darkRed: '#8b0000',
  darkYellow: '#808000', darkGray: '#a9a9a9', lightGray: '#d3d3d3',
  black: '#000000', white: '#ffffff', none: '',
};

// ─── Border side helper ─────────────────────────────────────────────────────────
function wordBorderStyle(borderEl: XmlElement | undefined): string {
  if (!borderEl) return '';
  const val = attribute(borderEl, 'val', WORD_NS);
  if (!val || val === 'none' || val === 'nil') return 'none';
  const sz = Number(attribute(borderEl, 'sz', WORD_NS)) / 8; // eighths of a pt → pt
  const color = attribute(borderEl, 'color', WORD_NS);
  const cssColor = color && color !== 'auto' ? `#${color}` : '#000';
  const width = sz > 0 ? sz : 1;
  const style = val === 'dashed' ? 'dashed' : val === 'dotted' ? 'dotted' : val === 'double' ? 'double' : 'solid';
  return `${width}pt ${style} ${cssColor}`;
}

function wordParagraphBorders(properties: XmlElement | undefined): string[] {
  if (!properties) return [];
  const pBdr = first(properties, WORD_NS, 'pBdr');
  if (!pBdr) return [];
  const styles: string[] = [];
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const border = first(pBdr, WORD_NS, side);
    const css = wordBorderStyle(border);
    if (css) styles.push(`border-${side}:${css}`);
  }
  return styles;
}

// ─── Run properties ──────────────────────────────────────────────────────────
function wordRunPropertiesStyle(properties: XmlElement | undefined): string {
  if (!properties) return '';
  const styles: string[] = [];
  if (first(properties, WORD_NS, 'b')) styles.push('font-weight:bold');
  if (first(properties, WORD_NS, 'i')) styles.push('font-style:italic');
  if (first(properties, WORD_NS, 'strike') || first(properties, WORD_NS, 'dstrike')) {
    styles.push('text-decoration:line-through');
  }
  const underline = first(properties, WORD_NS, 'u');
  if (underline && attribute(underline, 'val', WORD_NS) !== 'none') {
    styles.push('text-decoration:underline');
  }

  // Highlight: may be a named colour
  const highlight = first(properties, WORD_NS, 'highlight');
  if (highlight) {
    const val = attribute(highlight, 'val', WORD_NS);
    const hex = WORD_HIGHLIGHT_COLORS[val] ?? (val && !['auto', 'none'].includes(val) ? `#${val}` : '');
    if (hex) styles.push(`background-color:${hex}`);
  }
  // Run shading (background on the run)
  const runShd = first(properties, WORD_NS, 'shd');
  if (runShd) {
    const fill = attribute(runShd, 'fill', WORD_NS);
    if (fill && fill !== 'auto') styles.push(`background-color:#${fill}`);
  }

  const color = attribute(first(properties, WORD_NS, 'color'), 'val', WORD_NS);
  if (color && color !== 'auto') styles.push(`color:#${color}`);
  const size = Number(attribute(first(properties, WORD_NS, 'sz'), 'val', WORD_NS));
  if (size > 0) styles.push(`font-size:${size / 2}pt`);
  const szCs = Number(attribute(first(properties, WORD_NS, 'szCs'), 'val', WORD_NS));
  if (szCs > 0 && size <= 0) styles.push(`font-size:${szCs / 2}pt`);

  // Font
  const rFonts = first(properties, WORD_NS, 'rFonts');
  const font = attribute(rFonts, 'ascii', WORD_NS) ||
    attribute(rFonts, 'hAnsi', WORD_NS) ||
    attribute(rFonts, 'cs', WORD_NS);
  if (font) styles.push(`font-family:${JSON.stringify(font)}`);

  // Vertical alignment (super/sub)
  const verticalAlign = attribute(first(properties, WORD_NS, 'vertAlign'), 'val', WORD_NS);
  if (verticalAlign === 'superscript') styles.push('vertical-align:super;font-size:0.75em');
  if (verticalAlign === 'subscript') styles.push('vertical-align:sub;font-size:0.75em');

  // Character spacing
  const spacing = Number(attribute(first(properties, WORD_NS, 'spacing'), 'val', WORD_NS));
  if (spacing !== 0 && Number.isFinite(spacing)) styles.push(`letter-spacing:${spacing / 20}pt`);

  // Small caps / all caps
  if (first(properties, WORD_NS, 'smallCaps')) styles.push('font-variant:small-caps');
  if (first(properties, WORD_NS, 'caps')) styles.push('text-transform:uppercase');

  return styles.join(';');
}

function wordStyleChain(styleId: string, styleDefinitions: Map<string, WordStyle>): WordStyle[] {
  const chain: WordStyle[] = [];
  const seen = new Set<string>();
  let current = styleId;
  while (current && !seen.has(current)) {
    seen.add(current);
    const style = styleDefinitions.get(current);
    if (!style) break;
    chain.unshift(style);
    current = style.basedOn;
  }
  return chain;
}

function wordRunStyle(run: XmlElement, styleDefinitions: Map<string, WordStyle>): string {
  const styleId = attribute(first(first(run, WORD_NS, 'rPr') || run, WORD_NS, 'rStyle'), 'val', WORD_NS);
  const inherited = wordStyleChain(styleId, styleDefinitions)
    .map((style) => wordRunPropertiesStyle(first(style.element, WORD_NS, 'rPr')))
    .filter(Boolean);
  const direct = wordRunPropertiesStyle(first(run, WORD_NS, 'rPr'));
  return [...inherited, direct].filter(Boolean).join(';');
}

type WordStyle = { name: string; basedOn: string; element: XmlElement };
type WordNumberLevel = {
  format: string;
  text: string;
  start: number;
  indent: number;
  hanging: number;
};

function readWordStyles(entries: OfficeEntries): Map<string, WordStyle> {
  const data = entries['word/styles.xml'];
  const styles = new Map<string, WordStyle>();
  if (!data) return styles;
  const document = parseXml(strFromU8(data));
  for (const style of descendants(document, WORD_NS, 'style')) {
    const id = attribute(style, 'styleId', WORD_NS);
    if (!id) continue;
    styles.set(id, {
      name: attribute(first(style, WORD_NS, 'name'), 'val', WORD_NS),
      basedOn: attribute(first(style, WORD_NS, 'basedOn'), 'val', WORD_NS),
      element: style,
    });
  }
  return styles;
}

function readWordNumbering(entries: OfficeEntries): Map<string, Map<number, WordNumberLevel>> {
  const data = entries['word/numbering.xml'];
  const result = new Map<string, Map<number, WordNumberLevel>>();
  if (!data) return result;
  const document = parseXml(strFromU8(data));
  const abstractNumbers = new Map<string, Map<number, WordNumberLevel>>();
  for (const abstractNum of descendants(document, WORD_NS, 'abstractNum')) {
    const abstractId = attribute(abstractNum, 'abstractNumId', WORD_NS);
    const levels = new Map<number, WordNumberLevel>();
    for (const level of elements(abstractNum, WORD_NS, 'lvl')) {
      const index = Number(attribute(level, 'ilvl', WORD_NS)) || 0;
      const properties = first(level, WORD_NS, 'pPr');
      const indentation = first(properties || level, WORD_NS, 'ind');
      const leftPt = Number(attribute(indentation, 'left', WORD_NS)) / 20 || (index + 1) * 36;
      const hangingPt = Number(attribute(indentation, 'hanging', WORD_NS)) / 20 || 18;
      levels.set(index, {
        format: attribute(first(level, WORD_NS, 'numFmt'), 'val', WORD_NS) || 'bullet',
        text: attribute(first(level, WORD_NS, 'lvlText'), 'val', WORD_NS) || '•',
        start: Number(attribute(first(level, WORD_NS, 'start'), 'val', WORD_NS)) || 1,
        indent: leftPt,
        hanging: hangingPt,
      });
    }
    abstractNumbers.set(abstractId, levels);
  }
  for (const number of descendants(document, WORD_NS, 'num')) {
    const numberId = attribute(number, 'numId', WORD_NS);
    const abstractId = attribute(first(number, WORD_NS, 'abstractNumId'), 'val', WORD_NS);
    const levels = abstractNumbers.get(abstractId);
    if (numberId && levels) result.set(numberId, levels);
  }
  return result;
}

function numberLabel(value: number, format: string): string {
  if (format === 'lowerLetter' || format === 'upperLetter') {
    let remainder = Math.max(1, value);
    let label = '';
    while (remainder > 0) {
      remainder -= 1;
      label = String.fromCharCode(97 + (remainder % 26)) + label;
      remainder = Math.floor(remainder / 26);
    }
    return format === 'upperLetter' ? label.toUpperCase() : label;
  }
  if (format === 'lowerRoman' || format === 'upperRoman') {
    let remainder = Math.max(1, value);
    const numerals: Array<[number, string]> = [
      [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'],
      [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'],
      [5, 'v'], [4, 'iv'], [1, 'i'],
    ];
    let label = '';
    for (const [amount, numeral] of numerals) {
      while (remainder >= amount) {
        label += numeral;
        remainder -= amount;
      }
    }
    return format === 'upperRoman' ? label.toUpperCase() : label;
  }
  return String(value);
}

function wordListPrefix(
  numberId: string,
  level: number,
  definitions: Map<string, Map<number, WordNumberLevel>>,
  counters: Map<string, number>
): { text: string; indent: number; hanging: number } {
  const definition = definitions.get(numberId);
  const info = definition?.get(level) || { format: 'bullet', text: '•', start: 1, indent: (level + 1) * 36, hanging: 18 };
  const key = `${numberId}:${level}`;
  const count = (counters.get(key) ?? info.start - 1) + 1;
  counters.set(key, count);
  for (let deeper = level + 1; deeper < 9; deeper += 1) {
    counters.delete(`${numberId}:${deeper}`);
  }
  let text = info.text;
  for (let index = 0; index <= level; index += 1) {
    const levelInfo = definition?.get(index);
    if (!levelInfo) continue;
    const levelCount = index === level ? count : counters.get(`${numberId}:${index}`) || levelInfo.start;
    text = text.replace(`%${index + 1}`, numberLabel(levelCount, levelInfo.format));
  }
  return { text, indent: info.indent, hanging: info.hanging };
}

function wordInline(
  node: XmlElement,
  rels: Map<string, string>,
  entries: OfficeEntries,
  styleDefinitions: Map<string, WordStyle>
): string {
  if (node.namespaceURI === WORD_NS && node.localName === 't') {
    return escapeHtml(node.textContent || '');
  }
  if (node.namespaceURI === WORD_NS && node.localName === 'tab') return '&emsp;';
  if (node.namespaceURI === WORD_NS && (node.localName === 'br' || node.localName === 'cr')) {
    return attribute(node, 'type', WORD_NS) === 'page'
      ? '<br class="word-page-break">'
      : '<br>';
  }
  if (node.namespaceURI === DRAWING_NS && node.localName === 'blip') {
    const path = rels.get(attribute(node, 'embed', RELATIONSHIPS_NS));
    const uri = imageDataUri(entries, path);
    if (!uri) return '';
    let ancestor = node.parentNode;
    let extent: XmlElement | undefined;
    while (ancestor && !extent) {
      if (ancestor.nodeType === 1) {
        extent = descendants(ancestor as XmlElement, WORD_DRAWING_NS, 'extent')[0];
      }
      ancestor = ancestor.parentNode;
    }
    const width = Number(attribute(extent, 'cx')) / 12700;
    const height = Number(attribute(extent, 'cy')) / 12700;
    const size = width > 0 && height > 0 ? ` style="width:${width}pt;height:${height}pt;max-width:100%;"` : ' style="max-width:100%;height:auto;"';
    return `<img class="word-image" src="${uri}" alt=""${size}>`;
  }

  if (node.namespaceURI === WORD_NS && node.localName === 'hyperlink') {
    const inner = Array.from(node.childNodes)
      .filter((child): child is XmlElement => child.nodeType === 1)
      .map((child) => wordInline(child, rels, entries, styleDefinitions))
      .join('');
    const target = rels.get(attribute(node, 'id', RELATIONSHIPS_NS));
    if (!target || !/^https?:|^mailto:/i.test(target)) return inner;
    return `<a href="${escapeHtml(target)}">${inner}</a>`;
  }

  // Structured Document Tag (SDT) — recurse into sdtContent
  if (node.namespaceURI === WORD_NS && node.localName === 'sdt') {
    const content = first(node, WORD_NS, 'sdtContent');
    if (!content) return '';
    return Array.from(content.childNodes)
      .filter((child): child is XmlElement => child.nodeType === 1)
      .map((child) => wordInline(child, rels, entries, styleDefinitions))
      .join('');
  }

  const inner = Array.from(node.childNodes)
    .filter((child): child is XmlElement => child.nodeType === 1)
    .map((child) => wordInline(child, rels, entries, styleDefinitions))
    .join('');
  if (node.namespaceURI === WORD_NS && node.localName === 'r') {
    const style = wordRunStyle(node, styleDefinitions);
    return style ? `<span style="${style}">${inner}</span>` : inner;
  }
  return inner;
}

function headingTagFromStyle(styleName?: string): string {
  if (!styleName) return 'p';
  const match = /^Heading\s*(\d+)$/i.exec(styleName) || /^Heading(\d+)$/i.exec(styleName);
  if (match) return `h${Math.min(6, Number(match[1]))}`;
  return 'p';
}

function headingTagForParagraph(
  styleId: string,
  styles: Map<string, WordStyle>
): string {
  const seen = new Set<string>();
  let current = styleId;
  while (current && !seen.has(current)) {
    seen.add(current);
    const style = styles.get(current);
    const tag = headingTagFromStyle(style?.name);
    if (tag !== 'p') return tag;
    current = style?.basedOn || '';
  }
  return 'p';
}

function wordParagraphPropertiesStyle(properties: XmlElement | undefined): string[] {
  if (!properties) return [];
  const styles: string[] = [];
  const alignment = attribute(first(properties, WORD_NS, 'jc'), 'val', WORD_NS);
  if (alignment) styles.push(`text-align:${alignment === 'both' ? 'justify' : alignment}`);
  const indentation = first(properties, WORD_NS, 'ind');
  const leftIndent = Number(attribute(indentation, 'left', WORD_NS));
  const rightIndent = Number(attribute(indentation, 'right', WORD_NS));
  const firstIndent = Number(attribute(indentation, 'firstLine', WORD_NS));
  const hangingIndent = Number(attribute(indentation, 'hanging', WORD_NS));
  if (leftIndent) styles.push(`margin-left:${leftIndent / 20}pt`);
  if (rightIndent) styles.push(`margin-right:${rightIndent / 20}pt`);
  if (firstIndent) styles.push(`text-indent:${firstIndent / 20}pt`);
  if (hangingIndent) {
    styles.push(`text-indent:-${hangingIndent / 20}pt`);
  }
  const spacing = first(properties, WORD_NS, 'spacing');
  const before = Number(attribute(spacing, 'before', WORD_NS));
  const after = Number(attribute(spacing, 'after', WORD_NS));
  const line = Number(attribute(spacing, 'line', WORD_NS));
  const lineRule = attribute(spacing, 'lineRule', WORD_NS);
  if (before) styles.push(`margin-top:${before / 20}pt`);
  if (after) styles.push(`margin-bottom:${after / 20}pt`);
  if (line > 0) {
    styles.push(lineRule === 'auto' ? `line-height:${line / 240}` : `line-height:${line / 20}pt`);
  }
  const shading = attribute(first(properties, WORD_NS, 'shd'), 'fill', WORD_NS);
  if (shading && shading !== 'auto') styles.push(`background-color:#${shading}`);

  // Paragraph borders
  styles.push(...wordParagraphBorders(properties));

  return styles;
}

function wordParagraph(
  paragraph: XmlElement,
  rels: Map<string, string>,
  entries: OfficeEntries,
  styleDefinitions: Map<string, WordStyle>,
  numbering: Map<string, Map<number, WordNumberLevel>>,
  counters: Map<string, number>
): string {
  const properties = first(paragraph, WORD_NS, 'pPr');
  const styleId = attribute(first(properties || paragraph, WORD_NS, 'pStyle'), 'val', WORD_NS);
  const tag = headingTagForParagraph(styleId, styleDefinitions);
  const styles = wordStyleChain(styleId, styleDefinitions).flatMap((style) => [
    ...wordParagraphPropertiesStyle(first(style.element, WORD_NS, 'pPr')),
    wordRunPropertiesStyle(first(style.element, WORD_NS, 'rPr')),
  ]);
  styles.push(...wordParagraphPropertiesStyle(properties));
  const directRunStyle = wordRunPropertiesStyle(first(properties || paragraph, WORD_NS, 'rPr'));
  if (directRunStyle) styles.push(directRunStyle);

  const numPr = first(properties || paragraph, WORD_NS, 'numPr');
  const numberId = numPr ? attribute(first(numPr, WORD_NS, 'numId'), 'val', WORD_NS) : '';
  const level = Math.max(0, Number(attribute(first(numPr || paragraph, WORD_NS, 'ilvl'), 'val', WORD_NS)) || 0);
  const list = numberId && numberId !== '0'
    ? wordListPrefix(numberId, level, numbering, counters)
    : undefined;
  if (list && !first(properties || paragraph, WORD_NS, 'ind')) {
    // Apply proper hanging-indent style for list markers
    styles.push(`margin-left:${list.indent}pt`);
    styles.push(`text-indent:-${list.hanging}pt`);
    styles.push(`padding-left:${list.hanging}pt`);
  }
  const pageBreakBefore = first(properties || paragraph, WORD_NS, 'pageBreakBefore');
  const sectionProperties = first(properties || paragraph, WORD_NS, 'sectPr');
  const sectionBreakType = attribute(first(sectionProperties || paragraph, WORD_NS, 'type'), 'val', WORD_NS);
  const content = Array.from(paragraph.childNodes)
    .filter((child): child is XmlElement => child.nodeType === 1)
    .map((child) => wordInline(child, rels, entries, styleDefinitions))
    .join('');
  const prefix = list
    ? `<span class="word-list-marker">${escapeHtml(list.text)}</span>`
    : '';
  const classes = [
    pageBreakBefore ? 'word-page-break-before' : '',
    sectionProperties && sectionBreakType !== 'continuous' ? 'word-page-break-after' : '',
  ].filter(Boolean);
  const classAttribute = classes.length ? ` class="${classes.join(' ')}"` : '';
  return `<${tag}${classAttribute} style="${styles.filter(Boolean).join(';')}">${prefix}${content || '<br>'}</${tag}>`;
}

// ─── Table border extraction ──────────────────────────────────────────────────
function wordTableBorderCss(
  tableBorders: XmlElement | undefined,
  cellBorders: XmlElement | undefined,
  side: 'top' | 'right' | 'bottom' | 'left' | 'insideH' | 'insideV'
): string {
  // Cell-level borders take priority over table-level borders
  const cellBdr = cellBorders ? first(cellBorders, WORD_NS, side) : undefined;
  if (cellBdr) return wordBorderStyle(cellBdr);
  const tblBdr = tableBorders ? first(tableBorders, WORD_NS, side) : undefined;
  if (tblBdr) return wordBorderStyle(tblBdr);
  return '1pt solid #222';
}

function wordTable(
  table: XmlElement,
  rels: Map<string, string>,
  entries: OfficeEntries,
  styleDefinitions: Map<string, WordStyle>,
  numbering: Map<string, Map<number, WordNumberLevel>>,
  counters: Map<string, number>
): string {
  const tableProperties = first(table, WORD_NS, 'tblPr');
  const layout = attribute(first(tableProperties || table, WORD_NS, 'tblLayout'), 'type', WORD_NS);
  const tableBorders = first(tableProperties || table, WORD_NS, 'tblBorders');
  const gridWidths = elements(first(table, WORD_NS, 'tblGrid') || table, WORD_NS, 'gridCol')
    .map((column) => Number(attribute(column, 'w', WORD_NS)) / 20)
    .filter((width) => width > 0);
  const columnGroup = gridWidths.length
    ? `<colgroup>${gridWidths.map((width) => `<col style="width:${width}pt">`).join('')}</colgroup>`
    : '';

  // Table background
  const tableShading = attribute(first(tableProperties || table, WORD_NS, 'shd'), 'fill', WORD_NS);
  const tableBgStyle = tableShading && tableShading !== 'auto' ? `background-color:#${tableShading};` : '';

  const rows = elements(table, WORD_NS, 'tr').map((row, rowIndex, allRows) => {
    const rowProperties = first(row, WORD_NS, 'trPr');
    const rowHeight = Number(attribute(first(rowProperties || row, WORD_NS, 'trHeight'), 'val', WORD_NS)) / 20;
    const isHeader = !!first(rowProperties || row, WORD_NS, 'tblHeader');
    const cells = elements(row, WORD_NS, 'tc').map((cell, cellIndex) => {
      const cellProperties = first(cell, WORD_NS, 'tcPr');
      const verticalMerge = first(cellProperties || cell, WORD_NS, 'vMerge');
      const mergeValue = attribute(verticalMerge, 'val', WORD_NS);
      if (verticalMerge && mergeValue !== 'restart') return '';
      let rowSpan = 1;
      if (mergeValue === 'restart') {
        for (let nextIndex = rowIndex + 1; nextIndex < allRows.length; nextIndex += 1) {
          const nextCell = elements(allRows[nextIndex], WORD_NS, 'tc')[cellIndex];
          const nextMerge = nextCell
            ? first(first(nextCell, WORD_NS, 'tcPr') || nextCell, WORD_NS, 'vMerge')
            : undefined;
          if (!nextMerge || attribute(nextMerge, 'val', WORD_NS) === 'restart') break;
          rowSpan += 1;
        }
      }
      const content = elements(cell, WORD_NS, 'p')
        .map((paragraph) => wordParagraph(paragraph, rels, entries, styleDefinitions, numbering, counters))
        .join('');
      const span = Number(attribute(first(cellProperties || cell, WORD_NS, 'gridSpan'), 'val', WORD_NS));
      const width = Number(attribute(first(cellProperties || cell, WORD_NS, 'tcW'), 'w', WORD_NS)) / 20;
      const shading = attribute(first(cellProperties || cell, WORD_NS, 'shd'), 'fill', WORD_NS);
      const cellBorders = first(cellProperties || cell, WORD_NS, 'tcBorders');
      const margins = first(cellProperties || cell, WORD_NS, 'tcMar');
      const padding = ['top', 'right', 'bottom', 'left'].map((side) => {
        const margin = elements(margins || cell, WORD_NS, side)[0];
        const amount = Number(attribute(margin, 'w', WORD_NS)) / 20;
        return `${amount > 0 ? amount : 4}pt`;
      }).join(' ');
      const vertical = attribute(first(cellProperties || cell, WORD_NS, 'vAlign'), 'val', WORD_NS);

      // Per-cell border CSS
      const borderTop = wordTableBorderCss(tableBorders, cellBorders, 'top');
      const borderRight = wordTableBorderCss(tableBorders, cellBorders, 'right');
      const borderBottom = wordTableBorderCss(tableBorders, cellBorders, 'bottom');
      const borderLeft = wordTableBorderCss(tableBorders, cellBorders, 'left');

      const cellStyle = [
        borderTop !== 'none' ? `border-top:${borderTop}` : 'border-top:none',
        borderRight !== 'none' ? `border-right:${borderRight}` : 'border-right:none',
        borderBottom !== 'none' ? `border-bottom:${borderBottom}` : 'border-bottom:none',
        borderLeft !== 'none' ? `border-left:${borderLeft}` : 'border-left:none',
        `padding:${padding}`,
        `vertical-align:${vertical === 'center' ? 'middle' : vertical === 'bottom' ? 'bottom' : 'top'}`,
        width > 0 ? `width:${width}pt` : '',
        shading && shading !== 'auto' ? `background-color:#${shading}` : '',
      ].filter(Boolean).join(';');
      const colspan = span > 1 ? ` colspan="${span}"` : '';
      const rowspan = rowSpan > 1 ? ` rowspan="${rowSpan}"` : '';
      const cellTag = isHeader ? 'th' : 'td';
      return `<${cellTag}${colspan}${rowspan} style="${cellStyle}">${content || '&nbsp;'}</${cellTag}>`;
    });
    const rowStyle = rowHeight > 0 ? ` style="height:${rowHeight}pt"` : '';
    if (isHeader) return `<tr${rowStyle}>${cells.join('')}</tr>`;
    return `<tr${rowStyle}>${cells.join('')}</tr>`;
  });

  const headerRows = rows.filter((_, i) => {
    const rowEl = elements(table, WORD_NS, 'tr')[i];
    return !!first(first(rowEl, WORD_NS, 'trPr') || rowEl, WORD_NS, 'tblHeader');
  });
  const bodyRows = rows.filter((_, i) => {
    const rowEl = elements(table, WORD_NS, 'tr')[i];
    return !first(first(rowEl, WORD_NS, 'trPr') || rowEl, WORD_NS, 'tblHeader');
  });
  const thead = headerRows.length ? `<thead>${headerRows.join('')}</thead>` : '';
  const tbody = `<tbody>${bodyRows.join('')}</tbody>`;
  const fixed = layout === 'fixed' || gridWidths.length > 0;
  return `<table style="border-collapse:collapse;width:100%;margin:8pt 0;${tableBgStyle}table-layout:${fixed ? 'fixed' : 'auto'};">${columnGroup}${thead}${tbody}</table>`;
}

// ─── Header / Footer extraction ───────────────────────────────────────────────
function renderHeaderFooterPart(
  entries: OfficeEntries,
  partPath: string,
  styleDefinitions: Map<string, WordStyle>
): string {
  const data = entries[partPath];
  if (!data) return '';
  try {
    const doc = parseXml(strFromU8(data));
    const textContent = xmlText(doc.documentElement, WORD_NS, 't').trim();
    if (!textContent && !descendants(doc.documentElement, DRAWING_NS, 'blip').length) {
      return '';
    }
    const rels = relationships(entries, partPath);
    const numbering = new Map<string, Map<number, WordNumberLevel>>();
    const counters = new Map<string, number>();
    const body = doc.documentElement;
    return Array.from(body.childNodes)
      .filter((child): child is XmlElement => child.nodeType === 1)
      .map((child) => {
        if (child.localName === 'tbl') return wordTable(child, rels, entries, styleDefinitions, numbering, counters);
        if (child.localName === 'p') return wordParagraph(child, rels, entries, styleDefinitions, numbering, counters);
        return '';
      })
      .join('');
  } catch {
    return '';
  }
}

function extractHeaderFooter(
  entries: OfficeEntries,
  docRels: Map<string, string>,
  styleDefinitions: Map<string, WordStyle>
): { header: string; footer: string } {
  // Find the default/first header and footer relationship targets
  let headerPath = '';
  let footerPath = '';
  for (const [, target] of docRels) {
    if (!headerPath && /^word\/header\d*\.xml$/i.test(target)) headerPath = target;
    if (!footerPath && /^word\/footer\d*\.xml$/i.test(target)) footerPath = target;
  }
  const header = renderHeaderFooterPart(entries, headerPath, styleDefinitions);
  const footer = renderHeaderFooterPart(entries, footerPath, styleDefinitions);
  return { header, footer };
}

export function renderDocxHtml(entries: OfficeEntries): {
  html: string;
  width: number;
  height: number;
  margins: { top: number; right: number; bottom: number; left: number };
} {
  const documentXml = entries['word/document.xml'];
  if (!documentXml) throw new Error('The selected file is not a valid Word document.');
  const document = parseXml(strFromU8(documentXml));
  const body = descendants(document, WORD_NS, 'body')[0];
  if (!body) throw new Error('The Word document does not contain a document body.');

  const rels = relationships(entries, 'word/document.xml');
  const styles = readWordStyles(entries);
  const numbering = readWordNumbering(entries);
  const counters = new Map<string, number>();

  // Walk body children; SDT nodes at body level are also handled
  const bodyContent = Array.from(body.childNodes)
    .filter((child): child is XmlElement => child.nodeType === 1)
    .map((child) => {
      if (child.localName === 'tbl') return wordTable(child, rels, entries, styles, numbering, counters);
      if (child.localName === 'p') return wordParagraph(child, rels, entries, styles, numbering, counters);
      if (child.localName === 'sdt') {
        // Structured Document Tag at body level
        const content = first(child, WORD_NS, 'sdtContent');
        if (!content) return '';
        return Array.from(content.childNodes)
          .filter((c): c is XmlElement => c.nodeType === 1)
          .map((c) => {
            if (c.localName === 'tbl') return wordTable(c, rels, entries, styles, numbering, counters);
            if (c.localName === 'p') return wordParagraph(c, rels, entries, styles, numbering, counters);
            return '';
          })
          .join('');
      }
      return '';
    })
    .join('');

  const sectPrs = descendants(body, WORD_NS, 'sectPr');
  const section = sectPrs.length > 0 ? sectPrs[sectPrs.length - 1] : undefined;
  const pageSize = first(section || body, WORD_NS, 'pgSz');
  const margins = first(section || body, WORD_NS, 'pgMar');
  const twipsToPoints = (element: XmlElement | undefined, name: string, fallback: number) => {
    const raw = attribute(element, name, WORD_NS);
    const value = Number(raw);
    return raw && Number.isFinite(value) ? value / 20 : fallback;
  };
  const width = twipsToPoints(pageSize, 'w', 612);
  const height = twipsToPoints(pageSize, 'h', 792);
  const pageMargins = {
    top: twipsToPoints(margins, 'top', 72),
    right: twipsToPoints(margins, 'right', 72),
    bottom: twipsToPoints(margins, 'bottom', 72),
    left: twipsToPoints(margins, 'left', 72),
  };

  // Extract header/footer content (only non-empty text)
  const { header, footer } = extractHeaderFooter(entries, rels, styles);
  const headerHtml = header ? `<header class="word-header">${header}</header>` : '';
  const footerHtml = footer ? `<footer class="word-footer">${footer}</footer>` : '';

  return {
    width,
    height,
    margins: pageMargins,
    html: `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:${width}pt ${height}pt;margin:${pageMargins.top}pt ${pageMargins.right}pt ${pageMargins.bottom}pt ${pageMargins.left}pt}
html,body{margin:0;padding:0;font-family:"Times New Roman",serif;font-size:12pt;color:#000}
.word-header{font-size:9pt;color:#666;border-bottom:0.5pt solid #ccc;padding-bottom:4pt;margin-bottom:12pt;text-align:center}
.word-footer{font-size:9pt;color:#666;border-top:0.5pt solid #ccc;padding-top:4pt;margin-top:16pt;text-align:center}
p{margin:0 0 8pt;white-space:pre-wrap;orphans:2;widows:2;box-sizing:border-box}
h1{font-size:24pt;margin:18pt 0 8pt;page-break-after:avoid;break-after:avoid}
h2{font-size:18pt;margin:16pt 0 6pt;page-break-after:avoid;break-after:avoid}
h3{font-size:14pt;margin:14pt 0 6pt;page-break-after:avoid;break-after:avoid}
h4{font-size:12pt;margin:12pt 0 4pt;page-break-after:avoid;break-after:avoid}
h5,h6{font-size:11pt;margin:10pt 0 4pt;page-break-after:avoid;break-after:avoid}
table{border-collapse:collapse;width:100%;margin:8pt 0;page-break-inside:auto;break-inside:auto}
thead tr{background-color:#f2f2f2}
tr{page-break-inside:avoid;break-inside:avoid}
td,th{vertical-align:top;padding:4pt}
img.word-image{max-width:100%;height:auto;vertical-align:middle;object-fit:contain;display:block}
.word-list-marker{display:inline-block;min-width:1em;margin-right:3pt}
.word-page-break,.word-page-break-before{break-before:page;page-break-before:always}
.word-page-break-after{break-after:page;page-break-after:always}
a{color:inherit;text-decoration:underline}
</style></head><body style="box-sizing:border-box">${headerHtml}${bodyContent}${footerHtml}</body></html>`,
  };
}

type ThemeColors = Map<string, string>;

function readThemeColors(entries: OfficeEntries, themePath: string | undefined): ThemeColors {
  const colors = new Map<string, string>();
  const theme = themePath ? entries[themePath] : undefined;
  if (!theme) return colors;
  const document = parseXml(strFromU8(theme));
  const scheme = descendants(document, DRAWING_NS, 'clrScheme')[0];
  if (!scheme) return colors;
  for (const color of Array.from(scheme.childNodes).filter(
    (child): child is XmlElement => child.nodeType === 1
  )) {
    const value = descendants(color, DRAWING_NS, 'srgbClr')[0] ||
      descendants(color, DRAWING_NS, 'sysClr')[0];
    const hex = attribute(value, 'val') || attribute(value, 'lastClr');
    if (color.localName && hex) colors.set(color.localName, hex);
  }
  return colors;
}

// ─── DrawingML colour resolution (handles luminance / tint / shade mods) ──────
function applyColorMod(hexColor: string, modNode: XmlElement | undefined): string {
  if (!modNode || !hexColor) return hexColor;
  const lumMod = Number(attribute(descendants(modNode, DRAWING_NS, 'lumMod')[0], 'val')) / 100000;
  const lumOff = Number(attribute(descendants(modNode, DRAWING_NS, 'lumOff')[0], 'val')) / 100000;
  const tint = Number(attribute(descendants(modNode, DRAWING_NS, 'tint')[0], 'val')) / 100000;
  const shade = Number(attribute(descendants(modNode, DRAWING_NS, 'shade')[0], 'val')) / 100000;
  if (!lumMod && !lumOff && !tint && !shade) return hexColor;
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  const adjust = (channel: number) => {
    let v = channel / 255;
    if (lumMod) v *= lumMod;
    if (lumOff) v += lumOff;
    if (tint) v = v + (1 - v) * tint;
    if (shade) v = v * shade;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
  };
  return [adjust(r), adjust(g), adjust(b)].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function drawingColor(node: XmlElement | undefined, themeColors: ThemeColors): string {
  if (!node) return '';
  const rgb = descendants(node, DRAWING_NS, 'srgbClr')[0];
  if (rgb) return applyColorMod(attribute(rgb, 'val'), rgb);
  const system = descendants(node, DRAWING_NS, 'sysClr')[0];
  if (system) return attribute(system, 'lastClr') || attribute(system, 'val');
  const scheme = descendants(node, DRAWING_NS, 'schemeClr')[0];
  if (scheme) {
    const base = themeColors.get(attribute(scheme, 'val')) || '';
    return base ? applyColorMod(base, scheme) : '';
  }
  return '';
}

function pptRun(run: XmlElement, themeColors: ThemeColors): string {
  const properties =
    first(run, DRAWING_NS, 'rPr') ||
    first(run, DRAWING_NS, 'defRPr') ||
    first(run, DRAWING_NS, 'endParaRPr');
  const styles: string[] = [];
  if (['1', 'true'].includes(attribute(properties, 'b'))) styles.push('font-weight:bold');
  if (['1', 'true'].includes(attribute(properties, 'i'))) styles.push('font-style:italic');
  if (['sng', 'dbl', 'sngAcct', 'dblAcct'].includes(attribute(properties, 'u'))) {
    styles.push('text-decoration:underline');
  }
  if (attribute(properties, 'strike') === 'sngStrike') styles.push('text-decoration:line-through');
  const size = Number(attribute(properties, 'sz'));
  if (size > 0) styles.push(`font-size:${size / 100}pt`);
  const color = drawingColor(first(properties || run, DRAWING_NS, 'solidFill'), themeColors);
  if (color) styles.push(`color:#${color}`);
  const latin = first(properties || run, DRAWING_NS, 'latin');
  const eastAsian = first(properties || run, DRAWING_NS, 'ea');
  const font = attribute(latin, 'typeface') || attribute(eastAsian, 'typeface');
  if (font && !font.startsWith('+')) styles.push(`font-family:${JSON.stringify(font)}`);

  // Superscript / subscript via baseline
  const baseline = Number(attribute(properties, 'baseline'));
  if (baseline > 0) styles.push('vertical-align:super;font-size:0.75em');
  else if (baseline < 0) styles.push('vertical-align:sub;font-size:0.75em');

  const text = xmlText(run, DRAWING_NS, 't');
  const escaped = escapeHtml(text);
  return styles.length ? `<span style="${styles.join(';')}">${escaped}</span>` : escaped;
}

function pptParagraph(paragraph: XmlElement, themeColors: ThemeColors): string {
  const properties = first(paragraph, DRAWING_NS, 'pPr');
  const alignment = attribute(properties, 'algn');
  const align = alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : alignment === 'just' ? 'justify' : 'left';

  // Bullet handling: buNone suppresses, buChar uses char, buAutoNum uses number
  const buNone = first(properties, DRAWING_NS, 'buNone');
  const buChar = first(properties, DRAWING_NS, 'buChar');
  const buAutoNum = first(properties, DRAWING_NS, 'buAutoNum');
  let bulletPrefix = '';
  if (!buNone) {
    if (buChar) {
      const char = attribute(buChar, 'char') || '•';
      bulletPrefix = `<span style="margin-right:6pt;display:inline-block">${escapeHtml(char)}</span>`;
    } else if (buAutoNum) {
      // Simplified: use a CSS counter approach not available inline; render as decimal
      bulletPrefix = '';
    }
  }

  const spacing = first(properties, DRAWING_NS, 'spcBef');
  const spacingPercent = Number(attribute(first(spacing || paragraph, DRAWING_NS, 'spcPct'), 'val'));
  const spacingPoints = Number(attribute(first(spacing || paragraph, DRAWING_NS, 'spcPts'), 'val')) / 100;
  const before = spacingPercent > 0 ? spacingPercent / 1000 : spacingPoints;
  const spcAft = first(properties, DRAWING_NS, 'spcAft');
  const spcAftPct = Number(attribute(first(spcAft || paragraph, DRAWING_NS, 'spcPct'), 'val'));
  const spcAftPts = Number(attribute(first(spcAft || paragraph, DRAWING_NS, 'spcPts'), 'val')) / 100;
  const after = spcAftPct > 0 ? spcAftPct / 1000 : spcAftPts;

  const indent = Number(attribute(properties, 'indent')) / 12700;
  const marL = Number(attribute(properties, 'marL')) / 12700;

  const styleParts = [`text-align:${align}`, 'white-space:pre-wrap'];
  if (before > 0) styleParts.push(`margin-top:${before}pt`);
  if (after > 0) styleParts.push(`margin-bottom:${after}pt`);
  const level = Number(attribute(properties, 'lvl')) || 0;
  if (level > 0) styleParts.push(`margin-left:${level * 18}pt`);
  if (marL > 0) styleParts.push(`margin-left:${marL}pt`);
  if (indent !== 0 && Number.isFinite(indent)) styleParts.push(`text-indent:${indent}pt`);

  const content = Array.from(paragraph.childNodes)
    .filter((child): child is XmlElement => child.nodeType === 1)
    .map((child) => {
      if (child.namespaceURI !== DRAWING_NS) return '';
      if (child.localName === 'r' || child.localName === 'fld') return pptRun(child, themeColors);
      if (child.localName === 'br') return '<br>';
      return '';
    })
    .join('');
  return `<div style="${styleParts.join(';')}">${bulletPrefix}${content || '&nbsp;'}</div>`;
}

function relationshipImageUri(
  node: XmlElement,
  rels: Map<string, string>,
  entries: OfficeEntries
): string {
  const image = descendants(node, DRAWING_NS, 'blip')[0];
  if (!image) return '';
  return imageDataUri(entries, rels.get(attribute(image, 'embed', RELATIONSHIPS_NS)));
}

function shapeCss(
  shape: XmlElement,
  slideWidth: number,
  slideHeight: number,
  themeColors: ThemeColors,
  isPicture = false
): string {
  const shapeProperties = first(shape, PRESENTATION_NS, 'spPr') || shape;
  const transform = descendants(shapeProperties, DRAWING_NS, 'xfrm')[0];
  const offset = first(transform || shape, DRAWING_NS, 'off');
  const extent = first(transform || shape, DRAWING_NS, 'ext');
  const x = Number(attribute(offset, 'x')) / 12700;
  const y = Number(attribute(offset, 'y')) / 12700;
  const width = Number(attribute(extent, 'cx')) / 12700;
  const height = Number(attribute(extent, 'cy')) / 12700;
  const rotation = Number(attribute(transform, 'rot')) / 60000;
  const flipH = attribute(transform, 'flipH') === '1';
  const flipV = attribute(transform, 'flipV') === '1';
  const styles = [
    'position:absolute',
    `left:${x}pt`,
    `top:${y}pt`,
    `width:${Math.max(1, width)}pt`,
    `height:${Math.max(1, height)}pt`,
    'box-sizing:border-box',
    // Pictures get no padding; text shapes get default inset
    isPicture ? '' : 'padding:6pt',
    'overflow:hidden',
  ].filter(Boolean);

  const transforms: string[] = [];
  if (rotation) transforms.push(`rotate(${rotation}deg)`);
  if (flipH) transforms.push('scaleX(-1)');
  if (flipV) transforms.push('scaleY(-1)');
  if (transforms.length) {
    styles.push(`transform:${transforms.join(' ')};transform-origin:center center`);
  }

  const fill = descendants(shapeProperties, DRAWING_NS, 'solidFill')[0];
  const color = drawingColor(fill, themeColors);
  if (color) {
    styles.push(`background-color:#${color}`);
    const alpha = Number(attribute(descendants(fill!, DRAWING_NS, 'alpha')[0], 'val'));
    if (alpha > 0 && alpha < 100000) styles.push(`opacity:${alpha / 100000}`);
  }
  const gradient = descendants(shapeProperties, DRAWING_NS, 'gradFill')[0];
  if (gradient) {
    const linGrad = descendants(gradient, DRAWING_NS, 'lin')[0];
    const angle = Number(attribute(linGrad, 'ang')) / 60000;
    const stops = descendants(gradient, DRAWING_NS, 'gs').map((stop) => {
      const position = Number(attribute(stop, 'pos')) / 1000;
      const stopColor = drawingColor(stop, themeColors);
      return stopColor ? `#${stopColor} ${position}%` : '';
    }).filter(Boolean);
    if (stops.length > 1) styles.push(`background:linear-gradient(${angle}deg,${stops.join(',')})`);
  }

  // Pattern / texture fill → solid fallback color
  const pattFill = descendants(shapeProperties, DRAWING_NS, 'pattFill')[0];
  if (pattFill && !color && !gradient) {
    const fgColor = drawingColor(first(pattFill, DRAWING_NS, 'fgClr'), themeColors);
    if (fgColor) styles.push(`background-color:#${fgColor}`);
  }

  const line = descendants(shapeProperties, DRAWING_NS, 'ln')[0];
  const noFill = line ? descendants(line, DRAWING_NS, 'noFill')[0] : undefined;
  if (line && !noFill) {
    const lineColor = drawingColor(line, themeColors);
    if (lineColor) {
      const lineWidth = Number(attribute(line, 'w')) / 12700 || 1;
      const lineStyle = descendants(line, DRAWING_NS, 'prstDash')[0]
        ? attribute(descendants(line, DRAWING_NS, 'prstDash')[0], 'val').includes('Dash') ? 'dashed' : 'solid'
        : 'solid';
      styles.push(`border:${lineWidth}pt ${lineStyle} #${lineColor}`);
    }
  }

  // Rounded corners
  const prstGeom = descendants(shapeProperties, DRAWING_NS, 'prstGeom')[0];
  const prst = attribute(prstGeom, 'prst');
  if (prst === 'roundRect') styles.push('border-radius:8pt');
  else if (prst === 'ellipse' || prst === 'circle') styles.push('border-radius:50%');

  styles.push(`max-width:${slideWidth}pt`, `max-height:${slideHeight}pt`);
  return styles.filter(Boolean).join(';');
}

function pptTextBodyStyle(shape: XmlElement): string {
  const bodyProperties = descendants(shape, DRAWING_NS, 'bodyPr')[0];
  if (!bodyProperties) return '';
  const styles: string[] = [];
  // Insets: EMU values, divide by 914400 to get inches, ×72 for pt → same as /12700
  for (const [attributeName, cssName] of [
    ['lIns', 'padding-left'],
    ['rIns', 'padding-right'],
    ['tIns', 'padding-top'],
    ['bIns', 'padding-bottom'],
  ] as const) {
    const raw = attribute(bodyProperties, attributeName);
    if (raw !== '') {
      const value = Number(raw) / 12700;
      styles.push(`${cssName}:${Math.max(0, value)}pt`);
    }
  }
  const anchor = attribute(bodyProperties, 'anchor');
  if (anchor === 'ctr') styles.push('display:flex;flex-direction:column;justify-content:center');
  else if (anchor === 'b') styles.push('display:flex;flex-direction:column;justify-content:flex-end');
  const wrap = attribute(bodyProperties, 'wrap');
  if (wrap === 'none') styles.push('white-space:nowrap;overflow:visible');
  return styles.join(';');
}

// ─── PPTX Table cell border helper ───────────────────────────────────────────
function pptCellBorderCss(tcPr: XmlElement | undefined, side: 'lnL' | 'lnR' | 'lnT' | 'lnB'): string {
  const ln = tcPr ? first(tcPr, DRAWING_NS, side) : undefined;
  if (!ln) return '1pt solid #666';
  const noFill = descendants(ln, DRAWING_NS, 'noFill')[0];
  if (noFill) return 'none';
  // Colour from theme colors (empty theme map here — caller should pass it)
  const w = Number(attribute(ln, 'w')) / 12700 || 1;
  return `${w}pt solid #666`;
}

export function renderPptxHtml(entries: OfficeEntries): {
  html: string;
  slideCount: number;
  width: number;
  height: number;
} {
  const presentationXml = entries['ppt/presentation.xml'];
  if (!presentationXml) throw new Error('The selected file is not a valid PowerPoint presentation.');

  const presentation = parseXml(strFromU8(presentationXml));
  const slideSize = descendants(presentation, PRESENTATION_NS, 'sldSz')[0];
  const slideWidth = Number(attribute(slideSize, 'cx')) / 12700 || 720;
  const slideHeight = Number(attribute(slideSize, 'cy')) / 12700 || 540;
  const presentationRels = relationships(entries, 'ppt/presentation.xml');
  const slideIdList = descendants(presentation, PRESENTATION_NS, 'sldIdLst')[0];
  const orderedSlidePaths = elements(slideIdList || presentation, PRESENTATION_NS, 'sldId')
    .map((slideId) => presentationRels.get(attribute(slideId, 'id', RELATIONSHIPS_NS)))
    .filter((path): path is string => !!path && !!entries[path]);
  const slidePaths = orderedSlidePaths.length
    ? orderedSlidePaths
    : Object.keys(entries)
    .map((path) => ({ path, match: path.match(/^ppt\/slides\/slide(\d+)\.xml$/) }))
    .filter((entry): entry is { path: string; match: RegExpMatchArray } => !!entry.match)
    .sort((left, right) => Number(left.match[1]) - Number(right.match[1]))
    .map((entry) => entry.path);
  if (!slidePaths.length) throw new Error('The selected file is not a valid PowerPoint presentation.');
  const themePath = Array.from(presentationRels.values()).find((path) => /^ppt\/theme\/[^/]+\.xml$/i.test(path));
  const themeColors = readThemeColors(entries, themePath);

  // Read slide master for default background
  const masterPath = Array.from(presentationRels.values()).find((p) => /^ppt\/slideMasters\/[^/]+\.xml$/i.test(p));
  let masterBackground = '#ffffff';
  if (masterPath && entries[masterPath]) {
    try {
      const masterDoc = parseXml(strFromU8(entries[masterPath]));
      const masterBg = descendants(masterDoc, PRESENTATION_NS, 'bg')[0];
      if (masterBg) {
        const masterBgColor = drawingColor(first(masterBg, DRAWING_NS, 'solidFill'), themeColors);
        if (masterBgColor) masterBackground = `#${masterBgColor}`;
      }
    } catch { /* ignore master parse errors */ }
  }

  const slides = slidePaths.map((path) => {
    const slide = parseXml(strFromU8(entries[path]));
    const rels = relationships(entries, path);

    // Slide layout / master inheritance for background
    const slideLayoutPath = Array.from(rels.values()).find((p) => /^ppt\/slideLayouts\/[^/]+\.xml$/i.test(p));
    let slideBackground = masterBackground;
    if (slideLayoutPath && entries[slideLayoutPath]) {
      try {
        const layoutDoc = parseXml(strFromU8(entries[slideLayoutPath]));
        const layoutBg = descendants(layoutDoc, PRESENTATION_NS, 'bg')[0];
        if (layoutBg) {
          const layoutBgColor = drawingColor(first(layoutBg, DRAWING_NS, 'solidFill'), themeColors);
          if (layoutBgColor) slideBackground = `#${layoutBgColor}`;
        }
      } catch { /* ignore layout parse errors */ }
    }

    const shapes = descendants(slide, PRESENTATION_NS, 'sp');
    const pictures = descendants(slide, PRESENTATION_NS, 'pic');
    const graphicFrames = descendants(slide, PRESENTATION_NS, 'graphicFrame');
    const connectors = descendants(slide, PRESENTATION_NS, 'cxnSp');

    const shapesHtml = shapes.map((shape) => {
      const paragraphs = descendants(shape, DRAWING_NS, 'p')
        .filter((paragraph) => {
          // Include paragraphs with text OR meaningful structure
          return descendants(paragraph, DRAWING_NS, 't').length > 0 ||
            descendants(paragraph, DRAWING_NS, 'br').length > 0;
        })
        .map((paragraph) => pptParagraph(paragraph, themeColors))
        .join('');
      const shapeStyle = `${shapeCss(shape, slideWidth, slideHeight, themeColors, false)};${pptTextBodyStyle(shape)}`;
      return `<div class="shape" style="${shapeStyle}">${paragraphs || '&nbsp;'}</div>`;
    });

    const picturesHtml = pictures.map((picture) => {
      const uri = relationshipImageUri(picture, rels, entries);
      const pictureStyle = shapeCss(picture, slideWidth, slideHeight, themeColors, true);
      if (!uri) return '';
      // Determine fill mode from spPr
      const spPr = first(picture, PRESENTATION_NS, 'spPr') ||
        descendants(picture, DRAWING_NS, 'spPr')[0];
      const stretch = spPr ? descendants(spPr, DRAWING_NS, 'stretch')[0] : undefined;
      const objectFit = stretch ? 'fill' : 'contain';
      return `<img class="shape" style="${pictureStyle};object-fit:${objectFit}" src="${uri}" alt="">`;
    });

    // Connector shapes (lines)
    const connectorsHtml = connectors.map((connector) => {
      const spPr = first(connector, PRESENTATION_NS, 'spPr') || connector;
      const transform = descendants(spPr, DRAWING_NS, 'xfrm')[0];
      const offset = first(transform || connector, DRAWING_NS, 'off');
      const extent = first(transform || connector, DRAWING_NS, 'ext');
      const x = Number(attribute(offset, 'x')) / 12700;
      const y = Number(attribute(offset, 'y')) / 12700;
      const w = Number(attribute(extent, 'cx')) / 12700;
      const h = Number(attribute(extent, 'cy')) / 12700;
      const ln = descendants(spPr, DRAWING_NS, 'ln')[0];
      const lnColor = drawingColor(ln, themeColors);
      const lnWidth = ln ? Number(attribute(ln, 'w')) / 12700 || 1 : 1;
      if (!lnColor) return '';
      // Render as a zero-height div with a border-top (approximation for horizontal lines)
      return `<div style="position:absolute;left:${x}pt;top:${y + h / 2}pt;width:${Math.max(1, w)}pt;height:0;border-top:${lnWidth}pt solid #${lnColor};box-sizing:border-box"></div>`;
    });

    const tablesHtml = graphicFrames.map((frame) => {
      const table = descendants(frame, DRAWING_NS, 'tbl')[0];
      if (!table) return '';
      const tableStyle = `${shapeCss(frame, slideWidth, slideHeight, themeColors, false)};border-collapse:collapse;padding:0`;
      const tblPr = first(table, DRAWING_NS, 'tblPr');
      const bandRow = attribute(tblPr, 'bandRow') === '1' || attribute(tblPr, 'bandRow') === 'true';
      const firstRowStyle = attribute(tblPr, 'firstRow') === '1' || attribute(tblPr, 'firstRow') === 'true';
      const rows = elements(table, DRAWING_NS, 'tr').map((row, rowIdx) => {
        const rowHeight = Number(attribute(row, 'h')) / 12700;
        const cells = elements(row, DRAWING_NS, 'tc').map((cell, colIdx) => {
          const tcPr = first(cell, DRAWING_NS, 'tcPr');
          const gridSpan = Number(attribute(tcPr, 'gridSpan')) || 1;
          const rowSpan = Number(attribute(tcPr, 'rowSpan')) || 1;
          const hMerge = attribute(tcPr, 'hMerge') === '1';
          const vMerge = attribute(tcPr, 'vMerge') === '1';
          if (hMerge || vMerge) return '';
          const paragraphs = descendants(cell, DRAWING_NS, 'p')
            .map((paragraph) => pptParagraph(paragraph, themeColors))
            .join('');
          const cellFill = first(tcPr, DRAWING_NS, 'solidFill');
          const cellColor = drawingColor(cellFill, themeColors);
          // Cell borders
          const lnL = pptCellBorderCss(tcPr, 'lnL');
          const lnR = pptCellBorderCss(tcPr, 'lnR');
          const lnT = pptCellBorderCss(tcPr, 'lnT');
          const lnB = pptCellBorderCss(tcPr, 'lnB');
          let cellStyle = [
            lnL !== 'none' ? `border-left:${lnL}` : 'border-left:none',
            lnR !== 'none' ? `border-right:${lnR}` : 'border-right:none',
            lnT !== 'none' ? `border-top:${lnT}` : 'border-top:none',
            lnB !== 'none' ? `border-bottom:${lnB}` : 'border-bottom:none',
            'padding:4pt',
            'vertical-align:middle',
          ].join(';');
          if (cellColor) cellStyle += `;background-color:#${cellColor}`;
          // Band row alternating
          if (bandRow && !firstRowStyle && rowIdx > 0 && rowIdx % 2 === 0) {
            if (!cellColor) cellStyle += ';background-color:#f2f2f2';
          }
          const colspanAttr = gridSpan > 1 ? ` colspan="${gridSpan}"` : '';
          const rowspanAttr = rowSpan > 1 ? ` rowspan="${rowSpan}"` : '';
          const cellTag = (firstRowStyle && rowIdx === 0) ? 'th' : 'td';
          return `<${cellTag}${colspanAttr}${rowspanAttr} style="${cellStyle}">${paragraphs}</${cellTag}>`;
        });
        const rowStyleAttr = rowHeight > 0 ? ` style="height:${rowHeight}pt"` : '';
        return `<tr${rowStyleAttr}>${cells.join('')}</tr>`;
      });
      return `<table class="shape ppt-table" style="${tableStyle}">${rows.join('')}</table>`;
    });

    const backgroundElement = descendants(slide, PRESENTATION_NS, 'bg')[0];
    const backgroundColor = drawingColor(first(backgroundElement || slide, DRAWING_NS, 'solidFill'), themeColors);
    const backgroundBlip = descendants(backgroundElement || slide, DRAWING_NS, 'blip')[0];
    const backgroundImage = backgroundBlip
      ? imageDataUri(entries, rels.get(attribute(backgroundBlip, 'embed', RELATIONSHIPS_NS)))
      : '';
    const gradFill = backgroundElement ? descendants(backgroundElement, DRAWING_NS, 'gradFill')[0] : undefined;
    let background: string;
    if (backgroundImage) {
      background = `${slideBackground} url("${backgroundImage}") center / cover no-repeat`;
    } else if (backgroundColor) {
      background = `#${backgroundColor}`;
    } else if (gradFill) {
      const linGrad = descendants(gradFill, DRAWING_NS, 'lin')[0];
      const angle = Number(attribute(linGrad, 'ang')) / 60000;
      const stops = descendants(gradFill, DRAWING_NS, 'gs').map((stop) => {
        const position = Number(attribute(stop, 'pos')) / 1000;
        const stopColor = drawingColor(stop, themeColors);
        return stopColor ? `#${stopColor} ${position}%` : '';
      }).filter(Boolean);
      background = stops.length > 1 ? `linear-gradient(${angle}deg,${stops.join(',')})` : slideBackground;
    } else {
      background = slideBackground;
    }
    return `<section class="slide" style="width:${slideWidth}pt;height:${slideHeight}pt;background:${background};position:relative;">${shapesHtml.join('')}${picturesHtml.join('')}${connectorsHtml.join('')}${tablesHtml.join('')}</section>`;
  });

  return {
    width: slideWidth,
    height: slideHeight,
    html: `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:${slideWidth}pt ${slideHeight}pt;margin:0}
html,body{margin:0;padding:0;background:#888}
.slide{position:relative;overflow:hidden;page-break-after:always;break-after:page;box-sizing:border-box;display:block}
.slide:last-child{page-break-after:auto;break-after:auto}
.shape{position:absolute;box-sizing:border-box;overflow:hidden;font-family:Arial,Calibri,sans-serif;font-size:18pt;color:#000;word-wrap:break-word}
.shape div{overflow-wrap:anywhere;min-height:1em}
.ppt-table{table-layout:fixed;padding:0 !important;overflow:visible}
</style></head><body>${slides.join('')}</body></html>`,
    slideCount: slides.length,
  };
}
