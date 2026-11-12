/**
 * Real Estate CRM - Google Sheets + Apps Script (v4.1 - App-style GUI v3 + Templates + Reports)
 * Govind Gore | 2026-11
 *
 * Kya karta hai:
 *  1. Leads sheet mein Executive ya Status badalne par Activity Log mein entry.
 *  2. Executive bharte hi Status "Assigned" + WhatsApp alert link (ya Cloud API se auto message).
 *  3. Naya lead (Name/Phone) aate hi Lead ID + Date apne aap.
 *  4. doPost web-app: Make/Zapier/Meta se naye leads "New" status ke saath, phone se duplicate check.
 *  5. GUI: Deploy > Web app karke mobile/laptop par CRM app (Index.html v3).
 *  6. Daily Report: roz shaam 7 baje (IST) 'Daily Report' tab ka email (sendDailyReport).
 *  7. Rule: har open lead ki Next Follow-up date zaroori (sheet mein orange, GUI mein check).
 *  8. v4: uiGetAll (ek call mein sab data), WhatsApp templates + company name + boss number + ad spend
 *     (Script Property 'CRM_SETTINGS' mein JSON), uiDeleteExecutive, 'Lead Assigned' template se wa.me message.
 *
 * Setup: Extensions > Apps Script > yeh poora code paste > Save > function "setup" Run karo (ek baar).
 * Upgrade v3 -> v4: Code.gs + Index.html paste > Save > Deploy > Manage deployments > Edit > New version.
 */

// ===== SETTINGS =====
var SHEET_LEADS = 'Leads';
var SHEET_EXEC = 'Executives';
var SHEET_LOG = 'Activity Log';
var STATUSES = ['New', 'Assigned', 'Contacted', 'Site Visit', 'Negotiation', 'Closed', 'Lost'];
var STALE_MINUTES = 30; // itne minute tak "Assigned" raha to alert (checkStaleLeads)
var SHEET_REPORT = 'Daily Report';
var REPORT_EMAIL_DEFAULT = 'govind1180@gmail.com'; // dusre logon ko bhejna ho to Script Property REPORT_EMAILS (comma se alag)
var REPORT_HOUR = 19; // 7 PM IST
var FOLLOWUP_REQUIRED = ['Contacted', 'Site Visit', 'Negotiation']; // GUI mein in status par follow-up date zaroori

// Lead sheet ke header names (column order badle to bhi chalega)
var H = {
  id: 'Lead ID', date: 'Date', name: 'Name', phone: 'Phone', source: 'Source / Campaign',
  project: 'Project / Property', exec: 'Assigned Executive', status: 'Status',
  lost: 'Lost Reason', followup: 'Next Follow-up', notes: 'Notes', wa: 'WhatsApp Alert',
  assignedAt: 'Assigned At', updated: 'Last Updated'
};

// ===== ONE-TIME SETUP =====
function setup() {
  var ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['handleEdit', 'checkStaleLeads'].indexOf(t.getHandlerFunction()) > -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('handleEdit').forSpreadsheet(ss).onEdit().create();
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('API_SECRET')) props.setProperty('API_SECRET', Utilities.getUuid().replace(/-/g, ''));
  if (!props.getProperty('LEAD_COUNTER')) props.setProperty('LEAD_COUNTER', String(lastLeadNumber_()));
  SpreadsheetApp.getUi().alert('CRM setup complete!\n\nAPI_SECRET (for Make/Zapier, keep it safe):\n' + props.getProperty('API_SECRET'));
}

// 30-min alert chalu karna ho tab yeh ek baar Run karo (har 15 min check karega)
function enableStaleLeadAlerts() {
  ScriptApp.newTrigger('checkStaleLeads').timeBased().everyMinutes(15).create();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('CRM')
    .addItem('Rebuild WhatsApp alert for selected lead', 'rebuildAlertForActiveRow')
    .addItem('Check stale leads now', 'checkStaleLeads')
    .addItem('Email daily report now', 'sendDailyReport')
    .addItem('Turn on daily 7 PM report email', 'enableDailyReportEmail')
    .addToUi();
}

