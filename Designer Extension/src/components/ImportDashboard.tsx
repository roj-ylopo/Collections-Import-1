import React, { useEffect, useState } from "react";
import "./importPanel.css";
import { WFCollection, ImportType } from "../types/index";
import { fetchCollections } from "../api/importApi";
import ImportPanel from "./ImportPanel";

interface ImportDashboardProps {
  siteId: string;
  siteName?: string;
  sessionToken: string;
  onBackToSiteSelect?: () => void;
}

const ImportDashboard: React.FC<ImportDashboardProps> = ({ siteId, siteName, sessionToken, onBackToSiteSelect }) => {
  const [collections, setCollections] = useState<WFCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    webflow.setExtensionSize("large");
    fetchCollections(siteId, sessionToken)
      .then((cols) => setCollections(cols))
      .catch((e) => {
        const msg: string = e?.response?.data?.error ?? e?.message ?? "Unknown error";
        const is403 = e?.response?.status === 403;
        setError(
          is403
            ? "CMS access denied. Please re-authorize the app at http://localhost:3000/authorize to grant CMS permissions, then reload."
            : "Failed to load collections: " + msg
        );
      })
      .finally(() => setLoading(false));
  }, [siteId, sessionToken]);

  if (loading) {
    return (
      <div className="import-dashboard-loading">
        <span className="spinner" />
        <span>Loading collections…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="import-dashboard-root">
        <div className="alert error">{error}</div>
      </div>
    );
  }

  return (
    <div className="import-dashboard-root">
      <div className="import-dashboard-title">Import CMS Data{siteName ? ` - ${siteName}` : ""}</div>
      <ImportPanel
        siteId={siteId}
        siteName={siteName}
        collections={collections}
        sessionToken={sessionToken}
        onBackToSiteSelect={onBackToSiteSelect}
      />
    </div>
  );
};

export default ImportDashboard;
