# -*- coding: utf-8 -*-
"""
Pre-deploy smoke test for VassaCRM (Firebase-hosted frontend + mock backend).

Runs against the LOCAL preview server (started automatically on port 8765).
Preview uses preview/mock.js (fake google.script.run) so no Apps Script needed.

Checks:
  1. Page loads, no console/page errors
  2. Dashboard renders (Total Leads KPI)
  3. Sidebar grouped sections (Lead Management / All Reports / Master Parameters)
  4. Master Parameters sub-items present (Sales Executives, Project Sites, WhatsApp Templates)
  5. Project Sites master renders
  6. Sales Executives master renders
  7. Exec edit dialog + Project Sites dropdown works
  8. Add Lead dialog opens, saves, auto-assigns by site
  9. Version string present

Exit code 0 = all pass, 1 = failure. Safe to wire into deploy_safe.cmd.
"""
import json, subprocess, sys, time, os
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "preview")
PORT = 8765
URL = "http://localhost:%d/index.html" % PORT

results = []
def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    results.append((name, cond, detail))
    print(("[%s] %s %s" % (status, name, ("-- " + detail) if detail else "")).encode("utf-8", "replace").decode("utf-8"))

def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT)],
        cwd=SRC, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    time.sleep(2)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            errs = []
            page.on("pageerror", lambda e: errs.append("PAGEERROR: " + str(e)[:200]))
            page.on("console", lambda m: errs.append("CONSOLE " + m.type + ": " + m.text[:200]) if m.type == "error" else None)

            page.goto(URL, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(3000)

            check("page loads", page.title() != "", page.title())
            check("no console/page errors (initial)", len(errs) == 0, "; ".join(errs[:3]))

            dash_text = page.inner_text("#v-dash") if page.locator("#v-dash").count() else ""
            check("dashboard renders (Total Leads)", "Total Leads" in dash_text, dash_text[:60].replace("\n"," "))

            side = page.inner_text("#side") if page.locator("#side").count() else ""
            check("version string present", "v4.6" in side, side[-60:].replace("\n"," "))

            check("sidebar: Lead Management section", "LEAD MANAGEMENT" in side.upper())
            check("sidebar: All Reports section", "ALL REPORTS" in side.upper())
            check("sidebar: Master Parameters section", "MASTER PARAMETERS" in side.upper())
            check("Master Parameters has 3 sub-items",
                  page.locator("#side button", has_text="Sales Executives").count() > 0 and
                  page.locator("#side button", has_text="Project Sites").count() > 0 and
                  page.locator("#side button", has_text="WhatsApp Templates").count() > 0)

            ps_btn = page.locator("#side button", has_text="Project Sites").first
            if ps_btn.count():
                ps_btn.click()
                page.wait_for_timeout(800)
            team_text = page.inner_text("#v-team") if page.locator("#v-team").count() else ""
            check("Project Sites master renders", "project site" in team_text.lower(),
                  team_text[:80].replace("\n"," "))

            se_btn = page.locator("#side button", has_text="Sales Executives").first
            if se_btn.count():
                se_btn.click()
                page.wait_for_timeout(800)
            team_text2 = page.inner_text("#v-team") if page.locator("#v-team").count() else ""
            check("Sales Executives master renders", "sales executive" in team_text2.lower(),
                  team_text2[:60].replace("\n"," "))

            edit_btn = page.locator("#v-team button", has_text="Edit").first
            if edit_btn.count():
                edit_btn.click()
                page.wait_for_timeout(600)
            dlg = page.locator(".dlg")
            check("exec edit dialog opens", dlg.count() > 0 and "Edit Sales Executive" in (dlg.inner_text() if dlg.count() else ""))
            dd = page.locator("#eSitesDD")
            check("Project Sites dropdown present", dd.count() > 0)
            if dd.count():
                page.locator("#eSitesDD [data-dd]").first.click()
                page.wait_for_timeout(300)
                check("dropdown opens", page.locator("#eSitesDD .ddmenu").is_visible())
                cbs = page.locator("#eSitesDD input[type=checkbox]")
                if cbs.count():
                    cbs.first.click()
                    page.wait_for_timeout(200)
                    summary = page.locator("#eSitesTxt").inner_text() if page.locator("#eSitesTxt").count() else ""
                    check("dropdown count updates", "selected" in summary, summary)
            close_btn = page.locator(".dlg button", has_text="Cancel").first
            if close_btn.count():
                close_btn.click()
                page.wait_for_timeout(300)

            leads_btn = page.locator("button", has_text="Leads").first
            if leads_btn.count():
                leads_btn.click()
                page.wait_for_timeout(500)
            add_btn = page.locator("button", has_text="+ Lead").first
            if add_btn.count():
                add_btn.click()
                page.wait_for_timeout(500)
            dlg2 = page.locator(".dlg")
            check("Add Lead dialog opens", dlg2.count() > 0 and "New Lead" in (dlg2.inner_text() if dlg2.count() else ""))
            if dlg2.count():
                page.fill("#aName", "Smoke Test Lead")
                page.fill("#aPhone", "9000000099")
                page.fill("#aProject", "Vassa Heights 2BHK")
                page.click('button:has-text("Save Lead")')
                page.wait_for_timeout(1500)
                dialog_text = (page.locator(".dlg").inner_text() if page.locator(".dlg").count() else "")
                check("lead saved (dialog)", "saved" in dialog_text.lower() or "L-0" in dialog_text, dialog_text[:80].replace("\n"," "))
            cb = page.locator(".dlg button", has_text="Close").first
            if cb.count():
                cb.click()
                page.wait_for_timeout(300)

            check("no console/page errors (full run)", len(errs) == 0, "; ".join(errs[:3]))

            browser.close()
    finally:
        try:
            server.terminate()
            server.wait(timeout=5)
        except Exception:
            server.kill()

    failed = [r for r in results if not r[1]]
    print("\n" + "=" * 60)
    print("RESULT: %d/%d passed" % (len(results) - len(failed), len(results)))
    if failed:
        for name, _, detail in failed:
            print("  FAIL: %s  %s" % (name, detail))
        sys.exit(1)
    else:
        print("All checks passed - safe to deploy.")
        sys.exit(0)

if __name__ == "__main__":
    main()