// ===== EDIT TRIGGER (installable) =====
function handleEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== SHEET_LEADS || e.range.getRow() < 2) return;

  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var cols = headerMap_(sh);
    var user = (e.user && e.user.getEmail && e.user.getEmail()) || Session.getActiveUser().getEmail() || 'unknown';
    var single = e.range.getNumRows() === 1 && e.range.getNumColumns() === 1;
    var c1 = e.range.getColumn(), c2 = c1 + e.range.getNumColumns() - 1;

    for (var r = e.range.getRow(); r < e.range.getRow() + e.range.getNumRows(); r++) {
      var row = readRow_(sh, r, cols);
      if (!row.name && !row.phone && !row.exec && !row.status) continue;
      var now = new Date();

      // Naye lead ko ID + Date + New status
      if (!row.id && (row.name || row.phone)) {
        setCell_(sh, r, cols, H.id, nextLeadId_());
        if (!row.date) setCell_(sh, r, cols, H.date, now);
        if (!row.status && !row.exec) { setCell_(sh, r, cols, H.status, 'New'); row.status = 'New'; }
        row = readRow_(sh, r, cols);
        log_(row.id, 'Created', '', row.status || 'New', user, 'Manual entry');
      }

      // Executive change
      if (inRange_(cols[H.exec], c1, c2)) {
        var oldExec = single ? (e.oldValue || '') : '(bulk edit)';
        if (String(oldExec) !== String(row.exec)) {
          log_(row.id, 'Assignment', oldExec, row.exec, user, row.exec ? 'Executive assigned' : 'Executive removed');
          if (row.exec) {
            setCell_(sh, r, cols, H.assignedAt, now);
            if (!row.status || row.status === 'New' || row.status === 'Lost') {
              var prev = row.status || '';
              setCell_(sh, r, cols, H.status, 'Assigned');
              log_(row.id, 'Status', prev, 'Assigned', 'AUTO', 'Auto-status on executive assignment');
              row.status = 'Assigned';
            }
            sendAssignmentAlert_(sh, r, cols, row);
          }
        }
      }

      // Status change
      if (inRange_(cols[H.status], c1, c2)) {
        var oldStatus = single ? (e.oldValue || '') : '(bulk edit)';
        if (String(oldStatus) !== String(row.status)) {
          var note = '';
          if (row.status === 'Lost' && !row.lost) note = 'Lost Reason is empty - please fill it in';
          if (row.status === 'Assigned' && !row.exec) note = 'Assigned Executive is empty';
          if (!note && row.status && row.status !== 'Closed' && row.status !== 'Lost' && !row.followup) note = 'Please enter a Next Follow-up date (required for open leads)';
          log_(row.id, 'Status', oldStatus, row.status, user, note);
          if (note) SpreadsheetApp.getActive().toast(note, 'CRM', 6);
        }
      }

      // Notes / follow-up bhi log karo
      if (single && inRange_(cols[H.notes], c1, c2) && row.notes) log_(row.id, 'Note', e.oldValue || '', row.notes, user, '');
      if (single && inRange_(cols[H.followup], c1, c2)) log_(row.id, 'Follow-up', e.oldValue || '', row.followup, user, '');
      if (single && inRange_(cols[H.lost], c1, c2)) log_(row.id, 'Lost Reason', e.oldValue || '', row.lost, user, '');

      setCell_(sh, r, cols, H.updated, now);
    }
  } finally {
    lock.releaseLock();
  }
}

// ===== WHATSAPP =====
// Option A (free, abhi): wa.me link banta hai - admin click karke bhejta hai.
// Option B (baad mein, automatic): Script Properties mein WA_TOKEN, WA_PHONE_ID, WA_TEMPLATE daalo.
function sendAssignmentAlert_(sh, r, cols, row) {
  var ex = findExecutive_(row.exec);
  if (!ex || !ex.phone) {
    setCell_(sh, r, cols, H.wa, 'WhatsApp number for ' + row.exec + ' not found in the Executives tab');
    return;
  }
  var msg = 'Hello ' + row.exec + ', a new lead has been assigned to you.\n' +
    'Lead ID: ' + row.id + '\nName: ' + row.name + '\nPhone: ' + row.phone +
    '\nProject: ' + (row.project || '-') + '\nSource: ' + (row.source || '-') +
    '\nPlease call the customer within 30 minutes.';
  // v4: saved 'Lead Assigned' template ho to wahi use karo (sirf wa.me link ke liye; Cloud API path same)
  try {
    var saved = readSavedSettings_(), tpl = null;
    (saved.templates || []).forEach(function (t) { if (t && t.id === 'assigned' && String(t.text || '').trim()) tpl = t; });
    if (tpl) msg = fillTemplate_(tpl.text, templateVars_(row, saved.company));
  } catch (err) { /* fallback: purana hardcoded msg */ }

  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('WA_TOKEN') && props.getProperty('WA_PHONE_ID')) {
    var ok = sendWhatsAppCloud_(ex.phone, row);
    log_(row.id, 'WhatsApp', '', ex.phone, 'AUTO', ok ? 'Sent via Cloud API' : 'Cloud API failed - use the link');
    if (ok) { setCell_(sh, r, cols, H.wa, 'Sent (API) ' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MMM HH:mm')); return; }
  }
  var url = 'https://wa.me/' + ex.phone + '?text=' + encodeURIComponent(msg);
  var cell = sh.getRange(r, cols[H.wa]);
  cell.setRichTextValue(SpreadsheetApp.newRichTextValue().setText('Send to ' + row.exec).setLinkUrl(url).build());
  log_(row.id, 'WhatsApp', '', ex.phone, 'AUTO', 'Alert link ready');
}

function sendWhatsAppCloud_(to, row) {
  var p = PropertiesService.getScriptProperties();
  var payload = {
    messaging_product: 'whatsapp', to: to, type: 'template',
    template: {
      name: p.getProperty('WA_TEMPLATE') || 'lead_assigned',
      language: { code: p.getProperty('WA_LANG') || 'en' },
      components: [{ type: 'body', parameters: [row.exec, row.id, row.name, row.phone, row.project || '-', row.source || '-']
        .map(function (t) { return { type: 'text', text: String(t).replace(/\s+/g, ' ') }; }) }]
    }
  };
  try {
    var res = UrlFetchApp.fetch('https://graph.facebook.com/v21.0/' + p.getProperty('WA_PHONE_ID') + '/messages', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + p.getProperty('WA_TOKEN') }, payload: JSON.stringify(payload)
    });
    return res.getResponseCode() < 300;
  } catch (err) { return false; }
}

