let attachedImageData = null;
let attachedImageMimeType = null;
let _invFilter = 'all';

// ── AUDIO SETTINGS CACHE ──────────────────────────────────────
// Read mute prefs once at startup — avoids localStorage reads on every audio tick
const AudioSettings = {
  typing: localStorage.getItem('robco_sfx_muted') === 'true',
  hum: localStorage.getItem('robco_hum_muted') === 'true',
  geiger: localStorage.getItem('robco_geiger_muted') === 'true',
  tinnitus: localStorage.getItem('robco_tinnitus_muted') === 'true',
  ambient: localStorage.getItem('robco_ambient_muted') === 'true',
  wake: localStorage.getItem('robco_wake_muted') === 'true',
  panelClick: localStorage.getItem('robco_panelclick_muted') === 'true', // H1: rotary dial clicks
  bootDrone: localStorage.getItem('robco_bootdrone_muted') === 'true', // H4-bonus: boot drone
  levelUp: localStorage.getItem('robco_levelup_muted') === 'true', // H3: level up jingle
  heartbeat: localStorage.getItem('robco_heartbeat_muted') === 'true', // H4: low health heartbeat
  questComplete: localStorage.getItem('robco_questcomplete_muted') === 'true', // quest complete chime
  questFail: localStorage.getItem('robco_questfail_muted') === 'true', // quest fail tone
  factionThreshold: localStorage.getItem('robco_factionthreshold_muted') === 'true', // faction standing alert
  masterMute: localStorage.getItem('robco_master_muted') === 'true',
};

// ── GLOBAL ERROR NET ──────────────────────────────────────────
// Catches uncaught JS errors and unhandled promise rejections and surfaces a
// recoverable on-screen diagnostic instead of leaving the user with a blank screen.
window.addEventListener('error', ev => {
  const msg =
    (ev.message || 'Unknown error') + (ev.filename ? ` [${ev.filename}:${ev.lineno}]` : '');
  console.error('[RobCo] Uncaught error:', msg, ev.error);
  const diag = document.getElementById('chatDisplay');
  if (diag) {
    const el = document.createElement('div');
    el.className = 'msg-sys';
    el.textContent = `> ⚠ SYSTEM FAULT — ${msg} — save your data and reload.`;
    diag.appendChild(el);
  }
});
window.addEventListener('unhandledrejection', ev => {
  const reason =
    ev.reason instanceof Error ? ev.reason.message : String(ev.reason || 'Unhandled rejection');
  console.error('[RobCo] Unhandled rejection:', reason, ev.reason);
  const diag = document.getElementById('chatDisplay');
  if (diag) {
    const el = document.createElement('div');
    el.className = 'msg-sys';
    el.textContent = `> ⚠ ASYNC FAULT — ${reason} — save your data and reload.`;
    diag.appendChild(el);
  }
});

// ── CHANGE GUARDS (skip audio calls when nothing changed) ──────
let _lastRads = -1,
  _lastCrippled = false;

// ── CHAT HISTORY PERSISTENCE ───────────────────────────────────
let _chatSaveTimer = null;
const CHAT_MAX = 200; // max messages kept in memory; last 50 written to localStorage

