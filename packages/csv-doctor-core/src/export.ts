import type { AnalysisReport, AppliedRepair, CsvExportOptions, CsvExportResult, CsvIssue, ParsedCsv } from './types.js';

function quoteCell(value: string, delimiter: string): string {
  if (!value.includes(delimiter) && !value.includes('"') && !value.includes('\n') && !value.includes('\r')) {
    return value;
  }
  return `"${value.replaceAll('"', '""')}"`;
}

function isSpreadsheetFormulaLike(value: string): boolean {
  return /^(?:[\u0000-\u0020]*[=+\-@]|[\u0000-\u001f])/.test(value);
}

export function serializeCsv(csv: ParsedCsv, options: CsvExportOptions = {}): CsvExportResult {
  const formulaProtections: CsvExportResult['formulaProtections'] = [];
  const records = [csv.headers, ...csv.rows];
  const delimiter = options.delimiter ?? csv.delimiter;
  const content = records.map((record, recordIndex) => record.map((originalValue, columnIndex) => {
    let value = originalValue;
    if (options.prefixFormulaCellsWithApostrophe && recordIndex > 0 && isSpreadsheetFormulaLike(value)) {
      value = `'${value}`;
      formulaProtections.push({
        row: recordIndex + 1,
        column: csv.headers[columnIndex] || `Column ${columnIndex + 1}`,
        originalValue,
        exportedValue: value,
      });
    }
    return quoteCell(value, delimiter);
  }).join(delimiter)).join(options.newline ?? '\r\n');

  return {
    content: `${options.includeBom ? '\uFEFF' : ''}${content}`,
    formulaProtections,
  };
}

export function createAnalysisReport(
  dataRows: number,
  issues: CsvIssue[],
  appliedRepairs: AppliedRepair[],
  analyzedAt = new Date().toISOString(),
): AnalysisReport {
  const count = (severity: CsvIssue['severity']) => issues.filter((item) => item.severity === severity).length;
  return {
    schemaVersion: 1,
    analyzedAt,
    summary: {
      dataRows,
      issueCount: issues.length,
      errorCount: count('error'),
      warningCount: count('warning'),
      infoCount: count('info'),
      appliedRepairCount: appliedRepairs.length,
    },
    appliedRepairs: appliedRepairs.map(({ ruleId, row, column, originalValue, afterValue, message }) => ({
      ruleId,
      row,
      column,
      originalValue,
      afterValue,
      message,
    })),
    unresolvedIssues: issues,
  };
}