function rebuildAlertForActiveRow() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== SHEET_LEADS) return;
  var cols = headerMap_(sh), r = sh.getActiveRange().getRow();
  var row = readRow_(sh, r, cols);
  if (row.exec) sendAssignmentAlert_(sh, r, cols, row);
}

// ===== WEB APP: naye leads (Make / Zapier / Meta) =====
// POST JSON: {"secret":"...","name":"...","phone":"...","source":"...","project":"...","notes":"..."}
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, error: 'bad json' }); }

  // Meta ka seedha webhook (sirf leadgen_id aata hai; META_PAGE_TOKEN ho to details fetch)
  if (body.object === 'page' && body.entry) return json_(handleMetaWebhook_(body));

  var secret = PropertiesService.getScriptProperties().getProperty('API_SECRET');
  if (!secret || body.secret !== secret) return json_({ ok: false, error: 'unauthorized' });
  return json_(addLead_(body));
}

// GET: Meta webhook verification, warna CRM ka GUI (Index.html) kholo
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p['hub.mode']) {
    var verify = PropertiesService.getScriptProperties().getProperty('META_VERIFY_TOKEN');
    if (p['hub.mode'] === 'subscribe' && verify && p['hub.verify_token'] === verify) {
      return ContentService.createTextOutput(p['hub.challenge']);
    }
    return ContentService.createTextOutput('verify failed');
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Vassa Properties CRM')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function addLead_(d, by) {
  by = by || 'API';
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LEADS);
    var cols = headerMap_(sh);
    var phone = normPhone_(d.phone);
    if (!phone && !d.name) return { ok: false, error: 'name or phone required' };

    // Duplicate check by phone
    if (phone) {
      var last = sh.getLastRow();
      if (last >= 2) {
        var phones = sh.getRange(2, cols[H.phone], last - 1, 1).getValues();
        for (var i = 0; i < phones.length; i++) {
          if (normPhone_(phones[i][0]) === phone) {
            var r = i + 2, id = sh.getRange(r, cols[H.id]).getValue();
            var notesCell = sh.getRange(r, cols[H.notes]);
            var stamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MMM-yy HH:mm');
            notesCell.setValue((notesCell.getValue() ? notesCell.getValue() + '\n' : '') + '[' + stamp + '] Repeat enquiry: ' + (d.source || '') + ' ' + (d.project || ''));
            log_(id, 'Duplicate', '', d.source || '', by, 'Repeat lead from the same phone - no new row created');
            return { ok: true, duplicate: true, lead_id: id };
          }
        }
      }
    }

    var id = nextLeadId_(), now = new Date();
    var rowArr = new Array(sh.getLastColumn()).fill('');
    function put(h, v) { if (cols[h]) rowArr[cols[h] - 1] = v; }
    put(H.id, id); put(H.date, now); put(H.name, d.name || ''); put(H.phone, phone || d.phone || '');
    put(H.source, [d.source, d.campaign].filter(String).join(' / ')); put(H.project, d.project || '');
    put(H.status, 'New'); put(H.notes, d.notes || ''); put(H.updated, now);
    sh.appendRow(rowArr);
    log_(id, 'Created', '', 'New', by, 'Source: ' + (d.source || by));
    return { ok: true, duplicate: false, lead_id: id };
  } finally {
    lock.releaseLock();
  }
}