window.onload = function () {
  // Snapshot current state as rolling backup before any boot migration (Protocol: Rolling Backups)
  if (typeof window.snapRollingBackup === 'function') window.snapRollingBackup();
  let v8Str = localStorage.getItem('robco_v8');
  let v7Str = localStorage.getItem('robco_v7');

  let loadedOk = false;
  if (v8Str) {
    try {
      window.robco_v8 = JSON.parse(v8Str);
      let activeCampaign = window.robco_v8.campaigns[window.robco_v8.activeContext] || {};
      state = { ...state, ...activeCampaign };
      state.gameContext = window.robco_v8.activeContext;
      loadedOk = true;
    } catch (e) {
      console.error('[RobCo] Corrupt robco_v8 — quarantined, booting fresh:', e);
      localStorage.removeItem('robco_v8');
    }
  }
  if (!loadedOk && v7Str) {
    try {
      let savedState = JSON.parse(v7Str);
      if (typeof migrateState === 'function')
        savedState = migrateState(savedState.version || '1.0', savedState);

      window.robco_v8 = {
        activeContext: savedState.gameContext || 'FNV',
        campaigns: {},
      };
      window.robco_v8.campaigns[window.robco_v8.activeContext] = savedState;
      localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));

      state = { ...state, ...savedState };
      state.gameContext = window.robco_v8.activeContext;
      loadedOk = true;
    } catch (e) {
      console.error('[RobCo] Corrupt robco_v7 — quarantined, booting fresh:', e);
      localStorage.removeItem('robco_v7');
    }
  }
  if (!loadedOk) {
    window.robco_v8 = {
      activeContext: 'FNV',
      campaigns: { FNV: state },
    };
    if (typeof migrateState === 'function') {
      window.robco_v8.campaigns['FNV'] = migrateState(
        APP_VERSION,
        window.robco_v8.campaigns['FNV']
      );
      state = { ...window.robco_v8.campaigns['FNV'] };
    }
  }
  // ── FACTION MIGRATION: old flat keys (nf/ni/lf/li/sf/si) → state.factions ──
  if (state.nf !== undefined) {
    if (!state.factions) state.factions = {};
    getFactionRegistry().forEach(f => {
      if (!state.factions[f.key]) state.factions[f.key] = { fame: 0, infamy: 0 };
    });
    state.factions.ncr.fame = state.nf || 0;
    state.factions.ncr.infamy = state.ni || 0;
    state.factions.legion.fame = state.lf || 0;
    state.factions.legion.infamy = state.li || 0;
    state.factions.house.fame = state.sf || 0; // sf/si → house (Mr. House)
    state.factions.house.infamy = state.si || 0;
    ['nf', 'ni', 'lf', 'li', 'sf', 'si', 'ncr', 'leg'].forEach(k => delete state[k]);
    localStorage.setItem('robco_v7', JSON.stringify(state));
  }
  // Ensure all 14 faction keys exist (handles older saves missing new factions)
  if (!state.factions) state.factions = _buildFactions();
  getFactionRegistry().forEach(f => {
    if (!state.factions[f.key]) state.factions[f.key] = { fame: 0, infamy: 0 };
  });

  if (localStorage.getItem('robco_gemini_key')) {
    document.getElementById('apiKeyInput').value = localStorage.getItem('robco_gemini_key');
  }
  if (localStorage.getItem('robco_gemini_key_sync') === 'true') {
    const syncEl = document.getElementById('geminiKeySyncToggle');
    if (syncEl) syncEl.checked = true;
  }
  if (localStorage.getItem('robco_gemini_model')) {
    let savedModel = localStorage.getItem('robco_gemini_model');
    document.getElementById('apiModelInput').innerHTML =
      `<option value="${savedModel}">${savedModel} (Secured)</option>`;
  }
  if (localStorage.getItem('robco_courier_id')) {
    let courierInput = document.getElementById('courierIdInput');
    if (courierInput) courierInput.value = localStorage.getItem('robco_courier_id');
  }

  try {
    if (localStorage.getItem('robco_chat')) {
      chatHistory = JSON.parse(localStorage.getItem('robco_chat'));
      document.getElementById('chatDisplay').innerHTML = '';
      chatHistory.forEach(msg => appendToChat(msg.text, msg.sender, true));
    } else {
      appendToChat('> SYSTEM INITIALIZED. DIAGNOSTIC CORE ACTIVE...', 'sys', true);
    }
  } catch (e) {
    chatHistory = [];
    localStorage.removeItem('robco_chat');
    appendToChat('> SYSTEM INITIALIZED. DIAGNOSTIC CORE ACTIVE...', 'sys', true);
  }
  loadUI();
  initTabs(); // Phase 4: restore active tab (defaults to 'stat' on first load)
  setupHpBarInteraction();
  setupXpBarInteraction(); // C11: XP bar click-drag (mirrors HP bar, within current level range)
  startCrtHum();
  initRegistryAutocomplete();
  initAmmoDatalist();

  // H1: Rotary Dial Click — fire on any <details> panel toggle inside uiPanel
  const _uiPanel = document.getElementById('uiPanel');
  if (_uiPanel) {
    _uiPanel.addEventListener('toggle', () => playPanelClick(), true);
  }

  // ── TAB STANDBY MODE ───────────────────────────────────────────
  // enterStandby/exitStandby are shared so blur+visibilitychange
  // can both fire without doubling the wake tone or log message.
  let _standbyActive = false;
  let _uptimeInterval = null;
  let _memCycleInterval = null;

  function enterStandby() {
    if (_standbyActive) return;
    _standbyActive = true;
    document.body.classList.add('standby');
    geigerRunning = false;
    if (geigerTimeout) {
      clearTimeout(geigerTimeout);
      geigerTimeout = null;
    }
    _geigerCurrentRate = -1;
    if (crtHumGain) {
      crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
      crtHumGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    }
    clearInterval(_uptimeInterval);
    _uptimeInterval = null;
    clearInterval(_memCycleInterval);
    _memCycleInterval = null;
    stopHeartbeat();
  }

  function exitStandby() {
    if (!_standbyActive) return;
    _standbyActive = false;
    playWakeTone();
    setTimeout(() => {
      document.body.classList.remove('standby');
      if (crtHumGain) {
        crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
        crtHumGain.gain.linearRampToValueAtTime(0.007, audioCtx.currentTime + 0.5);
      }
      appendToChat('> COURIER RETURNED. SYNCHRONIZING TELEMETRY...', 'sys', true);
      let _rads = parseInt(document.getElementById('stat_rads').value) || 0;
      setGeigerRate(_rads >= 1000 ? 25 : _rads >= 600 ? 12 : _rads >= 200 ? 0.33 : 0);
      if (!_uptimeInterval) {
        _uptimeInterval = setInterval(() => {
          let elapsed = Math.floor((Date.now() - sessionStart) / 1000);
          let h = Math.floor(elapsed / 3600),
            m = Math.floor((elapsed % 3600) / 60),
            s = elapsed % 60;
          let el = document.getElementById('uptimeClock');
          if (el)
            el.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }, 1000);
      }
      if (!_memCycleInterval) {
        _memCycleInterval = setInterval(() => {
          appendToChat('> MEMORY CYCLE COMPLETE. 64K STABLE.', 'sys', true);
          document.body.style.filter = 'brightness(0.35)';
          setTimeout(() => {
            document.body.style.filter = '';
          }, 150);
        }, 900000);
      }
      updateMath();
    }, 650);
  }

  // blur fires while the tab is still compositing — best chance to see the dim on tab-out
  window.addEventListener('blur', enterStandby);
  window.addEventListener('focus', exitStandby);
  // visibilitychange is the reliable fallback (keyboard tab-switch, mobile, etc.)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) enterStandby();
    else exitStandby();
  });

  // #35 Panel Memory — restore previously open/closed panel states
  // On desktop, default-open still applies if no saved state exists
  const savedPanelState = JSON.parse(localStorage.getItem('robco_panel_state') || 'null');
  const panelEls = Array.from(document.querySelectorAll('details.panel'));
  panelEls.forEach((d, idx) => {
    const id =
      d.id ||
      d
        .querySelector('h2')
        ?.innerText.trim()
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
    if (!id) return;
    d.dataset.panelId = id;
    d.dataset.panelIdx = idx; // numeric index for keyboard shortcuts
    if (savedPanelState && savedPanelState[id] !== undefined) {
      if (savedPanelState[id]) d.setAttribute('open', '');
      else d.removeAttribute('open');
    } else if (window.innerWidth >= 1000) {
      d.setAttribute('open', '');
    }
    d.addEventListener('toggle', () => {
      const ps = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
      ps[id] = d.open;
      localStorage.setItem('robco_panel_state', JSON.stringify(ps));
      if (d.id === 'worldMapPanel' && d.open && typeof renderWorldMap === 'function')
        renderWorldMap();
    });
  });

  if (localStorage.getItem('robco_optics')) {
    let color = localStorage.getItem('robco_optics');
    document.getElementById('opticsColorInput').value = color;
    changeOpticsColor(color);
  }

  if (localStorage.getItem('robco_sfx_muted') === 'true') {
    let el = document.getElementById('muteTypingToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_hum_muted') === 'true') {
    let el = document.getElementById('muteHumToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_geiger_muted') === 'true') {
    let el = document.getElementById('muteGeigerToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_tinnitus_muted') === 'true') {
    let el = document.getElementById('muteTinnitusToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_ambient_muted') === 'true') {
    let el = document.getElementById('muteLimbToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_wake_muted') === 'true') {
    let el = document.getElementById('muteWakeToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_questcomplete_muted') === 'true') {
    let el = document.getElementById('muteQuestCompleteToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_questfail_muted') === 'true') {
    let el = document.getElementById('muteQuestFailToggle');
    if (el) el.checked = true;
  }
  if (localStorage.getItem('robco_factionthreshold_muted') === 'true') {
    let el = document.getElementById('muteFactionThresholdToggle');
    if (el) el.checked = true;
  }
  // Master mute restore
  if (localStorage.getItem('robco_master_muted') === 'true') {
    let el = document.getElementById('masterMuteToggle');
    if (el) el.checked = true;
  }
  // Silently refresh model list 2s after boot if key is present
  if (localStorage.getItem('robco_gemini_key')) {
    setTimeout(() => {
      try {
        fetchAuthorizedModels(true);
      } catch (e) {
        /* silent */
      }
    }, 2000);
  }

  if (localStorage.getItem('robco_playstyle')) {
    let savedStyle = localStorage.getItem('robco_playstyle');
    if (document.getElementById('playstyleInput')) {
      document.getElementById('playstyleInput').value = savedStyle;
    }
  }

  // Restore game context selector
  {
    const ctx = (state && state.gameContext) || 'FNV';
    const sel = document.getElementById('gameContextSelect');
    if (sel) sel.value = ctx;
    // fo3WarningBanner removed in C11 — banner element no longer in DOM
  }

  // C5: Restore playthrough type select from state (was localStorage in C4-fix)
  {
    const type = (state && state.playthroughType) || 'standard';
    const sel = document.getElementById('playthroughTypeSelect');
    if (sel) sel.value = type;
  }
  {
    const mode = (state && state.campaignMode) || 'standard';
    const locked = mode === 'rng-locked';
    const armed = mode === 'rng';
    const cb = document.getElementById('completeRngToggle');
    if (cb) {
      cb.checked = locked || armed;
      cb.disabled = locked;
    }
    const banner = document.getElementById('rngModeBanner');
    if (banner) banner.style.display = armed ? 'block' : 'none';
    const lockedBanner = document.getElementById('rngLockedBanner');
    if (lockedBanner) lockedBanner.style.display = locked ? 'block' : 'none';
  }

  // #34 Typewriter Speed — restore slider + label on load
  {
    const savedSpeed = parseFloat(localStorage.getItem('robco_typer_speed') || '1');
    const slider = document.getElementById('typerSpeedSlider');
    const label = document.getElementById('typerSpeedVal');
    if (slider) slider.value = savedSpeed;
    if (label) label.textContent = savedSpeed.toFixed(2) + '\u00d7';
  }

  // #15 Keyboard Shortcuts — Ctrl+1–6 toggle first 6 panels, Ctrl+/ focus chat
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 6) {
        e.preventDefault();
        const panels = Array.from(document.querySelectorAll('details.panel'));
        const target = panels[num - 1];
        if (target) {
          if (target.open) target.removeAttribute('open');
          else target.setAttribute('open', '');
          // persist new state
          const ps = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
          if (target.dataset.panelId) {
            ps[target.dataset.panelId] = target.open;
            localStorage.setItem('robco_panel_state', JSON.stringify(ps));
          }
        }
      } else if (e.key === '/') {
        e.preventDefault();
        const ci = document.getElementById('chatInput');
        if (ci) ci.focus();
      }
    }
    // Tab keyboard shortcuts: 1=STAT, 2=INV, 3=DATA (no modifier, not in input)
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      const activeEl = document.activeElement;
      const inInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT');
      if (!inInput) {
        if (e.key === '1') {
          e.preventDefault();
          switchTab('stat');
        } else if (e.key === '2') {
          e.preventDefault();
          switchTab('inv');
        } else if (e.key === '3') {
          e.preventDefault();
          switchTab('data');
        } else if (e.key === '4') {
          e.preventDefault();
          switchTab('campg');
        }
      }
    }
    if (e.key === 'Escape') {
      const modal = document.getElementById('sysModal');
      if (modal && modal.style.display !== 'none') closeModal();
    }
  });

  // Defer changelog display until after boot sequence completes
  let needsChangelog = false;
  if (localStorage.getItem('robco_version') !== APP_VERSION) {
    localStorage.setItem('robco_version', APP_VERSION);
    needsChangelog = true;
  }

  runBootSequence(() => {
    if (needsChangelog) {
      fetch('CHANGELOG.md')
        .then(r => r.text())
        .then(text => {
          const entries = text.split(/\r?\n(?=## \[v\d+\.\d+)/);
          const latestEntry = entries[0] || text;
          document.getElementById('modalTitle').innerText = `> PATCH NOTES: ${APP_VERSION}`;
          document.getElementById('modalContent').innerText = latestEntry.trim();
          document.getElementById('sysModal').style.display = 'flex';
        })
        .catch(e => console.error('Could not load changelog'));
    }

    // Session resume briefing (only if a save exists)
    if (localStorage.getItem('robco_v7')) {
      const lastNote =
        state.campaign_notes && state.campaign_notes.length > 0
          ? state.campaign_notes[state.campaign_notes.length - 1]
          : null;
      const companionNames =
        state.squad && state.squad.length > 0 ? state.squad.map(m => m.name).join(', ') : 'None';
      const limbStatus = ['la', 'ra', 'll', 'rl', 'hd'].filter(l => state[l] === 'CRIPPLED');

      // Active quests (in-progress only, max 3 shown)
      const activeQuests = (state.quests || [])
        .filter(q => q.status === 'IN PROGRESS' || q.status === 'ACTIVE')
        .slice(0, 3)
        .map(q => `    [ACTIVE] ${q.name}`);

      // Faction standings at extremes (Idolized / Vilified)
      const extremeFactions = Object.entries(state.factions || {})
        .filter(([, f]) => {
          const rep = typeof f === 'object' ? f.rep || 0 : 0;
          return Math.abs(rep) >= 75;
        })
        .map(([name, f]) => {
          const rep = typeof f === 'object' ? f.rep || 0 : 0;
          return `    ${name.toUpperCase()}: ${rep >= 75 ? 'IDOLIZED' : 'VILIFIED'}`;
        })
        .slice(0, 3);

      // Expiring chems (ticks 1–2)
      const expiringChems = (state.status || [])
        .filter(eff => eff.type === 'BUFF' && (eff.ticks || 0) > 0 && (eff.ticks || 0) <= 2)
        .map(eff => `    ⚠ ${eff.name.toUpperCase()} EXPIRING [${eff.ticks}T]`);

      const briefingLines = [
        '> ── SESSION RESUMED ─────────────────────────────────────────',
        `> LOC: ${state.loc || 'UNKNOWN'} | ${formatGameTime(state.ticks)} | HP: ${state.hpCur}/${state.hpMax}`,
        `> CAPS: ${state.caps} | RADS: ${state.rads} | SQUAD: ${companionNames}`,
        limbStatus.length > 0 ? `> CRIPPLED LIMBS: ${limbStatus.join(', ').toUpperCase()}` : null,
        activeQuests.length > 0 ? `> ACTIVE OBJECTIVES:\n${activeQuests.join('\n')}` : null,
        extremeFactions.length > 0 ? `> FACTION ALERTS:\n${extremeFactions.join('\n')}` : null,
        expiringChems.length > 0 ? `> CHEM WARNINGS:\n${expiringChems.join('\n')}` : null,
        lastNote ? `> LAST LOG: ${lastNote}` : null,
        '> ─────────────────────────────────────────────────────────────',
      ]
        .filter(Boolean)
        .join('\n');
      appendToChat(briefingLines, 'sys', true);
    }

    if (
      window._lastStateBeforeSync ||
      (typeof window.getRollingBackups === 'function' && window.getRollingBackups().length > 0)
    ) {
      let undoBtn = document.getElementById('undoSyncBtn');
      if (undoBtn) undoBtn.style.display = 'block';
    }
  });

  // Session Uptime Clock
  let sessionStart = Date.now();
  _uptimeInterval = setInterval(() => {
    let elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    let h = Math.floor(elapsed / 3600),
      m = Math.floor((elapsed % 3600) / 60),
      s = elapsed % 60;
    let el = document.getElementById('uptimeClock');
    if (el)
      el.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, 1000);

  // Memory Cycle Event (every 15 minutes)
  _memCycleInterval = setInterval(() => {
    appendToChat('> MEMORY CYCLE COMPLETE. 64K STABLE.', 'sys', true);
    document.body.style.filter = 'brightness(0.35)';
    setTimeout(() => {
      document.body.style.filter = '';
    }, 150);
  }, 900000);

  // #36 Input History — Up/Down arrows cycle through sent user commands
  const _inputHistory = [];
  let _inputHistoryIdx = -1;
  const _chatInput = document.getElementById('chatInput');
  if (_chatInput) {
    _chatInput.addEventListener('keydown', e => {
      // Only intercept when input is otherwise empty or navigating history
      if (e.key === 'ArrowUp') {
        const userMsgs = chatHistory.filter(m => m.sender === 'user').map(m => m.text);
        if (userMsgs.length === 0) return;
        e.preventDefault();
        if (_inputHistoryIdx === -1) _inputHistoryIdx = userMsgs.length;
        _inputHistoryIdx = Math.max(0, _inputHistoryIdx - 1);
        _chatInput.value = userMsgs[_inputHistoryIdx] || '';
      } else if (e.key === 'ArrowDown') {
        const userMsgs = chatHistory.filter(m => m.sender === 'user').map(m => m.text);
        if (_inputHistoryIdx === -1) return;
        e.preventDefault();
        _inputHistoryIdx = Math.min(userMsgs.length, _inputHistoryIdx + 1);
        _chatInput.value = _inputHistoryIdx < userMsgs.length ? userMsgs[_inputHistoryIdx] : '';
        if (_inputHistoryIdx === userMsgs.length) _inputHistoryIdx = -1;
      } else {
        _inputHistoryIdx = -1; // Any other key resets nav position
      }
    });
  }

  // Flush any pending debounced save immediately on tab close
  window.addEventListener('beforeunload', () => {
    clearTimeout(_saveTimer);
    if (!window.robco_v8)
      window.robco_v8 = { activeContext: state.gameContext || 'FNV', campaigns: {} };
    window.robco_v8.activeContext = state.gameContext || 'FNV';
    window.robco_v8.campaigns[window.robco_v8.activeContext] = JSON.parse(JSON.stringify(state));
    localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));
  });
};

