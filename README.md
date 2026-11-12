# VassaCRM — Real Estate CRM (Google Apps Script)

Google Sheets + Apps Script based CRM. Kisi bhi phone/laptop par web app ki tarah chalta hai.

## Files

| File | Kya hai |
|---|---|
| `Code.gs` | Backend — Sheets logic, web app API, WhatsApp alerts, daily report (v4.4) |
| `Index.html` | Frontend GUI (Vassa Properties branding, mobile-friendly) |
| `backups\` | Purane versions (v4, v4.1-prev, v3 GUI) |

## Sheets structure

Script khud banata hai: `Leads`, `Executives`, `Project Sites`, `Activity Log`, `Daily Report`

`Executives` sheet ke columns: Name | WhatsApp Number | Active | Notes | **Project Sites**
(Project Sites me `Vassa Heights, Vassa Greens` jaisa comma-separated list — GUI ke
**Master Parameters → Sales Executives** se assign hota hai.)

## Setup (naya sheet) / Upgrade

1. Google Sheet kholo → **Extensions → Apps Script**
2. `Code.gs` ka poora content paste karo → Save
3. **+ → HTML** file banao naam `Index` → `Index.html` ka content paste karo → Save
4. Function dropdown se `setup` chuno → **Run** (ek baar, permission do)
5. **Deploy → New deployment → Web app** → Execute as: *Me*, Access: *Anyone*
6. URL copy karke phone me khol lo

## Upgrade (purana version → naya)

1. `Code.gs` + `Index.html` paste karo → Save
2. **Deploy → Manage deployments → Edit (✏️) → Version: New version → Deploy**

## Settings

`Extensions → Apps Script → Project Settings → Script Properties → CRM_SETTINGS`
(JSON: company name, boss number, WhatsApp templates, ad spend)

Doosri Script Properties:

| Property | Kya karta hai |
|---|---|
| `API_SECRET` | `doPost` (Make/Zapier/Meta) ka secret — `setup` khud bana deta hai |
| `AUTO_ROUTE_SITE` | `off` likhne par site-wise auto-assign band ho jata hai (default: chalu) |
| `WA_TOKEN`, `WA_PHONE_ID`, `WA_TEMPLATE` | WhatsApp Cloud API (na ho to `wa.me` link banta hai) |
| `META_VERIFY_TOKEN`, `META_PAGE_TOKEN` | Meta webhook verify + lead details fetch |

## Site-wise lead routing (v4.3)

Naya lead aate hi uska **Project / Property** `Project Sites` master se match hota hai:

1. Pehle exact match (`vassa heights` = `Vassa Heights`), warna partial —
   lead me `Vassa Heights 2BHK` likha ho to bhi `Vassa Heights` match ho jata hai
2. Ek se zyada partial match ho to **sabse lamba naam** jeetta hai
   (`Vassa Heights Phase 2` > `Vassa Heights`)
3. Us site par jo **Active** executive assigned hai → lead auto-assign,
   Status = `Assigned`, aur WhatsApp alert usi ko
4. Ek site par kai executive ho to **pehla Active** chunta hai; baaki naam Activity Log me note
5. Site par koi Active executive nahi → lead `New` hi rehta hai (Activity Log me `Routing` entry)
6. GUI se exec manually chuna ho to routing skip — aapka chuna hua exec hi chalta hai

**Bina Meta credentials test:** Apps Script editor me function `testInboundLead` Run karo —
ek test lead banega aur routing ka result Logs me dikhega (`View → Logs`).
Sirf matching check karni ho (kuch save nahi hota) to `testSiteMatch` Run karo.

## Features

- Lead auto-ID + date, duplicate phone check
- Executive assign → status "Assigned" + WhatsApp alert
- **Site-wise auto-assign**: project site se executive auto-select + alert
- Web app: mobile GUI (dashboard, leads, executives, reports)
- Daily report email (shaam 7 baje IST)
- Follow-up date mandatory rule
- Inbound leads via `doPost` (Make / Zapier / Meta ads)