function handleMetaWebhook_(body) {
  var token = PropertiesService.getScriptProperties().getProperty('META_PAGE_TOKEN');
  var results = [];
  body.entry.forEach(function (en) {
    (en.changes || []).forEach(function (ch) {
      if (ch.field !== 'leadgen') return;
      var v = ch.value || {}, lead = { source: 'Meta Lead Ad', campaign: 'form ' + (v.form_id || ''), notes: 'leadgen_id ' + v.leadgen_id };
      if (token) {
        try {
          var res = JSON.parse(UrlFetchApp.fetch('https://graph.facebook.com/v21.0/' + v.leadgen_id + '?access_token=' + token).getContentText());
          (res.field_data || []).forEach(function (f) {
            var val = (f.values || [])[0] || '';
            if (/full_name|^name$/i.test(f.name)) lead.name = val;
            else if (/phone/i.test(f.name)) lead.phone = val;
            else if (/project|property/i.test(f.name)) lead.project = val;
            else lead.notes += ' | ' + f.name + ': ' + val;
          });
        } catch (err) { lead.notes += ' | fetch failed'; }
      }
      if (!lead.name) lead.name = 'Meta lead ' + v.leadgen_id;
      results.push(addLead_(lead));
    });
  });
  return { ok: true, results: results };
}

// ===== 30-MIN ALERT (optional trigger) =====
function checkStaleLeads() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LEADS);
  var cols = headerMap_(sh), last = sh.getLastRow();
  if (last < 2) return;
  var data = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var now = Date.now(), stale = [];
  data.forEach(function (rw, i) {
    var st = rw[cols[H.status] - 1], at = rw[cols[H.assignedAt] - 1];
    if (st === 'Assigned' && at instanceof Date && now - at.getTime() > STALE_MINUTES * 60000) {
      stale.push(rw[cols[H.id] - 1] + ' (' + rw[cols[H.exec] - 1] + ')');
      sh.getRange(i + 2, cols[H.status]).setBackground('#f4cccc');
    }
  });
  if (stale.length) SpreadsheetApp.getActive().toast('Not contacted for ' + STALE_MINUTES + ' minutes: ' + stale.join(', '), 'CRM alert', 10);
}

// ===== HELPERS =====
function headerMap_(sh) {
  var hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], m = {};
  hdr.forEach(function (h, i) { m[String(h).trim()] = i + 1; });
  return m;
}
function readRow_(sh, r, cols) {
  var v = sh.getRange(r, 1, 1, sh.getLastColumn()).getValues()[0], o = {};
  Object.keys(H).forEach(function (k) { o[k] = cols[H[k]] ? v[cols[H[k]] - 1] : ''; });
  return o;
}
function setCell_(sh, r, cols, header, val) { if (cols[header]) sh.getRange(r, cols[header]).setValue(val); }
function inRange_(c, a, b) { return c && c >= a && c <= b; }
function log_(id, type, oldV, newV, by, note) {
  SpreadsheetApp.getActive().getSheetByName(SHEET_LOG).appendRow([new Date(), id, type, lv_(oldV), lv_(newV), by, note || '']);
}
// Log value ko saaf text banao: Date -> '07-Nov-2026' (time ho to '07-Nov-2026 17:19')
function lv_(v) {
  if (v === null || v === undefined) return '';
  if (!(v instanceof Date) && /^\w{3} \w{3} \d{1,2} \d{4} \d\d:\d\d:\d\d GMT/.test(String(v))) {
    var d = new Date(String(v).replace(/ \(.*\)$/, ''));
    if (!isNaN(d.getTime())) v = d;
  }
  if (v instanceof Date) {
    var hm = Utilities.formatDate(v, 'Asia/Kolkata', 'HH:mm');
    return Utilities.formatDate(v, 'Asia/Kolkata', 'dd-MMM-yyyy') + (hm === '00:00' ? '' : ' ' + hm);
  }
  return String(v);
}
function normPhone_(p) {
  var d = String(p || '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '0') d = d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d;
}
function findExecutive_(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_EXEC), last = sh.getLastRow();
  if (last < 2) return null;
  var rows = sh.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === String(name).trim().toLowerCase()) return { name: rows[i][0], phone: normPhone_(rows[i][1]) };
  }
  return null;
}
function nextLeadId_() {
  var p = PropertiesService.getScriptProperties();
  var n = Math.max(Number(p.getProperty('LEAD_COUNTER') || 0), lastLeadNumber_()) + 1;
  p.setProperty('LEAD_COUNTER', String(n));
  return 'L-' + ('0000' + n).slice(-4);
}
function lastLeadNumber_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LEADS), last = sh.getLastRow();
  if (last < 2) return 0;
  var col = headerMap_(sh)[H.id];
  return sh.getRange(2, col, last - 1, 1).getValues().reduce(function (mx, r) {
    var m = String(r[0]).match(/L-(\d+)/); return m ? Math.max(mx, Number(m[1])) : mx;
  }, 0);
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// =====================================================================
// ===== GUI (web app) ke server functions — Index.html inko call karta hai
// =====================================================================
var LOST_REASONS = ['Budget issue', 'Location not suitable', 'Bought elsewhere', 'Not interested', 'Not reachable', 'Fake / wrong number', 'Other'];

