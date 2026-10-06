import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { ListingInput } from "../types";

type SheetRow = Record<string, unknown>;
type XlsxApi = {
  read(data: ArrayBuffer, options: { type: "array" }): { SheetNames: string[]; Sheets: Record<string, unknown> };
  utils: {
    sheet_to_json<T>(sheet: unknown, options: { defval: string }): T[];
    json_to_sheet(rows: Record<string, unknown>[]): unknown;
    book_new(): unknown;
    book_append_sheet(workbook: unknown, sheet: unknown, name: string): void;
  };
  writeFile(workbook: unknown, fileName: string): void;
};

declare global {
  interface Window { XLSX?: XlsxApi }
}

let xlsxPromise: Promise<XlsxApi> | undefined;
function loadXlsx(): Promise<XlsxApi> {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxPromise) return xlsxPromise;
  xlsxPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.async = true;
    script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error("Excel reader did not initialize."));
    script.onerror = () => reject(new Error("Excel reader could not be loaded. Check your internet connection."));
    document.head.appendChild(script);
  });
  return xlsxPromise;
}

const columns = ["title", "description", "category", "price", "seller", "tags", "imageUrl", "attributes"];

function parseAttributes(value: unknown): Record<string, string> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, string>;
  try {
    const parsed = JSON.parse(String(value));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function parseRow(row: SheetRow): ListingInput {
  const imageUrl = String(row.imageUrl ?? row.image_url ?? "").trim();
  return {
    title: String(row.title ?? "").trim(),
    description: String(row.description ?? "").trim(),
    category: String(row.category ?? "").trim().toUpperCase().replaceAll(" ", "_"),
    price: String(row.price ?? "").trim(),
    seller: String(row.seller ?? "").trim(),
    tags: String(row.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
    attributes: parseAttributes(row.attributes),
    imageUrl: imageUrl || undefined
  };
}

export function BatchImport() {
  const [rows, setRows] = useState<ListingInput[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: () => api.createBatch(rows),
    onSuccess: async () => {
      navigate("/");
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
    }
  });

  async function readWorkbook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setParseError("");
    setFileName(file.name);
    try {
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("The workbook does not contain a sheet.");
      const parsed = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: "" }).map(parseRow);
      if (parsed.length === 0) throw new Error("The first sheet is empty.");
      if (parsed.length > 20) throw new Error("A batch may contain at most 20 listings.");
      setRows(parsed);
    } catch (error) {
      setRows([]);
      setParseError(error instanceof Error ? error.message : "Could not read this workbook.");
    }
  }

  return <section>
    <header className="page-header"><div><p className="eyebrow">Batch workspace</p><h1>Import listings from Excel</h1><p>Upload up to 20 listings and monitor each evaluation from the dashboard.</p></div><a className="button sample-download" href="/samples/marketplace-sample-listings.xlsx" download><span>↓</span> Download sample Excel</a></header>
    <div className="panel upload-panel">
      <div className="sample-callout"><div><strong>Need a ready-to-test workbook?</strong><span>Download six complete listings with product images, attributes, tags, and realistic policy-review cases.</span></div><a href="/samples/marketplace-sample-listings.xlsx" download>Download sample</a></div>
      <label className="drop-zone"><input type="file" accept=".xlsx,.xls" onChange={readWorkbook} /><span className="upload-icon">⇧</span><strong>{fileName || "Choose an Excel workbook"}</strong><small>Supported formats: XLSX and XLS · Maximum 20 rows</small></label>
      <div className="column-guide"><strong>Required columns</strong><div>{columns.map((column) => <code key={column}>{column}</code>)}</div></div>
      {parseError && <div className="state error">{parseError}</div>}
      {rows.length > 0 && <><div className="import-summary"><strong>{rows.length} listings ready</strong><span>All rows will be evaluated after import.</span></div><div className="table-wrap"><table><thead><tr><th>Image</th><th>Listing</th><th>Category</th><th>Seller</th><th>Price</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.title}-${index}`}><td>{row.imageUrl ? <img className="import-thumb" src={row.imageUrl} alt="" /> : <span className="no-image">—</span>}</td><td><strong>{row.title || "Missing title"}</strong></td><td>{row.category || "—"}</td><td>{row.seller || "—"}</td><td>{row.price ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(row.price)) : "—"}</td></tr>)}</tbody></table></div><div className="form-actions"><button className="button primary" disabled={upload.isPending} onClick={() => upload.mutate()}>{upload.isPending ? "Importing…" : "Import & evaluate"}</button></div></>}
      {upload.isError && <div className="state error">{upload.error.message}</div>}
    </div>
  </section>;
}
