/**
 * A minimal RFC 4180 reader: enough for the hardware dataset, which quotes the few
 * names containing a comma or a double quote (`MacBook Pro 13" 2018`).
 */
export class CsvTableParser {

  /** Splits raw CSV text into rows of fields, dropping blank lines. */
  static parse(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;

    for (let index = 0; index < text.length; index++) {
      const character = text[index];

      if (quoted) {
        if (character !== '"') {
          field += character;
        } else if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
        }
        continue;
      }

      if (character === '"') {
        quoted = true;
      } else if (character === ',') {
        row.push(field);
        field = '';
      } else if (character === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (character !== '\r') {
        field += character;
      }
    }

    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows.filter(candidate => candidate.some(value => value.trim() !== ''));
  }
}
