export type Severity = 'error' | 'warning' | 'info';
export type FixSafety = 'safe' | 'review' | 'manual';
export type ImportMode = 'create' | 'update';

export interface CsvIssue {
  id: string;
  ruleId: string;
  severity: Severity;
  /** Logical CSV record number, including the header as row 1. */
  row?: number;
  column?: string;
  message: string;
  explanation?: string;
  originalValue?: string;
  suggestedValue?: string;
  fixSafety?: FixSafety;
}

export interface CsvParseOptions {
  /** Explicit delimiter. When omitted, the parser selects a likely delimiter. */
  delimiter?: string;
  maxRows?: number;
  maxCharacters?: number;
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  issues: CsvIssue[];
  delimiter: string;
}

export interface ValidationOptions {
  mode: ImportMode;
}
