/* Local preview mock for VassaCRM Index.html
 * Sirf testing ke liye - google.script.run ko fake karta hai taaki UI bina
 * Apps Script deployment ke chal sake. Isse live sheet/deployment chhua nahi jata.
 */
(function () {
  'use strict';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function iso(d) {
    return ymd(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00+05:30';
  }
  function addDays(n) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  function ago(min) { return iso(new Date(Date.now() - min * 60000)); }

  var ST = ['New', 'Assigned', 'Contacted', 'Site Visit', 'Negotiation', 'Closed', 'Lost'];

  var LEADS = [
    { id: 'L-0001', date: ago(3000), name: 'ROHIT SHARMA', phone: '919812345670', source: 'INSTAGRAM', project: 'VASSA HEIGHTS 2BHK', exec: 'AMIT', status: 'Contacted', lost: '', followup: addDays(-2), notes: 'WANTS EAST FACING', wa: '', assignedAt: ago(2900), updated: ago(300) },
    { id: 'L-0002', date: ago(2800), name: 'PRIYA NAIR', phone: '919812345671', source: 'FACEBOOK/META', project: 'VASSA GREENS 3BHK', exec: 'SNEHA', status: 'Site Visit', lost: '', followup: addDays(0), notes: 'COMING WITH HUSBAND', wa: '', assignedAt: ago(2700), updated: ago(120) },
    { id: 'L-0003', date: ago(2600), name: 'IMRAN QURESHI', phone: '919812345672', source: 'WALK-IN', project: 'VASSA ENCLAVE PLOT', exec: 'AMIT', status: 'New', lost: '', followup: addDays(0), notes: '', wa: '', assignedAt: '', updated: ago(2600) },
    { id: 'L-0004', date: ago(2000), name: 'KAVITA DESHMUKH', phone: '919812345673', source: 'INSTAGRAM', project: 'VASSA HEIGHTS 3BHK', exec: '', status: 'New', lost: '', followup: '', notes: 'CALLED TWICE, NO ANSWER', wa: '', assignedAt: '', updated: ago(1900) },
    { id: 'L-0005', date: ago(1500), name: 'SANJAY PATIL', phone: '919812345674', source: 'FACEBOOK/META', project: 'VASSA GREENS 2BHK', exec: 'SNEHA', status: 'Negotiation', lost: '', followup: addDays(1), notes: 'ASKING 5% DISCOUNT', wa: '', assignedAt: ago(1400), updated: ago(90) },
    { id: 'L-0006', date: ago(1200), name: 'MEERA JOSHI', phone: '919812345675', source: 'REFERRAL', project: 'VASSA ENCLAVE PLOT', exec: 'RAVI', status: 'Closed', lost: '', followup: '', notes: 'BOOKED A-12', wa: '', assignedAt: ago(1100), updated: ago(500) },
    { id: 'L-0007', date: ago(900), name: 'ANIL KUMAR', phone: '919812345676', source: 'INSTAGRAM', project: 'VASSA HEIGHTS 2BHK', exec: 'RAVI', status: 'Lost', lost: 'BUDGET ISSUE', followup: '', notes: '', wa: '', assignedAt: ago(800), updated: ago(400) },
    { id: 'L-0008', date: ago(600), name: 'FATIMA SHEIKH', phone: '919812345677', source: 'FACEBOOK/META', project: 'VASSA GREENS 3BHK', exec: 'AMIT', status: 'Assigned', lost: '', followup: addDays(3), notes: 'PREFERS WEEKEND CALL', wa: '', assignedAt: ago(200), updated: ago(200) },
    { id: 'L-0009', date: ago(300), name: 'VIKRAM RATHOD', phone: '919812345678', source: 'INSTAGRAM', project: 'VASSA HEIGHTS 3BHK', exec: 'SNEHA', status: 'Contacted', lost: '', followup: addDays(7), notes: 'LOAN PRE-APPROVED', wa: '', assignedAt: ago(280), updated: ago(60) },
    { id: 'L-0010', date: ago(60), name: 'NEHA BHATT', phone: '919812345679', source: 'WALK-IN', project: 'VASSA ENCLAVE PLOT', exec: '', status: 'New', lost: '', followup: addDays(2), notes: '', wa: '', assignedAt: '', updated: ago(60) }
  ];

  var EXECS = [
    { row: 2, name: 'AMIT', phone: '919876500001', active: 'Yes', notes: 'INSTAGRAM LEADS', sites: ['VASSA HEIGHTS', 'VASSA ENCLAVE'] },
    { row: 3, name: 'SNEHA', phone: '919876500002', active: 'Yes', notes: '', sites: ['VASSA GREENS'] },
    { row: 4, name: 'RAVI', phone: '919876500003', active: 'No', notes: 'ON LEAVE', sites: [] }
  ];

  var SITES = [
    { row: 2, name: 'VASSA HEIGHTS', notes: 'BANER · TOWER A/B' },
    { row: 3, name: 'VASSA GREENS', notes: 'WAKAD · 2 & 3 BHK' },
    { row: 4, name: 'VASSA ENCLAVE', notes: 'PLOTS' }
  ];

  var LOG = [
    { at: ago(20), id: 'L-0010', type: 'Created', from: '', to: 'New', by: 'PREVIEW@LOCAL', note: 'SOURCE: WALK-IN' },
    { at: ago(90), id: 'L-0005', type: 'Status', from: 'Contacted', to: 'Negotiation', by: 'SNEHA', note: '' },
    { at: ago(200), id: 'L-0008', type: 'Assigned', from: 'New', to: 'Assigned', by: 'PREVIEW@LOCAL', note: 'ASSIGNED TO AMIT' },
    { at: ago(400), id: 'L-0007', type: 'Status', from: 'Contacted', to: 'Lost', by: 'RAVI', note: 'BUDGET ISSUE' },
    { at: ago(500), id: 'L-0006', type: 'Status', from: 'Negotiation', to: 'Closed', by: 'RAVI', note: 'BOOKED A-12' }
  ];

  var DEFAULT_TPL = [
    { id: 'assigned', name: 'Lead Assigned (to Sales Executive)', to: 'exec', isDefault: true, text: 'Hello {exec}, a new lead has been assigned to you.\nLead ID: {lead_id}\nName: {name}\nPhone: {phone}\nProject: {project}\nSource: {source}\nPlease call the customer within 30 minutes.' },
    { id: 'reminder', name: 'Follow-up Reminder (to Sales Executive)', to: 'exec', isDefault: true, text: 'Hello {exec}, this is a reminder that the follow-up for lead {lead_id} - {name} ({phone}) is due on {followup}.\nProject: {project}\nPlease call the customer and update the CRM.' },
    { id: 'welcome', name: 'Welcome (to Customer)', to: 'customer', isDefault: true, text: 'Dear {name}, welcome to {company}! Thank you for your enquiry about {project}. Our sales executive {exec} will contact you shortly. Thank you.' }
  ];

  var SETTINGS = {
    company: 'VASSA PROPERTIES',
    bossPhone: '9876543210',
    adSpend: (function () {
      var d = new Date(), m = d.getFullYear() + '-' + pad(d.getMonth() + 1);
      var o = {}; o[m] = { Instagram: 45000, 'Facebook/Meta': 30000, Other: 8000 };
      return o;
    })(),
    templates: JSON.parse(JSON.stringify(DEFAULT_TPL))
  };

  function snapshot() {
    return {
      leads: JSON.parse(JSON.stringify(LEADS)),
      executives: JSON.parse(JSON.stringify(EXECS.filter(function (e) { return e.name; }))),
      sites: JSON.parse(JSON.stringify(SITES)),
      log: JSON.parse(JSON.stringify(LOG)),
      settings: JSON.parse(JSON.stringify(SETTINGS)),
      defaults: JSON.parse(JSON.stringify(DEFAULT_TPL)),
      statuses: ST.slice(),
      lostReasons: ['Budget issue', 'Location not suitable', 'Bought elsewhere', 'Not interested', 'Not reachable', 'Fake / wrong number', 'Other'],
      followupRequired: ['Contacted', 'Site Visit', 'Negotiation'],
      staleMinutes: 30,
      me: 'preview@local',
      now: iso(new Date())
    };
  }

  function find(id) {
    for (var i = 0; i < LEADS.length; i++) if (LEADS[i].id === id) return LEADS[i];
    return null;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function waLink(phone, text) {
    return 'https://wa.me/' + String(phone || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text || '');
  }

  var API = {
    uiGetAll: function () { return snapshot(); },

    uiGetSettings: function () { return { settings: clone(SETTINGS), defaults: clone(DEFAULT_TPL) }; },

    uiSaveSettings: function (s) {
      s = s || {};
      if (s.company !== undefined) SETTINGS.company = String(s.company).toUpperCase();
      if (s.bossPhone !== undefined) SETTINGS.bossPhone = String(s.bossPhone).replace(/\D/g, '').slice(-10);
      if (s.adSpend !== undefined) SETTINGS.adSpend = s.adSpend;
      if (s.templates !== undefined) SETTINGS.templates = s.templates;
      return { settings: clone(SETTINGS), defaults: clone(DEFAULT_TPL) };
    },

    uiGetExecutives: function () { return clone(EXECS.filter(function (e) { return e.name; })); },

    uiSaveExecutive: function (ex) {
      ex = ex || {};
      if (!ex.name) throw new Error('Name is required');
      var phone = String(ex.phone || '').replace(/\D/g, '');
      if (phone.length === 10) phone = '91' + phone;
      if (!/^91\d{10}$/.test(phone)) throw new Error('WhatsApp number must be 10 digits (91 is added automatically)');
      var sites = (ex.sites || []).slice();
      if (ex.row) {
        for (var i = 0; i < EXECS.length; i++) if (EXECS[i].row === Number(ex.row)) {
          var oldName = EXECS[i].name;
          EXECS[i].name = String(ex.name).toUpperCase(); EXECS[i].phone = phone;
          EXECS[i].active = ex.active === 'No' ? 'No' : 'Yes'; EXECS[i].notes = String(ex.notes || '').toUpperCase();
          EXECS[i].sites = sites.map(function (s) { return String(s).toUpperCase(); });
          if (oldName !== ex.name) LEADS.forEach(function (l) { if (l.exec === oldName) l.exec = String(ex.name).toUpperCase(); });
        }
      } else {
        EXECS.push({ row: EXECS.length + 2, name: String(ex.name).toUpperCase(), phone: phone, active: ex.active === 'No' ? 'No' : 'Yes', notes: String(ex.notes || '').toUpperCase(), sites: sites.map(function (s) { return String(s).toUpperCase(); }) });
      }
      return clone(EXECS.filter(function (e) { return e.name; }));
    },

    uiDeleteExecutive: function (row) {
      for (var i = 0; i < EXECS.length; i++) if (EXECS[i].row === Number(row)) { EXECS.splice(i, 1); break; }
      return clone(EXECS.filter(function (e) { return e.name; }));
    },

    uiGetSites: function () { return clone(SITES); },

    uiSaveSite: function (site) {
      site = site || {};
      var name = String(site.name || '').trim().toUpperCase();
      if (!name) throw new Error('Project site name is required');
      var old = '', row = Number(site.row) || 0;
      if (row) {
        for (var i = 0; i < SITES.length; i++) if (SITES[i].row === row) { old = SITES[i].name; SITES[i].name = name; SITES[i].notes = String(site.notes || '').toUpperCase(); }
      } else {
        SITES.push({ row: SITES.length + 2, name: name, notes: String(site.notes || '').toUpperCase() });
      }
      if (old && old !== name) {
        EXECS.forEach(function (e) {
          e.sites = (e.sites || []).map(function (s) { return s === old ? name : s; });
        });
      }
      return { sites: clone(SITES), executives: clone(EXECS.filter(function (e) { return e.name; })) };
    },

    uiDeleteSite: function (row) {
      for (var i = 0; i < SITES.length; i++) if (SITES[i].row === Number(row)) { SITES.splice(i, 1); break; }
      return { sites: clone(SITES), executives: clone(EXECS.filter(function (e) { return e.name; })) };
    },

    uiUpdateLead: function (id, ch) {
      var l = find(id);
      if (!l) throw new Error('Lead not found: ' + id);
      Object.keys(ch || {}).forEach(function (k) {
        if (k === 'note') l.notes = (l.notes ? l.notes + '\n' : '') + String(ch[k]).toUpperCase();
        else if (k === 'exec') l.exec = String(ch[k] || '').toUpperCase();
        else if (l[k] !== undefined) l[k] = ch[k];
      });
      l.updated = iso(new Date());
      LOG.push({ at: l.updated, id: id, type: 'Update', from: '', to: l.status, by: 'preview@local', note: JSON.stringify(ch || {}) });
      return { lead: clone(l), waLink: ch && ch.exec ? waLink(findExec(l.exec), 'Lead ' + id) : '' };
    },

    uiAddLead: function (d) {
      d = d || {};
      var digits = String(d.phone || '').replace(/\D/g, '');
      for (var i = 0; i < LEADS.length; i++) {
        if (digits && String(LEADS[i].phone).slice(-10) === digits.slice(-10)) {
          return { ok: true, duplicate: true, lead_id: LEADS[i].id };
        }
      }
      // backend jaisa site-wise auto-assign: exec manually na chuna ho to project se site match
      var auto = d.exec ? null : execForSite(d.project);
      var exec = d.exec || (auto ? auto.name : '');
      var n = LEADS.length + 1, id = 'L-' + ('0000' + n).slice(-4);
      LEADS.push({
        id: id, date: iso(new Date()), name: String(d.name || '').toUpperCase(), phone: digits ? '91' + digits.slice(-10) : '',
        source: String(d.source || '').toUpperCase(), project: String(d.project || '').toUpperCase(), exec: String(exec || '').toUpperCase(), status: exec ? 'Assigned' : 'New',
        lost: '', followup: '', notes: String(d.notes || '').toUpperCase(), wa: '', assignedAt: exec ? iso(new Date()) : '', updated: iso(new Date())
      });
      return { ok: true, duplicate: false, lead_id: id, exec: String(exec || '').toUpperCase(), site: auto ? auto.site.toUpperCase() : '', waLink: exec ? waLink(findExec(exec), 'Lead ' + id) : '' };
    },

    uiGetHistory: function (id) {
      return clone(LOG.filter(function (x) { return x.id === id; }));
    },

    uiGetRecentActivity: function () { return clone(LOG); },

    uiGetData: function () { return snapshot(); }
  };

  function findExec(name) {
    for (var i = 0; i < EXECS.length; i++) if (EXECS[i].name === name) return EXECS[i].phone;
    return '';
  }

  // backend matchSite_ + execsForSite_ ka hi logic (exact, warna sabse lamba partial match)
  function matchSite(project) {
    var text = String(project || '').trim().toLowerCase();
    if (!text) return null;
    for (var i = 0; i < SITES.length; i++) if (SITES[i].name.toLowerCase() === text) return SITES[i];
    var best = null;
    SITES.forEach(function (s) {
      var n = s.name.toLowerCase();
      if (n && text.indexOf(n) > -1 && (!best || n.length > best.name.toLowerCase().length)) best = s;
    });
    return best;
  }
  function execForSite(project) {
    var m = matchSite(project);
    if (!m) return null;
    for (var i = 0; i < EXECS.length; i++) {
      var e = EXECS[i];
      if (e.active === 'No' || !e.name) continue;
      if ((e.sites || []).some(function (s) { return s.toLowerCase() === m.name.toLowerCase(); })) return { name: e.name, site: m.name };
    }
    return null;
  }

  function runner() {
    var okFn = null, failFn = null;
    var r = {
      withSuccessHandler: function (f) { okFn = f; return r; },
      withFailureHandler: function (f) { failFn = f; return r; }
    };
    Object.keys(API).forEach(function (name) {
      r[name] = function () {
        var args = Array.prototype.slice.call(arguments);
        var ok = okFn, fail = failFn;
        okFn = null; failFn = null;
        setTimeout(function () {
          try {
            var res = API[name].apply(null, args);
            if (ok) ok(res);
          } catch (e) {
            if (fail) fail(e); else console.error('[mock] ' + name + ' failed', e);
          }
        }, 60);
        return r;
      };
    });
    return r;
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = runner();
  window.google.script.host = { close: function () {} };
  console.log('[mock] google.script.run ready — ' + Object.keys(API).length + ' functions');
})();
