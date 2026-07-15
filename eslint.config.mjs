import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        HTMLElement: 'readonly',
        AudioContext: 'readonly',
        OscillatorNode: 'readonly',
        GainNode: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        location: 'readonly',
        history: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        getComputedStyle: 'readonly',
        AbortController: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        DOMParser: 'readonly',
        XMLSerializer: 'readonly',
        indexedDB: 'readonly',
        structuredClone: 'readonly',
        queueMicrotask: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        // Service Worker globals
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        registration: 'readonly',
        skipWaiting: 'readonly',
        Cache: 'readonly',
        CacheStorage: 'readonly',
        ServiceWorkerGlobalScope: 'readonly',
        // Node/CommonJS (for config files)
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        // Project cross-file globals (shared via <script> tags)
        state: 'writable',
        APP_VERSION: 'readonly',
        MetaStore: 'readonly', // U5 device-preference key/value store (js/core/state.js)
        FACTION_REGISTRY: 'readonly',
        FACTION_REGISTRY_FO3: 'readonly',
        SKILL_KEYS: 'readonly',
        SKILL_KEYS_FO3: 'readonly',
        GAME_DEFS: 'readonly',
        THEMES: 'readonly',
        _activeDef: 'readonly',
        getFactionRegistry: 'readonly',
        getSkillKeys: 'readonly',
        RobcoEvents: 'readonly', // U7 OS event bus (js/core/state.js)
        _logEvent: 'readonly', // P4 Terminal Record structured-event writer (js/core/state.js)
        _migrateEventLog: 'readonly', // P4 [T#]→eventLog migration helper (js/core/state.js)
        switchTab: 'readonly',
        initTabs: 'readonly',
        // FO3 PIP-BOY BUILD U1 — the second nav axis (js/ui/ui-core-nav.js -> js/ui/ui-core.js)
        _applyRailGrouping: 'readonly',
        _applyRails: 'readonly',
        selectSubtab: 'readonly',
        // FO3 PIP-BOY BUILD U2 owner-feedback pass — lamp re-labeling (js/ui/ui-core-nav.js -> js/ui/ui-core.js)
        _applyFo3NavLabels: 'readonly',
        appendToChat: 'readonly',
        loadUI: 'readonly',
        saveState: 'readonly',
        migrateState: 'readonly',
        reconcileEquipped: 'readonly', // state.js — reconciles state.equipped against state.inventory (Protocol 22 shared helper)
        autoImportState: 'readonly',
        sanitizeImportedContainer: 'readonly',
        syncStateFromDom: 'readonly',
        recordLocationVisit: 'readonly',
        // FEEDBACK ANIMATION WAVE 1 — pending vars declared in state.js
        // (loaded by every environment, including tests/test.html's reduced
        // boot chain — Protocol 27), set at an emit site (api.js / ui-render.js)
        // and consumed+cleared by the render function that owns the home
        // animation (ui-render.js)
        _pendingSurveyPing: 'writable', // state.js -> ui-render.js (renderWorldMap, #26 SURVEY PING)
        _pendingQuestStamp: 'writable', // state.js -> ui-render.js/api-import.js (#23/#24 quest stamp)
        _pendingRepStamp: 'writable', // state.js -> ui-render.js/api-import.js (#14 REPUTATION STAMP)
        _pendingExhibitLight: 'writable', // state.js -> ui-render.js/api-import.js (#22 EXHIBIT LIGHT-UP)
        // FEEDBACK ANIMATION WAVE 3 — same state.js-declared pending-var
        // pattern as WAVE 1 above.
        _pendingQuestFiled: 'writable', // state.js -> ui-saves.js/ui-render.js (#25 DIRECTIVE FILED)
        _pendingPerkSeat: 'writable', // state.js -> ui-render.js (#13 CARD SEAT)
        _pendingEffectWarmup: 'writable', // state.js -> ui-render.js/api-import.js (#28 TUNGSTEN WARM-UP)
        // Diagnostic Shell U3 TRIGGERS catalog (js/dev/test-console.js) reads/writes
        // these `let` bindings declared in ui-render.js/ui-core.js directly — the
        // same shared classic-script-scope pattern as the _pendingXxx vars above.
        _facChannel: 'writable', // ui-render.js -> test-console.js (fire-pending-rep-stamp)
        setFactionChannel: 'readonly', // ui-render.js -> test-console.js
        _mapActiveZone: 'writable', // ui-render.js -> test-console.js (fire-pending-survey-ping)
        _overseerGreeted: 'writable', // ui-core.js -> test-console.js (ceremony-greet replay)
        generateSyncPayload: 'readonly',
        restoreChatHistory: 'readonly',
        chatHistory: 'writable',
        transmitMessage: 'readonly',
        _wireApiEventBusSubscribers: 'readonly', // U7 OS event bus (api-import.js)
        fetchAuthorizedModels: 'readonly',
        // api.js spine split (2.8.5 U-A3) — api.js (hub) + api-directive.js +
        // api-import.js + api-router.js now cross-reference each other exactly
        // like any other pair of sibling files; every name below moved OUT of
        // same-file scope by the split (previously needed no globals entry
        // because caller and callee shared one file).
        _commGet: 'readonly', // api.js (hub) -> api-directive.js's _directiveConstraints()
        getSystemDirective: 'readonly', // api-directive.js -> api.js (hub) transmitMessage()
        submitCommandInput: 'readonly', // api-router.js -> api.js (hub) _resetTransmitUI()
        _routeNativeCommand: 'readonly', // api-router.js -> api.js (hub) transmitMessage()
        _isPrecisePointer: 'readonly', // api-router.js -> api.js (hub) transmitMessage()
        // Visual Upload OCR Unit 2 (js/services/api-router.js) — the shared stat-token resolver/
        // clamp choke point (Native USE/TERMINAL stat edits), reused by the OCR
        // parser (js/services/ocr.js) and the OCR apply path (js/ui/ui-render.js)
        _resolveStatToken: 'readonly',
        _statTokenLabel: 'readonly',
        _applyStatToken: 'readonly',
        lookupItemInDb: 'readonly',
        lookupWeaponStats: 'readonly',
        lookupBestiaryEntry: 'readonly',
        getBestiaryNames: 'readonly', // content-aware quick-log autocomplete source (js/data/db_nv.js / js/data/db_fo3.js)
        getChemsTable: 'readonly',
        getQuestItemDetail: 'readonly', // U9-4 CONSULT reserved-column surfacing (js/data/db_nv.js or js/data/db_fo3.js)
        renderThreat: 'readonly',
        renderConsult: 'readonly',
        renderDatabankPanel: 'readonly',
        renderBioScan: 'readonly',
        renderEligiblePerks: 'readonly', // AI->native survey Part C.1 (ui-render.js), called from api.js's NATIVE_COMMAND_ROUTER
        _nativeOpenMap: 'readonly', // AI->native survey Part C.1 [GPS]/[MAP] (ui-core.js), called from api.js's NATIVE_COMMAND_ROUTER
        _nativePadBind: 'readonly', // Tool Deck + Quick-Draw Holster (ui-core.js), called from _routeNativeCommand (api-router.js)
        _nativePadFire: 'readonly', // Tool Deck + Quick-Draw Holster (ui-core.js), called from _routeNativeCommand (api-router.js)
        _openSysModal: 'readonly',
        openModal: 'readonly', // Step 2 Phase 0 U12 consolidated modal driver (ui-core.js)
        _readActiveCacheName: 'readonly', // SYSTEM STATUS active-cache-name lookup (ui-core.js), reused by ocr.js
        _chassisIdRow: 'readonly', // SYSTEM STATUS labeled-row helper (ui-core.js), reused by the Diagnostic Shell U4a INSPECT readout (test-console.js)
        _chassisBreaker: 'readonly', // SYSTEM STATUS breaker-row helper (ui-core.js), reused by the Diagnostic Shell U4a INSPECT readout (test-console.js)
        confirmAction: 'readonly', // Step 2 Phase 0 U12 diegetic confirm() replacement (ui-core.js)
        _vatsIsMelee: 'readonly',
        getGameContext: 'readonly',
        getIdentity: 'readonly', // DO-K identity keystone accessor (js/core/state.js)
        // P8 Global Immersion dial — gate helpers + pref live in state.js, the UI in ui-core.js
        getImmersionTier: 'readonly',
        immersionAllows: 'readonly',
        setImmersionTier: 'readonly',
        // Step 2 Phase 2 B1 — Command-Line MODE: device-pref accessors (js/core/state.js),
        // quick-log autocomplete source (js/services/api-router.js), quick-log setter reuse (js/ui/ui-render.js)
        getInputMode: 'readonly',
        setInputMode: 'readonly',
        otherInputMode: 'readonly',
        _commandSuggestions: 'readonly',
        _hideModeHint: 'readonly',
        _resolveCommandInput: 'readonly',
        // Small-UI-polish batch — composer auto-grow (js/ui/ui-core.js), called from
        // js/services/api.js's transmitMessage() and js/services/api-router.js's transmitTerminal()
        // after clearing #chatInput so the box resets to its small size after every send
        _autoGrowComposer: 'readonly',
        markLocationVisited: 'readonly',
        // Native "travel here" — sets the tapped sector-sheet location as CURRENT
        // (js/ui/ui-render.js), routing through the shared onLocationChange() setter
        travelToLocation: 'readonly',
        // Step 2 Phase 2 A1 — Ambient Runtime (js/core/runtime.js): lifecycle state machine + observer scheduler
        AmbientRuntime: 'readonly',
        initAmbientRuntime: 'readonly',
        initTestConsole: 'readonly', // staging/dev-only Test Console (js/dev/test-console.js)
        // Diagnostic Shell U4b (js/dev/test-console.js) — STATE SETUP cheats read/write these
        // existing native setters/mutators directly (ui-core.js/ui-render.js/ui-saves.js)
        MAX_PLAYER_LEVEL: 'readonly',
        _KARMA_TIERS: 'readonly', // BUS-09 5-band karma tiers (js/ui/ui-core-cmd.js), reused by the FO3 Karma Engine (js/ui/ui-render-factions.js getKarmaTier — Protocol 22, no new breakpoints)
        _computeEligiblePerks: 'readonly',
        _applyStatusEffect: 'readonly',
        toggleLimb: 'readonly',
        adjustAffinity: 'readonly',
        _clearErrorLog: 'readonly',
        resetSessionStats: 'readonly',
        getAmmoCalibers: 'readonly',
        getVendors: 'readonly',
        getTradeCatalog: 'readonly',
        renderTrade: 'readonly',
        renderTradeBuyList: 'readonly',
        renderTradeSellList: 'readonly',
        setTradeVendor: 'readonly',
        doBuy: 'readonly',
        doSell: 'readonly',
        renderLoot: 'readonly',
        renderLootList: 'readonly',
        renderHolster: 'readonly', // Tool Deck + Quick-Draw Holster (ui-render.js), called from ui-core.js
        _deckTargetSuggestions: 'readonly', // Tool Deck #deckTarget autocomplete source (ui-render.js), wired from ui-saves.js
        doLoot: 'readonly',
        _lootAdd: 'readonly',
        renderVisualParsePreview: 'readonly', // Visual Upload OCR Unit 2 (ui-render.js), called from js/services/ocr.js's runVisualOcr
        // Visual Upload OCR Unit 3 (js/services/ocr.js) — hybrid routing, called from
        // js/ui/ui-saves.js's handleImageSelection() and js/ui/ui-render.js's
        // renderVisualParsePreview() TRY AI VISION / onClose handlers
        routeVisualUpload: 'readonly',
        _tryAiVisionFallback: 'readonly',
        _clearVisualUploadStash: 'readonly',
        expandPanelForCategory: 'readonly',
        closeModal: 'readonly',
        playSyncTone: 'readonly',
        playClack: 'readonly',
        playPanelClick: 'readonly',
        playLevelUpJingle: 'readonly',
        playChipClick: 'readonly', // B2c Module Bay hardware SFX (ui-audio.js)
        playBoardThunk: 'readonly', // B2c Module Bay hardware SFX (ui-audio.js)
        toggleAudio: 'readonly', // ui-audio.js channel-mute setter (ui-core.js calls it via _schemSetHardwareSfx)
        triggerHaptic: 'readonly', // WU-F2 Haptic Solenoid (ui-audio.js)
        initHaptic: 'readonly', // WU-F2 Haptic Solenoid (ui-audio.js)
        initRadio: 'readonly', // WU-F5 Pip-Boy Radio (ui-audio.js)
        _radioPlaying: 'readonly', // CHASSIS LIVING CORE #10 radio-reactive signal (ui-audio.js)
        _wireAudioEventBusSubscribers: 'readonly', // U7 OS event bus (ui-audio.js)
        startHeartbeat: 'readonly',
        stopHeartbeat: 'readonly',
        playBootDrone: 'readonly',
        startThermalLoad: 'readonly',
        stopThermalLoad: 'readonly',
        // Account module cross-file globals (js/ui/ui-account.js ↔ the other ui-*.js siblings)
        renderAccount: 'readonly',
        renderSavesList: 'readonly',
        listLocalSaves: 'readonly',
        undoLastSync: 'readonly',
        _isUplinkConnected: 'readonly', // SU-4: renderAccount() reads the shared carrier signal (js/ui/ui-core.js)
        _coreRefresh: 'readonly', // CHASSIS LIVING CORE (Protocol UI-10) single choke point (js/ui/ui-core.js), called from js/ui/ui-audio.js's _updateRadioUI()
        _scrollElFor: 'readonly', // per-subsystem scroll-position lookup (js/ui/ui-core.js), reused by ui-render.js's map scroll-preserve fix
        _motionSeat: 'readonly', // Ceremony Moments Wave 1, M5 SEAT verb trigger helper (js/ui/ui-core.js), called from js/ui/ui-audio.js's _seatOpticsTube()/toggleMasterMute()
        _readOverseerLog: 'readonly', // WU-F7 Overseer's Log reader (js/ui/ui-core.js), read by js/ui/ui-audio.js's M4 _checkLongAbsence()
        // Saves module cross-file globals (js/ui/ui-saves.js ↔ the other ui-*.js siblings)
        CHAT_MAX: 'readonly',
        _chatSaveTimer: 'writable',
        initRegistryAutocomplete: 'readonly',
        restoreRollingBackup: 'readonly',
        // Render module cross-file globals (js/ui/ui-render.js ↔ the other ui-*.js siblings)
        _invFilter: 'writable',
        setInvFilter: 'readonly',
        // ui-render.js spine split (2.8.5 U-A4) — js/ui/ui-render.js (hub, now just
        // _updateContextPanels) + nine js/ui/ui-render-*.js siblings now cross-reference
        // each other exactly like the ui-core-*.js family does; only the two names below
        // moved OUT of same-file scope by the split (every other render*() cross-call
        // already had a globals entry from referencing ui-core.js/ui-saves.js).
        getFactionStanding: 'readonly', // ui-render-character.js -> ui-render-factions.js/ui-render-ledger.js
        _bioChemHasRisk: 'readonly', // ui-render-databank.js -> ui-render-inventory.js
        _syncDrawerButtons: 'readonly', // Phase 3 · Piece 2 CARGO MANIFEST drawer bank (ui-render.js)
        _DRAWER_LABELS: 'readonly', // Phase 3 · Piece 2 CARGO MANIFEST drawer labels (ui-render.js)
        _updatePanelBadges: 'readonly',
        escapeHtml: 'readonly',
        emptyState: 'readonly',
        escapeAndFormat: 'readonly',
        getTypewriterSpeed: 'readonly',
        renderInventory: 'readonly',
        renderSquad: 'readonly',
        renderStatus: 'readonly',
        _statusLampSummary: 'readonly', // Phase 3 OPERATOR batch 2 BUS-07 compound-lamp 0i summary (ui-render.js)
        _syncOperatorTelemetry: 'readonly', // PHASE 3 OPERATOR telemetry sync (js/ui/ui-core.js), called by toggleSkillBook/toggleMagazine (js/ui/ui-render.js) for the owner batch item 2 live-count fix
        _wireDynamicSubPanel: 'readonly', // owner batch item 6: dynamically-rendered sub-panel persistence helper (js/ui/ui-core.js), called by renderFactionRep() (js/ui/ui-render.js)
        renderCampaignNotes: 'readonly',
        renderFactionRep: 'readonly',
        renderPerks: 'readonly',
        renderQuests: 'readonly',
        renderSessionStats: 'readonly',
        renderEquipped: 'readonly',
        renderCampaignStatus: 'readonly',
        // Audio module cross-file globals (js/ui/ui-audio.js ↔ the other ui-*.js siblings)
        AudioSettings: 'readonly',
        audioCtx: 'writable',
        _geigerCurrentRate: 'writable',
        geigerRunning: 'writable',
        geigerTimeout: 'writable',
        crtHumGain: 'writable',
        changeOpticsColor: 'readonly',
        _applyThemeVars: 'readonly',
        _resolveDefaultOptics: 'readonly',
        _opticStorageKey: 'readonly',
        _resolveOptic: 'readonly',
        _updateOpticsDefaultLabel: 'readonly',
        // WU-optics-picker: GREEN FAMILY cartridge cross-file globals
        OPTIC_FAMILY_LABELS: 'readonly',
        _themeFamilyMembers: 'readonly',
        _resolveOpticsFamilyRepresentative: 'readonly',
        _updateOpticsFamilyRepresentative: 'readonly',
        _expandOpticsFamily: 'readonly',
        _collapseOpticsFamily: 'readonly',
        // Module Bay (Step 2 · Phase 2 · B2a) cross-file globals
        isHighLumenEnabled: 'readonly',
        isHapticEnabled: 'readonly',
        isWakeLockEnabled: 'readonly',
        _hapticSupported: 'readonly', // owner batch item 5 (js/ui/ui-audio.js), read by _updatePowerBoardStatus() (js/ui/ui-core.js)
        _seatOpticsTube: 'readonly',
        _updateOpticsBoardStatus: 'readonly',
        _updateSonicBoardStatus: 'readonly',
        _updateUplinkBoardStatus: 'readonly',
        _updatePowerBoardStatus: 'readonly', // owner batch item 5 (js/ui/ui-core.js), called from ui-audio.js's wake-lock/haptic status setters
        renderModuleBay: 'readonly',
        initModuleBay: 'readonly',
        releaseBayHatch: 'readonly',
        toggleBaySchematic: 'readonly',
        renderBaySchematic: 'readonly',
        _schemSetGeminiSync: 'readonly',
        _logBaySvc: 'readonly',
        exportCampaignLog: 'readonly',
        ejectHolotape: 'readonly',
        _svcEjectHolotape: 'readonly',
        _svcViewChangelog: 'readonly',
        _svcInstallPwa: 'readonly',
        playHeadCrippleSound: 'readonly',
        playLimbCrippleSound: 'readonly',
        playLimbRestoreSound: 'readonly',
        playWakeTone: 'readonly',
        setCrtHumIntensity: 'readonly',
        setGeigerRate: 'readonly',
        _armAmbientAudio: 'readonly',
        startCrtHum: 'readonly',
        stopCrtHum: 'readonly',
        startReactorHum: 'readonly', // LIVING CORE #6 (ui-audio.js)
        stopReactorHum: 'readonly', // LIVING CORE #6 (ui-audio.js)
        _updateReactorHumLevel: 'readonly', // LIVING CORE #6 (ui-audio.js)
        startTinnitus: 'readonly',
        stopTinnitus: 'readonly',
        runBootSequence: 'readonly',
        triggerPhosphorGhost: 'readonly',
        calendarToTicks: 'readonly',
        setupXpBarInteraction: 'readonly',
        onLvlInputChanged: 'readonly',
        onTimeInputChanged: 'readonly',
        renderKarmaCenter: 'readonly',
        _updateContextPanels: 'readonly',
        renderWorldMap: 'readonly',
        showVATSOverlay: 'readonly',
        showHelpModal: 'readonly',
        showErrorLog: 'readonly',
        updateMath: 'readonly',
        wipeTerminal: 'readonly',
        _fmtOverseerDuration: 'readonly', // WU-F7 duration formatter, reused by U9-2 CURRENT SITTING (js/ui/ui-core.js)
        _odoTile: 'readonly', // BUS-21 SERVICE TALLY digit-wheel helper (js/ui/ui-render.js), reused by CHASSIS BUS-22 renderOverseerLog()
        // Native USE + TERMINAL stat-edits (js/ui/ui-core.js A.2 shared setters) --
        // called cross-file from js/ui/ui-render.js (nativeUseItem) and
        // js/services/api-router.js (_applyStatToken/QUICK_LOG_PATTERNS' levelup handler).
        _nativeSetHp: 'readonly',
        _nativeSetRads: 'readonly',
        _nativeSetXp: 'readonly',
        _nativeSetLevel: 'readonly',
        _nativeSetSpecial: 'readonly',
        _nativeSetSkill: 'readonly',
        _nativeSetKarma: 'readonly',
        _nativeSetCaps: 'readonly',
        nativeLevelUp: 'readonly',
        attachedImageData: 'writable',
        attachedImageMimeType: 'writable',
        _buildFactions: 'readonly',
        _saveTimer: 'writable',
        renderAmmo: 'readonly',
        addAmmo: 'readonly',
        removeAmmo: 'readonly',
        initAmmoDatalist: 'readonly',
        initLocationDatalist: 'readonly',
        // Fallout Data Registry (js/data/reg_nv.js or js/data/reg_fo3.js)
        FALLOUT_REGISTRY: 'readonly',
        SKILL_LABELS: 'readonly',
        registrySearch: 'readonly',
        renderCollectibles: 'readonly',
        renderLincolnMemorabilia: 'readonly',
        toggleLincolnItem: 'readonly',
        setLincolnDisposition: 'readonly',
        renderTraits: 'readonly',
        toggleTrait: 'readonly',
        renderSkillBooks: 'readonly',
        toggleSkillBook: 'readonly',
        renderMagazines: 'readonly',
        toggleMagazine: 'readonly',
        renderCraft: 'readonly',
        setCraftFilter: 'readonly',
        craftSetMax: 'readonly',
        doCraft: 'readonly',
        doScrap: 'readonly',
        _craftGetHave: 'readonly',
        // Time system (js/ui/ui-render.js)
        formatGameTime: 'readonly',
        _resolveGameDateTime: 'readonly',
        getGameDate: 'readonly',
        renderGameDate: 'readonly',
        // Faction reputation editing (js/ui/ui-render.js)
        adjustFaction: 'readonly',
        // Location field change handler (js/ui/ui-core-cmd.js)
        onLocationChange: 'readonly',
        // Map view toggle handler (js/ui/ui-render.js)
        setMapView: 'readonly',
        // Game database CSVs (js/data/db_nv.js or js/data/db_fo3.js)
        databaseCSVs: 'readonly',
        // ui-core.js spine split (2.8.5 U-A1) — js/ui/ui-core.js (hub) + js/ui-core-nav.js +
        // js/ui-core-overseer.js + js/ui-core-chassis.js + js/ui-core-modulebay.js +
        // js/ui-core-cmd.js now cross-reference each other exactly like any other pair of
        // sibling ui-*.js files; every name below moved OUT of same-file scope by the split
        // (previously needed no globals entry because caller and callee shared one file).
        _readErrorLog: 'readonly',
        _overseerRestState: 'readonly',
        _overseerRestSignals: 'readonly',
        selectSubsystem: 'readonly',
        getOverseerState: 'readonly',
        _emitStatChangeIfDiffers: 'readonly',
        closeToolDeck: 'readonly',
        _disarmHolsterBind: 'readonly',
        _holsterBinding: 'writable',
        _armScopeLoop: 'readonly',
        showFullChangelog: 'readonly',
        _pendingDirectivesCount: 'readonly',
        _maybeGreetOverseer: 'readonly',
        _updateFaultLamp: 'readonly',
        _updateUplinkLamp: 'readonly',
        _refreshBezelTelemetry: 'readonly',
        renderSystemStatus: 'readonly',
        _openAiUplinkSlot: 'readonly',
        _coreFlare: 'readonly',
        _coreMilestonePulse: 'readonly',
        _updatePwrLamp: 'readonly',
        _lastScrollSubsystem: 'writable',
        _restoreScrollFor: 'readonly',
        _syncCampaignProfileUI: 'readonly',
        _syncInterlockUI: 'readonly',
        _wireTempoDialDrag: 'readonly',
        _renderModePill: 'readonly',
        _wireModeHint: 'readonly',
        _wireComposerAutoGrow: 'readonly',
        _wireCoreEventBusSubscribers: 'readonly',
        _wireChassisCoreEventBusSubscribers: 'readonly',
        _wireFeedbackEchoSubscribers: 'readonly',
        _wireLocationCardSubscriber: 'readonly',
        _initBezelChrome: 'readonly',
        setupHpBarInteraction: 'readonly',
        setupRadBarInteraction: 'readonly',
        _wireBioHarnessZones: 'readonly',
        _wireFaderDrag: 'readonly',
        initWakeLock: 'readonly',
        initOverseerLog: 'readonly',
        initHighLumen: 'readonly',
        initImmersion: 'readonly',
        initOverseerScope: 'readonly',
        initChassisCore: 'readonly',
        _wireToolDeck: 'readonly',
        _wireKeyboardShortcuts: 'readonly',
        _wireInputHistoryNav: 'readonly',
        routeLaunchShortcut: 'readonly',
        renderSkills: 'readonly',
        _syncBioHarnessZones: 'readonly',
        updateKarmaUI: 'readonly',
        renderOverseerLog: 'readonly',
        _paintWeighBridge: 'readonly',
        _runCampaignIgnition: 'readonly',
        _lastCoreUptimeMilestone: 'writable',
        COMMAND_REGISTRY: 'readonly',
      },
    },
    rules: {
      // Catch real bugs
      'no-undef': 'error',
      'no-redeclare': 'off', // Cross-file globals are declared in config AND defined in source
      'no-unused-vars': [
        'warn',
        {
          vars: 'local', // top-level declarations are cross-file global API — only check local scope
          argsIgnorePattern: '^_|^e$|^err$',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_$|^e$|^err$', // catch (e) / catch (_) patterns
        },
      ],
      'no-constant-condition': 'warn',
      'no-debugger': 'warn',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-unreachable': 'error',
      'no-unsafe-negation': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // Permissive on style — Prettier handles formatting
      'no-extra-semi': 'off',
      semi: 'off',
      quotes: 'off',
      indent: 'off',
      'comma-dangle': 'off',
    },
  },
  // cloud.js uses ES module syntax (import/export)
  {
    files: ['js/services/cloud.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        // api-import.js globals consumed by the ES module
        sanitizeImportedContainer: 'readonly',
        autoImportState: 'readonly',
        restoreChatHistory: 'readonly', // ui-saves.js
        playSyncTone: 'readonly', // ui-audio.js
        state: 'writable',
        APP_VERSION: 'readonly',
        // ui-core.js globals (Step 2 Phase 0 U12 modal driver)
        openModal: 'readonly',
        confirmAction: 'readonly',
      },
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'dist-staging/',
      '_site/',
      '*.min.js',
      'eslint.config.mjs',
      'tests/render-check.mjs',
      'tests/render-integrity.mjs',
      'tests/boot-smoke.mjs',
      'tests/a11y-check.mjs',
      'tests/test-html-check.mjs',
      'tests/browser-server.mjs',
      'tests/browser-shared.mjs',
      'tests/save-survival.mjs',
      'tests/_diag*.mjs',
      'planning/', // gitignored scratch/planning scripts — never shipped, not lint-covered
      'scripts/cf-staging-build.mjs',
      'js/vendor/', // vendored third-party dependency (Visual Upload OCR, Unit 1) — not our code
    ],
  },
];
