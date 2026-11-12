# VassaCRM — Revert Guide

## Backend (Apps Script) revert

1. `backups\` folder se purana `Code-*.gs` kholo.
2. Apps Script editor me paste → Save → Deploy → New version.

## Frontend revert

1. `backups\` folder se purana `Index-*.html` kholo.
2. `Index` HTML file me paste → Save.
3. GitHub revert: `git revert <commit>` → push → auto-deploy.

## Firebase Hosting revert

Firebase Console → Hosting → Release history → purana release → Rollback.

## Quick revert (local)

`firebase_hosting\public\index.html` ko backup se replace karo, phir `deploy.cmd` double-click.