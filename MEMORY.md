# MEMORY.md — Long-term notes

## People
- Deborah Appell — Claudio’s sister (DOB 1986-12-01). History: encephalitis + meningitis → seizures/coma; treated with medications (brivaracetam/Breviact, phenobarbital, clobazam) and implanted NeuroPace RNS device; currently short-term memory loss + other issues. Not known to have tested positive for common AE antibodies (NMDA-R, LGI1, CASPR2, GAD65). Also has Sjögren syndrome (could be relevant to autoimmune CNS disease). Claudio plans to share medical exams later for targeted review. (Updated 2026-02-04)

## Research threads
- Lendbuzz / Lendbuzz Floorplan LLC public litigation leads: CourtListener/RECAP surfaced multiple federal/bankruptcy matters including Lendbuzz Floorplan, LLC v. Auto Expo, LLC (S.D. Tex., 4:24-cv-00064, filed 2024-01-05) and related bankruptcy adversary proceedings (e.g., S.D. Tex. 25-03052; S.D. Fla. 25-01246, 25-01307). Lendbuzz Funding LLC: cases in D.N.J. (2:25-cv-15402) and S.D.N.Y. (1:25-cv-02679). Lendbuzz, Inc.: S.D. Fla. removal (0:25-cv-60538) with state-court complaint attached. Massachusetts: no clear direct civil case found via CourtListener queries; only mentions/creditor participation surfaced (Bankr. D. Mass. Shamrock Finance LLC 21-10315; D. Mass. 1:24-cr-10035 mention of Lendbuzz Funding LLC lien). Follow-ups needed: MA Trial Court eAccess search; PACER pulls for listed dockets; compliant SEC/EDGAR check for IPO/public filings. (Saved 2026-02-04)

## Ops / integrations
- XGROUP email: **xgroupexperts@gmail.com**. (Saved 2026-02-06)
- monday.com API access is available to Henry in this environment (token stored server-side; don’t keep asking Claudio “do you have API access?”—assume it). (Saved 2026-02-10)
- Moltbot (OpenClaw/Clawdbot) channel health verified (Telegram multi-bot + WhatsApp linked/connected). Hooks: 3/4 ready; missing `soul-evil` is non-essential. (Checked 2026-02-05)
- Google Workspace via `gog` CLI is currently **not** usable non-interactively because its token store is encrypted with a keyring password that isn’t available in the server environment. Attempted to set a new `GOG_KEYRING_PASSWORD`, but decrypt failed (`aes.KeyUnwrap integrity check failed`), indicating the existing token was encrypted with a different password. Gmail Watch hook (Pub/Sub → OpenClaw hook) continues to work. Fix requires the original keyring password or a re-auth/login with a known password (interactive step or token store migration). (2026-02-05)
- Outstanding security fix: state dir `/root/.clawdbot` (symlink to `/root/.openclaw`) was previously flagged world-writable (777); recommended `chmod 700` when approved. (2026-02-05)
