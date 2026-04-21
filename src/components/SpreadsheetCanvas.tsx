import { useCallback, useEffect, useMemo, useState, type ChangeEventHandler } from 'react';
import type { ProjectDocument, SheetMeta, WorkbookMeta } from '@/types/project';
import { Plus, Table2, Upload } from 'lucide-react';
import {
  appendEmptyRow,
  createDefaultSheet,
  ensureSheetTable,
  ingestFileToSheet,
  loadViewport,
  updateCellValue,
  type SpreadsheetViewport,
} from '@/services/spreadsheet/workbook';
import { Button } from '@/components/ui/button';

interface SpreadsheetCanvasProps {
  document: ProjectDocument;
  onChange: (updates: Partial<ProjectDocument>) => void;
}

export function SpreadsheetCanvas({ document }: SpreadsheetCanvasProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [viewport, setViewport] = useState<SpreadsheetViewport>({ columns: [], rows: [], totalRows: 0 });
  const [editingCell, setEditingCell] = useState<{ rowid: number; column: string; value: string } | null>(null);

  const workbook = document.workbook;
  const limit = 25;

  const activeSheet = useMemo(() => {
    if (!workbook || workbook.sheets.length === 0) return null;
    return workbook.sheets[workbook.activeSheetIndex] ?? workbook.sheets[0] ?? null;
  }, [workbook]);

  const patchWorkbook = useCallback((nextWorkbook: WorkbookMeta) => {
    onChange({ workbook: nextWorkbook });
  }, [onChange]);

  const updateActiveSheet = useCallback((nextSheet: SheetMeta) => {
    if (!workbook) return;
    const sheets = workbook.sheets.map((sheet) => sheet.id === nextSheet.id ? nextSheet : sheet);
    patchWorkbook({ ...workbook, sheets });
  }, [workbook, patchWorkbook]);

  const refreshViewport = useCallback(async () => {
    if (!activeSheet) return;
    setIsLoading(true);
    setError(null);
    try {
      const schema = await ensureSheetTable(activeSheet);
      if (activeSheet.schema.length === 0 && schema.length > 0) {
        updateActiveSheet({ ...activeSheet, schema });
      }
      const nextViewport = await loadViewport({ ...activeSheet, schema }, offset, limit);
      setViewport(nextViewport);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load spreadsheet data.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeSheet, offset, updateActiveSheet]);

  useEffect(() => {
    void refreshViewport();
  }, [refreshViewport]);

  const handleSelectSheet = (index: number) => {
    if (!workbook) return;
    patchWorkbook({ ...workbook, activeSheetIndex: index });
    setOffset(0);
  };

  const handleAddSheet = async () => {
    if (!workbook) return;
    const nextSheet = createDefaultSheet(`Sheet ${workbook.sheets.length + 1}`);
    await ensureSheetTable(nextSheet);
    const sheets = [...workbook.sheets, nextSheet];
    patchWorkbook({ ...workbook, sheets, activeSheetIndex: sheets.length - 1 });
    setOffset(0);
  };

  const handleImport = async (file: File) => {
    if (!activeSheet) return;
    setIsLoading(true);
    setError(null);
    try {
      const schema = await ingestFileToSheet(activeSheet, file);
      updateActiveSheet({ ...activeSheet, schema });
      setOffset(0);
      const nextViewport = await loadViewport({ ...activeSheet, schema }, 0, limit);
      setViewport(nextViewport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import spreadsheet file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInput: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleImport(file);
    event.target.value = '';
  };

  const handleAppendRow = async () => {
    if (!activeSheet) return;
    setIsLoading(true);
    setError(null);
    try {
      await appendEmptyRow(activeSheet);
      await refreshViewport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to append row.');
      setIsLoading(false);
    }
  };

  const handleSaveCell = async () => {
    if (!activeSheet || !editingCell) return;
    setIsLoading(true);
    setError(null);
    try {
      await updateCellValue(activeSheet, editingCell.rowid, editingCell.column, editingCell.value);
      setEditingCell(null);
      await refreshViewport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cell.');
      setIsLoading(false);
    }
  };

  if (!workbook || !activeSheet) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Spreadsheet metadata is missing.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Table2 className="size-4 text-emerald-500" />
          <h2 className="text-sm font-medium text-foreground">{document.title}</h2>
          <span className="text-xs text-muted-foreground">{viewport.totalRows} rows</span>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.json,.xlsx"
              className="hidden"
              onChange={handleFileInput}
            />
            <span className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:text-foreground">
              <Upload className="size-3.5" /> Import
            </span>
          </label>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => void handleAddSheet()}>
            <Plus className="size-3.5" /> Sheet
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void handleAppendRow()}>
            Add row
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        {workbook.sheets.map((sheet, index) => (
          <button
            key={sheet.id}
            type="button"
            onClick={() => handleSelectSheet(index)}
            className={[
              'rounded-md px-2 py-1 text-xs transition-colors',
              index === workbook.activeSheetIndex
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            ].join(' ')}
          >
            {sheet.name}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted/20 p-2">
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        {isLoading && <p className="mb-2 text-xs text-muted-foreground">Loading spreadsheet...</p>}
        <div className="overflow-auto rounded-lg border border-border bg-background">
          <table className="min-w-full border-collapse text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="border-b border-r border-border px-2 py-1 text-left font-medium text-muted-foreground">#</th>
                {viewport.columns.map((column) => (
                  <th key={column} className="border-b border-r border-border px-2 py-1 text-left font-medium text-muted-foreground">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viewport.rows.length === 0 && (
                <tr>
                  <td colSpan={Math.max(2, viewport.columns.length + 1)} className="px-2 py-6 text-center text-muted-foreground">
                    Import CSV/JSON/XLSX to populate this sheet.
                  </td>
                </tr>
              )}
              {viewport.rows.map((row) => (
                <tr key={row.rowid} className="odd:bg-background even:bg-muted/20">
                  <td className="border-r border-border px-2 py-1 text-muted-foreground">{row.rowid}</td>
                  {viewport.columns.map((column) => {
                    const isEditing = editingCell?.rowid === row.rowid && editingCell.column === column;
                    const value = row.values[column] == null ? '' : String(row.values[column]);
                    return (
                      <td
                        key={`${row.rowid}-${column}`}
                        className="border-r border-border px-2 py-1"
                        onDoubleClick={() => setEditingCell({ rowid: row.rowid, column, value })}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingCell.value}
                            aria-label={`Edit ${column}`}
                            title={`Edit ${column}`}
                            className="w-full rounded border border-border bg-background px-1 py-0.5 text-xs"
                            onChange={(event) => setEditingCell((current) => current ? { ...current, value: event.target.value } : current)}
                            onBlur={() => void handleSaveCell()}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                void handleSaveCell();
                              }
                              if (event.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                          />
                        ) : (
                          <span className="block min-w-16 max-w-64 truncate">{value}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Rows {viewport.rows.length === 0 ? 0 : offset + 1}-{Math.min(offset + limit, viewport.totalRows)} of {viewport.totalRows}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setOffset((current) => Math.max(0, current - limit))}
              disabled={offset === 0 || isLoading}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setOffset((current) => current + limit)}
              disabled={offset + limit >= viewport.totalRows || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