function fmt_(v, withTime) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Kolkata', withTime ? 'dd-MMM-yy HH:mm' : 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v);
}
function me_() { return Session.getActiveUser().getEmail() || 'GUI'; }

function uiGetData() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SHEET_LEADS), cols = headerMap_(sh), last = sh.getLastRow();
  var leads = [];
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues().forEach(function (v) {
      var id = cols[H.id] ? v[cols[H.id] - 1] : '';
      if (!id) return;
      var o = {};
      Object.keys(H).forEach(function (k) {
        var val = cols[H[k]] ? v[cols[H[k]] - 1] : '';
        o[k] = fmt_(val, k === 'date' || k === 'assignedAt' || k === 'updated');
      });
      leads.push(o);
    });
  }
  leads.reverse(); // naye upar
  return { leads: leads, executives: uiGetExecutives(), statuses: STATUSES, lostReasons: LOST_REASONS, me: me_() };
}

function uiGetExecutives() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_EXEC), last = sh.getLastRow(), out = [];
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, 4).getValues().forEach(function (v, i) {
    if (String(v[0]).trim()) out.push({ row: i + 2, name: String(v[0]).trim(), phone: String(v[1]), active: String(v[2] || 'Yes'), notes: String(v[3] || '') });
  });
  return out;
}

function uiSaveExecutive(ex) {
  var name = String(ex.name || '').trim(), phone = normPhone_(ex.phone);
  if (!name) throw new Error('Name is required');
  if (!/^91\d{10}$/.test(phone)) throw new Error('WhatsApp number must be 10 digits (91 is added automatically)');
  var lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_EXEC);
    var list = uiGetExecutives();
    var clash = list.filter(function (x) { return x.name.toLowerCase() === name.toLowerCase() && x.row !== Number(ex.row); });
    if (clash.length) throw new Error('A sales executive with this name already exists');
    var values = [[name, phone, ex.active === 'No' ? 'No' : 'Yes', ex.notes || '']];
    if (ex.row) {
      var oldName = String(sh.getRange(Number(ex.row), 1).getValue()).trim();
      sh.getRange(Number(ex.row), 1, 1, 4).setValues(values);
      if (oldName && oldName !== name) renameExecutiveInLeads_(oldName, name);
    } else {
      // pehli khaali row (Name column) dhoondo, warna neeche jodo
      var last = Math.max(sh.getLastRow(), 1), names = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues() : [], r = 0;
      for (var i = 0; i < names.length; i++) if (!String(names[i][0]).trim()) { r = i + 2; break; }
      if (!r) r = last + 1;
      sh.getRange(r, 1, 1, 4).setValues(values);
      sh.getRange(r, 2).setNumberFormat('@').setValue(phone);
    }
  } finally { lock.releaseLock(); }
  return uiGetExecutives();
}

function renameExecutiveInLeads_(oldName, newName) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LEADS), cols = headerMap_(sh), last = sh.getLastRow();
  if (last < 2 || !cols[H.exec]) return;
  var rng = sh.getRange(2, cols[H.exec], last - 1, 1), v = rng.getValues(), changed = false;
  v.forEach(function (r) { if (String(r[0]).trim() === oldName) { r[0] = newName; changed = true; } });
  if (changed) rng.setValues(v);
}

function uiAddLead(d) {
  if (!d.name && !d.phone) throw new Error('Please enter a name or phone number');
  var res = addLead_({ name: d.name, phone: d.phone, source: d.source, project: d.project, notes: d.notes }, me_());
  if (res.ok && !res.duplicate && d.exec) res.waLink = uiUpdateLead(res.lead_id, { exec: d.exec }).waLink || '';
  return res;
}

