import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // OAuth2 Client Configuration
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI || `https://${process.env.PROJECT_DOMAIN || 'ais-dev-ky4zhyekmbf7sboiq7fus7-46241455497.asia-northeast1.run.app'}/api/auth/callback`
  );

  const currentRedirectUri = process.env.GOOGLE_REDIRECT_URI || `https://${process.env.PROJECT_DOMAIN || 'ais-dev-ky4zhyekmbf7sboiq7fus7-46241455497.asia-northeast1.run.app'}/api/auth/callback`;

  // Helper to get Gmail service
  const getGmailService = async () => {
    if (!clientId || !clientSecret) {
      throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables.");
    }
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }
    return google.gmail({ version: "v1", auth: oauth2Client });
  };

  // Temporary store for OTPs (In production, use Redis or DB)
  const tempStore: Record<string, { code: string, expires: number }> = {};

  // API Route for generating and sending OTP via Gmail
  app.post("/api/auth/otp", async (req, res) => {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ error: "Missing recipient (to)" });
    }

    try {
      // Generate 6 digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      tempStore[to] = { code, expires: Date.now() + 300000 }; // 5 mins

      const gmail = await getGmailService();
      
      const subject = '【聖殿專車系統】收費設定變更認證碼 / Verification Code';
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      
      const htmlBody = `
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ea580c; border-radius: 15px; background-color: #fff7ed; max-width: 500px;">
          <h2 style="color: #9a3412; margin-top: 0;">驗證您的身分 / Verify Your Identity</h2>
          <p style="font-size: 16px; color: #431407;">您好，您的收費設定變更認證碼為：</p>
          <div style="font-size: 32px; font-weight: bold; color: #ea580c; padding: 15px; background: white; border: 1px solid #fed7aa; border-radius: 10px; display: inline-block; margin: 10px 0; letter-spacing: 5px;">${code}</div>
          <p style="color: #9a3412; font-size: 14px;">請於 5 分鐘內在系統中完成驗證。此驗證碼請勿提供給他人。</p>
          <hr style="border: 0; border-top: 1px solid #fed7aa; margin: 20px 0;">
          <p style="font-size: 12px; color: #9a3412; opacity: 0.7;">本信件由 聖殿專車系統 自動發送，請勿直接回覆。<br>This is an automated message, please do not reply.</p>
        </div>
      `;

      const messageParts = [
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        htmlBody
      ];
      
      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.json({ success: true, message: `認證碼已成功寄送到 ${to} / Verification code sent` });
    } catch (error: any) {
      console.error("Gmail Send Error:", error);
      res.status(500).json({ 
        success: false,
        error: "認證信發送失敗，請確認 Gmail 授權狀態", 
        details: error.message
      });
    }
  });

  // API to verify OTP
  app.post("/api/auth/verify", (req, res) => {
    const { code } = req.body;
    
    // Find the code in tempStore
    const entry = Object.entries(tempStore).find(([email, data]) => data.code === code);
    
    if (!entry) {
      return res.status(400).json({ success: false, error: "無效的驗證碼" });
    }
    
    const [email, data] = entry;
    if (Date.now() > data.expires) {
      delete tempStore[email];
      return res.status(400).json({ success: false, error: "驗證碼已過期" });
    }
    
    // Success
    delete tempStore[email];
    res.json({ success: true });
  });

  // Old send-otp route (kept for compatibility or deleted if not used)
  app.post("/api/send-otp", async (req, res) => {
    const { to, code } = req.body;

    if (!to || !code) {
      return res.status(400).json({ error: "Missing to or code" });
    }

    try {
      const gmail = await getGmailService();
      
      const subject = '【嘉義支聯會】收費設定變更認證碼 / Verification Code';
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      
      const htmlBody = `
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ea580c; border-radius: 15px; background-color: #fff7ed; max-width: 500px;">
          <h2 style="color: #9a3412; margin-top: 0;">驗證您的身分 / Verify Your Identity</h2>
          <p style="font-size: 16px; color: #431407;">您好，您的收費設定變更認證碼為：</p>
          <div style="font-size: 32px; font-weight: bold; color: #ea580c; padding: 15px; background: white; border: 1px solid #fed7aa; border-radius: 10px; display: inline-block; margin: 10px 0; letter-spacing: 5px;">${code}</div>
          <p style="color: #9a3412; font-size: 14px;">請於 5 分鐘內在系統中完成驗證。此驗證碼請勿提供給他人。</p>
          <hr style="border: 0; border-top: 1px solid #fed7aa; margin: 20px 0;">
          <p style="font-size: 12px; color: #9a3412; opacity: 0.7;">本信件由 聖殿專車系統 自動發送，請勿直接回覆。<br>This is an automated message, please do not reply.</p>
        </div>
      `;

      const messageParts = [
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        htmlBody
      ];
      
      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.json({ success: true, message: `認證碼已成功寄送到 ${to} / Verification code sent` });
    } catch (error: any) {
      console.error("Gmail Send Error:", error);
      
      let errorMsg = "認證信發送失敗 / Email sending failed";
      let details = error.message;

      if (details.includes("invalid_grant") || details.includes("No refresh token is set")) {
        errorMsg = "Gmail 授權已失效，請資管人員重新進行連結 / Gmail Auth Expired";
      }

      res.status(500).json({ 
        success: false,
        error: errorMsg, 
        details: details
      });
    }
  });

  // Auth Routes for obtaining refresh token
  app.get("/api/auth/url", (req, res) => {
    if (!clientId || !clientSecret) {
      return res.status(400).json({ 
        error: "尚未設定 Google OAuth 憑證", 
        details: "請至 AI Studio 右上角 Settings -> Environment Variables 設定 GOOGLE_CLIENT_ID (或 VITE_GOOGLE_CLIENT_ID) 與 GOOGLE_CLIENT_SECRET" 
      });
    }
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.send'],
      prompt: 'consent'
    });
    res.json({ url });
  });

  app.get("/api/auth/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.send("No code found");
    
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      console.log("\n\n[IMPORTANT] YOUR REFRESH TOKEN IS BELOW:");
      console.log(tokens.refresh_token);
      console.log("PLEASE SAVE THIS TO YOUR .env AS GOOGLE_REFRESH_TOKEN\n\n");
      
      res.send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #16a34a;">授權成功！ / Auth Success!</h1>
          <p>您已成功連結 Gmail 帳號。請將以下 Refresh Token 告知開發人員或填入設定檔：</p>
          <code style="background: #f1f5f9; padding: 10px; border-radius: 5px; display: block; margin: 20px 0; word-break: break-all;">${tokens.refresh_token}</code>
          <p>現在您可以關閉此視窗並回到系統測試發信。</p>
        </div>
      `);
    } catch (error: any) {
      console.error("Auth Error:", error);
      res.status(500).send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center; color: #991b1b;">
          <h1>授權失敗 / Auth Failed</h1>
          <p>請檢查您的 Google Cloud Console 設定：</p>
          <div style="background: #fee2e2; padding: 20px; border-radius: 10px; text-align: left; display: inline-block; margin: 20px 0;">
            <b>1. 已授權的重新導向 URI：</b><br>
            必須包含：<br>
            <code style="word-break: break-all;">${currentRedirectUri}</code>
          </div>
          <p>錯誤訊息：${error.message}</p>
        </div>
      `);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
