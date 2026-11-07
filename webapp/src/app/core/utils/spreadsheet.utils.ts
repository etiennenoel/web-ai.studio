export interface ParsedSpreadsheetUrl {
  spreadsheetId: string;
  gid: string | null;
  sheetName: string;
}

export interface ParsedWorkbookSheet {
  sheets: string[];
  resolvedSheet: string;
  rows: string[][];
  blobUrls?: string[];
}

export interface SpreadsheetParseOptions {
  decompressFn?: (compressed: Uint8Array) => Promise<Uint8Array> | Uint8Array;
  useBlobUrls?: boolean;
  onProgress?: (completedEntries: number, totalEntries: number) => void;
}

export class SpreadsheetSheetNotFoundError extends Error {
  constructor(
    public readonly requestedSheet: string,
    public readonly availableSheets: string[],
  ) {
    super(
      `Sheet "${requestedSheet}" was not found in this spreadsheet. Available sheets: ${availableSheets.join(', ')}`,
    );
    this.name = 'SpreadsheetSheetNotFoundError';
  }
}

export class SpreadsheetUtils {
  private static readonly SPREADSHEET_ID_PATTERN = /^[a-zA-Z0-9-_]{10,120}$/;
  private static readonly GID_PATTERN = /^[0-9]{1,20}$/;
  private static readonly MAX_ZIP_BYTES = 1024 * 1024 * 1024;
  private static readonly MAX_ENTRY_BYTES = 50 * 1024 * 1024;
  private static readonly MAX_ZIP_ENTRIES = 10_000;

  /**
   * Parses a Google Spreadsheet URL (or raw Spreadsheet ID) and optional Sheet Name.
   * Returns null if the input is not a valid Google Spreadsheet URL or ID.
   */
  static parseGoogleSpreadsheetInput(
    rawUrlOrId: string,
    explicitSheetName: string = '',
  ): ParsedSpreadsheetUrl | null {
    const trimmed = (rawUrlOrId ?? '').trim();
    const sheetName = (explicitSheetName ?? '').trim();

    if (!trimmed) {
      return null;
    }

    // Direct spreadsheet ID
    if (SpreadsheetUtils.SPREADSHEET_ID_PATTERN.test(trimmed) && !trimmed.includes('/')) {
      return {
        spreadsheetId: trimmed,
        gid: null,
        sheetName,
      };
    }

    try {
      const url = new URL(trimmed);
      if (url.hostname !== 'docs.google.com') {
        return null;
      }

      const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{10,120})/);
      if (!match) {
        return null;
      }

      const spreadsheetId = match[1];
      let gid = url.searchParams.get('gid');

      if (!gid && url.hash) {
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        gid = hashParams.get('gid');
      }

      if (gid && !SpreadsheetUtils.GID_PATTERN.test(gid)) {
        gid = null;
      }

      const urlSheet = url.searchParams.get('sheet')?.trim() || '';

