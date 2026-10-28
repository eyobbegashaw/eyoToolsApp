/**
 * Lightweight pure-JavaScript PKZip generator for React Native / Expo.
 * Generates valid binary ZIP files (uncompressed Store method 0),
 * perfectly compatible with Microsoft Word (.docx), PowerPoint (.pptx),
 * LibreOffice, Google Docs, and standard ZIP utilities.
 */

// CRC32 calculation table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function stringToUtf8ByteArray(str: string): Uint8Array {
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    } else {
      // surrogate pair
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return new Uint8Array(utf8);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // In React Native / Expo, btoa is either global or can be computed
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < binary.length; i += 3) {
    const b1 = binary.charCodeAt(i);
    const b2 = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0;
    const b3 = i + 2 < binary.length ? binary.charCodeAt(i + 2) : 0;
    const triple = (b1 << 16) | (b2 << 8) | b3;
    result += chars.charAt((triple >> 18) & 63);
    result += chars.charAt((triple >> 12) & 63);
    result += i + 1 < binary.length ? chars.charAt((triple >> 6) & 63) : '=';
    result += i + 2 < binary.length ? chars.charAt(triple & 63) : '=';
  }
  return result;
}

export interface ZipEntry {
  name: string;
  data: string | Uint8Array;
}

export class SimpleZipBuilder {
  private entries: { nameBytes: Uint8Array; dataBytes: Uint8Array; crc32: number }[] = [];

  addFile(name: string, content: string | Uint8Array) {
    const nameBytes = stringToUtf8ByteArray(name);
    const dataBytes = typeof content === 'string' ? stringToUtf8ByteArray(content) : content;
    const crc = calculateCrc32(dataBytes);
    this.entries.push({ nameBytes, dataBytes, crc32: crc });
  }

  buildBase64(): string {
    const fileRecords: Uint8Array[] = [];
    const centralDirectoryRecords: Uint8Array[] = [];
    let offset = 0;

    for (const entry of this.entries) {
      const localHeader = new Uint8Array(30 + entry.nameBytes.length);
      const view = new DataView(localHeader.buffer);

      // Local file header signature 0x04034b50
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true); // version needed to extract (2.0)
      view.setUint16(6, 0x0800, true); // general purpose bit flag (UTF-8)
      view.setUint16(8, 0, true); // compression method (0 = stored)
      view.setUint16(10, 0x4a21, true); // last mod file time
      view.setUint16(12, 0x589b, true); // last mod file date
      view.setUint32(14, entry.crc32, true); // crc-32
      view.setUint32(18, entry.dataBytes.length, true); // compressed size
      view.setUint32(22, entry.dataBytes.length, true); // uncompressed size
      view.setUint16(26, entry.nameBytes.length, true); // file name length
      view.setUint16(28, 0, true); // extra field length
      localHeader.set(entry.nameBytes, 30);

      fileRecords.push(localHeader);
      fileRecords.push(entry.dataBytes);

      // Central directory header 0x02014b50
      const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
      const cdView = new DataView(cdHeader.buffer);
      cdView.setUint32(0, 0x02014b50, true);
      cdView.setUint16(4, 20, true); // version made by
      cdView.setUint16(6, 20, true); // version needed
      cdView.setUint16(8, 0x0800, true); // flags (UTF-8)
      cdView.setUint16(10, 0, true); // compression (stored)
      cdView.setUint16(12, 0x4a21, true);
      cdView.setUint16(14, 0x589b, true);
      cdView.setUint32(16, entry.crc32, true);
      cdView.setUint32(20, entry.dataBytes.length, true);
      cdView.setUint32(24, entry.dataBytes.length, true);
      cdView.setUint16(28, entry.nameBytes.length, true);
      cdView.setUint16(30, 0, true); // extra field length
      cdView.setUint16(32, 0, true); // file comment length
      cdView.setUint16(34, 0, true); // disk number start
      cdView.setUint16(36, 0, true); // internal file attributes
      cdView.setUint32(38, 0, true); // external file attributes
      cdView.setUint32(42, offset, true); // relative offset of local header
      cdHeader.set(entry.nameBytes, 46);

      centralDirectoryRecords.push(cdHeader);
      offset += localHeader.length + entry.dataBytes.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const record of centralDirectoryRecords) {
      cdSize += record.length;
    }

    // End of central directory record 0x06054b50
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true); // disk number
    eocdView.setUint16(6, 0, true); // start disk
    eocdView.setUint16(8, this.entries.length, true); // entries on disk
    eocdView.setUint16(10, this.entries.length, true); // total entries
    eocdView.setUint32(12, cdSize, true); // size of central directory
    eocdView.setUint32(16, cdOffset, true); // offset of start of central directory
    eocdView.setUint16(20, 0, true); // comment length

    const totalLength = offset + cdSize + 22;
    const finalZip = new Uint8Array(totalLength);
    let writePos = 0;

    for (const record of fileRecords) {
      finalZip.set(record, writePos);
      writePos += record.length;
    }
    for (const record of centralDirectoryRecords) {
      finalZip.set(record, writePos);
      writePos += record.length;
    }
    finalZip.set(eocd, writePos);

    return uint8ArrayToBase64(finalZip);
  }
}
