export type Severity = 'error' | 'warning' | 'info';
export type FixSafety = 'safe' | 'review' | 'manual';
export type IssueCategory = 'parser' | 'shopify-profile' | 'recommendation';
export type ImportMode = 'create' | 'update';

export interface CsvIssue {
  id: string;
  ruleId: string;
  severity: Severity;
  category: IssueCategory;
  /** Logical CSV record number, including the header as row 1. */
  row?: number;
  column?: string;
  message: string;
  explanation: string;
  sourceUrl?: string;
  profileVersion?: string;
  originalValue?: string;
  suggestedValue?: string;
  fixSafety: FixSafety;
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
  /** Original input size in bytes, used for Shopify's documented product CSV upload limit. */
  fileSizeBytes?: number;
}

export interface RepairProposal {
  id: string;
  ruleId: string;
  row: number;
  column: string;
  columnIndex: number;
  originalValue: string;
  suggestedValue: string;
  safety: FixSafety;
  message: string;
}

export interface AppliedRepair extends RepairProposal {
  afterValue: string;
}

export interface RepairResult {
  csv: ParsedCsv;
  applied: AppliedRepair[];
  skipped: Array<{ id: string; reason: 'not-selected' | 'stale' | 'invalid-target' }>;
}

export interface UndoRepairResult {
  csv: ParsedCsv;
  undone: AppliedRepair[];
  skipped: Array<{ id: string; reason: 'stale' | 'invalid-target' }>;
}

export interface CsvExportOptions {
  /** Output delimiter. Defaults to the parsed delimiter. */
  delimiter?: string;
  /** Prefix formula-like values with an apostrophe. This changes cell data and is not Excel-proof. */
  prefixFormulaCellsWithApostrophe?: boolean;
  includeBom?: boolean;
  newline?: '\n' | '\r\n';
}

export interface FormulaProtection {
  row: number;
  column: string;
  originalValue: string;
  exportedValue: string;
}

export interface CsvExportResult {
  content: string;
  formulaProtections: FormulaProtection[];
}

export interface AnalysisReport {
  schemaVersion: 1;
  analyzedAt: string;
  summary: {
    dataRows: number;
    issueCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    appliedRepairCount: number;
  };
  appliedRepairs: Array<Pick<AppliedRepair, 'ruleId' | 'row' | 'column' | 'originalValue' | 'afterValue' | 'message'>>;
  unresolvedIssues: CsvIssue[];
}
