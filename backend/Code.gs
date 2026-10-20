/**
 * 課堂同步後端（Google Apps Script）
 * 服務：課堂即時問答（qa/）、裝甲該裝在哪裡？投票、最後一張優惠券班級模式。
 *
 * 用法：在一份 Google 試算表裡開啟「擴充功能 → Apps Script」，把這個檔案的
 * 全部內容貼上，然後「部署 → 新增部署作業 → 網頁應用程式」：
 *   執行身分：我
 *   誰可以存取：所有人
 * 部署後得到的網址（結尾是 /exec）填進網站的 assets/class-sync.js。
 *
 * 這支程式會自動在試算表裡建立這些分頁：
 *   各組提交：最後一張優惠券，每一組每一季一列（重複送出會覆蓋同一列）
 *   放行　　：最後一張優惠券，每個班級目前開放到第幾階段
 *   投票　　：課堂問答與其他活動的回答，每人（或每組）每題一列
 *   問答發布：每個班級目前發布的題目
 *   題庫　　：教師存下來的題目（所有班級共用）
 *   設定　　：教師密碼（第一次登入教師頁時輸入的密碼；之後可以直接在這裡改）
 *
 * 更新程式碼後，要到「部署 → 管理部署作業 → 編輯（鉛筆）→ 版本：新版本 → 部署」，
 * 網址不會變。
 *
 * 階段代號：1 = 第一季、2 = 第二季、3 = 第三季、4 = 第四季、5 = 結算。
 *
 * 下面這一行讓授權範圍只限於這一份試算表，而不是您帳號裡的所有試算表。
 * @OnlyCurrentDoc
 */

var VERSION = 3;
var TAB_SUB = '各組提交';
var TAB_GATE = '放行';
var TAB_CFG = '設定';
var SUB_HEAD = ['時間', '班級', '隊名', '裝置代碼', '階段', '決定', '理由／回答', '本季利潤', '累計利潤', '活躍會員', '顧客資產', '品牌信任', '決策代碼', '語言', '索引鍵'];
var GATE_HEAD = ['班級', '已開放到（1–5）', '更新時間'];
var CFG_HEAD = ['項目', '內容', '說明'];
var STAGES = ['q1', 'q2', 'q3', 'q4', 'end'];
var KEY_COL = 15;
var TAB_VOTE = '投票';
var VOTE_HEAD = ['時間', '班級', '活動', '組名', '裝置代碼', '題目', '選擇', '語言', '索引鍵'];
var VOTE_KEY_COL = 9;
var TAB_LIVE = '問答發布';
var LIVE_HEAD = ['班級', '目前題目（JSON）', '更新時間'];
var TAB_BANK = '題庫';
var BANK_HEAD = ['編號', '題型', '題目', '內容（JSON）', '更新時間'];
var QTYPES = ['single', 'multi', 'text', 'words', 'scale'];

function doGet(e) { return handle_((e && e.parameter) || {}); }

function doPost(e) {
  var p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { p = {}; }
  return handle_(p);
}

function handle_(p) {
  try {
    var a = String(p.action || 'ping');
    if (a === 'ping') return out_({ ok: true, v: VERSION });
    if (a === 'bank' || a === 'saveq' || a === 'delq') {
      if (!keyOk_(p.key)) return out_({ ok: false, error: 'bad key' });
      if (a === 'saveq') saveQ_(p.item);
      if (a === 'delq') delQ_(p.id);
      return out_({ ok: true, items: bank_() });
    }
    var cls = cls_(p.cls);
    if (!cls) return out_({ ok: false, error: 'no class' });
    if (a === 'gate') return out_({ ok: true, open: getGate_(cls) });
    if (a === 'vote') return out_(vote_(cls, p));
    if (a === 'live') return out_({ ok: true, q: getLive_(cls) });
    if (a === 'publish') {
      if (!keyOk_(p.key)) return out_({ ok: false, error: 'bad key' });
      return out_({ ok: true, q: setLive_(cls, p.q) });
    }
    if (a === 'votes') {
      if (!keyOk_(p.key)) return out_({ ok: false, error: 'bad key' });
      return out_(votes_(cls, p));
    }
    if (a === 'submit') return out_(submit_(cls, p));
    if (a === 'board' || a === 'open') {
      if (!keyOk_(p.key)) return out_({ ok: false, error: 'bad key' });
      if (a === 'open') setGate_(cls, p.open);
      return out_(board_(cls));
    }
    return out_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 工具 ---------- */
function book_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function tab_(name, head) {
  var sh = book_().getSheetByName(name);
  if (!sh) {
    sh = book_().insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]);
    sh.setFrozenRows(1);
  }
  return sh;
}

// 班級代碼：只留英數字、底線與連字號，轉大寫，最多 20 字
function cls_(v) { return String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20); }

