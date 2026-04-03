import jsonwebtoken from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import db from "./database.js";

interface WebflowUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface SessionTokenPayload {
  sessionToken: string;
  exp: number;
}

const retrieveAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const idToken = req.body.idToken;
  const siteId = req.body.siteId;

  if (!idToken) {
    res.status(401).json({ message: "ID Token is missing" });
    return;
  }
  if (!siteId) {
    res.status(401).json({ message: "Site ID is missing" });
    return;
  }

  try {
    const accessToken = await db.getAccessTokenFromSiteId(siteId);
    req.accessToken = accessToken;
    next();
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve access token" });
  }
};

const createSessionToken = (user: WebflowUser): SessionTokenPayload => {
  const sessionToken = jsonwebtoken.sign(
    { user },
    process.env.WEBFLOW_CLIENT_SECRET as string,
    { expiresIn: "24h" }
  );
  const decodedToken = jsonwebtoken.decode(sessionToken) as { exp: number };
  return {
    sessionToken,
    exp: decodedToken.exp,
  };
};

const authenticateSessionToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader && authHeader.split(" ")[1];

  if (!sessionToken) {
    res.status(401).json({ message: "Authentication token is missing" });
    return;
  }

  try {
    const decoded = jsonwebtoken.verify(
      sessionToken,
      process.env.WEBFLOW_CLIENT_SECRET as string
    ) as { user: WebflowUser };

    const accessToken = await db.getAccessTokenFromUserId(decoded.user.id);
    req.accessToken = accessToken;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

export default {
  createSessionToken,
  retrieveAccessToken,
  authenticateSessionToken,
};
