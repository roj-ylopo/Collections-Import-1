import React from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Typography,
} from "@mui/material";

interface PreviewTableProps {
  items: unknown[];
  maxRows?: number;
}

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.keys(obj).flatMap((key) => {
    const val = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return flattenKeys(val as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
}

function getVal(obj: unknown, path: string): string {
  const value = path
    .split(".")
    .reduce((acc: any, key) => acc?.[key], obj);
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return "[object]";
  return String(value);
}

const PreviewTable: React.FC<PreviewTableProps> = ({ items, maxRows = 5 }) => {
  const preview = items.slice(0, maxRows);
  if (preview.length === 0) {
    return <Typography variant="body2">No items to preview.</Typography>;
  }

  const allKeys = flattenKeys(preview[0] as Record<string, unknown>);
  const columns = allKeys.includes("title") ? ["title"] : allKeys.slice(0, 1);

  return (
    <Paper sx={{ overflowX: "auto", mb: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col} sx={{ fontWeight: "bold", fontSize: "0.7rem" }}>
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {preview.map((item, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col} sx={{ fontSize: "0.7rem", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {getVal(item, col)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {items.length > maxRows && (
        <Typography variant="caption" sx={{ p: 1, display: "block" }}>
          Showing {maxRows} of {items.length} items
        </Typography>
      )}
    </Paper>
  );
};

export default PreviewTable;