function findLeadRow_(sh, cols, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, cols[H.id], last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

// changes: {exec, status, lost, followup ('YYYY-MM-DD' ya ''), note (naya note jodna)}
function uiUpdateLead(id, changes) {
  var lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LEADS), cols = headerMap_(sh);
    var r = findLeadRow_(sh, cols, id);
    if (!r) throw new Error('Lead not found: ' + id);
    var row = readRow_(sh, r, cols), user = me_(), now = new Date(), waLink = '';
    var newStatus = changes.status !== undefined ? changes.status : row.status;
    var newLost = changes.lost !== undefined ? changes.lost : row.lost;
    if (newStatus === 'Lost' && !newLost) throw new Error('Please select a reason for marking the lead as Lost');
    var finalFollow = changes.followup !== undefined ? changes.followup : fmt_(row.followup, false);
    if (FOLLOWUP_REQUIRED.indexOf(newStatus) > -1 && !finalFollow) throw new Error('Please enter a next follow-up date (required for ' + newStatus + ' leads)');

    if (changes.exec !== undefined && String(changes.exec) !== String(row.exec)) {
      setCell_(sh, r, cols, H.exec, changes.exec);
      log_(id, 'Assignment', row.exec, changes.exec, user, changes.exec ? 'Executive assigned (GUI)' : 'Executive removed (GUI)');
      if (changes.exec) {
        setCell_(sh, r, cols, H.assignedAt, now);
        if ((changes.status === undefined || changes.status === row.status) && (!row.status || row.status === 'New' || row.status === 'Lost')) {
          newStatus = 'Assigned';
        }
      }
    }
    if (newLost !== row.lost) {
      setCell_(sh, r, cols, H.lost, newLost);
      log_(id, 'Lost Reason', row.lost, newLost, user, '');
    }
    if (newStatus !== row.status) {
      if (newStatus === 'Assigned' && !(changes.exec || row.exec)) throw new Error('Please select a sales executive first');
      setCell_(sh, r, cols, H.status, newStatus);
      log_(id, 'Status', row.status, newStatus, changes.status === undefined ? 'AUTO' : user, '');
    }
    if (changes.followup !== undefined) {
      var oldF = fmt_(row.followup, false);
      if (changes.followup !== oldF) {
        var f = changes.followup ? changes.followup.split('-') : null;
        setCell_(sh, r, cols, H.followup, f ? new Date(Number(f[0]), Number(f[1]) - 1, Number(f[2])) : '');
        log_(id, 'Follow-up', oldF, changes.followup, user, '');
      }
    }
    if (changes.note) {
      var stamp = Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM HH:mm');
      setCell_(sh, r, cols, H.notes, (row.notes ? row.notes + '\n' : '') + '[' + stamp + '] ' + changes.note);
      log_(id, 'Note', '', changes.note, user, '');
    }
    setCell_(sh, r, cols, H.updated, now);

    if (changes.exec) {
      row = readRow_(sh, r, cols);
      sendAssignmentAlert_(sh, r, cols, row);
      var link = sh.getRange(r, cols[H.wa]).getRichTextValue();
      waLink = link ? (link.getLinkUrl() || '') : '';
    }
    return { ok: true, waLink: waLink, lead: leadObj_(readRow_(sh, r, cols)) };
  } finally { lock.releaseLock(); }
}

function uiGetHistory(id) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LOG), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 7).getValues()
    .filter(function (v) { return String(v[1]) === String(id); })
    .map(function (v) { return { at: fmt_(v[0], true), type: v[2], from: lv_(v[3]), to: lv_(v[4]), by: String(v[5]), note: String(v[6]) }; })
    .reverse();
}

function uiGetRecentActivity() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LOG), last = sh.getLastRow();
  if (last < 2) return [];
  var start = Math.max(2, last - 99);
  return sh.getRange(start, 1, last - start + 1, 7).getValues()
    .map(function (v) { return { at: fmt_(v[0], true), id: String(v[1]), type: v[2], from: lv_(v[3]), to: lv_(v[4]), by: String(v[5]), note: String(v[6]) }; })
    .reverse();
}


// ===== DAILY REPORT EMAIL (v3) =====
// Ek baar Run karo: roz shaam 7 baje (IST) report email aayega.
function enableDailyReportEmail() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDailyReport') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDailyReport').timeBased().atHour(REPORT_HOUR).nearMinute(0).everyDays(1).inTimezone('Asia/Kolkata').create();
  try { SpreadsheetApp.getUi().alert('Daily report email turned on! It will be sent every day at ~7 PM to ' + reportRecipients_() + '.'); } catch (e) {}
}

function disableDailyReportEmail() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDailyReport') ScriptApp.deleteTrigger(t);
  });
}

function reportRecipients_() {
  return PropertiesService.getScriptProperties().getProperty('REPORT_EMAILS') || REPORT_EMAIL_DEFAULT;
}

function sendDailyReport() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SHEET_REPORT);
  if (!sh) throw new Error('"' + SHEET_REPORT + '" tab not found');
  SpreadsheetApp.flush();
  var day = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'EEE, dd MMM yyyy');
  var blocks = [
    ['A4:C9', 3], ['A11:C17', 3], ['A19:B24', 2], ['A26:I37', 9],
    ['A40:F55', 6, '5) Tomorrow\'s Follow-ups'], ['A58:F73', 6, '6) Overdue follow-ups'], ['A76:F91', 6, '7) Open Leads Without a Follow-up Date']
  ];
  var html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">' +
    '<h2 style="margin:0 0 4px">Daily Report - ' + day + '</h2>' +
    '<p style="margin:0 0 12px;color:#666">Vassa Properties CRM (auto-generated from Google Sheet)</p>';
  blocks.forEach(function (b) { html += rangeToHtml_(sh.getRange(b[0]).getDisplayValues(), b[2]); });
  html += '<p style="color:#888;font-size:12px">Full report: <a href="' + ss.getUrl() + '">Open the CRM Sheet</a></p></div>';
  MailApp.sendEmail({ to: reportRecipients_(), subject: 'CRM Daily Report - ' + day, htmlBody: html });
}