// 文字欄位：截斷長度；開頭是 = + - @ 時加上單引號，避免被試算表當成公式
function text_(v, n) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function num_(v) { var n = Number(v); return isFinite(n) ? Math.round(n) : ''; }

// 還沒有密碼時，第一次登入教師頁所輸入的密碼（至少 4 個字元）就成為教師密碼
function keyOk_(given) {
  given = String(given == null ? '' : given).trim();
  var sh = tab_(TAB_CFG, CFG_HEAD);
  var k = String(sh.getRange(2, 2).getValue() || '').trim();
  if (!k) {
    if (given.length < 4) return false;
    sh.getRange(2, 1, 1, 3).setValues([['教師密碼', given, '第一次登入教師頁時設定的密碼。可以直接改成新的，改完在教師頁用新密碼登入。']]);
    return true;
  }
  return given === k;
}

/* ---------- 放行 ---------- */
function getGate_(cls) {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('g:' + cls);
  if (hit) return Number(hit);
  var sh = tab_(TAB_GATE, GATE_HEAD), last = sh.getLastRow(), open = 1;
  if (last > 1) {
    var rows = sh.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) if (String(rows[i][0]) === cls) { open = clampGate_(rows[i][1]); break; }
  }
  cache.put('g:' + cls, String(open), 600);
  return open;
}

function clampGate_(v) { var n = Math.round(Number(v)); return isFinite(n) ? Math.max(1, Math.min(5, n)) : 1; }

function setGate_(cls, v) {
  var open = clampGate_(v);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = tab_(TAB_GATE, GATE_HEAD), last = sh.getLastRow(), row = last + 1;
    if (last > 1) {
      var rows = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < rows.length; i++) if (String(rows[i][0]) === cls) { row = i + 2; break; }
    }
    sh.getRange(row, 1, 1, 3).setValues([[cls, open, new Date()]]);
    CacheService.getScriptCache().put('g:' + cls, String(open), 600);
  } finally {
    lock.releaseLock();
  }
  return open;
}

/* ---------- 各組提交 ---------- */
function submit_(cls, p) {
  var stage = String(p.stage || '');
  if (STAGES.indexOf(stage) < 0) return { ok: false, error: 'bad stage' };
  var tid = String(p.tid || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
  if (!tid) return { ok: false, error: 'no team id' };
  var key = cls + '|' + tid + '|' + stage;
  var values = [[
    new Date(), cls, text_(p.team, 40), tid, stage, text_(p.text, 400), text_(p.why, 400),
    num_(p.pq), num_(p.pc), num_(p.active), num_(p.equity), num_(p.trust),
    text_(p.d, 600), text_(p.lang, 5), key
  ]];
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = tab_(TAB_SUB, SUB_HEAD), last = sh.getLastRow(), row = last + 1;
    if (last > 1) {
      var keys = sh.getRange(2, KEY_COL, last - 1, 1).getValues();
      for (var i = 0; i < keys.length; i++) if (String(keys[i][0]) === key) { row = i + 2; break; }
    }
    sh.getRange(row, 1, 1, values[0].length).setValues(values);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, open: getGate_(cls) };
}

/* ---------- 教師看板 ---------- */
function board_(cls) {
  var sh = tab_(TAB_SUB, SUB_HEAD), last = sh.getLastRow(), rows = [];
  if (last > 1) {
    var v = sh.getRange(2, 1, last - 1, SUB_HEAD.length).getValues();
    for (var i = 0; i < v.length; i++) {
      var r = v[i];
      if (String(r[1]) !== cls) continue;
      rows.push({
        t: r[0] && r[0].getTime ? r[0].getTime() : 0,
        team: String(r[2]), tid: String(r[3]), stage: String(r[4]), text: String(r[5]), why: String(r[6]),
        pq: r[7], pc: r[8], active: r[9], equity: r[10], trust: r[11], lang: String(r[13])
      });
    }
  }
  return { ok: true, v: VERSION, cls: cls, open: getGate_(cls), rows: rows, now: new Date().getTime() };
}

/* ---------- 投票（其他課堂活動）---------- */
function act_(v) { return String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20); }

