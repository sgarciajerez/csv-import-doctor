import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import type { HeadersFunction, LoaderFunctionArgs } from 'react-router';
import {
  applyRepairs,
  createAnalysisReport,
  proposeWhitespaceRepairs,
  serializeCsv,
  undoRepairs,
  validateShopifyProductCsv,
} from '../../../packages/csv-doctor-core/src/index.js';
import type { AppliedRepair, CsvIssue, ImportMode, ParsedCsv, RepairProposal } from '../../../packages/csv-doctor-core/src/index.js';
import { authenticate } from '../shopify.server';
import { boundary } from '@shopify/shopify-app-react-router/server';

const MAX_FILE_BYTES = 20_000_000;
const MAX_VISIBLE_ITEMS = 100;
const MAX_PREVIEW_CELL_LENGTH = 500;

const buttonStyle: CSSProperties = {
  border: '1px solid #8c9196',
  borderRadius: 8,
  background: '#fff',
  color: '#202223',
  padding: '9px 14px',
  cursor: 'pointer',
  font: 'inherit',
};

function downloadFile(content: string, mimeType: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function hasIncompleteParse(issues: CsvIssue[]): boolean {
  return issues.some((issue) => issue.ruleId === 'file-empty'
    || issue.ruleId === 'file-too-large'
    || issue.ruleId === 'row-limit-exceeded'
    || issue.ruleId.startsWith('parser-'));
}

function previewCell(value: string): string {
  if (value.length <= MAX_PREVIEW_CELL_LENGTH) return value;
  let end = MAX_PREVIEW_CELL_LENGTH;
  const last = value.charCodeAt(end - 1);
  const next = value.charCodeAt(end);
  if (last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) end -= 1;
  return `${value.slice(0, end)}…`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const [mode, setMode] = useState<ImportMode>('create');
  const [filename, setFilename] = useState('');
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [parseIssues, setParseIssues] = useState<CsvIssue[]>([]);
  const [issues, setIssues] = useState<CsvIssue[]>([]);
  const [proposals, setProposals] = useState<RepairProposal[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [appliedRepairs, setAppliedRepairs] = useState<AppliedRepair[]>([]);
  const [repairHistory, setRepairHistory] = useState<AppliedRepair[][]>([]);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisAnnouncement, setAnalysisAnnouncement] = useState('');
  const [needsDelimiterConfirmation, setNeedsDelimiterConfirmation] = useState(false);
  const [manualDelimiter, setManualDelimiter] = useState('');
  const [issueSeverity, setIssueSeverity] = useState('all');
  const [issueSearch, setIssueSearch] = useState('');
  const [repairSearch, setRepairSearch] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const fileRef = useRef<File | null>(null);

  const errorCount = useMemo(() => issues.filter((issue) => issue.severity === 'error').length, [issues]);
  const warningCount = useMemo(() => issues.filter((issue) => issue.severity === 'warning').length, [issues]);
  const incompleteParse = hasIncompleteParse(parseIssues);
  const delimiterUnconfirmed = needsDelimiterConfirmation && !manualDelimiter;
  const exportBlocked = incompleteParse || delimiterUnconfirmed || isAnalyzing;
  const previewRows = csv?.rows.slice(0, 10) ?? [];
  const previewColumnCount = csv
    ? Math.min(20, Math.max(csv.headers.length, ...previewRows.map((row) => row.length)))
    : 0;
  const hasTruncatedPreviewCells = previewRows.some((row) => row.slice(0, 20).some((cell) => cell.length > MAX_PREVIEW_CELL_LENGTH));
  const visibleIssues = useMemo(() => {
    const query = issueSearch.trim().toLocaleLowerCase();
    return issues.filter((issue) => (issueSeverity === 'all' || issue.severity === issueSeverity)
      && (!query || `${issue.message} ${issue.ruleId} ${issue.column ?? ''} ${issue.row ?? ''}`.toLocaleLowerCase().includes(query)));
  }, [issueSearch, issueSeverity, issues]);
  const visibleProposals = useMemo(() => {
    const query = repairSearch.trim().toLocaleLowerCase();
    return proposals.filter((proposal) => !query || `${proposal.message} ${proposal.column} ${proposal.row} ${proposal.originalValue} ${proposal.suggestedValue}`.toLocaleLowerCase().includes(query));
  }, [proposals, repairSearch]);

  useEffect(() => () => {
    workerRef.current?.terminate();
    fileRef.current = null;
  }, []);

  async function analyzeFile(file: File, delimiter?: string) {
    setError('');
    setFilename('');
    setCsv(null);
    setIssues([]);
    setParseIssues([]);
    setProposals([]);
    setSelectedIds([]);
    setAppliedRepairs([]);
    setRepairHistory([]);
    setIsAnalyzing(false);
    workerRef.current?.terminate();
    workerRef.current = null;

    if (!file.name.toLocaleLowerCase().endsWith('.csv')) {
      setError('Selecciona un archivo con extensión .csv.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('El archivo supera el límite local de análisis de 20 MB.');
      return;
    }

    try {
      fileRef.current = file;
      setIsAnalyzing(true);
      setAnalysisAnnouncement('Analizando el archivo localmente.');
      const worker = new Worker(new URL('../workers/csv-analysis.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<{ ok: true; parsed: ParsedCsv; issues: CsvIssue[]; proposals: RepairProposal[] } | { ok: false; message: string }>) => {
        if (workerRef.current !== worker) return;
        worker.terminate();
        workerRef.current = null;
        setIsAnalyzing(false);
        if (event.data.ok === false) {
          fileRef.current = null;
          setError(event.data.message);
          setAnalysisAnnouncement('');
          return;
        }
        const { parsed, proposals: nextProposals } = event.data;
        setFilename(file.name);
        setCsv({ ...parsed, issues: event.data.issues });
        setParseIssues(parsed.issues);
        setIssues(event.data.issues);
        setProposals(nextProposals);
        const hasAmbiguousDelimiter = parsed.issues.some((issue) => issue.ruleId === 'delimiter-ambiguous');
        setNeedsDelimiterConfirmation((current) => current || hasAmbiguousDelimiter);
        if (!delimiter && !hasAmbiguousDelimiter) fileRef.current = null;
        setAnalysisAnnouncement(`Análisis completado: ${parsed.rows.length} filas y ${event.data.issues.length} incidencias.`);
      };
      worker.onerror = () => {
        if (workerRef.current !== worker) return;
        worker.terminate();
        workerRef.current = null;
        fileRef.current = null;
        setIsAnalyzing(false);
        setError('No se pudo analizar el archivo en este navegador. Prueba con un CSV más pequeño o revisa su codificación.');
        setAnalysisAnnouncement('');
      };
      worker.postMessage({ file, mode, delimiter });
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      fileRef.current = null;
      setIsAnalyzing(false);
      setError('No se pudo iniciar el análisis local.');
      setAnalysisAnnouncement('');
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = '';
    fileRef.current = null;
    setFileSizeBytes(file.size);
    setNeedsDelimiterConfirmation(false);
    setManualDelimiter('');
    void analyzeFile(file);
  }

  function confirmDelimiter(event: ChangeEvent<HTMLSelectElement>) {
    const delimiter = event.currentTarget.value;
    setManualDelimiter(delimiter);
    const file = fileRef.current;
    if (file && delimiter) void analyzeFile(file, delimiter);
  }

  function changeMode(nextMode: ImportMode) {
    setMode(nextMode);
    if (!csv) return;
    const nextIssues = [...parseIssues, ...validateShopifyProductCsv(csv, { mode: nextMode, fileSizeBytes })];
    setIssues(nextIssues);
    setCsv({ ...csv, issues: nextIssues });
  }

  function toggleProposal(id: string) {
    setSelectedIds((selected) => selected.includes(id)
      ? selected.filter((selectedId) => selectedId !== id)
      : [...selected, id]);
  }

  function applySelectedRepairs() {
    if (!csv || selectedIds.length === 0) return;
    const result = applyRepairs(
      csv,
      proposals,
      selectedIds,
      (draft) => [...parseIssues, ...validateShopifyProductCsv(draft, { mode, fileSizeBytes })],
    );
    setCsv(result.csv);
    setIssues(result.csv.issues);
    setAppliedRepairs((previous) => [...previous, ...result.applied]);
    if (result.applied.length > 0) setRepairHistory((previous) => [...previous, result.applied]);
    setProposals(proposeWhitespaceRepairs(result.csv));
    setSelectedIds([]);
  }

  function undoLastRepairBatch() {
    if (!csv || repairHistory.length === 0) return;
    const lastBatch = repairHistory[repairHistory.length - 1]!;
    const result = undoRepairs(
      csv,
      lastBatch,
      (draft) => [...parseIssues, ...validateShopifyProductCsv(draft, { mode, fileSizeBytes })],
    );
    const undoneIds = new Set(result.undone.map((repair) => repair.id));
    setCsv(result.csv);
    setIssues(result.csv.issues);
    setAppliedRepairs((previous) => previous.filter((repair) => !undoneIds.has(repair.id)));
    setRepairHistory((previous) => previous.slice(0, -1));
    setProposals(proposeWhitespaceRepairs(result.csv));
    setSelectedIds([]);
  }

  function exportCsv() {
    if (!csv) return;
    const result = serializeCsv(csv, { delimiter: ',', newline: '\n' });
    const baseName = filename.replace(/\.csv$/i, '') || 'shopify-products';
    downloadFile(result.content, 'text/csv;charset=utf-8', `${baseName}-reviewed.csv`);
  }

  function exportReport() {
    if (!csv) return;
    const report = createAnalysisReport(csv.rows.length, issues, appliedRepairs);
    const baseName = filename.replace(/\.csv$/i, '') || 'shopify-products';
    downloadFile(JSON.stringify(report, null, 2), 'application/json;charset=utf-8', `${baseName}-report.json`);
  }

  return (
    <s-page heading="CSV Import Doctor">
      <s-section heading="Analiza un CSV de productos">
        <div style={{ display: 'grid', gap: 16, maxWidth: 760 }}>
          <p style={{ margin: 0, color: '#616161' }}>
            El archivo se lee y analiza en este navegador. No se envía a Shopify ni al servidor de la app.
          </p>
          <p style={{ margin: 0, color: '#616161' }}>
            Shopify procesa el inicio de sesión. La app conserva en su servidor los datos técnicos de esa sesión; no consulta productos ni clientes de la tienda.
            {' '}<a href="/privacy" target="_blank" rel="noreferrer">Consulta qué datos se guardan y durante cuánto tiempo.</a>
          </p>
          <p role="status" aria-live="polite" aria-atomic="true" style={{ margin: 0 }}>{analysisAnnouncement}</p>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Tipo de importación</span>
            <select value={mode} disabled={isAnalyzing} onChange={(event) => changeMode(event.currentTarget.value as ImportMode)} style={{ ...buttonStyle, width: 'fit-content' }}>
              <option value="create">Crear productos</option>
              <option value="update">Actualizar productos</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Archivo CSV (hasta 20 MB para análisis local; Shopify limita los CSV de productos a 15 MB)</span>
            <input type="file" accept=".csv,text/csv" onChange={selectFile} />
          </label>
          {needsDelimiterConfirmation && <label style={{ display: 'grid', gap: 6 }}>
            <span>Confirma el separador del CSV; el exportado para Shopify usará comas.</span>
            <select aria-label="Confirmar separador del CSV" value={manualDelimiter} onChange={confirmDelimiter} disabled={isAnalyzing} style={{ ...buttonStyle, width: 'fit-content' }}>
              <option value="">Selecciona el separador correcto</option>
              <option value=",">Coma (,)</option>
              <option value=";">Punto y coma (;)</option>
              <option value="\t">Tabulador</option>
              <option value="|">Barra vertical (|)</option>
            </select>
          </label>}
          {isAnalyzing && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><s-spinner size="base" accessibilityLabel="Analizando" />Analizando localmente… <button type="button" style={buttonStyle} onClick={() => { workerRef.current?.terminate(); workerRef.current = null; fileRef.current = null; setIsAnalyzing(false); setAnalysisAnnouncement('Análisis cancelado.'); }}>Cancelar</button></div>}
          {error && <p role="alert" style={{ color: '#b42318', margin: 0 }}>{error}</p>}
          {filename && <p style={{ margin: 0 }}>Archivo: <strong>{filename}</strong></p>}
        </div>
      </s-section>

      {csv && (
        <>
          <s-section heading="Resultado del análisis">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <span><strong>{csv.rows.length}</strong> filas</span>
              <span><strong>{csv.headers.length}</strong> columnas</span>
              <span><strong>{errorCount}</strong> errores</span>
              <span><strong>{warningCount}</strong> advertencias</span>
              <span>Separador: <code>{csv.delimiter === '\t' ? 'tabulador' : csv.delimiter}</code></span>
            </div>
            {issues.length === 0
              ? <p>No se encontraron incidencias en las reglas actuales.</p>
              : <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 4 }}><span>Filtrar por tipo</span><select value={issueSeverity} onChange={(event) => setIssueSeverity(event.currentTarget.value)} style={buttonStyle}><option value="all">Todas</option><option value="error">Errores</option><option value="warning">Advertencias</option><option value="info">Información</option></select></label>
                  <label style={{ display: 'grid', gap: 4, flex: '1 1 240px' }}><span>Buscar incidencia</span><input type="search" value={issueSearch} onChange={(event) => setIssueSearch(event.currentTarget.value)} placeholder="Regla, mensaje, fila o columna" style={buttonStyle} /></label>
                </div>
                <p aria-live="off">{visibleIssues.length} de {issues.length} incidencias</p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {visibleIssues.slice(0, MAX_VISIBLE_ITEMS).map((issue) => (
                    <div key={issue.id} style={{ border: '1px solid #e1e3e5', borderRadius: 8, padding: 12 }}>
                      <strong>{issue.severity === 'error' ? 'Error' : issue.severity === 'warning' ? 'Revisar' : 'Información'}:</strong>{' '}
                      {issue.message}
                      <s-badge>{issue.category === 'parser' ? 'Estructura CSV' : issue.category === 'recommendation' ? 'Recomendaci\u00f3n' : 'Formato Shopify'}</s-badge>
                      {issue.explanation && <small style={{ display: 'block', marginTop: 4 }}>{issue.explanation}</small>}
                      {(issue.row || issue.column) && <small style={{ display: 'block', color: '#616161', marginTop: 4 }}>Fila {issue.row ?? '—'}{issue.column ? ` · ${issue.column}` : ''}</small>}
                      {issue.sourceUrl && <small style={{ display: 'block', marginTop: 4 }}><a href={issue.sourceUrl} target="_blank" rel="noreferrer">Fuente de Shopify ({issue.profileVersion})</a></small>}
                    </div>
                  ))}
                </div>
                {visibleIssues.length > MAX_VISIBLE_ITEMS && <p>Se muestran las primeras {MAX_VISIBLE_ITEMS}. Usa la búsqueda para acotar la lista.</p>}
                {visibleIssues.length === 0 && <p>No hay incidencias que coincidan con esos filtros.</p>}
              </>}
          </s-section>

          <s-section heading="Reparaciones sugeridas">
            {delimiterUnconfirmed
              ? <p>Confirma el separador del CSV antes de revisar o aplicar reparaciones.</p>
              : incompleteParse
              ? <p>No se ofrecen reparaciones porque el archivo no se pudo analizar completo.</p>
              : proposals.length === 0
              ? <p>No quedan propuestas de limpieza de espacios.</p>
              : <>
                  <p>Revisa cada cambio. Solo se aplicarán las casillas que selecciones.</p>
                  <label style={{ display: 'grid', gap: 4, maxWidth: 420, marginBottom: 12 }}><span>Buscar propuesta de reparación</span><input type="search" value={repairSearch} onChange={(event) => setRepairSearch(event.currentTarget.value)} placeholder="Columna, fila o valor" style={buttonStyle} /></label>
                  <p aria-live="off">{visibleProposals.length} de {proposals.length} propuestas</p>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {visibleProposals.slice(0, MAX_VISIBLE_ITEMS).map((proposal) => (
                      <label key={proposal.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, borderBottom: '1px solid #e1e3e5', padding: '8px 0' }}>
                        <input type="checkbox" checked={selectedIds.includes(proposal.id)} onChange={() => toggleProposal(proposal.id)} />
                        <span>Fila {proposal.row}, {proposal.column}: <code>{JSON.stringify(proposal.originalValue)}</code> → <code>{JSON.stringify(proposal.suggestedValue)}</code></span>
                      </label>
                    ))}
                  </div>
                  {visibleProposals.length > MAX_VISIBLE_ITEMS && <p>Se muestran las primeras {MAX_VISIBLE_ITEMS}. Usa la búsqueda para acotar la lista.</p>}
                  {visibleProposals.length === 0 && <p>No hay propuestas que coincidan con la búsqueda.</p>}
                  <button type="button" style={buttonStyle} disabled={selectedIds.length === 0} onClick={applySelectedRepairs}>
                    Aplicar {selectedIds.length || ''} seleccionada{selectedIds.length === 1 ? '' : 's'}
                  </button>
                </>}
            {repairHistory.length > 0 && <button type="button" style={buttonStyle} onClick={undoLastRepairBatch}>Deshacer última aplicación</button>}
            {appliedRepairs.length > 0 && <p role="status">Cambios aplicados: {appliedRepairs.length}. El análisis se volvió a ejecutar.</p>}
          </s-section>

          <s-section heading="Vista previa">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: '100%', textAlign: 'left' }}>
                <caption style={{ textAlign: 'left', padding: 8 }}>Vista previa de las primeras {Math.min(10, csv.rows.length)} filas del CSV</caption>
                <thead><tr>{Array.from({ length: previewColumnCount }, (_, index) => <th scope="col" key={`${index}-${csv.headers[index] ?? ''}`} style={{ borderBottom: '1px solid #8c9196', padding: 8 }}>{csv.headers[index] || `Columna ${index + 1}${index >= csv.headers.length ? ' (sin encabezado)' : ''}`}</th>)}</tr></thead>
                <tbody>{previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>{Array.from({ length: previewColumnCount }, (_, columnIndex) => <td key={columnIndex} style={{ borderBottom: '1px solid #e1e3e5', padding: 8, whiteSpace: 'pre-wrap' }}>{previewCell(row[columnIndex] ?? '')}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
            {csv.rows.length > 10 && <p>Se muestran las primeras 10 de {csv.rows.length} filas.</p>}
            {Math.max(csv.headers.length, ...previewRows.map((row) => row.length)) > 20 && <p>Se muestran las primeras 20 columnas.</p>}
            {hasTruncatedPreviewCells && <p>Las celdas extensas se recortan solo en esta vista previa; el CSV exportado conserva el contenido completo.</p>}
          </s-section>

          <s-section heading="Exportación">
            <p>El CSV conserva los valores para Shopify. Una mitigación de fórmulas alteraría celdas y podría cambiar el resultado de la importación.</p>
            {delimiterUnconfirmed && <p role="alert">Descarga bloqueada: confirma el separador antes de exportar este archivo.</p>}
            {incompleteParse && <p role="alert">Descarga bloqueada: el análisis detectó un archivo vacío, un límite superado o sintaxis CSV inválida.</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" style={buttonStyle} disabled={exportBlocked} onClick={exportCsv}>Descargar CSV revisado</button>
              <button type="button" style={buttonStyle} disabled={exportBlocked} onClick={exportReport}>Descargar informe JSON</button>
            </div>
          </s-section>
        </>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
