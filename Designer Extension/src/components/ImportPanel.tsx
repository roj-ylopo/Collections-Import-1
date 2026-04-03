import "./importPanel.css";
import React, { useState, useMemo } from "react";
import {
  ImportType,
  WFCollection,
  FieldMapping,
  DuplicateStrategy,
  ImportResult,
  DuplicateCheckResult,
} from "../types/index";
import { COLLECTION_NAMES, UNNECESSARY_FIELDS_SET } from "../../../shared/constants";
import { fetchSourceItems, runImport } from "../api/importApi";
import DuplicatePrompt from "./DuplicatePrompt";
import ItemSelector from "./ItemSelector";

interface ImportPanelProps {
  siteId: string;
  siteName?: string;
  collections: WFCollection[];
  sessionToken: string;
}

type Step = "idle" | "mapping" | "importing" | "done";

function extractSourceFields(items: unknown[]): string[] {
  const fieldSet = new Set<string>();
  function walk(obj: Record<string, unknown>, prefix: string) {
    Object.keys(obj).forEach((key) => {
      const val = obj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      if (val && typeof val === "object" && !Array.isArray(val)) {
        walk(val as Record<string, unknown>, path);
      } else {
        fieldSet.add(path);
      }
    });
  }
  for (const item of items) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      walk(item as Record<string, unknown>, "");
    }
  }
  return Array.from(fieldSet).filter(
    (f) =>
      !UNNECESSARY_FIELDS_SET.has(f) &&
      !f.toLowerCase().startsWith("colordata") &&
      !f.toLowerCase().startsWith("author")
  );
}

function autoMap(sourceFields: string[], targetFields: { slug: string; displayName: string }[]): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const usedTargets = new Set<string>();

  for (const sf of sourceFields) {
    const sfLower = sf.toLowerCase().replace(/[^a-z0-9]/g, "");
    let bestSlug = "";
    let bestScore = 0;

    for (const tf of targetFields) {
      if (usedTargets.has(tf.slug)) continue;
      const tfSlug = tf.slug.toLowerCase().replace(/[^a-z0-9]/g, "");
      const tfName = tf.displayName.toLowerCase().replace(/[^a-z0-9]/g, "");

      let score = 0;
      if (sfLower === tfSlug) score = 4;
      else if (sfLower.endsWith(tfSlug) || tfSlug.endsWith(sfLower)) score = 3;
      else if (sfLower === tfName) score = 3;
      else if (sfLower.includes(tfSlug) || tfSlug.includes(sfLower)) score = 2;
      else if (sfLower.includes(tfName) || tfName.includes(sfLower)) score = 1;

      if (score > bestScore) {
        bestScore = score;
        bestSlug = tf.slug;
      }
    }

    if (bestScore > 0) {
      mappings.push({ sourceField: sf, targetField: bestSlug });
      usedTargets.add(bestSlug);
    }
  }

  return mappings;
}

