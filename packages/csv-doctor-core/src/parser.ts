import Papa from 'papaparse';
import type { CsvIssue, CsvParseOptions, ParsedCsv } from './types.js';

const DELIMITERS = [',', ';', '\t', '|'];
const DEFAULT_MAX_ROWS = 100_000;
const DEFAULT_MAX_CHARACTERS = 20_000_000;

interface DelimiterCandidate {
  delimiter: string;
  width: number;
  consistency: number;
}

function inspectDelimiter(source: string, delimiter: string): DelimiterCandidate {
  const sample = Papa.parse<string[]>(source, {
    delimiter,
    preview: 12,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  }).data;
  const widths = sample.map((row) => row.length).filter((width) => width > 0);
  const counts = new Map<number, number>();
  for (const width of widths) counts.set(width, (counts.get(width) ?? 0) + 1);
  const modalWidth = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? 1;
  const consistency = widths.length === 0 ? 0 : (counts.get(modalWidth) ?? 0) / widths.length;
  return { delimiter, width: modalWidth, consistency };
}

function parserExplanation(ruleId: string): string {
  if (ruleId === 'file-too-large') return 'The local character limit bounds browser memory use. Split the source file into smaller files while keeping the original header row.';
  if (ruleId === 'row-limit-exceeded') return 'The local row limit bounds browser work. Split the source file into smaller files, each with its own header row.';
  if (ruleId === 'file-empty') return 'A CSV needs a header row before any product records can be analyzed.';
  if (ruleId === 'delimiter-ambiguous') return 'More than one separator produces a plausible table shape. Choose the separator used between the actual columns before trusting row and column diagnostics.';
  if (ruleId === 'duplicate-header') return 'Each column needs a distinct header so values can be tied to the correct field. Rename or remove the duplicate column in the source file.';
  if (ruleId === 'column-count-mismatch') return 'This logical CSV record has a different number of fields than the header. Check its quoting and separators; a quoted cell may contain line breaks without starting a new record.';
  if (ruleId.startsWith('parser-')) return 'The CSV parser could not reliably read this record. Review quotes and escaped quotes around the reported logical record before exporting.';
  return 'This is a CSV structure check. Review the indicated record or file setting, correct the source CSV, and analyze it again.';
}

function chooseDelimiter(source: string): { delimiter: string; ambiguous: boolean } {
  const candidates = DELIMITERS
    .map((delimiter) => inspectDelimiter(source, delimiter))
    .filter((candidate) => candidate.width > 1)
    .sort((a, b) => b.consistency - a.consistency || b.width - a.width);
  const first = candidates[0];
  const second = candidates[1];
  if (!first) return { delimiter: ',', ambiguous: false };
  const ambiguous = Boolean(
    second &&
      first.consistency === second.consistency &&
      first.width === second.width,
  );
  return { delimiter: first.delimiter, ambiguous };
}

function issue(
  ruleId: string,
  severity: CsvIssue['severity'],
  message: string,
  details: Partial<Omit<CsvIssue, 'id' | 'ruleId' | 'severity' | 'message' | 'category'>> & { idSuffix?: string } = {},
): CsvIssue {
  const { idSuffix, ...fields } = details;
  return {
    id: `${ruleId}-${details.row ?? 'file'}-${details.column ?? ''}${idSuffix ? `-${idSuffix}` : ''}`,
    ruleId,
    severity,
    category: 'parser',
    message,
    explanation: details.explanation ?? parserExplanation(ruleId),
    fixSafety: details.fixSafety ?? 'manual',
    ...fields,
  };
}

export function parseCsv(input: string, options: CsvParseOptions = {}): ParsedCsv {
  const issues: CsvIssue[] = [];
  const source = input.startsWith('\uFEFF') ? input.slice(1) : input;
  const maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CHARACTERS;
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;

  if (source.length > maxCharacters) {
    return {
      headers: [],
      rows: [],
      delimiter: options.delimiter ?? ',',
      issues: [issue('file-too-large', 'error', `File exceeds the configured ${maxCharacters.toLocaleString()} character limit.`)],
    };
  }

  const selected = options.delimiter
    ? { delimiter: options.delimiter, ambiguous: false }
    : chooseDelimiter(source);
  if (selected.ambiguous) {
    issues.push(issue(
      'delimiter-ambiguous',
      'warning',
      'More than one delimiter fits this file. Confirm the delimiter before relying on the results.',
      { fixSafety: 'manual' },
    ));
  }

  const result = Papa.parse<string[]>(source, {
    delimiter: selected.delimiter,
    preview: maxRows + 2,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });
  const matrix = result.data;

  if (result.errors.length > 0) {
    for (const parseError of result.errors) {
      issues.push(issue(
        `parser-${parseError.code.toLowerCase()}`,
        'error',
        parseError.message,
        { row: (parseError.row ?? 0) + 1, fixSafety: 'manual' },
      ));
    }
  }

  if (matrix.length === 0 || (matrix.length === 1 && matrix[0]?.every((cell) => cell === ''))) {
    issues.push(issue('file-empty', 'error', 'The CSV is empty or has no header row.'));
    return { headers: [], rows: [], issues, delimiter: selected.delimiter };
  }

  if (matrix.length - 1 > maxRows) {
    issues.push(issue(
      'row-limit-exceeded',
      'error',
      `File has more than the configured ${maxRows.toLocaleString()} data row limit.`,
      { fixSafety: 'manual' },
    ));
  }

  const [headers = [], ...rows] = matrix;
  const seen = new Map<string, number>();
  headers.forEach((header, index) => {
    const key = header.trim().toLowerCase();
    const firstIndex = seen.get(key);
    if (firstIndex !== undefined) {
      issues.push(issue(
        'duplicate-header',
        'error',
        `Header duplicates column ${firstIndex + 1}.`,
        { row: 1, column: header || `Column ${index + 1}`, originalValue: header, fixSafety: 'manual', idSuffix: `c${index + 1}` },
      ));
    } else {
      seen.set(key, index);
    }
  });

  rows.forEach((row, index) => {
    if (row.length !== headers.length) {
      issues.push(issue(
        'column-count-mismatch',
        'error',
        `Row has ${row.length} cells; the header has ${headers.length}.`,
        { row: index + 2, fixSafety: 'manual' },
      ));
    }
  });

  return { headers, rows, issues, delimiter: selected.delimiter };
}
