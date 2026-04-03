import { Router, Request, Response } from "express";
import axios from "axios";
import { WebflowClient } from "webflow-api";
import jwt from "../jwt.js";
import {
  ImportType,
  ImportRequest,
  ImportResult,
  FieldMapping,
  CollectionFieldRaw,
} from "../types/import.js";
import { COLLECTION_NAMES, UNNECESSARY_FIELDS } from "../../shared/constants.js";

const router = Router();

const nonStringFields = {
  "location.mapZoom": "Number",
  "location.mapLat": "Number",
  "location.mapLng": "Number",
  "location.markerLat": "Number",
  "location.markerLng": "Number",
  "customContent.disableHeaderLogo": "Switch",
  "likeCount": "Number",
  "commentCount": "Number",
  "publicCommentCount": "Number",
  "commentState": "Number",
  "displayIndex": "Number",
  "seoData.seoHidden": "Switch",
  "customContent.disableMarketTrends": "Switch",
  "customContent.zillow_localknowledge_rating": "Number",
  "customContent.zillow_process_expertise_rating": "Number",
  "customContent.zillow_rating": "Number",
  "customContent.zillow_responsiveness_rating": "Number",
  "customContent.zillow_negotiating_skills_rating": "Number",
};
  

// Default field definitions per collection type (used when creating a new collection)
const DEFAULT_FIELDS: Record<ImportType, CollectionFieldRaw[]> = {
  team: [
    { id: "", displayName: "Name", slug: "name", type: "PlainText", required: true, isEditable: true },
    { id: "", displayName: "Position", slug: "position", type: "PlainText", isEditable: true },
    { id: "", displayName: "Email", slug: "email", type: "Email", isEditable: true },
    { id: "", displayName: "Phone", slug: "phone", type: "PlainText", isEditable: true },
    { id: "", displayName: "Bio", slug: "bio", type: "RichText", isEditable: true },
    { id: "", displayName: "Licensing", slug: "licensing", type: "PlainText", isEditable: true },
  ],
  communities: [
    { id: "", displayName: "Name", slug: "name", type: "PlainText", required: true, isEditable: true },
    { id: "", displayName: "Description", slug: "description", type: "RichText", isEditable: true },
    { id: "", displayName: "City", slug: "city", type: "PlainText", isEditable: true },
    { id: "", displayName: "State", slug: "state", type: "PlainText", isEditable: true },
    { id: "", displayName: "Meta Description", slug: "meta-description", type: "PlainText", isEditable: true },
  ],
  testimonials: [
    { id: "", displayName: "Name", slug: "name", type: "PlainText", required: true, isEditable: true },
    { id: "", displayName: "Reviewer Name", slug: "reviewer-name", type: "PlainText", isEditable: true },
    { id: "", displayName: "Review Text", slug: "review-text", type: "PlainText", isEditable: true },
    { id: "", displayName: "Review Type", slug: "review-type", type: "PlainText", isEditable: true },
    { id: "", displayName: "Photo URL", slug: "photo", type: "PlainText", isEditable: true },
  ],
};

/**
 * POST /import/sources
 * Fetches raw source items from a user-provided URL.
 * Expects body: { url: string }
 * Returns: { items: unknown[] }
 */
router.post(
  "/sources",
  jwt.authenticateSessionToken,
  async (req: Request, res: Response) => {
    const { url } = req.body as { url: string };
    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    try {
      const response = await axios.get(url);
      const items: unknown[] = response.data?.items ?? [];
      res.json({ items });
    } catch (error: any) {
      console.error("Error fetching source data:", error);
      res.status(500).json({ error: "Failed to fetch URL: " + (error?.message ?? "unknown error") });
    }
  }
);

/**
 * GET /import/sites/:siteId/collections
 * Returns all collections for a site with their fields
 */
