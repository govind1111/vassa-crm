# VassaCRM — Project Instructions

Vassa Properties ka real estate CRM. **Google Apps Script** project hai — code Google ke cloud me
chalta hai, local folder sirf source copy hai.

## Files

| File | Role |
|---|---|
| `Code.gs` | Backend: Sheets CRUD, web app server (`doGet`/`doPost`), WhatsApp alerts, daily email report. ~v4.1 |
| `Index.html` | Frontend GUI. `google.script.run` ke through backend call karta hai (`server(fn, args, ok, fail)` wrapper, line ~594) |
| `backups\` | Purane versions. Kuch bhi bada change karne se pehle yahan copy karo |
| `README.md` | Setup + deploy steps (user ke liye) |
| `preview\` | Local UI test harness — `mock.js` (fake backend) + generated `index.html`. Live data nahi |

## Sheet structure (script khud banata hai)

`Leads`, `Executives`, `Project Sites`, `Activity Log`, `Daily Report`
Column order code se hi aata hai — **columns manually mat badlo**, `headerMap_()` / `execCols_()` names se padhte hain.

## Backend functions (frontend inhe call karta hai)

`uiGetAll`, `uiAddLead`, `uiUpdateLead`, `uiGetHistory`, `uiGetExecutives`, `uiSaveExecutive`,
`uiDeleteExecutive`, `uiGetSites`, `uiSaveSite`, `uiDeleteSite`, `uiGetSettings`, `uiSaveSettings`,
`uiGetRecentActivity`, `uiGetData`

Public endpoints: `doGet` (web app), `doPost` (Make/Zapier/Meta inbound leads + Meta webhook verify)

## Settings (secrets — code me hardcode mat karo)

Apps Script → Project Settings → **Script Properties**:
`CRM_SETTINGS` (JSON: company, boss number, WhatsApp templates, ad spend),
`WA_TOKEN`, `WA_PHONE_ID`, `WA_TEMPLATE`, `META_VERIFY_TOKEN`, `META_PAGE_TOKEN`

## Deploy procedure (har change ke baad)

1. Apps Script editor me file kholo → `Ctrl+A` → paste (latest local content) → Save
2. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**
3. Phone/laptop par web app URL refresh

Naya sheet: `setup` function ek baar Run karo, phir **Deploy → New deployment → Web app**
(Execute as: Me, Access: Anyone).

## Rules

1. **Live sheet par direct test nahi.** Test ke liye sheet ki copy + alag deployment use karo.
2. Apps Script V8 runtime hai — `let/const`, arrow functions, template literals chalte hain.
   Frontend me framework nahi hai; vanilla JS + inline CSS pattern follow karo.
3. `Index.html` ka UI mobile-first hai (`<base target="_top">`, viewport meta) — todna mat.
4. Backend function ka naam badlo to frontend ke `server(...)` call bhi update karo.
5. Har UI-facing change ke baad user ko batao: kaunsa file paste karna hai + deploy step.
6. `backups\` me date ke saath copy rakho, purani backup files delete mat karo.

## Current status

- Latest local = `Code.gs` (v4.4) + `Index.html` (Vassa Properties GUI, Master Parameters, dual-mode `call()`)
- v4.4: RPC gateway (`doGet ?api=true&fn=...`, `doPost {rpc:true}`) + frontend dual-mode transport (Apps Script `google.script.run` OR Firebase JSONP to `BACKEND_URL`) — Firebase hosting par chalane ke liye ready
- v4.3: site-wise routing — naya lead ka `project` Project Sites master se match (exact → longest partial) → us site ka pehla Active executive auto-assign + WhatsApp alert. Off karne ke liye Script Property `AUTO_ROUTE_SITE = off`. Bina Meta credentials test: `testInboundLead()` / `testSiteMatch()` (Apps Script editor me Run)
- GitHub repo: `govind1111/vassa-crm` (created). Firebase scaffolding added (firebase.json, .firebaserc, firebase_hosting/, .github/workflows/firebase-hosting.yml, deploy.cmd, docs). Firebase project + service account + secret user ko set karna hai (FIREBASE_DEPLOY.md)
- Live deployment se **verify nahi hua** ki same version hai — user se confirm karwana hai
- Local test harness hai: `preview\` (mock `google.script.run`) — `preview\mock.js` + `preview\index.html`
  (server: `python -m http.server 8765 --bind 127.0.0.1` usi folder me, phir `http://localhost:8765/index.html`)
- Backend routing ka offline test harness (JScript, fake Sheets): scratch folder me
  `stubs.js` + `Code.gs` + `tests.js` milakar `cscript //nologo //E:JScript` se chalta hai
  (25 checks: exact/partial match, inactive exec, duplicate, AUTO_ROUTE_SITE off, uiAddLead, RPC gateway)

## Language

User Hinglish me baat karta hai. Explanation Hinglish, code/identifiers English.
