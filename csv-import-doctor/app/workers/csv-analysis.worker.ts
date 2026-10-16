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
  | { progress: string }
  | { ok: true; parsed: ParsedCsv; issues: CsvIssue[]; proposals: RepairProposal[] }
  | { ok: false; message: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<AnalysisRequest>) => void) | null;
  postMessage: (message: AnalysisResponse) => void;
};

workerScope.onmessage = async (event: MessageEvent<AnalysisRequest>): Promise<void> => {
  try {
    workerScope.postMessage({ progress: 'Leyendo archivo localmente…' });
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await event.data.file.arrayBuffer());
    workerScope.postMessage({ progress: 'Analizando la estructura CSV…' });
    const parsed = parseCsv(text, { delimiter: event.data.delimiter });
    workerScope.postMessage({ progress: 'Comprobando reglas del perfil…' });
    const issues = [...parsed.issues, ...validateShopifyProductCsv(parsed, {
      mode: event.data.mode,
      fileSizeBytes: event.data.file.size,
    })];
    const incomplete = parsed.issues.some((issue) => issue.ruleId === 'file-empty'
      || issue.ruleId === 'file-too-large'
      || issue.ruleId === 'row-limit-exceeded'
      || issue.ruleId.startsWith('parser-'));
    workerScope.postMessage({ progress: 'Preparando reparaciones sugeridas…' });
    const proposals = incomplete ? [] : proposeWhitespaceRepairs(parsed);
    workerScope.postMessage({ ok: true, parsed, issues, proposals });
  } catch {
    workerScope.postMessage({ ok: false, message: 'No se pudo leer como UTF-8. El archivo permanece en este navegador.' });
  }
};