function setupHpBarInteraction() {
  const container = document.getElementById('hp_bar_container');
  if (!container) return;
  function applyHp(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const hpMax = parseInt(document.getElementById('stat_hp_max').value) || 100;
    const newHp = Math.round(pct * hpMax);
    document.getElementById('stat_hp_cur').value = newHp;
    state.hpCur = newHp;
    updateMath();
  }
  let dragging = false;
  container.addEventListener('mousedown', e => {
    dragging = true;
    applyHp(e);
  });
  document.addEventListener('mousemove', e => {
    if (dragging) applyHp(e);
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
  });
  container.addEventListener(
    'touchstart',
    e => {
      dragging = true;
      applyHp(e);
      e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'touchmove',
    e => {
      if (dragging) applyHp(e);
    },
    { passive: false }
  );
  document.addEventListener('touchend', () => {
    dragging = false;
  });
}

// C11: XP bar click-drag — mirrors HP bar but sets XP within [xpCur, xpNext-1] range.
// Allows direct manipulation of XP progress within the current level.
function setupXpBarInteraction() {
  const container = document.getElementById('xp_bar_container');
  if (!container) return;
  function applyXp(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const lvl = Math.max(1, parseInt(document.getElementById('stat_lvl').value) || 1);
    const xpCur = lvl <= 1 ? 0 : 75 * (lvl * lvl) - 25 * lvl - 50;
    const xpNext = 75 * ((lvl + 1) * (lvl + 1)) - 25 * (lvl + 1) - 50;
    const newXp = Math.round(xpCur + pct * (xpNext - xpCur - 1));
    document.getElementById('stat_xp').value = newXp;
    state.xp = newXp;
    updateMath();
  }
  let dragging = false;
  container.addEventListener('mousedown', e => {
    dragging = true;
    applyXp(e);
  });
  document.addEventListener('mousemove', e => {
    if (dragging) applyXp(e);
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
  });
  container.addEventListener(
    'touchstart',
    e => {
      dragging = true;
      applyXp(e);
      e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'touchmove',
    e => {
      if (dragging) applyXp(e);
    },
    { passive: false }
  );
  document.addEventListener('touchend', () => {
    dragging = false;
  });
}

// C11: Level input change handler — when user edits the level field,
// auto-set XP to the minimum XP required for that level (xpCur).
function onLvlInputChanged() {
  const lvl = Math.max(1, parseInt(document.getElementById('stat_lvl').value) || 1);
  const xpCur = lvl <= 1 ? 0 : 75 * (lvl * lvl) - 25 * lvl - 50;
  document.getElementById('stat_xp').value = xpCur;
  state.lvl = lvl;
  state.xp = xpCur;
  updateMath();
}

// C5: Playthrough type handler — writes state field (Protocol 4).
// Affects AI directive. Triggers saveState() so the change persists.
// Valid combinations with Complete RNG are all supported.
function onPlaythroughTypeChange(type) {
  const valid = ['standard', 'minmaxed', 'completionist', 'casual', 'speedrun'];
  if (!valid.includes(type)) return;
  state.playthroughType = type;
  saveState();
}

// C4-fix / C11: Complete RNG toggle — receives boolean from checkbox this.checked.
// Updates state.campaignMode ('standard' | 'rng') and saves.
// If mode is 'rng-locked', toggle is a no-op (cannot be disabled).
function onCampaignModeChange(checked) {
  if (state.campaignMode === 'rng-locked') {
    // Permanently locked — force checkbox back to checked, do nothing
    const cb = document.getElementById('completeRngToggle');
    if (cb) {
      cb.checked = true;
      cb.disabled = true;
    }
    return;
  }
  state.campaignMode = checked ? 'rng' : 'standard';
  saveState();
  const banner = document.getElementById('rngModeBanner');
  if (banner) banner.style.display = checked ? 'block' : 'none';
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (document.getElementById('btnInstallPwa')) {
    document.getElementById('btnInstallPwa').style.display = 'block';
  }
});

async function installPwa() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('btnInstallPwa').style.display = 'none';
    }
    deferredPrompt = null;
  }
}

function changePlaystyle(style) {
  if (style === 'melee') {
    let stateStr = JSON.stringify(state).toLowerCase();
    if (stateStr.includes('educated') || stateStr.includes('dead weight')) {
      alert(
        '>> CANNOT SWAP TO MELEE ONLY: Save state contains restricted perks (Educated/Dead Weight).'
      );
      document.getElementById('playstyleInput').value =
        localStorage.getItem('robco_playstyle') || 'any';
      return;
    }
  }
  localStorage.setItem('robco_playstyle', style);
}

function onGameContextChange(ctx) {
  if (ctx !== 'FNV' && ctx !== 'FO3') return;
  if (!window.robco_v8) window.robco_v8 = { activeContext: 'FNV', campaigns: {} };
  window.robco_v8.activeContext = ctx;
  window.robco_v8.campaigns[state.gameContext] = JSON.parse(JSON.stringify(state));
  localStorage.setItem('robco_v8', JSON.stringify(window.robco_v8));
  window.location.reload();
}

