import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import { ThemeProvider, Button, Container, Typography, CircularProgress, Box } from "@mui/material";
import theme from "./theme";
import SiteSelector from "./components/SiteSelector";
import ImportDashboard from "./components/ImportDashboard";
import { SiteInfo } from "./types/index";

type AppStep = "auth" | "siteSelect" | "import";

interface StoredUser {
  sessionToken: string;
  firstName: string;
  email: string;
  exp: number;
}

const App: React.FC = () => {
  const [appStep, setAppStep] = useState<AppStep>("auth");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [user, setUser] = useState<{ firstName?: string; email?: string }>({});
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(false);

  const PORT = process.env.PORT;
  const API_URL = `http://localhost:${PORT}/`;

  useEffect(() => {
    webflow.setExtensionSize("default");

    const exchangeAndVerifyIdToken = async () => {
      try {
        const idToken = await webflow.getIdToken();
        const siteInfo = await webflow.getSiteInfo();

        const response = await axios.post(API_URL + "token", {
          idToken,
          siteId: siteInfo.siteId,
        });

        const token = response.data.sessionToken;
        const expAt = response.data.exp;
        const decodedToken = JSON.parse(atob(token.split(".")[1]));
        const firstName = decodedToken.user.firstName;
        const email = decodedToken.user.email;

        localStorage.setItem(
          "wf_hybrid_user",
          JSON.stringify({ sessionToken: token, firstName, email, exp: expAt })
        );
        setUser({ firstName, email });
        setSessionToken(token);
        setAppStep("siteSelect");
      } catch (error) {
        console.error("Error during token exchange:", error);
        setAppStep("auth");
      } finally {
        setAuthLoading(false);
      }
    };

    const localStorageUser = localStorage.getItem("wf_hybrid_user");
    if (localStorageUser) {
      const parsed: StoredUser = JSON.parse(localStorageUser);
      if (parsed.sessionToken && Date.now() < parsed.exp * 1000) {
        setSessionToken(parsed.sessionToken);
        setUser({ firstName: parsed.firstName, email: parsed.email });
        setAppStep("siteSelect");
        setAuthLoading(false);
        return;
      } else {
        localStorage.removeItem("wf_hybrid_user");
      }
    }

    exchangeAndVerifyIdToken();

    const handleAuthComplete = (event: MessageEvent) => {
      if (event.data === "authComplete") {
        exchangeAndVerifyIdToken();
      }
    };
    window.addEventListener("message", handleAuthComplete);
    return () => window.removeEventListener("message", handleAuthComplete);
  }, []);

  const getSites = async () => {
    setSitesLoading(true);
    try {
      const res = await axios.get(API_URL + "sites", {
        headers: { authorization: `Bearer ${sessionToken}` },
      });
      setSites(res.data.data.sites ?? []);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("wf_hybrid_user");
        setSessionToken("");
        setUser({});
        setAppStep("auth");
      }
      console.error("Error fetching sites:", error);
    } finally {
      setSitesLoading(false);
    }
  };

  const handleSiteSelect = (site: SiteInfo) => {
    setSelectedSite(site);
    setAppStep("import");
  };

  const openAuthScreen = () => {
    window.open(`http://localhost:${PORT}`, "_blank", "width=600,height=400");
  };

  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={120} flexDirection="column" gap={1.5}>
          <CircularProgress size={24} color="primary" />
          <Typography variant="body2" color="text.secondary">Authenticating…</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <div>
        {appStep === "auth" && (
          <Container sx={{ padding: "28px 20px" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: "#1a1a1a" }}>
              CMS Import
            </Typography>
            <Typography variant="body2" sx={{ color: "#666", mb: 2.5 }}>
              Authorize the app to get started.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={openAuthScreen}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Authorize App
            </Button>
          </Container>
        )}

        {appStep === "siteSelect" && (
          <Container sx={{ padding: "28px 20px" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: "#1a1a1a" }}>
              {user.firstName ? `Hello, ${user.firstName}` : "Select a Site"}
            </Typography>
            <Typography variant="body2" sx={{ color: "#666", mb: 2.5 }}>
              Choose a site to import CMS data into.
            </Typography>
            {sites.length === 0 && (
              <Button
                variant="contained"
                color="primary"
                onClick={getSites}
                disabled={sitesLoading}
                sx={{ textTransform: "none", fontWeight: 600 }}
                startIcon={sitesLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                {sitesLoading ? "Loading…" : "Load Sites"}
              </Button>
            )}
            {sites.length > 0 && (
              <SiteSelector sites={sites} onSelect={handleSiteSelect} />
            )}
          </Container>
        )}

        {appStep === "import" && selectedSite && (
          <ImportDashboard
            siteId={selectedSite.id}
            siteName={selectedSite.displayName}
            sessionToken={sessionToken}
          />
        )}
      </div>
    </ThemeProvider>
  );
};

const rootElement = document.getElementById("root") as HTMLElement;
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
