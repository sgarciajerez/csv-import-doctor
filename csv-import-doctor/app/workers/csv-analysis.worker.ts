import {
  parseCsv,
  proposeWhitespaceRepairs,
  validateShopifyProductCsv,
} from '../../../packages/csv-doctor-core/src/index.js';
import type { CsvIssue, ImportMode, ParsedCsv, RepairProposal } from '../../../packages/csv-doctor-core/src/index.js';

interface AnalysisRequest {
  file: File;
  mode: ImportMode;
  delimiter?: string;
}

type AnalysisResponse =
  | { ok: true; parsed: ParsedCsv; issues: CsvIssue[]; proposals: RepairProposal[] }
  | { ok: false; message: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<AnalysisRequest>) => void) | null;
  postMessage: (message: AnalysisResponse) => void;
};

workerScope.onmessage = async (event: MessageEvent<AnalysisRequest>): Promise<void> => {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await event.data.file.arrayBuffer());
    const parsed = parseCsv(text, { delimiter: event.data.delimiter });
    const issues = [...parsed.issues, ...validateShopifyProductCsv(parsed, {
      mode: event.data.mode,
      fileSizeBytes: event.data.file.size,
    })];
    const incomplete = parsed.issues.some((issue) => issue.ruleId === 'file-empty'
      || issue.ruleId === 'file-too-large'
      || issue.ruleId === 'row-limit-exceeded'
      || issue.ruleId.startsWith('parser-'));
    const proposals = incomplete ? [] : proposeWhitespaceRepairs(parsed);
    workerScope.postMessage({ ok: true, parsed, issues, proposals });
  } catch {
    workerScope.postMessage({ ok: false, message: 'No se pudo leer como UTF-8. El archivo permanece en este navegador.' });
  }
};
