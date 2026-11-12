# Firebase Hosting — VassaCRM

Deploy date: 12 Nov 2026
Project (placeholder): `vassa-crm-gps` (Firebase project ID) — change if you created a different one
Hosting site: `vassa-crm`

---

## Live links (after you create the Firebase project + deploy)

| Kaam | URL |
|---|---|
| CRM (index.html) | **https://vassa-crm.web.app** |
| Alternate domain | https://vassa-crm.firebaseapp.com |
| Firebase Console | https://console.firebase.google.com/project/vassa-crm-gps/overview |

Backend (Google Apps Script) wahi hai:
`https://script.google.com/macros/s/<YOUR_DEPLOY_ID>/exec`

---

## Files / folders

```
E:\Projects\VassaCRM\
  ├─ firebase.json            <- top-level (GitHub Actions ke liye)
  ├─ .firebaserc              <- project id
  ├─ .github\workflows\       <- auto-deploy on push to main
  └─ firebase_hosting\
       ├─ firebase.json       <- local deploy config
       ├─ .firebaserc
       ├─ deploy.cmd          <- double-click to deploy
       └─ public\
            └─ index.html     <- served file (copy of Index.html)
```

Tools (Node/Firebase/gh) shared from `E:\Projects\Attendnce\tools\` (same machine).

---

## Deploy kaise karein

### Step 0 — One-time setup (aapko karna hai, main nahi kar sakta)

1. Firebase Console → **Add project** → naam `vassa-crm-gps` (ya apna) → create
2. Project → **Hosting** → **Get started** → site naam `vassa-crm`
3. **Project Settings → Service accounts → Firebase Admin SDK → Generate new private key** → JSON download
4. GitHub repo `govind1111/vassa-crm` → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: pura JSON file ka content
5. `.firebaserc` (root + firebase_hosting/) me project id update karo agar alag naam use kiya
6. `firebase_hosting\firebase.json` me `"site"` value update karo

### Tarika 0 — GitHub se auto-deploy (recommended)

`main` branch par push → apne aap Firebase par deploy.

- Workflow: `.github/workflows/firebase-hosting.yml`
- Runs: https://github.com/govind1111/vassa-crm/actions
- Secret: `FIREBASE_SERVICE_ACCOUNT`

Manual trigger: Actions → **Deploy to Firebase Hosting** → **Run workflow**

### Tarika 1 — double-click

`E:\Projects\VassaCRM\firebase_hosting\deploy.cmd`

### Tarika 2 — PowerShell

```powershell
$env:Path = "E:\Projects\Attendnce\tools\node;" + $env:Path
cd E:\Projects\VassaCRM\firebase_hosting
& "E:\Projects\Attendnce\tools\firebase\node_modules\.bin\firebase.cmd" deploy --only hosting
```

(Pehle `firebase login` ek baar karna padega — browser me Google login.)

---

## File update karne ka flow

1. `Index.html` edit karo
2. `firebase_hosting\public\index.html` me copy karo (ya `deploy.cmd` double-click — wo khud copy karta hai)
3. Deploy
4. Browser me Ctrl+Shift+R

> HTML par `no-cache` header hai — update turant dikhta hai.

---

## IMPORTANT — frontend transport caveat

VassaCRM ka frontend `google.script.run` use karta hai, jo sirf Apps Script ke andar chalta hai.
Firebase par chalane ke liye frontend me **dual-mode `call()`** add kiya gaya hai:
- Apps Script host par: `google.script.run` (jaise pehle)
- Firebase/hosted par: JSONP to `BACKEND_URL` (Apps Script web app URL)

**Firebase par chalane ke liye aapko `Index.html` me `BACKEND_URL` set karna hoga** apne Apps Script web app URL se, ya URL me `?backend=<url>` pass karna hoga.

Backend me RPC gateway (`doGet ?api=true&fn=...`, `doPost {rpc:true}`) add kiya gaya hai — whitelist: `ui*` functions.

---

## Rollback

- **Hosting**: Firebase Console → Hosting → **Release history** → purana release → **Rollback**
- **Code**: GitHub par commit revert → auto-deploy purana version live kar dega
- **Backend**: `REVERT_GUIDE.md` dekhein

---

## Notes

- Tools shared from attendance project: `E:\Projects\Attendnce\tools\` (node, firebase, gh)
- `vassa-crm-gps.web.app` default site hai, delete nahi ho sakti (Firebase restriction) — isliye wahan redirect pages deploy karne pad sakte hain (attendance jaisa)