function rangeToHtml_(vals, title) {
  var rows = vals.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  if (!rows.length) return '';
  var out = title ? '<h3 style="margin:16px 0 6px">' + esc_(title) + '</h3>' : '';
  out += '<table cellpadding="6" style="border-collapse:collapse;margin:0 0 14px;min-width:320px">';
  rows.forEach(function (r, i) {
    var isHead = i === 0;
    out += '<tr>' + r.map(function (c) {
      var st = 'border:1px solid #ddd;' + (isHead ? 'background:#1f3b6e;color:#fff;font-weight:bold;' : '');
      return '<td style="' + st + '">' + esc_(c) + '</td>';
    }).join('') + '</tr>';
  });
  return out + '</table>';
}

function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }


// =====================================================================
// ===== v4: App GUI (Index.html v3) ke liye naye server functions
// =====================================================================
var SETTINGS_KEY = 'CRM_SETTINGS';
var LOG_DAYS_FOR_GUI = 120;
var DEFAULT_TEMPLATES = [
  { id: 'assigned', name: 'Lead Assigned (to Sales Executive)', to: 'exec', isDefault: true,
    text: 'Hello {exec}, a new lead has been assigned to you.\nLead ID: {lead_id}\nName: {name}\nPhone: {phone}\nProject: {project}\nSource: {source}\nPlease call the customer within 30 minutes.' },
  { id: 'reminder', name: 'Follow-up Reminder (to Sales Executive)', to: 'exec', isDefault: true,
    text: 'Hello {exec}, this is a reminder that the follow-up for lead {lead_id} - {name} ({phone}) is due on {followup}.\nProject: {project}\nPlease call the customer and update the CRM.' },
  { id: 'welcome', name: 'Welcome (to Customer)', to: 'customer', isDefault: true,
    text: 'Dear {name}, welcome to {company}! Thank you for your enquiry about {project}. Our sales executive {exec} will contact you shortly. Thank you.' }
];

// ISO time IST mein (Asia/Kolkata mein DST nahi, isliye +05:30 fixed)
function iso_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss") + '+05:30';
  return v === null || v === undefined ? '' : String(v);
}

function leadObj_(o) {
  var out = {};
  Object.keys(H).forEach(function (k) {
    var val = o[k];
    if (k === 'date' || k === 'assignedAt' || k === 'updated') out[k] = iso_(val);
    else out[k] = fmt_(val, false);
  });
  return out;
}

function readSavedSettings_() {
  var raw = PropertiesService.getScriptProperties().getProperty(SETTINGS_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
}

// Saved settings + defaults (defaults ke templates hamesha list mein rahenge)
function getSettings_() {
  var s = readSavedSettings_();
  var saved = s.templates || [], out = [];
  DEFAULT_TEMPLATES.forEach(function (d) {
    var m = null;
    saved.forEach(function (t) { if (t && t.id === d.id) m = t; });
    out.push({ id: d.id, name: d.name, to: d.to, isDefault: true, text: m && String(m.text || '').trim() ? String(m.text) : d.text });
  });
  saved.forEach(function (t) {
    if (t && t.id && !DEFAULT_TEMPLATES.some(function (d) { return d.id === t.id; })) {
      out.push({ id: String(t.id), name: String(t.name || 'Custom'), to: t.to === 'exec' ? 'exec' : 'customer', isDefault: false, text: String(t.text || '') });
    }
  });
  return {
    company: String(s.company || ''),
    bossPhone: String(s.bossPhone || ''),
    adSpend: s.adSpend && typeof s.adSpend === 'object' ? s.adSpend : {},
    templates: out
  };
}

function templateVars_(row, company) {
  return {
    exec: row.exec || '', lead_id: row.id || '', name: row.name || '', phone: row.phone || '',
    project: row.project || '-', source: row.source || '-', followup: fmt_(row.followup, false) || '-',
    company: company || ''
  };
}

function fillTemplate_(text, vars) {
  return String(text || '').replace(/\{(\w+)\}/g, function (m, k) {
    return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k] === null || vars[k] === undefined ? '' : vars[k]) : m;
  });
}

function uiGetSettings() {
  return { settings: getSettings_(), defaults: DEFAULT_TEMPLATES };
}

