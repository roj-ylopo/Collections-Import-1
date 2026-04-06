import sqlite3 from "sqlite3";
import dotenv from "dotenv";

dotenv.config();

const sqlite3Verbose = sqlite3.verbose();

const db = new sqlite3Verbose.Database("./db/database.db");

interface SiteAuthorization {
  siteId: string;
  accessToken: string;
}

interface UserAuthorization {
  id: number;
  userId: string;
  accessToken: string;
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS siteAuthorizations (
      siteId TEXT PRIMARY KEY,
      accessToken TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS userAuthorizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT UNIQUE,
      accessToken TEXT
    )
  `);
});

function insertSiteAuthorization(siteId: string, accessToken: string): void {
  db.run(
    "INSERT OR REPLACE INTO siteAuthorizations (siteId, accessToken) VALUES (?, ?)",
    [siteId, accessToken],
    (err: Error | null) => {
      if (err) {
        console.error("Error upserting site authorization pairing:", err);
      } else {
        console.log("Site authorization pairing upserted successfully.");
      }
    }
  );
}

function insertUserAuthorization(userId: string, accessToken: string): void {
  db.run(
    "INSERT OR REPLACE INTO userAuthorizations (userId, accessToken) VALUES (?, ?)",
    [userId, accessToken],
    (err: Error | null) => {
      if (err) {
        console.error("Error upserting user access token pairing:", err);
      } else {
        console.log("User access token pairing upserted successfully.");
      }
    }
  );
}

function getAccessTokenFromSiteId(siteId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT accessToken FROM siteAuthorizations WHERE siteId = ?",
      [siteId],
      (err: Error | null, row: { accessToken: string } | undefined) => {
        if (err) {
          console.error("Error retrieving access token:", err);
          return reject(err);
        }
        if (row && row.accessToken) {
          return resolve(row.accessToken);
        }
        return reject(new Error("No access token found or site does not exist"));
      }
    );
  });
}

function getAccessTokenFromUserId(userId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT accessToken FROM userAuthorizations WHERE userId = ?",
      [userId],
      (err: Error | null, row: { accessToken: string } | undefined) => {
        if (err) {
          console.error("Error retrieving access token:", err);
          return reject(err);
        }
        if (row && row.accessToken) {
          return resolve(row.accessToken);
        }
        return reject(new Error("No access token found or user does not exist"));
      }
    );
  });
}

function clearDatabase(): void {
  db.serialize(() => {
    db.run("DELETE FROM siteAuthorizations", (err: Error | null) => {
      if (err) {
        console.error("Error clearing siteAuthorizations table:", err);
      } else {
        console.log("Site Authorizations table cleared.");
      }
    });

    db.run("DELETE FROM userAuthorizations", (err: Error | null) => {
      if (err) {
        console.error("Error clearing userAuthorizations table:", err);
      } else {
        console.log("User Authorizations table cleared.");
      }
    });
  });
}

export default {
  db,
  insertSiteAuthorization,
  insertUserAuthorization,
  getAccessTokenFromSiteId,
  getAccessTokenFromUserId,
  clearDatabase,
};
