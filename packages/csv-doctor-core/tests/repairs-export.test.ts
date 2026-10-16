import { describe, expect, it } from 'vitest';
import {
  applyRepairs,
  createAnalysisReport,
  parseCsv,
  proposeWhitespaceRepairs,
  serializeCsv,
  undoRepairs,
} from '../src/index.js';

describe('repairs', () => {
  it('proposes reviewable whitespace fixes and applies only selected fixes to a copy', () => {
    const original = parseCsv('Title,SKU\n Mug , 123 ');
    const proposals = proposeWhitespaceRepairs(original);
    expect(proposals).toHaveLength(2);
    expect(proposals[0]).toMatchObject({ row: 2, column: 'Title', safety: 'review', originalValue: ' Mug ', suggestedValue: 'Mug' });

    const result = applyRepairs(original, proposals, [proposals[0]!.id], (draft) => draft.issues);
    expect(result.csv.rows).toEqual([['Mug', ' 123 ']]);
    expect(result.applied).toHaveLength(1);
    expect(result.skipped).toEqual([{ id: proposals[1]!.id, reason: 'not-selected' }]);
    expect(original.rows).toEqual([[' Mug ', ' 123 ']]);
  });

  it('skips selected proposals whose source value has changed', () => {
    const csv = parseCsv('Title\nMug');
    const proposal = proposeWhitespaceRepairs(parseCsv('Title\n Mug'))[0]!;
    const result = applyRepairs(csv, [proposal], [proposal.id], (draft) => draft.issues);
    expect(result.applied).toEqual([]);
    expect(result.skipped).toEqual([{ id: proposal.id, reason: 'stale' }]);
    expect(result.csv.rows).toEqual([['Mug']]);
  });

  it('undoes the last applied repair batch on a copy and revalidates', () => {
    const original = parseCsv('Title,SKU\n Mug , 123 ');
    const proposals = proposeWhitespaceRepairs(original);
    const applied = applyRepairs(original, proposals, [proposals[0]!.id], (draft) => draft.issues);
    const undone = undoRepairs(applied.csv, applied.applied, (draft) => [...draft.issues, {
      id: 'revalidated', ruleId: 'revalidated', severity: 'info', category: 'parser',
      message: 'Revalidated after undo.', explanation: 'The CSV was checked again.', fixSafety: 'manual',
    }]);

    expect(undone.csv.rows).toEqual(original.rows);
    expect(undone.undone).toEqual(applied.applied);
    expect(undone.skipped).toEqual([]);
    expect(undone.csv.issues).toContainEqual(expect.objectContaining({ ruleId: 'revalidated' }));
    expect(applied.csv.rows).toEqual([['Mug', ' 123 ']]);
  });

  it('does not overwrite a cell changed after the repair when undoing', () => {
    const original = parseCsv('Title\n Mug ');
    const proposal = proposeWhitespaceRepairs(original)[0]!;
    const applied = applyRepairs(original, [proposal], [proposal.id], (draft) => draft.issues);
    const staleCsv = { ...applied.csv, rows: [['Different value']] };
    const undone = undoRepairs(staleCsv, applied.applied, (draft) => draft.issues);

    expect(undone.csv.rows).toEqual([['Different value']]);
    expect(undone.undone).toEqual([]);
    expect(undone.skipped).toEqual([{ id: proposal.id, reason: 'stale' }]);
  });
});

describe('CSV export', () => {
  it('round-trips quoted delimiters, quotes, embedded newlines, and Unicode', () => {
    const original = 'Title,Description\r\nMug,"A, ""nice"" mug\nfor café"';
    const parsed = parseCsv(original);
    const exported = serializeCsv(parsed);
    expect(parseCsv(exported.content).headers).toEqual(parsed.headers);
    expect(parseCsv(exported.content).rows).toEqual(parsed.rows);
    expect(exported.formulaProtections).toEqual([]);
  });

  it('can normalize a non-comma source delimiter for Shopify product CSV export', () => {
    const parsed = parseCsv('Title;Description\nMug;"A cup; with detail"');
    const exported = serializeCsv(parsed, { delimiter: ',', newline: '\n' });
    expect(exported.content).toBe('Title,Description\nMug,A cup; with detail');
    expect(parseCsv(exported.content).rows).toEqual(parsed.rows);
  });

  it('preserves formula-like cells by default and lists explicit spreadsheet protections', () => {
    const parsed = parseCsv('Title,Value\nMug,=1+1\nCup,+cmd\nPlate,-1\nBowl,@test\nTag,\t=1+1\nControl,\u0001value');
    const unchanged = serializeCsv(parsed);
    expect(unchanged.content).toContain('=1+1');
    expect(unchanged.formulaProtections).toEqual([]);

    const protectedExport = serializeCsv(parsed, { prefixFormulaCellsWithApostrophe: true, includeBom: true });
    expect(protectedExport.content.startsWith('\uFEFF')).toBe(true);
    expect(protectedExport.formulaProtections.map((cell) => cell.row)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(protectedExport.content).toContain("'=1+1");
    expect(protectedExport.content).toContain("'\t=1+1");
    expect(protectedExport.content).toContain("'\u0001value");
  });

  it('creates a report with issue totals and applied changes but no full CSV', () => {
    const csv = parseCsv('Title\nMug');
    const report = createAnalysisReport(1, [
      { id: 'x', ruleId: 'x', severity: 'error', category: 'parser', message: 'Needs attention.', explanation: 'Parser check.', fixSafety: 'manual' },
      { id: 'y', ruleId: 'y', severity: 'warning', category: 'recommendation', message: 'Review this.', explanation: 'Review guidance.', fixSafety: 'manual' },
    ], [], '2026-10-15T12:00:00.000Z');
    expect(report.summary).toEqual({ dataRows: 1, issueCount: 2, errorCount: 1, warningCount: 1, infoCount: 0, appliedRepairCount: 0 });
    expect(report.analyzedAt).toBe('2026-10-15T12:00:00.000Z');
    expect(JSON.stringify(report)).not.toContain('Mug');
    expect(csv.rows[0]).toEqual(['Mug']);
  });
});