      return {
        spreadsheetId,
        gid: gid ?? null,
        sheetName: sheetName || urlSheet,
      };
    } catch {
      return null;
    }
  }

  /**
   * Builds the Google Sheets `.xlsx` export URL, which preserves embedded cell images,
   * `=IMAGE(...)` formulas, and worksheet tab names, and serves `Access-Control-Allow-Origin: *`.
   */
  static buildXlsxExportUrl(spreadsheetId: string): string {
    if (!SpreadsheetUtils.SPREADSHEET_ID_PATTERN.test(spreadsheetId)) {
      throw new Error('Invalid Google Spreadsheet ID.');
    }
    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=xlsx`;
  }

  /**
   * Builds the Google Visualization (`gviz/tq`) CSV export URL.
   * Note: When `sheetName` is provided, `gid` MUST be omitted because `gviz` gives `gid`
   * precedence over `sheet`.
   */
  static buildGvizCsvUrl(
    spreadsheetId: string,
    sheetName?: string,
    gid?: string | null,
  ): string {
    if (!SpreadsheetUtils.SPREADSHEET_ID_PATTERN.test(spreadsheetId)) {
      throw new Error('Invalid Google Spreadsheet ID.');
    }

    const params = new URLSearchParams({
      tqx: 'out:csv',
      headers: '0',
    });

    const trimmedSheet = (sheetName ?? '').trim();
    if (trimmedSheet) {
      params.set('sheet', trimmedSheet);
    } else if (gid && SpreadsheetUtils.GID_PATTERN.test(gid)) {
      params.set('gid', gid);
    }

    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${params.toString()}`;
  }

  /**
   * Parses RFC 4180 CSV or TSV text into a 2D array of strings.
   */
  static parseDelimitedText(text: string, delimiter: ',' | '\t' = ','): string[][] {
    const cleaned = (text ?? '').replace(/^\uFEFF/, '');
    if (!cleaned.trim()) {
      return [];
    }

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];

      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < cleaned.length && cleaned[i + 1] === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentCell += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (ch === '\r') {
        if (i + 1 < cleaned.length && cleaned[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (ch === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }

    if (inQuotes || currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    return SpreadsheetUtils.trimEmptyRows(rows);
  }

  /**
   * Formats a 2D array of strings into RFC 4180 CSV or TSV text.
   */
  static formatDelimitedText(rows: string[][], delimiter: ',' | '\t' = ','): string {
    return rows
      .map(row =>
        row
          .map(cell => {
            const value = String(cell ?? '');
            if (
              value.includes(delimiter) ||
              value.includes('"') ||
              value.includes('\n') ||
              value.includes('\r')
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(delimiter),
      )
      .join('\n');
  }

  /**
   * Streams an HTTP response into an `ArrayBuffer` while invoking `onProgress` as chunks arrive.
   */
  static async fetchArrayBufferWithProgress(
    url: string,
    init: RequestInit,
    onProgress?: (receivedBytes: number, totalBytes: number | null) => void,
  ): Promise<{ok: boolean; url: string; buffer: ArrayBuffer}> {
    const response = await fetch(url, init);
    const contentType = (response.headers?.get?.('content-type') || '').toLowerCase();
    if (
      !response.ok ||
      response.url.includes('accounts.google.com') ||
      contentType.includes('application/json') ||
      contentType.includes('text/html')
    ) {
      return {ok: false, url: response.url, buffer: new ArrayBuffer(0)};
    }

    const contentLengthHeader = response.headers.get('content-length');
    const parsedLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : NaN;
    const totalBytes = !Number.isNaN(parsedLength) && parsedLength > 0 ? parsedLength : null;

    if (!response.body || typeof response.body.getReader !== 'function') {
      const buffer = await response.arrayBuffer();
      onProgress?.(buffer.byteLength, totalBytes ?? buffer.byteLength);
      return {ok: true, url: response.url, buffer};
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      if (value && value.byteLength > 0) {
        chunks.push(value);
        receivedBytes += value.byteLength;
        onProgress?.(receivedBytes, totalBytes);
      }
    }

    const merged = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return {ok: true, url: response.url, buffer: merged.buffer};
  }

  /**
   * Parses an `.xlsx` buffer (converting embedded drawings and `=IMAGE(...)` formulas
   * into cell values) using Web Standard `DecompressionStream('deflate-raw')`.
   */
  static async parseXlsx(
    buffer: ArrayBuffer | Uint8Array,
    requestedSheetName?: string,
    requestedGid?: string | null,
    optionsOrDecompress?:
      | SpreadsheetParseOptions
      | ((compressed: Uint8Array) => Promise<Uint8Array> | Uint8Array),
  ): Promise<ParsedWorkbookSheet> {
    const options: SpreadsheetParseOptions =
      typeof optionsOrDecompress === 'function'
        ? {decompressFn: optionsOrDecompress}
        : (optionsOrDecompress ?? {});

    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.byteLength > SpreadsheetUtils.MAX_ZIP_BYTES) {
      throw new Error('Spreadsheet file exceeds the 1 GB size limit.');
    }

    const entries = await SpreadsheetUtils.readZipEntries(
      bytes,
      options.decompressFn,
      options.onProgress,
    );
    const decoder = new TextDecoder('utf-8');

    const workbookXmlBytes = entries.get('xl/workbook.xml');
    if (!workbookXmlBytes) {
      throw new Error('Invalid .xlsx file: missing xl/workbook.xml.');
    }
    const workbookXml = decoder.decode(workbookXmlBytes);
    const workbookRelsXml = entries.has('xl/_rels/workbook.xml.rels')
      ? decoder.decode(entries.get('xl/_rels/workbook.xml.rels')!)
      : '';

    const relsMap = SpreadsheetUtils.parseRelationships(workbookRelsXml);
    const sheetDefs = SpreadsheetUtils.parseWorkbookSheets(workbookXml, relsMap);

    if (!sheetDefs.length) {
      throw new Error('No worksheets found in this spreadsheet.');
    }

    const availableSheets = sheetDefs.map(s => s.name);
    const trimmedSheet = (requestedSheetName ?? '').trim();
    const sharedStringsXml = entries.has('xl/sharedStrings.xml')
      ? decoder.decode(entries.get('xl/sharedStrings.xml')!)
      : '';
    const sharedStrings = SpreadsheetUtils.parseSharedStrings(sharedStringsXml);

    const knownEvalHeaders = new Set([
      'api',
      'context',
      'input (text)',
      'input (images)',
      'input (audio)',
      'schema',
      'sampling mode',
      'summarizer length (optional)',
      'summarizer type (optional)',
      'summarizer speed preference',
    ]);

    const findBestEvalSheet = () => {
      let bestSheet = sheetDefs[0];
      let bestScore = -1;
      for (const candidate of sheetDefs) {
        const candidatePath = SpreadsheetUtils.normalizeZipPath('xl', candidate.target);
        const candidateBytes = entries.get(candidatePath);
        if (!candidateBytes) {
          continue;
        }
        const candidateXml = decoder.decode(candidateBytes);
        const firstRowMatch = candidateXml.match(/<row\b[^>]*>[\s\S]*?<\/row>/);
        if (!firstRowMatch) {
          continue;
        }
        const firstRowCells = SpreadsheetUtils.parseWorksheetCells(
          firstRowMatch[0],
          sharedStrings,
          new Map(),
        );
        const firstRow = firstRowCells[0];
        if (!firstRow) {
          continue;
        }
        let headerMatches = 0;
        for (const cell of firstRow) {
          const norm = String(cell ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
          if (knownEvalHeaders.has(norm)) {
            headerMatches++;
          }
        }
        const hasMultipleRows = /<row\b[^>]*>[\s\S]*?<\/row>[\s\S]*?<row\b/.test(candidateXml);
        const score = headerMatches * 100 + (hasMultipleRows ? 10 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestSheet = candidate;
        }
      }
      return {bestSheet, bestScore};
    };

    let targetSheet = sheetDefs[0];

    if (trimmedSheet) {
      const exact = sheetDefs.find(s => s.name === trimmedSheet);
      const insensitive = sheetDefs.find(
        s => s.name.trim().toLowerCase() === trimmedSheet.toLowerCase(),
      );
      const matched = exact ?? insensitive;
      if (matched) {
        targetSheet = matched;
      } else if (trimmedSheet.toLowerCase() === 'sheet1') {
        const {bestSheet, bestScore} = findBestEvalSheet();
        if (bestScore > 0) {
          targetSheet = bestSheet;
        } else {
          throw new SpreadsheetSheetNotFoundError(trimmedSheet, availableSheets);
        }
      } else {
        throw new SpreadsheetSheetNotFoundError(trimmedSheet, availableSheets);
      }
    } else if (requestedGid) {
      const byId = sheetDefs.find(s => s.sheetId === requestedGid);
      if (byId) {
        targetSheet = byId;
      } else if (sheetDefs.length > 1) {
        targetSheet = findBestEvalSheet().bestSheet;
      }
    } else if (sheetDefs.length > 1) {
      targetSheet = findBestEvalSheet().bestSheet;
    }

    const worksheetPath = SpreadsheetUtils.normalizeZipPath('xl', targetSheet.target);
    const worksheetBytes = entries.get(worksheetPath);
    if (!worksheetBytes) {
      throw new Error(`Worksheet data not found for sheet "${targetSheet.name}".`);
    }
    const worksheetXml = decoder.decode(worksheetBytes);

    const canCreateBlobUrls =
      options.useBlobUrls ??
      (typeof window !== 'undefined' &&
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function');

    // Resolve embedded cell images from drawing relationships if present
    const {cellImages, blobUrls} = SpreadsheetUtils.extractWorksheetImages(
      worksheetPath,
      worksheetXml,
      entries,
      decoder,
      canCreateBlobUrls,
    );

    const rows = SpreadsheetUtils.parseWorksheetCells(worksheetXml, sharedStrings, cellImages);

    return {
      sheets: availableSheets,
      resolvedSheet: targetSheet.name,
      rows,
      blobUrls,
    };
  }

  private static trimEmptyRows(rows: string[][]): string[][] {
    const trimmed = [...rows];
    while (
      trimmed.length > 0 &&
      trimmed[trimmed.length - 1].every(cell => !String(cell ?? '').trim())
    ) {
      trimmed.pop();
    }
    return trimmed;
  }

  private static async readZipEntries(
    bytes: Uint8Array,
    decompressFn?: (compressed: Uint8Array) => Promise<Uint8Array> | Uint8Array,
    onProgress?: (completedEntries: number, totalEntries: number) => void,
  ): Promise<Map<string, Uint8Array>> {
    if (
      bytes.byteLength < 22 ||
      bytes[0] !== 0x50 ||
      bytes[1] !== 0x4b ||
      bytes[2] !== 0x03 ||
      bytes[3] !== 0x04
    ) {
      throw new Error('File is not a valid ZIP / XLSX archive.');
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocdOffset = -1;
    const minEocd = Math.max(0, bytes.byteLength - 65557);

    for (let i = bytes.byteLength - 22; i >= minEocd; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error('Invalid ZIP archive: End of Central Directory not found.');
    }

    const totalEntries = view.getUint16(eocdOffset + 10, true);
    if (totalEntries > SpreadsheetUtils.MAX_ZIP_ENTRIES) {
      throw new Error(`Archive contains too many entries (${totalEntries}).`);
    }

    let cdOffset = view.getUint32(eocdOffset + 16, true);
    const decoder = new TextDecoder('utf-8');
    const rawEntries: {name: string; method: number; compData: Uint8Array}[] = [];

    for (let i = 0; i < totalEntries; i++) {
      if (cdOffset + 46 > bytes.byteLength || view.getUint32(cdOffset, true) !== 0x02014b50) {
        break;
      }

      const method = view.getUint16(cdOffset + 10, true);
      const compSize = view.getUint32(cdOffset + 20, true);
      const uncompSize = view.getUint32(cdOffset + 24, true);
      const nameLen = view.getUint16(cdOffset + 28, true);
      const extraLen = view.getUint16(cdOffset + 30, true);
      const commentLen = view.getUint16(cdOffset + 32, true);
      const localHeaderOffset = view.getUint32(cdOffset + 42, true);

      const name = decoder.decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen));
      cdOffset += 46 + nameLen + extraLen + commentLen;

      if (uncompSize > SpreadsheetUtils.MAX_ENTRY_BYTES) {
        continue;
      }

      if (localHeaderOffset + 30 > bytes.byteLength) {
        continue;
      }

      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compData = bytes.subarray(dataStart, dataStart + compSize);

      if (method === 0 || method === 8) {
        rawEntries.push({name, method, compData});
      }
    }

    const entries = new Map<string, Uint8Array>();
    const batchSize = 24;
    let completed = 0;

    for (let i = 0; i < rawEntries.length; i += batchSize) {
      const batch = rawEntries.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async item => {
          if (item.method === 0) {
            return [item.name, item.compData] as const;
          }
          const decompressed = decompressFn
            ? await decompressFn(item.compData)
            : await SpreadsheetUtils.inflateRaw(item.compData);
          return [item.name, decompressed] as const;
        }),
      );
      for (const [name, data] of results) {
        entries.set(name, data);
      }
      completed += batch.length;
      onProgress?.(completed, rawEntries.length);
    }

    return entries;
  }

  private static async inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
    const ds = new DecompressionStream('deflate-raw');
    const readPromise = new Response(ds.readable).arrayBuffer();
    const writer = ds.writable.getWriter();
    void writer.write(new Uint8Array(compressed));
    void writer.close();
    const buffer = await readPromise;
    if (buffer.byteLength > SpreadsheetUtils.MAX_ENTRY_BYTES) {
      throw new Error('Decompressed entry exceeds maximum allowed size.');
    }
    return new Uint8Array(buffer);
  }

  private static parseRelationships(relsXml: string): Map<string, string> {
    const map = new Map<string, string>();
    const relRegex = /<Relationship\b([^>]*?)\/?>/g;
    let match: RegExpExecArray | null;
    while ((match = relRegex.exec(relsXml)) !== null) {
      const attrs = match[1];
      const id = SpreadsheetUtils.readXmlAttr(attrs, 'Id');
      const target = SpreadsheetUtils.readXmlAttr(attrs, 'Target');
      if (id && target) {
        map.set(id, target);
      }
    }
    return map;
  }

  private static parseWorkbookSheets(
    workbookXml: string,
    relsMap: Map<string, string>,
  ): {name: string; sheetId: string; target: string}[] {
    const sheets: {name: string; sheetId: string; target: string}[] = [];
    const sheetRegex = /<sheet\b([^>]*?)\/?>/g;
    let match: RegExpExecArray | null;
    while ((match = sheetRegex.exec(workbookXml)) !== null) {
      const attrs = match[1];
      const name = SpreadsheetUtils.unescapeXml(SpreadsheetUtils.readXmlAttr(attrs, 'name') ?? '');
      const sheetId = SpreadsheetUtils.readXmlAttr(attrs, 'sheetId') ?? '';
      const rId =
        SpreadsheetUtils.readXmlAttr(attrs, 'r:id') ??
        SpreadsheetUtils.readXmlAttr(attrs, 'id') ??
        '';
      const target = relsMap.get(rId) ?? `worksheets/sheet${sheets.length + 1}.xml`;
      if (name) {
        sheets.push({name, sheetId, target});
      }
    }
    return sheets;
  }

  private static parseSharedStrings(sstXml: string): string[] {
    if (!sstXml) {
      return [];
    }
    const strings: string[] = [];
    const siRegex = /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g;
    let siMatch: RegExpExecArray | null;
    while ((siMatch = siRegex.exec(sstXml)) !== null) {
      const inner = siMatch[1] ?? '';
      const parts: string[] = [];
      const tRegex = /<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g;
      let tMatch: RegExpExecArray | null;
      while ((tMatch = tRegex.exec(inner)) !== null) {
        parts.push(SpreadsheetUtils.unescapeXml(tMatch[1]));
      }
      strings.push(parts.join(''));
    }
    return strings;
  }

  private static extractWorksheetImages(
    worksheetPath: string,
    worksheetXml: string,
    entries: Map<string, Uint8Array>,
    decoder: TextDecoder,
    useBlobUrls: boolean = false,
  ): {cellImages: Map<string, string>; blobUrls: string[]} {
    const cellImages = new Map<string, string>();
    const blobUrls: string[] = [];
    const mediaUrlCache = new Map<string, string>();
    const drawingMatch = worksheetXml.match(/<drawing\b[^>]*\br:id="([^"]+)"/);
    if (!drawingMatch) {
      return {cellImages, blobUrls};
    }

    const drawingRId = drawingMatch[1];
    const worksheetDir = worksheetPath.slice(0, worksheetPath.lastIndexOf('/'));
    const worksheetFile = worksheetPath.slice(worksheetPath.lastIndexOf('/') + 1);
    const worksheetRelsPath = `${worksheetDir}/_rels/${worksheetFile}.rels`;
    const worksheetRelsBytes = entries.get(worksheetRelsPath);
    if (!worksheetRelsBytes) {
      return {cellImages, blobUrls};
    }

    const worksheetRels = SpreadsheetUtils.parseRelationships(decoder.decode(worksheetRelsBytes));
    const drawingTarget = worksheetRels.get(drawingRId);
    if (!drawingTarget) {
      return {cellImages, blobUrls};
    }

    const drawingPath = SpreadsheetUtils.normalizeZipPath(worksheetDir, drawingTarget);
    const drawingBytes = entries.get(drawingPath);
    if (!drawingBytes) {
      return {cellImages, blobUrls};
    }

    const drawingDir = drawingPath.slice(0, drawingPath.lastIndexOf('/'));
    const drawingFile = drawingPath.slice(drawingPath.lastIndexOf('/') + 1);
    const drawingRelsPath = `${drawingDir}/_rels/${drawingFile}.rels`;
    const drawingRelsBytes = entries.get(drawingRelsPath);
    if (!drawingRelsBytes) {
      return {cellImages, blobUrls};
    }

    const drawingRels = SpreadsheetUtils.parseRelationships(decoder.decode(drawingRelsBytes));
    const drawingXml = decoder.decode(drawingBytes);

    const anchorRegex =
      /<(?:xdr:)?(?:oneCellAnchor|twoCellAnchor)\b[^>]*>([\s\S]*?)<\/(?:xdr:)?(?:oneCellAnchor|twoCellAnchor)>/g;
    let anchorMatch: RegExpExecArray | null;
    while ((anchorMatch = anchorRegex.exec(drawingXml)) !== null) {
      const anchorBody = anchorMatch[1];
      const fromMatch = anchorBody.match(
        /<(?:xdr:)?from>[\s\S]*?<(?:xdr:)?col>(\d+)<\/(?:xdr:)?col>[\s\S]*?<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>[\s\S]*?<\/(?:xdr:)?from>/,
      );
      const blipMatch = anchorBody.match(/<a:blip\b[^>]*\br:embed="([^"]+)"/);
      if (!fromMatch || !blipMatch) {
        continue;
      }

      const colIdx = parseInt(fromMatch[1], 10);
      const rowIdx = parseInt(fromMatch[2], 10);
      const embedId = blipMatch[1];
      const mediaTarget = drawingRels.get(embedId);
      if (!mediaTarget) {
        continue;
      }

      const mediaPath = SpreadsheetUtils.normalizeZipPath(drawingDir, mediaTarget);
      let imageUrl = mediaUrlCache.get(mediaPath);
      if (!imageUrl) {
        const mediaBytes = entries.get(mediaPath);
        if (!mediaBytes) {
          continue;
        }

        const mime = SpreadsheetUtils.mimeTypeFromPath(mediaPath);
        if (useBlobUrls) {
          const copy = new Uint8Array(mediaBytes.byteLength);
          copy.set(mediaBytes);
          const blob = new Blob([copy], {type: mime});
          imageUrl = URL.createObjectURL(blob);
          blobUrls.push(imageUrl);
        } else {
          const base64 = SpreadsheetUtils.uint8ToBase64(mediaBytes);
          imageUrl = `data:${mime};base64,${base64}`;
        }
        mediaUrlCache.set(mediaPath, imageUrl);
      }

      cellImages.set(`${rowIdx}:${colIdx}`, imageUrl);
    }

    return {cellImages, blobUrls};
  }

  private static parseWorksheetCells(
    worksheetXml: string,
    sharedStrings: string[],
    cellImages: Map<string, string>,
  ): string[][] {
    const grid = new Map<number, Map<number, string>>();
    let maxRow = -1;
    let maxCol = -1;

    const rowRegex = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
    let rowMatch: RegExpExecArray | null;
    let fallbackRowIdx = 0;

    while ((rowMatch = rowRegex.exec(worksheetXml)) !== null) {
      const rowAttrs = rowMatch[1];
      const rowBody = rowMatch[2] ?? '';
      const rAttr = SpreadsheetUtils.readXmlAttr(rowAttrs, 'r');
      const rowIdx = rAttr ? Math.max(0, parseInt(rAttr, 10) - 1) : fallbackRowIdx;
      fallbackRowIdx = rowIdx + 1;
      if (!rowBody) {
        continue;
      }

      const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let cellMatch: RegExpExecArray | null;
      let fallbackColIdx = 0;

      while ((cellMatch = cellRegex.exec(rowBody)) !== null) {
        const cellAttrs = cellMatch[1];
        const cellBody = cellMatch[2] ?? '';
        const ref = SpreadsheetUtils.readXmlAttr(cellAttrs, 'r');
        const colIdx = ref ? SpreadsheetUtils.columnRefToIndex(ref) : fallbackColIdx;
        fallbackColIdx = colIdx + 1;

        const cellType = SpreadsheetUtils.readXmlAttr(cellAttrs, 't') ?? '';
        let value = '';

        if (cellType === 'inlineStr') {
          const tMatches = [...cellBody.matchAll(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g)];
          value = tMatches.map(m => SpreadsheetUtils.unescapeXml(m[1])).join('');
        } else {
          const vMatch = cellBody.match(/<v(?:\s+[^>]*)?>([\s\S]*?)<\/v>/);
          const rawV = vMatch ? SpreadsheetUtils.unescapeXml(vMatch[1]) : '';
          if (cellType === 's') {
            const sstIdx = parseInt(rawV, 10);
            value = !Number.isNaN(sstIdx) && sstIdx >= 0 && sstIdx < sharedStrings.length
              ? sharedStrings[sstIdx]
              : rawV;
          } else {
            value = rawV;
          }
        }

        const fMatch = cellBody.match(/<f(?:\s+[^>]*)?>([\s\S]*?)<\/f>/);
        if (fMatch) {
          const formula = SpreadsheetUtils.unescapeXml(fMatch[1]).trim();
          const imageFormulaMatch = formula.match(/^image\(\s*"([^"]+)"/i);
          if (imageFormulaMatch) {
            value = imageFormulaMatch[1];
          }
        }

        if (value) {
          if (!grid.has(rowIdx)) {
            grid.set(rowIdx, new Map());
          }
          grid.get(rowIdx)!.set(colIdx, value);
          maxRow = Math.max(maxRow, rowIdx);
          maxCol = Math.max(maxCol, colIdx);
        }
      }
    }

    for (const [key, dataUrl] of cellImages.entries()) {
      const [rStr, cStr] = key.split(':');
      const r = parseInt(rStr, 10);
      const c = parseInt(cStr, 10);
      if (!grid.has(r)) {
        grid.set(r, new Map());
      }
      if (!grid.get(r)!.get(c)) {
        grid.get(r)!.set(c, dataUrl);
        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, c);
      }
    }

    if (maxRow < 0 || maxCol < 0) {
      return [];
    }

    const rows: string[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      const rowMap = grid.get(r);
      const row: string[] = [];
      for (let c = 0; c <= maxCol; c++) {
        row.push(rowMap?.get(c) ?? '');
      }
      rows.push(row);
    }

    return SpreadsheetUtils.trimEmptyRows(rows);
  }

  private static columnRefToIndex(ref: string): number {
    const letters = ref.replace(/[^A-Za-z]/g, '').toUpperCase();
    let col = 0;
    for (let i = 0; i < letters.length; i++) {
      col = col * 26 + (letters.charCodeAt(i) - 64);
    }
    return Math.max(0, col - 1);
  }

  private static normalizeZipPath(baseDir: string, relativeTarget: string): string {
    if (relativeTarget.startsWith('/')) {
      return relativeTarget.replace(/^\/+/, '');
    }
    const parts = `${baseDir}/${relativeTarget}`.split('/');
    const stack: string[] = [];
    for (const part of parts) {
      if (!part || part === '.') {
        continue;
      }
      if (part === '..') {
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return stack.join('/');
  }

  private static readXmlAttr(attrs: string, name: string): string | null {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = attrs.match(new RegExp(`(?:^|\\s)${escaped}="([^"]*)"`));
    return match ? match[1] : null;
  }

  private static unescapeXml(text: string): string {
    return text
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  private static mimeTypeFromPath(path: string): string {
    const lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    return 'image/jpeg';
  }

  private static uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...sub);
    }
    return btoa(binary);
  }
}