router.get(
  "/sites/:siteId/collections",
  jwt.authenticateSessionToken,
  async (req: Request, res: Response) => {
    const siteId = req.params.siteId as string;
    const accessToken = req.accessToken as string;

    try {
      const webflow = new WebflowClient({ accessToken });
      const response = await webflow.collections.list(siteId);
      const collections = response.collections ?? [];

      const collectionsWithFields = await Promise.all(
        collections.map(async (col) => {
          try {
            const detail = await webflow.collections.get(col.id as string);
            const fields = ((detail as any).fields ?? []) as CollectionFieldRaw[];
            return {
              id: col.id,
              displayName: col.displayName,
              slug: col.slug,
              fields: fields.map((f) => ({
                id: f.id,
                displayName: f.displayName,
                slug: f.slug,
                type: f.type,
                required: f.required,
              })),
            };
          } catch {
            return {
              id: col.id,
              displayName: col.displayName,
              slug: col.slug,
              fields: [],
            };
          }
        })
      );

      res.json({ collections: collectionsWithFields });
    } catch (error: any) {
      console.error("Error fetching collections:", error);
      const status = error?.statusCode ?? error?.response?.status;
      if (status === 403) {
        res.status(403).json({
          error: "CMS access denied. Re-authorize the app to grant CMS read/write permissions.",
        });
        return;
      }
      res.status(500).json({ error: "Failed to fetch collections" });
    }
  }
);

/**
 * Traverse a dot-notation path on an object
 * e.g. getNestedValue(obj, "customContent.email") => obj.customContent.email
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: any, key) => acc?.[key], obj);
}

/**
 * Generate a URL-safe slug from a string
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Build Webflow fieldData from a source item using the field mapping
 */
function buildFieldData(
  item: Record<string, unknown>,
  fieldMapping: FieldMapping[]
): Record<string, unknown> {
  const fieldData: Record<string, unknown> = {};

  for (const mapping of fieldMapping) {
    if (!mapping.targetField || mapping.targetField === "(none)") continue;
    const value = getNestedValue(item, mapping.sourceField);
    if (value !== undefined && value !== null) {
      fieldData[mapping.targetField] = value;
    }
  }

  // Ensure name and slug are always present
  if (!fieldData.name) {
    fieldData.name = (item.title as string) ?? "Untitled";
  }
  if (!fieldData.slug) {
    fieldData.slug = slugify(String(fieldData.name));
  }

  return fieldData;
}

/**
 * POST /import
 * Creates collection if it doesn't exist, then imports items
 */
