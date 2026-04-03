export type ImportType = "team" | "testimonials" | "communities";
export type DuplicateStrategy = "skip" | "overwrite" | "add";

export interface FieldMapping {
  sourceField: string; // dot-notation path e.g. "customContent.email"
  targetField: string; // Webflow field slug e.g. "email"
}

export interface ImportRequest {
  siteId: string;
  type: ImportType;
  items: Record<string, unknown>[];
  fieldMapping: FieldMapping[];
  duplicateStrategy?: DuplicateStrategy;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface CollectionFieldRaw {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  required?: boolean;
  isEditable?: boolean;
}

// Source data shapes
export interface TeamItem {
  id: string;
  title: string;
  customContent?: {
    name?: string;
    primaryPhone?: string;
    title?: string;
    email?: string;
    licensing?: string;
  };
  fullUrl?: string;
  body?: string;
}

export interface CommunityItem {
  id: string;
  title: string;
  body?: string;
  location?: {
    mapLat?: number;
    mapLng?: number;
    addressLine2?: string;
  };
  customContent?: {
    simpleSearchCity?: string;
    simpleSearchState?: string;
  };
  seoData?: {
    seoTitle?: string;
    seoDescription?: string;
  };
}

export interface TestimonialItem {
  id: string;
  title: string;
  customContent?: {
    name?: string;
    review_type?: string;
    zillow_review?: string;
    zillow_reviewer?: string;
  };
  assetUrl?: string;
  addedOn?: number;
}
