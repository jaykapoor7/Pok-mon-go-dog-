# Kaju Connections

Settings → Connections (`/ngo/settings/connections`, municipal reviewers: `/city/connections`).
Kaju works with a person's Google Workspace or Microsoft 365 account, and with files directly.

## What works where

| Area | What Kaju does | Writes outside StrayPaw? |
|---|---|---|
| Files (no account) | Reads attached PDF, DOCX, XLSX, CSV, PPTX; makes reports in all five formats from the organisation's records (open cases, animal register, ABC verification) | No (download) |
| Google Workspace | Finds and reads Drive files (Docs, Sheets, Slides exported to Office formats), analyses spreadsheets, drafts and sends Gmail, adds Calendar events, saves reports to Drive | Only after Confirm |
| Microsoft 365 | Finds and reads OneDrive and SharePoint files, analyses Excel, drafts and sends Outlook mail, adds Calendar events, saves reports to OneDrive `/StrayPaw` | Only after Confirm |
| Slack, WhatsApp, municipal systems | Planned; shown as "Coming later" | — |

Kaju is given a connection tool only when the person has connected an account that allows it (capability discovery). Anything that sends, creates or saves is a proposal; `/api/connections/act` runs it only when the person presses Confirm, re-checks every input, and logs it in `connection_audit`.

## Security model

* **Tokens:** AES-256-GCM encryption with `CONNECTIONS_ENC_KEY`, stored in `connection_secrets`. No client role can read that table. Decryption happens server-side only.
* **OAuth:** authorisation code with PKCE, plus a signed, expiring `state` and an httpOnly nonce cookie, so a callback completes only the same person's attempt in the same browser.
* **Least-privilege scopes:**
  * Google: `drive.readonly`, `drive.file`, `gmail.compose`, `calendar.events`.
  * Microsoft: `Files.Read.All`, `Files.ReadWrite`, `Sites.Read.All`, `Mail.ReadWrite`, `Mail.Send`, `Calendars.ReadWrite`, `offline_access`.
* **Personal and organisation scope:** a connection is personal. Others in the organisation see it only when its owner shares it and the organisation lead allows sharing. Kaju always acts with the owner's own token, and never from another organisation.
* **Organisation policy:** a lead can switch a provider off for the organisation. Switching it off withdraws all shares at once.
* **Prompt injection:** file and email text reaches the model wrapped as untrusted content, with an instruction to ignore instructions inside it. Kaju's system prompt says the same.
* **Revocation:**
  * Disconnect revokes the Google token at Google, then deletes our copy.
  * Microsoft has no per-app revocation call. Users can also remove the app at myapps.microsoft.com.
* **Refresh:** expired tokens refresh automatically. A refusal marks the connection "Reconnect needed".
* **Tests:**
  * `scripts/test-connections.ts`: 23 checks.
  * `e2e/connections.spec.ts`
  * The staging RLS check: 9 of 9.

## Administrator actions still required (not done; needs your accounts)

Until these are set in Vercel (Production) and the site is redeployed, both providers show **Not available yet** and nobody can connect.

1. **Encryption key:** set `CONNECTIONS_ENC_KEY` to 32 random bytes in base64 (`openssl rand -base64 32`). Keep it secret and never change it casually: changing it disconnects everyone.
2. **Google Workspace:**
   * In Google Cloud Console, create an OAuth client (type: Web).
   * Authorised redirect URI: `https://www.straypaw.org/api/connections/google/callback`.
   * Enable the Drive, Gmail and Google Calendar APIs.
   * Configure the OAuth consent screen with the scopes above.
   * `gmail.compose` and `drive.readonly` are restricted or sensitive scopes, so Google app verification (and possibly a security assessment) is required before people outside your test users can connect.
   * Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
3. **Microsoft 365:**
   * In Microsoft Entra, register an app, multi-tenant if NGOs and municipalities use their own tenants.
   * Redirect URI (Web): `https://www.straypaw.org/api/connections/microsoft/callback`.
   * Add the delegated permissions above and create a client secret.
   * Set `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`. Optionally set `MICROSOFT_TENANT_ID`; the default is `common`.
   * Some tenants require admin consent for `Files.Read.All` or `Sites.Read.All`.
4. **Redeploy**, then connect a test account and check:
   * Kaju finds a file.
   * Kaju reads a Sheet.
   * Kaju prepares an email, and it is sent only after Confirm.
   * Kaju adds a calendar event.
   * Kaju saves a report.
   * Disconnect works.

Only after step 4 passes should a provider be described as live anywhere on the site.
