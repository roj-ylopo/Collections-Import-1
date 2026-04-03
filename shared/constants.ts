import type { ImportType } from "../Data Client/types/import.js";

export const COLLECTION_NAMES: Record<ImportType, string> = {
  team: "Team",
  communities: "Communities",
  testimonials: "Testimonials",
};

export const UNNECESSARY_FIELDS = [
  "id",
  "addedOn",
  "updatedOn",
  "publishOn",
  "passthrough",
  "authorId",
  "systemDataId",
  "systemDataVariants",
  "systemDataSourceType",
  "unsaved",
  "recordType",
  "starred",
  "workflowState",
  "mediaFocalPoint.x",
  "mediaFocalPoint.y",
  "mediaFocalPoint.source",
  "recordtypelabel",
  "items",
  "tags",
] as const;

// Export as Set for frontend convenience
export const UNNECESSARY_FIELDS_SET = new Set(UNNECESSARY_FIELDS);