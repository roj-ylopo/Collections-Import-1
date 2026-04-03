export interface SiteInfo {
  id: string;
  displayName: string;
  shortName: string;
  createdOn: string;
  lastUpdated: string;
  lastPublished?: string;
}

export interface CollectionField {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  required?: boolean;
}

export interface WFCollection {
  id: string;
  displayName: string;
  slug: string;
  fields: CollectionField[];
}

export type ImportType = "team" | "testimonials" | "communities";
export type DuplicateStrategy = "skip" | "overwrite" | "add";

export interface FieldMapping {
  sourceField: string;
  targetField: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface DuplicateCheckResult {
  hasDuplicates: true;
  duplicateCount: number;
  collectionId: string;
}