function vote_(cls, p) {
  var act = act_(p.act), q = act_(p.q);
  if (!act || !q) return { ok: false, error: 'no question' };
  var tid = String(p.tid || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
  if (!tid) return { ok: false, error: 'no team id' };
  var key = cls + '|' + act + '|' + tid + '|' + q;
  var values = [[new Date(), cls, act, text_(p.team, 40), tid, q, text_(p.v, 600), text_(p.lang, 5), key]];
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = tab_(TAB_VOTE, VOTE_HEAD), last = sh.getLastRow(), row = last + 1;
    if (last > 1) {
      var keys = sh.getRange(2, VOTE_KEY_COL, last - 1, 1).getValues();
      for (var i = 0; i < keys.length; i++) if (String(keys[i][0]) === key) { row = i + 2; break; }
    }
    sh.getRange(row, 1, 1, values[0].length).setValues(values);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

function votes_(cls, p) {
  var act = act_(p.act), sh = tab_(TAB_VOTE, VOTE_HEAD), last = sh.getLastRow(), rows = [];
  if (last > 1) {
    var v = sh.getRange(2, 1, last - 1, VOTE_HEAD.length).getValues();
    for (var i = 0; i < v.length; i++) {
      var r = v[i];
      if (String(r[1]) !== cls || (act && String(r[2]) !== act) || (p.q && String(r[5]) !== act_(p.q))) continue;
      rows.push({ t: r[0] && r[0].getTime ? r[0].getTime() : 0, team: String(r[3]), tid: String(r[4]), q: String(r[5]), v: String(r[6]), lang: String(r[7]) });
    }
  }
  return { ok: true, v: VERSION, cls: cls, rows: rows, now: new Date().getTime() };
}

/* ---------- 課堂即時問答：題目 ---------- */
function str_(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n); }
function cleanQ_(q) {
  if (typeof q === 'string') { try { q = JSON.parse(q); } catch (e) { q = null; } }
  if (!q || typeof q !== 'object') return null;
  var type = QTYPES.indexOf(String(q.type)) >= 0 ? String(q.type) : 'text';
  var opts = [];
  if (q.opts && q.opts.length) for (var i = 0; i < q.opts.length && opts.length < 8; i++) { var o = str_(q.opts[i], 120).trim(); if (o) opts.push(o); }
  return {
    id: act_(q.id) || 'adhoc', run: act_(q.run) || '', type: type, text: str_(q.text, 500), opts: opts,
    lo: str_(q.lo, 40), hi: str_(q.hi, 40), open: q.open !== false
  };
}
function getLive_(cls) {
  var cache = CacheService.getScriptCache(), hit = cache.get('live:' + cls);
  if (hit) return hit === 'null' ? null : JSON.parse(hit);
  var sh = tab_(TAB_LIVE, LIVE_HEAD), last = sh.getLastRow(), q = null;
  if (last > 1) {
    var rows = sh.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) if (String(rows[i][0]) === cls) { try { q = JSON.parse(String(rows[i][1])); } catch (e) { q = null; } break; }
  }
  cache.put('live:' + cls, q ? JSON.stringify(q) : 'null', 21600);
  return q;
}
function setLive_(cls, raw) {
  var q = cleanQ_(raw);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = tab_(TAB_LIVE, LIVE_HEAD), last = sh.getLastRow(), row = last + 1;
    if (last > 1) {
      var rows = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < rows.length; i++) if (String(rows[i][0]) === cls) { row = i + 2; break; }
    }
    sh.getRange(row, 1, 1, 3).setValues([[cls, q ? "'" + JSON.stringify(q) : '', new Date()]]);
    CacheService.getScriptCache().put('live:' + cls, q ? JSON.stringify(q) : 'null', 21600);
  } finally {
    lock.releaseLock();
  }
  return q;
}

/* ---------- 課堂即時問答：題庫 ---------- */
function bank_() {
  var sh = tab_(TAB_BANK, BANK_HEAD), last = sh.getLastRow(), items = [];
  if (last > 1) {
    var v = sh.getRange(2, 1, last - 1, 4).getValues();
    for (var i = 0; i < v.length; i++) {
      if (!String(v[i][0])) continue;
      var extra = {}; try { extra = JSON.parse(String(v[i][3])) || {}; } catch (e) { extra = {}; }
      items.push({ id: String(v[i][0]), type: String(v[i][1]), text: String(v[i][2]), opts: extra.opts || [], lo: extra.lo || '', hi: extra.hi || '' });
    }
  }
  return items;
}
function saveQ_(raw) {
  var q = cleanQ_(raw); if (!q || !q.text) return;
  if (!q.id || q.id === 'adhoc') q.id = 'q' + new Date().getTime().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = tab_(TAB_BANK, BANK_HEAD), last = sh.getLastRow(), row = last + 1;
    if (last > 1) {
      var ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === q.id) { row = i + 2; break; }
    }
    sh.getRange(row, 1, 1, 5).setValues([[q.id, q.type, text_(q.text, 500), "'" + JSON.stringify({ opts: q.opts, lo: q.lo, hi: q.hi }), new Date()]]);
  } finally {
    lock.releaseLock();
  }
}
function delQ_(id) {
  id = act_(id); if (!id) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = tab_(TAB_BANK, BANK_HEAD), last = sh.getLastRow();
    if (last > 1) {
      var ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) sh.deleteRow(i + 2);
    }
  } finally {
    lock.releaseLock();
  }
}
