# VassaCRM — Update Guide

## Step 1: Google Sheet (Apps Script Backend) update

1. Apna VassaCRM Google Sheet kholein.
2. Menu: **Extensions > Apps Script**.
3. Purana code hatao, `Code.gs` ka poora content paste karo → **Save**.
4. **Deploy > Manage deployments** → pencil (Edit) → **Version: New version** → **Deploy**.

## Step 2: GitHub + Firebase (frontend) update

1. `Index.html` edit karo.
2. Commit + push to `main` branch → GitHub Actions apne aap Firebase par deploy kar dega.
   - Ya manually: `firebase_hosting\deploy.cmd` double-click (wo khud `Index.html` ko `public\index.html` me copy karta hai).
3. Browser me Ctrl+Shift+R.

## Step 3: Backend RPC gateway (Firebase host ke liye)

Firebase par frontend chalane ke liye `Index.html` me `BACKEND_URL` set karo apne Apps Script web app URL se, ya URL me `?backend=<url>` pass karo.

Backend (`Code.gs`) me RPC gateway add hai: `doGet(?api=true&fn=uiXxx&args=JSON&callback=cb)` aur `doPost({rpc:true,fn,args})`.

## Rollback

- Hosting: Firebase Console → Hosting → Release history → purana release → Rollback
- Code: GitHub commit revert → auto-deploy purana version
- Backend: `REVERT_GUIDE.md` dekhein