const ImportPanel: React.FC<ImportPanelProps> = ({
  siteId,
  siteName,
  collections,
  sessionToken,
}) => {
  const [step, setStep] = useState<Step>("idle");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<ImportType>("team");
  const [sourceItems, setSourceItems] = useState<unknown[]>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [duplicateInfo, setDuplicateInfo] = useState<{ count: number } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const existingCollection = useMemo(
    () =>
      collections.find(
        (c) => c.displayName.toLowerCase() === COLLECTION_NAMES[type].toLowerCase()
      ) ?? null,
    [collections, type]
  );

  const targetFields = existingCollection?.fields ?? [];

  const handleFetchPreview = async () => {
    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await fetchSourceItems(url.trim(), sessionToken);
      if (items.length === 0) {
        setError("No items found at that URL. Make sure the response has an 'items' array.");
        return;
      }
      const fields = extractSourceFields(items.length > 0 && items.length < 5 ? items : items.slice(0, 5));
      const finalTargetFields = targetFields.length > 0
        ? targetFields
        : fields.map((s) => ({ id: s, displayName: s, slug: s, type: "PlainText" }));
      const mappings = autoMap(fields, finalTargetFields);
      setSourceItems(items);
      setSourceFields(fields);
      setFieldMappings(mappings);
      setSelectedIds(new Set(items.map((_, i) => i)));
      setStep("mapping");
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? "Unknown error";
      setError("Failed to fetch: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    const lowerUrl = newUrl.toLowerCase();

    setUrl(newUrl);
    if (lowerUrl.includes("team")) setType("team");
    else if (lowerUrl.includes("testimonial")) setType("testimonials");
    else if (lowerUrl.includes("communities")) setType("communities");
  };

  const handleImport = async (strategy?: DuplicateStrategy) => {
    setLoading(true);
    setError(null);
    setStep("importing");
    const itemsToImport = sourceItems.filter((_, i) => selectedIds.has(i)) as Record<string, unknown>[];
    try {
      const result = await runImport(
        {
          siteId,
          type,
          items: itemsToImport,
          fieldMapping: fieldMappings,
          duplicateStrategy: strategy,
        },
        sessionToken
      );

      if ((result as DuplicateCheckResult).hasDuplicates) {
        const dupe = result as DuplicateCheckResult;
        setDuplicateInfo({ count: dupe.duplicateCount });
        setStep("mapping");
        setLoading(false);
        return;
      }

      setImportResult(result as ImportResult);
      setStep("done");
    } catch (e: any) {
      setError("Import failed: " + e?.message);
      setStep("mapping");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("idle");
    setUrl("");
    setType("team");
    setSourceItems([]);
    setSourceFields([]);
    setFieldMappings([]);
    setSelectedIds(new Set());
    setImportResult(null);
    setDuplicateInfo(null);
    setError(null);
  };

  const label = COLLECTION_NAMES[type];
  const selectedCount = selectedIds.size;

  return (
    <div className="import-panel">
      <div className="import-panel-header">
        <h2>{label} - {siteName}</h2>
        {step !== "idle" && (
          <span className="import-panel-badge">
            {step === "mapping" ? `${sourceItems.length} items` : step === "done" ? "Done" : "Importing…"}
          </span>
        )}
      </div>

      {error && (
        <div className="alert error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {/* ── idle: URL + type input ── */}
      {step === "idle" && (
        <div className="import-panel-form">
          <div className="form-group">
            <label className="form-label">Data URL (JSON Link)</label>
            <input
              type="text"
              className="input"
              placeholder="https://example.com/data?format=json"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchPreview()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Content Type</label>
            <select
              className="select"
              value={type}
              onChange={(e) => setType(e.target.value as ImportType)}
            >
              <option value="team">Team</option>
              <option value="testimonials">Testimonials</option>
              <option value="communities">Communities</option>
            </select>
          </div>
          <button
            className="btn primary"
            onClick={handleFetchPreview}
            disabled={loading || !url.trim()}
            style={{ alignSelf: "flex-start" }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Loading…
              </>
            ) : (
              "Fetch Items"
            )}
          </button>
        </div>
      )}

      {/* ── mapping: item selector + import CTA ── */}
      {step === "mapping" && (
        <>
          <div className="import-panel-mapping-header">
            <div className="mapping-meta">
              <span className="mapping-meta-count">{sourceItems.length}</span>
              <span>items from</span>
              <span title={url} style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>
                {url.length > 35 ? url.slice(0, 35) + "…" : url}
              </span>
            </div>
            <button className="btn link" onClick={() => setStep("idle")}>← Back</button>
          </div>

          <ItemSelector
            items={sourceItems}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
          />

          <button
            className="btn primary"
            onClick={() => handleImport()}
            disabled={loading || selectedCount === 0 || fieldMappings.length === 0}
            style={{ width: "100%" }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Importing…
              </>
            ) : (
              `Import ${selectedCount} item${selectedCount !== 1 ? "s" : ""}`
            )}
          </button>
        </>
      )}

      {/* ── importing: spinner ── */}
      {step === "importing" && (
        <div className="import-panel-loading">
          <span className="spinner" />
          <span className="import-panel-loading-text">
            Importing {selectedCount} item{selectedCount !== 1 ? "s" : ""}…
          </span>
        </div>
      )}

      {/* ── done: result summary ── */}
      {step === "done" && importResult && (
        <div className="import-panel-success">
          <div className="alert success">Import complete</div>
          <div className="import-panel-summary">
            <span className="chip success">{importResult.imported} imported</span>
            {importResult.skipped > 0 && (
              <span className="chip neutral">{importResult.skipped} skipped</span>
            )}
            {importResult.errors.length > 0 && (
              <span className="chip error">{importResult.errors.length} errors</span>
            )}
          </div>
          {importResult.errors.length > 0 && (
            <div className="import-panel-errors">
              {importResult.errors.map((e, i) => (
                <div key={i} className="error-text">{e}</div>
              ))}
            </div>
          )}
          <button className="btn" onClick={handleReset}>Start over</button>
        </div>
      )}

      <DuplicatePrompt
        open={!!duplicateInfo}
        duplicateCount={duplicateInfo?.count ?? 0}
        onChoice={(strategy) => {
          setDuplicateInfo(null);
          handleImport(strategy);
        }}
        onCancel={() => {
          setDuplicateInfo(null);
          setStep("mapping");
        }}
      />
    </div>
  );
};

export default ImportPanel;
