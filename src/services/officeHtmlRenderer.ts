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

function wordRunPropertiesStyle(properties: XmlElement | undefined): string {
  if (!properties) return '';
  const styles: string[] = [];
  if (first(properties, WORD_NS, 'b')) styles.push('font-weight:bold');
  if (first(properties, WORD_NS, 'i')) styles.push('font-style:italic');
  if (first(properties, WORD_NS, 'strike') || first(properties, WORD_NS, 'dstrike')) {
    styles.push('text-decoration:line-through');
  }
  if (first(properties, WORD_NS, 'u')) styles.push('text-decoration:underline');
  const highlight = first(properties, WORD_NS, 'highlight');
  if (highlight && attribute(highlight, 'val', WORD_NS)) styles.push(`background-color:#${attribute(highlight, 'val', WORD_NS)}`);

  const color = attribute(first(properties, WORD_NS, 'color'), 'val', WORD_NS);
  if (color && color !== 'auto') styles.push(`color:#${color}`);
  const size = Number(attribute(first(properties, WORD_NS, 'sz'), 'val', WORD_NS));
  if (size > 0) styles.push(`font-size:${size / 2}pt`);
  const font = attribute(first(properties, WORD_NS, 'rFonts'), 'ascii', WORD_NS);
  if (font) styles.push(`font-family:${JSON.stringify(font)}`);
  const verticalAlign = attribute(first(properties, WORD_NS, 'vertAlign'), 'val', WORD_NS);
  if (verticalAlign === 'superscript') styles.push('vertical-align:super;font-size:smaller');
  if (verticalAlign === 'subscript') styles.push('vertical-align:sub;font-size:smaller');
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
      levels.set(index, {
        format: attribute(first(level, WORD_NS, 'numFmt'), 'val', WORD_NS) || 'bullet',
        text: attribute(first(level, WORD_NS, 'lvlText'), 'val', WORD_NS) || '•',
        start: Number(attribute(first(level, WORD_NS, 'start'), 'val', WORD_NS)) || 1,
        indent: Number(attribute(indentation, 'left', WORD_NS)) / 20 || (index + 1) * 18,
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
): { text: string; indent: number } {
  const definition = definitions.get(numberId);
  const info = definition?.get(level) || { format: 'bullet', text: '•', start: 1, indent: (level + 1) * 18 };
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
  return { text, indent: info.indent };
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
    const size = width > 0 && height > 0 ? ` style="width:${width}pt;height:${height}pt;max-width:100%;"` : '';
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
  if (leftIndent) styles.push(`margin-left:${leftIndent / 20}pt`);
  if (rightIndent) styles.push(`margin-right:${rightIndent / 20}pt`);
  if (firstIndent) styles.push(`text-indent:${firstIndent / 20}pt`);
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
    styles.push(`margin-left:${list.indent}pt`);
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
  return `<${tag}${classAttribute} style="${styles.join(';')}">${prefix}${content || '<br>'}</${tag}>`;
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
  const gridWidths = elements(first(table, WORD_NS, 'tblGrid') || table, WORD_NS, 'gridCol')
    .map((column) => Number(attribute(column, 'w', WORD_NS)) / 20)
    .filter((width) => width > 0);
  const columnGroup = gridWidths.length
    ? `<colgroup>${gridWidths.map((width) => `<col style="width:${width}pt">`).join('')}</colgroup>`
    : '';
  const rows = elements(table, WORD_NS, 'tr').map((row, rowIndex, allRows) => {
    const rowProperties = first(row, WORD_NS, 'trPr');
    const rowHeight = Number(attribute(first(rowProperties || row, WORD_NS, 'trHeight'), 'val', WORD_NS)) / 20;
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
      const margins = first(cellProperties || cell, WORD_NS, 'tcMar');
      const padding = ['top', 'right', 'bottom', 'left'].map((side) => {
        const margin = elements(margins || cell, WORD_NS, side)[0];
        const amount = Number(attribute(margin, 'w', WORD_NS)) / 20;
        return `${amount > 0 ? amount : 4}pt`;
      }).join(' ');
      const vertical = attribute(first(cellProperties || cell, WORD_NS, 'vAlign'), 'val', WORD_NS);
      const cellStyle = [
        'border:1px solid #222',
        `padding:${padding}`,
        `vertical-align:${vertical === 'center' ? 'middle' : vertical === 'bottom' ? 'bottom' : 'top'}`,
        width > 0 ? `width:${width}pt` : '',
        shading && shading !== 'auto' ? `background-color:#${shading}` : '',
      ].filter(Boolean).join(';');
      const colspan = span > 1 ? ` colspan="${span}"` : '';
      const rowspan = rowSpan > 1 ? ` rowspan="${rowSpan}"` : '';
      return `<td${colspan}${rowspan} style="${cellStyle}">${content || '&nbsp;'}</td>`;
    });
    return `<tr${rowHeight > 0 ? ` style="height:${rowHeight}pt"` : ''}>${cells.join('')}</tr>`;
  });
  const fixed = layout === 'fixed' || gridWidths.length > 0;
  return `<table style="border-collapse:collapse;width:100%;margin:8pt 0;border:1px solid #222;table-layout:${fixed ? 'fixed' : 'auto'};">${columnGroup}${rows.join('')}</table>`;
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
  const bodyContent = Array.from(body.childNodes)
    .filter((child): child is XmlElement => child.nodeType === 1)
    .map((child) =>
      child.localName === 'tbl'
        ? wordTable(child, rels, entries, styles, numbering, counters)
        : child.localName === 'p'
          ? wordParagraph(child, rels, entries, styles, numbering, counters)
          : ''
    )
    .join('');

  const section = descendants(body, WORD_NS, 'sectPr').at(-1);
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

  return {
    width,
    height,
    margins: pageMargins,
    html: `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:${width}pt ${height}pt;margin:${pageMargins.top}pt ${pageMargins.right}pt ${pageMargins.bottom}pt ${pageMargins.left}pt}
html,body{margin:0;padding:0;font-family:"Times New Roman",serif;font-size:12pt;color:#000}
p{margin:0 0 8pt;white-space:pre-wrap;orphans:2;widows:2;box-sizing:border-box}
h1,h2,h3,h4,h5,h6{page-break-after:avoid;break-after:avoid}
table{border-collapse:collapse;width:100%;margin:8pt 0;page-break-inside:auto;break-inside:auto}
tr{page-break-inside:avoid;break-inside:avoid}
img.word-image{max-width:100%;height:auto;vertical-align:middle;object-fit:contain}
.word-list-marker{display:inline-block;min-width:18pt;margin-right:3pt}
.word-page-break,.word-page-break-before{break-before:page;page-break-before:always}
.word-page-break-after{break-after:page;page-break-after:always}
a{color:inherit;text-decoration:underline}
</style></head><body style="width:${width}pt;box-sizing:border-box">${bodyContent}</body></html>`,
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

function drawingColor(node: XmlElement | undefined, themeColors: ThemeColors): string {
  if (!node) return '';
  const rgb = descendants(node, DRAWING_NS, 'srgbClr')[0];
  if (rgb) return attribute(rgb, 'val');
  const system = descendants(node, DRAWING_NS, 'sysClr')[0];
  if (system) return attribute(system, 'lastClr') || attribute(system, 'val');
  const scheme = descendants(node, DRAWING_NS, 'schemeClr')[0];
  return scheme ? themeColors.get(attribute(scheme, 'val')) || '' : '';
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
  if (font) styles.push(`font-family:${JSON.stringify(font)}`);

  const text = xmlText(run, DRAWING_NS, 't');
  const escaped = escapeHtml(text);
  return styles.length ? `<span style="${styles.join(';')}">${escaped}</span>` : escaped;
}

function pptParagraph(paragraph: XmlElement, themeColors: ThemeColors): string {
  const properties = first(paragraph, DRAWING_NS, 'pPr');
  const alignment = attribute(properties, 'algn');
  const align = alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : alignment === 'just' ? 'justify' : 'left';
  const bullet = first(properties, DRAWING_NS, 'buChar');
  const bulletChar = bullet ? attribute(bullet, 'char') || '•' : '';
  const spacing = first(properties, DRAWING_NS, 'spcBef');
  const spacingPercent = Number(attribute(first(spacing || paragraph, DRAWING_NS, 'spcPct'), 'val'));
  const spacingPoints = Number(attribute(first(spacing || paragraph, DRAWING_NS, 'spcPts'), 'val')) / 100;
  const before = spacingPercent > 0 ? spacingPercent / 1000 : spacingPoints;
  const styleParts = [`text-align:${align}`, 'white-space:pre-wrap'];
  if (before > 0) styleParts.push(`margin-top:${before}pt`);
  const level = Number(attribute(properties, 'lvl')) || 0;
  if (level > 0) styleParts.push(`margin-left:${level * 18}pt`);
  const content = Array.from(paragraph.childNodes)
    .filter((child): child is XmlElement => child.nodeType === 1)
    .map((child) => {
      if (child.namespaceURI !== DRAWING_NS) return '';
      if (child.localName === 'r' || child.localName === 'fld') return pptRun(child, themeColors);
      return '';
    })
    .join('');
  const prefix = bulletChar ? `<span style="margin-right:6pt;">${escapeHtml(bulletChar)}</span>` : '';
  return `<div style="${styleParts.join(';')}">${prefix}${content || '&nbsp;'}</div>`;
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
  themeColors: ThemeColors
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
  const styles = [
    'position:absolute',
    `left:${x}pt`,
    `top:${y}pt`,
    `width:${Math.max(1, width)}pt`,
    `height:${Math.max(1, height)}pt`,
    'box-sizing:border-box',
    'padding:6pt',
    'overflow:hidden',
  ];
  if (rotation) styles.push(`transform:rotate(${rotation}deg);transform-origin:top left`);
  const fill = descendants(shapeProperties, DRAWING_NS, 'solidFill')[0];
  const color = drawingColor(fill, themeColors);
  if (color) {
    styles.push(`background-color:#${color}`);
    const alpha = Number(attribute(descendants(fill!, DRAWING_NS, 'alpha')[0], 'val'));
    if (alpha > 0 && alpha < 100000) styles.push(`opacity:${alpha / 100000}`);
  }
  const gradient = descendants(shapeProperties, DRAWING_NS, 'gradFill')[0];
  if (gradient) {
    const stops = descendants(gradient, DRAWING_NS, 'gs').map((stop) => {
      const position = Number(attribute(stop, 'pos')) / 1000;
      const stopColor = drawingColor(stop, themeColors);
      return stopColor ? `#${stopColor} ${position}%` : '';
    }).filter(Boolean);
    if (stops.length > 1) styles.push(`background:linear-gradient(180deg,${stops.join(',')})`);
  }
  const line = descendants(shapeProperties, DRAWING_NS, 'ln')[0];
  const lineColor = drawingColor(line, themeColors);
  if (lineColor) {
    const lineWidth = Number(attribute(line, 'w')) / 12700 || 1;
    styles.push(`border:${lineWidth}pt solid #${lineColor}`);
  }
  styles.push(`max-width:${slideWidth}pt`, `max-height:${slideHeight}pt`);
  return styles.join(';');
}

function pptTextBodyStyle(shape: XmlElement): string {
  const bodyProperties = descendants(shape, DRAWING_NS, 'bodyPr')[0];
  if (!bodyProperties) return '';
  const styles: string[] = [];
  for (const [attributeName, cssName] of [
    ['lIns', 'padding-left'],
    ['rIns', 'padding-right'],
    ['tIns', 'padding-top'],
    ['bIns', 'padding-bottom'],
  ]) {
    const value = Number(attribute(bodyProperties, attributeName)) / 12700;
    if (value >= 0) styles.push(`${cssName}:${value}pt`);
  }
  const anchor = attribute(bodyProperties, 'anchor');
  if (anchor === 'ctr') styles.push('display:flex;flex-direction:column;justify-content:center');
  else if (anchor === 'b') styles.push('display:flex;flex-direction:column;justify-content:flex-end');
  const wrap = attribute(bodyProperties, 'wrap');
  if (wrap === 'none') styles.push('white-space:nowrap;overflow:visible');
  return styles.join(';');
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
  const slideWidth = Number(attribute(slideSize, 'cx')) / 12700 || 960;
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

  const slides = slidePaths.map((path) => {
    const slide = parseXml(strFromU8(entries[path]));
    const rels = relationships(entries, path);
    const shapes = descendants(slide, PRESENTATION_NS, 'sp');
    const pictures = descendants(slide, PRESENTATION_NS, 'pic');
    const graphicFrames = descendants(slide, PRESENTATION_NS, 'graphicFrame');
    const shapesHtml = shapes.map((shape) => {
      const paragraphs = descendants(shape, DRAWING_NS, 'p')
        .filter((paragraph) => descendants(paragraph, DRAWING_NS, 't').length > 0)
        .map((paragraph) => pptParagraph(paragraph, themeColors))
        .join('');
      const shapeStyle = `${shapeCss(shape, slideWidth, slideHeight, themeColors)};${pptTextBodyStyle(shape)}`;
      return `<div class="shape" style="${shapeStyle}">${paragraphs || '&nbsp;'}</div>`;
    });
    const picturesHtml = pictures.map((picture) => {
      const uri = relationshipImageUri(picture, rels, entries);
      const pictureStyle = shapeCss(picture, slideWidth, slideHeight, themeColors);
      return uri
        ? `<img class="shape" style="${pictureStyle};object-fit:contain" src="${uri}" alt="">`
        : '';
    });
    const tablesHtml = graphicFrames.map((frame) => {
      const table = descendants(frame, DRAWING_NS, 'tbl')[0];
      if (!table) return '';
      const rows = elements(table, DRAWING_NS, 'tr').map((row) => {
        const cells = elements(row, DRAWING_NS, 'tc').map((cell) => {
          const paragraphs = descendants(cell, DRAWING_NS, 'p')
            .map((paragraph) => pptParagraph(paragraph, themeColors))
            .join('');
          return `<td style="border:1px solid #666;padding:4pt;vertical-align:middle">${paragraphs}</td>`;
        });
        return `<tr>${cells.join('')}</tr>`;
      });
      return `<table class="shape ppt-table" style="${shapeCss(frame, slideWidth, slideHeight, themeColors)};border-collapse:collapse">${rows.join('')}</table>`;
    });
    const backgroundElement = descendants(slide, PRESENTATION_NS, 'bg')[0];
    const backgroundColor = drawingColor(first(backgroundElement || slide, DRAWING_NS, 'solidFill'), themeColors);
    const backgroundBlip = descendants(backgroundElement || slide, DRAWING_NS, 'blip')[0];
    const backgroundImage = backgroundBlip
      ? imageDataUri(entries, rels.get(attribute(backgroundBlip, 'embed', RELATIONSHIPS_NS)))
      : '';
    const background = backgroundImage
      ? `#fff url("${backgroundImage}") center / cover no-repeat`
      : backgroundColor
        ? `#${backgroundColor}`
        : '#ffffff';
    return `<section class="slide" style="width:${slideWidth}pt;height:${slideHeight}pt;background:${background};position:relative;">${shapesHtml.join('')}${picturesHtml.join('')}${tablesHtml.join('')}</section>`;
  });

  return {
    width: slideWidth,
    height: slideHeight,
    html: `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:${slideWidth}pt ${slideHeight}pt;margin:0}
html,body{margin:0;padding:0;background:#fff}
.slide{position:relative;overflow:hidden;page-break-after:always;break-after:page;box-sizing:border-box}
.slide:last-child{page-break-after:auto;break-after:auto}
.shape{position:absolute;box-sizing:border-box;overflow:hidden;font-family:Arial,sans-serif;font-size:18pt;color:#000}
.shape div{overflow-wrap:anywhere}
.ppt-table{table-layout:fixed}
</style></head><body>${slides.join('')}</body></html>`,
    slideCount: slides.length,
  };
}