// ── CAMPAIGN LOG EXPORT ────────────────────────────────────────
// format: 'txt' (default), 'html' (#41), 'md' (#27)
function exportCampaignLog(format = 'txt') {
  if (!chatHistory || chatHistory.length === 0) {
    alert('> ERROR: COMM-LINK LOGS EMPTY.');
    return;
  }

  if (format === 'html') {
    // #41 HTML Campaign Log Export — green-on-black styled HTML matching current optics
    const optics = localStorage.getItem('robco_optics') || 'green';
    const fgMap = {
      green: '#14fdce',
      amber: '#ffb642',
      blue: '#42cbf5',
      legion: '#ff4040',
      ghoul: '#7dff5f',
      neon: '#c084fc',
    };
    const fg = fgMap[optics] || '#14fdce';
    let rows = chatHistory
      .map(msg => {
        let clean = msg.text
          .replace(/<[^>]*>?/gm, '')
          .replace(/```[a-z]*\n?/gi, '')
          .replace(/```/g, '');
        const label =
          msg.sender === 'user' ? 'COURIER' : msg.sender === 'sys' ? 'SYSTEM' : 'DATABANK';
        const color = msg.sender === 'user' ? '#fff' : msg.sender === 'sys' ? '#f39c12' : fg;
        const safe = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<div style="margin-bottom:10px;"><span style="color:${color};opacity:0.6;font-size:11px;">[${label}]</span><br><span style="color:${color};white-space:pre-wrap;">${safe}</span></div>`;
      })
      .join('');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>RobCo U.O.S. Campaign Log</title><style>body{background:#010a07;color:${fg};font-family:'Courier New',monospace;padding:20px;font-size:13px;line-height:1.5;}.header{text-align:center;border-bottom:1px dashed ${fg};padding-bottom:10px;margin-bottom:20px;letter-spacing:2px;}</style></head><body><div class="header"><h1>ROBCO INDUSTRIES U.O.S.<br>AFTER-ACTION CAMPAIGN LOG</h1><p>Courier: ${escapeHtml(state.loc || '?')} | ${formatGameTime(state.ticks || 0)} | Lv.${state.lvl || 1}</p></div>${rows}</body></html>`;
    _downloadBlob(html, 'text/html', 'robco_campaign_log.html');
    return;
  }

  if (format === 'md') {
    // #27 Export as Markdown
    let md = `# RobCo U.O.S. — Campaign Log\n\n`;
    md += `**Location:** ${state.loc || '?'} | **Time:** ${formatGameTime(state.ticks || 0)} | **Level:** ${state.lvl || 1}\n\n---\n\n`;
    chatHistory.forEach(msg => {
      let clean = msg.text
        .replace(/<[^>]*>?/gm, '')
        .replace(/```[a-z]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();
      if (!clean) return;
      const prefix =
        msg.sender === 'user'
          ? '**[COURIER]**'
          : msg.sender === 'sys'
            ? '*[SYSTEM]*'
            : '> [DATABANK]';
      md += `${prefix} ${clean}\n\n`;
    });
    _downloadBlob(md, 'text/markdown', 'robco_campaign_log.md');
    return;
  }

  // Default: plain text (original behavior)
  let logStr = '=========================================================\n';
  logStr += '         ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM\n';
  logStr += '                 AFTER-ACTION CAMPAIGN LOG\n';
  logStr += '=========================================================\n\n';
  chatHistory.forEach(msg => {
    let cleanText = msg.text
      .replace(/<[^>]*>?/gm, '')
      .replace(/\x60{3}[a-z]*\n/gi, '')
      .replace(/\x60{3}/g, '');
    if (msg.sender === 'user') logStr += `[COURIER]: ${cleanText}\n\n`;
    else if (msg.sender === 'sys') logStr += `[SYSTEM]: ${cleanText}\n\n`;
    else logStr += `[DATABANK]: ${cleanText}\n\n`;
  });
  _downloadBlob(logStr, 'text/plain', 'robco_campaign_log.txt');
}

function _downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── NOTIFICATION BADGES (#13) ────────────────────────────────────────
// Shows count badges on panel summaries whenever their contents are non-empty.
// Called at end of updateMath() so it always reflects current state.
function _updatePanelBadges() {
  const badges = [
    { h2text: '> PERKS', count: (state.perks || []).length },
    {
      h2text: '> BACKPACK INVENTORY',
      // Combined: non-ammo inventory items + tracked ammo calibers
      count:
        (state.inventory || []).filter(it => (it.type || 'misc') !== 'ammo').length +
        Object.values(state.ammo || {}).filter(v => v > 0).length,
    },
    { h2text: '> SQUAD STATUS', count: (state.squad || []).length },
    { h2text: '> STATUS EFFECTS', count: (state.status || []).length },
    { h2text: '> CAMPAIGN NOTES', count: (state.campaign_notes || []).length },
    {
      h2text: '> QUEST LOG',
      count: (state.quests || []).filter(q => q.status === 'active' || !q.status).length,
    },
    {
      h2text: '> COLLECTIBLES',
      count: (state.collectibles || []).length,
    },
  ];
  badges.forEach(({ h2text, count }) => {
    // Find the h2 with exactly this text (case-insensitive prefix match)
    const h2 = Array.from(document.querySelectorAll('.panel h2')).find(el =>
      el.textContent.trim().startsWith(h2text)
    );
    if (!h2) return;
    // Remove old badge
    const old = h2.querySelector('.panel-badge');
    if (old) old.remove();
    // Add new badge if count > 0
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'panel-badge';
      badge.textContent = count;
      h2.appendChild(badge);
    }
  });
}

// ── AUTO-EXPAND PANEL (#31) ──────────────────────────────────────────
// ── TAB NAVIGATION ───────────────────────────────────────────────
// Tabs: 'stat' | 'inv' | 'data'
// Each panel has data-tab="stat|inv|data|campg". Panels with no data-tab always show.
// Security & Configuration has no data-tab and is always visible.
const TAB_NAMES = ['stat', 'inv', 'data', 'campg'];

function switchTab(tab) {
  if (!TAB_NAMES.includes(tab)) return;
  playPanelClick(); // H1: rotary dial click on tab switch
  // Show panels for the active tab, hide others
  document.querySelectorAll('.panel[data-tab]').forEach(el => {
    if (el.dataset.tab === tab) {
      el.classList.add('tab-visible');
    } else {
      el.classList.remove('tab-visible');
    }
  });
  // Update button active states
  TAB_NAMES.forEach(t => {
    const btn = document.getElementById('tab-btn-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  // Store active tab so page reload restores it
  try {
    localStorage.setItem('robco_active_tab', tab);
  } catch (_) {}
  // Re-render world map when switching to the DATA tab so it measures real panel width
  if (tab === 'data' && typeof renderWorldMap === 'function') renderWorldMap();
}

// Initialize tab on page load (restores last used tab, defaults to 'stat')
function initTabs() {
  let tab = 'stat';
  try {
    const saved = localStorage.getItem('robco_active_tab');
    if (saved && TAB_NAMES.includes(saved)) tab = saved;
  } catch (_) {}
  switchTab(tab);
}

// Called by #stat_loc onchange: persists the new location and re-renders so the
// current-zone highlight updates. View preference (state.mapView) is kept as-is.
function onLocationChange() {
  saveState();
  renderWorldMap();
}

// Called by autoImportState() after a state delta with the changed category key.
// Opens the relevant panel so the Courier can immediately see what changed.
function expandPanelForCategory(categoryKey) {
  // Tab routing: switch to the correct tab before expanding the panel
  const tabMap = {
    squad: 'inv',
    status: 'stat',
    inventory: 'inv',
    campaign_notes: 'data',
    perks: 'stat',
    factions: 'stat',
    quests: 'data',
    ammo: 'inv',
    equipped: 'inv',
    collectibles: 'inv',
  };
  if (tabMap[categoryKey]) switchTab(tabMap[categoryKey]);

  const map = {
    squad: '> SQUAD STATUS',
    status: '> STATUS EFFECTS',
    inventory: '> BACKPACK INVENTORY',
    campaign_notes: '> CAMPAIGN NOTES',
    perks: '> PERKS',
    factions: '> FACTION STANDING',
    quests: '> QUEST LOG',
    ammo: '> BACKPACK INVENTORY', // ammo lives in the sub-panel inside BACKPACK
    equipped: '> EQUIPPED',
    collectibles: '> COLLECTIBLES',
  };
  const target = map[categoryKey];
  if (!target) return;
  const h2 = Array.from(document.querySelectorAll('.panel h2')).find(el =>
    el.textContent.trim().startsWith(target)
  );
  if (!h2) return;
  const details = h2.closest('details.panel');
  if (details && !details.open) {
    details.setAttribute('open', '');
    // Persist the newly opened state
    const ps = JSON.parse(localStorage.getItem('robco_panel_state') || '{}');
    if (details.dataset.panelId) {
      ps[details.dataset.panelId] = true;
      localStorage.setItem('robco_panel_state', JSON.stringify(ps));
    }
  }
  // For ammo, also open the nested ammo sub-panel
  if (categoryKey === 'ammo') {
    const subPanel = document.getElementById('ammoSubPanel');
    if (subPanel && !subPanel.open) subPanel.setAttribute('open', '');
  }
}

function showFullChangelog() {
  fetch('CHANGELOG.md')
    .then(r => r.text())
    .then(text => {
      document.getElementById('modalTitle').innerText = '> SYSTEM CHANGELOG — ALL VERSIONS';
      document.getElementById('modalContent').innerText = text.trim();
      document.getElementById('sysModal').style.display = 'flex';
    })
    .catch(() => {
      document.getElementById('modalTitle').innerText = '> SYSTEM CHANGELOG';
      document.getElementById('modalContent').innerText = '> [SYS-ALERT: CHANGELOG NOT FOUND]';
      document.getElementById('sysModal').style.display = 'flex';
    });
}

function closeModal() {
  document.getElementById('sysModal').style.display = 'none';
}

// ── G1: V.A.T.S. TACTICAL OVERLAY ────────────────────────────────
// Reads state (PER, AGI, weapon skill, chem boosts) and target DT from inputs.
// Outputs estimated hit % per body region. Read-only — no state writes.
// Clearly labeled ESTIMATED. Also constructs a [VATS] AI prompt payload.
// Formula: BASE_CHANCE = (Perception * 2) + (Agility * 1.5) + (WeaponSkill / 3)
//          Adjusted by region modifier and target DT.
//          Clamped to 5-95%. Labeled ESTIMATED throughout.
function showVATSOverlay() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;

  // Read SPECIAL from DOM
  const per = parseInt((document.getElementById('s_p') || {}).value) || 5;
  const agi = parseInt((document.getElementById('s_a') || {}).value) || 5;

  // Active weapon skill: check state.equipped.weapon against skill matrix
  // Or just use best combat skill from state.skills
  const skills = state.skills || {};
  const combatSkills = {
    guns: skills.guns || skills.small_guns || 0,
    energy_weapons: skills.energy_weapons || 0,
    melee_weapons: skills.melee_weapons || 0,
    sneak: skills.sneak || 0,
    explosives: skills.explosives || 0,
  };
  const activeSkill = Math.max(...Object.values(combatSkills));
  const activeSkillName =
    Object.keys(combatSkills).find(k => combatSkills[k] === activeSkill) || 'guns';

  // Chem boost: any active BUFF with ticks > 0 that matches combat skill
  let chemBonus = 0;
  (state.status || []).forEach(eff => {
    if (eff.type === 'BUFF' && (eff.ticks || 0) > 0) {
      const name = (eff.name || '').toLowerCase();
      if (
        name.includes('gun') ||
        name.includes('weapon') ||
        name.includes('combat') ||
        name.includes('turbo') ||
        name.includes('psycho')
      ) {
        chemBonus += 10; // +10 skill equivalent per active combat buff
      }
    }
  });

  // Target DT input — read from a prompt or use default 0
  const targetDT = 0; // Default: no DT. AI will handle specifics.

  // Base chance calculation (intentionally approximate)
  const base = per * 2 + agi * 1.5 + (activeSkill + chemBonus) / 3 - targetDT * 1.5;

  // Body region modifiers (FNV standard)
  const regions = [
    { name: 'HEAD', mod: -40, ap: 5 },
    { name: 'TORSO', mod: 0, ap: 4 },
    { name: 'L. ARM', mod: -20, ap: 3 },
    { name: 'R. ARM', mod: -20, ap: 3 },
    { name: 'L. LEG', mod: -25, ap: 4 },
    { name: 'R. LEG', mod: -25, ap: 4 },
    { name: 'EYES', mod: -60, ap: 6 },
    { name: 'GROIN', mod: -30, ap: 4 },
  ];

  const rows = regions
    .map(r => {
      const pct = Math.min(95, Math.max(5, Math.round(base + r.mod)));
      const bar = '#'.repeat(Math.floor(pct / 10)).padEnd(10, '·');
      return `${r.name.padEnd(8)} [${bar}] ${pct}% EST. &nbsp; AP:${r.ap}`;
    })
    .join('\n');

  const chemStr = chemBonus > 0 ? ` (+${chemBonus} CHEM BOOST)` : '';

  title.innerText = '> V.A.T.S. TACTICAL OVERLAY — ESTIMATED ONLY';
  content.innerHTML = `
<div style="font-family:inherit;font-size:11px;line-height:1.8;white-space:pre;">
<b>INPUTS</b>
  PER:${per}  AGI:${agi}  SKILL:${activeSkillName.toUpperCase()} ${activeSkill}${chemStr}
  TARGET DT: ${targetDT} (update via AI [VATS] command for specifics)

<b>HIT PROBABILITIES — ESTIMATED</b>
  ${rows.split('\n').join('\n  ')}

<b style="opacity:0.6;font-size:10px;">
ACCURACY ESTIMATES BASED ON SIMPLIFIED FORMULA.
ACTUAL OUTCOME DETERMINED BY AI RESOLUTION.
USE [VATS] COMMAND FOR CONTEXT-AWARE COMBAT ANALYSIS.
</b>
</div>`;

  modal.style.display = 'flex';
}

const COMMAND_REGISTRY = [
  {
    group: 'TACTICAL & COMBAT',
    cmds: [
      { cmd: '[VATS SIM] / [VS]', desc: 'Melee/Unarmed AP strike optimizer.' },
      { cmd: '[VVATS]', desc: 'Analyze screenshot for hit %.' },
      { cmd: '[THREAT] / [TH]', desc: 'Squad TTK & ammo burn calc.' },
      { cmd: '[TACTICS] / [TA]', desc: 'Multi-companion combat guide.' },
      { cmd: '[BIO-SCAN]', desc: 'Limb evaluation & med routing.' },
    ],
  },
  {
    group: 'INVENTORY & ECONOMY',
    cmds: [
      { cmd: '[VISUAL UPLOAD:X]', desc: 'Parse screenshot (Wpn/App/Msc).' },
      { cmd: '[SYNC: data]', desc: 'Batch state update via string.' },
      { cmd: '[BIND: X, DIR]', desc: 'Assign gear to D-Pad vectors.' },
      { cmd: '[PAD: DIR]', desc: 'Auto-execute 8-way hotkeys.' },
      { cmd: '[TRADE: X] / [TD]', desc: 'Live barter math & updates.' },
      { cmd: '[STASH: Loc] / [-FULL]', desc: 'Network inventory sum/full.' },
      { cmd: '[EXCESS] / [-FULL]', desc: 'Jury Rig & weight triage.' },
      { cmd: '[CURRENCY]', desc: 'Weightless Wealth exchange.' },
      { cmd: '[CRAFT]', desc: 'Consume ingredients to build.' },
      { cmd: '[AUDIT]', desc: 'Stash value for liquidation.' },
    ],
  },
  {
    group: 'CHARACTER & BIO-STATUS',
    cmds: [
      { cmd: '[TIMER/CHEM] / [CH]', desc: 'Buff ticks & addictions.' },
      { cmd: '[SQUAD]', desc: 'Squad loadouts & 150lb weight.' },
      { cmd: '[ROADMAP]', desc: 'Perks to Cap; implant overlap.' },
    ],
  },
  {
    group: 'NAVIGATION & WORLD STATE',
    cmds: [
      { cmd: '[GPS/MAP]', desc: 'Localized geographic compass.' },
      { cmd: '[TRAVEL CLUSTER] / [TC]', desc: 'Group active quest nodes.' },
      { cmd: '[WAIT: X Hrs]', desc: 'Advance clock & restock.' },
      { cmd: '[SLEEP]', desc: 'Advance 8 Hrs, heal HP/Limbs.' },
      { cmd: '[TIMELINE]', desc: 'Projected narrative timeline.' },
      { cmd: '[CASINO]', desc: 'Blackjack strategy via LUCK.' },
    ],
  },
  {
    group: 'NARRATIVE & DIRECTIVES',
    cmds: [
      { cmd: '[CROSSROADS]', desc: 'Butterfly-effect lockouts.' },
      { cmd: '[COMM LINK]', desc: 'NPC persona override. (SEVER)' },
      { cmd: '[PAUSE]', desc: 'Master Directive (Page One).' },
      { cmd: '[PAGE 2/3]', desc: 'Dynamic routes & alignment.' },
      { cmd: '[ARCHIVE]', desc: '3 most recent story choices.' },
      { cmd: '&& / -Q / -S', desc: 'Chain cmds, Quiet, Stealth.' },
    ],
  },
  {
    group: 'KEYBOARD SHORTCUTS',
    cmds: [
      { cmd: 'Ctrl + Enter', desc: 'Send command.' },
      { cmd: 'Ctrl + /', desc: 'Focus command input.' },
      { cmd: 'Ctrl + 1–6', desc: 'Toggle panels 1–6 open/close.' },
      { cmd: '1 / 2 / 3 / 4', desc: 'Switch tab: STAT / INV / DATA / CAMPG.' },
      { cmd: '↑ / ↓', desc: 'Cycle command history in input.' },
      { cmd: '↑ / ↓ + Enter', desc: 'Navigate and select autocomplete.' },
      { cmd: 'Esc', desc: 'Close dialog or dismiss autocomplete.' },
    ],
  },
];

function showHelpModal() {
  const modal = document.getElementById('sysModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalContent');
  if (!modal || !title || !content) return;
  title.innerText = '> COMM-LINK COMMAND REGISTRY';
  content.innerHTML =
    '<div class="cmd-registry">' +
    COMMAND_REGISTRY.map(
      g =>
        '<div class="cmd-group"><div class="cmd-group-title">' +
        escapeHtml(g.group) +
        '</div>' +
        g.cmds
          .map(
            c =>
              '<div class="cmd-card"><span class="cmd-name">' +
              escapeHtml(c.cmd) +
              '</span><span class="cmd-desc">' +
              escapeHtml(c.desc) +
              '</span></div>'
          )
          .join('') +
        '</div>'
    ).join('') +
    '</div><p style="font-size:9px;opacity:0.6;margin-top:8px;">Type any command in the Comm-Link input to execute.</p>';
  modal.style.display = 'flex';
}
function clampStat(el) {
  if (el.value > 10) el.value = 10;
  if (el.value < 1) el.value = 1;
}
function toggleLimb(limb) {
  let wasOk = state[limb] === 'OK';
  state[limb] = wasOk ? 'CRIPPLED' : 'OK';
  if (wasOk) {
    if (limb === 'hd') {
      playHeadCrippleSound();
      startTinnitus(); // Head cripple always triggers tinnitus
    } else {
      playLimbCrippleSound(limb);
    }
    if (crtHumGain) {
      crtHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
      crtHumGain.gain.setValueAtTime(0.007, audioCtx.currentTime);
      crtHumGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.08);
      crtHumGain.gain.linearRampToValueAtTime(0.007, audioCtx.currentTime + 0.35);
    }
  } else {
    if (limb === 'hd') {
      // Only stop tinnitus if rads are also below the threshold
      let rads = parseInt(document.getElementById('stat_rads').value) || 0;
      if (rads < 600) stopTinnitus();
    }
    playLimbRestoreSound();
  }
  loadUI();
}

function updateKarmaUI() {
  let k = parseInt(document.getElementById('stat_karma').value) || 0;
  let label = 'Neutral';
  if (k >= 750) label = 'Messiah';
  else if (k >= 250) label = 'Good';
  else if (k <= -750) label = 'Very Evil';
  else if (k <= -250) label = 'Evil';
  document.getElementById('karma_label').innerText = label;
}

function loadUI() {
  document.getElementById('stat_lvl').value = state.lvl;
  document.getElementById('stat_xp').value = state.xp;
  document.getElementById('stat_hp_cur').value = state.hpCur;
  document.getElementById('stat_hp_max').value = state.hpMax;
  ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(
    k => (document.getElementById('s_' + k).value = state[k])
  );
  document.getElementById('c_caps').value = state.caps;
  document.getElementById('stat_loc').value = state.loc;
  document.getElementById('stat_rads').value = state.rads;
  document.getElementById('stat_karma').value = state.karma;
  // TIME: decompose ticks → Calendar Date (M/D/Y) + H/M inputs
  {
    const t = state.ticks || 0;
    const dt = _resolveGameDateTime(t);
    const hr = Math.floor((t % 240) / 10);
    const mn = (t % 10) * 6;
    const calMonthEl = document.getElementById('cal_month');
    const calDayEl = document.getElementById('cal_day');
    const calYearEl = document.getElementById('cal_year');
    const hrEl = document.getElementById('time_hour');
    const minEl = document.getElementById('time_min');
    const hidden = document.getElementById('stat_ticks');
    const hiddenDay = document.getElementById('time_day');
    if (calMonthEl) calMonthEl.value = dt.month + 1; // _resolveGameDateTime uses 0-indexed month
    if (calDayEl) calDayEl.value = dt.day;
    if (calYearEl) calYearEl.value = dt.year;
    if (hrEl) hrEl.value = hr;
    if (minEl) minEl.value = mn;
    if (hidden) hidden.value = t;
    if (hiddenDay) hiddenDay.value = Math.floor(t / 240) + 1;
  }
  // Skills — use getSkillKeys() for context-aware FNV/FO3 support
  getSkillKeys().forEach(sk => {
    let el = document.getElementById('sk_' + sk);
    if (el) el.value = state.skills && state.skills[sk] !== undefined ? state.skills[sk] : 15;
  });
  // All limbs including head
  ['la', 'ra', 'll', 'rl', 'hd'].forEach(k => {
    let btn = document.getElementById('btn_l_' + k);
    if (!btn) return;
    if (state[k] === 'OK') {
      btn.className = 'limb-ok';
      btn.innerText = '[██████] OK';
    } else {
      btn.className = 'limb-crip limb-glitch';
      btn.innerText = '[░░░░░░] CRIP';
    }
  });
  updateKarmaUI();
  renderInventory();
  renderAmmo();
  renderSquad();
  renderStatus();
  renderCampaignNotes();
  renderFactionRep();
  renderPerks();
  renderQuests();
  renderSessionStats();
  renderEquipped();
  renderCollectibles();
  renderGameDate();
  renderWorldMap(); // G6: Regional Zone Map
  renderKarmaCenter(); // G4: FO3 Karma Center
  renderCampaignStatus(); // v2.0.1: Campaign Status + Crossroads Record
  renderAccount();
  renderCloudSavePicker();
  _updateContextPanels(); // G4: switch faction/karma panel visibility
  // C5/C11: Restore CAMPG dropdowns from state
  {
    const ptSel = document.getElementById('playthroughTypeSelect');
    if (ptSel) ptSel.value = state.playthroughType || 'standard';
    const mode = (state && state.campaignMode) || 'standard';
    const locked = mode === 'rng-locked';
    const armed = mode === 'rng';
    const cb = document.getElementById('completeRngToggle');
    if (cb) {
      cb.checked = locked || armed;
      cb.disabled = locked; // cannot uncheck when permanently active
    }
    const banner = document.getElementById('rngModeBanner');
    if (banner) banner.style.display = armed ? 'block' : 'none';
    const lockedBanner = document.getElementById('rngLockedBanner');
    if (lockedBanner) lockedBanner.style.display = locked ? 'block' : 'none';
  }
  updateMath();
  triggerPhosphorGhost();
  // Radiation SPECIAL debuff coloring (display-only, does not modify state)
  const rads = state.rads || 0;
  const radDebuffs = {};
  if (rads >= 200) {
    radDebuffs.e = true;
  }
  if (rads >= 400) {
    radDebuffs.e = true;
    radDebuffs.a = true;
  }
  if (rads >= 600) {
    radDebuffs.e = true;
    radDebuffs.a = true;
    radDebuffs.s = true;
  }
  if (rads >= 800) {
    radDebuffs.e = true;
    radDebuffs.a = true;
    radDebuffs.s = true;
    radDebuffs.p = true;
  }
  if (rads >= 1000) {
    ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(k => (radDebuffs[k] = true));
  }
  ['s', 'p', 'e', 'c', 'i', 'a', 'l'].forEach(k => {
    const el = document.getElementById('s_' + k);
    if (!el) return;
    if (radDebuffs[k]) {
      el.style.color = 'var(--robco-danger)';
      el.title = 'RAD debuff active';
    } else {
      el.style.color = '';
      el.title = '';
    }
  });
}

// ── TIME INPUT HANDLER ───────────────────────────────────────────────
// Called by oninput on the calendar and time inputs. Clamps values and triggers a save.
function onTimeInputChanged() {
  const calMonthEl = document.getElementById('cal_month');
  const calDayEl = document.getElementById('cal_day');
  const calYearEl = document.getElementById('cal_year');
  const hrEl = document.getElementById('time_hour');
  const minEl = document.getElementById('time_min');
  if (!calMonthEl || !calDayEl || !calYearEl || !hrEl || !minEl) return;

  // Clamp
  let mo = Math.min(12, Math.max(1, parseInt(calMonthEl.value) || 1));
  let dy = Math.min(31, Math.max(1, parseInt(calDayEl.value) || 1));
  let yr = Math.max(2200, parseInt(calYearEl.value) || 2281);
  let h = Math.min(23, Math.max(0, parseInt(hrEl.value) || 0));
  let m = Math.min(59, Math.max(0, parseInt(minEl.value) || 0));

  calMonthEl.value = mo;
  calDayEl.value = dy;
  calYearEl.value = yr;
  hrEl.value = h;
  minEl.value = m;

  state.ticks = calendarToTicks(mo, dy, yr, h, m);

  // Keep hidden fields in sync
  let hiddenTicks = document.getElementById('stat_ticks');
  if (hiddenTicks) hiddenTicks.value = state.ticks;
  let hiddenDay = document.getElementById('time_day');
  if (hiddenDay) hiddenDay.value = Math.floor(state.ticks / 240) + 1;

  saveState();
}

// ── KARMA / HP / contextual-message gate variables ────────────
let _lastKarma = null,
  _lastHpPct = null;

// Contextual terminal message gate variables
// Each tracks the last-emitted threshold so we only fire once per crossing.
let _lastRadThreshold = 0; // 0 / 200 / 400 / 600 / 1000
let _lastGameHourBand = -1; // 0=night(20-5), 1=morning(6-11), 2=day(12-18), 3=evening(19)
let _lastChemExpiry = new Set(); // names of chems we've already warned about

function updateMath() {
  let maxAp = 65 + state.a * 3;
  document.getElementById('display_ap').innerText = maxAp;
  let maxWeight = 150 + state.s * 10;
  // Exclude ammo-typed items from carry weight — ammo items that leaked into
  // state.inventory from old saves would be invisible (filtered from render)
  // but would still add phantom weight without this filter.
  let curWt = state.inventory
    .filter(item => (item.type || 'misc') !== 'ammo')
    .reduce((acc, item) => acc + item.qty * item.wgt, 0);
  document.getElementById('display_weight').innerText = `${curWt.toFixed(1)} / ${maxWeight}`;
  document.getElementById('display_weight').style.color =
    curWt > maxWeight ? 'var(--robco-danger)' : 'var(--robco-green)';

  // HP Bar update + Critical HP Flash (#37)
  let hpFill = document.getElementById('hp_bar_fill');
  if (hpFill) {
    let hpCur = parseInt(document.getElementById('stat_hp_cur').value) || 0;
    let hpMax = parseInt(document.getElementById('stat_hp_max').value) || 100;
    let pct = Math.min(100, Math.max(0, (hpCur / hpMax) * 100));
    hpFill.style.width = pct + '%';
    if (pct > 60) hpFill.style.background = 'var(--robco-green)';
    else if (pct > 25) hpFill.style.background = 'var(--robco-alert)';
    else hpFill.style.background = 'var(--robco-danger)';
    // Flash red when HP drops into critical territory
    if (_lastHpPct !== null && _lastHpPct > 25 && pct <= 25) {
      document.body.classList.remove('crit-hp-flash');
      void document.body.offsetWidth;
      document.body.classList.add('crit-hp-flash');
      setTimeout(() => document.body.classList.remove('crit-hp-flash'), 750);
    }
    _lastHpPct = pct;
    // H4: Low Health Heartbeat — start when HP < 25%, stop when >= 25%
    if (pct < 25 && hpMax > 0) {
      startHeartbeat(pct / 100);
    } else {
      stopHeartbeat();
    }
  }

  // XP progress bar — reads DOM directly (same approach as HP bar) to avoid stale state reads
  let xpFill = document.getElementById('xp_bar_fill');
  if (xpFill) {
    let lvl = Math.max(1, parseInt(document.getElementById('stat_lvl').value) || 1);
    let xp = parseInt(document.getElementById('stat_xp').value) || 0;
    let xpCur = lvl <= 1 ? 0 : 75 * (lvl * lvl) - 25 * lvl - 50;
    let xpNext = 75 * ((lvl + 1) * (lvl + 1)) - 25 * (lvl + 1) - 50;
    let pct = lvl >= 50 ? 100 : Math.min(100, Math.max(0, ((xp - xpCur) / (xpNext - xpCur)) * 100));
    xpFill.style.width = pct + '%';
  }

  // Karma Flash (#30) — flash when karma polarity changes or large delta
  let curKarma = parseInt(document.getElementById('stat_karma').value) || 0;
  if (_lastKarma !== null && curKarma !== _lastKarma) {
    const delta = curKarma - _lastKarma;
    if (Math.abs(delta) >= 50) {
      const cls = delta > 0 ? 'karma-flash-good' : 'karma-flash-evil';
      document.body.classList.remove('karma-flash-good', 'karma-flash-evil');
      void document.body.offsetWidth;
      document.body.classList.add(cls);
      setTimeout(() => document.body.classList.remove(cls), 950);
    }
  }
  _lastKarma = curKarma;

  // Day/Night Indicator (#12) — toggle class based on in-game hour
  const gameHour = Math.floor(((state.ticks || 0) % 240) / 10);
  if (gameHour >= 20 || gameHour < 6) {
    document.body.classList.add('time-night');
  } else {
    document.body.classList.remove('time-night');
  }

  // Radiation tracking: color escalation + CRT screen interference
  let radEl = document.getElementById('stat_rads');
  if (radEl) {
    let rads = parseInt(radEl.value) || 0;
    if (rads >= 600) {
      radEl.style.color = 'var(--robco-danger)';
      radEl.style.animation = 'rad-pulse 0.8s ease-in-out infinite';
    } else if (rads >= 400) {
      radEl.style.color = '#e67e22';
      radEl.style.animation = 'rad-pulse 1.5s ease-in-out infinite';
    } else if (rads >= 200) {
      radEl.style.color = 'var(--robco-alert)';
      radEl.style.animation = 'none';
    } else {
      radEl.style.color = 'var(--robco-green)';
      radEl.style.animation = 'none';
    }
    // Drive CRT flicker/glitch off radiation threshold
    document.body.classList.remove('rad-warning', 'rad-critical', 'rad-fatal');
    if (rads >= 1000) document.body.classList.add('rad-fatal');
    else if (rads >= 600) document.body.classList.add('rad-critical');
    else if (rads >= 200) document.body.classList.add('rad-warning');
    // Audio systems — only update when rad level or limb status actually changes
    let hasCrippled = ['la', 'ra', 'll', 'rl', 'hd'].some(l => state[l] !== 'OK');
    if (rads !== _lastRads || hasCrippled !== _lastCrippled) {
      _lastRads = rads;
      _lastCrippled = hasCrippled;
      setGeigerRate(rads >= 1000 ? 25 : rads >= 600 ? 12 : rads >= 200 ? 0.33 : 0);
      if (rads >= 600 || state.hd === 'CRIPPLED') startTinnitus();
      else stopTinnitus();
      setCrtHumIntensity(rads, hasCrippled);
    }
  }

  // Carry weight interface deformation
  document.body.classList.remove('weight-heavy', 'weight-critical', 'weight-over');
  if (curWt >= maxWeight) document.body.classList.add('weight-over');
  else if (curWt >= maxWeight * 0.9) document.body.classList.add('weight-critical');
  else if (curWt >= maxWeight * 0.75) document.body.classList.add('weight-heavy');

  // #25 Radiation Treatment Alert — compute how many RadAway doses needed
  {
    const rads = state.rads || 0;
    const alertEl = document.getElementById('radAwayAlert');
    if (alertEl) {
      if (rads >= 200) {
        const dosesNeeded = Math.ceil(rads / 150);
        const hasRadAway = state.inventory.some(i => /radaway/i.test(i.name));
        alertEl.textContent = `RAD TREATMENT: ~${dosesNeeded} RadAway needed${hasRadAway ? ' — RadAway in pack' : ' — NONE IN PACK'}`;
        alertEl.style.display = 'block';
        alertEl.style.color = hasRadAway ? 'var(--robco-alert)' : 'var(--robco-danger)';
      } else {
        alertEl.style.display = 'none';
      }
    }
  }

  // Notification Badges (#13) — update panel summary badges after all renders
  _updatePanelBadges();

  // ── CONTEXTUAL TERMINAL MESSAGES ────────────────────────────────
  // These fire once per threshold crossing so the terminal gives situational
  // feedback without spamming. Gate variables ensure single-fire per state.
  {
    // Radiation threshold crossing messages
    const curRads = parseInt((document.getElementById('stat_rads') || {}).value) || 0;
    const radThreshold =
      curRads >= 1000
        ? 1000
        : curRads >= 600
          ? 600
          : curRads >= 400
            ? 400
            : curRads >= 200
              ? 200
              : 0;
    if (radThreshold !== _lastRadThreshold) {
      if (radThreshold > _lastRadThreshold) {
        // Escalating
        const radMsgs = {
          200: '> RADIATION DETECTED. GEIGER COUNTER ACTIVE. SEEK DECONTAMINATION.',
          400: '> RAD LEVEL ELEVATED. HP DEGRADATION RISK. RADAWAY RECOMMENDED.',
          600: '> CRITICAL IRRADIATION. SEEK IMMEDIATE TREATMENT.',
          1000: '> FATAL RADIATION EXPOSURE. SURVIVAL PROBABILITY: NEGLIGIBLE.',
        };
        if (radMsgs[radThreshold]) appendToChat(radMsgs[radThreshold], 'sys', true);
      } else if (radThreshold < _lastRadThreshold && _lastRadThreshold > 0) {
        // De-escalating
        appendToChat('> RADIATION LEVELS DECLINING. DECONTAMINATION IN PROGRESS.', 'sys', true);
      }
      _lastRadThreshold = radThreshold;
    }

    // Time-of-day transition messages (fires once per band change)
    const gameHr = Math.floor(((state.ticks || 0) % 240) / 10);
    const hourBand = gameHr >= 20 || gameHr < 6 ? 0 : gameHr < 12 ? 1 : gameHr < 19 ? 2 : 3;
    if (_lastGameHourBand !== -1 && hourBand !== _lastGameHourBand) {
      const bandMsgs = [
        '> NIGHT CYCLE. CURFEW IN EFFECT. TRAVEL WITH CAUTION.',
        '> DAWN DETECTED. AMBIENT TEMPERATURE RISING.',
        '> MIDDAY. VISIBILITY OPTIMAL.',
        '> DUSK. PREPARE FOR NIGHT CYCLE.',
      ];
      appendToChat(bandMsgs[hourBand], 'sys', true);
    }
    _lastGameHourBand = hourBand;

    // Expiring chem warnings (ticks 1–2, fire once per chem name)
    if (state.status && state.status.length > 0) {
      state.status.forEach(eff => {
        if (eff.type === 'BUFF' && (eff.ticks || 0) > 0 && (eff.ticks || 0) <= 2) {
          const key = (eff.name || '').toLowerCase();
          if (!_lastChemExpiry.has(key)) {
            _lastChemExpiry.add(key);
            appendToChat(
              `> CHEM WARNING: ${(eff.name || 'UNKNOWN').toUpperCase()} WEARING OFF. [${eff.ticks}T REMAINING]`,
              'sys',
              true
            );
          }
        } else {
          // Reset if ticks went up (new dose) or effect removed
          const key = (eff.name || '').toLowerCase();
          if ((eff.ticks || 0) > 2) _lastChemExpiry.delete(key);
        }
      });
    }
  }

  saveState();
}

function renderAccount() {
  const body = document.getElementById('accountBody');
  if (!body) return;
  const acct =
    typeof window.getAccountState === 'function'
      ? window.getAccountState()
      : { uid: null, isAnonymous: true, email: null, displayName: null };
  if (acct.isAnonymous || !acct.uid) {
    if (typeof window.isFeatureEnabled === 'function' && !window.isFeatureEnabled('googleSignIn')) {
      body.innerHTML =
        '<div style="font-size:11px;opacity:0.7;margin-bottom:8px;">NOT SIGNED IN — saves are local only.</div>' +
        '<div style="font-size:11px;opacity:0.5;padding:6px 0;">SIGN-IN TEMPORARILY UNAVAILABLE — local saves active.</div>';
    } else {
      body.innerHTML =
        '<div style="font-size:11px;opacity:0.7;margin-bottom:8px;">NOT SIGNED IN — saves are local only.</div>' +
        '<button class="action-btn" style="width:100%" onclick="if(window.signInWithGoogle)window.signInWithGoogle()">' +
        '> SIGN IN WITH GOOGLE (SYNC ACROSS DEVICES)</button>';
    }
  } else {
    const name = acct.displayName ? escapeHtml(acct.displayName) : '';
    const email = acct.email ? escapeHtml(acct.email) : '';
    body.innerHTML =
      '<div style="font-size:11px;margin-bottom:4px;">SIGNED IN</div>' +
      (name
        ? '<div style="font-size:11px;opacity:0.85;margin-bottom:2px;">' + name + '</div>'
        : '') +
      (email
        ? '<div style="font-size:11px;opacity:0.6;margin-bottom:8px;">' + email + '</div>'
        : '') +
      '<button class="action-btn" style="width:100%;margin-bottom:4px;" onclick="if(window.syncLocalSavesToCloud)window.syncLocalSavesToCloud()">' +
      '> SYNC LOCAL SAVES TO ACCOUNT</button>' +
      '<button class="action-btn" style="width:100%" onclick="if(window.signOutAccount)window.signOutAccount()">' +
      '> SIGN OUT</button>';
  }
  renderCloudSavePicker();
}

// ── CLOUD SAVE PICKER (Phase 5c-iii) ─────────────────────────────────
// Renders the cloud save list inside #cloudSavePickerBody (ACCOUNT panel).
// Async — fires-and-forgets from loadUI() and renderAccount(); safe to call anytime.
// All user-supplied labels are escaped; Firestore auto-IDs are alphanumeric (safe in onclick).
async function renderCloudSavePicker() {
  const body = document.getElementById('cloudSavePickerBody');
  if (!body) return;

  const acct =
    typeof window.getAccountState === 'function'
      ? window.getAccountState()
      : { uid: null, isAnonymous: true };

  if (!acct.uid || acct.isAnonymous) {
    body.innerHTML = emptyState('Sign in to use cloud saves');
    return;
  }

  body.innerHTML = emptyState('Loading cloud saves...');

  let saves;
  try {
    saves = typeof window.listCloudSaves === 'function' ? await window.listCloudSaves() : [];
  } catch (_) {
    body.innerHTML = emptyState('Failed to load cloud saves');
    return;
  }

  if (!saves.length) {
    body.innerHTML = emptyState('No cloud saves yet — tap Sync Local Saves.');
    return;
  }

  body.innerHTML =
    '<div style="font-size:10px;opacity:0.55;margin-bottom:5px;letter-spacing:1px;">CLOUD SAVES</div>' +
    saves
      .map(s => {
        const d = s.data;
        const docId = s.id;
        const label = escapeHtml(d.label || (docId === 'main' ? 'Quick Save' : 'Untitled'));
        return (
          '<div style="display:flex;align-items:center;gap:3px;margin-bottom:3px;">' +
          '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;">' +
          label +
          '</span>' +
          '<span style="flex-shrink:0;display:flex;gap:2px;">' +
          '<button class="btn-sm" onclick="window.loadCloudSave(\'' +
          docId +
          '\')">LOAD</button>' +
          '<button class="btn-sm" onclick="(function(){var l=prompt(\'Rename:\');if(l)window.renameCloudSave(\'' +
          docId +
          '\',l);})()">NAME</button>' +
          '<button class="btn-sm delete-btn" onclick="window.deleteCloudSave(\'' +
          docId +
          '\')">DEL</button>' +
          '</span>' +
          '</div>'
        );
      })
      .join('');
}

function undoLastSync() {
  try {
    if (window._lastStateBeforeSync) {
      let prev = JSON.parse(window._lastStateBeforeSync);
      state = { ...state, ...prev };
      window._lastStateBeforeSync = null;
      let undoBtn = document.getElementById('undoSyncBtn');
      if (undoBtn) undoBtn.style.display = 'none';
      loadUI();
      appendToChat('> STATE ROLLBACK COMPLETE. PREVIOUS TELEMETRY RESTORED.', 'sys', true);
    } else if (
      typeof window.getRollingBackups === 'function' &&
      window.getRollingBackups().length > 0
    ) {
      restoreRollingBackup();
    } else {
      appendToChat('> NO RECENT SYNC TO UNDO.', 'sys', true);
    }
  } catch (e) {
    appendToChat('> ROLLBACK FAILED: DATA CORRUPTED.', 'sys', true);
  }
}

// ── TEXT FORMATTING HELPERS ──────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emptyState(msg) {
  return '<span class="empty-state">' + escapeHtml(msg) + '</span>';
}

// Escape first (prevents XSS), then apply known-safe HTML replacements
function escapeAndFormat(text) {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '');
  return (
    escaped
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\u25b2/g, '<span class="delta-up">\u25b2</span>')
      .replace(/\u25bc/g, '<span class="delta-down">\u25bc</span>')
      // #29 Skill Check Indicators: highlight [SkillName N] patterns (e.g. [Speech 50])
      .replace(/\[([A-Za-z_ ]+)\s+(\d{1,3})\]/g, (match, skill, req) => {
        const skillKey = skill.toLowerCase().replace(/\s+/g, '_');
        if (getSkillKeys().includes(skillKey)) {
          const playerVal = (state.skills && state.skills[skillKey]) || 0;
          const pass = playerVal >= parseInt(req);
          const color = pass ? 'var(--robco-green)' : 'var(--robco-danger)';
          // Ping the skill input in the UI
          setTimeout(() => {
            const el = document.getElementById('sk_' + skillKey);
            if (el) {
              el.classList.remove('skill-ping');
              void el.offsetWidth;
              el.classList.add('skill-ping');
              setTimeout(() => el.classList.remove('skill-ping'), 1250);
            }
          }, 50);
          return `<span style="color:${color};font-weight:bold;" title="Your ${skill}: ${playerVal}">[${skill} ${req}${pass ? ' ✓' : ' ✗'}]</span>`;
        }
        return match;
      })
  );
}

function getTypewriterSpeed(text) {
  // #34 Typewriter Speed Control: user-set multiplier (0.25×–2×) stored in localStorage
  const speedMult = parseFloat(localStorage.getItem('robco_typer_speed') || '1');
  let base;
  if (/\b(dead|fatal|crit|ambush|explosion|killed|bleeding|dying)\b/i.test(text)) base = 2;
  else if (/\b(rest|wait|camp|safe|sleep|heal|recover)\b/i.test(text)) base = 40;
  else base = 15;
  return Math.max(1, Math.round(base * (1 / speedMult)));
}

function appendToChat(text, sender, isHistoryLoad = false) {
  if (!text) return;
  const chatBox = document.getElementById('chatDisplay');
  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'user' ? 'msg-user' : sender === 'sys' ? 'msg-sys' : 'msg-ai';
  chatBox.appendChild(msgDiv);

  // Build safe HTML once — escapes first, then applies formatting
  const fullHtml = escapeAndFormat(text);

  if (sender === 'ai' && !isHistoryLoad) {
    // Typewriter: reveal plain text with textContent (no parse cost, no XSS risk),
    // then swap to fully formatted innerHTML only once at animation end.
    const plainText = String(text)
      .replace(/```[a-z]*\n?/gi, '')
      .replace(/```/g, '');
    let i = 0;
    const speed = getTypewriterSpeed(text);
    const batchSize = speed <= 4 ? 4 : 1;

    function typeWriter() {
      if (i < plainText.length) {
        i = Math.min(i + batchSize, plainText.length);
        msgDiv.textContent = plainText.substring(0, i);
        if (i % 3 === 0) playClack();
        chatBox.scrollTop = chatBox.scrollHeight;
        setTimeout(typeWriter, speed);
      } else {
        // Animation complete — apply full safe HTML formatting
        msgDiv.innerHTML = fullHtml;
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    }
    typeWriter();
  } else {
    msgDiv.innerHTML = fullHtml;
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  if (!isHistoryLoad) {
    chatHistory.push({ text, sender });
    // Cap in-memory history and debounce the localStorage write
    if (chatHistory.length > CHAT_MAX) chatHistory = chatHistory.slice(-CHAT_MAX);
    clearTimeout(_chatSaveTimer);
    _chatSaveTimer = setTimeout(() => {
      // Debounce eliminates jitter — no need to further truncate here.
      // Full history (up to CHAT_MAX) is saved so Download Campaign Log
      // works correctly after a page reload.
      localStorage.setItem('robco_chat', JSON.stringify(chatHistory));
    }, 200);
  }
}

function macroCommand(actionStr) {
  let target = document.getElementById('macroTarget').value.trim();
  let finalCmd = actionStr;

  // Append the target if present and it's not a D-PAD command
  if (target && !actionStr.includes('PAD:')) {
    finalCmd = `${actionStr} ${target}`;
  }

  document.getElementById('chatInput').value = `> ${finalCmd}`;
  transmitMessage();
}

function tradeItem(name, price, isVendor) {
  let macro = isVendor ? `[BUY] ${name}` : `[SELL] ${name}`;
  document.getElementById('chatInput').value = `> ${macro}`;
  closeModal();
  transmitMessage();
}

function clearChat() {
  if (confirm('Purge Comm-Link history? This cannot be undone.')) {
    chatHistory = [];
    localStorage.removeItem('robco_chat');
    document.getElementById('chatDisplay').innerHTML = '';
    appendToChat('> SYSTEM LOGS PURGED. AWAITING COURIER INPUT...', 'sys', true);
  }
}

// ── F6: WIPE TERMINAL — NEW CAMPAIGN ────────────────────────────────
// Double-confirmation wipe: resets state to defaults, clears chat history,
// re-presents game context selection screen.
function wipeTerminal() {
  if (
    !confirm(
      '> WIPE TERMINAL\n\nThis will erase ALL Courier data:\n- SPECIAL / Skills / Perks / Quests\n- Inventory / Factions / Status Effects\n- Campaign Notes / Collectibles / Squad\n- Chat History / Session Statistics\n\nSave slots are preserved.\n\nThis CANNOT be undone. Continue?'
    )
  )
    return;
  if (
    !confirm(
      '> FINAL CONFIRMATION\n\nAre you absolutely certain?\nType OK to confirm terminal wipe.\n\nThis will destroy all unsaved progress.'
    )
  )
    return;

  // Reset state to defaults (preserves gameContext selection from boot)
  const wasRngArmed = state.campaignMode === 'rng';
  const freshState = JSON.parse(JSON.stringify(window._defaultState || {}));
  freshState.gameContext = state.gameContext || 'FNV'; // preserve game context for now
  // C11: If Complete RNG was armed (checked) when player wiped, activate the lock permanently
  if (wasRngArmed) freshState.campaignMode = 'rng-locked';

  // Wipe all current state properties to ensure no phantom arrays or strings remain
  for (let key in state) {
    if (Object.prototype.hasOwnProperty.call(state, key)) {
      delete state[key];
    }
  }

  Object.assign(state, freshState);

  // Clear chat history
  chatHistory = [];
  localStorage.removeItem('robco_chat');
  localStorage.removeItem('robco_v7'); // force fresh state on next save

  // Re-present game context selection
  state.gameContext = null;

  // C5: Clean up dead legacy localStorage key
  localStorage.removeItem('robco_playstyle_type');

  // Clear chat display
  const chatDisplay = document.getElementById('chatDisplay');
  if (chatDisplay) chatDisplay.innerHTML = '';

  // Reload UI first, so the DOM matches the fresh state
  loadUI();
  switchTab('stat');

  // Save the wiped state (now that syncStateFromDom will see clean DOM)
  saveState();

  // Show context selection prompt in chat
  appendToChat('> TERMINAL WIPED. INITIATING NEW CAMPAIGN...', 'sys', true);
  appendToChat('> SELECT GAME CONTEXT:', 'sys', true);
  appendToChat('> Type [CONTEXT: FNV] for Fallout: New Vegas', 'sys', true);
  appendToChat('> Type [CONTEXT: FO3] for Fallout 3', 'sys', true);
  appendToChat('> Or the AI will detect your game automatically.', 'sys', true);
}

// ── SAVE SLOTS (#6) ────────────────────────────────────────────────
// 3 named slots (A/B/C) stored as robco_slot_1/2/3 in localStorage.
// Each slot stores the full envelope {version, state, chat, playstyle, savedAt, slotName}.
const SLOT_NAMES = ['A', 'B', 'C'];
function _slotKey(n) {
  return `robco_slot_${n}`;
}
function _slotLabel(n) {
  return `SLOT ${SLOT_NAMES[n - 1]}`;
}

function saveToSlot(slotNum) {
  syncStateFromDom();
  const _slotState = JSON.parse(JSON.stringify(state));
  const _slotChat = chatHistory.slice(-200);
  const _slotPlaystyle = localStorage.getItem('robco_playstyle') || 'any';
  const envelope = {
    version: APP_VERSION,
    schemaVersion: APP_VERSION,
    state: _slotState,
    chat: _slotChat,
    playstyle: _slotPlaystyle,
    savedAt: Date.now(),
    slotName: _slotLabel(slotNum),
    gameContext: state.gameContext || 'FNV', // F5: store game context in envelope
  };
  if (typeof window.computeSaveChecksum === 'function') {
    envelope.checksum = window.computeSaveChecksum(_slotState, _slotChat, _slotPlaystyle);
  }
  try {
    localStorage.setItem(_slotKey(slotNum), JSON.stringify(envelope));
    const el = document.getElementById('slotStatus');
    const ts = new Date(envelope.savedAt).toLocaleTimeString();
    const ctx = envelope.gameContext;
    if (el) el.textContent = `${_slotLabel(slotNum)} [${ctx}] saved at ${ts}`;
    appendToChat(`> [SAVE] ${_slotLabel(slotNum)} [${ctx}] written at ${ts}`, 'sys', true);
  } catch (e) {
    appendToChat('> [ERROR] Save slot write failed — storage quota exceeded.', 'sys', true);
  }
}

function loadFromSlot(slotNum) {
  const raw = localStorage.getItem(_slotKey(slotNum));
  if (!raw) {
    appendToChat(`> [LOAD] ${_slotLabel(slotNum)} is empty.`, 'sys', true);
    return;
  }
  try {
    let env = JSON.parse(raw);
    // Integrity + forward-compat check before applying
    if (typeof window.verifySaveEnvelope === 'function') {
      const integrity = window.verifySaveEnvelope(env);
      if (integrity.status === 'future_version') {
        if (
          !confirm(
            `> VERSION MISMATCH\n\nThis save was made on a newer version of RobCo (v${integrity.version}).\nYour app is on v${APP_VERSION}.\n\nLoading may cause data loss — update the app first.\n\nForce-load anyway?`
          )
        )
          return;
      } else if (integrity.status === 'checksum_mismatch') {
        if (
          !confirm(
            '> SAVE INTEGRITY WARNING\n\nThis save may be corrupt or was edited outside the app.\n\nLoad anyway? (Data may be incomplete or incorrect.)'
          )
        )
          return;
      }
    }
    // F5: Warn on gameContext mismatch between slot and current session
    const slotCtx = env.gameContext || env.state?.gameContext || 'FNV';
    const curCtx = state.gameContext || 'FNV';
    if (slotCtx !== curCtx) {
      const ok = confirm(
        `> CONTEXT MISMATCH\n\nThis save is a ${slotCtx} campaign.\nYou are currently in ${curCtx} mode.\n\nLoading will switch to ${slotCtx}. Continue?`
      );
      if (!ok) return;
    }
    // Snapshot current state as rolling backup before replacing
    if (typeof window.snapRollingBackup === 'function') window.snapRollingBackup();
    if (typeof migrateState === 'function')
      env.state = migrateState(env.version || '1.0', env.state);
    state = { ...state, ...env.state };
    if (env.chat && Array.isArray(env.chat)) restoreChatHistory(env.chat);
    if (env.playstyle) {
      localStorage.setItem('robco_playstyle', env.playstyle);
      let el = document.getElementById('playstyleInput');
      if (el) el.value = env.playstyle;
    }
    loadUI();
    const ts = env.savedAt ? new Date(env.savedAt).toLocaleString() : 'unknown';
    const ctx = slotCtx;
    appendToChat(`> [LOAD] ${_slotLabel(slotNum)} [${ctx}] restored. Saved: ${ts}`, 'sys', true);
    const statusEl = document.getElementById('slotStatus');
    if (statusEl) statusEl.textContent = `${_slotLabel(slotNum)} [${ctx}] loaded (saved: ${ts})`;
  } catch (e) {
    appendToChat('> [ERROR] Save slot corrupted or unreadable.', 'sys', true);
  }
}

// ── QUEST LOG HELPERS (#1) ──────────────────────────────────────────
function addQuest() {
  const name = ((document.getElementById('newQuestName') || {}).value?.trim() || '').slice(0, 100);
  if (!name) return;
  const status = (document.getElementById('newQuestStatus') || {}).value || 'active';
  const obj = (document.getElementById('newQuestObjective') || {}).value?.trim() || null;
  if (!state.quests) state.quests = [];
  state.quests.push({ name, status, objective: obj });
  document.getElementById('newQuestName').value = '';
  document.getElementById('newQuestObjective').value = '';
  renderQuests();
  updateMath();
}

// ── SESSION STATISTICS HELPERS (#8) ────────────────────────────────
function resetSessionStats() {
  state.stats = { kills: 0, capsEarned: 0, damageDealt: 0, sessionStart: Date.now() };
  saveState();
  renderSessionStats();
}

// ── TOKEN BUDGET DISPLAY (#17) ────────────────────────────────────────
// Rough estimate: 1 token ≈ 4 chars. Updates on textarea input.
function updateTokenBudget() {
  const el = document.getElementById('tokenBudgetDisplay');
  if (!el) return;
  const model = (document.getElementById('apiModelInput') || {}).value || '';
  const ctxLimit = model.includes('1.5') ? 1000000 : model.includes('2.0') ? 1000000 : 128000;
  // Estimate: system directive (~2,875 tokens) + databaseCSVs (~3,200 tokens, now always in systemInstruction) + chat history + state + user input
  const directiveEst = 6500;
  const chatEst = Math.round(chatHistory.reduce((a, m) => a + m.text.length, 0) / 4);
  const stateEst = Math.round(JSON.stringify(state).length / 4);
  const inputEst = Math.round((document.getElementById('chatInput')?.value?.length || 0) / 4);
  const total = directiveEst + chatEst + stateEst + inputEst;
  const pct = Math.round((total / ctxLimit) * 100);
  el.textContent = `~${total.toLocaleString()} / ${(ctxLimit / 1000).toFixed(0)}K tokens (${pct}%)`;
  el.style.color =
    pct > 80 ? 'var(--robco-danger)' : pct > 50 ? 'var(--robco-alert)' : 'var(--robco-blue)';
}

function triggerFileInput() {
  document.getElementById('fileInput').click();
}

// ── RESTORE ROLLING BACKUP ─────────────────────────────────────────
// Presents the rolling backup ring and lets the user restore one — confirm-gated,
// routed through sanitizeImportedContainer + migrateState (Protocol 34).
function restoreRollingBackup() {
  if (typeof window.getRollingBackups !== 'function') return;
  const backups = window.getRollingBackups();
  if (!backups.length) {
    alert('>> NO BACKUP SAVES AVAILABLE <<');
    return;
  }
  const listStr = backups.map((b, i) => `${i + 1}. ${b.label}`).join('\n');
  const choice = prompt(
    `>> SELECT BACKUP TO RESTORE:\n\n${listStr}\n\nEnter number (1–${backups.length}) or Cancel:`
  );
  if (!choice) return;
  const n = parseInt(choice);
  if (isNaN(n) || n < 1 || n > backups.length) {
    alert('>> INVALID SELECTION <<');
    return;
  }
  const backup = backups[n - 1];
  if (
    !confirm(
      `>> RESTORE BACKUP FROM ${backup.label}?\n\nThis replaces your current campaign state.`
    )
  )
    return;
  try {
    const data = backup.data;
    const sanitized =
      typeof sanitizeImportedContainer === 'function'
        ? sanitizeImportedContainer(data.robco_v8)
        : data.robco_v8;
    if (typeof migrateState === 'function' && sanitized && sanitized.campaigns) {
      Object.keys(sanitized.campaigns).forEach(ctx => {
        sanitized.campaigns[ctx] = migrateState(data.version || '1.0', sanitized.campaigns[ctx]);
      });
    }
    localStorage.setItem('robco_v8', JSON.stringify(sanitized));
    if (data.chat && Array.isArray(data.chat))
      localStorage.setItem('robco_chat', JSON.stringify(data.chat));
    if (data.playstyle) localStorage.setItem('robco_playstyle', data.playstyle);
    alert('>> BACKUP RESTORED. REBOOTING SYSTEM... <<');
    window.location.reload();
  } catch (_) {
    appendToChat('> [SYS-ALERT: BACKUP RESTORE FAILED]', 'sys');
  }
}
function restoreChatHistory(history) {
  chatHistory = history.slice(-CHAT_MAX);
  const chatBox = document.getElementById('chatDisplay');
  if (chatBox) {
    chatBox.innerHTML = '';
    chatHistory.forEach(msg => appendToChat(msg.text, msg.sender, true));
  }
  clearTimeout(_chatSaveTimer);
  localStorage.setItem('robco_chat', JSON.stringify(chatHistory));
}
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.robco_v8) {
        // v8 Container payload — integrity check + rolling backup before applying
        if (typeof window.verifySaveEnvelope === 'function') {
          const _fi = window.verifySaveEnvelope(parsed);
          if (_fi.status === 'future_version') {
            if (
              !confirm(
                `> VERSION MISMATCH\n\nThis save was made on a newer version of RobCo (v${_fi.version}).\nYour app is on v${APP_VERSION}.\n\nLoading may cause data loss — update the app first.\n\nForce-load anyway?`
              )
            )
              return;
          } else if (_fi.status === 'checksum_mismatch') {
            if (
              !confirm(
                '> SAVE INTEGRITY WARNING\n\nThis save may be corrupt or was edited outside the app.\n\nLoad anyway? (Data may be incomplete or incorrect.)'
              )
            )
              return;
          }
        }
        if (typeof window.snapRollingBackup === 'function') window.snapRollingBackup();
        const _sanitized =
          typeof sanitizeImportedContainer === 'function'
            ? sanitizeImportedContainer(parsed.robco_v8)
            : parsed.robco_v8;
        localStorage.setItem('robco_v8', JSON.stringify(_sanitized));
        if (parsed.chat && Array.isArray(parsed.chat))
          localStorage.setItem('robco_chat', JSON.stringify(parsed.chat));
        if (parsed.playstyle) localStorage.setItem('robco_playstyle', parsed.playstyle);
        alert('>> HARD BACKUP RESTORED SUCCESSFULLY. REBOOTING SYSTEM... <<');
        window.location.reload();
      } else if (parsed.version && parsed.state) {
        // Envelope format (v1.6.3+): contains state, chat, playstyle
        autoImportState(JSON.stringify(parsed.state));
        if (parsed.chat && Array.isArray(parsed.chat)) restoreChatHistory(parsed.chat);
        if (parsed.playstyle) {
          localStorage.setItem('robco_playstyle', parsed.playstyle);
          let el = document.getElementById('playstyleInput');
          if (el) el.value = parsed.playstyle;
        }
        alert('>> LEGACY BACKUP RESTORED SUCCESSFULLY <<');
      } else {
        // Legacy: bare state JSON
        autoImportState(e.target.result);
        alert('>> LEGACY BACKUP RESTORED SUCCESSFULLY <<');
      }
    } catch (err) {
      appendToChat('> [SYS-ALERT: SAVE FILE CORRUPTED OR UNREADABLE]', 'sys');
    }
  };
  reader.readAsText(file);
}

function triggerImageUpload() {
  document.getElementById('imageInput').click();
}
function handleImageSelection(event) {
  const file = event.target.files[0];
  if (!file) return;
  attachedImageMimeType = file.type;
  const reader = new FileReader();
  reader.onload = function (e) {
    attachedImageData = e.target.result;
    const preview = document.getElementById('imagePreview');
    preview.src = attachedImageData;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// ── REGISTRY AUTOCOMPLETE (Phase 3) ──────────────────────────────────────────
/**
 * Shared singleton autocomplete panel for registry-backed text inputs.
 * Wires #newQuestName  → quests  category
 *       #newItemName   → items   category
 *
 * Behaviour:
 *  - Triggers after 2+ chars, debounced 150 ms.
 *  - Keyboard: ArrowUp / ArrowDown to navigate, Enter to select, Escape to dismiss.
 *  - Click item to fill and dismiss.
 *  - Dismisses automatically on blur (after a 100 ms grace for click events).
 *  - Does NOT modify state, save, or undo — pure UI read-only helper.
 */
function initRegistryAutocomplete() {
  // Build the singleton panel once
  var panel = document.getElementById('acPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'acPanel';
    panel.className = 'autocomplete-panel';
    panel.setAttribute('role', 'listbox');
    document.body.appendChild(panel);
  }

  var _acTimer = null;
  var _acActiveIdx = -1;
  var _acResults = [];
  var _acCurrentInput = null;

  function acHide() {
    panel.classList.remove('ac-visible');
    _acActiveIdx = -1;
    _acResults = [];
    _acCurrentInput = null;
  }

  function acPosition(inputEl) {
    var rect = inputEl.getBoundingClientRect();
    panel.style.top = rect.bottom + 2 + 'px';
    panel.style.left = rect.left + 'px';
    // Clamp to viewport right edge
    var panelW = Math.min(340, Math.max(220, rect.width));
    panel.style.width = panelW + 'px';
  }

  function acRender(results, inputEl) {
    _acResults = results;
    _acActiveIdx = -1;
    panel.innerHTML = '';

    if (!results.length) {
      var empty = document.createElement('div');
      empty.className = 'ac-empty';
      empty.textContent = 'No matches';
      panel.appendChild(empty);
    } else {
      results.forEach(function (entry, i) {
        var item = document.createElement('div');
        item.className = 'ac-item';
        item.setAttribute('role', 'option');
        item.dataset.idx = i;

        var nameSpan = document.createElement('span');
        nameSpan.className = 'ac-item-name';
        nameSpan.textContent = entry.name;

        var tagSpan = document.createElement('span');
        tagSpan.className = 'ac-item-tag';
        // Show type or dlc as a tag hint
        var tag = entry.type || '';
        if (entry.dlc) tag += ' [' + entry.dlc.toUpperCase() + ']';
        if (entry.level > 0) tag += ' L' + entry.level;
        tagSpan.textContent = tag;

        item.appendChild(nameSpan);
        if (tag) item.appendChild(tagSpan);

        item.addEventListener('mousedown', function (e) {
          // Use mousedown so it fires before blur
          e.preventDefault();
          if (_acCurrentInput) {
            _acCurrentInput.value = entry.name;
            // Trigger input event so any live listeners see the change
            _acCurrentInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          acHide();
        });

        panel.appendChild(item);
      });
    }

    acPosition(inputEl);
    panel.classList.add('ac-visible');
  }

  function acSetActive(idx) {
    var items = panel.querySelectorAll('.ac-item');
    items.forEach(function (el) {
      el.classList.remove('ac-active');
    });
    if (idx >= 0 && idx < items.length) {
      items[idx].classList.add('ac-active');
      items[idx].scrollIntoView({ block: 'nearest' });
    }
    _acActiveIdx = idx;
  }

  function wireInput(inputId, category) {
    var el = document.getElementById(inputId);
    if (!el) return;

    el.addEventListener('input', function () {
      clearTimeout(_acTimer);
      var q = el.value;
      if (q.length < 2) {
        acHide();
        return;
      }
      _acCurrentInput = el;
      _acTimer = setTimeout(function () {
        var results = registrySearch(category, q);
        acRender(results, el);
      }, 150);
    });

    el.addEventListener('keydown', function (e) {
      if (!panel.classList.contains('ac-visible')) return;
      var itemCount = _acResults.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        acSetActive(Math.min(_acActiveIdx + 1, itemCount - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        acSetActive(Math.max(_acActiveIdx - 1, 0));
      } else if (e.key === 'Enter') {
        if (_acActiveIdx >= 0 && _acResults[_acActiveIdx]) {
          e.preventDefault();
          el.value = _acResults[_acActiveIdx].name;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          acHide();
        }
      } else if (e.key === 'Escape') {
        acHide();
      }
    });

    el.addEventListener('blur', function () {
      // 100 ms grace: mousedown on an item fires before blur resolves
      setTimeout(acHide, 120);
    });

    el.addEventListener('focus', function () {
      // Reopen if there's already enough text (e.g. user tabbed back)
      var q = el.value;
      if (q.length >= 2) {
        _acCurrentInput = el;
        var results = registrySearch(category, q);
        if (results.length) acRender(results, el);
      }
    });
  }

  // Wire all three registry-backed inputs
  wireInput('newQuestName', 'quests');
  wireInput('newItemName', 'items');
  wireInput('newPerkName', 'perks');

  // Reposition on scroll/resize so the panel doesn't orphan
  window.addEventListener(
    'scroll',
    function () {
      if (_acCurrentInput && panel.classList.contains('ac-visible')) {
        acPosition(_acCurrentInput);
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', function () {
    if (_acCurrentInput && panel.classList.contains('ac-visible')) {
      acPosition(_acCurrentInput);
    }
  });
}

// ── AMMO DATALIST ─────────────────────────────────────────────────────────
// Populates the #ammoCalibers <datalist> with unique caliber names from
// AMMO.CSV in database.js. Called once on window.onload.
function initAmmoDatalist() {
  const dl = document.getElementById('ammoCalibers');
  if (!dl) return;
  if (typeof getAmmoCalibers !== 'function') return;
  const calibers = getAmmoCalibers();
  dl.innerHTML = calibers.map(c => `<option value="${c}"></option>`).join('');
}
