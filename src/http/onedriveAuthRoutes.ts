import { addAuthHttpRoute } from "dynamic-mcp-server";
import {
  getMicrosoftAuthUrl,
  exchangeCodeForTokens,
  storeMicrosoftTokens,
} from "../handlers/knowledge/microsoft_graph/msAuth.js";
import { Request, Response } from "express";

export function registerOnedriveAuthRoutes(server: any) {
  // Start OAuth2 flow: redirect user to Microsoft login
  addAuthHttpRoute(
    server,
    "get",
    "/onedrive/oauth/start",
    (req: Request, res: Response) => {
      const userEmail = req.query.email as string;
      if (!userEmail) {
        res.status(400).send("Missing email parameter");
        return;
      }
      const authUrl = getMicrosoftAuthUrl(userEmail);
      res.redirect(authUrl);
    },
  );

  // OAuth2 callback: exchange code for tokens and store them
  addAuthHttpRoute(
    server,
    "get",
    "/onedrive/oauth/callback",
    async (req: Request, res: Response) => {
      const code = req.query.code as string;
      const state = req.query.state as string; // user email
      if (!code || !state) {
        res.status(400).send("Missing code or state");
        return;
      }
      try {
        const tokens = await exchangeCodeForTokens(code);
        await storeMicrosoftTokens(state, tokens);
        res.send(
          "Microsoft OneDrive authorization successful! You may close this window.",
        );
      } catch (err: any) {
        res.status(500).send(`OAuth error: ${err.message}`);
      }
    },
  );
}
