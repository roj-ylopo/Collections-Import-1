import axios from "axios";
import {
  WFCollection,
  FieldMapping,
  DuplicateStrategy,
  ImportResult,
  DuplicateCheckResult,
  ImportType,
} from "../types/index";

const API_BASE = `http://localhost:${process.env.PORT}`;

function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}

export async function fetchSourceItems(
  url: string,
  token: string
): Promise<unknown[]> {
  const res = await axios.post(
    `${API_BASE}/import/sources`,
    { url },
    { headers: authHeader(token) }
  );
  return res.data.items ?? [];
}

export async function fetchCollections(
  siteId: string,
  token: string
): Promise<WFCollection[]> {
  const res = await axios.get(`${API_BASE}/import/sites/${siteId}/collections`, {
    headers: authHeader(token),
  });
  return res.data.collections ?? [];
}

export interface ImportPayload {
  siteId: string;
  type: ImportType;
  items: Record<string, unknown>[];
  fieldMapping: FieldMapping[];
  duplicateStrategy?: DuplicateStrategy;
}

export async function runImport(
  payload: ImportPayload,
  token: string
): Promise<ImportResult | DuplicateCheckResult> {
  const res = await axios.post(`${API_BASE}/import`, payload, {
    headers: authHeader(token),
  });
  return res.data;
}
