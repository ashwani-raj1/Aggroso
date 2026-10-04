import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { api } from "../api";
import type { ListingInput } from "../types";

type SheetRow = Record<string, unknown>;

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
    onSuccess: async (batch) => {
      navigate("/");
      void (async () => {
        for (const listing of batch.listings) {
          try {
            await api.reviewListing(listing.id);
          } catch {
            // A failed listing is persisted independently and does not stop the batch.
          }
          await queryClient.invalidateQueries({ queryKey: ["listings"] });
        }
      })();
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
    }
  });

  async function readWorkbook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setParseError("");
    setFileName(file.name);
    try {
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

  function downloadTemplate() {
    const sheet = XLSX.utils.json_to_sheet([{
      title: "Wireless headphones in good condition",
      description: "Over-ear wireless headphones with charging cable, tested and fully working.",
      category: "ELECTRONICS",
      price: "4999.00",
      seller: "Example Seller",
      tags: "wireless, audio",
      imageUrl: "https://example.com/product.jpg",
      attributes: JSON.stringify({ condition: "Used", color: "Black" })
    }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Listings");
    XLSX.writeFile(workbook, "marketplace-listing-template.xlsx");
  }

  return <section>
    <header className="page-header"><div><p className="eyebrow">Batch workspace</p><h1>Import listings from Excel</h1><p>Upload up to 20 listings and monitor each evaluation from the dashboard.</p></div><button className="button" onClick={downloadTemplate}>Download template</button></header>
    <div className="panel upload-panel">
      <label className="drop-zone"><input type="file" accept=".xlsx,.xls" onChange={readWorkbook} /><span className="upload-icon">⇧</span><strong>{fileName || "Choose an Excel workbook"}</strong><small>Supported formats: XLSX and XLS · Maximum 20 rows</small></label>
      <div className="column-guide"><strong>Required columns</strong><div>{columns.map((column) => <code key={column}>{column}</code>)}</div></div>
      {parseError && <div className="state error">{parseError}</div>}
      {rows.length > 0 && <><div className="import-summary"><strong>{rows.length} listings ready</strong><span>All rows will be evaluated after import.</span></div><div className="table-wrap"><table><thead><tr><th>Listing</th><th>Category</th><th>Seller</th><th>Price</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.title}-${index}`}><td><strong>{row.title || "Missing title"}</strong></td><td>{row.category || "—"}</td><td>{row.seller || "—"}</td><td>{row.price ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(row.price)) : "—"}</td></tr>)}</tbody></table></div><div className="form-actions"><button className="button primary" disabled={upload.isPending} onClick={() => upload.mutate()}>{upload.isPending ? "Importing…" : "Import & evaluate"}</button></div></>}
      {upload.isError && <div className="state error">{upload.error.message}</div>}
    </div>
  </section>;
}