router.post(
  "/",
  jwt.authenticateSessionToken,
  async (req: Request, res: Response) => {
    const {
      siteId,
      type,
      items,
      fieldMapping,
      duplicateStrategy,
    } = req.body as ImportRequest;
    const accessToken = req.accessToken as string;

    console.log(`Import request received for site ${siteId} with ${items?.length ?? 0} items`);
    console.log("Field mapping:", fieldMapping);

    if (!siteId || !type || !items || !fieldMapping) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const webflow = new WebflowClient({ accessToken });
      const collectionName = COLLECTION_NAMES[type];

      // Find or create collection
      const response = await webflow.collections.list(siteId);
      const existing = (response.collections ?? []).find(
        (c) => c.displayName?.toLowerCase() === collectionName.toLowerCase()
      );

      let collectionId: string;
      let isNewCollection = false;

      if (!existing) {
        // Create the collection using fields from fieldMapping
        const targetFields = fieldMapping
          .filter(m => m.targetField && m.targetField !== "(none)")
          .map(m => m.targetField);
        
        // Remove duplicates and create field definitions
        const uniqueFields = [...new Set(targetFields)];
        const dynamicFields = uniqueFields
          .filter(fieldSlug =>
            !fieldSlug.toLowerCase().startsWith("colordata") &&
            !fieldSlug.toLowerCase().startsWith("author") &&
            !UNNECESSARY_FIELDS.includes(fieldSlug)
          )
          .map(fieldSlug => ({
            displayName: fieldSlug.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '), // Convert slug to display name
            slug: fieldSlug,
            type: fieldSlug === "email" ? "Email" :
                  fieldSlug === "primary_phone" ? "Phone" : 
                  fieldSlug.includes("description") || fieldSlug.includes("bio") || fieldSlug.includes("text") || fieldSlug.includes("body") || fieldSlug.includes("excerpt") ? "RichText" :
                  nonStringFields[fieldSlug] ? nonStringFields[fieldSlug] : 
                  "PlainText",
            required: fieldSlug === "name",
            editable: true,
          }));
        
        // Ensure we always have a name field
        if (!uniqueFields.includes("name")) {
          dynamicFields.unshift({
            displayName: "Name",
            type: "PlainText",
          });
        }
        console.log(`Creating collection "${collectionName}" with fields:`, dynamicFields.length);
        try {
          const created = await webflow.collections.create(siteId, {
            displayName: collectionName,
            singularName: collectionName.replace(/s$/, ""),
            slug: slugify(collectionName),
            fields: dynamicFields as any,
          });
          collectionId = created.id as string;
          isNewCollection = true;
          console.log(`Created collection "${collectionName}" with id ${collectionId}`);
        } catch (error) {
          console.error("Error creating collection:", error);
          throw error;
        }

        
        // Wait a moment for collection to be fully available
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        collectionId = existing.id as string;
      }

      // Fetch existing items for duplicate detection (only if collection existed)
      const existingNames = new Set<string>();
      const existingItemIds: Record<string, string> = {};

      if (!isNewCollection) {
        const existingItemsResponse = await (webflow.collections.items as any).listItems(
          collectionId,
          { limit: 100 }
        );
        const existingItems: any[] = existingItemsResponse?.items ?? [];
        for (const ei of existingItems) {
          const name = (ei.fieldData?.name ?? ei.fieldData?.slug ?? "").toLowerCase();
          if (name) {
            existingNames.add(name);
            existingItemIds[name] = ei.id;
          }
        }

        // If duplicates found and no strategy given, prompt frontend
        const incomingNames = items.map((item) => {
          const fd = buildFieldData(item, fieldMapping);
          return String(fd.name ?? "").toLowerCase();
        });
        const duplicateCount = incomingNames.filter((n) => existingNames.has(n)).length;

        if (duplicateCount > 0 && !duplicateStrategy) {
          res.json({ hasDuplicates: true, duplicateCount, collectionId });
          return;
        }
      }

      // Import items
      const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

      for (const item of items) {
        const fieldData = buildFieldData(item, fieldMapping);
        const nameLower = String(fieldData.name ?? "").toLowerCase();

        try {
          if (!isNewCollection && existingNames.has(nameLower)) {
            if (duplicateStrategy === "skip") {
              result.skipped++;
              continue;
            } else if (duplicateStrategy === "overwrite") {
              const existingId = existingItemIds[nameLower];
              await webflow.collections.items.updateItem(collectionId, existingId, {
                fieldData: fieldData as any,
              });
              result.imported++;
              continue;
            }
            // "add" falls through to createItemLive
          }
          for (const key of Object.keys(fieldData)) {
            if (UNNECESSARY_FIELDS.includes(key) || key.toLowerCase().startsWith("colordata") || key.toLowerCase().startsWith("author")) {
              delete fieldData[key];
            }
          }
          
          //transform fieldData Keys from camelCase to slug to match Webflow field slugs
          const transformedFieldData: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(fieldData)) {
            const targetKey = key.split(/[._]/).map(part => slugify(part)).join('-');
            transformedFieldData[targetKey] = value;
          }

          console.log('transformedFieldData:', transformedFieldData);

          await webflow.collections.items.createItems(collectionId, {
            fieldData: transformedFieldData as any,
          });
          result.imported++;
        } catch (itemErr: any) {
          console.error("Error importing item:", itemErr?.message);
          const errorMsg = itemErr?.response?.data?.message || itemErr?.message || "Unknown error";
          result.errors.push(
            `Failed to import "${fieldData.name}": ${errorMsg}`
          );
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error during import:", error);
      const status = error?.statusCode ?? error?.response?.status;
      if (status === 403) {
        res.status(403).json({
          error: "CMS access denied. Re-authorize the app to grant CMS read/write permissions.",
        });
        return;
      }
      res.status(500).json({ error: "Import failed", detail: error?.message });
    }
  }
);

export default router;