// s: {company, bossPhone, adSpend: {'yyyy-MM': {Instagram: n, 'Facebook/Meta': n, Other: n}}, templates: [{id,name,to,text}]}
function uiSaveSettings(s) {
  s = s || {};
  var cur = getSettings_();
  var boss = s.bossPhone !== undefined ? String(s.bossPhone).replace(/\D/g, '') : cur.bossPhone;
  if (boss.length === 12 && boss.indexOf('91') === 0) boss = boss.slice(2);
  if (boss && boss.length !== 10) throw new Error('The boss\'s number must be 10 digits');
  var tpls = s.templates !== undefined ? s.templates : cur.templates;
  var clean = [];
  (tpls || []).forEach(function (t) {
    if (!t || !t.id) return;
    var def = DEFAULT_TEMPLATES.filter(function (d) { return d.id === t.id; })[0];
    clean.push({ id: String(t.id).slice(0, 40), name: def ? def.name : String(t.name || '').slice(0, 80), to: def ? def.to : (t.to === 'exec' ? 'exec' : 'customer'), text: String(t.text || '').slice(0, 1500) });
    if (def && !String(t.text || '').trim()) throw new Error('A default template cannot be empty (tap Reset default)');
  });
  var ad = s.adSpend !== undefined ? s.adSpend : cur.adSpend, adClean = {};
  Object.keys(ad || {}).forEach(function (m) {
    if (!/^\d{4}-\d{2}$/.test(m)) return;
    adClean[m] = {};
    Object.keys(ad[m] || {}).forEach(function (k) { var n = Number(ad[m][k]); if (n > 0) adClean[m][String(k).slice(0, 30)] = n; });
  });
  var obj = { company: String(s.company !== undefined ? s.company : cur.company).slice(0, 100), bossPhone: boss, adSpend: adClean, templates: clean };
  var json = JSON.stringify(obj);
  if (json.length > 8500) throw new Error('Settings are too large (please shorten the templates)');
  PropertiesService.getScriptProperties().setProperty(SETTINGS_KEY, json);
  return uiGetSettings();
}

// Activity Log ki last N din ki rows (neeche se upar dhoondh kar sirf zaroori range padhte hain)
function recentLog_(days) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LOG), last = sh.getLastRow();
  if (last < 2) return [];
  var cutoff = Date.now() - days * 86400000;
  var ts = sh.getRange(2, 1, last - 1, 1).getValues(), start = ts.length;
  for (var i = ts.length - 1; i >= 0; i--) {
    var t = ts[i][0];
    if (t instanceof Date && t.getTime() < cutoff) break;
    start = i;
  }
  if (start >= ts.length) return [];
  return sh.getRange(start + 2, 1, ts.length - start, 7).getValues().map(function (v) {
    return { at: iso_(v[0]), id: String(v[1]), type: String(v[2]), from: lv_(v[3]), to: lv_(v[4]), by: String(v[5]), note: String(v[6]) };
  });
}

// Ek hi call mein poora app data
function uiGetAll() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LEADS), cols = headerMap_(sh), last = sh.getLastRow();
  var leads = [];
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues().forEach(function (v) {
      var o = {};
      Object.keys(H).forEach(function (k) { o[k] = cols[H[k]] ? v[cols[H[k]] - 1] : ''; });
      if (!o.id) return;
      leads.push(leadObj_(o));
    });
  }
  leads.reverse(); // naye upar
  var st = uiGetSettings();
  return {
    leads: leads, executives: uiGetExecutives(), log: recentLog_(LOG_DAYS_FOR_GUI),
    settings: st.settings, defaults: st.defaults, statuses: STATUSES, lostReasons: LOST_REASONS,
    followupRequired: FOLLOWUP_REQUIRED, staleMinutes: STALE_MINUTES, me: me_(), now: iso_(new Date())
  };
}

// Executive hatao - sirf tab jab uske paas koi open lead (Closed/Lost ke alawa) na ho
function uiDeleteExecutive(row) {
  row = Number(row);
  if (!row || row < 2) throw new Error('Invalid row');
  var lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    var ex = SpreadsheetApp.getActive().getSheetByName(SHEET_EXEC);
    var name = String(ex.getRange(row, 1).getValue()).trim();
    if (!name) throw new Error('Sales executive not found');
    var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LEADS), cols = headerMap_(sh), last = sh.getLastRow(), open = 0;
    if (last >= 2) {
      sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues().forEach(function (v) {
        var e = String(v[cols[H.exec] - 1]).trim(), s = String(v[cols[H.status] - 1]);
        if (e.toLowerCase() === name.toLowerCase() && s !== 'Closed' && s !== 'Lost') open++;
      });
    }
    if (open) throw new Error(name + ' has ' + open + ' open lead(s). Reassign them to another sales executive first, or set Active = No.');
    ex.getRange(row, 1, 1, 4).clearContent(); // row khaali; uiSaveExecutive agla naya exec yahin bharega
  } finally { lock.releaseLock(); }
  return uiGetExecutives();
}
