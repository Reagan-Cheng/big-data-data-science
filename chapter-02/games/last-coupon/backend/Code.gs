/**
 * 最後一張優惠券｜課堂同步後端（Google Apps Script）
 *
 * 用法：在一份 Google 試算表裡開啟「擴充功能 → Apps Script」，把這個檔案的
 * 全部內容貼上，然後「部署 → 新增部署作業 → 網頁應用程式」：
 *   執行身分：我
 *   誰可以存取：所有人
 * 部署後得到的網址（結尾是 /exec）填進遊戲資料夾的 config.js。
 *
 * 這支程式會自動在試算表裡建立三個分頁：
 *   各組提交：每一組每一季一列（重複送出會覆蓋同一列）
 *   放行　　：每個班級目前開放到第幾階段
 *   設定　　：教師密碼（第一次執行時自動產生，可以直接改）
 *
 * 階段代號：1 = 第一季、2 = 第二季、3 = 第三季、4 = 第四季、5 = 結算。
 */

var VERSION = 1;
var TAB_SUB = '各組提交';
var TAB_GATE = '放行';
var TAB_CFG = '設定';
var SUB_HEAD = ['時間', '班級', '隊名', '裝置代碼', '階段', '決定', '理由／回答', '本季利潤', '累計利潤', '活躍會員', '顧客資產', '品牌信任', '決策代碼', '語言', '索引鍵'];
var GATE_HEAD = ['班級', '已開放到（1–5）', '更新時間'];
var CFG_HEAD = ['項目', '內容', '說明'];
var STAGES = ['q1', 'q2', 'q3', 'q4', 'end'];
var KEY_COL = 15;

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
    var cls = cls_(p.cls);
    if (!cls) return out_({ ok: false, error: 'no class' });
    if (a === 'gate') return out_({ ok: true, open: getGate_(cls) });
    if (a === 'submit') return out_(submit_(cls, p));
    if (a === 'board' || a === 'open') {
      if (String(p.key || '') !== teacherKey_()) return out_({ ok: false, error: 'bad key' });
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

function teacherKey_() {
  var sh = tab_(TAB_CFG, CFG_HEAD);
  var k = String(sh.getRange(2, 2).getValue() || '').trim();
  if (!k) {
    k = String(Math.floor(100000 + Math.random() * 900000));
    sh.getRange(2, 1, 1, 3).setValues([['教師密碼', k, '在教師頁輸入這組密碼。可以直接改成自己好記的。']]);
  }
  return k;
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
