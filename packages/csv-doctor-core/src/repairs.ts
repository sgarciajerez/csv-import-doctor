import type {
  AppliedRepair,
  CsvIssue,
  ParsedCsv,
  RepairProposal,
  RepairResult,
  UndoRepairResult,
} from './types.js';

export function proposeWhitespaceRepairs(csv: ParsedCsv): RepairProposal[] {
  const proposals: RepairProposal[] = [];

  csv.rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const suggestedValue = value.trim();
      if (suggestedValue === value) return;

      const rowNumber = rowIndex + 2;
      const column = csv.headers[columnIndex] || `Column ${columnIndex + 1}`;
      proposals.push({
        id: `trim-whitespace-r${rowNumber}-c${columnIndex + 1}`,
        ruleId: 'trim-cell-whitespace',
        row: rowNumber,
        column,
        columnIndex,
        originalValue: value,
        suggestedValue,
        safety: 'review',
        message: 'Remove leading and trailing whitespace from this cell.',
      });
    });
  });

  return proposals;
}

export function applyRepairs(
  csv: ParsedCsv,
  proposals: RepairProposal[],
  selectedIds: Iterable<string>,
  revalidate: (csv: ParsedCsv) => CsvIssue[],
): RepairResult {
  const selected = new Set(selectedIds);
  const rows = csv.rows.map((row) => [...row]);
  const applied: AppliedRepair[] = [];
  const skipped: RepairResult['skipped'] = [];

  for (const proposal of proposals) {
    if (!selected.has(proposal.id)) {
      skipped.push({ id: proposal.id, reason: 'not-selected' });
      continue;
    }

    const rowIndex = proposal.row - 2;
    const currentRow = rows[rowIndex];
    if (!currentRow || proposal.columnIndex < 0 || proposal.columnIndex >= currentRow.length) {
      skipped.push({ id: proposal.id, reason: 'invalid-target' });
      continue;
    }
    if (
      csv.headers[proposal.columnIndex] !== proposal.column
      || currentRow[proposal.columnIndex] !== proposal.originalValue
    ) {
      skipped.push({ id: proposal.id, reason: 'stale' });
      continue;
    }

    currentRow[proposal.columnIndex] = proposal.suggestedValue;
    applied.push({ ...proposal, afterValue: proposal.suggestedValue });
  }

  const draft: ParsedCsv = { ...csv, rows };
  const updated: ParsedCsv = { ...draft, issues: revalidate(draft) };
  return { csv: updated, applied, skipped };
}

export function undoRepairs(
  csv: ParsedCsv,
  repairs: AppliedRepair[],
  revalidate: (csv: ParsedCsv) => CsvIssue[],
): UndoRepairResult {
  const rows = csv.rows.map((row) => [...row]);
  const undone: AppliedRepair[] = [];
  const skipped: UndoRepairResult['skipped'] = [];

  for (const repair of [...repairs].reverse()) {
    const rowIndex = repair.row - 2;
    const currentRow = rows[rowIndex];
    if (!currentRow || repair.columnIndex < 0 || repair.columnIndex >= currentRow.length) {
      skipped.push({ id: repair.id, reason: 'invalid-target' });
      continue;
    }
    if (
      csv.headers[repair.columnIndex] !== repair.column
      || currentRow[repair.columnIndex] !== repair.afterValue
    ) {
      skipped.push({ id: repair.id, reason: 'stale' });
      continue;
    }

    currentRow[repair.columnIndex] = repair.originalValue;
    undone.push(repair);
  }

  const draft: ParsedCsv = { ...csv, rows };
  const updated: ParsedCsv = { ...draft, issues: revalidate(draft) };
  return { csv: updated, undone, skipped };
}
