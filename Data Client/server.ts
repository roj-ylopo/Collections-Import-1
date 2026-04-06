import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { WebflowClient } from "webflow-api";
import axios from "axios";
import dotenv from "dotenv";
import Table from "cli-table3";
import chalk from "chalk";
import { startNgrok } from "./utils/ngrokManager.js";
import db from "./database.js";
import jwt from "./jwt.js";
import importRouter from "./routes/importRoutes.js";
import type { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

const corsOptions = { origin: ["http://localhost:1337"] };

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.post("/logout", jwt.authenticateSessionToken, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader && authHeader.split(" ")[1];

    if (!sessionToken) {
      res.status(401).json({ message: "Authentication token is missing" });
      return;
    }
    const decoded = (await import("jsonwebtoken")).default.verify(
      sessionToken,
      process.env.WEBFLOW_CLIENT_SECRET as string
    ) as { user: { id: string } };
    const userId = decoded.user.id;
    console.log("Decoded user ID from session token:", userId);
    // Remove user access token from DB
    db.db.run(
      "DELETE FROM userAuthorizations WHERE userId = ?",
      [userId],
      (err: Error | null) => {
        if (err) {
          console.error("Error deleting user authorization:", err);
          res.status(500).json({ error: "Failed to log out user" });
        } else {
          console.log("User authorization deleted successfully for user ID:", userId);
          res.json({ success: true });
        }
      }
    );
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
});

// Redirect user to Webflow Authorization screen
app.get("/authorize", (req, res) => {
  console.log("Redirecting user to Webflow authorization screen...");
  const authorizeUrl = WebflowClient.authorizeURL({
    scope: ["sites:read", "authorized_user:read", "cms:read", "cms:write"],
    clientId: process.env.WEBFLOW_CLIENT_ID as string,
  });
  res.redirect(authorizeUrl);
});

app.get("/", (req, res) => {
  console.log("Redirecting user to Webflow authorization screen...");
  res.redirect("/authorize");
});

// Exchange the authorization code for an access token and save to DB
app.get("/callback", async (req, res) => {
  console.log("Received callback from Webflow with query:", req.query);
  const { code } = req.query as { code: string };
  console.log("Exchanging authorization code for access token...");
  const accessToken = await WebflowClient.getAccessToken({
    clientId: process.env.WEBFLOW_CLIENT_ID as string,
    clientSecret: process.env.WEBFLOW_CLIENT_SECRET as string,
    code,
  });

  const webflow = new WebflowClient({ accessToken });

  const sitesResponse = await webflow.sites.list() as any;
  const siteList: any[] = sitesResponse.sites ?? [];
  siteList.forEach((site) => {
    db.insertSiteAuthorization(site.id as string, accessToken);
  });

  const firstSite = siteList[0];
  if (firstSite) {
    const shortName = firstSite.shortName;
    res.redirect(
      `https://${shortName}.design.webflow.com?app=${process.env.WEBFLOW_CLIENT_ID}`
    );
    return;
  }

  const filePath = path.join(__dirname, "public", "authComplete.html");
  res.sendFile(filePath);
});

// Authenticate Designer Extension User via ID Token
app.post("/token", jwt.retrieveAccessToken, async (req, res) => {
  const token = req.body.idToken;
  // console.log("Received ID token for session token exchange:", token);
  console.log("req.accessToken set by middleware:", req.accessToken);
  try {
    const options = {
      method: "POST" as const,
      url: "https://api.webflow.com/beta/token/resolve",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.accessToken}`,
      },
      data: { idToken: token },
    };
    const request = await axios.request(options);
    const user = request.data;
    console.log("User info retrieved from Webflow:", user);

    const tokenPayload = jwt.createSessionToken(user);
    const sessionToken = tokenPayload.sessionToken;
    const expAt = tokenPayload.exp;
    db.insertUserAuthorization(user.id, req.accessToken as string);
    res.json({ sessionToken, exp: expAt });
  } catch (e) {
    console.error(
      "Unauthorized; user is not associated with authorization for this site",
      e
    );
    res.status(401).json({
      error: "Error: User is not associated with authorization for this site",
    });
  }
});

// Get list of sites
app.get("/sites", jwt.authenticateSessionToken, async (req, res) => {
  try {
    const accessToken = req.accessToken as string;
    const webflow = new WebflowClient({ accessToken });
    const data = await webflow.sites.list() as any;
    res.json({ data });
  } catch (error: any) {
    console.error("Error handling authenticated request:", error);
    const status = error?.statusCode ?? error?.response?.status;
    if (status === 403) {
      res.status(403).json({ error: "Access denied. Please re-authorize the app." });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Import routes
app.use("/import", importRouter);

// Start server with NGROK
const startServer = async (): Promise<void> => {
  try {
    const PORT = process.env.PORT as string;
    const ngrokUrl = await startNgrok(PORT);

    const table = new Table({
      head: ["Location", "URL"],
      colWidths: [30, 60],
    });

    table.push(
      ["Development URL (Frontend)", "http://localhost:1337"],
      ["Development URL (Backend)", `http://localhost:${PORT}`]
    );

    if (!process.env.SITE_TOKEN) {
      table.push(["Redirect URI", `${ngrokUrl}/callback`]);
    }

    console.log(table.toString());

    if (!process.env.SITE_TOKEN) {
      console.log(
        chalk.blue.inverse("\n\nNOTE:"),
        chalk.blue("Update your Redirect URI in your App Settings\n\n")
      );
    }

    app.listen(PORT, () => {});
  } catch (error) {
    console.error("Failed to start the server with ngrok:", error);
    process.exit(1);
  }
};

startServer();
