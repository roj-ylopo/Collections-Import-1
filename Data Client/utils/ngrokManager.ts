import ngrok from "@ngrok/ngrok";
import db from "./../database.js";

let publicUrl: string | null = null;
let shuttingDown = false;

export const startNgrok = async (port: number | string): Promise<string> => {
  try {
    console.log("Clearing all existing ngrok sessions...");
    await ngrok.kill();
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error: any) {
    console.log("No existing ngrok sessions to kill or kill failed:", error.message);
  }

  if (publicUrl) {
    console.log("An existing ngrok tunnel was found. Disconnecting...");
    await disconnectNgrok();
  }

  try {
    const listener = await ngrok.forward({
      addr: port,
      authtoken: process.env.NGROK_AUTH_TOKEN,
    });
    publicUrl = listener.url() as string;
    console.log(`Ngrok Tunnel started at ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("Error starting ngrok:", error);
    console.log("Retrying ngrok after additional cleanup...");
    await ngrok.kill();
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      const retryListener = await ngrok.forward({
        addr: port,
        authtoken: process.env.NGROK_AUTH_TOKEN,
      });
      publicUrl = retryListener.url() as string;
      console.log(`Ngrok Tunnel started on retry at ${publicUrl}`);
      return publicUrl;
    } catch (retryError) {
      console.error("Retry failed:", retryError);
      throw new Error("Failed to initialize ngrok after retry");
    }
  }
};

export const getNgrokUrl = (): string | null => publicUrl;

export const disconnectNgrok = async (): Promise<void> => {
  if (publicUrl) {
    try {
      console.log("Disconnecting ngrok...");
      await ngrok.disconnect(publicUrl);
      await ngrok.kill();
      console.log("Ngrok Tunnel disconnected");
    } catch (error) {
      console.error("Failed to disconnect ngrok:", error);
    } finally {
      publicUrl = null;
    }
  }
};

const handleShutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down gracefully...`);
  db.clearDatabase();
  await disconnectNgrok();
  process.exit(0);
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGUSR2", () => handleShutdown("SIGUSR2"));
