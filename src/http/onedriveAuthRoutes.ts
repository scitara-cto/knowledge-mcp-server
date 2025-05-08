import express from "express";
import {
  getMicrosoftAuthUrl,
  exchangeCodeForTokens,
  storeMicrosoftTokens,
} from "../knowledge/microsoft_graph/msAuth.js";

const router = express.Router();

// Start OAuth2 flow: redirect user to Microsoft login
router.get(
  "/onedrive/oauth/start",
  (req: express.Request, res: express.Response): void => {
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
router.get(
  "/onedrive/oauth/callback",
  async (req: express.Request, res: express.Response): Promise<void> => {
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

export default router;
