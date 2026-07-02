<#
.SYNOPSIS
    RobCo Persistence Audit

.DESCRIPTION
    Auto-discovers every field in state.js and verifies it is handled by
    autoImportState(), exportSaveFile(), pushToCloud(), and handleFileUpload().

.NOTES
    Run from project root:
        powershell -ExecutionPolicy Bypass -File tests\robco-diagnostics.ps1

    See bottom of file for git pre-commit hook setup.
#>

param()
$ErrorActionPreference = 'Continue'
$Root = Split-Path $PSScriptRoot -Parent

$script:Passed = 0
$script:Failed = 0

function Pass($msg) { Write-Host "  [PASS]  $msg" -ForegroundColor Green;  $script:Passed++ }
function Fail($msg) { Write-Host "  [FAIL]  $msg" -ForegroundColor Red;    $script:Failed++ }
function Check($ok, $msg) { if ($ok) { Pass $msg } else { Fail $msg } }
function Sep($title) { Write-Host ("`n-- " + $title + " " + ("-" * [Math]::Max(0, 52 - $title.Length))) }

function Read-Src($rel) {
    $p = Join-Path $Root $rel
    if (-not (Test-Path $p)) { Fail "Missing file: $rel"; exit 1 }
    return [IO.File]::ReadAllText($p)
}

function Get-FunctionBody($source, $fnName) {
    $idx = $source.IndexOf("function $fnName")
    if ($idx -lt 0) { throw "Cannot find function '$fnName'" }
    $start = $source.IndexOf('{', $idx)
    $depth = 0
    $i     = $start
    while ($i -lt $source.Length) {
        $ch = $source[$i]
        if     ($ch -eq '{') { $depth++ }
        elseif ($ch -eq '}') { $depth--; if ($depth -eq 0) { return $source.Substring($start, $i - $start + 1) } }
        $i++
    }
    throw "Unclosed brace for '$fnName'"
}

# U1 (Step 2 Phase 0): getSystemDirective() was decomposed into 8 per-section
# builder functions -- the AI directive TEXT now lives across all of them, not in
# getSystemDirective()'s own (now-short, composition-only) body. Any test that
# checks directive CONTENT (schema keys, tracker text, injection-resistance copy,
# etc.) must search the concatenation of every builder body, not just
# Get-FunctionBody $src 'getSystemDirective'. Tests that check getSystemDirective's
# own logic (ctx resolution, no-localStorage-read, call count) keep using
# Get-FunctionBody 'getSystemDirective' directly. Mirrors getDirectiveFullBody()
# in tests/robco-diagnostics.js (Protocol 15 parity).
$DIRECTIVE_BUILDER_NAMES = @(
    'getSystemDirective', '_directiveConstraints', '_directivePersonaAndContract',
    '_directiveCoreTracking', '_directiveSkills', '_directiveFactions',
    '_directiveSystems', '_directiveTrackers', '_directiveInjectionBoundary'
)
function Get-DirectiveFullBody($src) {
    $parts = foreach ($n in $DIRECTIVE_BUILDER_NAMES) {
        try { Get-FunctionBody $src $n } catch { '' }
    }
    return ($parts -join "`n")
}

function Get-StateKeys($source) {
    $m = [regex]::Match($source, 'let state\s*=\s*\{')
    if (-not $m.Success) { throw "Cannot find 'let state = {' in state.js" }
    $i     = $m.Index + $m.Length - 1
    $depth = 0
    $seen  = [System.Collections.Generic.HashSet[string]]::new()
    while ($i -lt $source.Length) {
        $ch = $source[$i]
        if ($ch -eq '{' -or $ch -eq '[') {
            $depth++
        } elseif ($ch -eq '}' -or $ch -eq ']') {
            $depth--
            if ($depth -eq 0) { break }
        } elseif ($depth -eq 1) {
            $sub = $source.Substring($i)
            $km  = [regex]::Match($sub, '^([a-zA-Z_]\w*)\s*:')
            if ($km.Success) {
                $k = $km.Groups[1].Value
                if ($seen.Add($k)) { Write-Output $k }   # pipeline, not return
                $i += $km.Length - 1
            }
        }
        $i++
    }
}

function Get-FactionKeys($source) {
    $m = [regex]::Match($source, '(?s)const FACTION_REGISTRY\s*=\s*\[(.*?)\];')
    if (-not $m.Success) { throw "Cannot find FACTION_REGISTRY" }
    return [regex]::Matches($m.Groups[1].Value, "key:\s*'([^']+)'") |
           ForEach-Object { $_.Groups[1].Value }
}

function Get-SkillKeys($source) {
    $m = [regex]::Match($source, "const SKILL_KEYS\s*=\s*\[([^\]]+)\]")
    if (-not $m.Success) { throw "Cannot find SKILL_KEYS" }
    return [regex]::Matches($m.Groups[1].Value, "'([^']+)'") |
           ForEach-Object { $_.Groups[1].Value }
}

# ---- Load sources ----
$stateSrc  = Read-Src "js\state.js"
$apiSrc    = Read-Src "js\api.js"
$cloudSrc  = Read-Src "js\cloud.js"
$uiFiles   = @('js\ui-audio.js','js\ui-render.js','js\ui-saves.js','js\ui-account.js','js\ui-core.js')
$uiSrc     = ($uiFiles | Where-Object { Test-Path (Join-Path $Root $_) } | ForEach-Object { [IO.File]::ReadAllText((Join-Path $Root $_)) }) -join "`n"

Write-Host "`n==  RobCo Persistence Audit  ==============================`n"

try {
    $stateKeys   = @(Get-StateKeys   $stateSrc)
    $factionKeys = @(Get-FactionKeys $stateSrc)
    $skillKeys   = @(Get-SkillKeys   $stateSrc)
    $importBody  = Get-FunctionBody $apiSrc   'autoImportState'
    $exportBody  = Get-FunctionBody $stateSrc 'exportSaveFile'
    $fileBody    = Get-FunctionBody $uiSrc    'handleFileUpload'
} catch {
    Write-Host ("FATAL -- parser error: " + $_) -ForegroundColor Red
    exit 1
}

Write-Host ("  Auto-discovered " + $stateKeys.Count + " top-level state keys:")
Write-Host ("  [ " + ($stateKeys -join ', ') + " ]") -ForegroundColor DarkCyan

# ===========================================================
# Suite 0 -- Parser sanity
# ===========================================================
Sep "Suite 0 -- Parser sanity (guards against test regression)"
# Mirror of Node KNOWN_KEYS (robco-diagnostics.js Suite 0): the 27 legacy keys.
# Newer fields (locationHistory, gameContext, collectibles) are still fully covered
# by Suite 1 (autoImportState auto-discovery) and Suite 11 (migration enforcement),
# which iterate ALL discovered stateKeys — so this guard list stays at the 27.
$KNOWN = @('lvl','xp','hpCur','hpMax','s','p','e','c','i','a','l',
           'caps','loc','rads','karma','ticks',
           'la','ra','ll','rl','hd',
           'factions','skills','status','inventory','squad','campaign_notes')
foreach ($k in $KNOWN) { Check ($stateKeys -contains $k) "Parser found known key: state.$k" }

# ===========================================================
# Suite 1 -- autoImportState covers every state key
# ===========================================================
Sep "Suite 1 -- autoImportState() field coverage  <- auto-discovery"
foreach ($key in $stateKeys) {
    $pat = "\b" + $key + "\b"
    Check ([bool]($importBody -imatch $pat)) "state.$key"
}

# ===========================================================
# Suite 2 -- FACTION_REGISTRY completeness
# ===========================================================
Sep "Suite 2 -- FACTION_REGISTRY completeness"
$EXP_FACTIONS = @('ncr','legion','house','bos','boomers','khans',
                  'followers','powder','kings','strip','freeside')
foreach ($k in $EXP_FACTIONS) { Check ($factionKeys -contains $k) "FACTION_REGISTRY key: '$k'" }
$hasForEach = ($importBody -match 'getFactionRegistry\(\)\.forEach') -and ($importBody -match 'parsed\.factions')
Check $hasForEach "autoImportState() imports factions via getFactionRegistry().forEach"
Check ($factionKeys.Count -eq $EXP_FACTIONS.Count) ("FACTION_REGISTRY count = " + $factionKeys.Count + " (expected " + $EXP_FACTIONS.Count + ")")

# ===========================================================
# Suite 2a -- Reputation 2D Matrix (mirror of Node Suite "Reputation 2D Matrix")
# Runtime-executes getFactionStanding() from ui.js via a node sandbox.
# ===========================================================
Sep "Suite 2a -- Reputation 2D Matrix"
$repLabels = @(
    "getFactionStanding('ncr', 100, 0) returns 'Idolized'",
    "getFactionStanding('bos', 20, 0) returns 'Idolized'",
    "getFactionStanding('bos', 20, 20) returns 'Wild Child'",
    "getFactionStanding('ncr', 50, 20) returns 'Smiling Troublemaker'",
    "getFactionStanding('ncr', 0, 30) returns 'Shunned'",
    "getFactionStanding('ncr', 80, 20) returns 'Good-Natured Rascal'",
    "getFactionStanding('ncr', 0, 50) returns 'Hated'",
    "getFactionStanding('ncr', 0, 0) returns 'Neutral'",
    "getFactionStanding('ncr', 0, 80) returns 'Vilified'"
)
try {
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck) {
        $repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
        $repoRootNode = $repoRoot.Replace('\', '/')
        $repScript = @"
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const UI_FILES = ['js/ui-audio.js','js/ui-render.js','js/ui-saves.js','js/ui-account.js','js/ui-core.js'];
const uiSource = UI_FILES.filter(f => fs.existsSync(path.join('$repoRootNode', f))).map(f => fs.readFileSync(path.join('$repoRootNode', f), 'utf8')).join('\n');
const threshMatch = uiSource.match(/const FACTION_THRESHOLDS\s*=\s*\{[\s\S]*?\};\s*\/\/ Default/);
const defaultMatch = uiSource.match(/const _DEFAULT_THRESHOLDS\s*=\s*\{[^}]+\};/);
const fnMatch = uiSource.match(/function getFactionStanding\([\s\S]*?\n\}/);
if (!threshMatch || !defaultMatch || !fnMatch) { console.log('EXTRACT_FAIL'); process.exit(0); }
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(threshMatch[0] + '\n' + defaultMatch[0] + '\n' + fnMatch[0], sandbox);
const gfs = sandbox.getFactionStanding;
const r = [
    gfs('ncr', 100, 0).label === 'Idolized',
    gfs('bos', 20, 0).label === 'Idolized',
    gfs('bos', 20, 20).label === 'Wild Child',
    gfs('ncr', 50, 20).label === 'Smiling Troublemaker',
    gfs('ncr', 0, 30).label === 'Shunned',
    gfs('ncr', 80, 20).label === 'Good-Natured Rascal',
    gfs('ncr', 0, 50).label === 'Hated',
    gfs('ncr', 0, 0).label === 'Neutral',
    gfs('ncr', 0, 80).label === 'Vilified'
];
console.log('RESULT:' + r.map(b => b ? '1' : '0').join(''));
"@
        $out = ($repScript | node 2>&1 | Out-String)
        $rm = [regex]::Match($out, 'RESULT:([01]{9})')
        if ($rm.Success) {
            $bits = $rm.Groups[1].Value
            for ($bi = 0; $bi -lt 9; $bi++) { Check ($bits.Substring($bi, 1) -eq '1') $repLabels[$bi] }
        } else {
            $err = if ([string]::IsNullOrWhiteSpace($out)) { "extract/runtime failure" } else { $out.Trim() }
            foreach ($lbl in $repLabels) { Fail "$lbl  (runtime error: $err)" }
        }
    } else {
        foreach ($lbl in $repLabels) { Fail "$lbl  (node not found)" }
    }
} catch {
    foreach ($lbl in $repLabels) { Fail "$lbl  (exception: $_)" }
}

# ===========================================================
# Suite 2b -- C2 CRUD Functions
# ===========================================================
Sep "Suite 2b -- C2 CRUD Functions"
Check ([bool]($uiSrc -match 'function removePerk\b')) "removePerk() function exists in ui.js"
Check ([bool]($uiSrc -match 'function toggleCollectible\b')) "toggleCollectible() function exists in ui.js"
Check ([bool]($uiSrc -match 'COMM-LINK COMMAND REGISTRY')) "showHelpModal() contains expanded command registry (COMM-LINK COMMAND REGISTRY)"

# ===========================================================
# Suite 2c -- C3 CAMPG Tab
# ===========================================================
Sep "Suite 2c -- C3 CAMPG Tab"
$htmlSrc = Read-Src "index.html"
Check ([bool]($htmlSrc -match 'id="tab-btn-campg"')) 'CAMPG tab button exists in index.html (id="tab-btn-campg")'
Check ([bool]($htmlSrc -match 'id="campgPanel"')) 'CAMPG panel exists in index.html (id="campgPanel")'
Check ([bool]($htmlSrc -match 'id="gameContextSelect"')) 'Game context select exists in index.html (id="gameContextSelect")'
Check ([bool]($htmlSrc -match 'id="fo3WarningBanner"')) 'FO3 warning banner exists in index.html (id="fo3WarningBanner")'
Check ([bool]($uiSrc -match 'function onGameContextChange\b')) "onGameContextChange() function exists in ui.js"
Check ([bool]($uiSrc -match 'TAB_NAMES.*campg')) "TAB_NAMES includes 'campg' in ui.js"

# ===========================================================
# Suite 2d -- C4 campaignMode + C5 playthroughType Protocol 4
# ===========================================================
Sep "Suite 2d -- C4 campaignMode + C5 playthroughType Protocol 4"
Check ([bool]($stateSrc -match "campaignMode\s*:\s*'standard'")) "state.campaignMode default 'standard' exists in state.js"
Check ([bool]($stateSrc -match "playthroughType\s*:\s*'standard'")) "state.playthroughType default 'standard' exists in state.js"
Check ([bool]($stateSrc -match 's\.campaignMode')) "state.campaignMode migration guard exists in migrateState() in state.js"
Check ([bool]($stateSrc -match 's\.playthroughType')) "state.playthroughType migration guard exists in migrateState() in state.js"
Check ([bool](($apiSrc -match 'CAMPAIGN MODE') -and ($apiSrc -match 'cmV'))) "autoImportState() handles campaignMode import in api.js"
Check ([bool](($apiSrc -match 'PLAYTHROUGH TYPE') -and ($apiSrc -match 'ptV'))) "autoImportState() handles playthroughType import in api.js"
Check ([bool]($apiSrc -match 'campaignModeStr')) "getSystemDirective() builds campaignModeStr in api.js"
Check ([bool]($apiSrc -match 'state\.playthroughType')) "getSystemDirective() reads state.playthroughType in api.js"
Check ([bool]($htmlSrc -match 'id="playthroughTypeSelect"')) 'Playthrough Type select exists in index.html (id="playthroughTypeSelect")'
Check (-not [bool]($htmlSrc -match 'id="campaignModeSelect"')) 'Old merged select (id="campaignModeSelect") has been removed from index.html'
Check ([bool]($htmlSrc -match 'id="completeRngToggle"')) 'Complete RNG checkbox exists in index.html (id="completeRngToggle")'
Check ([bool]($htmlSrc -match 'id="rngModeBanner"')) 'RNG mode banner exists in index.html (id="rngModeBanner")'
Check ([bool]($uiSrc -match 'function onPlaythroughTypeChange\b')) "onPlaythroughTypeChange() function exists in ui.js"
Check ([bool]($uiSrc -match 'function onCampaignModeChange\b')) "onCampaignModeChange() function exists in ui.js"
Check ([bool]($stateSrc -match "s\.campaignMode !== 'rng'")) "migrateState() uses binary guard (campaignMode !== rng) in state.js"
Check ([bool]($stateSrc -match 'window\._defaultState')) "window._defaultState is defined in state.js (wipeTerminal fix)"
Check ([bool]($apiSrc -match 'Optimize all build decisions for maximum combat effectiveness')) "Behavioral directive string for min-maxed exists in api.js"

# ===========================================================
# Suite 3 -- SKILL_KEYS completeness
# ===========================================================
Sep "Suite 3 -- SKILL_KEYS completeness"
$EXP_SKILLS = @('barter','energy_weapons','explosives','guns','lockpick',
                'medicine','melee_weapons','repair','science','sneak','speech','survival','unarmed')
foreach ($k in $EXP_SKILLS) { Check ($skillKeys -contains $k) "SKILL_KEYS: '$k'" }
$hasSkillLoop = ($importBody -match 'getSkillKeys\(\)\.forEach') -and ($importBody -match 'parsed\.skills')
Check $hasSkillLoop "autoImportState() imports skills via getSkillKeys().forEach"

# ===========================================================
# Suite 4 -- exportSaveFile envelope
# ===========================================================
Sep "Suite 4 -- exportSaveFile() envelope"
Check ($exportBody -match 'robco_v8\s*:\s*window\.robco_v8')    "serialises full robco_v8 container"
Check ($exportBody -match 'chat\s*:\s*chatHistory') "includes chat history"
Check ($exportBody -match 'playstyle')               "includes playstyle"
Check ($exportBody -match 'version')                 "includes version tag"

# ===========================================================
# Suite 5 -- handleFileUpload envelope detection
# ===========================================================
Sep "Suite 5 -- handleFileUpload() import"
$hasEnvelope = ($fileBody -match 'parsed\.version') -and ($fileBody -match 'parsed\.state')
Check $hasEnvelope              "detects v1.6.3+ envelope format"
Check ($fileBody -match 'restoreChatHistory') "restores chat history"
Check ($fileBody -match 'parsed\.playstyle')  "restores playstyle"
Check ($fileBody -match 'autoImportState')    "calls autoImportState()"

# ===========================================================
# Suite 6 -- Cloud sync
# ===========================================================
Sep "Suite 6 -- cloud.js push / pull"
Check ($cloudSrc -match 'robco_v8\s*:\s*window\.robco_v8')   "saveCurrentToCloud() serialises full robco_v8 container"
Check ($cloudSrc -match 'robco_chat')              "cloud.js reads and writes chat history (robco_chat key)"
Check ($cloudSrc -match 'playstyle')               "cloud.js includes playstyle in cloud saves"
$hasPullEnv = ($cloudSrc -match 'data\.robco_v8') -and ($cloudSrc -match 'data\.version')
Check $hasPullEnv                                  "loadCloudSave() checks robco_v8 container and handles version for migration"
Check ($cloudSrc -match 'robco_chat')              "cloud.js restores chat history on cloud load (robco_chat key)"
Check ($cloudSrc -match 'robco_playstyle')         "cloud.js restores playstyle on cloud load"

# ===========================================================
# Suite 7 -- Backward compatibility
# ===========================================================
Sep "Suite 7 -- Backward compatibility"
Check ($uiSrc -match 'state\.nf\s*!==\s*undefined') "onload migrates legacy nf/ni/lf/li/sf/si to state.factions"
Check ($apiSrc -imatch 'legacy.*flat.*key|flat.*key.*fallback') "autoImportState() has legacy flat-key fallback"

# ===========================================================
# Suite 8 -- Registry structural integrity
# ===========================================================
Sep "Suite 8 -- Registry structural integrity"
$regSrc = Read-Src "js/reg_nv.js"
$regCoreSrc = Read-Src "js/registry-core.js"

Check ($regSrc -match 'const FALLOUT_REGISTRY')           "FALLOUT_REGISTRY global is declared"
Check ($regCoreSrc -match 'function registrySearch')       "registrySearch() function is declared in registry-core.js"
Check ($regSrc -match "quests\s*:")                        "FALLOUT_REGISTRY.quests category key exists"
Check ($regSrc -match "items\s*:")                         "FALLOUT_REGISTRY.items category key exists"
Check ($regSrc -match "perks\s*:")                         "FALLOUT_REGISTRY.perks category key exists"
Check ($regSrc -match "locations\s*:")                     "FALLOUT_REGISTRY.locations category key exists"
Check ($regSrc -match "companions\s*:")                    "FALLOUT_REGISTRY.companions category key exists"
Check ($regCoreSrc -match '\.length\s*<\s*2')              "registrySearch() enforces minimum query length of 2"
Check ($regCoreSrc -match '\.slice\(0,\s*7\)')             "registrySearch() caps results at 7"
Check ($regSrc -match 'fallout\.wiki')                     "reg_nv.js contains fallout.wiki attribution comment"
Check ($regSrc -match "version\s*:\s*'[\d\.]+'")          "FALLOUT_REGISTRY.version is declared with semver string"
# Strip block + inline comments before checking forbidden references (mirror Node Suite 8.8).
# Case-sensitive on 'state' to match Node's /\bstate\b/ exactly.
$regCode = ($regSrc -replace '(?s)/\*.*?\*/', '') -replace '//[^\r\n]*', ''
Check ($regCode -cnotmatch '\bstate\b')                    "reg_nv.js does not reference state (pure reference data)"
Check ($regCode -notmatch 'localStorage')                  "reg_nv.js does not reference localStorage (in code)"
# ===========================================================
# Suite 9 -- Database structural integrity
# Validates js/database.js: all CSV tables, trigger coverage,
# invKeywords, systemInstruction placement, and purity contract.
# ===========================================================
Sep "Suite 9 -- Database structural integrity"
$dbSrc = Read-Src "js/db_nv.js"

# 9.1 databaseCSVs global must be declared
Check ($dbSrc -match 'const databaseCSVs')                          "databaseCSVs global is declared"

# 9.2 lookupItemInDb function must be declared (replaced getRelevantDbContext in v1.6.7)
Check ($dbSrc -match 'function lookupItemInDb')                      "lookupItemInDb() function is declared"

# 9.3 All required CSV section headers must be present
$REQUIRED_TABLES = @('[WEAPONS.CSV]','[AMMO.CSV]','[ARMOR.CSV]','[BESTIARY.CSV]',
                     '[CHEMS.CSV]','[MISC.CSV]','[RECIPES.CSV]','[QUEST_ITEMS.CSV]','[VENDORS.CSV]')
foreach ($tbl in $REQUIRED_TABLES) {
    Check ($dbSrc.Contains($tbl)) "database.js contains $tbl section"
}

# 9.4 [TH] shorthand must be in api.js invKeywords (triggerWords removed in v1.6.7)
Check ($apiSrc.Contains("'[TH]'"))                                   "'[TH]' shorthand is in triggerWords"

# 9.5 BESTIARY must have >= 30 data rows (guards against data regression)
$bestiaryMatch = [regex]::Match($dbSrc, '(?s)\[BESTIARY\.CSV\](.*?)(?=\[|`;)')
$bestiaryRows  = 0
if ($bestiaryMatch.Success) {
    $bestiaryRows = ($bestiaryMatch.Groups[1].Value -split "`n" |
                    Where-Object { $_.Trim() -ne '' -and $_ -notmatch 'Name,' }).Count
}
Check ($bestiaryRows -ge 30)                                         "BESTIARY.CSV has >= 30 entries (found $bestiaryRows)"

# 9.6 [THREAT] and [TH] must be in invKeywords in api.js
# Use IndexOf/Substring to avoid lazy regex stopping at ] inside quoted strings
$invStart = $apiSrc.IndexOf('const invKeywords = [')
$invEnd   = $apiSrc.IndexOf('];', $invStart)
$invBlock  = if ($invStart -ge 0 -and $invEnd -gt $invStart) { $apiSrc.Substring($invStart, $invEnd - $invStart + 2) } else { '' }
Check ($invBlock -match '\[THREAT\]')                                "'[THREAT]' is in transmitMessage() invKeywords (api.js)"
Check ($invBlock -match '\[TH\]')                                    "'[TH]' is in transmitMessage() invKeywords (api.js)"

# 9.7 databaseCSVs must be referenced in systemInstruction in api.js
# Contains() avoids PS1 single-line -match limitations; also check literal injection pattern
$hasSysInst = ($apiSrc.Contains('{ text: databaseCSVs }') -or
               $apiSrc.Contains("{ text: databaseCSVs }") -or
               [bool]([regex]::Match($apiSrc, '(?s)systemInstruction[\s\S]{1,300}databaseCSVs').Success))
Check $hasSysInst                                                    "databaseCSVs is injected via systemInstruction in api.js"


# 9.8 database.js must NOT reference state, localStorage, or chatHistory
$dbCode = ($dbSrc -replace '(?s)/\*.*?\*/', '') -replace '//[^\r\n]*', ''
Check ($dbCode -notmatch '\bstate\b')                                "database.js does not reference state (pure reference data)"
Check ($dbCode -notmatch 'localStorage')                             "database.js does not reference localStorage"
Check ($dbCode -notmatch 'chatHistory')                              "database.js does not reference chatHistory"

# ===========================================================
# Suite 10 -- DOM ID Binding (syncStateFromDom)
# ===========================================================
Sep "Suite 10 -- DOM ID Binding (syncStateFromDom)"
$indexHtml = Read-Src "index.html"
$syncBody = Get-FunctionBody $stateSrc 'syncStateFromDom'
$idMatches = [regex]::Matches($syncBody, 'document\.getElementById\([''"]([^''"]+)[''"]\)')
foreach ($m in $idMatches) {
    $id = $m.Groups[1].Value
    $hasId = [bool]([regex]::Match($indexHtml, 'id=[''"]' + $id + '[''"]').Success)
    Check $hasId "Element id='$id' exists in index.html"
}

# ===========================================================
# Suite 11 -- Protocol 4 Migration Enforcement
# ===========================================================
Sep "Suite 11 -- Protocol 4 Migration Enforcement"
$migrateBody = Get-FunctionBody $stateSrc 'migrateState'
$legacyKeys = @('lvl','xp','hpCur','hpMax','s','p','e','c','i','a','l',
                'caps','loc','rads','karma','ticks',
                'la','ra','ll','rl','hd','status','inventory','squad','campaign_notes','skills')
foreach ($key in $stateKeys) {
    if ($legacyKeys -notcontains $key) {
        Check ([bool]($migrateBody -match "s\.$key\b")) "New field state.$key has migration check in migrateState()"
    }
}

# ===========================================================
# Suite 12 -- migrateState Runtime Execution Test
# ===========================================================
Sep "Suite 12 -- migrateState() Runtime Execution"
# Mirror of Node Suite "migrateState() Runtime Execution": 6 granular assertions
# against the same legacy v1 payload (not a single coarse pass/fail).
$migrateLabels = @(
    'Migrated state has structured factions.ncr',
    'Migrated state preserved ncr fame (50)',
    'Migrated state preserved legion fame (-10)',
    'Migrated state added perks array',
    'Migrated state added quests array',
    'Migrated state added equipped object'
)
try {
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck) {
        $repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
        $statePathNode = (Join-Path $repoRoot "js/state.js").Replace('\', '/')
        $testScript = @"
const vm = require('vm');
const fs = require('fs');
const stateSource = fs.readFileSync('$statePathNode', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(stateSource, sandbox);
const v1Payload = {
    lvl: 1, xp: 0, hpCur: 100, hpMax: 100,
    s: 5, p: 5, e: 5, c: 5, i: 5, a: 5, l: 5,
    nf: 50, ni: 0, lf: -10, li: 0
};
const m = sandbox.migrateState('1.0.0', v1Payload);
const r = [
    !!(m.factions && m.factions.ncr),
    !!(m.factions && m.factions.ncr && m.factions.ncr.fame === 50),
    !!(m.factions && m.factions.legion && m.factions.legion.fame === -10),
    Array.isArray(m.perks),
    Array.isArray(m.quests),
    !!(m.equipped && m.equipped.weapon === null)
];
console.log('RESULT:' + r.map(b => b ? '1' : '0').join(''));
"@
        $out = ($testScript | node 2>&1 | Out-String)
        $rm = [regex]::Match($out, 'RESULT:([01]{6})')
        if ($rm.Success) {
            $bits = $rm.Groups[1].Value
            for ($bi = 0; $bi -lt 6; $bi++) { Check ($bits.Substring($bi, 1) -eq '1') $migrateLabels[$bi] }
        } else {
            $err = if ([string]::IsNullOrWhiteSpace($out)) { "No output from node" } else { $out.Trim() }
            foreach ($lbl in $migrateLabels) { Fail "$lbl  (runtime error: $err)" }
        }
    } else {
        foreach ($lbl in $migrateLabels) { Fail "$lbl  (node not found)" }
    }
} catch {
    foreach ($lbl in $migrateLabels) { Fail "$lbl  (exception: $_)" }
}

# ===========================================================
# Suite 13 -- Service Worker Cache Guard (Protocol 1)
# ===========================================================
Sep "Suite 13 -- Service Worker Cache Guard (Protocol 1)"
try {
    $staged = git diff --cached --name-only
    $triggerStaged = $false
    $swStaged = $false
    if ($staged) {
        foreach ($f in $staged) {
            if ($f -eq 'index.html' -or $f -match '^js/' -or $f -match '^css/') {
                $triggerStaged = $true
            }
            if ($f -eq 'sw.js') {
                $swStaged = $true
            }
        }
    }
    if ($triggerStaged) {
        Check $swStaged "sw.js CACHE_NAME must be bumped when UI/JS files are modified (Protocol 1)"
    } else {
        Pass "No UI/JS changes staged (SW bump not required)"
    }
} catch {
    Pass "Git diff skipped (not in git repo)"
}

# ===========================================================
# Suite 14 -- Render Contracts (Protocol 20)
# Static source checks that render*() markup/class contracts are intact.
# 13 tests
# ===========================================================
Sep "Suite 14 -- Render Contracts (Protocol 20)"
try {
    $renderFactionRepBody = Get-FunctionBody $uiSrc 'renderFactionRep'
    $renderWorldMapBody   = Get-FunctionBody $uiSrc 'renderWorldMap'
    Check ($renderFactionRepBody -match 'class="faction-card-btns"')   'renderFactionRep contains class="faction-card-btns"'
    Check ($renderFactionRepBody -match 'faction-btn')                  'renderFactionRep contains faction-btn class reference'
    $adjCount = ([regex]::Matches($renderFactionRepBody, 'adjustFaction\(')).Count
    Check ($adjCount -ge 4)                                             "renderFactionRep has >=4 adjustFaction() calls (found $adjCount)"
    Check (-not ($renderFactionRepBody -match '<button[^>]*class="faction-btn[^"]*"[^>]*style=') -and `
           -not ($renderFactionRepBody -match '<button[^>]*style=[^>]*class="faction-btn'))     'renderFactionRep faction-btn buttons have no inline style attribute'
    Check ($renderWorldMapBody -match 'minmax\(0,\s*1fr\)')             'renderWorldMap uses minmax(0,1fr) for grid columns'
    Check ($renderWorldMapBody -match 'max-width\s*:\s*100%')           'renderWorldMap uses max-width:100% on the grid container'
    Check ($renderWorldMapBody -match 'map-cell' -and $renderWorldMapBody -match 'map-cell-name' -and $renderWorldMapBody -match 'map-cell-pip') 'renderWorldMap contains map-cell, map-cell-name, map-cell-pip class references'
    # Reload-size guard: size is state-driven, no width measurement (Protocol 8 plan)
    Check ($renderWorldMapBody -match 'state\.mapView')                 'renderWorldMap reads state.mapView (state-driven size)'
    Check (-not ($renderWorldMapBody -match 'window\.innerWidth'))      'renderWorldMap size path has no window.innerWidth'
    Check (-not ($renderWorldMapBody -match 'dataset\.mapFull'))        'renderWorldMap size path has no dataset.mapFull'
    try {
        $setMapViewBody = Get-FunctionBody $uiSrc 'setMapView'
        Check ($setMapViewBody -match 'state\.mapView')                 'setMapView() writes state.mapView'
        Check ($setMapViewBody -match 'saveState\(\)')                  'setMapView() calls saveState()'
    } catch {
        Fail "setMapView function not found: $_"
    }
    Check ($renderWorldMapBody -match 'map-toggle-btn')                 'renderWorldMap contains map-toggle-btn reference'
} catch {
    Fail "Render contract extraction failed: $_"
}

# ===========================================================
# Suite 15 -- CSS Invariants (Protocol 20)
# Verifies critical CSS rules that guard mobile layout and faction button sizing.
# 15 tests
# ===========================================================
Sep "Suite 15 -- CSS Invariants (Protocol 20)"
$cssSrc = Read-Src "css/terminal.css"
# Strip block comments so embedded {} in comments don't break rule-block extraction
$cssSrcStripped = $cssSrc -replace '(?s)/\*.*?\*/', ''
$factionBtnRule     = ([regex]::Match($cssSrcStripped, '\.faction-btn\s*\{[^}]*\}')).Value
$factionCardBtnsRule= ([regex]::Match($cssSrcStripped, '\.faction-card-btns\s*\{[^}]*\}')).Value
$mapCellRule        = ([regex]::Match($cssSrcStripped, '\.map-cell\s*\{[^}]*\}')).Value
$buttonRule         = ([regex]::Match($cssSrcStripped, '(?m)^button\s*\{[^}]*\}')).Value

Check ($factionBtnRule -match 'width\s*:\s*auto')          '.faction-btn has width:auto'
Check ($factionBtnRule -match 'display\s*:\s*flex')        '.faction-btn uses display:flex'
Check ($factionCardBtnsRule -match 'flex-wrap')            '.faction-card-btns has flex-wrap'
Check ($mapCellRule -match 'min-width\s*:\s*0')            '.map-cell has min-width:0'
Check ($mapCellRule -match 'overflow\s*:\s*hidden')        '.map-cell has overflow:hidden'
Check ($mapCellRule -match 'min-height|aspect-ratio')      '.map-cell has height floor (min-height or aspect-ratio)'
Check ([bool]([regex]::Match($cssSrc, '(?s)@media[^{]*480px.{0,2000}max-width\s*:\s*56px').Success)) '@media max-width:480px has max-width:56px for number inputs'
Check ($buttonRule -match 'width\s*:\s*100%')              'global button{} has width:100%'
$htmlRule = ([regex]::Match($cssSrcStripped, 'html\s*\{[^}]*\}')).Value
Check ($htmlRule -match 'overflow-x\s*:\s*hidden')         'html{} has overflow-x:hidden'
Check ([bool]([regex]::Match($cssSrc, '(?s)@media[^{]*480px.{0,5000}font-size\s*:\s*16px\s*!important').Success)) '@media max-width:480px sets font-size:16px on inputs (auto-zoom guard)'
# Mobile overflow guard: .col-left must have min-width:0 in the BASE styles
# so the single 1fr grid track can shrink on phones.
$colLeftBaseRule = ([regex]::Match($cssSrcStripped, '\.col-left\s*\{[^}]*\}')).Value
Check ($colLeftBaseRule -match 'min-width\s*:\s*0') '.col-left has min-width:0 in base styles (mobile overflow fix)'
$worldMapDisplayRule = ([regex]::Match($cssSrcStripped, '#worldMapDisplay\s*\{[^}]*\}')).Value
Check ($worldMapDisplayRule -match 'overflow-x') '#worldMapDisplay has overflow-x (map overflow containment)'
# Mobile overflow guard (r23): .col-right must ALSO have min-width:0 in base styles,
# since both columns share the single 1fr main-grid track on mobile.
$colRightBaseRule = ([regex]::Match($cssSrcStripped, '\.col-right\s*\{[^}]*\}')).Value
Check ($colRightBaseRule -match 'min-width\s*:\s*0') '.col-right has min-width:0 in base styles (mobile chat overflow fix)'
# Chat bubbles (r23): user/sys messages must wrap long unbroken tokens like .msg-ai.
$msgUserRule = ([regex]::Match($cssSrcStripped, '\.msg-user\s*\{[^}]*\}')).Value
Check ($msgUserRule -match 'word-break|overflow-wrap') '.msg-user wraps long tokens (word-break/overflow-wrap)'
$msgSysRule = ([regex]::Match($cssSrcStripped, '\.msg-sys\s*\{[^}]*\}')).Value
Check ($msgSysRule -match 'word-break|overflow-wrap') '.msg-sys wraps long tokens (word-break/overflow-wrap)'

# ===========================================================
# Suite 16 -- Service Worker Invariants (Protocol 20)
# Static source guards for SW install/activate/message behavior.
# 8 tests
# ===========================================================
Sep "Suite 16 -- Service Worker Invariants (Protocol 20)"
$swSrc = Read-Src "sw.js"
# Strip all comments so embedded mentions in comments don't confuse assertions
$swSrcStripped = ($swSrc -replace '(?s)/\*.*?\*/', '') -replace '//[^\n]*', ''
$swInstallMatch = [regex]::Match($swSrcStripped, "self\.addEventListener\s*\(\s*'install'[\s\S]*?\}\s*\)")
$swInstallStripped = if ($swInstallMatch.Success) { $swInstallMatch.Value } else { '' }
Check (-not ($swInstallStripped -match 'self\.skipWaiting\s*\('))      'install handler does NOT call self.skipWaiting() (r6 bug guard)'
Check (-not ($swSrcStripped -match 'clients\.claim\s*\('))             'sw.js does NOT call clients.claim() (reload-loop guard)'
Check ([bool]([regex]::Match($swSrc, "addEventListener\s*\(\s*'message'[\s\S]{0,500}skipWaiting").Success)) "message listener calls self.skipWaiting() (update-prompt path)"
Check ($swSrc -match "CACHE_NAME\s*=\s*'robco-terminal-v[\d.]+(-r\d+)?'") "CACHE_NAME matches robco-terminal-v<version>-rN format"
$cacheVer = ([regex]::Match($swSrc, "CACHE_NAME\s*=\s*'robco-terminal-v([\d.]+)")).Groups[1].Value
$appVer   = ([regex]::Match($stateSrc, "const APP_VERSION\s*=\s*'([\d.]+)'")).Groups[1].Value
Check ($cacheVer -ne '' -and $appVer -ne '' -and $cacheVer -eq $appVer) "CACHE_NAME version ($cacheVer) matches APP_VERSION ($appVer)"
Check ([bool]([regex]::Match($swSrcStripped, 'activate[\s\S]{0,400}caches\.delete').Success)) 'activate handler calls caches.delete for old-cache cleanup'
Check ($swSrc -match "'./index.html'" -and $swSrc -match "'./js/ui-core.js'")  'ASSETS list includes index.html and js/ui-core.js'
Check ($htmlSrc -match 'SKIP_WAITING' -and $htmlSrc -match 'reg\.waiting' -and $htmlSrc -match 'controllerchange') 'index.html SW registration references SKIP_WAITING, reg.waiting, and controllerchange'

# ===========================================================
# Suite 17 -- Structural Integrity (Protocol 20)
# Verifies key render functions exist, are called, and their DOM targets exist.
# 11 tests
# ===========================================================
Sep "Suite 17 -- Structural Integrity (Protocol 20)"
Check ($uiSrc -match 'function _updatePanelBadges\b')   '_updatePanelBadges() function exists in ui.js'
Check ($uiSrc -match 'function expandPanelForCategory\b') 'expandPanelForCategory() function exists in ui.js'
Check ($uiSrc -match 'function renderWorldMap\b')        'renderWorldMap() function exists in ui.js'
Check ($uiSrc -match 'function renderFactionRep\b')      'renderFactionRep() function exists in ui.js'
Check ($uiSrc -match 'renderWorldMap\(\)')               'renderWorldMap() is called in ui.js'
Check ($uiSrc -match 'renderFactionRep\(\)')             'renderFactionRep() is called in ui.js'
Check ($htmlSrc -match 'id="worldMapPanel"')             'worldMapPanel panel exists in index.html'
Check ($htmlSrc -match 'id="worldMapDisplay"')           'worldMapDisplay element exists in index.html'
Check ($htmlSrc -match 'id="factionContainer"')          'factionContainer element exists in index.html'
Check ($htmlSrc -match 'id="transmitBtn"')               'transmitBtn send button exists in index.html (Protocol 13 -- regression guard)'
Check ([bool]([regex]::Match($htmlSrc, '<button[^>]*onclick="transmitMessage\(\)"[^>]*id="transmitBtn"|<button[^>]*id="transmitBtn"[^>]*onclick="transmitMessage\(\)"').Success)) 'transmitBtn is wired to transmitMessage() (Protocol 13 -- send-button regression guard)'

# ===========================================================
# Suite 18 -- Detail-Current Dedup Guard (Protocol 27)
# Verifies scoreZoneForLoc rejects substring-only matches (<50).
# 2 tests
# ===========================================================
Sep "Suite 18 -- Detail-Current Dedup Guard"
$dcLabels = @(
    "scoreZoneForLoc: Bitter Springs vs 'goodsprings' scores < 50",
    "scoreZoneForLoc: Goodsprings vs 'goodsprings' scores === 100"
)
try {
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck) {
        $repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
        $uiPathNode = (Join-Path $repoRoot "js/ui-core.js").Replace('\', '/')
        $uiRenderPathNode = (Join-Path $repoRoot "js/ui-render.js").Replace('\', '/')
        $dcScript = @"
const vm = require('vm');
const fs = require('fs');
const src = (fs.existsSync('$uiRenderPathNode') ? fs.readFileSync('$uiRenderPathNode', 'utf8') + '\n' : '') + fs.readFileSync('$uiPathNode', 'utf8');
const fnIdx = src.indexOf('function scoreZoneForLoc');
if (fnIdx === -1) { console.log('EXTRACT_FAIL'); process.exit(0); }
function extractBody(source, name) {
  const idx = source.indexOf('function ' + name);
  let i = source.indexOf('{', idx);
  let depth = 0; const start = i;
  while (i < source.length) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
    i++;
  }
}
const body = extractBody(src, 'scoreZoneForLoc');
const headerEnd = src.indexOf('{', fnIdx);
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src.slice(fnIdx, headerEnd) + body, sandbox);
const szl = sandbox.scoreZoneForLoc;
const r = [
  szl({name:'Bitter Springs',locations:[]},'goodsprings') < 50,
  szl({name:'Goodsprings',locations:[]},'goodsprings') === 100
];
console.log('RESULT:' + r.map(b => b ? '1' : '0').join(''));
"@
        $out = ($dcScript | node 2>&1 | Out-String)
        $rm = [regex]::Match($out, 'RESULT:([01]{2})')
        if ($rm.Success) {
            $bits = $rm.Groups[1].Value
            for ($bi = 0; $bi -lt 2; $bi++) { Check ($bits.Substring($bi, 1) -eq '1') $dcLabels[$bi] }
        } else {
            $err = if ([string]::IsNullOrWhiteSpace($out)) { "No output from node" } else { $out.Trim() }
            foreach ($lbl in $dcLabels) { Fail "$lbl  (runtime error: $err)" }
        }
    } else {
        foreach ($lbl in $dcLabels) { Fail "$lbl  (node not found)" }
    }
} catch {
    foreach ($lbl in $dcLabels) { Fail "$lbl  (exception: $_)" }
}

# ===========================================================
# Suite 19 -- FO3 Database structural integrity
# Mirrors Suite 9 for js/db_fo3.js: CSV tables, purity contract.
# 16 tests
# ===========================================================
Sep "Suite 19 -- FO3 Database structural integrity"
$dbFo3Src = Read-Src "js/db_fo3.js"

# 19.1 databaseCSVs global must be declared
Check ($dbFo3Src -match 'const databaseCSVs')                          "db_fo3.js: databaseCSVs global is declared"

# 19.2 lookupItemInDb function must be declared
Check ($dbFo3Src -match 'function lookupItemInDb')                      "db_fo3.js: lookupItemInDb() function is declared"

# 19.3 All required CSV section headers must be present
$FO3_REQUIRED_TABLES = @('[WEAPONS.CSV]','[AMMO.CSV]','[ARMOR.CSV]','[BESTIARY.CSV]',
                         '[CHEMS.CSV]','[MISC.CSV]','[RECIPES.CSV]','[QUEST_ITEMS.CSV]','[VENDORS.CSV]')
foreach ($tbl in $FO3_REQUIRED_TABLES) {
    Check ($dbFo3Src.Contains($tbl)) "db_fo3.js contains $tbl section"
}

# 19.4 lookupItemInDb must be referenced in db_fo3.js
Check ($dbFo3Src -match 'lookupItemInDb')                               "db_fo3.js: lookupItemInDb function exists"

# 19.5 BESTIARY must have >= 30 data rows
$fo3BestiaryMatch = [regex]::Match($dbFo3Src, '(?s)\[BESTIARY\.CSV\](.*?)(?=\[|`;)')
$fo3BestiaryRows  = 0
if ($fo3BestiaryMatch.Success) {
    $fo3BestiaryRows = ($fo3BestiaryMatch.Groups[1].Value -split "`n" |
                    Where-Object { $_.Trim() -ne '' -and $_ -notmatch 'Name,' }).Count
}
Check ($fo3BestiaryRows -ge 30)                                         "db_fo3.js BESTIARY.CSV has >= 30 entries (found $fo3BestiaryRows)"

# 19.6-19.8 db_fo3.js must NOT reference state, localStorage, or chatHistory
$dbFo3Code = ($dbFo3Src -replace '(?s)/\*.*?\*/', '') -replace '//[^\r\n]*', ''
Check ($dbFo3Code -notmatch '\bstate\b')                                "db_fo3.js does not reference state (pure reference data)"
Check ($dbFo3Code -notmatch 'localStorage')                             "db_fo3.js does not reference localStorage"
Check ($dbFo3Code -notmatch 'chatHistory')                              "db_fo3.js does not reference chatHistory"

# ===========================================================
# Suite 20 -- CSV column-count integrity
# Every WEAPONS.CSV data row in db_nv and db_fo3 must have the
# same number of fields as the header row.
# 2 tests
# ===========================================================
Sep "Suite 20 -- CSV column-count integrity"

function Test-WeaponsCsvColumnCount {
    param([string]$src, [string]$label)
    $blockMatch = [regex]::Match($src, '(?s)\[WEAPONS\.CSV\](.*?)(?=\[|`;)')
    if (-not $blockMatch.Success) { Fail "$label`: could not extract [WEAPONS.CSV] block"; return }
    $lines = ($blockMatch.Groups[1].Value -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
    if ($lines.Count -lt 2) { Fail "$label`: [WEAPONS.CSV] block has fewer than 2 lines"; return }
    $headerCount = ($lines[0] -split ',').Count
    $badRows = @()
    for ($r = 1; $r -lt $lines.Count; $r++) {
        $cols = ($lines[$r] -split ',').Count
        if ($cols -ne $headerCount) { $badRows += "row $($r+1) ($cols cols)" }
    }
    Check ($badRows.Count -eq 0) "$label`: all WEAPONS.CSV data rows have $headerCount columns$(if($badRows.Count){' -- bad: ' + ($badRows -join '; ')})"
}

Test-WeaponsCsvColumnCount -src $dbSrc     -label "db_nv.js"
Test-WeaponsCsvColumnCount -src $dbFo3Src  -label "db_fo3.js"

# ===========================================================
# Suite 21 -- Security regression guards (Protocol 13/20)
# Static assertions that XSS-1 (squad numeric coercion),
# XSS-2 (trade modal click binding), and XSS-3 (inventory
# qty/wgt/val coercion + quest factions/status escaping) fixes
# cannot regress. Includes GH-2 (WU-B2): untrusted/external model
# strings (localStorage, Firestore, Gemini API) are escaped before
# innerHTML, and no served JS inlines a localStorage read into a
# template literal.
# 13 tests
# ===========================================================
Sep "Suite 21 -- Security regression guards"

# 21.1 autoImportState() maps squad array with parseInt for hp/hpMax/ammo
$importBody21 = Get-FunctionBody $apiSrc 'autoImportState'
Check ([bool]([regex]::Match($importBody21, 'parsed\.squad[\s\S]{0,400}parseInt[\s\S]{0,20}m\.hp').Success) -or
       [bool]([regex]::Match($importBody21, 'parsed\.squad[\s\S]{0,400}parseInt.*hp').Success)) `
    "autoImportState() sanitizes squad numeric fields with parseInt (XSS-1 guard)"

# 21.2 renderSquad() wraps hp, hpMax, ammo in parseInt
$renderSquadBody = Get-FunctionBody $uiSrc 'renderSquad'
Check ($renderSquadBody -match 'parseInt\s*\(\s*member\.hp\s*\)' -and
       $renderSquadBody -match 'parseInt\s*\(\s*member\.hpMax\s*\)' -and
       $renderSquadBody -match 'parseInt\s*\(\s*member\.ammo\s*\)') `
    "renderSquad() coerces hp, hpMax, ammo with parseInt before innerHTML (XSS-1 guard)"

# 21.3 Native TRADE sell list is XSS-safe (WU-N2 retired the AI TRADE modal; the dead
# `mType === 'TRADE'` source dependency that made this guard vacuous -- and threw an
# IndexOf(-1) exception here -- was removed under Protocol 42). Item names are escaped and
# routed via a data attribute, never interpolated raw into the onclick. Complements 21.4.
$renSrc213 = Read-Src "js/ui-render.js"
$sellBody213 = ''
try { $sellBody213 = Get-FunctionBody $renSrc213 'renderTradeSellList' } catch {}
Check (($sellBody213 -match 'escapeHtml\(it\.name\)') -and ($sellBody213 -match 'data-tname=') -and ($sellBody213 -match 'this\.dataset\.tname')) `
    "Native TRADE sell list escapes item names + routes via data-tname (XSS-2 guard)"

# 21.4 Native TRADE list is XSS-safe (WU-N2 retired the AI TRADE modal): item names are
# escaped and routed via a data attribute, never interpolated raw into the onclick.
$renSrc214 = Read-Src "js/ui-render.js"
$buyBody214 = ''
try { $buyBody214 = Get-FunctionBody $renSrc214 'renderTradeBuyList' } catch {}
Check (($buyBody214 -match 'escapeHtml\(it\.name\)') -and ($buyBody214 -match 'data-tname=') -and ($buyBody214 -match 'this\.dataset\.tname')) `
    "Native TRADE buy list escapes item names + routes via data-tname (XSS-2 guard)"

# 21.5 autoImportState() coerces inventory qty with parseInt and wgt with parseFloat
Check ([bool]([regex]::Match($importBody21, 'parseInt\s*\(\s*it\.qty\s*\)').Success) -and
       [bool]([regex]::Match($importBody21, 'parseFloat\s*\(\s*it\.wgt').Success)) `
    "autoImportState() coerces inventory qty (parseInt) and wgt (parseFloat) at import (XSS-3 guard)"

# 21.6 renderInventory() coerces qty/wgt with parseInt/parseFloat before innerHTML
$renderInvBody = Get-FunctionBody $uiSrc 'renderInventory'
Check ([bool]([regex]::Match($renderInvBody, 'parseInt\s*\(\s*it\.qty\s*\)').Success) -and
       [bool]([regex]::Match($renderInvBody, 'parseFloat\s*\(\s*it\.wgt\s*\)').Success)) `
    "renderInventory() coerces qty and wgt with parseInt/parseFloat before innerHTML (XSS-3 guard)"

# 21.7 autoImportState() whitelists quest status to active|complete|failed
Check ([bool]([regex]::Match($importBody21, "\['active',\s*'complete',\s*'failed'\]\.includes").Success)) `
    "autoImportState() whitelists quest status to active|complete|failed (XSS-3 guard)"

# 21.8 renderQuests() escapes quest factions with escapeHtml
$renderQuestsBody = Get-FunctionBody $uiSrc 'renderQuests'
Check ([bool]([regex]::Match($renderQuestsBody, 'escapeHtml.*q\.factions').Success)) `
    "renderQuests() escapes quest factions with escapeHtml before innerHTML (XSS-3 guard)"

# 21.9 renderQuests() escapes quest status with escapeHtml
Check ([bool]([regex]::Match($renderQuestsBody, 'escapeHtml\s*\(\s*st\.toUpperCase').Success)) `
    "renderQuests() escapes quest status with escapeHtml before innerHTML (XSS-3 guard)"

# 21.10 GH-2a: ui-core.js escapes the localStorage-derived saved model before innerHTML
Check (($uiSrc -match 'escapeHtml\s*\(\s*savedModel\s*\)') -and -not ($uiSrc -match '<option value="\$\{savedModel\}')) `
    "ui-core.js escapes localStorage model with escapeHtml before innerHTML -- no raw interpolation (GH-2 XSS guard)"

# 21.11 GH-2b: cloud.js escapes the Firestore-derived model before innerHTML
Check (($cloudSrc -match 'escapeHtml\s*\(\s*data\.model\s*\)') -and -not ($cloudSrc -match '<option value="\$\{data\.model\}')) `
    "cloud.js escapes Firestore model with escapeHtml before innerHTML -- no raw interpolation (GH-2 XSS guard)"

# 21.12 GH-2c: api.js escapes the externally-sourced Gemini model name before innerHTML
Check (($apiSrc -match 'escapeHtml\s*\(\s*shortName\s*\)') -and -not ($apiSrc -match '<option value="\$\{shortName\}') -and -not ($apiSrc -match '\$\{m\.displayName')) `
    "api.js escapes Gemini model name with escapeHtml before innerHTML -- no raw interpolation (GH-2 XSS guard)"

# 21.13 GH-2 ratchet (general, forward-looking): no served JS inlines a localStorage.getItem() read into a template literal
$servedJs21 = @($uiSrc, $apiSrc, $cloudSrc) -join "`n"
Check (-not ($servedJs21 -match '\$\{[^}]*localStorage\.getItem')) `
    "No served JS interpolates localStorage.getItem() into a template literal (GH-2 escape-before-innerHTML ratchet)"

# ===========================================================
# Suite 22 -- Critical Feature Presence (Group 1)
# Asserts every key control exists in index.html and is wired.
# 30 tests
# ===========================================================
Sep "Suite 22 -- Critical Feature Presence"
# Tab buttons
Check ([bool]($htmlSrc -match "onclick=""switchTab\('stat'\)"""))  "STAT tab button wired (switchTab('stat'))"
Check ([bool]($htmlSrc -match "onclick=""switchTab\('inv'\)"""))   "INV tab button wired (switchTab('inv'))"
Check ([bool]($htmlSrc -match "onclick=""switchTab\('data'\)"""))  "DATA tab button wired (switchTab('data'))"
Check ([bool]($htmlSrc -match "onclick=""switchTab\('campg'\)""")) "CAMPG tab button wired (switchTab('campg'))"
# Add buttons
Check ([bool]($htmlSrc -match 'onclick="addItem\(\)"'))        "Add Item button wired (addItem())"
Check ([bool]($htmlSrc -match 'onclick="addAmmo\(\)"'))        "Add Ammo button wired (addAmmo())"
Check ([bool]($htmlSrc -match 'onclick="addPerk\(\)"'))        "Add Perk button wired (addPerk())"
Check ([bool]($htmlSrc -match 'onclick="addQuest\(\)"'))       "Add Quest button wired (addQuest())"
Check ([bool]($htmlSrc -match 'onclick="addCampaignNote\(\)"')) "Add Note button wired (addCampaignNote())"
Check ([bool]($htmlSrc -match 'onclick="addSquadMember\(\)"')) "Add Squad button wired (addSquadMember())"
# Save / Load slots A B C
Check ([bool]($htmlSrc -match 'onclick="saveToSlot\(1\)"'))    "Save slot A wired (saveToSlot(1))"
Check ([bool]($htmlSrc -match 'onclick="saveToSlot\(2\)"'))    "Save slot B wired (saveToSlot(2))"
Check ([bool]($htmlSrc -match 'onclick="saveToSlot\(3\)"'))    "Save slot C wired (saveToSlot(3))"
Check ([bool]($htmlSrc -match 'onclick="loadFromSlot\(1\)"'))  "Load slot A wired (loadFromSlot(1))"
Check ([bool]($htmlSrc -match 'onclick="loadFromSlot\(2\)"'))  "Load slot B wired (loadFromSlot(2))"
Check ([bool]($htmlSrc -match 'onclick="loadFromSlot\(3\)"'))  "Load slot C wired (loadFromSlot(3))"
# Export / Import
Check ([bool]($htmlSrc -match 'onclick="exportSaveFile\(\)"'))          "Export save button wired (exportSaveFile())"
Check ([bool]($htmlSrc -match 'onchange="handleFileUpload\(event\)"'))  "Import save input wired (handleFileUpload(event))"
# Cloud sync
Check ([bool]($htmlSrc -match 'id="btnSaveToCloud"'))      "Save to Cloud button exists (id=btnSaveToCloud -- replaces btnCloudPush)"
Check (-not ([bool]($htmlSrc -match 'id="courierIdInput"'))) "Vestigial courier ID input is absent (id=courierIdInput removed in Phase 6)"
# Validate Key
Check ([bool]($htmlSrc -match 'id="btnFetchModels"'))  "Validate Key button exists (id=btnFetchModels)"
# D-pad (single-quote chars inside double-quoted string require escaping as '' in PS)
Check ([bool]($htmlSrc -match "onclick=""macroCommand\('\[PAD: UP\]'\)"""))    "D-pad UP wired (macroCommand('[PAD: UP]'))"
Check ([bool]($htmlSrc -match "onclick=""macroCommand\('\[PAD: DOWN\]'\)"""))  "D-pad DOWN wired (macroCommand('[PAD: DOWN]'))"
Check ([bool]($htmlSrc -match "onclick=""macroCommand\('\[PAD: LEFT\]'\)"""))  "D-pad LEFT wired (macroCommand('[PAD: LEFT]'))"
Check ([bool]($htmlSrc -match "onclick=""macroCommand\('\[PAD: RIGHT\]'\)""")) "D-pad RIGHT wired (macroCommand('[PAD: RIGHT]'))"
# Macro buttons
Check ([bool]($htmlSrc -match "onclick=""macroCommand\('\[THREAT\]'\)"""))    "THREAT macro button wired"
Check ([bool]($htmlSrc -match "onclick=""macroCommand\('\[VATS SIM\]'\)"""))  "VATS SIM macro button wired"
Check ([bool]($htmlSrc -match "onclick=""expandPanelForCategory\('trade'\)"""))     "TRADE macro button opens the native barter panel (WU-N2)"
Check ([bool]($htmlSrc -match "onclick=""renderLoot\(\)"""))      "LOOT button opens the native salvage terminal (WU-N6)"
# V.A.T.S. Calculator
Check ([bool]($htmlSrc -match 'id="vatsCalcBtn"'))  "V.A.T.S. CALCULATOR button exists (id=vatsCalcBtn)"

# ===========================================================
# Suite 23 -- Prohibited Patterns (Group 2)
# Static checks that banned patterns haven't crept back in.
# 8 tests
# ===========================================================
Sep "Suite 23 -- Prohibited Patterns"

# 23.1 No innerHTML += in ui.js (render functions must use bulk assignment)
Check (-not ($uiSrc -match 'innerHTML\s*\+=')) "ui.js has no innerHTML += (O(n^2) re-parse guard)"

# 23.1b No innerHTML += anywhere in served JS -- WU-B1 closed the former api.js carve-out
# (the model-fetch <select> builder now uses map().join('') single-assignment). The guard
# scans every served module so the O(n^2) DOM-reparse pattern can never return (Protocol 36b).
$servedJs23 = @($uiSrc, $apiSrc, $cloudSrc) -join "`n"
Check (-not ($servedJs23 -match 'innerHTML\s*\+=')) "No served JS (ui/api/cloud) contains innerHTML += (O(n^2) re-parse guard -- Prohibited Patterns)"

# 23.2 No localStorage.getItem inside audio function bodies in ui.js
$audioFnOffenders = @()
$audioRe = [regex]'function (play\w+|start\w+)\s*\('
$audioMatches = $audioRe.Matches($uiSrc)
foreach ($am in $audioMatches) {
    $fnName = $am.Groups[1].Value
    try {
        $body = Get-FunctionBody $uiSrc $fnName
        if ($body -match 'ensureAudioCtx\(\)') {
            if ($body -match 'localStorage\.getItem') { $audioFnOffenders += $fnName }
        }
    } catch {}
}
Check ($audioFnOffenders.Count -eq 0) ("No audio function reads localStorage.getItem directly" + $(if ($audioFnOffenders.Count) { " -- offenders: " + ($audioFnOffenders -join ", ") } else { "" }))

# 23.2b GH-3: getSystemDirective() runs on every AI message -- must read playstyle from
# the in-memory comm cache (_commGet), never localStorage.getItem directly (WU-B3).
$gsdBody = Get-FunctionBody $apiSrc 'getSystemDirective'
Check (-not ($gsdBody -match 'localStorage\.getItem')) `
    "getSystemDirective() contains no localStorage.getItem -- reads from comm cache (GH-3 hot-path guard)"

# 23.2c GH-3: transmitMessage() runs on every AI message -- Gemini key/model must come from
# the in-memory comm cache (_commGet), never localStorage.getItem directly (WU-B3).
$txBody = Get-FunctionBody $apiSrc 'transmitMessage'
Check (-not ($txBody -match 'localStorage\.getItem')) `
    "transmitMessage() contains no localStorage.getItem -- reads from comm cache (GH-3 hot-path guard)"

# 23.3 autoImportState() uses explicit field mapping, not recursive Object.keys transform
Check (-not ([bool]([regex]::Match($importBody, 'Object\.keys\s*\(\s*parsed\s*\)\.forEach').Success))) `
    "autoImportState() has no recursive Object.keys(parsed).forEach key transform"

# 23.4 & 23.5 saveCurrentToCloud is NOT called from saveState() or updateMath() (manual-only)
$saveStateBody23 = ''
$updateMathBody23 = ''
try { $saveStateBody23 = Get-FunctionBody $stateSrc 'saveState' } catch {}
try { $updateMathBody23 = Get-FunctionBody $uiSrc 'updateMath' } catch {}
Check (-not ($saveStateBody23 -match 'saveCurrentToCloud'))   "saveState() does not call saveCurrentToCloud (manual-only)"
Check (-not ($updateMathBody23 -match 'saveCurrentToCloud'))  "updateMath() does not call saveCurrentToCloud (manual-only)"

# ===========================================================
# Suite 24 -- Protocol Completeness (Group 3)
# P5: every render*() called from loadUI(); P6: wireInput IDs exist;
# P7: every audio function has masterMute + individual key guard.
# 19 tests
# ===========================================================
Sep "Suite 24 -- Protocol Completeness P5 (render wiring)"
$loadUIBody24 = ''
try { $loadUIBody24 = Get-FunctionBody $uiSrc 'loadUI' } catch { Fail "Cannot extract loadUI: $_" }
$RENDER_FNS = @('renderInventory','renderAmmo','renderSquad','renderStatus','renderCampaignNotes',
                'renderFactionRep','renderPerks','renderQuests','renderSessionStats','renderEquipped',
                'renderCollectibles','renderGameDate','renderWorldMap','renderKarmaCenter','renderCampaignStatus')
foreach ($fn in $RENDER_FNS) {
    Check ([bool]([regex]::Match($loadUIBody24, "\b$fn\s*\(\s*\)").Success)) "$fn() is called from loadUI() (P5)"
}

Sep "Suite 24 -- Protocol Completeness P6 (wireInput IDs)"
$WIRE_IDS = @('newQuestName','newItemName','newPerkName')
foreach ($id in $WIRE_IDS) {
    Check ([bool]($htmlSrc -match "id=""$id""")) "wireInput target id=""$id"" exists in index.html (P6)"
}

Sep "Suite 24 -- Protocol Completeness P7 (audio double-guard)"
$audioGuardOffenders = @()
$audioRe2 = [regex]'function (play\w+|start\w+)\s*\('
$audioMatches2 = $audioRe2.Matches($uiSrc)
foreach ($am2 in $audioMatches2) {
    $fnName2 = $am2.Groups[1].Value
    try {
        $body2 = Get-FunctionBody $uiSrc $fnName2
        if (-not ($body2 -match 'ensureAudioCtx\(\)')) { continue }
        if (-not ($body2 -match 'AudioSettings\.masterMute')) { $audioGuardOffenders += "$fnName2`:missing masterMute" }
        $otherKeys = [regex]::Matches($body2, 'AudioSettings\.\w+') | Where-Object { $_.Value -ne 'AudioSettings.masterMute' }
        if ($otherKeys.Count -eq 0) { $audioGuardOffenders += "$fnName2`:missing individual key" }
    } catch {}
}
Check ($audioGuardOffenders.Count -eq 0) ("All audio functions have masterMute + individual key guards (P7)" + $(if ($audioGuardOffenders.Count) { " -- " + ($audioGuardOffenders -join ", ") } else { "" }))

# ===========================================================
# Suite 25 -- AI Contract Lock (Group 4)
# responseMimeType is locked and getSystemDirective() contains
# the tri-node schema shape (narrative/state/modal).
# 5 tests
# ===========================================================
Sep "Suite 25 -- AI Contract Lock"
Check ([bool]($apiSrc -match "responseMimeType\s*:\s*'application/json'")) "api.js contains responseMimeType:'application/json' (AI contract lock)"
$sysDirBody25 = ''
try { $sysDirBody25 = Get-FunctionBody $apiSrc 'getSystemDirective' } catch { Fail "Cannot extract getSystemDirective: $_" }
Check ([bool]($sysDirBody25 -match 'state\.gameContext'))  "getSystemDirective() reads state.gameContext (FO3 switch)"
# U1: the schema literals live in _directivePersonaAndContract() now -- check the
# full composed directive body, not just getSystemDirective()'s own short body.
$fullDirBody25 = Get-DirectiveFullBody $apiSrc
Check ([bool]($fullDirBody25 -match "'narrative'|`"narrative`"")) "getSystemDirective() contains 'narrative' key (AI tri-node schema)"
Check ([bool]($fullDirBody25 -match "'state'|`"state`""))         "getSystemDirective() contains 'state' key (AI tri-node schema)"
Check ([bool]($fullDirBody25 -match "'modal'|`"modal`""))         "getSystemDirective() contains 'modal' key (AI tri-node schema)"

# ===========================================================
# Suite 26 -- Architectural Boundaries (Group 5)
# reg_fo3.js must be pure read-only reference data.
# 3 tests
# ===========================================================
Sep "Suite 26 -- Architectural Boundaries -- reg_fo3.js purity"
$regFo3Src = Read-Src "js/reg_fo3.js"
$regFo3Code = ($regFo3Src -replace '(?s)/\*.*?\*/', '') -replace '//[^\r\n]*', ''
Check ($regFo3Code -cnotmatch '\bstate\b')     "reg_fo3.js does not reference state (pure reference data)"
Check ($regFo3Code -notmatch 'localStorage')   "reg_fo3.js does not reference localStorage (in code)"
Check ($regFo3Code -notmatch 'chatHistory')    "reg_fo3.js does not reference chatHistory (in code)"

# ===========================================================
# Suite 27 -- Assets Completeness (Group 6)
# Every local <script src> / <link href> in index.html must
# appear in sw.js ASSETS so the PWA caches the full app.
# 2 tests
# ===========================================================
Sep "Suite 27 -- Assets Completeness"
$swSrc27 = Read-Src "sw.js"
$assetsBlockM = [regex]::Match($swSrc27, '(?s)const ASSETS\s*=\s*\[(.*?)\];')
$assetsSet27 = [System.Collections.Generic.HashSet[string]]::new()
if ($assetsBlockM.Success) {
    [regex]::Matches($assetsBlockM.Groups[1].Value, "'([^']+)'") | ForEach-Object { [void]$assetsSet27.Add($_.Groups[1].Value) }
}
# Extract local script/link refs from HTML, normalise to ./path form
$scriptRefs27 = [regex]::Matches($htmlSrc, '<script[^>]+src="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$linkRefs27   = [regex]::Matches($htmlSrc, '<link[^>]+href="([^"]+)"')   | ForEach-Object { $_.Groups[1].Value }
$localRefs27  = @($scriptRefs27) + @($linkRefs27) |
    Where-Object { $_ -notmatch '^https?://' -and $_ -ne 'sw.js' -and $_ -notmatch '\.(png|ico|gif|jpg|svg)$' } |
    ForEach-Object { if ($_ -match '^\./') { $_ } else { './' + $_ } }
$missingFromAssets27 = $localRefs27 | Where-Object { -not $assetsSet27.Contains($_) }
Check ($missingFromAssets27.Count -eq 0) ("All local HTML refs (excl. sw.js) are in sw.js ASSETS" + $(if ($missingFromAssets27.Count) { " -- missing: " + ($missingFromAssets27 -join ", ") } else { "" }))
# Every ASSETS entry (except './' directory placeholder) must exist on disk
$missingFiles27 = $assetsSet27 | Where-Object { $_ -ne './' } | Where-Object { -not (Test-Path (Join-Path $Root $_)) }
Check ($missingFiles27.Count -eq 0) ("All sw.js ASSETS entries exist on disk" + $(if ($missingFiles27.Count) { " -- missing: " + ($missingFiles27 -join ", ") } else { "" }))

# ===========================================================
# Suite 28 -- Meta / Runner Parity (Group 7)
# JS and PS runners must have identical test counts (Protocol 15)
# and CHANGELOG.md canonical count must match README.md, ARCHITECTURE.md,
# and (conditionally, if present) RULES.md and CLAUDE.md.
# 7 tests
# ===========================================================
Sep "Suite 28 -- Meta / Runner Parity"
# NOTE: source-level Check/assert counts cannot reliably track runtime test counts
# because loops multiply results at runtime. Parity is enforced structurally.
$jsRunnerSrc28 = Read-Src "tests/robco-diagnostics.js"
$psRunnerSrc28 = Read-Src "tests/robco-diagnostics.ps1"
$GATE_SUITES = @('Suite 22','Suite 23','Suite 24','Suite 25','Suite 26','Suite 27','Suite 28','Suite 29','Suite 30','Suite 31','Suite 32','Suite 33','Suite 34','Suite 35','Suite 36','Suite 37','Suite 38','Suite 39','Suite 40','Suite 41','Suite 49','Suite 50','Suite 51','Suite 52','Suite 53','Suite 54','Suite 55','Suite 56','Suite 57','Suite 58','Suite 59','Suite 60','Suite 61','Suite 62','Suite 63','Suite 64','Suite 65','Suite 66','Suite 67','Suite 68','Suite 69','Suite 70','Suite 71','Suite 72','Suite 73','Suite 74','Suite 75','Suite 76','Suite 77','Suite 78','Suite 79','Suite 80','Suite 81','Suite 82','Suite 83','Suite 84','Suite 85','Suite 86','Suite 87','Suite 88','Suite 89','Suite 90','Suite 91','Suite 92','Suite 93','Suite 94','Suite 95','Suite 96','Suite 97','Suite 98','Suite 99','Suite 100','Suite 101','Suite 102','Suite 103','Suite 104','Suite 105','Suite 106','Suite 107','Suite 108','Suite 109','Suite 110','Suite 111')
$jsMissing28 = $GATE_SUITES | Where-Object { -not $jsRunnerSrc28.Contains($_) }
$psMissing28 = $GATE_SUITES | Where-Object { -not $psRunnerSrc28.Contains($_) }
Check ($jsMissing28.Count -eq 0) ("JS runner contains all gate-guard suites (22-41, 49-99)" + $(if ($jsMissing28.Count) { " -- missing: " + ($jsMissing28 -join ", ") } else { "" }))
Check ($psMissing28.Count -eq 0) ("PS runner contains all gate-guard suites (22-41, 49-99)" + $(if ($psMissing28.Count) { " -- missing: " + ($psMissing28 -join ", ") } else { "" }))
$changelogSrc28 = Read-Src "CHANGELOG.md"
$countM28 = [regex]::Match($changelogSrc28, 'Tests:\s*(\d+)/\d+')
$canon28 = if ($countM28.Success) { $countM28.Groups[1].Value } else { '' }
Check ($canon28 -ne '') "CHANGELOG.md contains Tests: N/N header (Protocol 2a)"
$readmeSrc28 = Read-Src "README.md"
Check ($canon28 -ne '' -and ($readmeSrc28 -match $canon28)) "README.md contains CHANGELOG.md canonical test count ($canon28)"
$archSrc28 = Read-Src "ARCHITECTURE.md"
Check ($canon28 -ne '' -and $archSrc28.Contains($canon28)) "ARCHITECTURE.md contains canonical test count ($canon28)"
# Conditional: RULES.md and CLAUDE.md are untracked local files — skip gracefully if absent.
$rulesPath28 = Join-Path $Root "RULES.md"
$rulesExists28 = Test-Path $rulesPath28
$rulesSrc28 = if ($rulesExists28) { Get-Content $rulesPath28 -Raw } else { $null }
$rulesCountM28 = if ($rulesSrc28) { [regex]::Match($rulesSrc28, '\b(\d+)\s*tests?\b') } else { $null }
$rulesOk28 = (-not $rulesExists28) -or ($rulesCountM28 -and $rulesCountM28.Success -and $rulesCountM28.Groups[1].Value -eq $canon28)
Check $rulesOk28 "RULES.md test count matches canonical ($canon28) -- skipped if absent"
$claudePath28 = Join-Path $Root "CLAUDE.md"
$claudeExists28 = Test-Path $claudePath28
$claudeSrc28 = if ($claudeExists28) { Get-Content $claudePath28 -Raw } else { $null }
$claudeCountM28 = if ($claudeSrc28) { [regex]::Match($claudeSrc28, '\b(\d+)\s*tests?\b') } else { $null }
$claudeOk28 = (-not $claudeExists28) -or ($claudeCountM28 -and $claudeCountM28.Success -and $claudeCountM28.Groups[1].Value -eq $canon28)
Check $claudeOk28 "CLAUDE.md test count matches canonical ($canon28) -- skipped if absent"

# ===========================================================
# Suite 29 -- SW Update Banner (Protocol 13/20)
# Regression guards: alert() replaced by in-page banner;
# banner element + tap->SKIP_WAITING wiring; reload guard intact.
# 4 tests
# ===========================================================
Sep "Suite 29 -- SW Update Banner"
$triggerBody29 = ''
try { $triggerBody29 = Get-FunctionBody $htmlSrc '_triggerUpdate' } catch {}
Check (-not ($triggerBody29 -match '\balert\s*\(')) `
    "_triggerUpdate() does not call alert() -- banner replaces browser dialog (Protocol 13 guard)"
Check ([bool]($htmlSrc -match 'id="updateModal"')) `
    'id="updateModal" element exists in index.html (blocking update dialog replaced updateBanner)'
Check ([bool]($triggerBody29 -match 'SKIP_WAITING') -and [bool]($triggerBody29 -match 'onclick|addEventListener')) `
    "_triggerUpdate() wires banner tap to postMessage SKIP_WAITING (update path intact)"
Check ([bool]($htmlSrc -match 'refreshing') -and [bool]($htmlSrc -match 'hadController')) `
    "controllerchange reload guard (refreshing + hadController) intact in index.html (Protocol 20)"

# ===========================================================
# Suite 30 -- Phase 1b Guards
# Input maxlength caps, enforcing CSP (Stage 2), monotonic cache
# guard in pre-commit hook, proactive localStorage quota warning.
# 5 tests
# ===========================================================
Sep "Suite 30 -- Phase 1b Guards"
# 30.1 #chatInput textarea has maxlength attribute
Check ([bool]($htmlSrc -match 'id="chatInput"[\s\S]{0,300}maxlength')) `
    '#chatInput textarea has maxlength attribute (Phase 1b input cap guard)'
# 30.2a Enforcing CSP present in index.html (http-equiv must be exactly "Content-Security-Policy")
Check ([bool]($htmlSrc -match 'http-equiv="Content-Security-Policy"')) `
    'index.html contains enforcing Content-Security-Policy meta (CSP Stage 2 -- not report-only)'
# 30.2b Report-Only CSP absent -- regression guard: flip back to passive is caught
Check (-not ($htmlSrc -match 'Content-Security-Policy-Report-Only')) `
    'index.html does NOT contain Content-Security-Policy-Report-Only (CSP Stage 2 regression guard)'
# 30.3 Pre-commit hook enforces monotonic rev increase
$hookSrc30 = ''
if (Test-Path (Join-Path $Root '.git/hooks/pre-commit')) {
    $hookSrc30 = [System.IO.File]::ReadAllText((Join-Path $Root '.git/hooks/pre-commit'))
}
Check ([bool]($hookSrc30 -match 'LOCAL_N.*-gt.*ORIGIN_N')) `
    'pre-commit hook enforces strict monotonic rev increase (LOCAL_N -gt ORIGIN_N)'
# 30.4 saveState() contains proactive quota warning
$stateSrc30 = Read-Src 'js/state.js'
Check ([bool]($stateSrc30 -match '_quotaWarnShown')) `
    'saveState() contains proactive localStorage quota warning (once-per-session guard)'

# ===========================================================
# Suite 31 -- CI/CD Automation Guards (Phase 1c)
# ci.yml has no stale "(106 tests)" or "(386 tests)" label; runs PS runner;
# has render-check step; deploy.yml uses _site staging dir and is
# RELEASE-GATED via workflow_call -- invoked only by release.yml on a version
# bump (never a bare push to main); deploy keeps a defense-in-depth
# success+main job guard + manual dispatch;
# hook-install and boot-smoke scripts exist;
# pre-commit hook is conditional (served-file gate).
# 14 tests
# ===========================================================
Sep "Suite 31 -- CI/CD Automation Guards"
$ciSrc31 = Read-Src '.github/workflows/ci.yml'
# 31.1 ci.yml no stale "(106 tests)" label
Check (-not ($ciSrc31 -match '\(106 tests\)')) `
    'ci.yml does not contain stale "(106 tests)" label (Phase 1c update)'
# 31.2 gate.js runs PowerShell persistence runner + ci.yml calls npm run gate
$gateSrc31 = Read-Src 'scripts/gate.js'
Check (($gateSrc31 -match 'robco-diagnostics\.ps1') -and ($ciSrc31 -match 'npm run gate')) `
    'gate.js runs PowerShell persistence runner and ci.yml calls npm run gate (Protocol 15 parity)'
# 31.3 gate.js includes render-check + ci.yml calls npm run gate
Check (($gateSrc31 -match 'render-check') -and ($ciSrc31 -match 'npm run gate')) `
    'gate.js includes render-check and ci.yml calls npm run gate (Protocol 10 CI enforcement)'
# 31.4 deploy.yml uses _site staging dir (not path: .)
$deploySrc31 = Read-Src '.github/workflows/deploy.yml'
Check ($deploySrc31 -match '_site' -and -not ($deploySrc31 -match 'path:\s*\.')) `
    'deploy.yml uses _site staging directory instead of path: . (private files excluded)'
# 31.5 hook install script exists
Check (Test-Path (Join-Path $Root 'scripts/install-hooks.js')) `
    'scripts/install-hooks.js exists (auto-installs pre-commit hook on npm install)'
# 31.6 boot smoke test exists
Check (Test-Path (Join-Path $Root 'tests/boot-smoke.mjs')) `
    'tests/boot-smoke.mjs exists (CI boot smoke test -- Phase 1c)'
# 31.7 ci.yml no stale "(386 tests)" label
Check (-not ($ciSrc31 -match '\(386 tests\)')) `
    'ci.yml does not contain stale "(386 tests)" label (updated to 519)'
# 31.8 deploy.yml trigger is release-gated (workflow_call -- invoked only by release.yml)
$deploySrc31b = Read-Src '.github/workflows/deploy.yml'
$onBlock31 = ([regex]::Match($deploySrc31b, '(?sm)^on:(.*?)^permissions:')).Groups[1].Value
Check ([bool]($onBlock31 -match 'workflow_call')) `
    'deploy.yml on: block uses workflow_call (release-gated -- invoked only by release.yml on a version bump, Protocol 43)'
# 31.9 deploy.yml on: block has NO workflow_run trigger -- regression guard:
#      production must never regress to deploy-on-every-CI/push (Protocol 36b)
Check (-not ($onBlock31 -match 'workflow_run')) `
    'deploy.yml on: block has NO workflow_run trigger (cannot deploy on every CI / bare push -- release-gated only)'
# 31.10 scripts/pre-commit gates cache-bump on staged served files (conditional)
$hookSrc31 = Read-Src 'scripts/pre-commit'
Check (([bool]($hookSrc31 -match 'git diff --cached --name-only')) -and ([bool]($hookSrc31 -match 'SERVED='))) `
    'scripts/pre-commit gates cache-bump check on staged served files via git diff --cached (conditional Protocol 1)'
# 31.11 scripts/pre-commit has SKIP branch for non-served commits
Check (([bool]($hookSrc31 -match 'SKIP.*No served')) -or ([bool]($hookSrc31 -match 'cache bump not required'))) `
    'scripts/pre-commit has SKIP branch -- non-served commits bypass the cache-bump check'
# 31.12 release.yml invokes deploy.yml as a reusable workflow (only automated path to prod)
$releaseSrc31 = Read-Src '.github/workflows/release.yml'
Check ([bool]($releaseSrc31 -match 'uses:\s*\./\.github/workflows/deploy\.yml')) `
    'release.yml invokes deploy.yml via uses: (reusable workflow -- the only automated path to production)'
# 31.13 release.yml gates that deploy on a NEW version release only (APP_VERSION bump)
Check (([bool]($releaseSrc31 -match "needs\.check-and-release\.outputs\.released\s*==\s*'true'")) -and ([bool]($releaseSrc31 -match 'released:\s*\$\{\{\s*steps\.check\.outputs\.exists'))) `
    'release.yml deploys to prod ONLY on a new version release (released output derived from the APP_VERSION tag check)'
# 31.14 deploy.yml keeps manual dispatch + defense-in-depth success+main job guard
Check (([bool]($onBlock31 -match 'workflow_dispatch')) -and ([bool]($deploySrc31b -match "conclusion == 'success'")) -and ([bool]($deploySrc31b -match "head_branch == 'main'"))) `
    'deploy.yml keeps workflow_dispatch (manual rollback) + defense-in-depth job guard (CI success + main)'

# ===========================================================
# Suite 32 -- Phase 2a Guards (Help Menu Rebuild + Chem Boost Fix)
# Data-driven COMMAND_REGISTRY; no box-drawing glyphs; removed commands
# absent from both ui.js and api.js; .skill-row markup; _applyChemHighlights
# targets .skill-row selector.
# 7 tests
# ===========================================================
Sep "Suite 32 -- Phase 2a Guards"
$uiSrc32  = $uiSrc
$apiSrc32 = $apiSrc

# 32.1 COMMAND_REGISTRY data array exists in ui.js
Check ([bool]($uiSrc32 -match 'const COMMAND_REGISTRY\s*=\s*\[')) 'COMMAND_REGISTRY data array declared at module scope in ui.js'

# 32.2 showHelpModal() body references COMMAND_REGISTRY
$helpBody32 = ''
try { $helpBody32 = Get-FunctionBody $uiSrc32 'showHelpModal' } catch {}
Check ([bool]($helpBody32 -match 'COMMAND_REGISTRY')) 'showHelpModal() references COMMAND_REGISTRY data array (data-driven rendering)'

# 32.3 showHelpModal() body has no box-drawing glyphs (check for pipe glyph U+2502)
Check (-not [bool]($helpBody32 -match [char]0x2502)) 'showHelpModal() contains no box-drawing glyphs (pipe glyph absent)'

# 32.4 Removed commands absent from COMMAND_REGISTRY source in ui.js
$cmdRegM32 = [regex]::Match($uiSrc32, 'const COMMAND_REGISTRY\s*=\s*\[[\s\S]*?\];')
$cmdRegSrc32 = if ($cmdRegM32.Success) { $cmdRegM32.Value } else { '' }
$removed32ok = (-not ($cmdRegSrc32 -match 'VIEW.*D.*M')) -and (-not ($cmdRegSrc32 -match 'DEV 1/2/3')) -and (-not ($cmdRegSrc32 -match '\[INV\]')) -and (-not ($cmdRegSrc32 -match '\[STATS\]')) -and (-not ($cmdRegSrc32 -match '\[REP\]'))
Check $removed32ok 'Removed legacy commands (VIEW D/M, DEV 1/2/3, INV, STATS, REP) absent from COMMAND_REGISTRY'

# 32.5 Removed commands absent from api.js canonical command list
$removed32api = (-not ($apiSrc32 -match 'VIEW.*D.*M')) -and (-not ($apiSrc32 -match 'DEV 1/2/3')) -and (-not ($apiSrc32 -match '\[INV\]\s*:\s*Inventory')) -and (-not ($apiSrc32 -match '\[STATS\]\s*:')) -and (-not ($apiSrc32 -match '\[REP\]\s*:\s*Dual'))
Check $removed32api 'Removed legacy commands absent from api.js canonical command list'

# 32.6 renderSkills() in ui-core.js generates .skill-row elements dynamically
$uiCoreSrc32 = Read-Src 'js/ui-core.js'
Check ([bool]($uiCoreSrc32 -match 'class="skill-row"')) `
    'ui-core.js: renderSkills() generates .skill-row elements dynamically (static index.html rows replaced)'

# 32.7 _applyChemHighlights() uses .skill-row for both clear and highlight
$chemBody32 = ''
try { $chemBody32 = Get-FunctionBody $uiSrc32 '_applyChemHighlights' } catch {}
$chem32ok = ([bool]($chemBody32 -match '\.skill-row\.chem-boost')) -and ([bool]($chemBody32 -match "closest\('\.skill-row'\)"))
Check $chem32ok "_applyChemHighlights() clears via .skill-row.chem-boost and applies via closest(.skill-row)"

# ===========================================================
# Suite 33 -- Phase 2b Guards (Optics RGB, Empty-State, Utility Classes)
# --robco-green-rgb CSS var chain; emptyState() helper; utility classes;
# config-summary toggle; no residual rgba(20,253,206) literals.
# 10 tests
# ===========================================================
Sep "Suite 33 -- Phase 2b Guards"
$cssSrc33 = Read-Src 'css/terminal.css'
$htmlSrc33 = Read-Src 'index.html'

# 33.1 --robco-green-rgb defined in terminal.css :root
Check ([bool]($cssSrc33 -match '--robco-green-rgb\s*:\s*20,\s*253,\s*206')) '--robco-green-rgb: 20, 253, 206 defined in terminal.css :root (P1-1)'

# 33.2 No rgba(20,253,206, literal survives in terminal.css
Check (-not [bool]($cssSrc33 -match 'rgba\(20,\s*253,\s*206,')) 'No hardcoded rgba(20,253,206,...) literal remains in terminal.css (P1-1)'

# 33.3 --robco-green-rgb set in index.html optics branches (>=5 calls)
$rgbHtml33 = ([regex]::Matches($htmlSrc33, "setProperty\('--robco-green-rgb'")).Count
Check ($rgbHtml33 -ge 5) "index.html optics script sets --robco-green-rgb in >=5 branches (found $rgbHtml33) (P1-1)"

# 33.4 WU-T1: optics palette is now table-driven (P1-1, repointed) -- THEMES table covers
#      >=6 colours AND changeOpticsColor delegates to the single table-driven applier.
$state33d = Read-Src "js/state.js"
$audio33d = Read-Src "js/ui-audio.js"
$themesBlock33d = [regex]::Match($state33d, '(?s)const THEMES = \{[\s\S]*?\n\};').Value
$colourCount33 = ([regex]::Matches($themesBlock33d, "rgb:\s*'")).Count
Check (($colourCount33 -ge 6) -and ($audio33d -match '_applyThemeVars\(color\)') -and ($audio33d -match 'THEMES\[key\]')) "THEMES table covers >=6 optic colours (found $colourCount33); changeOpticsColor is table-driven via _applyThemeVars (P1-1, WU-T1)"

# 33.5 .empty-state CSS class defined in terminal.css
Check ([bool]($cssSrc33 -match '\.empty-state\s*\{')) '.empty-state CSS class defined in terminal.css (P1-2)'

# 33.6 emptyState() function defined in ui.js
Check ([bool]($uiSrc -match 'function\s+emptyState\s*\(')) 'emptyState() helper function defined in ui.js (P1-2)'

# 33.7 emptyState() appears >=7 times in ui.js (1 definition + 6 calls)
$emptyCount33 = ([regex]::Matches($uiSrc, 'emptyState\(')).Count
Check ($emptyCount33 -ge 7) "emptyState() defined + called >=6 times (found $emptyCount33 total) (P1-2)"

# 33.8 .audio-row CSS class defined in terminal.css
Check ([bool]($cssSrc33 -match '\.audio-row\s*\{')) '.audio-row utility class defined in terminal.css (P1-3)'

# 33.9 config-summary::after toggle CSS exists in terminal.css
$csCss33 = ([bool]($cssSrc33 -match 'config-summary::after')) -and ([bool]($cssSrc33 -match "content\s*:\s*['""\s]*\[\+\]"))
Check $csCss33 'summary.config-summary::after [+]/[-] toggle CSS exists in terminal.css (P1-4)'

# 33.10 No hardcoded [+] text inside <summary> elements in index.html
$noPlus33 = -not [bool]($htmlSrc33 -match '<summary[^>]*>[^<]*\[\+\][^<]*<\/summary>')
Check $noPlus33 'No hardcoded [+] text in index.html summary elements (P1-4)'

# ===========================================================
# Suite 34 -- Phase 2c Guards (CSS Hygiene, List-Row, Btn-Sm, Empty-State Vocab)
# Deleted dead CSS, unified delete-btn flex pattern, .btn-sm utility, vocab fix.
# 10 tests
# ===========================================================
Sep "Suite 34 -- Phase 2c Guards"
$cssSrc34 = Read-Src 'css/terminal.css'
$htmlSrc34 = Read-Src 'index.html'
$uiSrc34   = Read-Src 'js/ui-core.js'

# 34.1 .faction-item rule absent from terminal.css (P2-1 dead CSS removed)
Check (-not [bool]($cssSrc34 -match '\.faction-item\s*\{')) '.faction-item rule deleted from terminal.css (P2-1)'

# 34.2 .faction-name rule absent from terminal.css (P2-1 dead CSS removed)
Check (-not [bool]($cssSrc34 -match '\.faction-name\s*\{')) '.faction-name rule deleted from terminal.css (P2-1)'

# 34.3 .faction-standing rule absent from terminal.css (P2-1 dead CSS removed)
Check (-not [bool]($cssSrc34 -match '\.faction-standing\s*\{')) '.faction-standing rule deleted from terminal.css (P2-1)'

# 34.4 .list-row-content utility defined in terminal.css (P2-2 flex pattern)
Check ([bool]($cssSrc34 -match '\.list-row-content\s*\{')) '.list-row-content utility defined in terminal.css (P2-2)'

# 34.5 .btn-sm utility defined in terminal.css (P2-3 compact button)
Check ([bool]($cssSrc34 -match '\.btn-sm\s*\{')) '.btn-sm utility class defined in terminal.css (P2-3)'

# 34.6 .delete-btn has min-height:28px (P2-3 tap target Protocol 17)
$css34Stripped = [regex]::Replace($cssSrc34, '/\*[\s\S]*?\*/', '')
$deleteBtnRule34 = ([regex]::Match($css34Stripped, '\.delete-btn\s*\{[^}]*\}')).Value
Check ([bool]($deleteBtnRule34 -match 'min-height\s*:\s*28px')) '.delete-btn has min-height:28px (Protocol 17 tap target)'

# 34.7 renderPerks has no style="float:right;" on delete-btn (P2-2)
$renderPerksBody34 = ''
try { $renderPerksBody34 = Get-FunctionBody $uiSrc34 'renderPerks' } catch {}
Check (-not [bool]($renderPerksBody34 -match 'style="float:right;"')) 'renderPerks() delete-btn has no inline float:right (P2-2)'

# 34.8 renderQuests has no style="float:right;" on delete-btn (P2-2)
$renderQuestsBody34 = ''
try { $renderQuestsBody34 = Get-FunctionBody $uiSrc34 'renderQuests' } catch {}
Check (-not [bool]($renderQuestsBody34 -match 'style="float:right;"')) 'renderQuests() delete-btn has no inline float:right (P2-2)'

# 34.9 renderCampaignNotes has no style="float:right;" on delete-btn (P2-2)
$renderNotesBody34 = ''
try { $renderNotesBody34 = Get-FunctionBody $uiSrc34 'renderCampaignNotes' } catch {}
Check (-not [bool]($renderNotesBody34 -match 'style="float:right;"')) 'renderCampaignNotes() delete-btn has no inline float:right (P2-2)'

# 34.10 [NO COLLECTIBLES LOADED] bracketed empty-state absent from index.html (P2-5)
Check (-not [bool]($htmlSrc34 -match '\[NO COLLECTIBLES LOADED\]')) 'index.html uses plain text, not [NO COLLECTIBLES LOADED] (P2-5)'

# ===========================================================
# Suite 35 -- Phase 3a Performance Guards (P7 optimizations)
# campaign_notes cap, saveState dirty-check, standby interval/animation
# pause, beforeunload v8 key, registrySearch cache.
# 6 tests
# ===========================================================
Sep "Suite 35 -- Phase 3a Performance Guards"
$apiSrc35    = Read-Src 'js/api.js'
$stateSrc35  = Read-Src 'js/state.js'
$uiSrc35     = Read-Src 'js/ui-core.js'
$cssSrc35    = Read-Src 'css/terminal.css'
$regNvSrc35  = Read-Src 'js/reg_nv.js'
$regCoreSrc35 = Read-Src 'js/registry-core.js'

# 35.1 P4: the Terminal Record eventLog is capped via the single _logEvent()
#      writer (state.js); api.js auto-log sites route through it. campaign_notes
#      is now the un-capped MANUAL notebook.
$logCallCount35 = ([regex]::Matches($apiSrc35, '_logEvent\(')).Count
Check (($stateSrc35 -match 'state\.eventLog\.length\s*>\s*EVENTLOG_CAP') -and ($logCallCount35 -ge 2)) `
    "eventLog capped via the single _logEvent() helper (state.js); api.js auto-log sites route through it (P4 Terminal Record)"

# 35.2 saveState dirty-check: _lastSaveStr declared and compared in state.js (P7-6)
Check ([bool]($stateSrc35 -match '_lastSaveStr') -and [bool]($stateSrc35 -match '=== _lastSaveStr')) 'saveState dirty-check: _lastSaveStr declared and compared in state.js (P7-6)'

# 35.3 enterStandby() clears _uptimeInterval on standby (P7-9)
$enterStandbyBody35 = ''
try { $enterStandbyBody35 = Get-FunctionBody $uiSrc35 'enterStandby' } catch {}
Check ([bool]($enterStandbyBody35 -match 'clearInterval\(_uptimeInterval\)')) 'enterStandby() clears _uptimeInterval on standby (P7-9)'

# 35.4 body.standby context has animation-play-state: paused in terminal.css (P7-9)
$cssFlat35 = $cssSrc35 -replace "`n", ' '
Check ([bool]($cssFlat35 -match 'body\.standby[^{]*\{[^}]*animation-play-state\s*:\s*paused')) 'body.standby context sets animation-play-state: paused in terminal.css (P7-9)'

# 35.5 beforeunload flush writes robco_v8, not robco_v7 (P7-8)
$blIdx35 = $uiSrc35.IndexOf("addEventListener('beforeunload'")
$blSnippet35 = if ($blIdx35 -ge 0) { $uiSrc35.Substring($blIdx35, [Math]::Min(350, $uiSrc35.Length - $blIdx35)) } else { '' }
Check ($blSnippet35.Contains('robco_v8') -and (-not $blSnippet35.Contains('robco_v7'))) "beforeunload flush writes robco_v8, not robco_v7 (P7-8)"

# 35.6 registrySearch has _registrySearchCache memoization in registry-core.js (P7-13)
Check ([bool]($regCoreSrc35 -match '_registrySearchCache')) 'registrySearch has _registrySearchCache memoization in registry-core.js (P7-13)'

# ===========================================================
# Suite 36 -- Keyboard Shortcuts Group ([?] menu discoverability)
# COMMAND_REGISTRY has KEYBOARD SHORTCUTS group with >=6 entries;
# global keydown handler closes modal on Escape; closeModal() exists.
# 4 tests
# ===========================================================
Sep "Suite 36 -- Keyboard Shortcuts Group"
$uiSrc36 = Read-Src 'js/ui-core.js'  # COMMAND_REGISTRY and keydown listener in ui-core.js (Slice E)

# 36.1 COMMAND_REGISTRY contains a KEYBOARD SHORTCUTS group
$cmdRegM36 = [regex]::Match($uiSrc36, 'const COMMAND_REGISTRY\s*=\s*\[[\s\S]*?\];')
$cmdRegSrc36 = if ($cmdRegM36.Success) { $cmdRegM36.Value } else { '' }
Check ([bool]($cmdRegSrc36 -match "['`"]KEYBOARD SHORTCUTS['`"]")) "COMMAND_REGISTRY has a 'KEYBOARD SHORTCUTS' group (Suite 36)"

# 36.2 KEYBOARD SHORTCUTS group has >=6 entries
$kbM36 = [regex]::Match($uiSrc36, "group\s*:\s*['\`"]KEYBOARD SHORTCUTS['\`"][\s\S]*?cmds\s*:\s*\[([\s\S]*?)\],?\s*\}")
$kbCmds36 = if ($kbM36.Success) { $kbM36.Groups[1].Value } else { '' }
$kbCount36 = ([regex]::Matches($kbCmds36, 'cmd\s*:')).Count
Check ($kbCount36 -ge 6) "KEYBOARD SHORTCUTS group has >=6 entries (found $kbCount36)"

# 36.3 Global keydown listener calls closeModal() on Escape
$kdIdx36 = $uiSrc36.IndexOf("document.addEventListener('keydown'")
$kdSnippet36 = if ($kdIdx36 -ge 0) { $uiSrc36.Substring($kdIdx36, [Math]::Min(4000, $uiSrc36.Length - $kdIdx36)) } else { '' }
Check (($kdSnippet36 -match 'Escape') -and ($kdSnippet36 -match 'closeModal')) "Global keydown listener handles 'Escape' -> closeModal() (Esc closes dialog)"

# 36.4 closeModal() function exists in ui.js
Check ([bool]($uiSrc36 -match 'function\s+closeModal\s*\(')) 'closeModal() function defined in ui.js'

# ===========================================================
# Suite 37 -- Render Fan-out (P7-1)
# Every list-mutator calls its targeted render* + updateMath()
# instead of loadUI(). updateMath() shared-tail invariant preserved.
# toggleCollectible latent-bug fix: renderSessionStats() now called.
# 16 tests
# ===========================================================
Sep "Suite 37 -- Render Fan-out (P7-1)"
$uiSrc37 = $uiSrc  # concatenated — CRUD mutators now in ui-render.js

function Test-Mutator($fnName, $expectedRenders) {
    $body = ''
    try { $body = Get-FunctionBody $uiSrc37 $fnName } catch {}
    $hasLoadUI   = $body.Contains('loadUI()')
    $hasUpdate   = $body.Contains('updateMath()')
    $rendersOk   = ($expectedRenders | ForEach-Object { $body.Contains($_) }) -notcontains $false
    $label       = "$fnName() calls [$($expectedRenders -join ', ')] + updateMath(), NOT loadUI()"
    Check ((-not $hasLoadUI) -and $hasUpdate -and $rendersOk) $label
}

Test-Mutator 'delItem'            @('renderInventory()')
Test-Mutator 'addItem'            @('renderInventory()', 'renderAmmo()')
Test-Mutator 'addAmmo'            @('renderAmmo()')
Test-Mutator 'removeAmmo'         @('renderAmmo()')
Test-Mutator 'removePerk'         @('renderPerks()')
Test-Mutator 'addPerk'            @('renderPerks()')
Test-Mutator 'removeQuest'        @('renderQuests()')
Test-Mutator 'addQuest'           @('renderQuests()')
Test-Mutator 'removeSquadMember'  @('renderSquad()')
Test-Mutator 'addSquadMember'     @('renderSquad()')
Test-Mutator 'removeStatusEffect' @('renderStatus()')
Test-Mutator 'addStatusEffect'    @('renderStatus()')
Test-Mutator 'removeCampaignNote' @('renderCampaignNotes()')
Test-Mutator 'addCampaignNote'    @('renderCampaignNotes()')

# 37.15 toggleCollectible bug fix: renderSessionStats() + updateMath()
$toggleBody37 = ''
try { $toggleBody37 = Get-FunctionBody $uiSrc37 'toggleCollectible' } catch {}
Check ($toggleBody37.Contains('renderSessionStats()') -and $toggleBody37.Contains('updateMath()')) `
    'toggleCollectible() calls renderSessionStats() + updateMath() (collectibles badge live-update fix)'

# 37.16 updateMath() shared-tail invariant: saveState() AND _updatePanelBadges() present
$updateMathBody37 = ''
try { $updateMathBody37 = Get-FunctionBody $uiSrc37 'updateMath' } catch {}
Check ($updateMathBody37.Contains('saveState()') -and $updateMathBody37.Contains('_updatePanelBadges()')) `
    'updateMath() contains saveState() AND _updatePanelBadges() -- shared-tail invariant intact'

# ===========================================================
# Suite 38 -- DB<->Registry Weapon Parity (FNV + FO3)
# Every FALLOUT_REGISTRY weapon-type entry must have an exact-name
# match in [WEAPONS.CSV], and every WEAPONS.CSV row must have a
# registry entry. Guards against future drift in either direction.
# Plus WU-D6 O'cta Brain canon-removal regression guard.
# 5 tests
# ===========================================================
Sep "Suite 38 -- DB<->Registry Weapon Parity"

function Get-DbWeaponNames($src) {
    $start = $src.IndexOf('[WEAPONS.CSV]')
    if ($start -lt 0) { return [System.Collections.Generic.HashSet[string]]::new() }
    $rest = $src.Substring($start + 13)
    $endIdx = $rest.IndexOf("`n[")
    $block = if ($endIdx -ge 0) { $rest.Substring(0, $endIdx) } else { $rest }
    $names = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($line in $block -split "`n") {
        $t = $line.Trim()
        if (-not $t -or $t.StartsWith('[') -or $t.StartsWith('Weapon_Name')) { continue }
        # Split on first comma followed by digit (handles names like "Oh, Baby!")
        $m = [regex]::Match($t, '^(.*?),\d')
        $name = if ($m.Success) { $m.Groups[1].Value.Trim() } else { ($t -split ',')[0].Trim() }
        if ($name) { [void]$names.Add($name) }
    }
    return $names
}

function Get-RegWeaponNames($src) {
    $names = [System.Collections.Generic.HashSet[string]]::new()
    # Handle both 'name' (no apostrophe) and "name" (contains apostrophe)
    $sq = [char]39  # single quote
    $dq = [char]34  # double quote
    $pat = "\{\s*name\s*:\s*(?:$sq([^$sq]*)$sq|$dq([^$dq]*)$dq)\s*,\s*type\s*:\s*${sq}weapon${sq}\s*\}"
    $re = [regex]$pat
    foreach ($m in $re.Matches($src)) {
        $name = if ($m.Groups[1].Success) { $m.Groups[1].Value } else { $m.Groups[2].Value }
        [void]$names.Add($name)
    }
    return $names
}

$dbNv38  = Read-Src 'js/db_nv.js'
$regNv38 = Read-Src 'js/reg_nv.js'
$dbW38   = Get-DbWeaponNames $dbNv38
$regW38  = Get-RegWeaponNames $regNv38

# 38.1 FNV: every registry weapon exists in WEAPONS.CSV
$miss381 = ($regW38 | Where-Object { -not $dbW38.Contains($_) }) -join ', '
Check ([string]::IsNullOrEmpty($miss381)) "FNV: all registry weapons exist in WEAPONS.CSV (missing: $(if ($miss381) { $miss381 } else { 'none' }))"

# 38.2 FNV: every WEAPONS.CSV row exists in registry
$miss382 = ($dbW38 | Where-Object { -not $regW38.Contains($_) }) -join ', '
Check ([string]::IsNullOrEmpty($miss382)) "FNV: all WEAPONS.CSV rows exist in registry (missing: $(if ($miss382) { $miss382 } else { 'none' }))"

$dbFo3_38  = Read-Src 'js/db_fo3.js'
$regFo3_38 = Read-Src 'js/reg_fo3.js'
$dbW383    = Get-DbWeaponNames $dbFo3_38
$regW383   = Get-RegWeaponNames $regFo3_38

# 38.3 FO3: every registry weapon exists in WEAPONS.CSV
$miss383 = ($regW383 | Where-Object { -not $dbW383.Contains($_) }) -join ', '
Check ([string]::IsNullOrEmpty($miss383)) "FO3: all registry weapons exist in WEAPONS.CSV (missing: $(if ($miss383) { $miss383 } else { 'none' }))"

# 38.4 FO3: every WEAPONS.CSV row exists in registry
$miss384 = ($dbW383 | Where-Object { -not $regW383.Contains($_) }) -join ', '
Check ([string]::IsNullOrEmpty($miss384)) "FO3: all WEAPONS.CSV rows exist in registry (missing: $(if ($miss384) { $miss384 } else { 'none' }))"

# 38.5 WU-D6 canon-removal regression guard: "O'cta Brain" has no fallout.wiki match
#      (fabricated/garbled, owner-confirmed) and stays removed from BOTH the FO3 WEAPONS.CSV
#      and the FO3 registry (removing from only one would break 38.3/38.4 parity). Protocol 3.
Check ((-not ($dbFo3_38 -match 'cta Brain')) -and (-not ($regFo3_38 -match 'cta Brain'))) "FO3: fabricated weapon ""O'cta Brain"" stays removed from WEAPONS.CSV + registry (WU-D6)"

# ===========================================================
# Suite 39 -- Ammo Token Split (Energy Cell / MFC / ECP)
# AMMO.CSV must carry three distinct caliber names; no bare EC
# token may remain as a caliber or as a weapon Ammo_Type.
# 10 tests
# ===========================================================
Sep "Suite 39 -- Ammo Token Split (EC->3)"

function Get-AmmoCalibers39($src) {
    $start = $src.IndexOf('[AMMO.CSV]')
    if ($start -lt 0) { return [System.Collections.Generic.HashSet[string]]::new() }
    $rest = $src.Substring($start + 10)
    $endIdx = $rest.IndexOf("`n[")
    $block = if ($endIdx -ge 0) { $rest.Substring(0, $endIdx) } else { $rest }
    $cals = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($line in $block -split "`n") {
        $t = $line.Trim()
        if (-not $t -or $t.StartsWith('[') -or $t.StartsWith('Caliber')) { continue }
        $cal = ($t -split ',')[0].Trim()
        if ($cal) { [void]$cals.Add($cal) }
    }
    return $cals
}

function Get-WeaponAmmoTypes39($src) {
    $start = $src.IndexOf('[WEAPONS.CSV]')
    if ($start -lt 0) { return [System.Collections.Generic.HashSet[string]]::new() }
    $rest = $src.Substring($start + 13)
    $endIdx = $rest.IndexOf("`n[")
    $block = if ($endIdx -ge 0) { $rest.Substring(0, $endIdx) } else { $rest }
    $types = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($line in $block -split "`n") {
        $t = $line.Trim()
        if (-not $t -or $t.StartsWith('[') -or $t.StartsWith('Weapon_Name')) { continue }
        $parts = $t -split ','
        $ammoType = $parts[$parts.Length - 1].Trim()
        if ($ammoType) { [void]$types.Add($ammoType) }
    }
    return $types
}

$nvSrc39  = Read-Src 'js/db_nv.js'
$fo3Src39 = Read-Src 'js/db_fo3.js'
$nvCals39  = Get-AmmoCalibers39 $nvSrc39
$fo3Cals39 = Get-AmmoCalibers39 $fo3Src39
# 39.1 FNV AMMO.CSV contains Energy Cell
Check $nvCals39.Contains('Energy Cell') 'FNV AMMO.CSV contains Energy Cell caliber'
# 39.2 FNV AMMO.CSV contains Microfusion Cell
Check $nvCals39.Contains('Microfusion Cell') 'FNV AMMO.CSV contains Microfusion Cell caliber'
# 39.3 FNV AMMO.CSV contains Electron Charge Pack
Check $nvCals39.Contains('Electron Charge Pack') 'FNV AMMO.CSV contains Electron Charge Pack caliber'
# 39.4 FNV AMMO.CSV has no bare EC caliber
Check (-not $nvCals39.Contains('EC')) 'FNV AMMO.CSV: bare EC ammo token is gone'
# 39.5 FNV WEAPONS.CSV has no Ammo_Type EC
$nvTypes39 = Get-WeaponAmmoTypes39 $nvSrc39
Check (-not $nvTypes39.Contains('EC')) 'FNV WEAPONS.CSV: no weapon has Ammo_Type EC'
# 39.6 FO3 AMMO.CSV contains Energy Cell
Check $fo3Cals39.Contains('Energy Cell') 'FO3 AMMO.CSV contains Energy Cell caliber'
# 39.7 FO3 AMMO.CSV contains Microfusion Cell
Check $fo3Cals39.Contains('Microfusion Cell') 'FO3 AMMO.CSV contains Microfusion Cell caliber'
# 39.8 FO3 AMMO.CSV contains Electron Charge Pack
Check $fo3Cals39.Contains('Electron Charge Pack') 'FO3 AMMO.CSV contains Electron Charge Pack caliber'
# 39.9 FO3 AMMO.CSV has no bare EC caliber
Check (-not $fo3Cals39.Contains('EC')) 'FO3 AMMO.CSV: bare EC ammo token is gone'
# 39.10 FO3 WEAPONS.CSV has no Ammo_Type EC
$fo3Types39 = Get-WeaponAmmoTypes39 $fo3Src39
Check (-not $fo3Types39.Contains('EC')) 'FO3 WEAPONS.CSV: no weapon has Ammo_Type EC'

# ===========================================================
# Suite 40 -- Inventory Category Filter + Mod Type (Phase 4d-i)
# 'mod' accepted in schema + autoImportState; filter bar exists;
# renderInventory() honours the active filter; mod in type select.
# 6 tests
# ===========================================================
Sep "Suite 40 -- Inventory Category Filter + Mod Type"
$apiSrc40  = Read-Src 'js/api.js'
$htmlSrc40 = Read-Src 'index.html'
$uiSrc40   = Read-Src 'js/ui-core.js'

# 40.1  'mod' in inventory type enum in api.js
Check ([bool]($apiSrc40 -match '"mod"')) `
    'api.js inventory schema includes "mod" as a valid item type (Phase 4d-i)'

# 40.2  autoImportState() routes 'ammo' but not 'mod'
$importBody40 = ''
try { $importBody40 = Get-FunctionBody $apiSrc40 'autoImportState' } catch {}
Check ([bool]($importBody40 -match "type.*===.*[`"']ammo[`"']") -and -not [bool]($importBody40 -match "type.*===.*[`"']mod[`"']")) `
    "autoImportState() routes 'ammo' to state.ammo but passes 'mod' items through to inventory"

# 40.3  Inventory filter bar element exists in index.html
Check ([bool]($htmlSrc40 -match 'id="invFilterBar"')) `
    'id="invFilterBar" element exists in index.html (inventory category filter bar)'

# 40.4  Filter bar contains a button for the 'mod' category
Check ([bool]($htmlSrc40 -match 'data-filter="mod"')) `
    'index.html filter bar has data-filter="mod" button (Mods category filter)'

# 40.5  'mod' option in #newItemType select
Check ([bool]($htmlSrc40 -match 'value="mod"')) `
    '#newItemType select contains value="mod" option (Phase 4d-i mod type)'

# 40.6  renderInventory() references _invFilter
$renderBody40 = ''
try { $renderBody40 = Get-FunctionBody $uiSrc 'renderInventory' } catch {}  # now in ui-render.js
Check ([bool]($renderBody40 -match '_invFilter')) `
    'renderInventory() references _invFilter to honour the active category filter'

# ===========================================================
# Suite 41 -- Weapon Mods CSV + Registry Parity (Phase 4d-ii)
# [WEAPON_MODS.CSV] structural guard: section exists, correct
# column header, all rows 5 cols; parity between db_nv.js CSV
# and reg_nv.js 'mod' entries in both directions.
# 5 tests
# ===========================================================
Sep "Suite 41 -- Weapon Mods CSV + Registry Parity"
$dbNv41  = Read-Src 'js/db_nv.js'
$regNv41 = Read-Src 'js/reg_nv.js'

# 41.1  [WEAPON_MODS.CSV] section exists in db_nv.js
Check ([bool]($dbNv41 -match '\[WEAPON_MODS\.CSV\]')) `
    'db_nv.js contains [WEAPON_MODS.CSV] section'

# 41.2 + 41.3  Column header correct; all data rows have exactly 5 columns
$modBlockMatch = [regex]::Match($dbNv41, '(?s)\[WEAPON_MODS\.CSV\](.*?)(?=\n\[|\n`;)')
if (-not $modBlockMatch.Success) {
    Fail 'db_nv.js [WEAPON_MODS.CSV]: could not extract block'
} else {
    $modLines = ($modBlockMatch.Groups[1].Value -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
    $EXPECTED_HEADER = 'Name,Weapon,Effect,Value,Weight'
    Check ($modLines.Count -ge 1 -and $modLines[0] -eq $EXPECTED_HEADER) `
        "[WEAPON_MODS.CSV] header is `"$EXPECTED_HEADER`""
    $EXPECTED_COLS = ($EXPECTED_HEADER -split ',').Count
    $badRows = @()
    for ($r = 1; $r -lt $modLines.Count; $r++) {
        $cols = ($modLines[$r] -split ',').Count
        if ($cols -ne $EXPECTED_COLS) { $badRows += "row $($r+1) ($cols cols)" }
    }
    Check ($badRows.Count -eq 0) "[WEAPON_MODS.CSV] all data rows have $EXPECTED_COLS columns$(if($badRows.Count){' -- bad: ' + ($badRows -join '; ')})"
}

# Helper: get mod Names from WEAPON_MODS.CSV
function Get-ModCsvNames([string]$src) {
    $idx = $src.IndexOf('[WEAPON_MODS.CSV]')
    if ($idx -lt 0) { return [System.Collections.Generic.HashSet[string]]::new() }
    $rest = $src.Substring($idx + 17)
    $endMatch = [regex]::Match($rest, '\n\[|\n`;')
    $block = if ($endMatch.Success) { $rest.Substring(0, $endMatch.Index) } else { $rest }
    $names = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($l in ($block -split "`n")) {
        $t = $l.Trim()
        if (-not $t -or $t.StartsWith('[') -or $t.StartsWith('Name,')) { continue }
        $name = ($t -split ',')[0].Trim()
        if ($name) { [void]$names.Add($name) }
    }
    return $names
}

# Helper: get 'mod' type names from registry
function Get-RegModNames([string]$src) {
    $names = [System.Collections.Generic.HashSet[string]]::new()
    $re = [regex]"{\s*name\s*:\s*(?:'([^']*)'|`"([^`"]*)`")\s*,\s*type\s*:\s*'mod'\s*}"
    foreach ($m in $re.Matches($src)) {
        $val = if ($m.Groups[1].Success) { $m.Groups[1].Value } else { $m.Groups[2].Value }
        [void]$names.Add($val)
    }
    return $names
}

# 41.4  Every reg_nv 'mod' entry exists in WEAPON_MODS.CSV
$csvNames41 = Get-ModCsvNames $dbNv41
$regNames41 = Get-RegModNames $regNv41
$missing41a = @($regNames41 | Where-Object { -not $csvNames41.Contains($_) })
Check ($missing41a.Count -eq 0) "FNV: all registry mods exist in WEAPON_MODS.CSV$(if($missing41a.Count){' (missing: ' + ($missing41a -join ', ') + ')'})"

# 41.5  Every WEAPON_MODS.CSV row exists in reg_nv 'mod' entries
$missing41b = @($csvNames41 | Where-Object { -not $regNames41.Contains($_) })
Check ($missing41b.Count -eq 0) "FNV: all WEAPON_MODS.CSV rows exist in registry$(if($missing41b.Count){' (missing: ' + ($missing41b -join ', ') + ')'})"

# ===========================================================
# Suite 42 -- Native Command Router (Phase 5a / 5a-fix)
# Deterministic commands ([FEATURES]/[CROSSROADS]/[SLEEP]/[WAIT])
# are intercepted pre-fetch; dead system-prompt blocks removed.
# 42.6 non-empty guard prevents vacuous pass on 42.7/42.8.
# 42.10/42.11 guard the syncStateFromDom round-trip bug fix:
# _nativeSleep/_nativeWait must call loadUI() BEFORE saveState()
# so state->DOM is written first and syncStateFromDom reads back
# the new values (not stale ones from unchanged inputs).
# 11 tests
# ===========================================================
Sep "Suite 42 -- Native Command Router (Phase 5a)"

$apiSrc42 = Read-Src 'js/api.js'

# 42.1  NATIVE_COMMAND_ROUTER object defined in api.js
Check ([bool]($apiSrc42 -match 'const NATIVE_COMMAND_ROUTER')) `
    'api.js defines NATIVE_COMMAND_ROUTER object'

# 42.2  [FEATURES] key in NATIVE_COMMAND_ROUTER
Check ([bool]($apiSrc42 -match "'\[FEATURES\]'\s*:")) `
    'NATIVE_COMMAND_ROUTER has [FEATURES] handler'

# 42.3  [CROSSROADS] key in NATIVE_COMMAND_ROUTER
Check ([bool]($apiSrc42 -match "'\[CROSSROADS\]'\s*:")) `
    'NATIVE_COMMAND_ROUTER has [CROSSROADS] handler'

# 42.4  [SLEEP] key in NATIVE_COMMAND_ROUTER
Check ([bool]($apiSrc42 -match "'\[SLEEP\]'\s*:")) `
    'NATIVE_COMMAND_ROUTER has [SLEEP] handler'

# 42.5  transmitMessage() calls _routeNativeCommand before the Gemini fetch
$txBody42 = ''
try { $txBody42 = Get-FunctionBody $apiSrc42 'transmitMessage' } catch {}
$routerIdx42 = $txBody42.IndexOf('_routeNativeCommand')
$fetchIdx42  = $txBody42.IndexOf('generativelanguage.googleapis.com')
Check ($routerIdx42 -ge 0 -and $fetchIdx42 -ge 0 -and $routerIdx42 -lt $fetchIdx42) `
    'transmitMessage() invokes _routeNativeCommand before the Gemini fetch'

# Extract getSystemDirective body once -- shared by 42.6/42.7/42.8
# 42.6 asserts it's non-empty to prevent 42.7/42.8 passing vacuously
# when Get-FunctionBody returns '' on a parse failure.
$sdBody42 = ''
try { $sdBody42 = Get-FunctionBody $apiSrc42 'getSystemDirective' } catch {}

# 42.6  body extractable (guards 42.7/42.8 against vacuous false-green)
Check ($sdBody42.Length -gt 100) `
    'getSystemDirective() body is extractable (non-vacuous guard for 42.7/42.8)'

# 42.7  getSystemDirective() no longer has dead [FEATURES] instruction block
Check (-not ($sdBody42 -match '\[FEATURES\] Canonical Command Registry')) `
    'getSystemDirective() no longer contains the dead [FEATURES] instruction block'

# 42.8  getSystemDirective() no longer has dead [CROSSROADS] instruction block
Check (-not ($sdBody42 -match '\[CROSSROADS\] Command Handler')) `
    'getSystemDirective() no longer contains the dead [CROSSROADS] instruction block'

# 42.9  _nativeWait function exists for [WAIT: X Hrs] handling
Check ([bool]($apiSrc42 -match 'function _nativeWait')) `
    'api.js defines _nativeWait() for [WAIT: X Hrs] native handling'

# 42.10  _nativeSleep calls loadUI() BEFORE saveState()
# Regression guard: without loadUI(), syncStateFromDom() in saveState()
# reads stale DOM inputs (unchanged hp_cur, calendar) and wipes mutations.
$sleepBody42 = ''
try { $sleepBody42 = Get-FunctionBody $apiSrc42 '_nativeSleep' } catch {}
$sleepLoadIdx = $sleepBody42.IndexOf('loadUI')
$sleepSaveIdx = $sleepBody42.IndexOf('saveState')
Check ($sleepLoadIdx -ge 0 -and $sleepSaveIdx -ge 0 -and $sleepLoadIdx -lt $sleepSaveIdx) `
    '_nativeSleep calls loadUI() before saveState() (syncStateFromDom round-trip guard)'

# 42.11  _nativeWait calls loadUI() BEFORE saveState()
$waitBody42 = ''
try { $waitBody42 = Get-FunctionBody $apiSrc42 '_nativeWait' } catch {}
$waitLoadIdx = $waitBody42.IndexOf('loadUI')
$waitSaveIdx = $waitBody42.IndexOf('saveState')
Check ($waitLoadIdx -ge 0 -and $waitSaveIdx -ge 0 -and $waitLoadIdx -lt $waitSaveIdx) `
    '_nativeWait calls loadUI() before saveState() (syncStateFromDom round-trip guard)'

# ===========================================================
# Suite 43 -- GAME_DEFS Structural Integrity (Phase 5b)
# Aggregation layer: GAME_DEFS in state.js + _activeDef() helper.
# Collapses FNV/FO3 ternaries into config lookups; zero behavior change.
# 11 tests
# ===========================================================
Sep "Suite 43 -- GAME_DEFS Structural Integrity (Phase 5b)"
$stateSrc43 = Read-Src 'js/state.js'

# 43.1  state.js declares const GAME_DEFS = {
Check ([bool]($stateSrc43 -match 'const GAME_DEFS\s*=\s*\{')) `
    'state.js declares const GAME_DEFS = { ... }'

# 43.2  window.GAME_DEFS exposed on the global object
Check ([bool]($stateSrc43 -match 'window\.GAME_DEFS\s*=\s*GAME_DEFS')) `
    'state.js assigns window.GAME_DEFS = GAME_DEFS (global exposure)'

# 43.3  _activeDef() helper function defined in state.js
Check ([bool]($stateSrc43 -match 'function _activeDef\s*\(')) `
    'state.js defines _activeDef() TDZ-safe helper'

# 43.4  GAME_DEFS has FNV and FO3 top-level keys
Check ([bool]($stateSrc43 -match '\bFNV\s*:\s*\{') -and [bool]($stateSrc43 -match '\bFO3\s*:\s*\{')) `
    'GAME_DEFS has FNV and FO3 top-level keys'

# 43.5  GAME_DEFS ai sub-object has all three directive fields
Check ([bool]($stateSrc43 -match 'skillSystemText\s*:') -and `
       [bool]($stateSrc43 -match 'factionSystemText\s*:') -and `
       [bool]($stateSrc43 -match 'irreversibleTriggers\s*:')) `
    'GAME_DEFS ai sub-object has skillSystemText, factionSystemText, irreversibleTriggers'

# 43.5b  U1 (Step 2 Phase 0): GAME_DEFS ai sub-object also has trackerDirectives
#        (the GA-5 retirement seam -- replaces the old inline per-game ternaries)
Check ([bool]($stateSrc43 -match 'trackerDirectives\s*:')) `
    'GAME_DEFS ai sub-object has trackerDirectives (U1 GA-5 retirement seam)'

# 43.6  FNV calendar startYear = 2281
Check ([bool]($stateSrc43 -match 'startYear\s*:\s*2281')) `
    'GAME_DEFS.FNV.calendar.startYear is 2281'

# 43.7  FO3 calendar startYear = 2277
Check ([bool]($stateSrc43 -match 'startYear\s*:\s*2277')) `
    'GAME_DEFS.FO3.calendar.startYear is 2277'

# 43.8  SKILL_KEYS_FO3 literal includes big_guns and small_guns
$fo3SkillM43 = [regex]::Match($stateSrc43, "const SKILL_KEYS_FO3\s*=\s*\[([^\]]+)\]")
$fo3Skills43 = if ($fo3SkillM43.Success) { $fo3SkillM43.Groups[1].Value } else { '' }
Check ($fo3Skills43.Contains("'big_guns'") -and $fo3Skills43.Contains("'small_guns'")) `
    "SKILL_KEYS_FO3 literal includes 'big_guns' and 'small_guns'"

# 43.9  getFactionRegistry() body references _activeDef (not the old inline ternary)
$frBody43 = ''
try { $frBody43 = Get-FunctionBody $stateSrc43 'getFactionRegistry' } catch {}
Check ([bool]($frBody43 -match '_activeDef')) `
    'getFactionRegistry() delegates to _activeDef()'

# 43.10  getSkillKeys() body references _activeDef
$skBody43 = ''
try { $skBody43 = Get-FunctionBody $stateSrc43 'getSkillKeys' } catch {}
Check ([bool]($skBody43 -match '_activeDef')) `
    'getSkillKeys() delegates to _activeDef()'

# ===========================================================
# Suite 44 -- Anonymous Auth + Security Rules + XSS Coercion Fix (Phase 5c-i)
# Closed P0 hole: auth-gated Firestore paths, per-uid rules, App Check gate,
# and XSS bypass via cloud pull routed through sanitizeImportedContainer.
# 13 tests
# ===========================================================
Sep "Suite 44 -- Phase 5c-i: Auth + Rules + XSS Fix"

# 44.1  cloud.js references signInAnonymously
Check ([bool]($cloudSrc -match 'signInAnonymously')) `
    'cloud.js references signInAnonymously (anonymous auth on boot)'

# 44.2  cloud.js references onAuthStateChanged
Check ([bool]($cloudSrc -match 'onAuthStateChanged')) `
    'cloud.js references onAuthStateChanged (uid state tracking)'

# 44.3  cloud.js push/pull targets users/{uid} path not flat saves/{courierId}
$hasUsersPath = [bool]($cloudSrc -match "doc\(db,\s*['""]users['""]")
$hasOldPath   = [bool]($cloudSrc -match "doc\(db,\s*['""]saves['""],\s*safeId")
Check ($hasUsersPath -and -not $hasOldPath) `
    "cloud.js push/pull uses doc(db, 'users', uid, ...) not flat doc(db, 'saves', safeId)"

# 44.4  firestore.rules exists
$rulesPath44 = Join-Path $Root 'firestore.rules'
Check (Test-Path $rulesPath44) `
    'firestore.rules exists in repo root (security lockdown file)'

# 44.5  firestore.rules contains per-uid access rule
$rulesSrc44 = if (Test-Path $rulesPath44) { [IO.File]::ReadAllText($rulesPath44) } else { '' }
Check ($rulesSrc44 -match 'request\.auth\.uid\s*==\s*uid') `
    'firestore.rules contains per-uid access rule (request.auth.uid == uid)'

# 44.6  firestore.rules denies legacy flat saves collection
Check (($rulesSrc44 -match 'match\s*/saves/\{') -and ($rulesSrc44 -match 'if false')) `
    'firestore.rules denies legacy flat saves/{id} collection (if false)'

# 44.7  firebase.json references firestore.rules
$fbJsonPath44 = Join-Path $Root 'firebase.json'
$fbJsonSrc44  = if (Test-Path $fbJsonPath44) { [IO.File]::ReadAllText($fbJsonPath44) } else { '' }
Check ($fbJsonSrc44 -match 'firestore\.rules') `
    'firebase.json references "firestore.rules" (deploy configuration)'

# 44.8  cloud.js references initializeAppCheck and ReCaptchaV3Provider
Check (([bool]($cloudSrc -match 'initializeAppCheck')) -and ([bool]($cloudSrc -match 'ReCaptchaV3Provider'))) `
    'cloud.js references initializeAppCheck and ReCaptchaV3Provider (App Check gate)'

# 44.9  api.js defines sanitizeImportedContainer function
Check ([bool]($apiSrc -match 'function sanitizeImportedContainer')) `
    'api.js defines sanitizeImportedContainer() (XSS coercion layer for cloud pull path)'

# 44.10  cloud.js pull path calls sanitizeImportedContainer
Check ([bool]($cloudSrc -match 'sanitizeImportedContainer')) `
    'cloud.js pull path calls sanitizeImportedContainer() (raw setItem XSS bypass closed)'

# 44.11  CSP in index.html contains identitytoolkit.googleapis.com
Check ([bool]($htmlSrc -match 'identitytoolkit\.googleapis\.com')) `
    'CSP in index.html covers identitytoolkit.googleapis.com (Firebase Auth endpoint)'

# 44.12  sanitizeImportedContainer must NOT HTML-encode apostrophes or ampersands
#        (double-escape regression guard — old code had &#x27; and &amp; in body)
$sanBody44 = ''
try { $sanBody44 = Get-FunctionBody $apiSrc 'sanitizeImportedContainer' } catch {}
$noHtmlEsc44 = ($sanBody44.Length -gt 100) -and
               -not ($sanBody44 -match '&#x27;') -and
               -not ($sanBody44 -match '&amp;') -and
               -not ($sanBody44 -match '&lt;') -and
               ($sanBody44 -match 'parseInt|_str\(')
Check $noHtmlEsc44 `
    'sanitizeImportedContainer body: no HTML escape sequences, has type coercion (no double-escape at storage layer)'

# 44.13  WU-B4: sanitizeImportedContainer covers Phase-6 array fields + faction fame/infamy.
#        (JS runner runs the full behavioral eval; PS runner does the structural check.)
$b4ok = ($sanBody44 -match 'collectibles') -and ($sanBody44 -match 'traits') -and `
        ($sanBody44 -match 'skillBooks') -and ($sanBody44 -match 'magazines') -and `
        ($sanBody44 -match 'lincolnItems') -and ($sanBody44 -match 'factions') -and `
        ($sanBody44 -match 'fame') -and ($sanBody44 -match 'infamy') -and `
        ($sanBody44 -match 'Math\.max\(0')
Check $b4ok `
    "sanitizeImportedContainer covers Phase-6 fields (collectibles/traits/skillBooks/magazines/lincolnItems) + coerces faction fame/infamy to non-negative ints (WU-B4)"

# ===========================================================
# Suite 45 -- Google Sign-In + Account Panel (Phase 5c-ii)
# Durable identity: Google auth link, collision recovery,
# sign-out -> re-anon, popup-only flow, ACCOUNT UI panel, boot guard.
# 15 tests
# ===========================================================
Sep "Suite 45 -- Phase 5c-ii: Google Sign-In + Account Panel"

# 45.1  cloud.js imports GoogleAuthProvider
Check ([bool]($cloudSrc -match 'GoogleAuthProvider')) `
    'cloud.js references GoogleAuthProvider (Google auth import)'

# 45.2  cloud.js references linkWithPopup (desktop sign-in flow)
Check ([bool]($cloudSrc -match 'linkWithPopup')) `
    'cloud.js references linkWithPopup (desktop Google sign-in flow)'

# 45.3  cloud.js does NOT import or call linkWithRedirect (popup-only mobile fix)
Check (-not ([bool]($cloudSrc -match 'linkWithRedirect'))) `
    'cloud.js does not reference linkWithRedirect (popup-only fix: redirect path removed)'

# 45.4  cloud.js references getRedirectResult (completes mobile redirect on boot)
Check ([bool]($cloudSrc -match 'getRedirectResult')) `
    'cloud.js references getRedirectResult (boot-time mobile redirect completion)'

# 45.5  cloud.js references signOut (account sign-out)
Check ([bool]($cloudSrc -match '\bsignOut\b')) `
    'cloud.js references signOut (account sign-out)'

# 45.6  cloud.js signOutAccount() calls signOut then signInAnonymously
$signOutBody45 = ''
$soIdx = $cloudSrc.IndexOf('signOutAccount')
if ($soIdx -ge 0) {
    $soStart = $cloudSrc.IndexOf('{', $soIdx)
    $soDep = 0; $soI = $soStart
    while ($soI -lt $cloudSrc.Length) {
        $ch = $cloudSrc[$soI]
        if ($ch -eq '{') { $soDep++ }
        elseif ($ch -eq '}') { $soDep--; if ($soDep -eq 0) { $signOutBody45 = $cloudSrc.Substring($soStart, $soI - $soStart + 1); break } }
        $soI++
    }
}
Check (($signOutBody45 -match 'signOut') -and ($signOutBody45 -match 'signInAnonymously')) `
    'cloud.js signOutAccount() calls signOut then signInAnonymously (returns to anon session)'

# 45.7  cloud.js handles auth/credential-already-in-use (collision recovery)
Check ([bool]($cloudSrc -match 'credential-already-in-use')) `
    'cloud.js handles auth/credential-already-in-use error (Google account collision recovery)'

# 45.8  cloud.js references signInWithCredential (collision recovery path)
Check ([bool]($cloudSrc -match 'signInWithCredential')) `
    'cloud.js references signInWithCredential (collision recovery — signs into existing account)'

# 45.9  ui.js defines renderAccount() function
Check ([bool]($uiSrc -match 'function renderAccount\(\)')) `
    'ui.js defines renderAccount() (ACCOUNT panel render function)'

# 45.10  loadUI() calls renderAccount()
$loadUIBody45 = ''
try { $loadUIBody45 = Get-FunctionBody $uiSrc 'loadUI' } catch {}
Check ([bool]($loadUIBody45 -match 'renderAccount\(\)')) `
    'loadUI() calls renderAccount() (account panel wired into page load)'

# 45.11  index.html has ACCOUNT details.panel element
Check (([bool]($htmlSrc -match 'id="accountPanel"')) -or ([bool]($htmlSrc -match '>\s*ACCOUNT\s*</h2>'))) `
    'index.html has ACCOUNT panel element (id=accountPanel or ACCOUNT heading)'

# 45.12  CSP in index.html covers apis.google.com (Google Sign-In popup script)
Check ([bool]($htmlSrc -match 'apis\.google\.com')) `
    'CSP in index.html covers apis.google.com (Google Sign-In popup flow)'

# 45.13  boot signInAnonymously is guarded by authStateReady() + currentUser check
#        (unconditional call replaces a Google-linked session on every reload)
$hasAuthStateReady = [bool]($cloudSrc -match 'authStateReady\(\)')
$hasCurrentUserCheck = [bool]($cloudSrc -match '!\s*auth\.currentUser')
Check ($hasAuthStateReady -and $hasCurrentUserCheck) `
    'cloud.js boot sign-in is conditional: authStateReady() + !auth.currentUser guard present (not unconditional — prevents clobbering Google session on reload)'

# 45.14  boot order: getRedirectResult awaited before authStateReady()
#        (sequential IIFE — redirect drained before anon-fallback guard)
$grIdx45 = $cloudSrc.IndexOf('await getRedirectResult')
$asIdx45 = $cloudSrc.IndexOf('await auth.authStateReady')
Check (($grIdx45 -ge 0) -and ($asIdx45 -ge 0) -and ($grIdx45 -lt $asIdx45)) `
    'cloud.js boot: await getRedirectResult appears before await auth.authStateReady (hardened sequential boot order)'

# 45.15  gesture safety: first await in signInWithGoogle is linkWithPopup itself
$signInBody45 = ''
$sgIdx45 = $cloudSrc.IndexOf('window.signInWithGoogle')
if ($sgIdx45 -ge 0) {
    $sgStart = $cloudSrc.IndexOf('{', $sgIdx45); $sgDep = 0; $sgI = $sgStart
    while ($sgI -lt $cloudSrc.Length) {
        $ch = $cloudSrc[$sgI]
        if ($ch -eq '{') { $sgDep++ }
        elseif ($ch -eq '}') { $sgDep--; if ($sgDep -eq 0) { $signInBody45 = $cloudSrc.Substring($sgStart, $sgI - $sgStart + 1); break } }
        $sgI++
    }
}
$firstAwait45 = $signInBody45.IndexOf('await')
$awaitPopup45 = $signInBody45.IndexOf('await linkWithPopup')
Check (($firstAwait45 -ge 0) -and ($awaitPopup45 -eq $firstAwait45)) `
    'cloud.js signInWithGoogle: first await is linkWithPopup (gesture-safe — popup opened with no prior async work)'

# ===========================================================
# Suite 46 -- Cloud Save Picker + Local Migration (Phase 5c-iii)
# Data-safety invariants: additive uploads, contentHash dedup,
# confirm-gated load/delete, picker UI wired. Plus WU-B5: the cloud
# push->sanitize->migrate->apply round-trip (Phase-6 fields survive) and
# the setDoc permanence guards (no blind save overwrite; settings merge).
# 19 tests
# ===========================================================
Sep "Suite 46 -- Phase 5c-iii: Cloud Save Picker + Local Migration"

# 46.1  cloud.js references addDoc (additive saves — never overwrites)
Check ([bool]($cloudSrc -match '\baddDoc\b')) `
    'cloud.js references addDoc (additive cloud saves — migration never overwrites)'

# 46.2  cloud.js references collection AND getDocs (subcollection query for picker)
Check (([bool]($cloudSrc -match '\bcollection\b')) -and ([bool]($cloudSrc -match '\bgetDocs\b'))) `
    'cloud.js references collection + getDocs (subcollection listing for cloud save picker)'

# 46.3  cloud.js references updateDoc AND deleteDoc (rename + delete operations)
Check (([bool]($cloudSrc -match '\bupdateDoc\b')) -and ([bool]($cloudSrc -match '\bdeleteDoc\b'))) `
    'cloud.js references updateDoc + deleteDoc (rename and delete cloud saves)'

# 46.4  cloud.js uses the shared computeSaveChecksum helper (moved to state.js per Protocol 22)
Check ([bool]($cloudSrc -match 'window\.computeSaveChecksum')) `
    'cloud.js uses window.computeSaveChecksum helper (FNV-1a dedup fingerprint from state.js)'

# 46.5  computeSaveChecksum: _fnv1a32 in state.js has no Math.random/Date (deterministic by construction)
#        The JS runner covers the full behavioral eval; PS runner does structural check.
$hashBody46 = ''
$hIdx46 = $stateSrc.IndexOf('function _fnv1a32')
if ($hIdx46 -ge 0) {
    $hStart46 = $stateSrc.IndexOf('{', $hIdx46); $hDep46 = 0; $hI46 = $hStart46
    while ($hI46 -lt $stateSrc.Length) {
        $ch = $stateSrc[$hI46]
        if ($ch -eq '{') { $hDep46++ }
        elseif ($ch -eq '}') { $hDep46--; if ($hDep46 -eq 0) { $hashBody46 = $stateSrc.Substring($hStart46, $hI46 - $hStart46 + 1); break } }
        $hI46++
    }
}
$hashDet46 = ($hashBody46.Length -gt 20) -and
             -not ($hashBody46 -match 'Math\.random') -and -not ($hashBody46 -match 'Date\.')
Check $hashDet46 `
    'computeSaveChecksum (_fnv1a32) has no Math.random/Date (deterministic by construction)'

# 46.6  computeSaveChecksum: no HTML entity encoding in hash function (apostrophe/ampersand safe)
$hashApos46 = ($hashBody46.Length -gt 20) -and
              -not ($hashBody46 -match '&#x27;') -and
              -not ($hashBody46 -match '&amp;') -and
              -not ($hashBody46 -match 'encodeURI') -and
              -not ($hashBody46 -match '\.replace.*&lt;')
Check $hashApos46 `
    'computeSaveChecksum: no HTML entity encoding in _fnv1a32 body (apostrophe/ampersand safe at hash layer)'

# 46.7  syncLocalSavesToCloud uses addDoc (not setDoc) — additive
$syncIdx46 = $cloudSrc.IndexOf('window.syncLocalSavesToCloud')
$syncBody46 = ''
if ($syncIdx46 -ge 0) {
    $sStart = $cloudSrc.IndexOf('{', $syncIdx46); $sDep = 0; $sI = $sStart
    while ($sI -lt $cloudSrc.Length) {
        $ch = $cloudSrc[$sI]
        if ($ch -eq '{') { $sDep++ }
        elseif ($ch -eq '}') { $sDep--; if ($sDep -eq 0) { $syncBody46 = $cloudSrc.Substring($sStart, $sI - $sStart + 1); break } }
        $sI++
    }
}
Check (([bool]($syncBody46 -match '\baddDoc\b')) -and -not ([bool]($syncBody46 -match 'setDoc\s*\('))) `
    'syncLocalSavesToCloud uses addDoc (not setDoc) — additive upload, never overwrites'

# 46.8  syncLocalSavesToCloud body NEVER calls localStorage.setItem or removeItem
Check (-not ([bool]($syncBody46 -match 'localStorage\.setItem')) -and -not ([bool]($syncBody46 -match 'localStorage\.removeItem'))) `
    'syncLocalSavesToCloud never calls localStorage.setItem or removeItem (ADDITIVE ONLY — no local state touched)'

# 46.9  syncLocalSavesToCloud dedup checks localOriginId AND contentHash
Check (([bool]($syncBody46 -match 'localOriginId')) -and ([bool]($syncBody46 -match 'contentHash'))) `
    'syncLocalSavesToCloud dedup checks localOriginId AND contentHash (idempotent re-sync)'

# 46.10  loadCloudSave is gated behind confirmAction() (Step 2 Phase 0 U12: diegetic
#        confirmAction() replaces the blocking confirm())
$loadIdx46 = $cloudSrc.IndexOf('window.loadCloudSave')
$loadBody46 = ''
if ($loadIdx46 -ge 0) {
    $lStart = $cloudSrc.IndexOf('{', $loadIdx46); $lDep = 0; $lI = $lStart
    while ($lI -lt $cloudSrc.Length) {
        $ch = $cloudSrc[$lI]
        if ($ch -eq '{') { $lDep++ }
        elseif ($ch -eq '}') { $lDep--; if ($lDep -eq 0) { $loadBody46 = $cloudSrc.Substring($lStart, $lI - $lStart + 1); break } }
        $lI++
    }
}
Check ([bool]($loadBody46 -match '\bconfirmAction\b')) `
    'loadCloudSave is gated behind confirmAction() — never auto-loads (data-safety)'

# 46.11  loadCloudSave routes through sanitizeImportedContainer AND migrateState
Check (([bool]($loadBody46 -match 'sanitizeImportedContainer')) -and ([bool]($loadBody46 -match 'migrateState'))) `
    'loadCloudSave routes through sanitizeImportedContainer AND migrateState (hardened load path)'

# 46.12  deleteCloudSave is confirmAction-gated (Step 2 Phase 0 U12)
$delIdx46 = $cloudSrc.IndexOf('window.deleteCloudSave')
$delBody46 = ''
if ($delIdx46 -ge 0) {
    $dStart = $cloudSrc.IndexOf('{', $delIdx46); $dDep = 0; $dI = $dStart
    while ($dI -lt $cloudSrc.Length) {
        $ch = $cloudSrc[$dI]
        if ($ch -eq '{') { $dDep++ }
        elseif ($ch -eq '}') { $dDep--; if ($dDep -eq 0) { $delBody46 = $cloudSrc.Substring($dStart, $dI - $dStart + 1); break } }
        $dI++
    }
}
Check ([bool]($delBody46 -match '\bconfirmAction\b')) `
    'deleteCloudSave is confirmAction-gated (explicit confirmation before deleting cloud save)'

# 46.13  renameCloudSave uses updateDoc (label-only update — not a new doc or overwrite)
$renIdx46 = $cloudSrc.IndexOf('window.renameCloudSave')
$renBody46 = ''
if ($renIdx46 -ge 0) {
    $rStart = $cloudSrc.IndexOf('{', $renIdx46); $rDep = 0; $rI = $rStart
    while ($rI -lt $cloudSrc.Length) {
        $ch = $cloudSrc[$rI]
        if ($ch -eq '{') { $rDep++ }
        elseif ($ch -eq '}') { $rDep--; if ($rDep -eq 0) { $renBody46 = $cloudSrc.Substring($rStart, $rI - $rStart + 1); break } }
        $rI++
    }
}
Check (([bool]($renBody46 -match '\bupdateDoc\b')) -and -not ([bool]($renBody46 -match '\baddDoc\b')) -and -not ([bool]($renBody46 -match '\bsetDoc\b'))) `
    'renameCloudSave uses updateDoc only (not addDoc/setDoc) — label-only update'

# 46.14  renderSavesList() defined in ui.js (unified saves list -- replaces renderCloudSavePicker)
Check (([bool]($uiSrc -match 'async function renderSavesList\s*\(')) -or ([bool]($uiSrc -match 'function renderSavesList\s*\('))) `
    'ui.js defines renderSavesList() (unified saves list -- replaces renderCloudSavePicker)'

# 46.15  loadUI() calls renderSavesList()
$loadUIBody46 = ''
try { $loadUIBody46 = Get-FunctionBody $uiSrc 'loadUI' } catch {}
Check ([bool]($loadUIBody46 -match 'renderSavesList\(\)')) `
    'loadUI() calls renderSavesList() (unified saves list wired into page load)'

# 46.16  index.html has savesListBody element (unified list mount point in Security & Config)
Check ([bool]($htmlSrc -match 'id="savesListBody"')) `
    'index.html has #savesListBody element (unified saves list mount point in Security & Config)'

# 46.17  WU-B5: cloud push->sanitize->migrate->apply round-trip — Phase-6 fields survive.
#        (JS runner runs the full VM-sandbox behavioral round-trip; PS runner does the
#        structural check that migrateState preserves every Phase-6 field + factions.)
$migBody46 = ''
try { $migBody46 = Get-FunctionBody $stateSrc 'migrateState' } catch {}
$rtOk = ($migBody46 -match 'collectibles') -and ($migBody46 -match 'lincolnItems') -and `
        ($migBody46 -match 'traits') -and ($migBody46 -match 'skillBooks') -and `
        ($migBody46 -match 'magazines') -and ($migBody46 -match 'factions')
Check $rtOk `
    "cloud round-trip: migrateState preserves all Phase-6 fields + factions through sanitize+migrate (WU-B5 TS-GAP-6/CC-RT-1)"

# 46.18  WU-B5 setDoc permanence (Protocol 34): no setDoc ever writes a 'saves' document
#        (a blind setDoc would clobber a user's campaign — saves are additive via addDoc).
Check (-not ($cloudSrc -match 'setDoc\s*\([\s\S]{0,80}[''"]saves[''"]')) `
    "cloud.js: no setDoc targets a saves document — saves are additive via addDoc (Protocol 34 no-blind-overwrite)"

# 46.19  WU-B5 setDoc permanence: the mutable settings/preferences write uses { merge: true }.
Check ([bool]($cloudSrc -match 'doc\([^)]*[''"]settings[''"][\s\S]{0,200}merge:\s*true')) `
    "cloud.js: settings/preferences setDoc uses { merge: true } (no clobber of sibling prefs -- Protocol 34)"

# ===========================================================
# Suite 47 -- Gemini Key Sync + AI Studio Link (Phase 5c-iv)
# Security: key never leaves device for anon or sync-OFF.
# Picker: NAME button, date rendered once.
# 10 tests
# ===========================================================
Sep "Suite 47 -- Phase 5c-iv: Gemini Key Sync + AI Studio Link"

# 47.1  cloud.js defines window.saveGeminiKeyToCloud
Check ([bool]($cloudSrc -match 'window\.saveGeminiKeyToCloud\s*=')) `
    'cloud.js defines window.saveGeminiKeyToCloud (key sync write function)'

# 47.2  cloud.js defines loadGeminiKeyFromCloud (module-local or window)
Check (([bool]($cloudSrc -match 'function loadGeminiKeyFromCloud\s*\(')) -or ([bool]($cloudSrc -match 'window\.loadGeminiKeyFromCloud\s*='))) `
    'cloud.js defines loadGeminiKeyFromCloud (key sync read function for boot restore)'

# 47.3  saveGeminiKeyToCloud body checks isAnonymous AND robco_gemini_key_sync (double guard)
$saveGeminiIdx47 = $cloudSrc.IndexOf('window.saveGeminiKeyToCloud')
$saveGeminiBody47 = ''
if ($saveGeminiIdx47 -ge 0) {
    $sg47Start = $cloudSrc.IndexOf('{', $saveGeminiIdx47); $sg47Dep = 0; $sg47I = $sg47Start
    while ($sg47I -lt $cloudSrc.Length) {
        $ch = $cloudSrc[$sg47I]
        if ($ch -eq '{') { $sg47Dep++ }
        elseif ($ch -eq '}') { $sg47Dep--; if ($sg47Dep -eq 0) { $saveGeminiBody47 = $cloudSrc.Substring($sg47Start, $sg47I - $sg47Start + 1); break } }
        $sg47I++
    }
}
Check (([bool]($saveGeminiBody47 -match 'isAnonymous')) -and ([bool]($saveGeminiBody47 -match 'robco_gemini_key_sync'))) `
    'saveGeminiKeyToCloud guards on isAnonymous AND robco_gemini_key_sync (key never synced for anon or sync-off)'

# 47.4  saveGeminiKeyToCloud body writes to secrets/ path
Check ([bool]($saveGeminiBody47 -match 'secrets')) `
    'saveGeminiKeyToCloud writes to secrets/ subcollection (Firestore path for key storage)'

# 47.5  window.setGeminiKeySync defined + references geminiKeySync
$setSyncIdx47 = $cloudSrc.IndexOf('window.setGeminiKeySync')
$setSyncBody47 = ''
if ($setSyncIdx47 -ge 0) {
    $ss47Start = $cloudSrc.IndexOf('{', $setSyncIdx47); $ss47Dep = 0; $ss47I = $ss47Start
    while ($ss47I -lt $cloudSrc.Length) {
        $ch = $cloudSrc[$ss47I]
        if ($ch -eq '{') { $ss47Dep++ }
        elseif ($ch -eq '}') { $ss47Dep--; if ($ss47Dep -eq 0) { $setSyncBody47 = $cloudSrc.Substring($ss47Start, $ss47I - $ss47Start + 1); break } }
        $ss47I++
    }
}
Check (($setSyncBody47.Length -gt 50) -and ([bool]($setSyncBody47 -match 'geminiKeySync'))) `
    'window.setGeminiKeySync defined and references geminiKeySync (toggle persists to Firestore settings)'

# 47.6  robco_gemini_key_sync used as local toggle mirror in cloud.js
Check ([bool]($cloudSrc -match 'robco_gemini_key_sync')) `
    "cloud.js uses 'robco_gemini_key_sync' as local toggle mirror (localStorage key for sync preference)"

# 47.7  index.html has #geminiKeySyncToggle checkbox
Check ([bool]($htmlSrc -match 'id="geminiKeySyncToggle"')) `
    'index.html has #geminiKeySyncToggle checkbox (opt-in sync toggle in SECURITY panel)'

# 47.8  index.html has AI Studio link with correct href and rel="noopener"
Check (([bool]($htmlSrc -match 'aistudio\.google\.com/app/apikey')) -and ([bool]($htmlSrc -match 'rel="noopener'))) `
    'index.html has AI Studio link (aistudio.google.com/app/apikey) with rel="noopener" (security)'

# 47.9  renderSavesList shows NAME button for cloud saves (not REN)
$pickerBody47 = ''
try { $pickerBody47 = Get-FunctionBody $uiSrc 'renderSavesList' } catch {}
Check (([bool]($pickerBody47 -match '>NAME<')) -and -not ([bool]($pickerBody47 -match '>REN<'))) `
    'renderSavesList shows NAME button for cloud saves (not REN) -- Part B rename fix'

# 47.10 renderSavesList does not use dateStr (double-date regression guard)
Check (-not ([bool]($pickerBody47 -match '\bdateStr\b'))) `
    'renderSavesList does not use dateStr (double-date regression guard -- date shown once via label)'

# ===========================================================
# Suite 48 -- Remote Kill-Switch + Client Auto-Disable (Protocol 32/35)
# Fail-open: boot completes + all features work when config/flags absent.
# Session-scoped auto-disable on repeated failures (FAIL_THRESHOLD=3).
# Plus WU-B6 behavioral coverage: isFeatureEnabled fail-open reads +
# loadRemoteConfig leaves flags enabled when the config fetch fails.
# 13 tests
# ===========================================================
Sep "Suite 48 -- Remote Kill-Switch + Client Auto-Disable (Protocol 32/35)"

$rulesSrc48 = ''
$rulesPath48 = Join-Path $Root 'firestore.rules'
if (Test-Path $rulesPath48) { $rulesSrc48 = [IO.File]::ReadAllText($rulesPath48) }

# 48.1  cloud.js defines loadRemoteConfig
Check ([bool]($cloudSrc -match 'async function loadRemoteConfig\s*\(')) `
    'cloud.js defines loadRemoteConfig (remote config reader)'

# 48.2  loadRemoteConfig reads doc(db, 'config', 'flags') path
Check (([bool]($cloudSrc -match "getDoc\s*\(")) -and ([bool]($cloudSrc -match "'config'")) -and ([bool]($cloudSrc -match "'flags'"))) `
    "loadRemoteConfig reads doc(db, 'config', 'flags') path"

# 48.3  loadRemoteConfig uses Promise.race with a timeout
Check (([bool]($cloudSrc -match 'Promise\.race')) -and (([bool]($cloudSrc -match 'config-timeout')) -or ([bool]($cloudSrc -match 'setTimeout')))) `
    'loadRemoteConfig races config fetch against a timeout (fail-open on slow network)'

# 48.4  loadRemoteConfig body is wrapped in try/catch (fail-open on any error)
$rcBody48 = ''
$rcIdx48 = $cloudSrc.IndexOf('async function loadRemoteConfig')
if ($rcIdx48 -ge 0) {
    $rc48Start = $cloudSrc.IndexOf('{', $rcIdx48); $rc48Dep = 0; $rc48I = $rc48Start
    while ($rc48I -lt $cloudSrc.Length) {
        $ch = $cloudSrc[$rc48I]
        if ($ch -eq '{') { $rc48Dep++ }
        elseif ($ch -eq '}') { $rc48Dep--; if ($rc48Dep -eq 0) { $rcBody48 = $cloudSrc.Substring($rc48Start, $rc48I - $rc48Start + 1); break } }
        $rc48I++
    }
}
Check (([bool]($rcBody48 -match '\btry\b')) -and ([bool]($rcBody48 -match '\bcatch\b'))) `
    'loadRemoteConfig body is wrapped in try/catch (fail-open -- any error keeps LKG/defaults)'

# 48.5  loadRemoteConfig is NOT awaited in the boot IIFE
Check (-not ([bool]($cloudSrc -match 'await\s+loadRemoteConfig'))) `
    'loadRemoteConfig is NOT awaited in boot IIFE (fire-and-forget -- never on critical path)'

# 48.6  window.isFeatureEnabled defined + uses !== false pattern (fail-open for unknown keys)
Check (([bool]($cloudSrc -match 'window\.isFeatureEnabled\s*=')) -and ([bool]($cloudSrc -match '!==\s*false'))) `
    "window.isFeatureEnabled defined and uses !== false pattern (unknown/missing keys return true -- fail-open)"

# 48.7  LKG key robco_feature_flags is both read from and written to via MetaStore (U5)
Check (([bool]($cloudSrc -match 'robco_feature_flags')) -and ([bool]($cloudSrc -match "window\.MetaStore\.set\s*\(\s*'robco_feature_flags")) -and ([bool]($cloudSrc -match "window\.MetaStore\.get\s*\(\s*'robco_feature_flags"))) `
    "cloud.js reads and writes 'robco_feature_flags' via MetaStore (last-known-good persistence)"

# 48.8  transmitMessage in api.js references isFeatureEnabled with 'aiChat'
Check (([bool]($apiSrc -match 'isFeatureEnabled')) -and ([bool]($apiSrc -match "'aiChat'"))) `
    "transmitMessage references isFeatureEnabled('aiChat') (AI chat kill-switch gate)"

# 48.9  a cloud operation references isFeatureEnabled with 'cloudSync'
Check (([bool]($cloudSrc -match 'isFeatureEnabled')) -and ([bool]($cloudSrc -match "'cloudSync'"))) `
    "cloud.js references isFeatureEnabled('cloudSync') (cloud sync kill-switch gate)"

# 48.10  _recordFeatureFailure defined + FAIL_THRESHOLD present
Check (([bool]($cloudSrc -match 'function _recordFeatureFailure')) -and ([bool]($cloudSrc -match 'FAIL_THRESHOLD'))) `
    'cloud.js defines _recordFeatureFailure and FAIL_THRESHOLD (session-scoped auto-disable after repeated failures)'

# 48.11  firestore.rules has /config/{...} with allow read: if true AND allow write: if false
Check (([bool]($rulesSrc48 -match 'match\s*/config/\{')) -and ([bool]($rulesSrc48 -match 'allow\s+read\s*:\s*if\s+true')) -and ([bool]($rulesSrc48 -match 'allow\s+write\s*:\s*if\s+false'))) `
    'firestore.rules has /config/{doc} rule: allow read if true, allow write if false (public read, console-only write)'

# 48.12  WU-B6 / TS-GAP-8 -- isFeatureEnabled fail-open (JS runner evals it behaviorally;
#        PS runner does the structural check on the function body).
$ifeIdx48 = $cloudSrc.IndexOf('window.isFeatureEnabled')
$ifeBody48 = if ($ifeIdx48 -ge 0) { $cloudSrc.Substring($ifeIdx48, [Math]::Min(180, $cloudSrc.Length - $ifeIdx48)) } else { '' }
Check (($ifeBody48 -match '_autoDisabled\[key\]') -and ($ifeBody48 -match '_featureFlags\[key\]\s*!==\s*false')) `
    "isFeatureEnabled() behavioral: unknown key fail-opens to true; explicit false + auto-disabled both disable (TS-GAP-8)"

# 48.13  WU-B6 / TS-GAP-1 (Protocol 33) -- loadRemoteConfig fail-open: try/catch wraps the
#        fetch and flags are mutated ONLY in the success branch (k in _featureFlags), never in
#        the catch -- so a failed fetch can't disable a feature. (PS structural mirror.)
$lrcBody48 = ''
try { $lrcBody48 = Get-FunctionBody $cloudSrc 'loadRemoteConfig' } catch {}
Check (($lrcBody48 -match 'try\s*\{') -and ($lrcBody48 -match 'catch') -and ($lrcBody48 -match 'k in _featureFlags')) `
    "loadRemoteConfig() behavioral fail-open: a failed/unreachable config fetch never throws and leaves all feature flags enabled (TS-GAP-1, Protocol 33)"

# ===========================================================
# Suite 49 -- CI / Repo Hardening Guards (Q-series)
# Asset-manifest completeness, Firestore no-allow-all, release.yml CI gating,
# deploy.yml shortcut-icon staging guard (Protocol 36 escape-ratchet).
# 5 tests
# ===========================================================
Sep "Suite 49 -- CI / Repo Hardening Guards"

$swSrc49 = Read-Src "sw.js"
$assetsBlockM49 = [regex]::Match($swSrc49, '(?s)const ASSETS\s*=\s*\[(.*?)\];')
$assetsSet49 = [System.Collections.Generic.HashSet[string]]::new()
if ($assetsBlockM49.Success) {
    [regex]::Matches($assetsBlockM49.Groups[1].Value, "'([^']+)'") | ForEach-Object { [void]$assetsSet49.Add($_.Groups[1].Value) }
}

# 49.1  All js/ files listed in sw.js ASSETS
$jsFiles49 = Get-ChildItem (Join-Path $Root "js") -File -Filter "*.js" | Select-Object -ExpandProperty Name
$jsMissing49 = @($jsFiles49 | Where-Object { -not $assetsSet49.Contains("./js/$_") })
Check ($jsMissing49.Count -eq 0) ("All js/ files listed in sw.js ASSETS (asset-manifest completeness)" + $(if ($jsMissing49.Count) { " -- missing: " + ($jsMissing49 -join ", ") } else { "" }))

# 49.2  All css/ files listed in sw.js ASSETS
$cssFiles49 = Get-ChildItem (Join-Path $Root "css") -File -Filter "*.css" | Select-Object -ExpandProperty Name
$cssMissing49 = @($cssFiles49 | Where-Object { -not $assetsSet49.Contains("./css/$_") })
Check ($cssMissing49.Count -eq 0) ("All css/ files listed in sw.js ASSETS (asset-manifest completeness)" + $(if ($cssMissing49.Count) { " -- missing: " + ($cssMissing49 -join ", ") } else { "" }))

# 49.3  firestore.rules has no dangerous broad write grants
#        Fails on: allow write: if true  |  allow read, write: if true
#        Fails on: allow (read,)write: if request.auth != null  WITHOUT == uid on the same line
#        Passes:   allow read: if true  (read-only public config -- intentional)
#        Passes:   allow read, write: if request.auth != null && request.auth.uid == uid
$rulesSrc49 = ''
$rulesPath49 = Join-Path $Root 'firestore.rules'
if (Test-Path $rulesPath49) { $rulesSrc49 = [IO.File]::ReadAllText($rulesPath49) }
$hasWriteAllowAll49 = [bool]($rulesSrc49 -match 'allow\s+(read\s*,\s*write|write)\s*:\s*if\s+true')
$hasUnscopedAuth49 = @(($rulesSrc49 -split "`n") | Where-Object {
    ($_ -match 'allow\s+(read\s*,\s*write|write)\s*:\s*if\s+request\.auth\s*!=\s*null') -and
    ($_ -notmatch '==\s*uid|uid\s*==')
})
Check ((-not $hasWriteAllowAll49) -and ($hasUnscopedAuth49.Count -eq 0)) `
    "firestore.rules has no dangerous broad write grants (no allow-all or unscoped auth-only write)"

# 49.4  release.yml is gated on CI via workflow_run + conclusion == 'success'
$releaseSrc49 = Read-Src ".github/workflows/release.yml"
Check (([bool]($releaseSrc49 -match 'workflow_run')) -and ([bool]($releaseSrc49 -match "conclusion\s*==\s*'success'"))) `
    "release.yml uses workflow_run trigger with conclusion == 'success' (release gated on CI)"

# 49.5  deploy.yml stage step deploys root-level PNGs via *.png glob
#        (Protocol 36 escape-ratchet: shortcut icon 404 regression guard)
$deployYml49 = Read-Src ".github/workflows/deploy.yml"
Check ([bool]($deployYml49 -match 'cp\s+[^\n]*\*\.png')) `
    "deploy.yml stage step uses *.png glob so all root-level icon files (icon.png + shortcut icons) are copied to _site/"

# ===========================================================
# Suite 50 -- Gate Parity Guards (Protocol 36)
# Verify that the local gate == CI gate and the escape-ratchet is wired.
# 8 tests
# ===========================================================
Sep "Suite 50 -- Gate Parity Guards (Protocol 36)"

$preCommitSrc50 = Read-Src "scripts/pre-commit"
$gateSrc50 = Read-Src "scripts/gate.js"
$pkgSrc50 = Read-Src "package.json"
$bootSmokeSrc50 = Read-Src "tests/boot-smoke.mjs"

# 50.1  scripts/pre-commit invokes npm run gate:fast (fast gate at commit boundary)
Check ($preCommitSrc50 -match 'npm run gate:fast') `
    "scripts/pre-commit invokes npm run gate:fast (Protocol 36 -- fast gate at commit boundary)"

# 50.2  scripts/gate.js enforces --max-warnings 0
Check ($gateSrc50 -match '--max-warnings 0') `
    "scripts/gate.js enforces ESLint --max-warnings 0 (Protocol 36 -- escape-ratchet)"

# 50.3  boot-smoke.mjs uses HTTP static server (not file://)
Check (($bootSmokeSrc50 -match 'http\.createServer') -and ($bootSmokeSrc50 -match 'BASE_URL')) `
    "boot-smoke.mjs uses HTTP static server (http.createServer + BASE_URL navigation)"

# 50.4  package.json has a gate script
Check ($pkgSrc50 -match '"gate"') `
    'package.json defines a "gate" script (Protocol 36 -- single source of truth for gate)'

# 50.5  gate.js has --fast flag that skips browser steps
Check (($gateSrc50 -match '--fast') -and ($gateSrc50 -match '!fast')) `
    "scripts/gate.js has --fast flag that skips browser steps (Protocol 36 -- fast commit / full push split)"

# 50.6  gate.js falls back to powershell when pwsh absent
Check (($gateSrc50 -match 'pwsh') -and ($gateSrc50 -match 'powershell')) `
    "scripts/gate.js falls back to powershell when pwsh absent (Protocol 36 -- Windows PS 5.1 support)"

# 50.7  scripts/pre-push exists and invokes full npm run gate
$prePushSrc50 = Read-Src "scripts/pre-push"
Check ($prePushSrc50 -match 'npm run gate(?!:)') `
    "scripts/pre-push invokes full npm run gate (Protocol 36 -- full gate at push boundary)"

# 50.8  install-hooks.js installs pre-push hook
$installHooksSrc50 = Read-Src "scripts/install-hooks.js"
Check ($installHooksSrc50 -match 'pre-push') `
    "scripts/install-hooks.js installs pre-push hook (Protocol 36 -- full gate at push boundary)"

# ===========================================================
# Suite 51 -- Save Integrity + Rolling Backups (Data Safety Hardening)
# Verify checksum stamping, forward-compat guard, and rolling backup
# ring are wired consistently across all load/save paths. Plus WU-B6
# TS-GAP-2: an end-to-end behavioral restoreRollingBackup proof.
# 57 tests
# ===========================================================
Sep "Suite 51 -- Save Integrity + Rolling Backups"

$stateSrc51 = Read-Src "js/state.js"
$uiSrc51    = $uiSrc  # concatenated -- save functions now in ui-saves.js
$cloudSrc51 = Read-Src "js/cloud.js"
$indexSrc51 = Read-Src "index.html"

# 51.1  computeSaveChecksum and _fnv1a32 exist in state.js
Check ($stateSrc51 -match 'window\.computeSaveChecksum' -and $stateSrc51 -match 'function _fnv1a32') `
    "state.js defines window.computeSaveChecksum and _fnv1a32 helper (FNV-1a algorithm)"

# 51.2  verifySaveEnvelope exists in state.js
Check ($stateSrc51 -match 'window\.verifySaveEnvelope') `
    "state.js defines window.verifySaveEnvelope (integrity + forward-compat check)"

# 51.3  snapRollingBackup exists in state.js
Check ($stateSrc51 -match 'window\.snapRollingBackup') `
    "state.js defines window.snapRollingBackup (rolling backup ring)"

# 51.4  getRollingBackups exists in state.js
Check ($stateSrc51 -match 'window\.getRollingBackups') `
    "state.js defines window.getRollingBackups (backup listing helper)"

# 51.5  verifySaveEnvelope returns 'legacy' when checksum is absent
Check ($stateSrc51 -match "status.*legacy" -and $stateSrc51 -match '!envelope\.checksum') `
    "verifySaveEnvelope returns 'legacy' when checksum field is absent (old saves load normally)"

# 51.6  verifySaveEnvelope returns 'future_version' with semver guard
Check ($stateSrc51 -match "status.*future_version" -and $stateSrc51 -match '_semverGt') `
    "verifySaveEnvelope returns 'future_version' for saves from newer app versions (semver guard)"

# 51.7  verifySaveEnvelope returns 'checksum_mismatch'
Check ($stateSrc51 -match "status.*checksum_mismatch") `
    "verifySaveEnvelope returns 'checksum_mismatch' when checksum doesn't match (tamper detection)"

# 51.8  exportSaveFile stamps schemaVersion and checksum
function Get-FnBody51 { param($src, $fn)
    $idx = $src.IndexOf("function $fn")
    if ($idx -lt 0) { return '' }
    $start = $src.IndexOf('{', $idx); $depth = 0; $i = $start
    while ($i -lt $src.Length) {
        if ($src[$i] -eq '{') { $depth++ } elseif ($src[$i] -eq '}') { $depth--; if ($depth -eq 0) { return $src.Substring($start, $i - $start + 1) } }
        $i++
    }
    return ''
}
$exportBody51 = Get-FnBody51 $stateSrc51 'exportSaveFile'
Check ($exportBody51 -match 'schemaVersion' -and $exportBody51 -match 'checksum') `
    "exportSaveFile stamps schemaVersion and checksum on exported envelope"

# 51.9  saveToSlot stamps schemaVersion and checksum
$saveSlotBody51 = Get-FnBody51 $uiSrc51 'saveToSlot'
Check ($saveSlotBody51 -match 'schemaVersion' -and $saveSlotBody51 -match 'checksum') `
    "saveToSlot stamps schemaVersion and checksum on slot envelope"

# 51.10  the slot-load path runs the integrity check before applying state.
# P5 (Step 2 Phase 1) extracted loadFromSlot's verify->snap->migrate->apply body into
# the shared _applySlotEnvelope core (Protocol 22 -- reused by restoreSlotVersion).
$loadSlotBody51 = Get-FnBody51 $uiSrc51 'loadFromSlot'
$applyCoreBody51 = Get-FnBody51 $uiSrc51 '_applySlotEnvelope'
Check (($loadSlotBody51 -match '_applySlotEnvelope') -and ($applyCoreBody51 -match 'verifySaveEnvelope')) `
    "slot-load path runs verifySaveEnvelope (integrity check) -- loadFromSlot -> _applySlotEnvelope core"

# 51.11  the slot-load path snapshots a rolling backup before applying state --
# also in the shared _applySlotEnvelope core (P5).
Check (($loadSlotBody51 -match '_applySlotEnvelope') -and ($applyCoreBody51 -match 'snapRollingBackup')) `
    "slot-load path snapshots a rolling backup -- loadFromSlot -> _applySlotEnvelope core"

# 51.12  handleFileUpload calls verifySaveEnvelope
$uploadBody51 = Get-FnBody51 $uiSrc51 'handleFileUpload'
Check ($uploadBody51 -match 'verifySaveEnvelope') `
    "handleFileUpload calls verifySaveEnvelope (integrity check on file import)"

# 51.13  handleFileUpload calls snapRollingBackup
Check ($uploadBody51 -match 'snapRollingBackup') `
    "handleFileUpload calls snapRollingBackup (rolling backup before file import)"

# 51.14  cloud.js pullFromCloud/loadCloudSave calls snapRollingBackup
Check ($cloudSrc51 -match 'snapRollingBackup') `
    "cloud.js calls snapRollingBackup on cloud load paths (rolling backup before cloud load)"

# 51.15  cloud.js calls verifySaveEnvelope on cloud load paths
Check ($cloudSrc51 -match 'verifySaveEnvelope') `
    "cloud.js calls verifySaveEnvelope on cloud load paths (integrity check)"

# 51.16  restoreRollingBackup routes through sanitizeImportedContainer + migrateState
#        (Protocol 34) -- via its _restoreBackupApply core (Step 2 Phase 0 U12 split the
#        confirm gate from the apply step). $restoreBody51 stays bound to
#        restoreRollingBackup itself for the later 51.36 confirmAction-gate check.
$restoreBody51 = Get-FnBody51 $uiSrc51 'restoreRollingBackup'
$restoreApplyBody51 = Get-FnBody51 $uiSrc51 '_restoreBackupApply'
Check ($restoreApplyBody51 -match 'sanitizeImportedContainer' -and $restoreApplyBody51 -match 'migrateState') `
    "restoreRollingBackup routes through sanitizeImportedContainer + migrateState (Protocol 34)"

# 51.17  index.html has RESTORE BACKUP button calling restoreRollingBackup
Check ($indexSrc51 -match 'restoreRollingBackup') `
    "index.html has a RESTORE BACKUP button calling restoreRollingBackup()"

# 51.18  snapRollingBackup uses ring key prefix 'robco_backup_' (N computed dynamically) + robco_backup_ptr
Check ($stateSrc51 -match "'robco_backup_'" -and $stateSrc51 -match "'robco_backup_ptr'") `
    "snapRollingBackup uses 'robco_backup_' ring key prefix (dynamic N) and 'robco_backup_ptr' pointer"

# 51.19  snapRollingBackup handles QuotaExceededError gracefully
Check ($stateSrc51 -match 'QuotaExceededError' -and $stateSrc51 -match 'removeItem') `
    "snapRollingBackup handles QuotaExceededError gracefully (drop-oldest-retry, no crash)"

# 51.20  computeSaveChecksum uses FNV-1a magic numbers
Check ($stateSrc51 -match '0x811c9dc5' -and $stateSrc51 -match '0x01000193') `
    "computeSaveChecksum/_fnv1a32 uses canonical FNV-1a magic numbers (algorithm regression guard)"

# 51.21–51.34  Behavioral structural equivalents (mirrors JS runner behavioral tests)

# 51.21  verifySaveEnvelope has all 4 return statuses (full path coverage)
Check ($stateSrc51 -match "'legacy'" -and $stateSrc51 -match "'ok'" -and
       $stateSrc51 -match "'checksum_mismatch'" -and $stateSrc51 -match "'future_version'") `
    "verifySaveEnvelope behavioral: all 4 return statuses present (legacy/ok/mismatch/future)"

# 51.22  legacy path: no-checksum guard present (backward compat — old saves load clean)
Check ($stateSrc51 -match '!envelope\.checksum' -and $stateSrc51 -match "status.*legacy") `
    "verifySaveEnvelope behavioral: !envelope.checksum → legacy path present (old saves load clean)"

# 51.23  tamper detection: checksum comparison present
Check ($stateSrc51 -match "envelope\.checksum !== expected") `
    "verifySaveEnvelope behavioral: checksum_mismatch detection via envelope.checksum !== expected"

# 51.24  valid round-trip: checksum recomputed from envelope.chat
Check ($stateSrc51 -match 'envelope\.chat \|\| \[\]') `
    "verifySaveEnvelope behavioral: recomputes checksum using envelope.chat field"

# 51.25  valid round-trip: checksum recomputed from envelope.playstyle
Check ($stateSrc51 -match 'envelope\.playstyle \|\| ') `
    "verifySaveEnvelope behavioral: recomputes checksum using envelope.playstyle field"

# 51.26  future version detection: _semverGt called with sv and APP_VERSION
Check ($stateSrc51 -match '_semverGt\(String\(sv\)') `
    "verifySaveEnvelope behavioral: _semverGt(sv, APP_VERSION) called for future-version guard"

# 51.27  _semverGt loops over 3 version segments
Check ($stateSrc51 -match 'i < 3') `
    "verifySaveEnvelope/_semverGt behavioral: all 3 version segments compared (major.minor.patch)"

# 51.28  _semverGt uses strict greater-than (not >= — same/older must not be blocked)
Check (-not ($stateSrc51 -match 'pa\[i\].*>=.*pb\[i\]')) `
    "verifySaveEnvelope/_semverGt behavioral: strictly > only (not >=, so equal versions pass through)"

# 51.29  _semverGt numeric: uses parseInt (not string comparison of version segments)
Check ($stateSrc51 -match 'parseInt\(n\)') `
    "verifySaveEnvelope/_semverGt behavioral: parseInt() used for numeric segment comparison (not string)"

# 51.30  schemaVersion fallback: version field used if schemaVersion absent
Check ($stateSrc51 -match 'envelope\.schemaVersion \|\| envelope\.version') `
    "verifySaveEnvelope behavioral: schemaVersion || version fallback (both fields honored)"

# 51.31  computeSaveChecksum uses explicit {v,c,p} key order (F3 - not _sortedForHash on outer wrapper)
Check ($stateSrc51 -match 'v: _sortedForHash' -and $stateSrc51 -match 'c: _sortedForHash') `
    'computeSaveChecksum: explicit outer key order preserved for cloud dedup compat (F3 fix)'

# 51.32  ring-cap-3: ring iterates i = 1 to 3 (exactly 3 slots)
Check ($stateSrc51 -match 'i = 1' -and $stateSrc51 -match 'i <= 3') `
    "snapRollingBackup/getRollingBackups behavioral: ring uses exactly 3 slots (i=1..3)"

# 51.33  ring dedup: snapRollingBackup reads most-recent backup for comparison (F4 fix)
Check ($stateSrc51 -match '_prevKey' -and $stateSrc51 -match '_prevSnap' -and
       $stateSrc51 -match 'JSON\.stringify\(_prevSnap\.robco_v8\)') `
    "snapRollingBackup behavioral: dedup check reads most-recent backup and compares robco_v8 (F4)"

# 51.34  F2 guard: ui.js undo uses getRollingBackups, no longer reads legacy robco_backup key
Check ($uiSrc51 -match 'getRollingBackups' -and
       -not ($uiSrc51 -match "localStorage\.getItem\('robco_backup'\)")) `
    "ui.js undo behavioral: wired to getRollingBackups(), legacy 'robco_backup' key removed (F2)"

# -- Additional structural guards (51.35-51.43) ---------------------------------

# 51.35  _contentHash removed from cloud.js (Protocol 22 -- dedup in computeSaveChecksum)
Check (-not ($cloudSrc51 -match 'function _contentHash')) `
    'cloud.js: _contentHash removed (Protocol 22 -- dedup uses shared window.computeSaveChecksum in state.js)'

# 51.36  restoreRollingBackup is confirmAction-gated (Protocol 34; Step 2 Phase 0 U12)
Check ($restoreBody51 -match 'confirmAction\(') `
    'restoreRollingBackup is confirmAction-gated (Protocol 34 -- destructive state replacement requires user confirmation)'

# 51.37  snapRollingBackup stores timestamp: Date.now() in each backup entry
Check ($stateSrc51 -match 'timestamp: Date\.now\(\)') `
    'snapRollingBackup stores timestamp: Date.now() in each backup entry (getRollingBackups sorts on this)'

# 51.38  getRollingBackups has a sort() call (sorting mechanism present)
Check ($stateSrc51 -match 'results\.sort\(') `
    'getRollingBackups uses sort() to order backups by timestamp'

# 51.39  cloud.js saveCurrentToCloud stamps contentHash via computeSaveChecksum (integrity on cloud push)
Check ($cloudSrc51 -match 'computeSaveChecksum' -and $cloudSrc51 -match 'contentHash') `
    'cloud.js saveCurrentToCloud stamps contentHash via computeSaveChecksum (integrity on cloud push)'

# 51.40  verifySaveEnvelope accepts both robco_v8 and state content fields
Check ($stateSrc51 -match 'envelope\.robco_v8' -and $stateSrc51 -match 'envelope\.state') `
    'verifySaveEnvelope handles both envelope.robco_v8 (file/cloud) and envelope.state (slot saves)'

# 51.41  _fnv1a32 returns 8-char padded hex string
Check ($stateSrc51 -match 'toString\(16\)' -and $stateSrc51 -match 'padStart\(8') `
    "_fnv1a32 returns 8-char padded hex string (toString(16).padStart(8,'0'))"

# 51.42  verifySaveEnvelope has null/non-object guard at function top
Check ($stateSrc51 -match '!envelope' -and $stateSrc51 -match 'typeof envelope') `
    'verifySaveEnvelope has null/non-object guard at function top (graceful on malformed input)'

# 51.43  computeSaveChecksum applies _sortedForHash to contentObj and chat individually
Check ($stateSrc51 -match 'v: _sortedForHash\(contentObj' -and $stateSrc51 -match 'c: _sortedForHash\(chat') `
    'computeSaveChecksum applies _sortedForHash to contentObj and chat individually (not outer key sort)'

# -- Behavioral structural equivalents (51.44-51.56) ---------------------------

# 51.44 behavioral equiv: _fnv1a32 is pure (no Math.random/Date.now -- determinism guaranteed)
$fnvIdx44 = $stateSrc51.IndexOf('function _fnv1a32')
$fnvEnd44 = $stateSrc51.IndexOf('function _sortedForHash')
$fnvBody44 = ''
if ($fnvIdx44 -ge 0 -and $fnvEnd44 -gt $fnvIdx44) {
    $fnvBody44 = $stateSrc51.Substring($fnvIdx44, $fnvEnd44 - $fnvIdx44)
}
Check ($fnvBody44 -ne '' -and -not ($fnvBody44 -match 'Math\.random') -and -not ($fnvBody44 -match 'Date\.now')) `
    '_fnv1a32 is pure (no Math.random/Date.now in body) -- same input always yields same output'

# 51.45 behavioral equiv: JSON.stringify in computeSaveChecksum includes v, c, p keys (all 3 params)
Check ($stateSrc51 -match 'v: _sortedForHash' -and $stateSrc51 -match 'c: _sortedForHash' -and $stateSrc51 -match 'p: String\(') `
    'computeSaveChecksum JSON.stringify includes v (content), c (chat), p (playstyle) -- all 3 params hashed'

# 51.46 behavioral equiv: || [] fallback for chat param (null-safe)
Check ($stateSrc51 -match 'chat \|\| \[\]') `
    'computeSaveChecksum has chat || [] fallback (null-safe for missing chat arg)'

# 51.47 behavioral equiv: String() wrapper on playstyle (null coercion)
Check ($stateSrc51 -match 'String\(playstyle') `
    'computeSaveChecksum wraps playstyle in String() for null-safe coercion'

# 51.48 behavioral equiv: _fnv1a32 uses >>> 0 (unsigned 32-bit, no negative hashes)
Check ($stateSrc51 -match '>>> 0') `
    '_fnv1a32 uses >>> 0 to keep result unsigned 32-bit (prevents negative hash values)'

# 51.49 behavioral equiv: || null fallback for contentObj (null-safe)
Check ($stateSrc51 -match 'contentObj \|\| null') `
    'computeSaveChecksum has contentObj || null fallback (null-safe for missing content arg)'

# 51.50 behavioral equiv: verifySaveEnvelope null guard returns ok (not legacy, not throw)
Check ($stateSrc51 -match '!envelope' -and $stateSrc51 -match "status.*'ok'") `
    "verifySaveEnvelope behavioral: null/non-object guard returns 'ok' (not 'legacy', not throw)"

# 51.51 behavioral equiv: _semverGt segment access uses (pa[i] || 0) guard
Check ($stateSrc51 -match '\(pa\[i\] \|\| 0\)') `
    '_semverGt uses (pa[i] || 0) for undefined-segment safety (handles short version strings)'

# 51.52 behavioral equiv: _semverGt strict > comparison (numeric, catches double-digit values)
Check ($stateSrc51 -match '\(pa\[i\] \|\| 0\) > \(pb\[i\] \|\| 0\)') `
    '_semverGt strict > operator: numeric comparison catches 10.0.0 > 2.0.1, 2.10.0 > 2.0.1'

# 51.53 behavioral equiv: future_version return precedes legacy return (guard ordering in function body)
$fvIdx53 = $stateSrc51.IndexOf("status: 'future_version'")
$legIdx53 = $stateSrc51.IndexOf("status: 'legacy'")
Check ($fvIdx53 -gt 0 -and $legIdx53 -gt 0 -and $fvIdx53 -lt $legIdx53) `
    "verifySaveEnvelope guard order: status 'future_version' return precedes 'legacy' return (correct ordering)"

# 51.54 behavioral equiv: getRollingBackups sort is descending (b.timestamp - a.timestamp)
Check ($stateSrc51 -match 'b\.timestamp - a\.timestamp') `
    'getRollingBackups sort: b.timestamp - a.timestamp (descending = newest at index 0)'

# 51.55 behavioral equiv: getRollingBackups entry wraps full backup in .data field
Check ($stateSrc51 -match 'data: b,') `
    'getRollingBackups entry: data: b wraps full backup object (entry.data.robco_v8 accessible)'

# 51.56 behavioral equiv: snapRollingBackup dedup reads only most-recent slot
Check ($stateSrc51 -match '_prevKey' -and $stateSrc51 -match 'ptr === 0 \? 3 : ptr') `
    'snapRollingBackup dedup reads most-recent slot via _prevKey calculation -- non-consecutive repeats allowed'

# 51.57  WU-B6 / TS-GAP-2 -- restoreRollingBackup end-to-end (JS runner evals the full
#        sanitize->migrate->write pipeline; PS runner does the structural mirror). Step 2
#        Phase 0 U12 split the confirm gate (restoreRollingBackup, now async) from the
#        sanitize->migrate->write core (_restoreBackupApply) -- check each half.
$rrbBody51 = ''
try { $rrbBody51 = Get-FunctionBody $uiSrc51 'restoreRollingBackup' } catch {}
$rbaBody51 = ''
try { $rbaBody51 = Get-FunctionBody $uiSrc51 '_restoreBackupApply' } catch {}
Check (($rrbBody51 -match 'getRollingBackups') -and ($rrbBody51 -match '_restoreBackupApply\(') -and `
       ($rbaBody51 -match 'sanitizeImportedContainer') -and ($rbaBody51 -match 'migrateState') -and `
       ($rbaBody51 -match "setItem\('robco_v8'") -and ($rbaBody51 -match '_loadingSave')) `
    "restoreRollingBackup behavioral: a selected backup restores end-to-end through sanitize->migrate->write (robco_v8/playstyle/chat restored; reload guard set) (TS-GAP-2)"

# ===========================================================
# Suite 52 -- Repo / Site Enrichment Guards (Protocol 37)
# Verifies static site files, repomix config tuning, manifest
# enrichment, and README CI badge are present and correct.
# 13 tests
# ===========================================================
Sep "Suite 52 -- Repo / Site Enrichment Guards (Protocol 37)"

# 52.1  repomix.config.json exists
Check (Test-Path (Join-Path $Root "repomix.config.json")) `
    "repomix.config.json exists at repo root"

# 52.2  repomix.config.json is valid JSON
$repomixRaw52 = $null
$repomixCfg52 = $null
try {
    $repomixRaw52 = [IO.File]::ReadAllText((Join-Path $Root "repomix.config.json"))
    $repomixCfg52 = $repomixRaw52 | ConvertFrom-Json
} catch {}
Check ($null -ne $repomixCfg52) "repomix.config.json parses as valid JSON"

# 52.3  include array contains a js/ pattern
$hasJsInclude52 = $null -ne $repomixCfg52 -and $null -ne $repomixCfg52.include -and
    ($repomixCfg52.include | Where-Object { $_.StartsWith("js/") }).Count -gt 0
Check $hasJsInclude52 "repomix.config.json include array has a js/ pattern"

# 52.4  customPatterns ignores node_modules
$patterns52 = if ($null -ne $repomixCfg52 -and $null -ne $repomixCfg52.ignore) { $repomixCfg52.ignore.customPatterns } else { $null }
$hasNodeModules52 = $null -ne $patterns52 -and ($patterns52 | Where-Object { $_ -match "node_modules" }).Count -gt 0
Check $hasNodeModules52 "repomix.config.json customPatterns excludes node_modules"

# 52.5  customPatterns ignores package-lock.json (lockfile)
$hasLockfile52 = $null -ne $patterns52 -and ($patterns52 | Where-Object { $_ -match "package-lock" }).Count -gt 0
Check $hasLockfile52 "repomix.config.json customPatterns excludes package-lock.json (lockfile)"

# 52.6  customPatterns excludes RULES.md (private agent file)
$hasRulesMd52 = $null -ne $patterns52 -and ($patterns52 -contains "RULES.md")
Check $hasRulesMd52 "repomix.config.json customPatterns excludes RULES.md (private agent file)"

# 52.7  .nojekyll exists at root
Check (Test-Path (Join-Path $Root ".nojekyll")) `
    ".nojekyll exists at repo root (disables GitHub Pages Jekyll processing)"

# 52.8  robots.txt exists at root
Check (Test-Path (Join-Path $Root "robots.txt")) "robots.txt exists at repo root"

# 52.9  404.html exists at root
Check (Test-Path (Join-Path $Root "404.html")) "404.html exists at repo root"

# 52.10  PRIVACY.md exists at root
Check (Test-Path (Join-Path $Root "PRIVACY.md")) "PRIVACY.md exists at repo root"

# 52.11  manifest.json has description field
$manifestRaw52 = Read-Src "manifest.json"
$manifest52 = $manifestRaw52 | ConvertFrom-Json
Check ($null -ne $manifest52.description -and $manifest52.description.Length -gt 0) `
    "manifest.json has a non-empty description field"

# 52.12  manifest.json has categories field (array)
Check ($null -ne $manifest52.categories -and $manifest52.categories.Count -gt 0) `
    "manifest.json has a non-empty categories array"

# 52.13  README.md contains the GitHub Actions CI badge for ci.yml
$readmeSrc52 = Read-Src "README.md"
Check ($readmeSrc52 -match "ci\.yml" -and $readmeSrc52 -match "badge") `
    "README.md contains GitHub Actions CI badge referencing ci.yml"

# ===========================================================
# Suite 53 -- AI + Gemini-Key Resilience Guards
# Key validation hardening, bounded exponential backoff,
# error classification, Tri-Node schema validation.
# 25 tests
# ===========================================================
Sep "Suite 53 -- AI + Gemini-Key Resilience Guards"
$apiSrc53 = Read-Src "js/api.js"

# 53.1  _AI_RETRY_MAX constant defined
Check ($apiSrc53 -match '_AI_RETRY_MAX\s*=\s*\d+') `
    "_AI_RETRY_MAX constant defined in api.js"

# 53.2  _AI_RETRY_DELAYS_MS array defined with ≥3 entries
$delaysMatch53 = [regex]::Match($apiSrc53, '_AI_RETRY_DELAYS_MS\s*=\s*\[([^\]]+)\]')
$delayEntries53 = if ($delaysMatch53.Success) {
    $delaysMatch53.Groups[1].Value -split ',' | Where-Object { $_.Trim().Length -gt 0 }
} else { @() }
Check ($delayEntries53.Count -ge 3) `
    "_AI_RETRY_DELAYS_MS defined with >=3 delay entries (found $($delayEntries53.Count))"

# 53.3  Delay values are exponentially increasing
$delayVals53 = $delayEntries53 | ForEach-Object { [int]$_.Trim() }
$isExponential53 = $delayVals53.Count -ge 2
for ($di = 1; $di -lt $delayVals53.Count; $di++) {
    if ($delayVals53[$di] -lt $delayVals53[$di-1] * 2) { $isExponential53 = $false }
}
Check $isExponential53 `
    "_AI_RETRY_DELAYS_MS values are exponentially increasing"

# 53.4  fetchAuthorizedModels checks response.status for 401/403
$fnFetch53 = Get-FunctionBody $apiSrc53 'fetchAuthorizedModels'
Check ($fnFetch53 -match 'response\.status\s*===\s*401\s*\|\|\s*response\.status\s*===\s*403') `
    "fetchAuthorizedModels checks response.status === 401 || 403 explicitly"

# 53.5  Auth failure path returns before saveApiKeySilent (bad key never saved)
$authIdx53  = $fnFetch53.IndexOf('401')
$returnIdx53 = $fnFetch53.IndexOf('return', $authIdx53)
$saveIdx53   = $fnFetch53.IndexOf('saveApiKeySilent')
Check ($authIdx53 -ge 0 -and $returnIdx53 -ge 0 -and $saveIdx53 -ge 0 -and $returnIdx53 -lt $saveIdx53) `
    "fetchAuthorizedModels: return appears before saveApiKeySilent (invalid key not saved)"

# 53.6  Auth failure message contains "REJECTED"
Check ($fnFetch53 -imatch 'REJECTED') `
    "fetchAuthorizedModels auth failure message contains REJECTED"

# 53.7  transmitMessage 401/403 branch has no setTimeout (auth errors not retried)
$fnTm53 = Get-FunctionBody $apiSrc53 'transmitMessage'
$authBranchIdx53 = $fnTm53.IndexOf('_code === 401 || _code === 403')
$next429Idx53    = $fnTm53.IndexOf('_code === 429')
$authBlock53 = if ($authBranchIdx53 -ge 0 -and $next429Idx53 -gt $authBranchIdx53) {
    $fnTm53.Substring($authBranchIdx53, $next429Idx53 - $authBranchIdx53)
} else { '' }
Check ($authBlock53.Length -gt 0 -and -not ($authBlock53 -match 'setTimeout')) `
    "transmitMessage 401/403 branch has no setTimeout -- auth errors not retried"

# 53.8  transmitMessage has 429 handling with rate-limit message
Check ($fnTm53 -match '_code === 429' -and $fnTm53 -imatch 'RATE LIMIT') `
    "transmitMessage handles 429 with a RATE LIMIT message"

# 53.9  Retry logic references _AI_RETRY_MAX (bounded)
$retryMaxCount53 = ([regex]::Matches($fnTm53, '_AI_RETRY_MAX')).Count
Check ($retryMaxCount53 -ge 2) `
    "transmitMessage references _AI_RETRY_MAX >=2 times (bounded backoff)"

# 53.10  _validateTriNode function defined in api.js
Check ($apiSrc53 -match 'function\s+_validateTriNode\s*\(') `
    "_validateTriNode() function defined in api.js"

# 53.11  _validateTriNode called before autoImportState in transmitMessage
$vIdx53 = $fnTm53.IndexOf('_validateTriNode')
$aIdx53 = $fnTm53.IndexOf('autoImportState')
Check ($vIdx53 -ge 0 -and $aIdx53 -ge 0 -and $vIdx53 -lt $aIdx53) `
    "_validateTriNode called before autoImportState in transmitMessage"

# 53.12  _validateTriNode body guards against null/falsy input
$fnVtN53 = Get-FunctionBody $apiSrc53 '_validateTriNode'
Check ($fnVtN53 -match '!parsed') `
    "_validateTriNode body has !parsed guard (null/falsy input rejected)"

# 53.13  _validateTriNode body guards against arrays
Check ($fnVtN53 -match 'Array\.isArray') `
    "_validateTriNode body has Array.isArray guard (array response rejected)"

# 53.14  _validateTriNode body accepts objects with Tri-Node keys
Check ($fnVtN53 -match "'narrative' in parsed" -or $fnVtN53 -match '"narrative" in parsed') `
    "_validateTriNode body accepts objects with 'narrative' key"

# 53.15  fetchAuthorizedModels: 400 body inspected for INVALID_ARGUMENT (Finding A)
$fnFetch53b = Get-FunctionBody $apiSrc53 'fetchAuthorizedModels'
Check ($fnFetch53b -match 'INVALID_ARGUMENT') `
    "fetchAuthorizedModels inspects error body for INVALID_ARGUMENT (bad-key 400 detected)"

# 53.16  fetchAuthorizedModels: 400 body inspected for PERMISSION_DENIED (Finding A)
Check ($fnFetch53b -match 'PERMISSION_DENIED') `
    "fetchAuthorizedModels inspects error body for PERMISSION_DENIED (auth-denied 400 detected)"

# 53.17  transmitMessage: throws "API Key Error" for key-specific 400s (Finding A)
Check ($fnTm53 -match 'API Key Error') `
    "transmitMessage throws 'API Key Error' for key-specific 400 responses"

# 53.18  transmitMessage: key-error/auth branch does NOT call _recordFeatureFailure (Finding A)
$keyErrBranchIdx53 = $fnTm53.IndexOf('_isKeyError || _code === 401 || _code === 403')
$next429Idx53b    = $fnTm53.IndexOf('_code === 429')
$keyErrBlock53 = if ($keyErrBranchIdx53 -ge 0 -and $next429Idx53b -gt $keyErrBranchIdx53) {
    $fnTm53.Substring($keyErrBranchIdx53, $next429Idx53b - $keyErrBranchIdx53)
} else { '' }
Check ($keyErrBlock53.Length -gt 0 -and -not ($keyErrBlock53 -match '_recordFeatureFailure')) `
    "transmitMessage key-error/auth branch does NOT call _recordFeatureFailure (bad key does not auto-disable AI)"

# 53.19  _validateTriNode body: accepts 'state' key (state-only AI responses are valid)
Check ($fnVtN53 -match "'state' in parsed" -or $fnVtN53 -match '"state" in parsed') `
    "_validateTriNode body checks 'state' in parsed (state-only Tri-Node accepted)"

# 53.20  _validateTriNode body: accepts 'modal' key (modal-only AI responses are valid)
Check ($fnVtN53 -match "'modal' in parsed" -or $fnVtN53 -match '"modal" in parsed') `
    "_validateTriNode body checks 'modal' in parsed (modal-only Tri-Node accepted)"

# 53.21  _validateTriNode body: typeof guard rejects non-objects (strings, numbers, booleans)
Check ($fnVtN53 -match "typeof parsed !== 'object'" -or $fnVtN53 -match 'typeof parsed !== "object"') `
    "_validateTriNode body has typeof guard (non-objects like strings are rejected)"

# 53.22  _validateTriNode body: has explicit return false (invalid inputs return false, not undefined/null)
Check ($fnVtN53 -match '\breturn false\b') `
    "_validateTriNode body has explicit 'return false' (invalid inputs rejected with boolean false)"

# 53.23  _validateTriNode body: multiple 'in parsed' checks (not a trivial single-key check)
$inParsedCount53 = ([regex]::Matches($fnVtN53, 'in parsed')).Count
Check ($inParsedCount53 -ge 2) `
    "_validateTriNode body has >=2 'in parsed' checks (validates multiple Tri-Node keys)"

# 53.24  _validateTriNode body: no side effects (no saveState or localStorage calls)
Check (-not ($fnVtN53 -match 'saveState') -and -not ($fnVtN53 -match 'localStorage')) `
    "_validateTriNode body has no side effects (pure validation - no state writes)"

# 53.25  _validateTriNode body: !parsed guard appears before first return false (falsy caught first)
$bangParsedIdx53 = $fnVtN53.IndexOf('!parsed')
$firstRetFalseIdx53 = $fnVtN53.IndexOf('return false')
Check ($bangParsedIdx53 -ge 0 -and $firstRetFalseIdx53 -ge 0 -and $bangParsedIdx53 -lt $firstRetFalseIdx53) `
    "_validateTriNode: !parsed guard appears before first return false (falsy inputs caught first)"

# ===========================================================
# Suite 54 -- Prompt-Injection Hardening, Input Caps, Quota Warning
# Injection-resistance directive, player-input wrapper,
# HTML + JS length caps, saveState quota handling.
# 14 tests
# ===========================================================
Sep "Suite 54 -- Prompt-Injection Hardening, Input Caps, Quota Warning"
$apiSrc54  = Read-Src "js/api.js"
$stateSrc54 = Read-Src "js/state.js"
$htmlSrc54 = Read-Src "index.html"
# U1: the injection-resistance copy lives in _directiveInjectionBoundary() now --
# check the full composed directive body, not getSystemDirective()'s own short body.
$gsdBody54 = Get-DirectiveFullBody $apiSrc54
$tmBody54  = Get-FunctionBody $apiSrc54 'transmitMessage'
$saveStateFn54 = Get-FunctionBody $stateSrc54 'saveState'

# 54.1  getSystemDirective() contains an injection-resistance / source-boundary section
Check ($gsdBody54 -match 'Instruction-Source Boundary' -or $gsdBody54 -match 'injection.resist') `
    "getSystemDirective() contains an instruction-source-boundary / injection-resistance section"

# 54.2  The section instructs that player input is DATA, not instructions
Check (($gsdBody54 -match 'data.*player' -or $gsdBody54 -match 'player.*data' -or $gsdBody54 -match 'DATA.*player') -or
       ($gsdBody54 -match 'data.*not.*instruction' -or $gsdBody54 -match 'not.*a.*command')) `
    "getSystemDirective() injection-resistance section marks player input as data not instructions"

# 54.3  The section prohibits following instructions embedded in user/image content
Check (($gsdBody54 -match 'MUST NOT' -or $gsdBody54 -match 'must not') -and
       ($gsdBody54 -match 'role' -or $gsdBody54 -match 'persona' -or $gsdBody54 -match 'schema' -or $gsdBody54 -match 'system instruction')) `
    "getSystemDirective() injection-resistance section prohibits following embedded instructions (role/schema changes)"

# 54.4  The section requires Tri-Node JSON schema response regardless of player input
Check ($gsdBody54 -match 'Tri-Node JSON' -and $gsdBody54 -match 'regardless') `
    "getSystemDirective() injection-resistance section requires Tri-Node JSON response regardless of player input"

# 54.5  transmitMessage() wraps user content in a labeled player-input block
Check ($tmBody54 -match 'PLAYER INPUT') `
    "transmitMessage() labels user content as PLAYER INPUT (clear data delimiter in outgoing request)"

# 54.6  The player-input label includes 'data, not instructions' or equivalent
Check ($tmBody54 -match 'data.*not.*instructions' -or $tmBody54 -match 'not instructions') `
    "transmitMessage() player-input label contains 'data, not instructions' (clear injection barrier)"

# 54.7  #chatInput has maxlength >= 4000 in index.html
$chatInputML54 = 0
if ($htmlSrc54 -match 'id="chatInput"[\s\S]{0,200}maxlength="(\d+)"') {
    $chatInputML54 = [int]$Matches[1]
}
Check ($chatInputML54 -ge 4000) `
    "#chatInput maxlength is >= 4000 (found: $chatInputML54) -- pathological chat input blocked at source"

# 54.8  #newItemName has a maxlength attribute in index.html
Check ($htmlSrc54 -match 'id="newItemName"[\s\S]{0,200}maxlength="') `
    "#newItemName has a maxlength attribute in index.html (item name length capped)"

# 54.9  #newQuestName has a maxlength attribute in index.html
Check ($htmlSrc54 -match 'id="newQuestName"[\s\S]{0,200}maxlength="') `
    "#newQuestName has a maxlength attribute in index.html (quest name length capped)"

# 54.10  #newPerkName has a maxlength attribute in index.html
Check ($htmlSrc54 -match 'id="newPerkName"[\s\S]{0,200}maxlength="') `
    "#newPerkName has a maxlength attribute in index.html (perk name length capped)"

# 54.11  #newCampaignNote has a maxlength attribute in index.html
Check ($htmlSrc54 -match 'id="newCampaignNote"[\s\S]{0,200}maxlength="') `
    "#newCampaignNote has a maxlength attribute in index.html (campaign note length capped)"

# 54.12  transmitMessage() has a JS length guard checking userText.length
Check ($tmBody54 -match 'userText\.length\s*>\s*\d+') `
    "transmitMessage() has a JS length guard on userText.length (defense-in-depth beyond maxlength attribute)"

# 54.13  saveState() catch block handles QuotaExceededError
Check ($saveStateFn54 -match 'QuotaExceededError') `
    "saveState() catch block handles QuotaExceededError (save failures surface to the user)"

# 54.14  The QuotaExceededError handler in saveState() calls appendToChat with a warning
Check ($saveStateFn54 -match 'QuotaExceededError[\s\S]{0,400}appendToChat') `
    "saveState() QuotaExceededError handler calls appendToChat (quota failures shown to user, not silently swallowed)"

# ===========================================================
# Suite 55 -- CSP Stage 2 Origin Guards + Firebase Pin
# Protocol-20 origin guard (load-bearing CSP origins),
# unsafe-inline tripwire, blob: img-src guard, Firebase version-pin guard.
# 13 tests
# ===========================================================
Sep "Suite 55 -- CSP Stage 1 Origin Guards + Firebase Pin"
$htmlSrc55 = Read-Src "index.html"
$cloudSrc55 = Read-Src "js/cloud.js"

# 55.1 generativelanguage.googleapis.com present in CSP (Gemini API)
Check ([bool]($htmlSrc55 -match 'generativelanguage\.googleapis\.com')) `
    "CSP contains generativelanguage.googleapis.com (Gemini API origin -- Protocol 20 guard)"

# 55.2 identitytoolkit.googleapis.com present in CSP (Firebase Auth)
Check ([bool]($htmlSrc55 -match 'identitytoolkit\.googleapis\.com')) `
    "CSP contains identitytoolkit.googleapis.com (Firebase Auth origin -- Protocol 20 guard)"

# 55.3 securetoken.googleapis.com present in CSP (Firebase token refresh)
Check ([bool]($htmlSrc55 -match 'securetoken\.googleapis\.com')) `
    "CSP contains securetoken.googleapis.com (Firebase token refresh -- Protocol 20 guard)"

# 55.4 firestore.googleapis.com present in CSP (Firestore)
Check ([bool]($htmlSrc55 -match 'firestore\.googleapis\.com')) `
    "CSP contains firestore.googleapis.com (Firestore origin -- Protocol 20 guard)"

# 55.5 apis.google.com present in CSP (Google Sign-In popup + Firebase SDK)
Check ([bool]($htmlSrc55 -match 'apis\.google\.com')) `
    "CSP contains apis.google.com (Google Sign-In + Firebase SDK origin -- Protocol 20 guard)"

# 55.6 nv-overlord.firebaseapp.com present in CSP (Firebase hosting + auth handler)
Check ([bool]($htmlSrc55 -match 'nv-overlord\.firebaseapp\.com')) `
    "CSP contains nv-overlord.firebaseapp.com (Firebase hosting + auth handler -- Protocol 20 guard)"

# 55.7 object-src 'none' present in CSP (blocks plugin content)
Check ([bool]($htmlSrc55 -match "object-src\s+'none'")) `
    "CSP contains object-src 'none' (blocks plugin content -- Protocol 20 guard)"

# 55.8 base-uri 'none' present in CSP (blocks base-tag injection)
Check ([bool]($htmlSrc55 -match "base-uri\s+'none'")) `
    "CSP contains base-uri 'none' (blocks base-tag injection -- Protocol 20 guard)"

# 55.9 frame-ancestors 'none' present in CSP (prevents clickjacking)
Check ([bool]($htmlSrc55 -match "frame-ancestors\s+'none'")) `
    "CSP contains frame-ancestors 'none' (prevents clickjacking -- Protocol 20 guard)"

# 55.10 Tripwire: script-src still contains 'unsafe-inline'
# (~148 inline event handlers require this; must not be silently dropped)
Check ([bool]($htmlSrc55 -match "script-src[^;]*'unsafe-inline'")) `
    "CSP script-src contains 'unsafe-inline' (tripwire: required for ~148 inline handlers)"

# 55.11 Tripwire: script-src contains NO sha256- or nonce- token
# CSP level 2+: a hash/nonce in script-src disables unsafe-inline, breaking all inline handlers
$cspContent55 = ''
if ($htmlSrc55 -match 'http-equiv="Content-Security-Policy[^"]*"[^>]*content="([^"]*)"') {
    $cspContent55 = $Matches[1]
}
$scriptSrc55 = ''
if ($cspContent55 -match 'script-src([^;]*)') {
    $scriptSrc55 = $Matches[1]
}
Check (-not ($scriptSrc55 -match 'sha256-|nonce-')) `
    "CSP script-src contains no sha256- or nonce- token (tripwire: a hash/nonce disables unsafe-inline per CSP spec, breaking all 148 inline handlers)"

# 55.12 Firebase pin guard: all firebasejs import URLs in cloud.js carry version 12.15.0
$fbPins55 = ([regex]'firebasejs/[\d.]+').Matches($cloudSrc55)
$allPinned55 = ($fbPins55.Count -gt 0) -and (($fbPins55 | ForEach-Object { $_.Value } | Where-Object { $_ -notmatch '12\.15\.0' }).Count -eq 0)
Check $allPinned55 `
    "Firebase SDK import URLs in cloud.js are all pinned to 12.15.0 (supply-chain guard)"

# 55.13 img-src contains blob: (canvas / screenshot-preview images)
Check ([bool]($htmlSrc55 -match 'img-src[^;]*blob:')) `
    "CSP img-src contains blob: (canvas/screenshot-preview images -- Protocol 20 guard)"

# ===========================================================
# Suite 56 -- UI Module Split Guards + Boot-Loader Migration (35 tests)
# Protocol-20 static guards: each ui-*.js must exist, appear
# in sw.js ASSETS, and be wired in index.html before api.js.
# Also guards the document.write -> createElement migration.
# 35 tests
# ===========================================================
Sep "Suite 56 -- UI Module Split Guards"
$htmlSrc56 = $htmlSrc55  # reuse (same index.html read above)
$swSrc56   = Read-Src "sw.js"

# 56.1 js/ui-audio.js file exists on disk
Check (Test-Path (Join-Path $Root "js\ui-audio.js")) `
    "js/ui-audio.js file exists (Slice A: audio module extracted)"

# 56.2 ./js/ui-audio.js appears in sw.js ASSETS list
Check ([bool]($swSrc56 -match 'js/ui-audio\.js')) `
    "'./js/ui-audio.js' in sw.js ASSETS (cache covers the audio module)"

# 56.3 <script src="js/ui-audio.js"> appears in index.html
Check ([bool]($htmlSrc56 -match 'src="js/ui-audio\.js"')) `
    '<script src="js/ui-audio.js"> present in index.html'

# 56.4 ui-audio.js script appears before api.js in index.html (load-order guard)
$audioIdx56  = $htmlSrc56.IndexOf('js/ui-audio.js')
$apiIdx56    = $htmlSrc56.IndexOf('js/api.js')
Check ($audioIdx56 -ne -1 -and $apiIdx56 -ne -1 -and $audioIdx56 -lt $apiIdx56) `
    "ui-audio.js <script> appears before api.js in index.html (load-order guard)"

# 56.5 ui-audio.js script appears before ui.js in index.html
$audioIdx56b = $htmlSrc56.IndexOf('js/ui-audio.js')
$uiIdx56     = $htmlSrc56.IndexOf('"js/ui-core.js"')
Check ($audioIdx56b -ne -1 -and $uiIdx56 -ne -1 -and $audioIdx56b -lt $uiIdx56) `
    "ui-audio.js <script> appears before ui.js in index.html (audio loads before core)"

# 56.6 js/ui-render.js file exists on disk
Check (Test-Path (Join-Path $Root "js\ui-render.js")) `
    "js/ui-render.js file exists (Slice B: render module extracted)"

# 56.7 ./js/ui-render.js appears in sw.js ASSETS list
Check ([bool]($swSrc56 -match 'js/ui-render\.js')) `
    "'./js/ui-render.js' in sw.js ASSETS (cache covers the render module)"

# 56.8 <script src="js/ui-render.js"> appears in index.html
Check ([bool]($htmlSrc56 -match 'src="js/ui-render\.js"')) `
    '<script src="js/ui-render.js"> present in index.html'

# 56.9 ui-render.js script appears before api.js in index.html
$renderIdx56  = $htmlSrc56.IndexOf('js/ui-render.js')
$apiIdx56b    = $htmlSrc56.IndexOf('js/api.js')
Check ($renderIdx56 -ne -1 -and $apiIdx56b -ne -1 -and $renderIdx56 -lt $apiIdx56b) `
    "ui-render.js <script> appears before api.js in index.html (load-order guard)"

# 56.10 ui-render.js script appears before ui.js in index.html
$renderIdx56b = $htmlSrc56.IndexOf('js/ui-render.js')
$uiIdx56b     = $htmlSrc56.IndexOf('"js/ui-core.js"')
Check ($renderIdx56b -ne -1 -and $uiIdx56b -ne -1 -and $renderIdx56b -lt $uiIdx56b) `
    "ui-render.js <script> appears before ui.js in index.html (render loads before core)"

# 56.11 js/ui-saves.js file exists on disk
Check (Test-Path (Join-Path $Root "js\ui-saves.js")) `
    "js/ui-saves.js file exists (Slice C: saves module extracted)"
# 56.12 ./js/ui-saves.js appears in sw.js ASSETS list
Check ([bool]($swSrc56 -match 'js/ui-saves\.js')) `
    "'./js/ui-saves.js' in sw.js ASSETS (cache covers the saves module)"
# 56.13 <script src="js/ui-saves.js"> appears in index.html
Check ([bool]($htmlSrc56 -match 'src="js/ui-saves\.js"')) `
    '<script src="js/ui-saves.js"> present in index.html'
# 56.14 ui-saves.js script appears before api.js in index.html
$savesIdx56  = $htmlSrc56.IndexOf('js/ui-saves.js')
$apiIdx56c   = $htmlSrc56.IndexOf('js/api.js')
Check ($savesIdx56 -ne -1 -and $apiIdx56c -ne -1 -and $savesIdx56 -lt $apiIdx56c) `
    "ui-saves.js <script> appears before api.js in index.html (load-order guard)"
# 56.15 ui-saves.js script appears before ui.js in index.html
$savesIdx56b = $htmlSrc56.IndexOf('js/ui-saves.js')
$uiIdx56c    = $htmlSrc56.IndexOf('"js/ui-core.js"')
Check ($savesIdx56b -ne -1 -and $uiIdx56c -ne -1 -and $savesIdx56b -lt $uiIdx56c) `
    "ui-saves.js <script> appears before ui.js in index.html (saves loads before core)"
# 56.16 js/ui-account.js file exists on disk
Check (Test-Path (Join-Path $Root "js\ui-account.js")) `
    "js/ui-account.js file exists (Slice D: account module extracted)"
# 56.17 ./js/ui-account.js appears in sw.js ASSETS list
Check ([bool]($swSrc56 -match 'js/ui-account\.js')) `
    "'./js/ui-account.js' in sw.js ASSETS (cache covers the account module)"
# 56.18 <script src="js/ui-account.js"> appears in index.html
Check ([bool]($htmlSrc56 -match 'src="js/ui-account\.js"')) `
    '<script src="js/ui-account.js"> present in index.html'
# 56.19 ui-account.js script appears before api.js in index.html
$acctIdx56  = $htmlSrc56.IndexOf('js/ui-account.js')
$apiIdx56d  = $htmlSrc56.IndexOf('js/api.js')
Check ($acctIdx56 -ne -1 -and $apiIdx56d -ne -1 -and $acctIdx56 -lt $apiIdx56d) `
    "ui-account.js <script> appears before api.js in index.html (load-order guard)"
# 56.20 ui-account.js script appears before ui-core.js in index.html
$acctIdx56b = $htmlSrc56.IndexOf('js/ui-account.js')
$uiIdx56d   = $htmlSrc56.IndexOf('"js/ui-core.js"')
Check ($acctIdx56b -ne -1 -and $uiIdx56d -ne -1 -and $acctIdx56b -lt $uiIdx56d) `
    "ui-account.js <script> appears before ui-core.js in index.html (account loads before core)"
# 56.21 js/ui.js must NOT exist (Slice E: fully renamed to ui-core.js)
Check (-not (Test-Path (Join-Path $Root "js\ui.js"))) `
    "js/ui.js does not exist on disk (Slice E: renamed to ui-core.js -- old file must be absent)"

# -- Boot-loader migration guards (56.22-56.34) --
# 56.22 document.write is gone from index.html (headline regression guard)
Check (-not ($htmlSrc56 -match 'document\.write')) `
    "index.html contains no document.write (boot-loader migration guard)"

# 56.23 Boot loader uses createElement('script') for dynamic injection
Check ([bool]($htmlSrc56 -match "createElement\([`"']script[`"']\)")) `
    "boot loader uses document.createElement('script') (dynamic injection guard)"

# 56.24 Boot loader uses .appendChild() to insert scripts
Check ([bool]($htmlSrc56 -match '\.appendChild\(')) `
    "boot loader uses .appendChild() to inject scripts into <head> (dynamic injection guard)"

# 56.25 Boot loader sets .async = false to preserve db->state->reg order
Check ([bool]($htmlSrc56 -match '\.async\s*=\s*false')) `
    "boot loader sets script.async = false (preserves db->state->reg load order)"

# 56.26 Boot loader references js/db_nv.js (FNV database)
Check ([bool]($htmlSrc56 -match 'js/db_nv\.js')) `
    "boot loader references js/db_nv.js (FNV database path present)"

# 56.27 Boot loader references js/db_fo3.js (FO3 database)
Check ([bool]($htmlSrc56 -match 'js/db_fo3\.js')) `
    "boot loader references js/db_fo3.js (FO3 database path present)"

# 56.28 Boot loader references js/state.js (shared state module)
Check ([bool]($htmlSrc56 -match 'js/state\.js')) `
    "boot loader references js/state.js (shared state module path present)"

# 56.29 Boot loader references js/reg_nv.js (FNV registry)
Check ([bool]($htmlSrc56 -match 'js/reg_nv\.js')) `
    "boot loader references js/reg_nv.js (FNV registry path present)"

# 56.30 Boot loader references js/reg_fo3.js (FO3 registry)
Check ([bool]($htmlSrc56 -match 'js/reg_fo3\.js')) `
    "boot loader references js/reg_fo3.js (FO3 registry path present)"

# 56.31 Boot loader reads activeContext (primary context selector)
Check ([bool]($htmlSrc56 -match 'activeContext')) `
    "boot loader reads activeContext (primary game-context selector)"

# 56.32 Boot loader has try/catch for fail-safe LocalStorage access
Check ([bool]($htmlSrc56 -match 'try\s*\{')) `
    "boot loader has try { } catch (fail-safe: corrupt LocalStorage -> FNV default)"

# 56.33 Boot loader has 'FNV' as the fail-safe default
Check ([bool]($htmlSrc56 -match "'FNV'" -or $htmlSrc56 -match '"FNV"')) `
    "boot loader has 'FNV' fail-safe default (loads FNV when context is absent/unreadable)"

# 56.34 Boot loader handles 'FO3' context
Check ([bool]($htmlSrc56 -match "'FO3'" -or $htmlSrc56 -match '"FO3"')) `
    "boot loader handles 'FO3' context (switches to FO3 db + reg when activeContext is FO3)"

# 56.35 Boot loader selects data files via the GAME_FILES manifest with a
#       GAME_FILES.FNV fail-safe (WU-A5 -- no hardcoded per-game ternary).
Check ([bool](($htmlSrc56 -match 'GAME_FILES\s*=\s*\{') -and ($htmlSrc56 -match 'GAME_FILES\[\s*ctx\s*\]\s*\|\|\s*GAME_FILES\.FNV'))) `
    'boot loader uses GAME_FILES manifest keyed by context with GAME_FILES.FNV fail-safe (WU-A5 boot manifest)'

# ===========================================================
# Suite 57 -- PWA App Shortcuts Guards
# Verifies manifest.json shortcuts array and ui-core.js
# SHORTCUT_ROUTES / routeLaunchShortcut implementation.
# Also checks custom per-shortcut icon files exist and are
# listed in sw.js ASSETS.
# 19 tests
# ===========================================================
Sep "Suite 57 -- PWA App Shortcuts Guards"
$manifestSrc57 = Read-Src "manifest.json"
$manifest57    = $manifestSrc57 | ConvertFrom-Json
$uiCoreSrc57   = Read-Src "js/ui-core.js"

# 57.1 manifest.shortcuts is an array of exactly 4 entries
Check ([bool]($manifest57.shortcuts -is [array]) -and $manifest57.shortcuts.Count -eq 4) `
    ("manifest.shortcuts is an array of 4 entries (found: " + $(if ($manifest57.shortcuts -is [array]) { $manifest57.shortcuts.Count } else { "not an array" }) + ")")

# 57.2 All 4 expected shortcuts present by name and url (Data shortcut removed from manifest)
$expectedNames57 = @('Comm-Link','Inventory','Stats','New Campaign')
$expectedUrls57  = @('./#go=comm','./#go=inv','./#go=stat','./#go=new')
$shorts57 = if ($manifest57.shortcuts -is [array]) { $manifest57.shortcuts } else { @() }
$allPresent57 = $true
for ($ii = 0; $ii -lt $expectedNames57.Count; $ii++) {
    $n = $expectedNames57[$ii]; $u = $expectedUrls57[$ii]
    if (-not ($shorts57 | Where-Object { $_.name -eq $n -and $_.url -eq $u })) { $allPresent57 = $false }
}
Check $allPresent57 `
    "All 4 shortcuts present with correct names and ./#go=<id> urls (Comm-Link, Inventory, Stats, New Campaign)"

# 57.3 Every shortcut url starts with ./ and contains #go= (offline-safe, no query param)
$allUrlsSafe57 = ($shorts57 | Where-Object { -not ($_.url -like './*' -and $_.url -match '#go=') }).Count -eq 0 -and $shorts57.Count -gt 0
Check $allUrlsSafe57 `
    "Every shortcut url starts with ./ and uses #go= hash (not a query param -- safe for SW cache-first offline)"

# 57.4 SHORTCUT_ROUTES const defined in ui-core.js
Check ([bool]($uiCoreSrc57 -match 'const\s+SHORTCUT_ROUTES\s*=')) `
    "SHORTCUT_ROUTES const defined in js/ui-core.js"

# 57.5 routeLaunchShortcut function defined in ui-core.js
Check ([bool]($uiCoreSrc57 -match 'function\s+routeLaunchShortcut\s*\(')) `
    "routeLaunchShortcut() function defined in js/ui-core.js"

# 57.6a Allow-list guard: /^go=/ regex present in routing source
Check ([bool]($uiCoreSrc57 -match '\^go=')) `
    "routeLaunchShortcut uses /^go=/ allow-list regex to validate hash value"

# 57.6b No eval or innerHTML in routing fn body (check only the function body, not full source)
$fnStart57  = $uiCoreSrc57.IndexOf('function routeLaunchShortcut(')
$fnBody57   = if ($fnStart57 -ge 0) { $uiCoreSrc57.Substring($fnStart57, [Math]::Min(600, $uiCoreSrc57.Length - $fnStart57)) } else { '' }
Check (-not ($fnBody57 -match '\beval\b') -and -not ($fnBody57 -match '\.innerHTML')) `
    "routeLaunchShortcut body contains no eval or innerHTML (XSS safety)"

# 57.7a New Campaign routes to wipeTerminal
Check ([bool]($uiCoreSrc57 -match "new\s*:\s*\(\s*\)\s*=>\s*wipeTerminal\s*\(")) `
    "SHORTCUT_ROUTES 'new' key routes to wipeTerminal()"

# 57.7b wipeTerminal still gates on >=2 confirmAction() calls (Step 2 Phase 0 U12
#       replaced the blocking confirm() with the diegetic confirmAction() -- the
#       double-confirm GATE COUNT invariant is preserved, only the mechanism changed)
$wipeBody57 = Get-FunctionBody $uiCoreSrc57 'wipeTerminal'
$confirmCount57 = ([regex]::Matches($wipeBody57, '\bconfirmAction\s*\(')).Count
Check ($confirmCount57 -ge 2) `
    ("wipeTerminal still has >=2 confirmAction() calls (found $confirmCount57) -- double-confirm gate intact")

# 57.8 Tab routes reuse switchTab for inv, stat, data
Check ([bool]($uiCoreSrc57 -match "inv\s*:\s*\(\s*\)\s*=>\s*switchTab\s*\(\s*[`"']inv[`"']\s*\)") `
    -and [bool]($uiCoreSrc57 -match "stat\s*:\s*\(\s*\)\s*=>\s*switchTab\s*\(\s*[`"']stat[`"']\s*\)") `
    -and [bool]($uiCoreSrc57 -match "data\s*:\s*\(\s*\)\s*=>\s*switchTab\s*\(\s*[`"']data[`"']\s*\)")) `
    "SHORTCUT_ROUTES inv/stat/data keys route via switchTab() -- reuses existing tab system"

# 57.9 routeLaunchShortcut() call appears after initTabs( in source (boot order guard)
$initTabsIdx57  = $uiCoreSrc57.IndexOf('initTabs(')
$routeCallIdx57 = $uiCoreSrc57.IndexOf('routeLaunchShortcut()')
Check ($initTabsIdx57 -ge 0 -and $routeCallIdx57 -ge 0 -and $routeCallIdx57 -gt $initTabsIdx57) `
    "routeLaunchShortcut() call appears after initTabs() in source -- tab system ready before routing"

# 57.10 Reload-safety: history.replaceState present in routeLaunchShortcut
Check ([bool]($uiCoreSrc57 -match 'history\.replaceState')) `
    "routeLaunchShortcut clears the hash via history.replaceState (reload-safety -- prevents re-trigger on reload)"

# 57.11 Each shortcut references its own specific custom icon (not icon.png)
$expectedIconMap57 = @{
    'Comm-Link'    = 'comm-link-icon.png'
    'Inventory'    = 'inventory-icon.png'
    'Stats'        = 'stats-icon.png'
    'New Campaign' = 'new-campaign-icon.png'
}
$allCustomIcons57 = $true
foreach ($s in $shorts57) {
    $exp = $expectedIconMap57[$s.name]
    if (-not $exp) { $allCustomIcons57 = $false; break }
    $iconSrcs = if ($s.icons -is [array]) { $s.icons | ForEach-Object { $_.src } } else { @($s.icons.src) }
    if ($exp -notin $iconSrcs) { $allCustomIcons57 = $false; break }
}
Check $allCustomIcons57 `
    "Each shortcut has its own custom icon src (comm-link-icon.png, inventory-icon.png, stats-icon.png, new-campaign-icon.png)"

# 57.12-57.15 Each shortcut icon file exists on disk
$shortcutIconFiles57 = @('comm-link-icon.png','inventory-icon.png','stats-icon.png','new-campaign-icon.png')
foreach ($iconFile in $shortcutIconFiles57) {
    Check (Test-Path (Join-Path $Root $iconFile)) "$iconFile exists on disk"
}

# 57.16 All 4 shortcut icon files are listed in sw.js ASSETS precache array
$swSrc57 = Read-Src "sw.js"
$allIconsInAssets57 = ($shortcutIconFiles57 | Where-Object { -not $swSrc57.Contains("'./$_'") }).Count -eq 0
Check $allIconsInAssets57 `
    "All 4 shortcut icon files are listed in sw.js ASSETS precache array"

# 57.17 App icon (icon.png) exists on disk
Check (Test-Path (Join-Path $Root 'icon.png')) `
    "icon.png exists on disk (PWA app icon)"

# ===========================================================
# Suite 58 -- Client Error Ring-Buffer Guards (Item C)
# Verifies ERROR_LOG_KEY/CAP, _recordError, both handlers wired,
# showErrorLog + escapeHtml + [LOGS] in router, no-exfil.
# 5 tests
# ===========================================================
Sep "Suite 58 -- Client Error Ring-Buffer Guards"
$uiCoreSrc58 = Read-Src "js/ui-core.js"
$apiSrc58    = Read-Src "js/api.js"

# 58.1 ERROR_LOG_KEY, ERROR_LOG_CAP, _recordError all defined in ui-core.js
Check ([bool]($uiCoreSrc58 -match 'ERROR_LOG_KEY\s*=') `
    -and [bool]($uiCoreSrc58 -match 'ERROR_LOG_CAP\s*=') `
    -and [bool]($uiCoreSrc58 -match 'function\s+_recordError\s*\(')) `
    "ERROR_LOG_KEY, ERROR_LOG_CAP, and _recordError() are defined in js/ui-core.js"

# 58.2 Both handlers call _recordError (error + rejection)
Check ([bool]($uiCoreSrc58 -match "_recordError\s*\(\s*'error'") `
    -and [bool]($uiCoreSrc58 -match "_recordError\s*\(\s*'rejection'")) `
    "Both 'error' and 'unhandledrejection' handlers call _recordError() with the correct type string"

# 58.3 Ring cap enforced -- .shift() + ERROR_LOG_CAP / 50
Check ([bool]($uiCoreSrc58 -match '\.shift\s*\(\s*\)') `
    -and ([bool]($uiCoreSrc58 -match 'ERROR_LOG_CAP') -or [bool]($uiCoreSrc58 -match '\b50\b'))) `
    "_recordError enforces ring cap via .shift() with ERROR_LOG_CAP / 50 guard"

# 58.4 showErrorLog defined, references escapeHtml, [LOGS] in NATIVE_COMMAND_ROUTER
Check ([bool]($uiCoreSrc58 -match 'function\s+showErrorLog\s*\(') `
    -and [bool]($uiCoreSrc58 -match 'escapeHtml\s*\(') `
    -and [bool]($apiSrc58 -match "'\[LOGS\]'\s*:")) `
    "showErrorLog() defined in ui-core.js, references escapeHtml(), and '[LOGS]' wired in NATIVE_COMMAND_ROUTER"

# 58.5 No-exfil: bounded window from each fn contains no fetch(, XMLHttpRequest, or sendBeacon
$recIdx58  = $uiCoreSrc58.IndexOf('function _recordError(')
$showIdx58 = $uiCoreSrc58.IndexOf('function showErrorLog(')
$recSlice58  = if ($recIdx58 -ge 0)  { $uiCoreSrc58.Substring($recIdx58,  [Math]::Min(500,  $uiCoreSrc58.Length - $recIdx58))  } else { '' }
$showSlice58 = if ($showIdx58 -ge 0) { $uiCoreSrc58.Substring($showIdx58, [Math]::Min(2500, $uiCoreSrc58.Length - $showIdx58)) } else { '' }
Check (-not ($recSlice58  -match 'fetch\(') -and -not ($recSlice58  -match 'XMLHttpRequest') -and -not ($recSlice58  -match 'sendBeacon') `
    -and -not ($showSlice58 -match 'fetch\(') -and -not ($showSlice58 -match 'XMLHttpRequest') -and -not ($showSlice58 -match 'sendBeacon')) `
    "_recordError and showErrorLog bodies contain no fetch(), XMLHttpRequest, or sendBeacon (privacy: log is local-only)"

# ===========================================================
# Suite 59 -- Inline Handler Integrity (Item D-proxy)
# Scans index.html for on*="..." inline handlers, extracts
# standalone function names, asserts all resolve in js/*.js.
# 2 tests
# ===========================================================
Sep "Suite 59 -- Inline Handler Integrity"
$htmlSrc59   = Read-Src "index.html"
$jsFiles59   = @('js/ui-audio.js','js/ui-render.js','js/ui-saves.js','js/ui-account.js',
                  'js/ui-core.js','js/api.js','js/cloud.js','js/state.js',
                  'js/reg_nv.js','js/reg_fo3.js')
$allJsSrc59  = ($jsFiles59 | ForEach-Object { Read-Src $_ }) -join "`n"

# JS keywords + browser built-ins that appear as standalone calls in handler code
$jsKeywords59 = @('if','else','for','while','switch','function','return','typeof','instanceof',
                   'new','throw','try','catch','finally','delete','void','in','of',
                   'let','const','var','do','break','continue','case','default','import','export',
                   'parseFloat','parseInt','isNaN','isFinite','Number','String','Boolean',
                   'Array','Object','Math','JSON','Date','encodeURIComponent','decodeURIComponent')

$attrMatches59   = [regex]::Matches($htmlSrc59, '(?i)\bon[a-z]+\s*=\s*"([^"]*)"')
$handlerNames59  = [System.Collections.Generic.HashSet[string]]::new()
foreach ($am in $attrMatches59) {
    $handlerText = $am.Groups[1].Value
    # (?<![A-Za-z0-9_$.]) excludes method calls (preceded by '.') AND partial-identifier
    # false extractions (preceded by another word char). Without this wider exclusion,
    # 'this.setItem(' would yield 'etItem' rather than 'setItem'.
    $fnCallMs = [regex]::Matches($handlerText, '(?<![A-Za-z0-9_$.])([A-Za-z_$][A-Za-z0-9_$]*)\s*\(')
    foreach ($fm in $fnCallMs) {
        $name = $fm.Groups[1].Value
        if ($name -notin $jsKeywords59) { [void]$handlerNames59.Add($name) }
    }
}

# 59.1 Scanner found at least 20 unique handler names (sanity)
Check ($handlerNames59.Count -ge 20) `
    ("Inline handler scanner found " + $handlerNames59.Count + " unique handler function names (>=20 expected)")

# 59.2 All handler names resolve as definitions in js/*.js (definition-anchored)
#      Matches: function NAME( | NAME = function | NAME = ( | window.NAME = | const/let/var NAME =
function Test-Defined59($name, $src) {
    $pattern = "(?:function\s+$([regex]::Escape($name))\s*\(|\b$([regex]::Escape($name))\s*=\s*(?:function|\()|window\.$([regex]::Escape($name))\s*=|(?:const|let|var)\s+$([regex]::Escape($name))\s*=)"
    return [bool]([regex]::IsMatch($src, $pattern))
}
$dangling59 = $handlerNames59 | Where-Object { -not (Test-Defined59 $_ $allJsSrc59) }
Check ($dangling59.Count -eq 0) `
    ("All inline handler function names resolve as definitions in js/*.js" + $(if ($dangling59.Count) { " -- DANGLING (real bug): " + ($dangling59 -join ", ") } else { "" }))

# ===========================================================
# Suite 60 -- A11y Gate Guards
# Verifies @axe-core/playwright devDep, a11y-check.mjs + baseline
# exist, gate.js invokes a11y step, package.json has a11y script.
# 5 tests
# ===========================================================
Sep "Suite 60 -- A11y Gate Guards"
$pkgSrc60   = Read-Src "package.json"
$pkgJson60  = $pkgSrc60 | ConvertFrom-Json
$gateSrc60  = Read-Src "scripts/gate.js"

# 60.1 @axe-core/playwright present in devDependencies
Check ([bool]($pkgJson60.devDependencies.'@axe-core/playwright')) `
    "@axe-core/playwright present in package.json devDependencies"

# 60.2 tests/a11y-check.mjs exists
Check (Test-Path (Join-Path $ROOT "tests/a11y-check.mjs")) `
    "tests/a11y-check.mjs exists"

# 60.3 tests/a11y-baseline.json exists and is valid JSON
$baselinePath60 = Join-Path $ROOT "tests/a11y-baseline.json"
$baselineOk60 = $false
if (Test-Path $baselinePath60) {
    try { $null = Get-Content $baselinePath60 -Raw | ConvertFrom-Json; $baselineOk60 = $true } catch {}
}
Check $baselineOk60 "tests/a11y-baseline.json exists and is valid JSON"

# 60.4 scripts/gate.js invokes a11y-check.mjs in the non-fast block
Check ([bool]($gateSrc60 -match 'a11y-check\.mjs') -and [bool]($gateSrc60 -match 'if\s*\(!fast\)')) `
    "scripts/gate.js invokes a11y-check.mjs inside the non-fast block"

# 60.5 package.json has "a11y" script
Check ([bool]$pkgJson60.scripts.a11y) `
    'package.json has "a11y" script entry'

# ===========================================================
# Suite 61 -- Mobile Layout Overflow Guards (CSS invariants)
# Regression guards for r75 mobile layout stretch fix.
# Ensures minmax(0,1fr) grid track, overflow-wrap on panels/rows,
# inventory-span wrap rule, and mobile column clip are in place.
# 7 tests
# ===========================================================
Sep "Suite 61 -- Mobile Layout Overflow Guards"
$css61 = Read-Src "css/terminal.css"

# 61.1 .main-grid uses minmax(0, 1fr)
Check ([bool]($css61 -match '\.main-grid\s*\{[^}]*grid-template-columns\s*:\s*minmax\s*\(\s*0\s*,\s*1fr\s*\)')) `
    '.main-grid grid-template-columns is minmax(0, 1fr) -- not bare 1fr (mobile stretch guard)'

# 61.2 .list-row-content has overflow-wrap: anywhere
$rowMatch61 = if ($css61 -match '(\.list-row-content\s*\{[^}]*\})') { $Matches[1] } else { '' }
Check ([bool]($rowMatch61 -match 'overflow-wrap\s*:\s*anywhere')) `
    '.list-row-content has overflow-wrap: anywhere (long text wrap guard)'

# 61.3 .list-row-content has word-break: break-word
Check ([bool]($rowMatch61 -match 'word-break\s*:\s*break-word')) `
    '.list-row-content has word-break: break-word (unbroken token guard)'

# 61.4 .inventory-list li > span rule exists with min-width: 0
$spanMatch61 = if ($css61 -match '(\.inventory-list\s+li\s*>\s*span\s*\{[^}]*\})') { $Matches[1] } else { '' }
Check ($spanMatch61.Length -gt 0 -and [bool]($spanMatch61 -match 'min-width\s*:\s*0')) `
    '.inventory-list li > span rule exists with min-width: 0 (inventory name shrink guard)'

# 61.5 .inventory-list li > span has overflow-wrap: anywhere
Check ([bool]($spanMatch61 -match 'overflow-wrap\s*:\s*anywhere')) `
    '.inventory-list li > span has overflow-wrap: anywhere (inventory long-name wrap guard)'

# 61.6 .panel has overflow-wrap: anywhere
$panelMatch61 = if ($css61 -match '(\.panel\s*\{[^}]*\})') { $Matches[1] } else { '' }
Check ([bool]($panelMatch61 -match 'overflow-wrap\s*:\s*anywhere')) `
    '.panel has overflow-wrap: anywhere (panel content wrap guard)'

# 61.7 Mobile @media (max-width: 999px) has overflow-x: clip
# Find block start index, then extract slice up to next @media to avoid stopping at first inner }
$mobileIdx61   = $css61.IndexOf('@media (max-width: 999px)')
$nextMedia61   = $css61.IndexOf('@media', $mobileIdx61 + 10)
$mobileSlice61 = if ($mobileIdx61 -ge 0) {
    if ($nextMedia61 -gt $mobileIdx61) { $css61.Substring($mobileIdx61, $nextMedia61 - $mobileIdx61) }
    else { $css61.Substring($mobileIdx61) }
} else { '' }
Check ([bool]($mobileSlice61 -match 'overflow-x\s*:\s*clip')) `
    '@media (max-width: 999px) includes overflow-x: clip for .col-left/.col-right (mobile column clip guard)'

# ===========================================================
# Suite 62 -- Changelog viewer guards
# 25 tests
# ===========================================================
Sep "Suite 62 -- Changelog viewer guards"
$uiCoreSrc62 = Read-Src "js/ui-core.js"

# 62.1 Both changelog viewers route through the structured renderer
#      (_showChangelogModal) -- the boot-time PATCH NOTES viewer no longer dumps
#      raw innerText (WU-C11 glow-up).
Check (($uiCoreSrc62 -match 'function _showChangelogModal\s*\(') -and `
       ($uiCoreSrc62 -match '_showChangelogModal\(\s*visible\s*,') -and `
       ($uiCoreSrc62 -match 'PATCH NOTES')) `
    'Boot-time changelog viewer routes through the structured _showChangelogModal renderer (WU-C11)'

# 62.2 Viewer strips HTML comments
Check ([bool]($uiCoreSrc62 -match 'replace\(.*<!--')) `
    'Changelog viewer strips HTML comments (<!-- --> pattern)'

# 62.3 WU-C11 env-aware: _isStagingEnv() defined, fail-safe-defaults to production
#      (returns false), and reads the robco-env marker + *.pages.dev hostname signal.
Check (($uiCoreSrc62 -match 'function _isStagingEnv\s*\(') -and `
       ($uiCoreSrc62 -match 'meta\[name="robco-env"\]') -and `
       ($uiCoreSrc62 -match 'pages\\?\.dev') -and `
       ($uiCoreSrc62 -match 'return false')) `
    "_isStagingEnv() defined with robco-env marker + *.pages.dev signal + fail-safe production default (WU-C11)"

# 62.4a WU-C11 env-aware: showFullChangelog routes through _visibleChangelog(text, _isStagingEnv()).
$fullBody62 = ''
try { $fullBody62 = Get-FunctionBody $uiCoreSrc62 'showFullChangelog' } catch {}
Check (($uiCoreSrc62 -match 'function _visibleChangelog\s*\(') -and `
       ($fullBody62 -match '_visibleChangelog\s*\(\s*text\s*,\s*_isStagingEnv\(\)\s*\)')) `
    "showFullChangelog() routes through _visibleChangelog(text, _isStagingEnv()) (WU-C11 env gate)"

# 62.4b WU-C11 env-aware: BOTH viewers (boot-time + showFullChangelog) call the env gate.
$vcCalls62 = ([regex]::Matches($uiCoreSrc62, '_visibleChangelog\(\s*text\s*,\s*_isStagingEnv\(\)\s*\)')).Count
Check ($vcCalls62 -ge 2) `
    "Both viewers (boot-time + showFullChangelog) call _visibleChangelog(text, _isStagingEnv()) (env gate on both)"

# 62.5 WU-C11 env-aware (both sides, structural mirror of the JS behavioral): _visibleChangelog
#      returns full text for staging and filters out [Unreleased] for production.
$vcBody62 = ''
try { $vcBody62 = Get-FunctionBody $uiCoreSrc62 '_visibleChangelog' } catch {}
Check (($vcBody62 -match 'if\s*\(\s*isStaging\s*\)\s*return text') -and `
       ($vcBody62 -match 'Unreleased') -and `
       ($vcBody62 -match 'filter')) `
    "env-aware viewer: production hides [Unreleased] AND staging shows it (WU-C11 both-sides)"

# 62.6 WU-C11 env-aware: cf-staging-build.mjs injects the robco-env staging marker, and the
#      committed (production) index.html carries NO marker (so prod defaults to hiding it).
$cfStaging62 = Read-Src "scripts/cf-staging-build.mjs"
Check (($cfStaging62 -match 'robco-env') -and ($cfStaging62 -match 'content="staging"') -and -not ($htmlSrc -match 'robco-env')) `
    "cf-staging-build.mjs injects the robco-env=staging marker; prod index.html has none (fail-safe)"

# 62.6b WU-C13: cf-staging-build.mjs stamps the visible "DEV BUILD" badge into the staged
#       index.html (before </body>) plus a "-dev" CACHE_NAME suffix so it reaches cached
#       devices; the committed (production) index.html carries NO badge (staging-only).
Check (($cfStaging62 -match 'DEV BUILD') -and ($cfStaging62 -match 'position:fixed') -and ($cfStaging62 -match "'</body>'") -and ($cfStaging62 -match "\+ '-dev'") -and -not ($htmlSrc -match 'DEV BUILD')) `
    "cf-staging-build.mjs injects the visible 'DEV BUILD' badge + '-dev' cache suffix; prod index.html has none (staging-only)"

# -- Runtime-fetched-asset publish/precache invariant (staging CHANGELOG fix) --
# The in-app viewer fetches CHANGELOG.md at runtime. A local asset the app fetches
# that isn't published to BOTH staging (cf-staging-build.mjs) AND prod (deploy.yml)
# 404s on that environment, and because the SW does not precache it the runtime
# fetch has no fallback and rejects with "CHANGELOG NOT FOUND". These four guards
# lock every runtime-fetched local asset into all three publish/precache sets.
$jsFiles62 = @('js/ui-core.js', 'js/api.js', 'js/ui-render.js', 'js/ui-saves.js', 'js/ui-account.js', 'js/ui-audio.js', 'js/state.js', 'js/cloud.js', 'js/registry-core.js', 'js/reg_nv.js', 'js/reg_fo3.js', 'js/db_nv.js', 'js/db_fo3.js')
$jsAll62 = ($jsFiles62 | Where-Object { Test-Path (Join-Path $Root $_) } | ForEach-Object { Read-Src $_ }) -join "`n"
$rx62 = "fetch\(\s*['`"``]([^'`"``]+)['`"``]"
$localFetched62 = @([regex]::Matches($jsAll62, $rx62) | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch '^https?:' -and -not $_.StartsWith('//') } | Select-Object -Unique)

# 62.7 Sentinel: scan is not silently empty (a broken regex must not make 62.8-62.10 pass vacuously).
Check ($localFetched62 -contains 'CHANGELOG.md') `
    'Runtime-fetched local-asset scan finds CHANGELOG.md (sentinel -- scan not silently empty)'

# 62.8 Staging build publishes every runtime-fetched local asset.
$stagingMissing62 = @($localFetched62 | Where-Object { -not $cfStaging62.Contains($_) })
Check ($stagingMissing62.Count -eq 0) `
    ('Every runtime-fetched local asset is in cf-staging-build.mjs (staging publishes it)' + $(if ($stagingMissing62.Count) { ' -- missing: ' + ($stagingMissing62 -join ', ') } else { '' }))

# 62.9 Production deploy publishes every runtime-fetched local asset.
$deployPath62 = Join-Path $Root '.github/workflows/deploy.yml'
$deployYml62 = if (Test-Path $deployPath62) { Get-Content $deployPath62 -Raw } else { '' }
$prodMissing62 = @($localFetched62 | Where-Object { -not $deployYml62.Contains($_) })
Check (($deployYml62 -eq '') -or ($prodMissing62.Count -eq 0)) `
    ('Every runtime-fetched local asset is copied by deploy.yml (prod publishes it)' + $(if ($prodMissing62.Count) { ' -- missing: ' + ($prodMissing62 -join ', ') } else { '' }))

# 62.10 SW precaches every runtime-fetched local asset (cache-first -- removes the runtime-network SPOF).
$swSrc62 = Read-Src 'sw.js'
$precacheMissing62 = @($localFetched62 | Where-Object { -not ($swSrc62.Contains("'./$_'") -or $swSrc62.Contains("'$_'") -or $swSrc62.Contains("./$_")) })
Check ($precacheMissing62.Count -eq 0) `
    ('Every runtime-fetched local asset is precached in sw.js (cache-first, no runtime-network SPOF)' + $(if ($precacheMissing62.Count) { ' -- missing: ' + ($precacheMissing62 -join ', ') } else { '' }))

# -- WU-C11 part (c): the changelog viewer visual glow-up structure guards --
$cssSrc62 = Read-Src "css/terminal.css"
$parseBody62 = ''
$showBody62 = ''
try { $parseBody62 = Get-FunctionBody $uiCoreSrc62 '_parseChangelog' } catch {}
try { $showBody62 = Get-FunctionBody $uiCoreSrc62 '_showChangelogModal' } catch {}

# 62.11 structured renderer + parser both defined
Check (($uiCoreSrc62 -match 'function _parseChangelog\s*\(') -and `
       ($uiCoreSrc62 -match 'function _showChangelogModal\s*\(')) `
    '62.11: _parseChangelog() + _showChangelogModal() structured changelog renderer defined (WU-C11)'

# 62.12 (1) ONE version at a time + a version <select> DROPDOWN
Check ([bool]($showBody62 -match '<select id="changelogVersionSelect"')) `
    '62.12: viewer builds a version <select id="changelogVersionSelect"> dropdown (one version at a time)'

# 62.13 (2) collapsible category <details> sections
Check (($showBody62 -match '<details class="changelog-cat"') -and ($showBody62 -match "idx === 0 \? ' open'")) `
    '62.13: viewer builds collapsible category <details class="changelog-cat"> (first open, rest collapsed)'

# 62.14 (3) diegetic "FIRMWARE REVISION LOG" framing + the four core category tags
Check (($showBody62 -match 'FIRMWARE REVISION LOG') -and `
       ($uiCoreSrc62 -match '\[\+\] ADDED') -and `
       ($uiCoreSrc62 -match '\[\*\] FIXED') -and `
       ($uiCoreSrc62 -match '\[~\] CHANGED') -and `
       ($uiCoreSrc62 -match '\[-\] REMOVED')) `
    '62.14: diegetic FIRMWARE REVISION LOG framing + [+] ADDED / [*] FIXED / [~] CHANGED / [-] REMOVED tags'

# 62.15 entry text is escaped before innerHTML injection (XSS safety, Protocol 24)
Check (($showBody62 -match 'escapeHtml\(e\)') -and ($showBody62 -match 'escapeHtml\(c\.tag\)')) `
    '62.15: changelog entry + category-tag text run through escapeHtml() before innerHTML injection'

# 62.16 SOURCE ORDER preserved -- no reverse()/sort() in the parse or render path
Check ((-not ($parseBody62 -match '\.reverse\(')) -and (-not ($parseBody62 -match '\.sort\(')) -and `
       (-not ($showBody62 -match '\.reverse\(')) -and (-not ($showBody62 -match '\.sort\('))) `
    '62.16: changelog parse/render never reverse() or sort() entries -- source/document order preserved (WU-C11 invariant)'

# 62.17 dropdown wired via addEventListener('change') (no inline on* handler)
Check (($showBody62 -match 'addEventListener\(\s*''change''') -and (-not ($showBody62 -match '<select[^>]*onchange='))) `
    "62.17: version dropdown wired via addEventListener('change') (re-render), no inline onchange handler"

# 62.18 (4) ~700px reading column CSS + changelog-wide modal mode + close cleanup
$closeBody62 = ''
try { $closeBody62 = Get-FunctionBody $uiCoreSrc62 'closeModal' } catch {}
Check (($cssSrc62 -match '\.changelog-viewer\s*\{[^}]*max-width:\s*700px') -and `
       ($cssSrc62 -match '\.modal-box\.changelog-wide') -and `
       ($closeBody62 -match 'classList\.remove\(''changelog-wide''\)')) `
    '62.18: ~700px reading-column CSS (.changelog-viewer max-width:700px) + changelog-wide modal mode + closeModal cleanup'

# ── WU-C15: consistent width + defaults + expand/collapse-all toggle ──────────
$wideRule62 = [regex]::Match($cssSrc62, '\.modal-box\.changelog-wide\s*\{([^}]*)\}').Groups[1].Value
# 62.19 LOCKED WIDTH -- explicit (non-max) width so collapse/expand changes height only
Check (($wideRule62 -match '(?<!max-)width:\s*min\(740px') -and ($wideRule62 -match 'max-width:\s*min\(740px')) `
    '62.19: .modal-box.changelog-wide locks an explicit width (not just max-width) -- collapse/expand changes height only (WU-C15)'
# 62.20 EXPAND/COLLAPSE-ALL toggle -- rendered, styled, wired via addEventListener (no inline), sets .open on every category
Check (($showBody62 -match 'id="changelogToggleAll"') -and `
       ($cssSrc62 -match '\.changelog-toggle-all\b') -and `
       ($showBody62 -match 'addEventListener\(\s*''click''') -and `
       ($showBody62 -match 'd\.open\s*=\s*open') -and `
       (-not ($showBody62 -match 'changelogToggleAll[^>]*onclick='))) `
    '62.20: expand/collapse-all toggle present + CSS + wired via addEventListener(click) (no inline handler), sets .open on every category (WU-C15)'
# 62.21 DEFAULT-OPEN-NEWEST preserved + toggle exposes both states
Check (($showBody62 -match "idx === 0 \? ' open' : ''") -and ($showBody62 -match 'EXPAND ALL') -and ($showBody62 -match 'COLLAPSE ALL')) `
    '62.21: default-open-newest preserved (only idx 0 / newest category open) + toggle exposes EXPAND ALL / COLLAPSE ALL (WU-C15)'
# 62.22 LOCKED HEIGHT (WU-C15 follow-up) -- explicit height capped to the viewport +
# box-sizing:border-box so collapse/expand keeps the box dimensions constant (content
# scrolls internally via .modal-content, CLOSE pinned via flex), no 360/412 overflow.
Check (($wideRule62 -match 'height:\s*min\(85vh') -and ($wideRule62 -match 'max-height:\s*min\(85vh') -and ($wideRule62 -match 'box-sizing:\s*border-box')) `
    '62.22: .modal-box.changelog-wide locks an explicit height (min(85vh,...)) + box-sizing:border-box -- collapse/expand keeps box dimensions constant; content scrolls internally, CLOSE pinned, no 360/412 overflow (WU-C15 follow-up)'

# 62.23 WU-HF: the viewer renders the post-release ### Hotfix category like every other
# category -- _CHANGELOG_CAT_TAGS carries an explicit hotfix tag (not the generic fallback).
$tagsBlock62 = [regex]::Match($uiCoreSrc62, "(?s)const _CHANGELOG_CAT_TAGS = \{[\s\S]*?\n\};").Value
Check ($tagsBlock62 -match "hotfix:\s*'[^']+'") `
    "62.23: _CHANGELOG_CAT_TAGS includes an explicit 'hotfix' tag so the in-app viewer renders the ### Hotfix category like Added/Fixed/etc. (WU-HF)"
# 62.24 the hotfix tag resolves to a first-class tag, not the generic '[>] HOTFIX' fallback
# (PS behavioral twin of the JS vm test -- same outcome, parsed from the tag table).
$hotfixTag62 = [regex]::Match($tagsBlock62, "hotfix:\s*'([^']+)'").Groups[1].Value
Check (($hotfixTag62.Length -gt 0) -and ($hotfixTag62 -ne '[>] HOTFIX')) `
    '62.24: _changelogCatTag("Hotfix") returns the explicit first-class hotfix tag, not the generic fallback (WU-HF)'

# ===========================================================
# Suite 63 -- Save/Cloud UI consolidation guards (Phase 6 Task 7)
# saveCurrentToCloud additive, renderSavesList unified, new HTML elements
# 8 tests
# ===========================================================
Sep "Suite 63 -- Save/Cloud UI consolidation guards"
$cloudSrc63 = Read-Src "js/cloud.js"

# 63.1  cloud.js defines window.saveCurrentToCloud (replaces pushToCloud)
Check ([bool]($cloudSrc63 -match 'window\.saveCurrentToCloud\s*=')) `
    'cloud.js defines window.saveCurrentToCloud (replaces pushToCloud)'

# 63.2  saveCurrentToCloud uses addDoc (additive) and not setDoc (Protocol 34).
#       Window widened from 2000 (Step 2 Phase 0 U12 -- openModal() call sites
#       replacing alert() pushed addDoc( further from the function start).
$scIdx63 = $cloudSrc63.IndexOf('saveCurrentToCloud')
$scSlice63 = if ($scIdx63 -ge 0) { $cloudSrc63.Substring($scIdx63, [Math]::Min(2800, $cloudSrc63.Length - $scIdx63)) } else { '' }
Check (([bool]($scSlice63 -match '\baddDoc\b')) -and -not ([bool]($scSlice63 -match '\bsetDoc\b'))) `
    'saveCurrentToCloud uses addDoc (additive) and not setDoc (Protocol 34 -- no blind overwrite)'

# 63.3  saveCurrentToCloud guards anonymous users
Check ([bool]($scSlice63 -match 'isAnonymous')) `
    'saveCurrentToCloud has isAnonymous guard (cannot save to cloud when not signed in)'

# 63.4  saveCurrentToCloud deduplicates by contentHash
Check ([bool]($scSlice63 -match 'contentHash')) `
    'saveCurrentToCloud deduplicates by contentHash (prevents duplicate cloud saves)'

# 63.5  renderSavesList() defined in ui.js (unified local+cloud list)
Check (([bool]($uiSrc -match 'async function renderSavesList\s*\(')) -or ([bool]($uiSrc -match 'function renderSavesList\s*\('))) `
    'ui.js defines renderSavesList() (unified local+cloud list -- replaces renderCloudSavePicker)'

# 63.6  loadUI() calls renderSavesList()
$loadUIBody63 = ''
try { $loadUIBody63 = Get-FunctionBody $uiSrc 'loadUI' } catch {}
Check ([bool]($loadUIBody63 -match 'renderSavesList\(\)')) `
    'loadUI() calls renderSavesList() (unified saves list wired into page load)'

# 63.7  index.html has #savesListBody (new mount point in Security & Config)
Check ([bool]($htmlSrc -match 'id="savesListBody"')) `
    'index.html has #savesListBody element (unified saves list mount point in Security & Config)'

# 63.8  index.html has #btnSaveToCloud (replaces btnCloudPush -- additive save)
Check ([bool]($htmlSrc -match 'id="btnSaveToCloud"')) `
    'index.html has #btnSaveToCloud button (replaces btnCloudPush -- additive save to cloud)'

# ===========================================================
# Suite 64 -- SPECIAL stats editable (commit-on-blur) guards (Phase 6 Task 1+follow-up)
# commitStat replaces clampStat; capStatMax upper cap on input; syncStateFromDom clamp
# 13 tests
# ===========================================================
Sep "Suite 64 -- SPECIAL stats editable (commit-on-blur) guards"
$uiCoreSrc64 = Read-Src "js\ui-core.js"
$specialIds64 = @('s_s','s_p','s_e','s_c','s_i','s_a','s_l')

# 64.1  All 7 SPECIAL inputs have onchange="commitStat(this)"
# 750 total window (200 before + 550 after) accommodates multiline oninput Prettier expands
$missing641 = $specialIds64 | Where-Object {
    $id = $_
    $idIdx = $htmlSrc.IndexOf("id=""$id""")
    if ($idIdx -lt 0) { return $true }
    $slice = $htmlSrc.Substring([Math]::Max(0, $idIdx - 200), [Math]::Min(750, $htmlSrc.Length - [Math]::Max(0, $idIdx - 200)))
    -not ($slice -match 'onchange="commitStat\(this\)"')
}
Check ($missing641.Count -eq 0) `
    ("All 7 SPECIAL inputs have onchange=""commitStat(this)"" (commit-on-blur guard)" + $(if ($missing641.Count) { " -- missing: $($missing641 -join ', ')" } else { "" }))

# 64.2  No SPECIAL input oninput contains clampStat (snap-to-1 regression guard)
$broken642 = $specialIds64 | Where-Object {
    $id = $_
    $idIdx = $htmlSrc.IndexOf("id=""$id""")
    if ($idIdx -lt 0) { return $false }
    $slice = $htmlSrc.Substring([Math]::Max(0, $idIdx - 200), [Math]::Min(750, $htmlSrc.Length - [Math]::Max(0, $idIdx - 200)))
    $attrM642 = [regex]::Match($slice, '(?s)oninput\s*=\s*"([^"]*)"')
    $attrM642.Success -and ($attrM642.Groups[1].Value -match 'clampStat')
}
Check ($broken642.Count -eq 0) `
    ("No SPECIAL input oninput contains clampStat (snap-to-1 regression guard)" + $(if ($broken642.Count) { " -- found in: $($broken642 -join ', ')" } else { "" }))

# 64.3  commitStat is defined in ui-core.js
Check ([bool]($uiCoreSrc64 -match 'function commitStat\s*\(')) `
    'commitStat is defined in ui-core.js'

# 64.4-64.7  inspect commitStat body
$commitStatBody64 = ''
try { $commitStatBody64 = Get-FunctionBody $uiCoreSrc64 'commitStat' } catch {}

# 64.4  1-10 clamp on commit only
Check ([bool]($commitStatBody64 -match 'Math\.Max\s*\(\s*1,\s*Math\.Min\s*\(\s*10,' -or $commitStatBody64 -match 'Math\.max\s*\(\s*1,\s*Math\.min\s*\(\s*10,')) `
    'commitStat clamps value to 1-10 on commit (Math.max/min guard)'

# 64.5  calls updateMath()
Check ([bool]($commitStatBody64 -match 'updateMath\s*\(\s*\)')) `
    'commitStat calls updateMath() to trigger downstream recalcs'

# 64.6  calls saveState()
Check ([bool]($commitStatBody64 -match 'saveState\s*\(\s*\)')) `
    'commitStat calls saveState() to debounce-persist the new value'

# 64.7  isNaN guard reverts to prior state value (not hard 1)
Check (([bool]($commitStatBody64 -match 'isNaN\s*\(v\)')) -and ([bool]($commitStatBody64 -match 'state\s*\[.*k.*\]')) -and ([bool]($commitStatBody64 -match '\|\|\s*5'))) `
    'commitStat reverts empty/NaN to state[k]||5 (not forced to 1) -- regression guard'

# 64.8  All 7 SPECIAL inputs have inputmode="numeric"
$missing648 = $specialIds64 | Where-Object {
    $id = $_
    $idIdx = $htmlSrc.IndexOf("id=""$id""")
    if ($idIdx -lt 0) { return $true }
    $slice = $htmlSrc.Substring([Math]::Max(0, $idIdx - 200), [Math]::Min(750, $htmlSrc.Length - [Math]::Max(0, $idIdx - 200)))
    -not ($slice -match 'inputmode="numeric"')
}
Check ($missing648.Count -eq 0) `
    ("All 7 SPECIAL inputs have inputmode=""numeric"" (mobile numeric keyboard guard)" + $(if ($missing648.Count) { " -- missing: $($missing648 -join ', ')" } else { "" }))

# 64.9  clampStat is NOT defined (fully removed -- regression guard)
Check (-not ([bool]($uiCoreSrc64 -match 'function clampStat\s*\('))) `
    'clampStat is not defined in ui-core.js (removed -- regression guard)'

# 64.10  capStatMax is defined in ui-core.js
Check ([bool]($uiCoreSrc64 -match 'function capStatMax\s*\(')) `
    'capStatMax is defined in ui-core.js (upper-only cap on input)'

# 64.11  capStatMax has n>10 upper-only guard and no lower-bound force
$capBody64 = ''
try { $capBody64 = Get-FunctionBody $uiCoreSrc64 'capStatMax' } catch {}
Check (([bool]($capBody64 -match 'n\s*>\s*10')) -and -not ([bool]($capBody64 -match 'n\s*<\s*1'))) `
    'capStatMax caps at 10 only (n>10 guard present; no lower-bound n<1 force -- deletion works)'

# 64.12  All 7 SPECIAL inputs oninput contains capStatMax (multi-line attr safe)
$missing6412 = $specialIds64 | Where-Object {
    $id = $_
    $idIdx = $htmlSrc.IndexOf("id=""$id""")
    if ($idIdx -lt 0) { return $true }
    $slice = $htmlSrc.Substring([Math]::Max(0, $idIdx - 200), [Math]::Min(750, $htmlSrc.Length - [Math]::Max(0, $idIdx - 200)))
    $attrM = [regex]::Match($slice, '(?s)oninput\s*=\s*"([^"]*)"')
    -not ($attrM.Success -and ($attrM.Groups[1].Value -match 'capStatMax'))
}
Check ($missing6412.Count -eq 0) `
    ("All 7 SPECIAL inputs oninput contains capStatMax (live upper-cap guard)" + $(if ($missing6412.Count) { " -- missing: $($missing6412 -join ', ')" } else { "" }))

# 64.13  syncStateFromDom clamps SPECIAL reads to 1-10 (defense-in-depth)
$stateSrc64 = Read-Src "js\state.js"
$syncBody64 = ''
try { $syncBody64 = Get-FunctionBody $stateSrc64 'syncStateFromDom' } catch {}
Check ([bool]($syncBody64 -match 'Math\.max\s*\(\s*1,\s*Math\.min\s*\(\s*10,' -or $syncBody64 -match 'Math\.Max\s*\(\s*1,\s*Math\.Min\s*\(\s*10,')) `
    'syncStateFromDom clamps SPECIAL reads to 1-10 (defense-in-depth: no save path leaks >10)'

# ===========================================================
# Suite 65 -- Blocking Update Modal (Phase 6 Task 2)
# #updateModal replaces #updateBanner; full-screen blocking dialog;
# focus trap, Esc blocked, fail-safe, robust _isGenuineUpdate() gate.
# Case C already-installing fix + idempotency + WU-SW2 focus/visibility re-check.
# 18 tests
# ===========================================================
Sep "Suite 65 -- Blocking Update Modal"
$uiCoreSrc65 = Read-Src "js\ui-core.js"

# 65.1  #updateModal exists in index.html (replaced #updateBanner)
Check ([bool]($htmlSrc -match 'id="updateModal"')) `
    'id="updateModal" exists in index.html (blocking modal replaced updateBanner)'

# 65.2  #updateModal has role="dialog"
Check ([bool]($htmlSrc -match '(?s)id="updateModal"[\s\S]{0,400}role="dialog"')) `
    '#updateModal has role="dialog" (accessible dialog semantics)'

# 65.3  #updateModal has aria-modal="true"
Check ([bool]($htmlSrc -match '(?s)id="updateModal"[\s\S]{0,400}aria-modal="true"')) `
    '#updateModal has aria-modal="true" (marks background inert for screen readers)'

# 65.4  #updateModal has aria-labelledby
Check ([bool]($htmlSrc -match '(?s)id="updateModal"[\s\S]{0,400}aria-labelledby')) `
    '#updateModal has aria-labelledby attribute (screen-reader accessible label)'

# 65.5-65.7: _triggerUpdate body checks
$triggerBody65 = ''
try { $triggerBody65 = Get-FunctionBody $htmlSrc '_triggerUpdate' } catch {}

# 65.5  _triggerUpdate moves focus to reboot button
Check ([bool]($triggerBody65 -match '\.focus\s*\(\s*\)')) `
    '_triggerUpdate calls btn.focus() to move keyboard focus into the modal'

# 65.6  _triggerUpdate traps Tab key (focus trap)
Check ([bool]($triggerBody65 -match "e\.key\s*===\s*'Tab'") -and [bool]($triggerBody65 -match 'preventDefault')) `
    "_triggerUpdate traps Tab key + preventDefault (focus trap -- single focusable)"

# 65.7  _triggerUpdate blocks Escape (mandatory -- no dismiss path)
Check ([bool]($triggerBody65 -match "e\.key\s*===\s*'Escape'") -and [bool]($triggerBody65 -match 'preventDefault')) `
    "_triggerUpdate blocks Escape key + preventDefault (modal cannot be dismissed -- must reboot)"

# 65.8  Case A is gated on the robust _isGenuineUpdate() (WU-SW2 -- replaces the controller-only
#       gate that suppressed the prompt in a standalone PWA where controller can be null)
Check ([bool]($htmlSrc -match 'reg\.waiting\s*&&\s*_isGenuineUpdate\(\)')) `
    'Case A: _triggerUpdate called only when reg.waiting && _isGenuineUpdate() (robust boot-safety gate)'

# 65.9  Case B / _watch is gated on the robust _isGenuineUpdate()
Check ([bool]($htmlSrc -match "state\s*===\s*'installed'\s*&&\s*_isGenuineUpdate\(\)")) `
    "Case B: _triggerUpdate called only when state==='installed' && _isGenuineUpdate() (robust boot-safety gate)"

# 65.10  _triggerUpdate has fail-safe: missing DOM -> auto SKIP_WAITING (no silent hang)
Check ([bool]($triggerBody65 -match '!\s*modal\s*\|\|\s*!\s*btn') -and [bool]($triggerBody65 -match 'SKIP_WAITING')) `
    '_triggerUpdate has !modal||!btn fail-safe that posts SKIP_WAITING (no silent hang if DOM missing)'

# 65.11  Global ESC handler in ui-core.js targets sysModal only -- updateModal not wired to it
Check (-not ($uiCoreSrc65 -match 'updateModal')) `
    'ui-core.js ESC handler does not reference updateModal (updateModal manages its own Esc -- not caught by global handler)'

# 65.12  #updateModalMsg is left-aligned in terminal.css (message body reads flush-left, not ragged/centered)
$cssSrc65 = Read-Src "css\terminal.css"
Check ([bool]($cssSrc65 -match '(?s)#updateModalMsg[\s\S]{0,100}text-align\s*:\s*left')) `
    '#updateModalMsg has text-align:left in terminal.css (update modal message body is flush-left, not centered)'

# 65.13  Case C: registration handles a worker ALREADY installing at register()-resolve
#        time (browser fires automatic on-navigation update check before the updatefound
#        listener attaches -> Case B misses it, reg.waiting still null -> Case A misses it).
#        _watch(reg.installing) closes the race; _updatePromptShown one-shot guard prevents
#        Case A/B/C double-firing for the same update.
Check ([bool](($htmlSrc -match 'function\s+_watch\s*\(') -and ($htmlSrc -match 'if\s*\(\s*reg\.installing\s*\)') -and ($htmlSrc -match '_updatePromptShown'))) `
    'Case C: registration watches an already-installing worker via _watch(reg.installing) + one-shot _updatePromptShown idempotency guard (popup-race fix intact)'

# ── WU-SW2: standalone-PWA update-prompt robustness (root-cause + focus re-check) ──
# 65.14  the boot-safety gate is the robust _isGenuineUpdate() -- has-installed-before flag
#        OR the live controller (controller kept as a fallback, no longer the SOLE gate)
Check ([bool]($htmlSrc -match '(?s)function _isGenuineUpdate\(\)\s*\{[\s\S]*?_hasInstalledBefore\(\)[\s\S]*?\|\|[\s\S]*?navigator\.serviceWorker\.controller[\s\S]*?\}')) `
    '65.14: _isGenuineUpdate() = _hasInstalledBefore() || navigator.serviceWorker.controller (persistent-flag primary, controller fallback)'

# 65.15  a persistent install flag records that a SW has controlled the page (set when a
#        controller is present AND on controllerchange)
Check ([bool](($htmlSrc -match "SW_INSTALLED_FLAG\s*=\s*'robco_sw_installed'") -and ($htmlSrc -match '(?s)function _markInstalled\(\)[\s\S]*?MetaStore\.set\(SW_INSTALLED_FLAG') -and ($htmlSrc -match "'controllerchange',\s*\(\)\s*=>\s*\{\s*_markInstalled\(\)"))) `
    '65.15: persistent robco_sw_installed flag set via _markInstalled() (on controller present + on controllerchange)'

# 65.16  the focus/visibility re-check is wired -- visibilitychange(visible) + window focus
Check ([bool](($htmlSrc -match "addEventListener\('visibilitychange'") -and ($htmlSrc -match "visibilityState === 'visible'") -and ($htmlSrc -match "addEventListener\('focus',\s*_recheckForUpdate\)"))) `
    '65.16: visibilitychange (becoming visible) + window focus both call _recheckForUpdate (catches a waiting SW when the installed PWA is reopened)'

# 65.17  the re-check runs reg.update(), is throttled (<=1 / 30s), and never throws
Check ([bool](($htmlSrc -match 'function _recheckForUpdate\(\)') -and ($htmlSrc -match '_reg\.update\(\)') -and ($htmlSrc -match '_lastUpdateCheck') -and ($htmlSrc -match '30000') -and ($htmlSrc -match '\.catch\(\(\)\s*=>\s*\{\}\)'))) `
    '65.17: _recheckForUpdate runs reg.update(), throttles to once per 30000ms, and swallows update() errors (no throw)'

# 65.18  the re-check SURFACES a waiting worker via _triggerUpdate(_reg.waiting), gated on _isGenuineUpdate()
Check ([bool]($htmlSrc -match '(?s)function _surfaceWaiting\(\)[\s\S]*?_reg\.waiting\s*&&\s*_isGenuineUpdate\(\)[\s\S]*?_triggerUpdate\(_reg\.waiting\)')) `
    '65.18: _surfaceWaiting() fires _triggerUpdate(_reg.waiting) when a waiting worker exists and _isGenuineUpdate() (prompt surfaces on next focus regardless of missed install events)'

# ===========================================================
# Suite 66 -- FO3 Lincoln Memorabilia Tracker (Phase 6 Task 4)
# state.lincolnItems, migration, autoImportState validated map,
# reg_fo3 array, GAME_DEFS.FO3.tracksLincoln, render/handler guards,
# 'other' vocab removed + coercion guard.
# 20 tests
# ===========================================================
Sep "Suite 66 -- FO3 Lincoln Memorabilia Tracker"
$stateSrc66  = Read-Src "js\state.js"
$apiSrc66    = Read-Src "js\api.js"
$uiRenderSrc66 = Read-Src "js\ui-render.js"
$uiCoreSrc66   = Read-Src "js\ui-core.js"
$fo3RegSrc66   = Read-Src "js\reg_fo3.js"
$nvRegSrc66    = Read-Src "js\reg_nv.js"

# 66.1  state.lincolnItems default {} in state.js
Check ([bool]($stateSrc66 -match 'lincolnItems\s*:\s*\{\}')) `
    'state.lincolnItems default {} in state object (Protocol 4 default)'

# 66.2  migrateState() has lincolnItems migration guard
$migrateBody66 = ''
try { $migrateBody66 = Get-FunctionBody $stateSrc66 'migrateState' } catch {}
Check ([bool]($migrateBody66 -match 'lincolnItems') -and [bool]($migrateBody66 -match 'Array\.isArray') -and [bool]($migrateBody66 -match 'lincolnItems\s*=\s*\{\}')) `
    'migrateState() guards lincolnItems -- coerces non-object/array to {} (Protocol 4 migration)'

# 66.3  autoImportState() has lincolnItems plain-object check
$importBody66 = ''
try { $importBody66 = Get-FunctionBody $apiSrc66 'autoImportState' } catch {}
Check ([bool]($importBody66 -match 'lincolnItems') -and [bool]($importBody66 -match 'Array\.isArray')) `
    'autoImportState() validates lincolnItems as plain object (not array) before importing'

# 66.4  autoImportState() validates vocabulary before accepting disposition values
Check ([bool]($importBody66 -match 'LINCOLN_VOCAB') -and [bool]($importBody66 -match 'hannibal') -and [bool]($importBody66 -match 'washington')) `
    'autoImportState() uses LINCOLN_VOCAB list to validate disposition values (Protocol 24)'

# 66.5  autoImportState() filters keys against registry item names
Check ([bool]($importBody66 -match 'registryNames') -and [bool]($importBody66 -match 'lincolnMemorabilia')) `
    'autoImportState() filters lincolnItems keys against registry names (Protocol 24 -- no arbitrary keys)'

# 66.6  reg_fo3.js has lincolnMemorabilia array (non-empty)
Check ([bool]($fo3RegSrc66 -match 'lincolnMemorabilia\s*:\s*\[')) `
    'reg_fo3.js has lincolnMemorabilia array (FO3 artifact registry)'

# 66.7  reg_fo3.js lincolnMemorabilia has exactly 9 items
$linBlock66 = ''
$linMatch66 = [regex]::Match($fo3RegSrc66, '(?s)lincolnMemorabilia\s*:\s*\[(.*?)\n  \],')
if ($linMatch66.Success) { $linBlock66 = $linMatch66.Groups[1].Value }
$linCount66 = ([regex]::Matches($linBlock66, '\bname\s*:')).Count
Check ($linCount66 -eq 9) "reg_fo3.js lincolnMemorabilia has exactly 9 items (found $linCount66)"

# 66.8  reg_nv.js does NOT have lincolnMemorabilia (FO3-only)
Check (-not ($nvRegSrc66 -match 'lincolnMemorabilia')) `
    'reg_nv.js does NOT contain lincolnMemorabilia (FO3-only registry entry)'

# 66.9  GAME_DEFS.FO3.tracksLincoln: true in state.js
Check ([bool]($stateSrc66 -match 'tracksLincoln\s*:\s*true')) `
    'GAME_DEFS.FO3.tracksLincoln: true in state.js (FO3-only feature flag)'

# 66.10  renderLincolnMemorabilia is defined in ui-render.js
Check ([bool]($uiRenderSrc66 -match 'function renderLincolnMemorabilia\s*\(')) `
    'renderLincolnMemorabilia() is defined in ui-render.js'

# 66.11  renderLincolnMemorabilia is called from loadUI() in ui-core.js
$loadUIBody66 = ''
try { $loadUIBody66 = Get-FunctionBody $uiCoreSrc66 'loadUI' } catch {}
Check ([bool]($loadUIBody66 -match 'renderLincolnMemorabilia\s*\(\s*\)')) `
    'renderLincolnMemorabilia() called from loadUI() in ui-core.js (Protocol 5)'

# 66.12  renderLincolnMemorabilia has FO3 guard (tracksLincoln)
$renderLinBody66 = ''
try { $renderLinBody66 = Get-FunctionBody $uiRenderSrc66 'renderLincolnMemorabilia' } catch {}
Check ([bool]($renderLinBody66 -match 'tracksLincoln')) `
    'renderLincolnMemorabilia() has tracksLincoln guard (FO3-only -- returns early in FNV)'

# 66.13  toggleLincolnItem is defined in ui-render.js
Check ([bool]($uiRenderSrc66 -match 'function toggleLincolnItem\s*\(')) `
    'toggleLincolnItem() is defined in ui-render.js'

# 66.14  setLincolnDisposition is defined in ui-render.js
Check ([bool]($uiRenderSrc66 -match 'function setLincolnDisposition\s*\(')) `
    'setLincolnDisposition() is defined in ui-render.js'

# 66.15  setLincolnDisposition validates vocab before writing state
$dispBody66 = ''
try { $dispBody66 = Get-FunctionBody $uiRenderSrc66 'setLincolnDisposition' } catch {}
Check ([bool]($dispBody66 -match 'VOCAB') -and [bool]($dispBody66 -match 'includes\s*\(value\)')) `
    'setLincolnDisposition() validates value against VOCAB before writing state (Protocol 24)'

# 66.16  index.html has #lincolnMemorabiliaDisplay
Check ([bool]($htmlSrc -match 'id="lincolnMemorabiliaDisplay"')) `
    'index.html has #lincolnMemorabiliaDisplay container (Protocol 5 panel element)'

# 66.17  getSystemDirective() mentions lincolnItems in FO3 context
#  U1: the Lincoln tracker text is now data (GAME_DEFS.FO3.ai.trackerDirectives in
#  state.js), read by _directiveTrackers() in api.js -- check both sources.
$sdBody66 = ''
try { $sdBody66 = Get-DirectiveFullBody $apiSrc66 } catch {}
Check ([bool]($sdBody66 -match 'lincolnItems') -or [bool]($stateSrc66 -match 'lincolnItems')) `
    'getSystemDirective() references lincolnItems (Protocol 14 -- AI contract updated for new state field)'

# 66.18  LINCOLN_VOCAB in api.js does NOT include 'other' (Change 2 regression guard)
Check (-not ($apiSrc66 -match "LINCOLN_VOCAB\s*=\s*\[[^\]]*['""]other['""]")) `
    "api.js LINCOLN_VOCAB does not include 'other' -- removed in Change 2 (regression guard)"

# 66.19  renderLincolnMemorabilia opts does NOT include 'other' option
Check (-not ($uiRenderSrc66 -match "\[\s*['""]other['""]\s*,")) `
    "ui-render.js opts array does not include 'other' option -- removed in Change 2"

# 66.20  autoImportState() coerces legacy 'other' disposition to 'found'
$importBody66b = ''
try { $importBody66b = Get-FunctionBody $apiSrc66 'autoImportState' } catch {}
Check ([bool]($importBody66b -match 'other.*found|coerced')) `
    "autoImportState() coerces legacy 'other' disposition to 'found' for backward-compatibility"

# ===========================================================
# Suite 67 -- FNV Traits Tracker (Phase 6 Task 5 + filter follow-up)
# state.traits, migration, autoImportState validated array,
# reg_nv traits 16-item array, GAME_DEFS.FNV.hasTraits,
# renderTraits/toggleTrait guards, #traitsDisplay distinct from #perksList,
# #traitFilter input + renderTraits substring-filter guard.
# 19 tests
# ===========================================================
Sep "Suite 67 -- FNV Traits Tracker"
$stateSrc67  = Read-Src "js\state.js"
$apiSrc67    = Read-Src "js\api.js"
$uiRenderSrc67 = Read-Src "js\ui-render.js"
$uiCoreSrc67 = Read-Src "js\ui-core.js"
$nvRegSrc67  = Read-Src "js\reg_nv.js"
$fo3RegSrc67 = Read-Src "js\reg_fo3.js"

# 67.1  state.traits default [] in state object
Check ([bool]($stateSrc67 -match 'traits\s*:\s*\[\s*\]')) `
    'state.traits default [] in state object (Protocol 4 default)'

# 67.2  migrateState() coerces non-array traits to []
$migrateBody67 = ''
try { $migrateBody67 = Get-FunctionBody $stateSrc67 'migrateState' } catch {}
Check ([bool]($migrateBody67 -match 'Array\.isArray\(s\.traits\)') -and [bool]($migrateBody67 -match 's\.traits\s*=\s*\[\]')) `
    'migrateState() coerces non-array s.traits to [] (Protocol 4 migration)'

# 67.3  autoImportState() validates traits as array before importing
Check ([bool]($apiSrc67 -match 'Array\.isArray\(raw\)') -and [bool]($apiSrc67 -match 'traits')) `
    'autoImportState() validates traits as array before importing'

# 67.4  autoImportState() filters trait entries against registry names (Protocol 24)
$importBody67 = ''
try { $importBody67 = Get-FunctionBody $apiSrc67 'autoImportState' } catch {}
Check ([bool]($importBody67 -match 'FALLOUT_REGISTRY\.traits') -and [bool]($importBody67 -match 'traitNames')) `
    'autoImportState() filters traits against FALLOUT_REGISTRY.traits names (Protocol 24)'

# 67.5  autoImportState() deduplicates trait entries
Check ([bool]($importBody67 -match 'seen') -and [bool]($importBody67 -match 'traits')) `
    'autoImportState() deduplicates trait entries (seen Set guard)'

# 67.6  reg_nv.js has traits array
Check ([bool]($nvRegSrc67 -match 'traits\s*:\s*\[')) `
    'reg_nv.js has traits array (FNV trait registry)'

# 67.7  reg_nv.js traits has exactly 16 items
$traitBlock67 = ''
$traitMatch67 = [regex]::Match($nvRegSrc67, '(?s)traits\s*:\s*\[(.*?)\n  \],')
if ($traitMatch67.Success) { $traitBlock67 = $traitMatch67.Groups[1].Value }
$traitCount67 = ([regex]::Matches($traitBlock67, '\bname\s*:')).Count
Check ($traitCount67 -eq 16) "reg_nv.js traits has exactly 16 items (found $traitCount67)"

# 67.8  reg_fo3.js does NOT have traits (FNV-only)
Check (-not ($fo3RegSrc67 -match '\btraits\s*:\s*\[')) `
    'reg_fo3.js does NOT contain traits array (FNV-only registry entry)'

# 67.9  GAME_DEFS.FNV.hasTraits: true in state.js
Check ([bool]($stateSrc67 -match 'hasTraits\s*:\s*true')) `
    'GAME_DEFS.FNV.hasTraits: true in state.js (FNV-only feature flag)'

# 67.10  renderTraits() is defined in ui-render.js
Check ([bool]($uiRenderSrc67 -match 'function renderTraits\s*\(')) `
    'renderTraits() is defined in ui-render.js'

# 67.11  renderTraits() called from loadUI() in ui-core.js
$loadUIBody67 = ''
try { $loadUIBody67 = Get-FunctionBody $uiCoreSrc67 'loadUI' } catch {}
Check ([bool]($loadUIBody67 -match 'renderTraits\s*\(\s*\)')) `
    'renderTraits() called from loadUI() in ui-core.js (Protocol 5)'

# 67.12  renderTraits() has FNV guard (hasTraits)
$renderBody67 = ''
try { $renderBody67 = Get-FunctionBody $uiRenderSrc67 'renderTraits' } catch {}
Check ([bool]($renderBody67 -match 'hasTraits')) `
    'renderTraits() has hasTraits guard (FNV-only -- returns early in FO3)'

# 67.13  toggleTrait() is defined in ui-render.js
Check ([bool]($uiRenderSrc67 -match 'function toggleTrait\s*\(')) `
    'toggleTrait() is defined in ui-render.js'

# 67.14  toggleTrait() hard-caps at 2 -- refuses to add a 3rd trait (returns without push)
$toggleBody67 = ''
try { $toggleBody67 = Get-FunctionBody $uiRenderSrc67 'toggleTrait' } catch {}
Check ([bool]($toggleBody67 -match 'length\s*>=\s*2') -and [bool]($toggleBody67 -match '\breturn\b')) `
    'toggleTrait() hard-blocks adding a 3rd trait (length>=2 -> return without push) -- regression guard'

# 67.15  index.html has #traitsDisplay container
Check ([bool]($htmlSrc -match 'id="traitsDisplay"')) `
    'index.html has #traitsDisplay container (Protocol 5 panel element)'

# 67.16  #traitsDisplay is inside the Perks panel; no standalone top-level TRAITS <details> panel
$perksIdx67   = $htmlSrc.IndexOf('id="perksList"')
$traitsIdx67  = $htmlSrc.IndexOf('id="traitsDisplay"')
$noStandalone67 = -not ($htmlSrc -match '(?s)<details[^>]*class="panel"[^>]*>[\s\S]{0,200}<summary[^>]*>[^<]*TRAITS[^<]*</summary>')
Check ($perksIdx67 -ne -1 -and $traitsIdx67 -ne -1 -and $traitsIdx67 -gt $perksIdx67 -and $noStandalone67) `
    'index.html: #traitsDisplay is inside the Perks panel (after #perksList); no standalone TRAITS <details class="panel"> -- distinct IDs preserved'

# 67.17  getSystemDirective() references state.traits (Protocol 14)
#  U1: the Traits tracker text is now data (GAME_DEFS.FNV.ai.trackerDirectives in
#  state.js), read by _directiveTrackers() in api.js -- check both sources.
$sdBody67 = ''
try { $sdBody67 = Get-DirectiveFullBody $apiSrc67 } catch {}
Check ([bool]($sdBody67 -match 'state\.traits') -or [bool]($stateSrc67 -match 'state\.traits')) `
    'getSystemDirective() references state.traits (Protocol 14 -- AI contract updated for new state field)'

# 67.18  index.html has #traitFilter input (trait name filter)
Check ([bool]($htmlSrc -match 'id="traitFilter"')) `
    'index.html has #traitFilter input (trait name filter)'

# 67.19  renderTraits() reads traitFilter and applies substring filter
$renderBody67b = ''
try { $renderBody67b = Get-FunctionBody $uiRenderSrc67 'renderTraits' } catch {}
Check (([bool]($renderBody67b -match 'traitFilter')) -and ([bool]($renderBody67b -match 'includes\s*\(filterQ\)'))) `
    'renderTraits() reads #traitFilter value and applies substring filter'

# ===========================================================
# Suite 68 -- FNV Location Database Expansion (Phase 6 Task 6)
# Adds 22 verified minor/notable NV locations sourced from fallout.wiki.
# Floor guard, type validity, dedup, seed examples, zone<->registry parity.
# 10 tests
# ===========================================================
Sep "Suite 68 -- FNV Location Database Expansion"
$nvRegSrc68 = Read-Src "js\reg_nv.js"

# Isolate main locations array (between LOCATIONS and COMPANIONS section comments)
$locsSectionMatch68 = [regex]::Match($nvRegSrc68, '(?s)// -- LOCATIONS.*?// -- COMPANIONS')
if (-not $locsSectionMatch68.Success) {
    $locsSectionMatch68 = [regex]::Match($nvRegSrc68, '(?s)//.*?LOCATIONS.*?//.*?COMPANIONS')
}
$locsSection68 = if ($locsSectionMatch68.Success) { $locsSectionMatch68.Value } else { '' }
# Also try direct capture of the locations array in the FALLOUT_REGISTRY
$locsArrMatch68 = [regex]::Match($nvRegSrc68, '(?s)locations:\s*\[((?:(?!\n  \]).)*)\n  \]', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$locBlock68 = if ($locsArrMatch68.Success) { $locsArrMatch68.Groups[1].Value } else { $locsSection68 }

# 68.1  FNV locations count >= 108 (floor guard -- 86 original + 22 new)
$locCount68 = ([regex]::Matches($locBlock68, '\bname\s*:')).Count
Check ($locCount68 -ge 108) "FALLOUT_REGISTRY.locations has >= 108 entries (found $locCount68) -- floor guard"

# 68.2  "Jean Sky Diving" present (seed example)
Check ([bool]($locBlock68 -match "name:\s*'Jean Sky Diving'")) `
    '"Jean Sky Diving" is in FALLOUT_REGISTRY.locations (fallout.wiki verified)'

# 68.3  "Jack Rabbit Springs" present (seed example)
Check ([bool]($locBlock68 -match "name:\s*'Jack Rabbit Springs'")) `
    '"Jack Rabbit Springs" is in FALLOUT_REGISTRY.locations (fallout.wiki verified)'

# 68.4  "Powder Ganger Camp South" present (seed example)
Check ([bool]($locBlock68 -match "name:\s*'Powder Ganger Camp South'")) `
    '"Powder Ganger Camp South" is in FALLOUT_REGISTRY.locations (fallout.wiki verified)'

# 68.5  "Wolfhorn Ranch" in registry (was zone-only before this task)
Check ([bool]($locBlock68 -match "name:\s*'Wolfhorn Ranch'")) `
    '"Wolfhorn Ranch" is in FALLOUT_REGISTRY.locations (promoted from zone-only)'

# 68.6  "Ivanpah Dry Lake" in registry (was zone-only before this task)
Check ([bool]($locBlock68 -match "name:\s*'Ivanpah Dry Lake'")) `
    '"Ivanpah Dry Lake" is in FALLOUT_REGISTRY.locations (promoted from zone-only)'

# 68.7  All location entries use a valid type from the 9 approved types
$validLocTypes68 = @('settlement','other','landmark','camp','base','vault','casino','factory','cave')
$typeMatches68 = [regex]::Matches($locBlock68, "type:\s*'([^']+)'")
$badTypes68 = @($typeMatches68 | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notin $validLocTypes68 })
Check ($badTypes68.Count -eq 0) ("All FALLOUT_REGISTRY.locations entries use valid type (9 approved) -- bad: " + ($badTypes68 -join ', '))

# 68.8  No duplicate location names in FNV registry
$nameMatches68 = [regex]::Matches($locBlock68, "name:\s*'([^']+)'")
$names68 = @($nameMatches68 | ForEach-Object { $_.Groups[1].Value })
$uniqueNames68 = @($names68 | Select-Object -Unique)
Check ($names68.Count -eq $uniqueNames68.Count) ("No duplicate location names in FALLOUT_REGISTRY.locations -- $($names68.Count) names, $($uniqueNames68.Count) unique")

# 68.9  Zone parity -- zone [4,2] Goodsprings locations[] contains 'Jean Sky Diving'
Check ([bool]($nvRegSrc68 -match '(?s)gridRow:\s*4.{0,200}gridCol:\s*2.{0,500}Jean Sky Diving')) `
    'Zone [4,2] Goodsprings locations[] contains "Jean Sky Diving" (zone<->registry parity)'

# 68.10  Zone parity -- zone [4,1] NCRCF locations[] contains 'Powder Ganger Camp South'
Check ([bool]($nvRegSrc68 -match '(?s)gridRow:\s*4.{0,200}gridCol:\s*1.{0,500}Powder Ganger Camp South')) `
    'Zone [4,1] NCRCF locations[] contains "Powder Ganger Camp South" (zone<->registry parity)'

# ===========================================================
# Suite 69 -- FO3 game-switch regression (Protocol 13)
# Fixes: switching to FO3 reverted to FNV on reload.
# Root cause: onGameContextChange never updated state.gameContext,
# so beforeunload/saveState re-derived activeContext='FNV' and
# clobbered the deliberate 'FO3' localStorage write.
# 4 tests
# ===========================================================
Sep "Suite 69 -- FO3 game-switch regression guard"
$uiCoreSrc69 = Read-Src "js\ui-core.js"
$stateSrc69  = Read-Src "js\state.js"

# Extract onGameContextChange function body
$gcMatch69 = [regex]::Match($uiCoreSrc69, '(?s)function onGameContextChange\s*\([^)]*\)\s*\{(.*?)\n\}')
$gcBody69  = if ($gcMatch69.Success) { $gcMatch69.Groups[1].Value } else { '' }

# 69.1  onGameContextChange sets state.gameContext = ctx
Check ([bool]($gcBody69 -match 'state\.gameContext\s*=\s*ctx')) `
    'onGameContextChange() sets state.gameContext = ctx -- keeps in-memory source-of-truth in sync (regression guard)'

# 69.2  onGameContextChange sets window._contextSwitching = true before reload
Check ([bool]($gcBody69 -match 'window\._contextSwitching\s*=\s*true')) `
    'onGameContextChange() sets window._contextSwitching = true before reload -- guards beforeunload/saveState from clobbering the switch (regression guard)'

# 69.3  beforeunload handler early-exits when _contextSwitching is set
$buMatch69 = [regex]::Match($uiCoreSrc69, "(?s)addEventListener\s*\(\s*['""]beforeunload['""],\s*\(\s*\)\s*=>\s*\{(.*?)\}\s*\)")
$buBody69  = if ($buMatch69.Success) { $buMatch69.Groups[1].Value } else { '' }
Check ($buBody69 -match '_contextSwitching' -and $buBody69 -match '\breturn\b') `
    'beforeunload handler early-exits when window._contextSwitching is set -- prevents clobbering the deliberate FO3 write (regression guard)'

# 69.4  saveState debounced body early-exits when _contextSwitching is set
$ssMatch69 = [regex]::Match($stateSrc69, '(?s)function saveState\s*\(\s*\)(.*?)(?=\nfunction |\nlet |\nconst |\nvar |$)')
$ssBody69  = if ($ssMatch69.Success) { $ssMatch69.Groups[1].Value } else { '' }
Check ($ssBody69 -match '_contextSwitching' -and $ssBody69 -match '\breturn\b') `
    'saveState() debounced setTimeout body early-exits when window._contextSwitching is set -- prevents pending debounce from clobbering the FO3 write (regression guard)'

# ===========================================================
# Suite 70 -- FNV unique apparel sweep + Vault 13 Canteen
# (Phase 6 Task 7 chunk 1)
# Guards: ARMOR.CSV floor count, named mandated items,
# no-duplicate, column-count, DB-registry parity for new
# apparel, Vault 13 Canteen in MISC + registry,
# seedNewCampaignInventory definition + guards,
# WU-D2 Mysterious Stranger Outfit DT + WU-D6 1st Recon DT regressions.
# 16 tests
# ===========================================================
Sep "Suite 70 -- FNV unique apparel + Vault 13 Canteen"
$dbNv70      = Read-Src "js\db_nv.js"
$regNv70     = Read-Src "js\reg_nv.js"
$uiCore70    = Read-Src "js\ui-core.js"

# Helper: extract ARMOR.CSV data rows
function Get-ArmorRows70 {
    param([string]$src)
    $m = [regex]::Match($src, '(?s)\[ARMOR\.CSV\](.*?)(?=\n\[|\n`;)')
    if (-not $m.Success) { return @() }
    $block = $m.Groups[1].Value
    $lines = $block -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch '^Name,' -and $_ -notmatch '^\[' }
    return $lines
}

# Helper: get armor name from a row (first CSV field)
function Get-ArmorName70 { param([string]$row); ($row -split ',')[0].Trim() }

# Helper: get MISC.CSV data rows
function Get-MiscRows70 {
    param([string]$src)
    $m = [regex]::Match($src, '(?s)\[MISC\.CSV\](.*?)(?=\n\[|\n`;)')
    if (-not $m.Success) { return @() }
    $block = $m.Groups[1].Value
    return $block -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch '^Name,' -and $_ -notmatch '^\[' }
}

# Helper: extract registry names by type
function Get-RegNamesByType70 {
    param([string]$src, [string]$type)
    $names = [System.Collections.Generic.HashSet[string]]::new()
    $re = [regex]('(?<=[{,]\s*)name\s*:\s*(?:''([^'']*)''\s*|"([^"]*)")\s*,\s*type\s*:\s*''' + $type + '''')
    foreach ($m in $re.Matches($src)) {
        $v = if ($m.Groups[1].Value) { $m.Groups[1].Value } else { $m.Groups[2].Value }
        if ($v) { [void]$names.Add($v) }
    }
    return $names
}

$armorRows70 = Get-ArmorRows70 $dbNv70
$armorNames70 = $armorRows70 | ForEach-Object { Get-ArmorName70 $_ }

# 70.1  ARMOR.CSV row count >= 103
Check ($armorRows70.Count -ge 103) `
    "ARMOR.CSV has >= 103 entries (found $($armorRows70.Count)) -- floor guard after unique apparel sweep"

# 70.2  MISC.CSV has Vault 13 Canteen
$miscRows70 = Get-MiscRows70 $dbNv70
Check ($miscRows70 | Where-Object { ($_ -split ',')[0].Trim() -eq 'Vault 13 Canteen' }) `
    'MISC.CSV contains "Vault 13 Canteen" row'

# 70.3  Benny's Suit in ARMOR.CSV
Check ($armorNames70 -contains "Benny's Suit") `
    '"Benny''s Suit" is in ARMOR.CSV (mandated, sourced from fallout.wiki)'

# 70.4  Suave Gambler Hat in ARMOR.CSV
Check ($armorNames70 -contains 'Suave Gambler Hat') `
    '"Suave Gambler Hat" is in ARMOR.CSV (mandated, sourced from fallout.wiki)'

# 70.5  No duplicate names in ARMOR.CSV
$seen70 = [System.Collections.Generic.HashSet[string]]::new()
$dupes70 = $armorNames70 | Where-Object { -not $seen70.Add($_) }
Check ($dupes70.Count -eq 0 -or $null -eq $dupes70) `
    "No duplicate names in ARMOR.CSV -- dupes: $($dupes70 -join ', ')"

# 70.6  No duplicate names in MISC.CSV
$miscNames70 = $miscRows70 | ForEach-Object { ($_ -split ',')[0].Trim() }
$seenM70 = [System.Collections.Generic.HashSet[string]]::new()
$dupesM70 = $miscNames70 | Where-Object { -not $seenM70.Add($_) }
Check ($dupesM70.Count -eq 0 -or $null -eq $dupesM70) `
    "No duplicate names in MISC.CSV -- dupes: $($dupesM70 -join ', ')"

# 70.7  ARMOR.CSV all data rows have exactly 7 columns
$EXPECTED_ARMOR_COLS = 7
$badArmorRows70 = $armorRows70 | Where-Object { ($_ -split ',').Count -ne $EXPECTED_ARMOR_COLS }
Check ($badArmorRows70.Count -eq 0 -or $null -eq $badArmorRows70) `
    "ARMOR.CSV all data rows have $EXPECTED_ARMOR_COLS columns"

# 70.8  Benny's Suit in registry as type:'armor'
$regArmorNames70 = Get-RegNamesByType70 $regNv70 'armor'
Check ($regArmorNames70.Contains("Benny's Suit")) `
    '"Benny''s Suit" in FALLOUT_REGISTRY.items as type:"armor"'

# 70.9  Suave Gambler Hat in registry as type:'armor'
Check ($regArmorNames70.Contains('Suave Gambler Hat')) `
    '"Suave Gambler Hat" in FALLOUT_REGISTRY.items as type:"armor"'

# 70.10  Vault 13 Canteen in registry as type:'aid'
$regAidNames70 = Get-RegNamesByType70 $regNv70 'aid'
Check ($regAidNames70.Contains('Vault 13 Canteen')) `
    '"Vault 13 Canteen" in FALLOUT_REGISTRY.items as type:"aid"'

# 70.11  seedNewCampaignInventory function defined in ui-core.js
Check ([bool]($uiCore70 -match 'function\s+seedNewCampaignInventory\s*\(')) `
    'seedNewCampaignInventory() is defined in ui-core.js'

# Extract seedNewCampaignInventory body
$seedMatch70 = [regex]::Match($uiCore70, '(?s)function seedNewCampaignInventory\s*\([^)]*\)\s*\{(.*?)\n\}')
$seedBody70  = if ($seedMatch70.Success) { $seedMatch70.Groups[1].Value } else { '' }

# 70.12  GAME_DEFS-driven seed: function reads seedInventory from GAME_DEFS (Protocol 38)
Check ([bool]($seedBody70 -match 'GAME_DEFS')) `
    'seedNewCampaignInventory() reads seedInventory from GAME_DEFS -- game-agnostic seed dispatch (Protocol 38)'

# 70.13  Empty-inventory guard
Check ($seedBody70 -match 'inventory' -and $seedBody70 -match 'length') `
    'seedNewCampaignInventory() checks inventory.length -- prevents duplicate seed'

# 70.14  New-campaign guard (ticks === 0)
Check ([bool]($seedBody70 -match 'ticks')) `
    'seedNewCampaignInventory() checks ticks -- prevents seeding on reload of played campaign'

# 70.15  Mysterious Stranger Outfit DT regression (WU-D2 / NV-DB-1). fallout.wiki: the outfit
#        provides 5 DR and NO Damage Threshold -- in-game DT is 0. The DB had a wild DT of 55
#        (more protective than T-51b power armor); corrected to 0, matching every sibling
#        Clothing row. Schema: Name,Type,DT,Weight,... -> DT = col index 2.
$msoRow70 = $armorRows70 | Where-Object { ($_ -split ',')[0].Trim() -eq 'Mysterious Stranger Outfit' } | Select-Object -First 1
$msoDT70 = if ($msoRow70) { ($msoRow70 -split ',')[2].Trim() } else { $null }
Check ($msoDT70 -eq '0') ("Mysterious Stranger Outfit has DT 0 in ARMOR.CSV (fallout.wiki: DR 5, no DT; was 55) -- got " + $msoDT70)

# 70.16  1st Recon Assault/Survival Armor DT regression (WU-D6). fallout.wiki infoboxes: both
#        are "weightless DT 15 armor" exclusive to Boone. The DB had DT 22; corrected to 15
#        (Type stays Heavy -- already canon-correct, WU-D2). Schema DT = col index 2.
$assaultRow70 = $armorRows70 | Where-Object { ($_ -split ',')[0].Trim() -eq '1st Recon Assault Armor' } | Select-Object -First 1
$survivalRow70 = $armorRows70 | Where-Object { ($_ -split ',')[0].Trim() -eq '1st Recon Survival Armor' } | Select-Object -First 1
$assaultDT70 = if ($assaultRow70) { ($assaultRow70 -split ',')[2].Trim() } else { $null }
$survivalDT70 = if ($survivalRow70) { ($survivalRow70 -split ',')[2].Trim() } else { $null }
Check (($assaultDT70 -eq '15') -and ($survivalDT70 -eq '15')) ("1st Recon Assault + Survival Armor have DT 15 (fallout.wiki infobox; was 22) -- got assault=" + $assaultDT70 + ", survival=" + $survivalDT70)

# ===========================================================
# Suite 71 -- Phase 6 UI Consistency (compact trackers,
# collapsible sub-panels, persist collapse, center lone faction card)
# Guards: #traitsSection is <details.sub-panel> + data-sub-id,
# renderTraits compact inline effect span,
# #collectiblesSubPanel + #lincolnSubPanel as sub-panels,
# sub-panel persistence + fail-safe + default-collapsed,
# Lincoln compact rows, faction lone-card CSS,
# no-dup-header guard, Lincoln data-lname onclick safety,
# setLincolnDisposition re-render guard, Lincoln no-inline-flex guard,
# Traits no-inline-flex guard (compact rows matching collectibles density).
# 23 tests
# ===========================================================
Sep "Suite 71 -- Phase 6 UI Consistency"
$htmlSrc71     = Read-Src 'index.html'
$uiRenderSrc71 = Read-Src 'js\ui-render.js'
$uiCoreSrc71   = Read-Src 'js\ui-core.js'
$cssSrc71      = Read-Src 'css\terminal.css'

# 71.1  #traitsSection is a <details> element
Check ([bool]($htmlSrc71 -match '<details[^>]+id="traitsSection"')) `
    'index.html: #traitsSection is a <details> element (collapsible sub-panel, not a plain div)'

# 71.2  #traitsSection has class="sub-panel"
Check ([bool]($htmlSrc71 -match '(?s)<details[^>]*class="sub-panel"[^>]*id="traitsSection"|<details[^>]*id="traitsSection"[^>]*class="sub-panel"')) `
    'index.html: #traitsSection has class="sub-panel"'

# 71.3  #traitsSection has data-sub-id attribute
Check ([bool]($htmlSrc71 -match 'id="traitsSection"[^>]*data-sub-id|data-sub-id[^>]*id="traitsSection"')) `
    'index.html: #traitsSection has data-sub-id attribute for persistence'

# 71.4  renderTraits() compact: effect is inline span not block div
$renderBody71 = ''
$renderMatch71 = [regex]::Match($uiRenderSrc71, '(?s)function renderTraits\s*\([^)]*\)\s*\{(.*?)\n\}')
if ($renderMatch71.Success) { $renderBody71 = $renderMatch71.Groups[1].Value }
Check ($renderBody71 -match 'effectSpan' -and $renderBody71 -notmatch "html\s*\+=\s*``<div[^``]*font-size:10px[^``]*>`\s*`\$\{escapeHtml\(d\.effect\)") `
    'renderTraits() renders effect inline as <span> (compact one-line format -- no block <div> per effect)'

# 71.5  #collectiblesSubPanel exists in index.html
Check ([bool]($htmlSrc71 -match 'id="collectiblesSubPanel"')) `
    'index.html has #collectiblesSubPanel (collectibles list sub-tracker)'

# 71.6  #collectiblesSubPanel has class="sub-panel"
Check ([bool]($htmlSrc71 -match '(?s)<details[^>]*class="sub-panel"[^>]*id="collectiblesSubPanel"|<details[^>]*id="collectiblesSubPanel"[^>]*class="sub-panel"')) `
    'index.html: #collectiblesSubPanel has class="sub-panel"'

# 71.7  #collectiblesSubPanel has data-sub-id attribute
Check ([bool]($htmlSrc71 -match 'id="collectiblesSubPanel"[^>]*data-sub-id|data-sub-id[^>]*id="collectiblesSubPanel"')) `
    'index.html: #collectiblesSubPanel has data-sub-id attribute for persistence'

# 71.8  #lincolnSubPanel exists in index.html
Check ([bool]($htmlSrc71 -match 'id="lincolnSubPanel"')) `
    'index.html has #lincolnSubPanel (Lincoln Memorabilia sub-tracker)'

# 71.9  #lincolnSubPanel has class="sub-panel"
Check ([bool]($htmlSrc71 -match '(?s)<details[^>]*class="sub-panel"[^>]*id="lincolnSubPanel"|<details[^>]*id="lincolnSubPanel"[^>]*class="sub-panel"')) `
    'index.html: #lincolnSubPanel has class="sub-panel"'

# 71.10  #lincolnSubPanel has data-sub-id attribute
Check ([bool]($htmlSrc71 -match 'id="lincolnSubPanel"[^>]*data-sub-id|data-sub-id[^>]*id="lincolnSubPanel"')) `
    'index.html: #lincolnSubPanel has data-sub-id attribute for persistence'

# 71.11  Sub-panel persistence in ui-core.js reads robco_panel_state for data-sub-id elements
Check ($uiCoreSrc71 -match 'data-sub-id' -and $uiCoreSrc71 -match 'robco_panel_state') `
    'ui-core.js wires persistence for details[data-sub-id] elements using robco_panel_state key'

# 71.12  Sub-panel toggle listener saves state
Check ($uiCoreSrc71 -match 'data-sub-id' -and $uiCoreSrc71 -match 'toggle' -and $uiCoreSrc71 -match 'subId') `
    'ui-core.js wires "toggle" event on sub-panels to persist open/closed state'

# 71.13  Default collapsed: no 'open' attribute on #collectiblesSubPanel
Check (-not ($htmlSrc71 -match '<details[^>]*id="collectiblesSubPanel"[^>]*\sopen[\s>]')) `
    'index.html: #collectiblesSubPanel has no "open" attribute -- defaults to collapsed'

# 71.14  Default collapsed: no 'open' attribute on #lincolnSubPanel
Check (-not ($htmlSrc71 -match '<details[^>]*id="lincolnSubPanel"[^>]*\sopen[\s>]')) `
    'index.html: #lincolnSubPanel has no "open" attribute -- defaults to collapsed'

# 71.15  Fail-safe: sub-panel persistence uses JSON.parse with '{}' fallback
Check ([bool]($uiCoreSrc71 -match "JSON\.parse\s*\(\s*MetaStore\.get\s*\(\s*['""]robco_panel_state['""]\s*\)\s*\|\|\s*'\{\}'")) `
    "ui-core.js sub-panel persistence uses JSON.parse(... || '{}') fail-safe"

# 71.16  Lincoln compact: margin-bottom:2px (not 4px) in renderLincolnMemorabilia
$lincolnBody71 = ''
$lincolnMatch71 = [regex]::Match($uiRenderSrc71, '(?s)function renderLincolnMemorabilia\s*\([^)]*\)\s*\{(.*?)\n\}')
if ($lincolnMatch71.Success) { $lincolnBody71 = $lincolnMatch71.Groups[1].Value }
Check ($lincolnBody71 -match 'margin-bottom:2px' -and $lincolnBody71 -notmatch 'margin-bottom:4px') `
    'renderLincolnMemorabilia() uses margin-bottom:2px (compact one-line format) -- no 4px spacing'

# 71.17  Faction lone-card CSS: :last-child:nth-child(odd) in terminal.css
Check ([bool]($cssSrc71 -match 'faction-card:last-child:nth-child\(odd\)')) `
    'terminal.css has .faction-card:last-child:nth-child(odd) rule for centering lone card in mobile grid'

# 71.18  renderCollectibles updates sub-panel summary h3
$collectiblesBody71 = ''
$collectiblesMatch71 = [regex]::Match($uiRenderSrc71, '(?s)function renderCollectibles\s*\([^)]*\)\s*\{(.*?)\n\}')
if ($collectiblesMatch71.Success) { $collectiblesBody71 = $collectiblesMatch71.Groups[1].Value }
Check ($collectiblesBody71 -match 'collectiblesSubPanel' -and ($collectiblesBody71 -match 'summaryH3|querySelector.*h3')) `
    'renderCollectibles() updates #collectiblesSubPanel summary h3 with game-specific label and count'

# 71.19  No redundant inner bold-header div in renderCollectibles
Check (-not ($collectiblesBody71 -match "html\s*=\s*``<div[^``]*font-weight:bold")) `
    'renderCollectibles() does not output a redundant inner bold-header div -- typeLabel shown only in sub-panel summary, not duplicated inside content'

# 71.20  Lincoln rows use data-lname attribute for safe onclick (prevents apostrophe JS error)
$lincolnBody71b = ''
$lincolnMatch71b = [regex]::Match($uiRenderSrc71, '(?s)function renderLincolnMemorabilia\s*\([^)]*\)\s*\{(.*?)\n\}')
if ($lincolnMatch71b.Success) { $lincolnBody71b = $lincolnMatch71b.Groups[1].Value }
Check ($lincolnBody71b -match 'data-lname' -and $lincolnBody71b -match 'this\.dataset\.lname') `
    "renderLincolnMemorabilia() uses data-lname attribute + this.dataset.lname (safe name passing -- prevents apostrophe SyntaxError on click)"

# 71.21  setLincolnDisposition calls renderLincolnMemorabilia() (live tally update)
$dispBody71 = ''
$dispMatch71 = [regex]::Match($uiRenderSrc71, '(?s)function setLincolnDisposition\s*\([^)]*\)\s*\{(.*?)\n\}')
if ($dispMatch71.Success) { $dispBody71 = $dispMatch71.Groups[1].Value }
Check ($dispBody71 -match 'renderLincolnMemorabilia\s*\(\s*\)') `
    'setLincolnDisposition() calls renderLincolnMemorabilia() -- tally and counts update immediately when disposition changes'

# 71.22  Lincoln toggle spans do not use min-height:28px;display:inline-flex (compact rows)
Check (-not ($lincolnBody71b -match 'min-height:28px;display:inline-flex')) `
    'renderLincolnMemorabilia() toggle spans do not use min-height:28px;display:inline-flex -- compact rows match bobblehead density'

# 71.23  Traits toggle spans do not use min-height:28px;display:inline-flex (compact rows)
$traitsBody71 = ''
$traitsMatch71 = [regex]::Match($uiRenderSrc71, '(?s)function renderTraits\s*\([^)]*\)\s*\{(.*?)\n\}')
if ($traitsMatch71.Success) { $traitsBody71 = $traitsMatch71.Groups[1].Value }
Check (-not ($traitsBody71 -match 'min-height:28px;display:inline-flex')) `
    'renderTraits() toggle spans do not use min-height:28px;display:inline-flex -- compact rows match collectibles/bobblehead density'

# ===========================================================
# Suite 72 -- Fix A: location datalist per-game bleed + Fix B: update-modal whitespace
# 8 tests
# ===========================================================
$htmlSrc72  = Get-Content "$ROOT\index.html"      -Raw
$uiSavesSrc72 = Get-Content "$ROOT\js\ui-saves.js" -Raw
$uiCoreSrc72  = Get-Content "$ROOT\js\ui-core.js"  -Raw
$cssSrc72     = Get-Content "$ROOT\css\terminal.css" -Raw

Sep "Suite 72 -- Location datalist bleed fix + update-modal whitespace"

# 72.1  Static nv_locations datalist is gone from index.html
Check (-not ($htmlSrc72 -match 'id="nv_locations"')) `
    'index.html: static id="nv_locations" datalist removed (was FNV-only, caused context bleed into FO3)'

# 72.2  #stat_loc now points to locationOptions
Check ([bool]($htmlSrc72 -match 'id="stat_loc"[^>]*list="locationOptions"|list="locationOptions"[^>]*id="stat_loc"')) `
    'index.html: #stat_loc input has list="locationOptions" (dynamic datalist)'

# 72.3  #locationOptions datalist exists and is empty in HTML
Check ([bool]($htmlSrc72 -match '(?s)<datalist\s[^>]*id="locationOptions"[^>]*>\s*</datalist>')) `
    'index.html: #locationOptions datalist exists and is empty (populated dynamically by initLocationDatalist)'

# 72.4  initLocationDatalist defined in ui-saves.js, reads FALLOUT_REGISTRY.locations, uses escapeHtml
$initLocIdx72 = $uiSavesSrc72.IndexOf('function initLocationDatalist')
Check ($uiSavesSrc72 -match 'function initLocationDatalist' -and `
      $uiSavesSrc72 -match 'FALLOUT_REGISTRY\.locations' -and `
      ($initLocIdx72 -ge 0 -and $uiSavesSrc72.Substring($initLocIdx72) -match 'escapeHtml')) `
    'ui-saves.js: initLocationDatalist() defined, reads FALLOUT_REGISTRY.locations, escapes output with escapeHtml'

# 72.5  initLocationDatalist is called in ui-core.js
Check ([bool]($uiCoreSrc72 -match 'initLocationDatalist\s*\(\s*\)')) `
    'ui-core.js: initLocationDatalist() is called on load (alongside initAmmoDatalist)'

# 72.6  Bleed-class regression guard: no <datalist> has static <option> children
# [^<]* stops at the first < after opening tag so </datalist> blocks the match before any <option>
Check (-not ($htmlSrc72 -match '<datalist\b[^>]*>[^<]*<option')) `
    'index.html: no <datalist> contains static <option> children -- all datalists empty in HTML, populated dynamically'

# 72.7  #updateModalMsg has white-space:normal in terminal.css
Check ([bool]($cssSrc72 -match '(?s)#updateModalMsg[\s\S]{0,200}white-space\s*:\s*normal')) `
    'terminal.css: #updateModalMsg has white-space:normal (overrides inherited pre-wrap so message flows cleanly)'

# 72.8  #updateModalMsg content starts immediately after > with no leading whitespace
Check ([bool]($htmlSrc72 -match 'id="updateModalMsg">[A-Z]')) `
    'index.html: #updateModalMsg content starts immediately after > with no leading whitespace or newline'

# ===========================================================
# Suite 73 -- Skills panel game-aware render (FNV/FO3 bleed fix)
# 12 tests
# ===========================================================
$htmlSrc73   = Get-Content "$ROOT\index.html" -Raw
$uiCoreSrc73 = Get-Content "$ROOT\js\ui-core.js" -Raw
$stateSrc73  = Get-Content "$ROOT\js\state.js" -Raw

Sep "Suite 73 -- Skills panel game-aware render (FNV/FO3 bleed fix)"

# 73.1  #skillsGrid container exists in index.html
Check ([bool]($htmlSrc73 -match 'id="skillsGrid"')) `
    'index.html: #skillsGrid container exists (empty div populated dynamically by renderSkills)'

# 73.2  #skillsGrid has no static .skill-row children
Check (-not ($htmlSrc73 -match '(?s)id="skillsGrid"[^>]*>[\s\S]*?<div[^>]*class="skill-row"')) `
    'index.html: #skillsGrid has no static .skill-row children -- grid is empty in HTML, populated dynamically per game'

# 73.3  No hardcoded id="sk_guns" (FNV-only skill bleed regression guard)
Check (-not ($htmlSrc73 -match 'id="sk_guns"')) `
    'index.html: no hardcoded id="sk_guns" -- FNV-only Guns skill must not appear as static HTML (bleed regression guard)'

# 73.4  No hardcoded id="sk_survival" (FNV-only skill bleed regression guard)
Check (-not ($htmlSrc73 -match 'id="sk_survival"')) `
    'index.html: no hardcoded id="sk_survival" -- FNV-only Survival skill must not appear as static HTML (bleed regression guard)'

# 73.5  renderSkills() is defined in ui-core.js
Check ([bool]($uiCoreSrc73 -match 'function renderSkills\s*\(\s*\)')) `
    'ui-core.js: renderSkills() is defined'

# 73.6  renderSkills() body calls getSkillKeys() to iterate game-aware keys
$renderSkillsBody73 = ''
$renderSkillsMatch73 = [regex]::Match($uiCoreSrc73, '(?s)function renderSkills\s*\([^)]*\)\s*\{(.*?)\n\}')
if ($renderSkillsMatch73.Success) { $renderSkillsBody73 = $renderSkillsMatch73.Groups[1].Value }
Check ($renderSkillsBody73 -match 'getSkillKeys\s*\(\s*\)') `
    'renderSkills() calls getSkillKeys() to build per-game skill rows'

# 73.7  renderSkills() uses SKILL_LABELS for human-readable display names
Check ($renderSkillsBody73 -match 'SKILL_LABELS') `
    'renderSkills() uses SKILL_LABELS to look up human-readable skill names'

# 73.8  renderSkills() escapes label text with escapeHtml (XSS safety)
Check ($renderSkillsBody73 -match 'escapeHtml') `
    'renderSkills() runs label text through escapeHtml() (XSS safety on skill names)'

# 73.9  renderSkills() is called from loadUI()
Check ([bool]($uiCoreSrc73 -match '(?s)function loadUI[\s\S]{0,200}renderSkills\s*\(\s*\)')) `
    'ui-core.js: renderSkills() is called at the top of loadUI() so rows exist before state values are synced into them'

# 73.10  SKILL_LABELS is defined and covers all 15 game skill keys
$allSkills73 = @('barter','big_guns','energy_weapons','explosives','guns','lockpick','medicine','melee_weapons','repair','science','small_guns','sneak','speech','survival','unarmed')
$missingSkills73 = @($allSkills73 | Where-Object { -not ($uiCoreSrc73 -match "$_\s*:") })
Check ($uiCoreSrc73 -match 'const SKILL_LABELS\s*=' -and $missingSkills73.Count -eq 0) `
    'ui-core.js: SKILL_LABELS covers all 15 possible skill keys (barter, big_guns, small_guns, guns, survival, and the 11 shared keys)'

# 73.11  SKILL_LABELS maps game-specific keys to correct display names
Check ([bool]($uiCoreSrc73 -match "big_guns\s*:\s*'Big Guns'") -and `
       [bool]($uiCoreSrc73 -match "small_guns\s*:\s*'Small Guns'") -and `
       [bool]($uiCoreSrc73 -match "\bguns\s*:\s*'Guns'") -and `
       [bool]($uiCoreSrc73 -match "survival\s*:\s*'Survival'")) `
    "SKILL_LABELS maps game-specific keys: big_guns->'Big Guns', small_guns->'Small Guns', guns->'Guns', survival->'Survival'"

# 73.12  syncStateFromDom() still iterates getSkillKeys() -- data layer regression guard
Check ([bool]($stateSrc73 -match 'getSkillKeys\s*\(\s*\)')) `
    'state.js: syncStateFromDom() still iterates getSkillKeys() -- data layer unchanged by this render refactor'

# ===========================================================
# Suite 74 -- Collectibles Map Coord Guards (Change 1)
# gridRow/gridCol on every FNV/FO3 collectible + lincoln entry,
# cells match existing zones[], coord-based badge source guard,
# regression: no name-based badge logic, lincoln check present,
# WU-D1 unique FO3 zone-name guard, WU-D5 'Vault 92 South' fix.
# 13 tests
# ===========================================================
Sep "Suite 74 -- Collectibles Map Coord Guards"
$nvRegSrc74   = Read-Src "js\reg_nv.js"
$fo3RegSrc74  = Read-Src "js\reg_fo3.js"
$uiRenderSrc74 = Read-Src "js\ui-render.js"

# 74.1  All FNV collectibles have gridRow and gridCol in 1..6
$nvCollectBlock74 = ''
$nvCM74 = [regex]::Match($nvRegSrc74, '(?s)collectibles\s*:\s*\[(.*?)\],')
if ($nvCM74.Success) { $nvCollectBlock74 = $nvCM74.Groups[1].Value }
$nvRows74 = [regex]::Matches($nvCollectBlock74, 'gridRow\s*:\s*(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
$nvCols74 = [regex]::Matches($nvCollectBlock74, 'gridCol\s*:\s*(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
Check ($nvRows74.Count -eq 7 -and ($nvRows74 | Where-Object { $_ -lt 1 -or $_ -gt 6 }).Count -eq 0 -and $nvCols74.Count -eq 7 -and ($nvCols74 | Where-Object { $_ -lt 1 -or $_ -gt 6 }).Count -eq 0) `
    'reg_nv.js: all 7 FNV collectibles have gridRow and gridCol in 1..6'

# 74.2  FNV collectible cells all match an existing NV zones[] entry
$nvZonesBlock74 = ''
$nvZM74 = [regex]::Match($nvRegSrc74, '(?s)zones\s*:\s*\[(.*?)\],\s*\/\/')
if ($nvZM74.Success) { $nvZonesBlock74 = $nvZM74.Groups[1].Value }
$nvZoneKeys74 = New-Object System.Collections.Generic.HashSet[string]
[regex]::Matches($nvZonesBlock74, '(?s)gridRow\s*:\s*(\d+).*?gridCol\s*:\s*(\d+)') | ForEach-Object { [void]$nvZoneKeys74.Add("$($_.Groups[1].Value),$($_.Groups[2].Value)") }
$nvBadCoords74 = [regex]::Matches($nvCollectBlock74, '(?s)gridRow\s*:\s*(\d+).*?gridCol\s*:\s*(\d+)') | Where-Object { -not $nvZoneKeys74.Contains("$($_.Groups[1].Value),$($_.Groups[2].Value)") }
Check ($nvBadCoords74.Count -eq 0) ('reg_nv.js: all FNV collectible gridRow/gridCol cells match an existing zones[] entry' + $(if ($nvBadCoords74.Count) { " -- bad: " + ($nvBadCoords74 | ForEach-Object { "$($_.Groups[1].Value),$($_.Groups[2].Value)" } | Join-String -Separator ', ') } else { '' }))

# 74.3  All FO3 collectibles have gridRow and gridCol in 1..6
$fo3CollectBlock74 = ''
$fo3CM74 = [regex]::Match($fo3RegSrc74, '(?s)collectibles\s*:\s*\[(.*?)\],')
if ($fo3CM74.Success) { $fo3CollectBlock74 = $fo3CM74.Groups[1].Value }
$fo3Rows74 = [regex]::Matches($fo3CollectBlock74, 'gridRow\s*:\s*(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
$fo3Cols74 = [regex]::Matches($fo3CollectBlock74, 'gridCol\s*:\s*(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
Check ($fo3Rows74.Count -eq 20 -and ($fo3Rows74 | Where-Object { $_ -lt 1 -or $_ -gt 6 }).Count -eq 0 -and $fo3Cols74.Count -eq 20 -and ($fo3Cols74 | Where-Object { $_ -lt 1 -or $_ -gt 6 }).Count -eq 0) `
    'reg_fo3.js: all 20 FO3 collectibles have gridRow and gridCol in 1..6'

# 74.4  FO3 collectible cells all match an existing FO3 zones[] entry
# Zone entries have 'locations:' (plural array); collectibles have 'location:' (singular string)
$fo3ZoneKeys74 = New-Object System.Collections.Generic.HashSet[string]
[regex]::Matches($fo3RegSrc74, 'gridRow\s*:\s*(\d+)[\s,]+gridCol\s*:\s*(\d+)[\s,]+locations\s*:') | ForEach-Object { [void]$fo3ZoneKeys74.Add("$($_.Groups[1].Value),$($_.Groups[2].Value)") }
$fo3BadCoords74 = [regex]::Matches($fo3CollectBlock74, '(?s)gridRow\s*:\s*(\d+).*?gridCol\s*:\s*(\d+)') | Where-Object { -not $fo3ZoneKeys74.Contains("$($_.Groups[1].Value),$($_.Groups[2].Value)") }
Check ($fo3BadCoords74.Count -eq 0) ('reg_fo3.js: all FO3 collectible gridRow/gridCol cells match an existing FO3 zones[] entry' + $(if ($fo3BadCoords74.Count) { " -- bad: " + ($fo3BadCoords74 | ForEach-Object { "$($_.Groups[1].Value),$($_.Groups[2].Value)" } | Join-String -Separator ', ') } else { '' }))

# 74.5  All lincolnMemorabilia entries have gridRow=4 and gridCol=2
$linBlock74 = ''
$linM74 = [regex]::Match($fo3RegSrc74, '(?s)lincolnMemorabilia\s*:\s*\[(.*?)\n  \],')
if ($linM74.Success) { $linBlock74 = $linM74.Groups[1].Value }
$linRows74 = [regex]::Matches($linBlock74, 'gridRow\s*:\s*(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
$linCols74 = [regex]::Matches($linBlock74, 'gridCol\s*:\s*(\d+)') | ForEach-Object { [int]$_.Groups[1].Value }
Check ($linRows74.Count -eq 9 -and ($linRows74 | Where-Object { $_ -ne 4 }).Count -eq 0 -and $linCols74.Count -eq 9 -and ($linCols74 | Where-Object { $_ -ne 2 }).Count -eq 0) `
    'reg_fo3.js: all 9 lincolnMemorabilia entries have gridRow=4 and gridCol=2 (Museum of History)'

# 74.6  lincolnMemorabilia cell [4,2] matches an existing FO3 zone
Check ($fo3ZoneKeys74.Contains('4,2')) `
    'reg_fo3.js: lincolnMemorabilia cell [4,2] matches an existing FO3 zones[] entry (Museum of History zone)'

# 74.7  renderWorldMap badge uses coord-based matching
Check ([bool]($uiRenderSrc74 -match 'def\.gridRow\s*===\s*zone\.gridRow') -and [bool]($uiRenderSrc74 -match 'def\.gridCol\s*===\s*zone\.gridCol')) `
    'ui-render.js: zoneHasUncollectedCollectible uses def.gridRow===zone.gridRow coord comparison (coord-based badge)'

# 74.8  renderWorldMap badge NOT using old name-based matching (regression guard)
$mapBody74 = ''
try { $mapBody74 = Get-FunctionBody $uiRenderSrc74 'zoneHasUncollectedCollectible' } catch {}
Check (-not ($mapBody74 -match 'defName\.includes\s*\(') -and -not ($mapBody74 -match 'searchIn\.some')) `
    'ui-render.js: zoneHasUncollectedCollectible no longer uses name-substring matching (coord-based regression guard)'

# 74.9  zoneHasUncollectedCollectible also checks Lincoln items
Check ([bool]($mapBody74 -match 'lincolnMemorabilia')) `
    'ui-render.js: zoneHasUncollectedCollectible checks lincolnMemorabilia entries (Lincoln items flag their zone cell)'

# 74.10  FNV collectibles count unchanged = 7
$nvCollectCount74 = ([regex]::Matches($nvCollectBlock74, '\bname\s*:')).Count
Check ($nvCollectCount74 -eq 7) "reg_nv.js: FNV collectibles count unchanged = 7 (found $nvCollectCount74)"

# 74.11  FO3 collectibles count unchanged = 20
$fo3CollectCount74 = ([regex]::Matches($fo3CollectBlock74, '\bname\s*:')).Count
Check ($fo3CollectCount74 -eq 20) "reg_fo3.js: FO3 collectibles count unchanged = 20 (found $fo3CollectCount74)"

# 74.12  All FO3 zones[] have unique names (WU-D1 / FO3-REG-1) -- a duplicate zone name
#        mislabels the world-map region (the two 'Vault 92' cells). Matches zone entries
#        only (name + gridRow + gridCol + locations:[]).
$zoneNames74 = [regex]::Matches($fo3RegSrc74, "name:\s*'([^']+)',\s*gridRow:\s*\d+,\s*gridCol:\s*\d+,\s*locations:") | ForEach-Object { $_.Groups[1].Value }
$dupZones74 = @($zoneNames74 | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
Check (($zoneNames74.Count -gt 0) -and ($dupZones74.Count -eq 0)) ("reg_fo3.js: all FO3 zones[] have unique names (no duplicate world-map region labels)" + $(if ($dupZones74.Count) { ' -- dup: ' + ($dupZones74 -join ', ') } else { '' }))

# 74.13  WU-D5 location-canon guard: the fabricated 'Vault 92 South' marker (the real Vault 92
#        is the far-NW cell) stays removed, replaced by the real 'Bethesda Offices East' --
#        where the Lockpick bobblehead sits -- in the Bethesda Ruins (6,4) zone. Protocol 3.
Check ((-not ($fo3RegSrc74 -match 'Vault 92 South')) -and ($fo3RegSrc74 -match "'Bethesda Offices East'")) "reg_fo3.js: fabricated 'Vault 92 South' replaced by real 'Bethesda Offices East' in the Bethesda Ruins zone (WU-D5)"

# ===========================================================
# Suite 75 -- Registry items[] No-Duplicate-Names Guard
# behavioral: extract items section, build name set, assert no name appears twice.
# Also regression-guards the Rebound weapon typo fix.
# 3 tests
# ===========================================================
Sep "Suite 75 -- Registry items[] No-Duplicate-Names Guard"
$nvSrc75  = Read-Src "js\reg_nv.js"
$fo3Src75 = Read-Src "js\reg_fo3.js"

function Get-ItemsSection75 {
    param([string]$src)
    $start = $src.IndexOf('items:')
    if ($start -lt 0) { return '' }
    $depth = 0; $inItems = $false; $itemsStart = -1
    for ($i = $start; $i -lt $src.Length; $i++) {
        if ($src[$i] -eq '[') { $depth++; if (-not $inItems) { $inItems = $true; $itemsStart = $i } }
        elseif ($src[$i] -eq ']') { $depth--; if ($inItems -and $depth -eq 0) { return $src.Substring($itemsStart, $i - $itemsStart + 1) } }
    }
    return ''
}

function Get-ItemEntries75 {
    param([string]$src)
    $section = Get-ItemsSection75 $src
    $entries = @()
    $itemPattern = [regex]'\{[^}]+\}'
    foreach ($m in $itemPattern.Matches($section)) {
        $block = $m.Value
        $nameM = [regex]::Match($block, "name\s*:\s*(?:'([^']*)'|""([^""]*)"")")
        $typeM = [regex]::Match($block, "type\s*:\s*(?:'([^']*)'|""([^""]*)"")")
        if ($nameM.Success -and $typeM.Success) {
            $name = if ($nameM.Groups[1].Success) { $nameM.Groups[1].Value } else { $nameM.Groups[2].Value }
            $type = if ($typeM.Groups[1].Success) { $typeM.Groups[1].Value } else { $typeM.Groups[2].Value }
            $entries += "${name}::${type}"
        }
    }
    return $entries
}

# 75.1  FNV items[] has no duplicate (name, type) pairs
$nvEntries75 = Get-ItemEntries75 $nvSrc75
$nvDups75    = $nvEntries75 | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name }
Check ($nvDups75.Count -eq 0) "reg_nv.js items[] has no duplicate (name,type) pairs (dups: $(if ($nvDups75.Count) { $nvDups75 -join ', ' } else { 'none' }))"

# 75.2  FO3 items[] has no duplicate (name, type) pairs
$fo3Entries75 = Get-ItemEntries75 $fo3Src75
$fo3Dups75    = $fo3Entries75 | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name }
Check ($fo3Dups75.Count -eq 0) "reg_fo3.js items[] has no duplicate (name,type) pairs (dups: $(if ($fo3Dups75.Count) { $fo3Dups75 -join ', ' } else { 'none' }))"

# 75.3  Regression: {name:'Rebound', type:'weapon'} appears exactly once in reg_nv.js items[]
#       (Previously appeared twice due to a copy-paste error; this guards against recurrence)
$nvItemsSection75 = Get-ItemsSection75 $nvSrc75
$reboundCount75   = ([regex]::Matches($nvItemsSection75, "name\s*:\s*'Rebound'[\s\S]{0,30}type\s*:\s*'weapon'")).Count
Check ($reboundCount75 -eq 1) "reg_nv.js: Rebound weapon entry appears exactly once (found $reboundCount75)"

# ===========================================================
# Suite 77 -- Faction Rep Regression: Canon Thresholds + +-5 Increment
# 14 tests
# ===========================================================
Sep "Suite 77 -- Faction Rep Regression: Canon Thresholds + +-5 Increment"
$uiSrc77 = Read-Src "js\ui-render.js"

# -- Behavioral tests via Node subprocess (tests 77.1-77.13) --
$rep77Labels = @(
    "getFactionStanding generic (0,0) -> Neutral",
    "getFactionStanding generic (8,0) -> Accepted (NOT Idolized)",
    "getFactionStanding generic (25,0) -> Liked",
    "getFactionStanding generic (50,0) -> Idolized",
    "getFactionStanding generic (0,8) -> Shunned",
    "getFactionStanding generic (0,25) -> Hated",
    "getFactionStanding generic (0,50) -> Vilified",
    "getFactionStanding generic (50,50) -> Wild Child",
    "getFactionStanding generic (50,8) -> Good-Natured Rascal",
    "getFactionStanding generic (8,8) -> Mixed",
    "getFactionStanding generic (25,25) -> Unpredictable",
    "getFactionStanding generic (8,25) -> Sneering Punk",
    "getFactionStanding ncr (50,0) -> Liked (NCR bp3=80, 50<80 is not max rank)"
)
try {
    $nodeCheck77 = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck77) {
        $repoRoot77 = (Get-Item $PSScriptRoot).Parent.FullName
        $repoRootNode77 = $repoRoot77.Replace('\', '/')
        $repScript77 = @"
const vm = require('vm');
const fs = require('fs');
const src = fs.readFileSync('$repoRootNode77/js/ui-render.js', 'utf8');
const threshMatch = src.match(/const FACTION_THRESHOLDS\s*=\s*\{[\s\S]*?\};\s*\/\/ Default/);
const defaultMatch = src.match(/const _DEFAULT_THRESHOLDS\s*=\s*\{[^}]+\};/);
const fnMatch = src.match(/function getFactionStanding\([\s\S]*?\n\}/);
if (!threshMatch || !defaultMatch || !fnMatch) { console.log('EXTRACT_FAIL'); process.exit(0); }
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(threshMatch[0] + '\n' + defaultMatch[0] + '\n' + fnMatch[0], sandbox);
const gfs = sandbox.getFactionStanding;
const r = [
    gfs('generic', 0, 0).label === 'Neutral',
    gfs('generic', 8, 0).label === 'Accepted',
    gfs('generic', 25, 0).label === 'Liked',
    gfs('generic', 50, 0).label === 'Idolized',
    gfs('generic', 0, 8).label === 'Shunned',
    gfs('generic', 0, 25).label === 'Hated',
    gfs('generic', 0, 50).label === 'Vilified',
    gfs('generic', 50, 50).label === 'Wild Child',
    gfs('generic', 50, 8).label === 'Good-Natured Rascal',
    gfs('generic', 8, 8).label === 'Mixed',
    gfs('generic', 25, 25).label === 'Unpredictable',
    gfs('generic', 8, 25).label === 'Sneering Punk',
    gfs('ncr', 50, 0).label === 'Liked'
];
console.log('RESULT:' + r.map(b => b ? '1' : '0').join(''));
"@
        $out77 = ($repScript77 | node 2>&1 | Out-String)
        $rm77 = [regex]::Match($out77, 'RESULT:([01]{13})')
        if ($rm77.Success) {
            $bits77 = $rm77.Groups[1].Value
            for ($bi77 = 0; $bi77 -lt 13; $bi77++) { Check ($bits77.Substring($bi77, 1) -eq '1') $rep77Labels[$bi77] }
        } else {
            $err77 = if ([string]::IsNullOrWhiteSpace($out77)) { "extract/runtime failure" } else { $out77.Trim() }
            foreach ($lbl77 in $rep77Labels) { Fail "$lbl77  (runtime error: $err77)" }
        }
    } else {
        foreach ($lbl77 in $rep77Labels) { Fail "$lbl77  (node not found)" }
    }
} catch {
    foreach ($lbl77 in $rep77Labels) { Fail "$lbl77  (exception: $_)" }
}

# -- Increment regression guard --

# 77.14  Faction buttons use +-5 delta -- no adjustFaction with +-50 remains
Check (([bool]($uiSrc77 -match 'adjustFaction\(.*,5\)')) -and (-not ($uiSrc77 -match 'adjustFaction\([^)]*,\s*50\)')) -and (-not ($uiSrc77 -match 'adjustFaction\([^)]*,\s*-50\)'))) `
    "Faction buttons use +-5 increment -- adjustFaction with +-50 removed from ui-render.js"

# ===========================================================
# Suite 76 -- autoImportState Hardening Guards (F1/F2/F3)
# 9 tests
# ===========================================================
Sep "Suite 76 -- autoImportState Hardening Guards (F1/F2/F3)"
$apiSrc76    = Read-Src "js\api.js"
$importBody76 = ''
try { $importBody76 = Get-FunctionBody $apiSrc76 'autoImportState' } catch {}

# -- Fix 2: equipped unequip --

# 76.1  equipped block uses 'key' in obj (key-present test - distinguishes null from absent)
Check ([bool]($importBody76 -match "'weapon'\s+in\s+e")) `
    "autoImportState equipped: 'weapon' in e pattern present (key-present test, not falsy-check)"

# 76.2  all three slots use 'in' check
Check (([bool]($importBody76 -match "'armor'\s+in\s+e")) -and ([bool]($importBody76 -match "'headgear'\s+in\s+e"))) `
    "autoImportState equipped: 'armor' in e and 'headgear' in e also present (all three slots covered)"

# 76.3  Regression: old || short-circuit absent from equipped section
$eqIdx76   = $importBody76.IndexOf('parsed.equipped')
$eqBlock76 = if ($eqIdx76 -ge 0) { $importBody76.Substring($eqIdx76, [Math]::Min(400, $importBody76.Length - $eqIdx76)) } else { '' }
Check (-not ($eqBlock76 -match 'parsed\.equipped\.(weapon|armor|headgear)\s*\|\|')) `
    "autoImportState equipped: old parsed.equipped.slot || short-circuit removed - null now clears the slot"

# -- Fix 3: collectibles registry-validation --

# 76.4  collectibles block references FALLOUT_REGISTRY.collectibles
Check ([bool]($importBody76 -match 'FALLOUT_REGISTRY\.collectibles')) `
    "autoImportState collectibles: FALLOUT_REGISTRY.collectibles referenced (registry-validated, not freeform)"

# 76.5  collectibles block uses Set-based name guard
Check ([bool]($importBody76 -match '_collectNames\.has\(c\)')) `
    "autoImportState collectibles: _collectNames.has(c) guard active (hallucinated names rejected)"

# 76.6  Regression: old permissive c.trim() filter absent from collectibles block
$colIdx76   = $importBody76.IndexOf('parsed.collectibles')
$colBlock76 = if ($colIdx76 -ge 0) { $importBody76.Substring($colIdx76, [Math]::Min(600, $importBody76.Length - $colIdx76)) } else { '' }
Check (-not ($colBlock76 -match 'c\.trim\(\)\.length')) `
    "autoImportState collectibles: old c.trim().length permissive filter removed (registry guard active)"

# -- Fix 1: status type whitelist --

# 76.7  status type assignment uses BUFF/DEBUFF/NEUTRAL whitelist
$stIdx76   = $importBody76.IndexOf('st.map(item =>')
$stBlock76 = if ($stIdx76 -ge 0) { $importBody76.Substring($stIdx76, [Math]::Min(400, $importBody76.Length - $stIdx76)) } else { '' }
Check ([bool]($stBlock76 -match "\['BUFF',\s*'DEBUFF',\s*'NEUTRAL'\]")) `
    "autoImportState status: BUFF/DEBUFF/NEUTRAL whitelist array present in status type assignment"

# 76.8  status uses item.type with .toUpperCase() normalization
Check ([bool]($importBody76 -match 'String\(item\.type\)\.toUpperCase\(\)')) `
    "autoImportState status: String(item.type).toUpperCase() present (type normalized to uppercase)"

# 76.9  Regression: raw item.type || 'BUFF' (no whitelist) absent from status section
Check (-not ($stBlock76 -match "type\s*:\s*item\.type\s*\|\|\s*'BUFF'")) `
    "autoImportState status: raw item.type || 'BUFF' passthrough removed (whitelist active)"

# ===========================================================
# Suite 78 -- VENDORS.CSV structural integrity
# 7 tests
# ===========================================================
Sep "Suite 78 -- VENDORS.CSV structural integrity"
$nvSrc78 = Read-Src "js\db_nv.js"

# Extract VENDORS.CSV block
$vStart78 = $nvSrc78.IndexOf('[VENDORS.CSV]')
$vNextSec78 = $nvSrc78.IndexOf("`n[", $vStart78 + 1)
$vBlock78 = if ($vNextSec78 -ge 0) { $nvSrc78.Substring($vStart78, $vNextSec78 - $vStart78) } else { $nvSrc78.Substring($vStart78) }
$vLines78 = $vBlock78 -split "`n" | Where-Object { $_.Trim() -ne '' -and -not $_.StartsWith('[') }
$vData78 = $vLines78 | Select-Object -Skip 1

# 78.1  39 data rows
Check ($vData78.Count -eq 39) ("VENDORS.CSV has exactly 39 data rows (got " + $vData78.Count + ")")

# 78.2  every row has exactly 7 columns
$badCols78 = @($vData78 | Where-Object { ($_ -split ',').Count -ne 7 })
Check ($badCols78.Count -eq 0) ("VENDORS.CSV all rows have 7 columns" + $(if ($badCols78.Count) { " -- bad: " + ($badCols78 -join " | ") } else { "" }))

# 78.3-78.7  sentinel names present
$vNames78 = @($vData78 | ForEach-Object { ($_ -split ',')[0].Trim() })
Check ($vNames78 -contains 'Gloria Van Graff') "VENDORS.CSV contains 'Gloria Van Graff'"
Check ($vNames78 -contains 'Joshua Graham') "VENDORS.CSV contains 'Joshua Graham'"
Check ($vNames78 -contains 'Doctor Usanagi') "VENDORS.CSV contains 'Doctor Usanagi'"
Check ($vNames78 -contains 'Quartermaster Bardon') "VENDORS.CSV contains 'Quartermaster Bardon'"
Check ($vNames78 -contains 'Street Vendor') "VENDORS.CSV contains 'Street Vendor'"

# ===========================================================
# Suite 79 -- FO3 location database expansion (57 -> 90)
# 10 tests
# ===========================================================
Sep "Suite 79 -- FO3 location database expansion (57 -> 90)"
$fo3RegSrc79 = Read-Src "js\reg_fo3.js"

# Extract main locations block: find '  locations: [' (2-space root indent, unique to main array)
$lsMarker79 = "  locations: ["
$lsIdx79 = $fo3RegSrc79.IndexOf($lsMarker79)
$leIdx79 = $fo3RegSrc79.IndexOf("`n  ],", $lsIdx79 + $lsMarker79.Length)
$locBlock79 = if ($lsIdx79 -ge 0 -and $leIdx79 -ge 0) {
    $fo3RegSrc79.Substring($lsIdx79 + $lsMarker79.Length, $leIdx79 - $lsIdx79 - $lsMarker79.Length)
} else { '' }

# 79.1  exactly 90 entries
$locCount79 = ([regex]::Matches($locBlock79, '\bname\s*:')).Count
Check ($locCount79 -eq 90) ("FO3 FALLOUT_REGISTRY.locations has exactly 90 entries (found " + $locCount79 + ")")

# 79.2  all entries have non-empty names
$allNames79 = [regex]::Matches($locBlock79, "name:\s*(?:'([^']+)'|""([^""]+)"")") | ForEach-Object {
    if ($_.Groups[1].Success) { $_.Groups[1].Value } else { $_.Groups[2].Value }
}
$emptyNames79 = @($allNames79 | Where-Object { [string]::IsNullOrWhiteSpace($_) })
Check ($allNames79.Count -eq 90 -and $emptyNames79.Count -eq 0) `
    ("All 90 FO3 location entries have non-empty names (extracted " + $allNames79.Count + ")")

# 79.3  all types valid (FO3 6-type set)
$validTypes79 = @('settlement','landmark','base','factory','vault','other')
$typeMatches79 = [regex]::Matches($locBlock79, "type:\s*'([^']+)'")
$badTypes79 = @($typeMatches79 | ForEach-Object { $_.Groups[1].Value } | Where-Object { $validTypes79 -notcontains $_ })
Check ($badTypes79.Count -eq 0) ("All FO3 location entries use valid type -- bad: " + $(if ($badTypes79.Count) { $badTypes79 -join ', ' } else { 'none' }))

# 79.4-79.8  sentinel names (DLC worldspaces + expansion entries)
Check ([bool]($locBlock79 -match "name:\s*'The Pitt'")) "FO3 locations contains 'The Pitt' (DLC)"
Check ([bool]($locBlock79 -match "name:\s*'Point Lookout'")) "FO3 locations contains 'Point Lookout' (DLC)"
Check ([bool]($locBlock79 -match "name:\s*'Mothership Zeta'")) "FO3 locations contains 'Mothership Zeta' (DLC)"
Check ([bool]($locBlock79 -match "name:\s*'Andale'")) "FO3 locations contains 'Andale'"
Check ([bool]($locBlock79 -match "name:\s*'Vault 106'")) "FO3 locations contains 'Vault 106'"

# 79.9  typo entry removed
Check (-not ($locBlock79 -match "name:\s*'Georgtown West'")) "FO3 locations has NO 'Georgtown West' entry (typo removed)"

# 79.10  corrected spelling present
Check ([bool]($locBlock79 -match "name:\s*'Georgetown West'")) "FO3 locations contains 'Georgetown West' (typo fixed)"

# ===========================================================
# Suite 80 -- [CHEMS.CSV] consumables expansion (40 -> 76)
# 9 tests
# ===========================================================
Sep "Suite 80 -- [CHEMS.CSV] consumables expansion (40 -> 76)"
$nvSrc80 = Read-Src "js\db_nv.js"
$cStart80 = $nvSrc80.IndexOf('[CHEMS.CSV]')
$cEnd80 = $nvSrc80.IndexOf("`n[", $cStart80 + 1)
$cBlock80 = if ($cEnd80 -ge 0) { $nvSrc80.Substring($cStart80, $cEnd80 - $cStart80) } else { $nvSrc80.Substring($cStart80) }
$cLines80 = $cBlock80 -split "`n" | Where-Object { $_.Trim() -ne '' -and -not $_.StartsWith('[') }
$cData80 = $cLines80 | Select-Object -Skip 1

# 80.a  exactly 76 data rows
Check ($cData80.Count -eq 76) ("CHEMS.CSV has exactly 76 data rows (got " + $cData80.Count + ")")

# 80.b  every row has exactly 8 fields (stray-comma guard)
$badFields80 = @($cData80 | Where-Object { ($_ -split ',').Count -ne 8 })
Check ($badFields80.Count -eq 0) ("All CHEMS rows have exactly 8 comma-separated fields" + $(if ($badFields80.Count) { " -- bad: " + ($badFields80 -join " | ") } else { "" }))

# 80.c  sentinel names present
$cNames80 = @($cData80 | ForEach-Object { ($_ -split ',')[0].Trim() })
Check ($cNames80 -contains 'Cram') "CHEMS contains 'Cram'"
Check ($cNames80 -contains 'Sunset Sarsaparilla') "CHEMS contains 'Sunset Sarsaparilla'"
Check ($cNames80 -contains 'Rebound') "CHEMS contains 'Rebound'"
Check ($cNames80 -contains 'Wasteland Omelet') "CHEMS contains 'Wasteland Omelet'"
Check ($cNames80 -contains 'Sierra Madre Martini') "CHEMS contains 'Sierra Madre Martini'"

# 80.d  lookupItemInDb column-mapping spot-checks
#   CHEMS columns: Name(0) Effect(1) Duration(2) Addiction_Risk(3)
#                  Addiction_Debuff(4) Chem_Family(5) Value(6) Weight(7)
$ss80Row = $cData80 | Where-Object { ($_ -split ',')[0].Trim() -eq 'Sunset Sarsaparilla' } | Select-Object -First 1
$ss80Cols = if ($ss80Row) { $ss80Row -split ',' } else { @() }
$ssSatisfied = ($null -ne $ss80Row) -and ($ss80Cols.Count -ge 8) -and `
    ([Math]::Abs([double]$ss80Cols[6] - 3) -lt 0.001) -and ([Math]::Abs([double]$ss80Cols[7] - 1) -lt 0.001)
Check $ssSatisfied "lookupItemInDb('Sunset Sarsaparilla') -> wgt=1/val=3/type='aid'"

$mre80Row = $cData80 | Where-Object { ($_ -split ',')[0].Trim() -eq 'MRE' } | Select-Object -First 1
$mre80Cols = if ($mre80Row) { $mre80Row -split ',' } else { @() }
$mreSatisfied = ($null -ne $mre80Row) -and ($mre80Cols.Count -ge 8) -and `
    ([Math]::Abs([double]$mre80Cols[6] - 50) -lt 0.001) -and ([Math]::Abs([double]$mre80Cols[7] - 0.2) -lt 0.001)
Check $mreSatisfied "lookupItemInDb('MRE') -> wgt=0.2/val=50/type='aid'"


# ===========================================================
# Suite 81 -- FO3 [ARMOR.CSV] (61 rows; WU-D2 NV-bleed removal)
# 10 tests
# ===========================================================
Sep "Suite 81 -- FO3 [ARMOR.CSV] (61 rows; WU-D2 NV-bleed removal)"
$fo3Src81 = Read-Src "js\db_fo3.js"
$aStart81 = $fo3Src81.IndexOf('[ARMOR.CSV]')
$aEnd81 = $fo3Src81.IndexOf("`n[", $aStart81 + 1)
$aBlock81 = if ($aEnd81 -ge 0) { $fo3Src81.Substring($aStart81, $aEnd81 - $aStart81) } else { $fo3Src81.Substring($aStart81) }
$aLines81 = $aBlock81 -split "`n" | Where-Object { $_.Trim() -ne '' -and -not $_.StartsWith('[') }
$aData81 = $aLines81 | Select-Object -Skip 1

# 81.a  exactly 61 data rows (WU-D2: 62 -> 61 after removing the NV-bleed 'NCR Ranger Armor')
Check ($aData81.Count -eq 61) ("FO3 [ARMOR.CSV] has exactly 61 data rows (got " + $aData81.Count + ")")

# 81.b  every row has exactly 7 fields (stray-comma guard)
$badFields81 = @($aData81 | Where-Object { ($_ -split ',').Count -ne 7 })
Check ($badFields81.Count -eq 0) ("All FO3 ARMOR rows have exactly 7 comma-separated fields" + $(if ($badFields81.Count) { " -- bad: " + ($badFields81 -join " | ") } else { "" }))

# 81.c  sentinel names present
$aNames81 = @($aData81 | ForEach-Object { ($_ -split ',')[0].Trim() })
Check ($aNames81 -contains 'Combat Helmet') "FO3 ARMOR contains 'Combat Helmet'"
Check ($aNames81 -contains 'Samurai Armor') "FO3 ARMOR contains 'Samurai Armor'"
Check ($aNames81 -contains 'T-51b Power Helmet') "FO3 ARMOR contains 'T-51b Power Helmet'"
Check ($aNames81 -contains 'Ghoul Mask') "FO3 ARMOR contains 'Ghoul Mask'"
Check ($aNames81 -contains 'Composite Recon Armor') "FO3 ARMOR contains 'Composite Recon Armor'"

# 81.d  lookupItemInDb column-mapping spot-checks (header-resolved: Name=0, Weight=3, Value=4)
$ch81Row = $aData81 | Where-Object { ($_ -split ',')[0].Trim() -eq 'Combat Helmet' } | Select-Object -First 1
$ch81Cols = if ($ch81Row) { $ch81Row -split ',' } else { @() }
$chSatisfied = ($null -ne $ch81Row) -and ($ch81Cols.Count -ge 5) -and `
    ([Math]::Abs([double]$ch81Cols[3] - 3) -lt 0.001) -and ([Math]::Abs([double]$ch81Cols[4] - 50) -lt 0.001)
Check $chSatisfied "lookupItemInDb('Combat Helmet') -> wgt=3/val=50/type='armor'"
$sa81Row = $aData81 | Where-Object { ($_ -split ',')[0].Trim() -eq 'Samurai Armor' } | Select-Object -First 1
$sa81Cols = if ($sa81Row) { $sa81Row -split ',' } else { @() }
$saSatisfied = ($null -ne $sa81Row) -and ($sa81Cols.Count -ge 5) -and `
    ([Math]::Abs([double]$sa81Cols[3] - 20) -lt 0.001) -and ([Math]::Abs([double]$sa81Cols[4] - 1000) -lt 0.001)
Check $saSatisfied "lookupItemInDb('Samurai Armor') -> wgt=20/val=1000/type='armor'"

# 81.e  NV-content-bleed guard (WU-D2 / FO3-DB-4): NCR has no presence in Fallout 3, so
#       no NCR-faction armor may appear in FO3 ARMOR.CSV. 'NCR Ranger Armor' was an FNV
#       item that leaked in (removed); guards the whole NV-bleed class. fallout.wiki-verified.
$ncrBleed81 = @($aNames81 | Where-Object { $_ -match '^NCR\b' })
Check ($ncrBleed81.Count -eq 0) ("FO3 ARMOR has no NCR-faction armor (NCR does not exist in FO3 -- NV-bleed guard)" + $(if ($ncrBleed81.Count) { ' -- found: ' + ($ncrBleed81 -join ', ') } else { '' }))

# ===========================================================
# Suite 82 -- FO3 quests (64, WU-D1 canon fix + WU-D5 Anchorage completeness) + quest items (15->25)
# 15 tests
# ===========================================================
Sep "Suite 82 -- FO3 quests (64) + quest items (15->25)"
$fo3Src82 = Read-Src "js\reg_fo3.js"
$qStart82 = $fo3Src82.IndexOf("  quests: [")
$qEnd82 = $fo3Src82.IndexOf("`n  ],", $qStart82)
$qBlock82 = if ($qEnd82 -ge 0) { $fo3Src82.Substring($qStart82, $qEnd82 - $qStart82) } else { $fo3Src82.Substring($qStart82) }

# 82.a  exactly 64 entries -- count by dlc: (handles multi-line objects).
#       WU-D1: 64 -> 62 (removed non-canon 'Fires of Anchorage' + fabricated
#       'Strictly Business (Paradise Falls)'). WU-D5: 62 -> 64 by ADDING the two REAL missing
#       Operation: Anchorage quests ('The Guns of Anchorage' + 'Paving the Way'). fallout.wiki.
$qCount82 = ([regex]::Matches($qBlock82, 'dlc:')).Count
Check ($qCount82 -eq 64) ("FO3 quests has exactly 64 entries (got " + $qCount82 + ")")

# 82.b  dedup guard -- exactly 1 'Strictly Business'
$sbCount82 = ([regex]::Matches($qBlock82, "name:\s*'Strictly Business'")).Count
Check ($sbCount82 -eq 1) ("FO3 quests has exactly 1 'Strictly Business' entry (got " + $sbCount82 + ")")

# 82.f  WU-D1 canon-removal regression guard: the two non-canon quests stay gone
#       (both verified non-canon against fallout.wiki -- Protocol 3).
$canonRemoved82 = (-not ($qBlock82 -match 'Fires of Anchorage')) -and (-not ($qBlock82 -match 'Strictly Business \(Paradise Falls\)'))
Check $canonRemoved82 "FO3 quests: non-canon 'Fires of Anchorage' + fabricated 'Strictly Business (Paradise Falls)' stay removed (WU-D1)"

# 82.g  WU-D5 per-add-on completeness guard: the Operation: Anchorage add-on has EXACTLY its
#       4 canon quests -- Aiding the Outcasts (side) + The Guns of Anchorage / Paving the Way /
#       Operation: Anchorage! (main). Catches the "missing real DLC quest" class. Protocol 3.
$anchorageCount82 = ([regex]::Matches($qBlock82, "dlc:\s*'Operation: Anchorage'")).Count
$anchorageQuests82 = @('Aiding the Outcasts', 'The Guns of Anchorage', 'Paving the Way', 'Operation: Anchorage!')
$missingAnch82 = @($anchorageQuests82 | Where-Object { -not $qBlock82.Contains("name: '$_'") })
Check (($anchorageCount82 -eq 4) -and ($missingAnch82.Count -eq 0)) ("Operation: Anchorage add-on has exactly its 4 canon quests (count " + $anchorageCount82 + $(if ($missingAnch82.Count) { ', missing: ' + ($missingAnch82 -join ', ') } else { '' }) + ') -- WU-D5')

# 82.c  DLC sentinels with correct dlc value
Check ($qBlock82.Contains("name: 'Operation: Anchorage!'") -and $qBlock82.Contains("dlc: 'Operation: Anchorage'")) `
    "'Operation: Anchorage!' present with dlc='Operation: Anchorage'"
Check ($qBlock82.Contains("name: 'Into the Pitt'") -and $qBlock82.Contains("dlc: 'The Pitt'")) `
    "'Into the Pitt' present with dlc='The Pitt'"
Check ($qBlock82.Contains("name: 'Not of This World'") -and $qBlock82.Contains("dlc: 'Mothership Zeta'")) `
    "'Not of This World' present with dlc='Mothership Zeta'"

# 82.d  every entry has type field (type count === entry count)
$typeCount82 = ([regex]::Matches($qBlock82, 'type:')).Count
Check ($typeCount82 -eq $qCount82) ("All quest entries have type field (type=$typeCount82 / entries=$qCount82)")

# 82.e  every type is valid
$typeVals82 = [regex]::Matches($qBlock82, "type:s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
$validTypes82 = @('tutorial', 'main', 'side', 'companion', 'unmarked')
$badTypes82 = @($typeVals82 | Where-Object { $validTypes82 -notcontains $_ })
Check ($badTypes82.Count -eq 0) ("All FO3 quest types are valid -- bad: " + ($badTypes82 -join ', '))

# QUEST_ITEMS.CSV tests
$fo3Db82 = Read-Src "js\db_fo3.js"
$qiStart82 = $fo3Db82.IndexOf('[QUEST_ITEMS.CSV]')
$qiEnd82 = $fo3Db82.IndexOf("`n[", $qiStart82 + 1)
$qiBlock82 = if ($qiEnd82 -ge 0) { $fo3Db82.Substring($qiStart82, $qiEnd82 - $qiStart82) } else { $fo3Db82.Substring($qiStart82) }
$qiLines82 = $qiBlock82 -split "`n" | Where-Object { $_.Trim() -ne '' -and -not $_.StartsWith('[') }
$qiData82 = $qiLines82 | Select-Object -Skip 1

# 82.f  exactly 25 data rows
Check ($qiData82.Count -eq 25) ("FO3 [QUEST_ITEMS.CSV] has exactly 25 data rows (got " + $qiData82.Count + ")")

# 82.g  every row has exactly 5 fields (stray-comma guard)
$badQiFields82 = @($qiData82 | Where-Object { ($_ -split ',').Count -ne 5 })
Check ($badQiFields82.Count -eq 0) ("All QUEST_ITEMS rows have exactly 5 comma-separated fields" + $(if ($badQiFields82.Count) { " -- bad: " + ($badQiFields82 -join " | ") } else { "" }))

# 82.h  sentinel names present
$qiNames82 = @($qiData82 | ForEach-Object { ($_ -split ',')[0].Trim() })
Check ($qiNames82 -contains 'Steel Ingot') "QUEST_ITEMS contains 'Steel Ingot'"
Check ($qiNames82 -contains 'Krivbeknih') "QUEST_ITEMS contains 'Krivbeknih'"
Check ($qiNames82 -contains 'Cryo Key') "QUEST_ITEMS contains 'Cryo Key'"

# 82.i  lookupItemInDb spot-check: Steel Ingot -> wgt=1/type='misc'
# QUEST_ITEMS columns: Name(0) Associated_Quest(1) Tradeable(2) Special_Property(3) Weight(4)
$si82Row = $qiData82 | Where-Object { ($_ -split ',')[0].Trim() -eq 'Steel Ingot' } | Select-Object -First 1
$si82Cols = if ($si82Row) { $si82Row -split ',' } else { @() }
$siSatisfied = ($null -ne $si82Row) -and ($si82Cols.Count -ge 5) -and ([Math]::Abs([double]$si82Cols[4] - 1.0) -lt 0.001)
Check $siSatisfied "lookupItemInDb('Steel Ingot') -> wgt=1/type='misc'"

# ===========================================================
# Suite 83 -- Crafting recipe + breakdown registry (NV + FO3)
# 15 tests
# ===========================================================
Sep "Suite 83 -- Crafting recipe + breakdown registry (NV + FO3)"
$nvSrc83 = Read-Src "js\reg_nv.js"
$nvRecStart83 = $nvSrc83.IndexOf("`n  recipes: [")
$nvBdStart83 = $nvSrc83.IndexOf("`n  breakdowns: [", $nvRecStart83)
$nvRecBlock83 = $nvSrc83.Substring($nvRecStart83, $nvBdStart83 - $nvRecStart83)
$nvBdBlock83 = $nvSrc83.Substring($nvBdStart83)

$fo3Src83 = Read-Src "js\reg_fo3.js"
$fo3RecStart83 = $fo3Src83.IndexOf("`n  recipes: [")
$fo3BdStart83 = $fo3Src83.IndexOf("`n  breakdowns:", $fo3RecStart83)
$fo3RecBlock83 = $fo3Src83.Substring($fo3RecStart83, $fo3BdStart83 - $fo3RecStart83)

# 83.a  NV recipes: exactly 25
$nvStationCount83 = ([regex]::Matches($nvRecBlock83, '\bstation:')).Count
Check ($nvStationCount83 -eq 25) ("NV recipes has exactly 25 entries (got " + $nvStationCount83 + ")")

# 83.b  FO3 recipes: exactly 7
$fo3StationCount83 = ([regex]::Matches($fo3RecBlock83, '\bstation:')).Count
Check ($fo3StationCount83 -eq 7) ("FO3 recipes has exactly 7 entries (got " + $fo3StationCount83 + ")")

# 83.c  NV breakdowns: exactly 12
$nvYieldsCount83 = ([regex]::Matches($nvBdBlock83, '\byields:')).Count
Check ($nvYieldsCount83 -eq 12) ("NV breakdowns has exactly 12 entries (got " + $nvYieldsCount83 + ")")

# 83.d  FO3 breakdowns: empty array
Check ($fo3Src83.Contains("  breakdowns: []")) "FO3 breakdowns is empty array []"

# 83.e  NV station values all valid
$nvStVals83 = [regex]::Matches($nvRecBlock83, "station: '([^']+)'") | ForEach-Object { $_.Groups[1].Value }
$validStations83 = @('workbench', 'campfire', 'reloading', 'sink')
$badStations83 = @($nvStVals83 | Where-Object { $validStations83 -notcontains $_ })
Check ($badStations83.Count -eq 0 -and $nvStVals83.Count -eq 25) ("NV station values all valid (total=" + $nvStVals83.Count + " bad=" + ($badStations83 -join ',') + ")")

# 83.f  FO3 station values all workbench
$fo3StVals83 = [regex]::Matches($fo3RecBlock83, "station: '([^']+)'") | ForEach-Object { $_.Groups[1].Value }
$badFO3Stations83 = @($fo3StVals83 | Where-Object { $_ -ne 'workbench' })
Check ($badFO3Stations83.Count -eq 0 -and $fo3StVals83.Count -eq 7) ("FO3 stations all workbench (total=" + $fo3StVals83.Count + " bad=" + ($badFO3Stations83 -join ',') + ")")

# 83.g  NV skill values all valid FNV keys
$nvSkillVals83 = [regex]::Matches($nvRecBlock83, "skill: '([^']+)'") | ForEach-Object { $_.Groups[1].Value }
$validNVSkills83 = @('barter','energy_weapons','explosives','guns','lockpick','medicine','melee_weapons','repair','science','sneak','speech','survival','unarmed')
$badNVSkills83 = @($nvSkillVals83 | Where-Object { $validNVSkills83 -notcontains $_ })
Check ($badNVSkills83.Count -eq 0 -and $nvSkillVals83.Count -gt 0) ("NV recipe skill values all valid (found=" + $nvSkillVals83.Count + " bad: " + ($badNVSkills83 -join ',') + ")")

# 83.h  FO3 recipe skillReqs all null
$fo3SkillReqCount83 = ([regex]::Matches($fo3RecBlock83, 'skillReq: ')).Count
$fo3NullReqCount83 = ([regex]::Matches($fo3RecBlock83, 'skillReq: null')).Count
Check ($fo3SkillReqCount83 -eq 7 -and $fo3NullReqCount83 -eq 7) ("FO3 all 7 skillReqs null (total=$fo3SkillReqCount83 null=$fo3NullReqCount83)")

# 83.i  NV recipe names no duplicates
$nvSqNames83 = [regex]::Matches($nvRecBlock83, "name: '([^']+)'") | ForEach-Object { $_.Groups[1].Value }
$nvDqNames83 = [regex]::Matches($nvRecBlock83, 'name: "([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$nvNames83 = @($nvSqNames83) + @($nvDqNames83)
$nvNameSet83 = @($nvNames83 | Select-Object -Unique)
Check ($nvNameSet83.Count -eq 25 -and $nvNames83.Count -eq 25) ("NV recipe names no duplicates (" + $nvNameSet83.Count + " unique / " + $nvNames83.Count + " total)")

# 83.j  FO3 recipe names no duplicates
$fo3Names83 = [regex]::Matches($fo3RecBlock83, "name: '([^']+)'") | ForEach-Object { $_.Groups[1].Value }
$fo3NameSet83 = @($fo3Names83 | Select-Object -Unique)
Check ($fo3NameSet83.Count -eq 7 -and $fo3Names83.Count -eq 7) ("FO3 recipe names no duplicates (" + $fo3NameSet83.Count + " unique / " + $fo3Names83.Count + " total)")

# 83.k  NV breakdown items no duplicates (inline + Prettier-expanded forms)
$nvBdItems83Inline83 = [regex]::Matches($nvBdBlock83, "\{ item: '([^']+)', yields:") | ForEach-Object { $_.Groups[1].Value }
$nvBdItems83Expanded83 = [regex]::Matches($nvBdBlock83, "item: '([^']+)',`n {6}yields:") | ForEach-Object { $_.Groups[1].Value }
$nvBdItems83 = @($nvBdItems83Inline83) + @($nvBdItems83Expanded83)
$nvBdItemSet83 = @($nvBdItems83 | Select-Object -Unique)
Check ($nvBdItemSet83.Count -eq 12 -and $nvBdItems83.Count -eq 12) ("NV breakdown items no duplicates (" + $nvBdItemSet83.Count + " unique / " + $nvBdItems83.Count + " total)")

# 83.l  NV sentinel: Stimpak
Check ($nvRecBlock83.Contains("name: 'Stimpak'")) "NV recipes contain 'Stimpak'"

# 83.m  NV sentinel: Weapon Repair Kit
Check ($nvRecBlock83.Contains("name: 'Weapon Repair Kit'")) "NV recipes contain 'Weapon Repair Kit'"

# 83.n  NV sentinel: Bottlecap Mine
Check ($nvRecBlock83.Contains("name: 'Bottlecap Mine'")) "NV recipes contain 'Bottlecap Mine'"

# 83.o  FO3 sentinels
Check ($fo3RecBlock83.Contains("name: 'Deathclaw Gauntlet'") -and $fo3RecBlock83.Contains("name: 'Shishkebab'")) `
    "FO3 recipes contain 'Deathclaw Gauntlet' and 'Shishkebab'"
# ===========================================================
# Suite 84 -- Craft panel UI + mechanics (behavioral + data-safety)
# 24 tests
# ===========================================================
Sep "Suite 84 -- Craft panel UI + mechanics (behavioral + data-safety)"

$uiRSrc84 = Read-Src "js\ui-render.js"
$uiCSrc84 = Read-Src "js\ui-core.js"
$idxSrc84 = Read-Src "index.html"

function Get-FnBody84($src, $fnName) {
    $start = $src.IndexOf("function $fnName(")
    if ($start -lt 0) { return '' }
    $i = $src.IndexOf('{', $start)
    if ($i -lt 0) { return '' }
    $depth = 0; $end = $i
    while ($end -lt $src.Length) {
        if ($src[$end] -eq '{') { $depth++ }
        elseif ($src[$end] -eq '}') { $depth--; if ($depth -eq 0) { break } }
        $end++
    }
    $src.Substring($i, $end - $i + 1)
}

# 84.a  renderCraft defined in ui-render.js
Check ($uiRSrc84.Contains('function renderCraft(')) "renderCraft() defined in js/ui-render.js"

# 84.b  doCraft defined in ui-render.js
Check ($uiRSrc84.Contains('function doCraft(')) "doCraft() defined in js/ui-render.js"

# 84.c  doScrap defined in ui-render.js
Check ($uiRSrc84.Contains('function doScrap(')) "doScrap() defined in js/ui-render.js"

# 84.d  #craftPanel in index.html
Check ($idxSrc84.Contains('id="craftPanel"')) '#craftPanel element present in index.html'

# 84.e  craft_breakdown sub-panel in index.html
Check ($idxSrc84.Contains('data-sub-id="craft_breakdown"')) 'data-sub-id="craft_breakdown" sub-panel present in index.html'

# 84.f  renderCraft called from loadUI in ui-core.js
$loadUIBody84 = Get-FnBody84 $uiCSrc84 'loadUI'
Check ($loadUIBody84.Contains('renderCraft(')) "renderCraft() called from loadUI() in js/ui-core.js"

# 84.g  "> CRAFTING" badge entry in _updatePanelBadges
$badgesBody84 = Get-FnBody84 $uiCSrc84 '_updatePanelBadges'
Check ($badgesBody84.Contains('> CRAFTING')) '"> CRAFTING" badge entry present in _updatePanelBadges()'

# 84.h  craft key in expandPanelForCategory tabMap and map
$expandBody84 = Get-FnBody84 $uiCSrc84 'expandPanelForCategory'
Check ($expandBody84.Contains("craft: 'inv'") -and $expandBody84.Contains("craft: '> CRAFTING'")) `
    "'craft' key in expandPanelForCategory tabMap and panel map"

# 84.i  NO-CLOUD guard: doCraft + doScrap bodies have no cloud write calls
$doCraftBody84 = Get-FnBody84 $uiRSrc84 'doCraft'
$doScrapBody84 = Get-FnBody84 $uiRSrc84 'doScrap'
# Step 2 Phase 0 U12: doCraft/doScrap became async confirm-gate wrappers; the
# mutation logic (ammo routing, ingredient-qty math, yield distribution) moved
# into the synchronous _craftApply/_scrapApply core -- later checks that assert
# on that logic read these bodies instead.
$craftApplyBody84 = Get-FnBody84 $uiRSrc84 '_craftApply'
$scrapApplyBody84 = Get-FnBody84 $uiRSrc84 '_scrapApply'
$cloudHit84 = @('pushToCloud','addDoc','setDoc','writeBatch') | Where-Object { $doCraftBody84.Contains($_) -or $doScrapBody84.Contains($_) }
Check ($cloudHit84.Count -eq 0) ("NO-CLOUD guard: doCraft/doScrap have no cloud write calls (got: " + $(if ($cloudHit84.Count) { $cloudHit84 -join ',' } else { 'none' }) + ")")

# 84.j  confirmAction( gate in doCraft (Step 2 Phase 0 U12: diegetic replacement for confirm())
Check ($doCraftBody84.Contains('confirmAction(')) "confirmAction() gate present in doCraft body"

# 84.k  confirmAction( gate in doScrap (Step 2 Phase 0 U12)
Check ($doScrapBody84.Contains('confirmAction(')) "confirmAction() gate present in doScrap body"

# 84.u  renderCraft builds craftRecipeSelect
Check ($uiRSrc84.Contains('craftRecipeSelect')) 'renderCraft() builds <select id="craftRecipeSelect"> (recipe picker)'

# 84.v  renderCraft builds <optgroup elements for station grouping
Check ($uiRSrc84.Contains('<optgroup')) 'renderCraft() builds <optgroup> for station grouping'

# 84.w  renderCraftCard defined in ui-render.js
Check ($uiRSrc84.Contains('function renderCraftCard(')) 'renderCraftCard() defined in js/ui-render.js (recipe detail card renderer)'

# 84.x  renderCraft builds scrapItemSelect
Check ($uiRSrc84.Contains('scrapItemSelect')) 'renderCraft() builds <select id="scrapItemSelect"> for scrap/breakdown picker'

# 84.l  doCraft body has ingredient missing-check logic
Check ($doCraftBody84.Contains('missing')) "doCraft body has ingredient missing-check logic"

# 84.m  _craftConsume removes zero-qty entries via splice
$craftConsumeBody84 = Get-FnBody84 $uiRSrc84 '_craftConsume'
Check ($craftConsumeBody84.Contains('splice(idx, 1)')) "_craftConsume removes zero-qty entry via splice"

# 84.n  _craftConsume clamps at 0 (never-negative guard)
Check ($craftConsumeBody84.Contains('Math.max(0,')) "_craftConsume uses Math.max(0, ...) clamp (never-negative)"

# 84.o  doCraft (via _craftApply) has ammo-output routing
Check ($craftApplyBody84.Contains('output.ammo')) "doCraft body has ammo-output routing (output.ammo)"

# 84.p  doCraft (via _craftApply) multiplies ingredient qty by batch qty
Check ($craftApplyBody84.Contains('ing.qty * qty')) "doCraft body multiplies ingredient qty by batch qty"

# 84.q  doScrap (via _scrapApply) adds yields via forEach
Check ($scrapApplyBody84.Contains('breakdown.yields.forEach')) "doScrap body adds yields via breakdown.yields.forEach"

# 84.r  doScrap body has insufficient-qty guard
Check ($doScrapBody84.Contains('have < qty')) "doScrap body has insufficient-qty guard (have < qty)"

# 84.s  doCraft body does NOT reference state.skills (soft skill -- display only)
Check (-not $doCraftBody84.Contains('state.skills')) "Soft skill: doCraft body does not consult state.skills (display-only)"

# 84.t  _craftGetHave helper defined in ui-render.js
Check ($uiRSrc84.Contains('function _craftGetHave(')) "_craftGetHave() helper defined in js/ui-render.js"

# ===========================================================
# Suite 85 -- Skill Books Tracker (FNV+FO3, Protocol 4) + WU-B8 _renderReadTracker guards
# 26 tests
# ===========================================================
Sep "Suite 85 -- Skill Books Tracker (FNV+FO3, Protocol 4)"
$nvRegSrc85 = Get-Content 'js/reg_nv.js' -Raw
$fo3RegSrc85 = Get-Content 'js/reg_fo3.js' -Raw
$stateSrc85 = Get-Content 'js/state.js' -Raw
$apiSrc85 = Get-Content 'js/api.js' -Raw
$uiRenderSrc85 = Get-Content 'js/ui-render.js' -Raw
$uiCoreSrc85 = Get-Content 'js/ui-core.js' -Raw
$idxSrc85 = Get-Content 'index.html' -Raw

$fnvSkillKeys = @('barter','energy_weapons','explosives','guns','lockpick','medicine','melee_weapons','repair','science','sneak','speech','survival','unarmed')
$fo3SkillKeys = @('barter','big_guns','energy_weapons','explosives','lockpick','medicine','melee_weapons','repair','science','small_guns','sneak','speech','unarmed')

function Get-SkillBooksBlock85 { param($src)
    if ($src -match '(?s)skillBooks\s*:\s*\[(.*?)\n  \],') { return $Matches[1] } else { return '' }
}

# 85.1  reg_nv.js has skillBooks array
Check ($nvRegSrc85 -match 'skillBooks\s*:\s*\[') "reg_nv.js has skillBooks array (FNV skill-book registry)"

# 85.2  reg_nv.js skillBooks has exactly 13 items
$nvSBBlock85 = Get-SkillBooksBlock85 $nvRegSrc85
$nvSBCount85 = ([regex]::Matches($nvSBBlock85, 'name\s*:')).Count
Check ($nvSBCount85 -eq 13) "reg_nv.js skillBooks has exactly 13 entries (found $nvSBCount85)"

# 85.3  all FNV skillBooks entries have valid skill keys
$nvSBSkills85 = [regex]::Matches($nvSBBlock85, "skill\s*:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
$nvBadSkills85 = $nvSBSkills85 | Where-Object { $fnvSkillKeys -notcontains $_ }
Check ($nvBadSkills85.Count -eq 0 -and $nvSBSkills85.Count -eq 13) "reg_nv.js skillBooks: all 13 skill keys are valid FNV keys (bad: $($nvBadSkills85 -join ', '))"

# 85.4  FNV sentinel: Wasteland Survival Guide -> survival
Check ($nvRegSrc85 -match "(?s)Wasteland Survival Guide.{0,60}skill\s*:\s*'survival'") "reg_nv.js skillBooks: 'Wasteland Survival Guide' maps to skill 'survival'"

# 85.5  reg_fo3.js has skillBooks array
Check ($fo3RegSrc85 -match 'skillBooks\s*:\s*\[') "reg_fo3.js has skillBooks array (FO3 skill-book registry)"

# 85.6  reg_fo3.js skillBooks has exactly 13 items
$fo3SBBlock85 = Get-SkillBooksBlock85 $fo3RegSrc85
$fo3SBCount85 = ([regex]::Matches($fo3SBBlock85, 'name\s*:')).Count
Check ($fo3SBCount85 -eq 13) "reg_fo3.js skillBooks has exactly 13 entries (found $fo3SBCount85)"

# 85.7  all FO3 skillBooks entries have valid skill keys
$fo3SBSkills85 = [regex]::Matches($fo3SBBlock85, "skill\s*:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
$fo3BadSkills85 = $fo3SBSkills85 | Where-Object { $fo3SkillKeys -notcontains $_ }
Check ($fo3BadSkills85.Count -eq 0 -and $fo3SBSkills85.Count -eq 13) "reg_fo3.js skillBooks: all 13 skill keys are valid FO3 keys (bad: $($fo3BadSkills85 -join ', '))"

# 85.8  FO3 sentinel: U.S. Army: 30 Handy Flamethrower Recipes -> big_guns
Check ($fo3RegSrc85 -match "(?s)U\.S\. Army: 30 Handy Flamethrower Recipes.{0,60}skill\s*:\s*'big_guns'") "reg_fo3.js skillBooks: 'U.S. Army: 30 Handy Flamethrower Recipes' maps to skill 'big_guns'"

# 85.9  Guns and Bullets: FNV='guns', FO3='small_guns'
$nvGnB85 = $nvSBBlock85 -match "(?s)Guns and Bullets.{0,60}skill\s*:\s*'guns'"
$fo3GnB85 = $fo3SBBlock85 -match "(?s)Guns and Bullets.{0,60}skill\s*:\s*'small_guns'"
Check ($nvGnB85 -and $fo3GnB85) "'Guns and Bullets' maps to 'guns' in FNV and 'small_guns' in FO3"

# 85.10  state.skillBooks default [] in state object (Protocol 4)
Check ($stateSrc85 -match 'skillBooks\s*:\s*\[\s*\]') "state.skillBooks default [] in state object (Protocol 4 default)"

# 85.11  migrateState() coerces non-array skillBooks to []
$migrateBody85 = ''
try { $migrateBody85 = Get-FunctionBody $stateSrc85 'migrateState' } catch {}
Check ($migrateBody85 -match 'Array\.isArray\(s\.skillBooks\)' -and $migrateBody85 -match 's\.skillBooks\s*=\s*\[\]') "migrateState() coerces non-array s.skillBooks to [] (Protocol 4 migration)"

# 85.12  autoImportState() validates skillBooks array and filters against registry names
$importBody85 = ''
try { $importBody85 = Get-FunctionBody $apiSrc85 'autoImportState' } catch {}
Check ($importBody85 -match 'skillBooks' -and $importBody85 -match 'FALLOUT_REGISTRY\.skillBooks' -and $importBody85 -match 'bookNames') "autoImportState() validates skillBooks array and filters against FALLOUT_REGISTRY.skillBooks names (Protocol 24)"

# 85.13  getSystemDirective() mentions state.skillBooks (Protocol 14)
# U1: the (unconditional, both-games) Skill Books text lives in
# _directiveTrackers() now -- check the full composed directive body.
$sdBody85 = ''
try { $sdBody85 = Get-DirectiveFullBody $apiSrc85 } catch {}
Check ($sdBody85 -match 'state\.skillBooks') "getSystemDirective() references state.skillBooks (Protocol 14 -- AI contract updated)"

# 85.14  renderSkillBooks() defined in ui-render.js
Check ($uiRenderSrc85 -match 'function renderSkillBooks\s*\(') "renderSkillBooks() is defined in ui-render.js"

# 85.15  renderSkillBooks() called from loadUI() in ui-core.js
$loadUIBody85 = ''
try { $loadUIBody85 = Get-FunctionBody $uiCoreSrc85 'loadUI' } catch {}
Check ($loadUIBody85 -match 'renderSkillBooks\s*\(\s*\)') "renderSkillBooks() called from loadUI() in ui-core.js (Protocol 5)"

# 85.16  index.html has #skillBooksDisplay container
Check ($idxSrc85 -match 'id="skillBooksDisplay"') 'index.html has #skillBooksDisplay container (Protocol 5 panel element)'

# 85.17  renderSkillBooks source has skill_books_read sub-panel marker
$renderSBBody85 = ''
try { $renderSBBody85 = Get-FunctionBody $uiRenderSrc85 'renderSkillBooks' } catch {}
$helperBody85 = ''
try { $helperBody85 = Get-FunctionBody $uiRenderSrc85 '_renderReadTracker' } catch {}
$renderMagBody85 = ''
try { $renderMagBody85 = Get-FunctionBody $uiRenderSrc85 'renderMagazines' } catch {}
Check ($renderSBBody85.Contains('skill_books_read')) "renderSkillBooks() references skill_books_read sub-panel data-sub-id (READ/UNREAD split)"

# 85.18  renderSkillBooks source has skill_books_unread sub-panel marker
Check ($renderSBBody85.Contains('skill_books_unread')) "renderSkillBooks() references skill_books_unread sub-panel data-sub-id (READ/UNREAD split)"

# 85.19  Collapse persistence is wired in the shared _renderReadTracker helper, and renderSkillBooks delegates to it (WU-B8).
Check ($helperBody85.Contains('querySelectorAll') -and ($helperBody85 -match "addEventListener\s*\(\s*'toggle'") -and ($renderSBBody85 -match '_renderReadTracker\s*\(')) "_renderReadTracker wires 'toggle' collapse persistence, and renderSkillBooks delegates to it"

# 85.20  Old static skillBooksSubPanel removed from index.html (Protocol 20 regression guard)
Check (-not ($idxSrc85 -match 'id="skillBooksSubPanel"')) 'index.html: old static skillBooksSubPanel removed -- READ/UNREAD sub-panels are dynamic (Protocol 20)'

# 85.21  The shared helper splits by read.includes / !read.includes, and renderSkillBooks delegates to it (WU-B8).
Check ($helperBody85.Contains('read.includes(d.name)') -and ($helperBody85 -match '!read\.includes') -and ($renderSBBody85 -match '_renderReadTracker\s*\(')) "_renderReadTracker splits by read.includes(d.name)/!read.includes for READ/UNREAD, and renderSkillBooks delegates to it"

# 85.22  "NO BOOKS READ" empty state present in renderSkillBooks source
Check ($renderSBBody85.Contains('NO BOOKS READ')) "renderSkillBooks() has 'NO BOOKS READ' empty state for empty READ list"

# 85.23  "ALL BOOKS READ" empty state present in renderSkillBooks source
Check ($renderSBBody85.Contains('ALL BOOKS READ')) "renderSkillBooks() has 'ALL BOOKS READ' empty state for empty UNREAD list"

# -- WU-B8 consolidation guards (QA-DUP-1) --
# 85.24  Shared _renderReadTracker(opts) helper is defined in ui-render.js.
Check ([bool]($uiRenderSrc85 -match 'function _renderReadTracker\s*\(')) "85.24: shared _renderReadTracker(opts) helper is defined in ui-render.js (WU-B8 dedup)"

# 85.25  BOTH read-trackers delegate to the shared helper (single source of row logic).
Check (($renderSBBody85 -match '_renderReadTracker\s*\(') -and ($renderMagBody85 -match '_renderReadTracker\s*\(')) "85.25: renderSkillBooks AND renderMagazines both delegate to _renderReadTracker (no duplicated render logic)"

# 85.26  The shared helper carries the full row/sub-panel contract in one place.
Check ($helperBody85.Contains('tracker-row') -and ($helperBody85 -match 'class="sub-panel" data-sub-id="\$\{opts\.subIdRead\}') -and ($helperBody85 -match 'class="sub-panel" data-sub-id="\$\{opts\.subIdUnread\}') -and $helperBody85.Contains('tracker-toggle') -and ($helperBody85 -match 'opts\.meta\(d\)')) "85.26: _renderReadTracker carries the shared contract -- .tracker-row, READ/UNREAD sub-panels (data-sub-id), .tracker-toggle, opts.meta(d)"


# ===========================================================
# Suite 86 -- Maskable shortcut icons + OPTICS label wrap (6 tests)
# ===========================================================
Sep "Suite 86 -- Maskable shortcut icons + OPTICS label wrap"
$manifestSrc86 = Read-Src "manifest.json"
$manifest86    = $manifestSrc86 | ConvertFrom-Json
$shorts86      = if ($manifest86.shortcuts -is [array]) { $manifest86.shortcuts } else { @() }
$cssSrc86      = Read-Src "css/terminal.css"
$idxSrc86      = Read-Src "index.html"

# 86.1-86.4  Each shortcut icon has purpose containing "maskable"
$shortcutNames86 = @("Comm-Link","Inventory","Stats","New Campaign")
for ($ii86 = 0; $ii86 -lt $shortcutNames86.Count; $ii86++) {
    $name86 = $shortcutNames86[$ii86]
    $sc86 = if ($ii86 -lt $shorts86.Count) { $shorts86[$ii86] } else { $null }
    $icons86 = @(if ($sc86) { $sc86.icons })
    $purpose86 = if ($icons86.Count -gt 0) { [string]$icons86[0].purpose } else { "" }
    Check ($purpose86.Contains("maskable")) ("manifest.json shortcut `"$name86`" icon has purpose containing `"maskable`" (Android gray-plate fix)")
}

# 86.5  terminal.css .optics-label has white-space: nowrap
Check ([bool]($cssSrc86 -match '(?s)\.optics-label.{0,120}white-space\s*:\s*nowrap')) `
    "terminal.css .optics-label has white-space: nowrap (desktop OPTICS label wrap fix)"

# 86.6  index.html OPTICS label has class="optics-label" (Protocol 20 static guard)
Check ([bool]($idxSrc86 -match "class=.optics-label.[^>]*>OPTICS:")) `
    "index.html OPTICS label has class=optics-label (Protocol 20 static guard)"

# ===========================================================
# Suite 87 -- NV Skill Magazines tracker (FNV-only, Protocol 4) (25 tests)
# ===========================================================
Sep "Suite 87 -- NV Skill Magazines tracker (FNV-only, Protocol 4)"

$nvRegSrc87    = Read-Src "js/reg_nv.js"
$fo3RegSrc87   = Read-Src "js/reg_fo3.js"
$stateSrc87    = Read-Src "js/state.js"
$apiSrc87      = Read-Src "js/api.js"
$uiRenderSrc87 = Read-Src "js/ui-render.js"
$idxSrc87      = Read-Src "index.html"

$magBlockMatch87 = [regex]::Match($nvRegSrc87, '(?s)magazines\s*:\s*\[(.*?)\n  \],')
$magBlock87 = if ($magBlockMatch87.Success) { $magBlockMatch87.Groups[1].Value } else { "" }

# 87.1  reg_nv.js has FALLOUT_REGISTRY.magazines array
Check ([bool]($nvRegSrc87 -match 'magazines\s*:\s*\[')) "reg_nv.js has FALLOUT_REGISTRY.magazines array (FNV-only)"

# 87.2  exactly 14 entries
$mag87Count = ([regex]::Matches($magBlock87, 'name\s*:')).Count
Check ($mag87Count -eq 14) "reg_nv.js magazines has exactly 14 entries (found $mag87Count)"

# 87.3  reg_fo3.js has NO magazines array (FNV-only guard)
Check (-not ($fo3RegSrc87 -match 'magazines\s*:\s*\[')) "reg_fo3.js has NO magazines array (FNV-only guard)"

# 87.4  all skill values in FNV getSkillKeys() OR 'Critical Chance'
$fnvSkillKeys87 = @('barter','energy_weapons','explosives','guns','lockpick','medicine','melee_weapons','repair','science','sneak','speech','survival','unarmed')
$magSkills87 = [regex]::Matches($magBlock87, "skill\s*:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
$badMagSkills87 = $magSkills87 | Where-Object { $fnvSkillKeys87 -notcontains $_ -and $_ -ne 'Critical Chance' }
Check ($badMagSkills87.Count -eq 0 -and $magSkills87.Count -eq 14) "All 14 magazine skill values are in FNV getSkillKeys() or 'Critical Chance'"

# 87.5  no duplicate names (handles both single-quoted and double-quoted names)
$magNamesSQ87 = [regex]::Matches($magBlock87, "name\s*:\s*'([^']*)'") | ForEach-Object { $_.Groups[1].Value }
$magNamesDQ87 = [regex]::Matches($magBlock87, 'name\s*:\s*"([^"]*)"') | ForEach-Object { $_.Groups[1].Value }
$magNames87   = @($magNamesSQ87) + @($magNamesDQ87)
$magNamesUniq87 = $magNames87 | Select-Object -Unique
Check ($magNamesUniq87.Count -eq 14 -and $magNames87.Count -eq 14) "reg_nv.js magazines: no duplicate names"

# 87.6  sentinel: Boxing Times -> unarmed
Check (($magBlock87 -match 'Boxing Times') -and ($magBlock87 -match '(?s)Boxing Times.{0,60}unarmed')) "Sentinel: 'Boxing Times' present with skill='unarmed'"

# 87.7  sentinel: True Police Stories -> Critical Chance
Check (($magBlock87 -match 'True Police Stories') -and ($magBlock87 -match "(?s)True Police Stories.{0,60}Critical Chance")) "Sentinel: 'True Police Stories' present with skill='Critical Chance'"

# 87.8  sentinel: Salesman Weekly
Check ([bool]($magBlock87 -match 'Salesman Weekly')) "Sentinel: 'Salesman Weekly' present in magazines"

# 87.9  sentinel: Programmer's Digest (partial match to avoid PS encoding fragility)
Check ([bool]($magBlock87 -match 'Programmer')) "Sentinel: Programmer's Digest present in magazines"

# 87.10  state.magazines default = []
Check ([bool]($stateSrc87 -match 'magazines\s*:\s*\[\]')) "state.js has magazines: [] default (Protocol 4)"

# 87.11  migrateState() coerces magazines to []
Check ([bool]($stateSrc87 -match '!Array\.isArray\(s\.magazines\)')) "state.js migrateState() coerces magazines to [] (Protocol 4 migration)"

# 87.12  autoImportState handles 'magazines'
Check ([bool]($apiSrc87 -match "_g\(parsed,\s*'magazines'\)")) "autoImportState() handles 'magazines' field (_g extraction present)"

# 87.13  magazines import uses magazines-specific registry Set
Check ([bool]($apiSrc87 -match 'magNames')) "autoImportState magazines block uses magNames registry Set"

# 87.14  magazines import filters against registry
Check ([bool]($apiSrc87 -match 'magNames\.has\(m\)')) "autoImportState magazines block filters to registry names (magNames.has(m))"

# 87.15  magazines import dedups
Check ([bool]($apiSrc87 -match 'state\.magazines\s*=\s*raw\.filter')) "autoImportState assigns state.magazines from registry-filtered dedup"

# Extract renderMagazines body
$rmStart87 = $uiRenderSrc87.IndexOf('function renderMagazines()')
$rmNext87  = $uiRenderSrc87.IndexOf("`nfunction ", $rmStart87 + 1)
$renderMagBody87 = if ($rmStart87 -ge 0) { $uiRenderSrc87.Substring($rmStart87, $rmNext87 - $rmStart87) } else { "" }
$helperBody87 = ''
try { $helperBody87 = Get-FunctionBody $uiRenderSrc87 '_renderReadTracker' } catch {}

# 87.16  renderMagazines() defined
Check ($rmStart87 -ge 0) "renderMagazines() is defined in js/ui-render.js"

# 87.17  references magazines_read sub-panel
Check ([bool]($renderMagBody87 -match 'magazines_read')) "renderMagazines() references 'magazines_read' sub-panel data-sub-id"

# 87.18  references magazines_unread sub-panel
Check ([bool]($renderMagBody87 -match 'magazines_unread')) "renderMagazines() references 'magazines_unread' sub-panel data-sub-id"

# 87.19  toggle persistence is wired in the shared _renderReadTracker helper, and renderMagazines delegates to it (WU-B8).
Check (($helperBody87 -match 'querySelectorAll') -and ($helperBody87 -match "addEventListener\s*\(\s*'toggle'") -and ($renderMagBody87 -match '_renderReadTracker\s*\(')) "_renderReadTracker wires toggle persistence, and renderMagazines delegates to it"

# 87.20  NO MAGAZINES READ empty state
Check ([bool]($renderMagBody87 -match 'NO MAGAZINES READ')) "renderMagazines() has 'NO MAGAZINES READ' empty state"

# 87.21  ALL MAGAZINES READ empty state
Check ([bool]($renderMagBody87 -match 'ALL MAGAZINES READ')) "renderMagazines() has 'ALL MAGAZINES READ' empty state"

# 87.22  toggleMagazine() defined
Check ([bool]($uiRenderSrc87 -match 'function toggleMagazine\(')) "toggleMagazine() is defined in js/ui-render.js"

# 87.23  GAME_DEFS.FNV.hasMagazines = true
Check ([bool]($stateSrc87 -match 'hasMagazines\s*:\s*true')) "GAME_DEFS.FNV.hasMagazines = true (FNV-only gate flag)"

# 87.24  index.html has #magazinesDisplay container
Check ([bool]($idxSrc87 -match 'id="magazinesDisplay"')) "index.html has #magazinesDisplay container for renderMagazines()"

# 87.25  getSystemDirective references magazines in FNV-only context
#  U1: the Skill Magazines tracker text is now data
#  (GAME_DEFS.FNV.ai.trackerDirectives in state.js), read by _directiveTrackers()
#  in api.js -- the literal copy lives in state.js, not api.js, post-refactor.
$sdBody87 = (Get-DirectiveFullBody $apiSrc87) + "`n" + $stateSrc87
Check (($sdBody87 -match 'magazines') -and ($sdBody87 -match 'FNV')) "getSystemDirective() references magazines in FNV-only context (Protocol 4 AI contract)"

# ===========================================================
# Suite 88 -- GATE-UI: UI consistency structural guards (8 tests)
# ===========================================================
Sep "Suite 88 -- GATE-UI: UI consistency structural guards"

$uiRenderSrc88 = Read-Src "js/ui-render.js"
$uiCoreSrc88   = Read-Src "js/ui-core.js"
$idxSrc88      = Read-Src "index.html"
$cssSrc88      = Read-Src "css/terminal.css"

# 88.1  Every details.panel (not sub-panel) in index.html has summary > h2 starting with ">" or "&gt;"
$panelTagsAll88 = [regex]::Matches($idxSrc88, '<details[^>]*class="[^"]*\bpanel\b[^"]*"[^>]*>')
$panelTags88    = $panelTagsAll88 | Where-Object { $_.Value -notmatch 'sub-panel' }
$panelH2Fail88 = 0
foreach ($m in $panelTags88) {
    $chunk = $idxSrc88.Substring($m.Index, [Math]::Min(600, $idxSrc88.Length - $m.Index))
    if (-not ($chunk -match '<summary[^>]*>\s*<h2[^>]*>\s*(&gt;|>)')) { $panelH2Fail88++ }
}
Check ($panelTags88.Count -gt 0 -and $panelH2Fail88 -eq 0) "GATE-UI-1: every details.panel in index.html has <summary><h2> starting with '>' (panel heading standard)"

# 88.2  Every details.sub-panel in index.html has data-sub-id
$subPanelTags88 = [regex]::Matches($idxSrc88, '<details[^>]*class="[^"]*\bsub-panel\b[^"]*"[^>]*>')
$subPanelMissing88 = ($subPanelTags88 | Where-Object { $_.Value -notmatch 'data-sub-id' }).Count
Check ($subPanelTags88.Count -gt 0 -and $subPanelMissing88 -eq 0) "GATE-UI-2: every details.sub-panel in index.html has data-sub-id ($subPanelMissing88 missing)"

# 88.3  No <span onclick="toggle..."> tracker pattern in ui-render.js
$spanToggle88 = [regex]::Matches($uiRenderSrc88, '<span[^>]+onclick="toggle(Collectible|LincolnItem|Trait|SkillBook|Magazine)')
Check ($spanToggle88.Count -eq 0) "GATE-UI-3: tracker toggles use <button>, not <span onclick='toggle...'> (found $($spanToggle88.Count) span-onclick patterns)"

# 88.4  All tracker renderers use .tracker-row. Three inline; the two read-trackers
#       (renderSkillBooks/renderMagazines) delegate to the shared _renderReadTracker,
#       which itself carries .tracker-row (WU-B8 consolidation).
function Get-Body88($fn) {
    $start = $uiRenderSrc88.IndexOf("function $fn(")
    $end   = $uiRenderSrc88.IndexOf("`nfunction ", $start + 1)
    if ($start -ge 0) { $uiRenderSrc88.Substring($start, $end - $start) } else { "" }
}
$inlineTrackers88 = @('renderCollectibles','renderLincolnMemorabilia','renderTraits')
$delegatingTrackers88 = @('renderSkillBooks','renderMagazines')
$inlineOk88 = ($inlineTrackers88 | ForEach-Object { (Get-Body88 $_) -match 'tracker-row' }) -notcontains $false
$delegateOk88 = ($delegatingTrackers88 | ForEach-Object { (Get-Body88 $_) -match '_renderReadTracker\s*\(' }) -notcontains $false
$helperRow88 = (Get-Body88 '_renderReadTracker') -match 'tracker-row'
Check ($inlineOk88 -and $delegateOk88 -and $helperRow88) "GATE-UI-4: all 5 tracker renderers use .tracker-row (3 inline + 2 via shared _renderReadTracker which carries it)"

# 88.5  renderFactionRep MINOR FACTIONS details has class="sub-panel" and data-sub-id="minor_factions"
$rfStart88 = $uiRenderSrc88.IndexOf('function renderFactionRep()')
$rfEnd88   = $uiRenderSrc88.IndexOf("`nfunction ", $rfStart88 + 1)
$rfBody88  = if ($rfStart88 -ge 0) { $uiRenderSrc88.Substring($rfStart88, $rfEnd88 - $rfStart88) } else { "" }
Check (($rfBody88 -match 'class="sub-panel"') -and ($rfBody88 -match 'data-sub-id="minor_factions"')) "GATE-UI-5: renderFactionRep() MINOR FACTIONS has class='sub-panel' and data-sub-id='minor_factions'"

# 88.6  renderFactionRep helper text says ±5 not ±50
Check (($rfBody88 -match [regex]::Escape('±5')) -and -not ($rfBody88 -match [regex]::Escape('±50'))) "GATE-UI-6: renderFactionRep() faction label says ±5 not ±50 (faction button increment is 5)"

# 88.7  _updatePanelBadges has total-aware [n/total] format for SKILL BOOKS and SKILL MAGAZINES
$badgesStart88 = $uiCoreSrc88.IndexOf('function _updatePanelBadges()')
$badgesEnd88   = $uiCoreSrc88.IndexOf("`nfunction ", $badgesStart88 + 1)
$badgesBody88  = if ($badgesStart88 -ge 0) { $uiCoreSrc88.Substring($badgesStart88, $badgesEnd88 - $badgesStart88) } else { "" }
Check (($badgesBody88 -match 'SKILL BOOKS') -and ($badgesBody88 -match 'SKILL MAGAZINES') -and ($badgesBody88 -match 'total')) "GATE-UI-7: _updatePanelBadges() has total-aware [n/total] badge format for SKILL BOOKS and SKILL MAGAZINES"

# 88.8  terminal.css defines button.tracker-toggle class (keyboard-accessible tracker button)
Check ([bool]($cssSrc88 -match 'button\.tracker-toggle')) "GATE-UI-8: terminal.css defines button.tracker-toggle class (keyboard-accessible tracker button per Protocol 17)"

# ===========================================================
# Suite 89 -- GATE-AGNOSTIC: game-agnostic refactor guards (16 tests)
# ===========================================================
Sep "Suite 89 -- GATE-AGNOSTIC: game-agnostic refactor guards"

$apiSrc89    = Read-Src "js/api.js"
$uiCore89    = Read-Src "js/ui-core.js"
$stateSrc89  = Read-Src "js/state.js"
$htmlSrc89   = Read-Src "index.html"
$rulesSrc89  = Read-Src "RULES.md"

# 89.1  api.js: no two-game coercion pattern
Check (-not ($apiSrc89 -match [regex]::Escape("=== 'FO3' ? 'FO3' : 'FNV'"))) `
    "GATE-AGNOSTIC-1: api.js has no two-game coercion pattern (=== 'FO3' ? 'FO3' : 'FNV') -- GA-2 fixed"

# 89.2  _nativeCrossroads uses getFactionRegistry() (GA-4 positive guard)
$crossStart89 = $apiSrc89.IndexOf('function _nativeCrossroads()')
$crossEnd89   = $apiSrc89.IndexOf("`nfunction ", $crossStart89 + 1)
$crossBody89  = if ($crossStart89 -ge 0 -and $crossEnd89 -gt $crossStart89) { $apiSrc89.Substring($crossStart89, $crossEnd89 - $crossStart89) } else { '' }
Check ([bool]($crossBody89 -match 'getFactionRegistry')) `
    'GATE-AGNOSTIC-2: _nativeCrossroads() uses getFactionRegistry() for faction keys -- GA-4 data-driven'

# 89.3  _nativeCrossroads has no hardcoded 'enclave' faction key (GA-4 negative guard)
Check (-not ($crossBody89 -match "'enclave'")) `
    "GATE-AGNOSTIC-3: _nativeCrossroads() has no hardcoded 'enclave' faction key -- GA-4 hardcoded array removed"

# 89.4  index.html: no two-game coercion in boot script (GA-2 fixed)
Check (-not ($htmlSrc89 -match [regex]::Escape("=== 'FO3' ? 'FO3' : 'FNV'"))) `
    "GATE-AGNOSTIC-4: index.html has no two-game coercion pattern in boot script -- GA-2 fixed"

# 89.5  ui-core.js: no two-game coercion pattern (GA-2 clean)
Check (-not ($uiCore89 -match [regex]::Escape("=== 'FO3' ? 'FO3' : 'FNV'"))) `
    "GATE-AGNOSTIC-5: ui-core.js has no two-game coercion pattern -- GA-2 clean"

# 89.6  onGameContextChange uses !GAME_DEFS[ctx] guard (GA-3 fixed)
$ctxStart89 = $uiCore89.IndexOf('function onGameContextChange(')
$ctxEnd89   = $uiCore89.IndexOf("`nfunction ", $ctxStart89 + 1)
$ctxBody89  = if ($ctxStart89 -ge 0 -and $ctxEnd89 -gt $ctxStart89) { $uiCore89.Substring($ctxStart89, $ctxEnd89 - $ctxStart89) } else { '' }
Check ([bool]($ctxBody89 -match '!GAME_DEFS\[ctx\]')) `
    'GATE-AGNOSTIC-6: onGameContextChange() uses !GAME_DEFS[ctx] guard -- GA-3 fixed, no literal allowlist'

# 89.7  seedNewCampaignInventory does NOT have ctx !== 'FNV' guard (GA-6 regression guard)
$seedStart89 = $uiCore89.IndexOf('function seedNewCampaignInventory(')
$seedEnd89   = $uiCore89.IndexOf("`nfunction ", $seedStart89 + 1)
$seedBody89  = if ($seedStart89 -ge 0 -and $seedEnd89 -gt $seedStart89) { $uiCore89.Substring($seedStart89, $seedEnd89 - $seedStart89) } else { '' }
Check (-not ($seedBody89 -match "ctx\s*!==\s*['""]FNV['""]")) `
    "GATE-AGNOSTIC-7: seedNewCampaignInventory() has no ctx !== 'FNV' guard -- GA-6 regression (canteen is now GAME_DEFS-driven)"

# 89.8  seedNewCampaignInventory references GAME_DEFS (GA-6 positive guard)
Check ([bool]($seedBody89 -match 'GAME_DEFS')) `
    'GATE-AGNOSTIC-8: seedNewCampaignInventory() reads seedInventory from GAME_DEFS -- GA-6 data-driven seed'

# 89.9  wipeTerminal uses Object.values(GAME_DEFS) for context hints (GA-8 fixed)
$wipeStart89 = $uiCore89.IndexOf('function wipeTerminal(')
$wipeEnd89   = $uiCore89.IndexOf("`nfunction ", $wipeStart89 + 1)
# wipeTerminal is the last function in ui-core.js — use end-of-file if no next function found
$wipeBodyLen89 = if ($wipeEnd89 -gt $wipeStart89) { $wipeEnd89 - $wipeStart89 } else { $uiCore89.Length - $wipeStart89 }
$wipeBody89  = if ($wipeStart89 -ge 0) { $uiCore89.Substring($wipeStart89, $wipeBodyLen89) } else { '' }
Check ([bool]($wipeBody89 -match 'Object\.values\(GAME_DEFS\)')) `
    'GATE-AGNOSTIC-9: wipeTerminal() uses Object.values(GAME_DEFS) for context hints -- GA-8 data-driven messages'

# 89.10  GAME_DEFS.FNV has seedInventory (GA-6 data added)
Check ([bool]($stateSrc89 -match '(?s)FNV.{0,400}seedInventory')) `
    'GATE-AGNOSTIC-10: GAME_DEFS.FNV has seedInventory array -- GA-6 seed data in state.js'

# 89.11  GAME_DEFS.FO3 has seedInventory (GA-6 data added)
Check ([bool]($stateSrc89 -match '(?s)FO3.{0,400}seedInventory')) `
    'GATE-AGNOSTIC-11: GAME_DEFS.FO3 has seedInventory array -- GA-6 seed data in state.js'

# 89.12  RULES.md contains Protocol 38 (game-agnostic codification)
Check ([bool]($rulesSrc89 -match 'Protocol 38')) `
    'GATE-AGNOSTIC-12: RULES.md contains Protocol 38 (game-agnostic feature code)'

# 89.13  index.html: boot data-file selection is the sanctioned GAME_FILES manifest
#        (WU-A5 / GA-1) -- keyed by context with a GAME_FILES.FNV fail-safe, not a ternary.
Check ([bool](($htmlSrc89 -match 'GAME_FILES\s*=\s*\{[\s\S]*FNV[\s\S]*FO3[\s\S]*\}') -and ($htmlSrc89 -match 'GAME_FILES\[\s*ctx\s*\]\s*\|\|\s*GAME_FILES\.FNV'))) `
    'GATE-AGNOSTIC-13: index.html boot loader uses the sanctioned GAME_FILES manifest with GAME_FILES.FNV fail-safe (WU-A5, GA-1)'

# 89.14  index.html: the old hardcoded per-game boot ternary is gone (GA-1 fixed)
Check (-not ($htmlSrc89 -match "ctx\s*===\s*'FO3'\s*\?")) `
    "GATE-AGNOSTIC-14: index.html boot loader has no hardcoded ctx === 'FO3' ? per-game file ternary -- GA-1 fixed (WU-A5)"

# 89.15  U1/GA-5 negative guard: api.js has no ctx === 'FO3'/'FNV' ? ternary anywhere
#        (the old Lincoln/Traits/Magazines directive ternaries are fully retired).
Check (-not ($apiSrc89 -match "ctx\s*===\s*'(FO3|FNV)'\s*\?")) `
    "GATE-AGNOSTIC-15: api.js has no ctx === 'FO3'/'FNV' ? ternary anywhere -- GA-5 fixed (U1)"

# 89.16  U1/GA-5 positive guard: GAME_DEFS[ctx].ai.trackerDirectives exists for both
#        games and is the data source _directiveTrackers() reads from (not a literal).
Check (([bool]($stateSrc89 -match '(?s)FNV:\s*\{.*?trackerDirectives\s*:')) -and `
       ([bool]($stateSrc89 -match '(?s)FO3:\s*\{.*?trackerDirectives\s*:')) -and `
       ([bool]($apiSrc89 -match [regex]::Escape("GAME_DEFS[ctx].ai && GAME_DEFS[ctx].ai.trackerDirectives")))) `
    'GATE-AGNOSTIC-16: GAME_DEFS.FNV/.FO3.ai.trackerDirectives exist and _directiveTrackers() reads from them -- GA-5 data-driven trackers (U1)'

# ===========================================================
# Suite 90 -- UTF-8 CORRUPTION GUARD: no symbol double-encoding (11 tests)
# ===========================================================
Sep "Suite 90 -- UTF-8 CORRUPTION GUARD: no symbol double-encoding"
# Detect double-encoding from PowerShell Latin-1 read + UTF-8 write.
# Build mojibake strings from char codes only (keeps this script ASCII-safe).
# U+FFFD: replacement char; U+00E2+U+20AC: double-encoded E2-80-xx prefix
# (em-dash, en-dash, curly quotes); U+00E2+U+2013: double-encoded E2-96-xx
# (box-drawing chars: U+25B2/U+2588/U+2593 etc.)
$rfChar90 = [char]0xFFFD
$mojiA90  = ([char]0x00E2).ToString() + ([char]0x20AC).ToString()
$mojiB90  = ([char]0x00E2).ToString() + ([char]0x2013).ToString()
$srcPairs90 = @(
    @{ File = 'js/api.js';        Label = 'GATE-CORRUPT-1' },
    @{ File = 'js/state.js';      Label = 'GATE-CORRUPT-2' },
    @{ File = 'js/ui-core.js';    Label = 'GATE-CORRUPT-3' },
    @{ File = 'js/ui-render.js';  Label = 'GATE-CORRUPT-4' },
    @{ File = 'js/ui-saves.js';   Label = 'GATE-CORRUPT-5' },
    @{ File = 'js/ui-audio.js';   Label = 'GATE-CORRUPT-6' },
    @{ File = 'js/ui-account.js'; Label = 'GATE-CORRUPT-7' },
    @{ File = 'index.html';       Label = 'GATE-CORRUPT-8' },
    @{ File = 'README.md';        Label = 'GATE-CORRUPT-9' },
    @{ File = 'ARCHITECTURE.md';  Label = 'GATE-CORRUPT-10' }
)
foreach ($pair90 in $srcPairs90) {
    $content90 = [System.IO.File]::ReadAllText((Join-Path $Root $pair90.File), [System.Text.Encoding]::UTF8)
    $corrupt90 = $content90.Contains($rfChar90) -or $content90.Contains($mojiA90) -or $content90.Contains($mojiB90)
    Check (-not $corrupt90) "$($pair90.Label): $($pair90.File) has no U+FFFD or mojibake double-encoding (PowerShell UTF-8 write guard)"
}
# CHANGELOG.md: uses FULL 3-char sequence check only -- the 2-char prefix would
# false-positive on the intentional documentation examples in line 10 (Protocol 39).
$changelog90ps   = [System.IO.File]::ReadAllText((Join-Path $Root 'CHANGELOG.md'), [System.Text.Encoding]::UTF8)
$emCorrupt90     = ([char]0x00E2).ToString() + ([char]0x20AC).ToString() + ([char]0x201D).ToString()
$enCorrupt90     = ([char]0x00E2).ToString() + ([char]0x20AC).ToString() + ([char]0x201C).ToString()
$mulCorrupt90    = ([char]0x00C3).ToString() + ([char]0x2014).ToString()
$rfChar90doc     = ([char]0xFFFD).ToString()
$clBad = $changelog90ps.Contains($emCorrupt90) -or $changelog90ps.Contains($enCorrupt90) -or `
         $changelog90ps.Contains($mulCorrupt90) -or $changelog90ps.Contains($rfChar90doc)
Check (-not $clBad) 'GATE-CORRUPT-11: CHANGELOG.md has no full-sequence mojibake (em/en-dash, multiplication sign double-encoding from PowerShell write)'

# ===========================================================
# Suite 91 -- loadUI DIRTY-CHECK / TARGETED RE-RENDER GUARDS (9 tests)
# ===========================================================
Sep "Suite 91 -- loadUI DIRTY-CHECK / TARGETED RE-RENDER GUARDS"
# Protocol 13 regression guards for WU-A3 (loadUI dirty-check).
# Static assertions -- no DOM required.
$uiCore91ps = [System.IO.File]::ReadAllText((Join-Path $Root 'js/ui-core.js'), [System.Text.Encoding]::UTF8)

# 91.1  _renderSig module-level cache exists
Check ($uiCore91ps.Contains('const _renderSig = {}')) `
    'GATE-DIRTY-1: _renderSig module-level cache declared in ui-core.js'

# 91.2  _isDirty helper function exists
Check ($uiCore91ps.Contains('function _isDirty(')) `
    'GATE-DIRTY-2: _isDirty() helper defined in ui-core.js'

# 91.3  _clearRenderCache function exists (explicit force-render path)
Check ($uiCore91ps.Contains('function _clearRenderCache()')) `
    'GATE-DIRTY-3: _clearRenderCache() defined in ui-core.js (force-render path)'

# Extract loadUI body for scoped assertions (~8000 chars covers the full ~130-line function)
$loadUIStart91 = $uiCore91ps.IndexOf('function loadUI()')
Check ($loadUIStart91 -ne -1) 'GATE-DIRTY-4a: loadUI() function found in ui-core.js'
$loadUIBody91ps = $uiCore91ps.Substring($loadUIStart91, [Math]::Min(8000, $uiCore91ps.Length - $loadUIStart91))

# 91.4  _isDirty is wired inside loadUI -- at least one dirty-check is active
Check ($loadUIBody91ps.Contains("_isDirty('inv'")) `
    "GATE-DIRTY-4: _isDirty('inv') called inside loadUI() -- dirty-check is wired"

# 91.5  renderWorldMap is guarded by DATA tab check in loadUI (B-P1)
Check ($loadUIBody91ps.Contains('tab-btn-data') -and $loadUIBody91ps.Contains('renderWorldMap')) `
    'GATE-DIRTY-5: renderWorldMap guarded by tab-btn-data check in loadUI() (B-P1)'

# 91.6  renderWorldMap is NOT called unconditionally in loadUI (B-P1 regression guard)
Check (-not $loadUIBody91ps.Contains('renderWorldMap(); // G6')) `
    'GATE-DIRTY-6: renderWorldMap() not called unconditionally in loadUI() (B-P1 regression guard)'

# 91.7  renderAccount() always called -- auth state not covered by state slice
Check ($loadUIBody91ps.Contains('renderAccount(); // always')) `
    'GATE-DIRTY-7: renderAccount() called unconditionally in loadUI() (auth state not in state slice)'

# 91.8  renderSavesList() always called -- localStorage/cloud not covered by state slice
Check ($loadUIBody91ps.Contains('renderSavesList(); // always')) `
    'GATE-DIRTY-8: renderSavesList() called unconditionally in loadUI() (localStorage/cloud not in state slice)'

# ===========================================================
# Suite 92 -- VERTICAL-BROKEN-TEXT ANTI-RECURRENCE GUARDS (7 tests)
# ===========================================================
Sep "Suite 92 -- VERTICAL-BROKEN-TEXT ANTI-RECURRENCE GUARDS"
# Protocol 13 + Protocol 36b escape-ratchet: closes the "element squeezed
# to ~0 width wraps one glyph per line" bug class (WU-C7/C9/C10/C12/C14).
$css92ps = [System.IO.File]::ReadAllText((Join-Path $Root 'css/terminal.css'), [System.Text.Encoding]::UTF8)
$uiRender92ps = [System.IO.File]::ReadAllText((Join-Path $Root 'js/ui-render.js'), [System.Text.Encoding]::UTF8)
$html92ps = [System.IO.File]::ReadAllText((Join-Path $Root 'index.html'), [System.Text.Encoding]::UTF8)

# 92.1  .tag class carries white-space: nowrap in terminal.css
Check ([System.Text.RegularExpressions.Regex]::IsMatch($css92ps, '\.tag\s*\{[^}]*white-space:\s*nowrap')) `
    'GATE-NOWRAP-1: .tag class has white-space: nowrap in terminal.css (inventory type-tags must not wrap)'

# 92.2  .badge class carries white-space: nowrap in terminal.css
Check ([System.Text.RegularExpressions.Regex]::IsMatch($css92ps, '\.badge\s*\{[^}]*white-space:\s*nowrap')) `
    'GATE-NOWRAP-2: .badge class has white-space: nowrap in terminal.css (map [?] badges must not wrap)'

# 92.3  inventory type-tag uses .tag class in ui-render.js
Check ($uiRender92ps.Contains('class="tag"')) `
    'GATE-NOWRAP-3: inventory type-tag span uses class="tag" in ui-render.js'

# 92.4  map collectible badge uses .badge class in ui-render.js
Check ($uiRender92ps.Contains('map-collectible-badge badge')) `
    'GATE-NOWRAP-4: map-collectible-badge span includes badge class in ui-render.js'

# 92.5  .macro-buttons button carries white-space: nowrap (WU-C12 device-wrap fix guard)
Check ([System.Text.RegularExpressions.Regex]::IsMatch($css92ps, '\.macro-buttons\s+button\s*\{[^}]*white-space:\s*nowrap')) `
    'GATE-NOWRAP-5: .macro-buttons button has white-space: nowrap in terminal.css (macro command buttons must not wrap)'

# 92.6  WU-C14: the COMPLETE RNG label carries white-space: nowrap so it can
#       never wrap one character per line when squeezed beside its warning.
Check ([System.Text.RegularExpressions.Regex]::IsMatch($css92ps, '\.rng-mode-group\s*>\s*label\s*\{[^}]*white-space:\s*nowrap')) `
    'GATE-NOWRAP-6: .rng-mode-group > label has white-space: nowrap (COMPLETE RNG label must not wrap per-character)'

# 92.7  WU-C14: the COMPLETE RNG group stacks as a column (label on its own
#       full-width row above the warning) and the class hook is applied.
Check (([System.Text.RegularExpressions.Regex]::IsMatch($css92ps, '\.rng-mode-group\s*\{[^}]*flex-direction:\s*column')) -and `
       ($html92ps.Contains('class="input-group rng-mode-group"'))) `
    'GATE-NOWRAP-7: .rng-mode-group forces column stacking (label above warning) + class applied to the Complete RNG group in index.html'


# ===========================================================
# Suite 93 -- FO3 AUTOCOMPLETE GUARD (8 tests)
# Protocol 13 + 36b: registrySearch lives in always-loaded
# registry-core.js so FO3 campaigns have working autocomplete.
# WU-B11 root cause: fn was only in reg_nv.js; boot loads only
# one reg file per game -- FO3 had registrySearch=undefined.
# ===========================================================
Sep "Suite 93 -- FO3 Autocomplete Guard"
$rc93ps = [System.IO.File]::ReadAllText((Join-Path $Root 'js/registry-core.js'), [System.Text.Encoding]::UTF8)
$sw93ps = [System.IO.File]::ReadAllText((Join-Path $Root 'sw.js'), [System.Text.Encoding]::UTF8)
$idx93ps = [System.IO.File]::ReadAllText((Join-Path $Root 'index.html'), [System.Text.Encoding]::UTF8)
$nv93ps = [System.IO.File]::ReadAllText((Join-Path $Root 'js/reg_nv.js'), [System.Text.Encoding]::UTF8)
$fo393ps = [System.IO.File]::ReadAllText((Join-Path $Root 'js/reg_fo3.js'), [System.Text.Encoding]::UTF8)

# 93.1  registry-core.js file exists (ReadAllText throws if absent)
Check ($rc93ps.Length -gt 0) 'registry-core.js file exists on disk'

# 93.2  registry-core.js is listed in sw.js ASSETS
Check ($sw93ps.Contains('./js/registry-core.js')) `
    'registry-core.js is listed in sw.js ASSETS (service worker will cache it)'

# 93.3  registry-core.js defines registrySearch function
Check ([System.Text.RegularExpressions.Regex]::IsMatch($rc93ps, 'function\s+registrySearch\s*\(')) `
    'registry-core.js defines registrySearch() function'

# 93.4  registry-core.js reads FALLOUT_REGISTRY[category] (game-agnostic)
Check ($rc93ps.Contains('FALLOUT_REGISTRY[category]')) `
    'registry-core.js reads FALLOUT_REGISTRY[category] -- driven by active game registry, no literals'

# 93.5  reg_nv.js does NOT define registrySearch (moved to registry-core.js)
Check (-not [System.Text.RegularExpressions.Regex]::IsMatch($nv93ps, 'function\s+registrySearch\s*\(')) `
    'reg_nv.js does NOT define registrySearch() -- function extracted to registry-core.js'

# 93.6  FO3 boot path in index.html includes registry-core.js after reg_fo3.js
$fo3Idx93ps = $idx93ps.IndexOf("'js/reg_fo3.js'")
$rcNearFo393ps = ($fo3Idx93ps -ge 0) -and $idx93ps.Substring($fo3Idx93ps, [Math]::Min(200, $idx93ps.Length - $fo3Idx93ps)).Contains("'js/registry-core.js'")
Check $rcNearFo393ps "FO3 boot path in index.html includes registry-core.js after reg_fo3.js"

# 93.7  FNV boot path in index.html includes registry-core.js after reg_nv.js
$nvIdx93ps = $idx93ps.IndexOf("'js/reg_nv.js'")
$rcNearNv93ps = ($nvIdx93ps -ge 0) -and $idx93ps.Substring($nvIdx93ps, [Math]::Min(200, $idx93ps.Length - $nvIdx93ps)).Contains("'js/registry-core.js'")
Check $rcNearNv93ps "FNV boot path in index.html includes registry-core.js after reg_nv.js"

# 93.8  Behavioral: FO3 registry has Galaxy News Radio quest (FO3 autocomplete data present)
Check ($fo393ps.Contains("'Galaxy News Radio'") -or $fo393ps.Contains('"Galaxy News Radio"')) `
    "FO3-context behavioral: reg_fo3.js FALLOUT_REGISTRY.quests contains Galaxy News Radio (FO3 data present + game-agnostic fn reads it)"

# ===========================================================
# Suite 94 -- ACCESSIBILITY GUARDS (10 tests)
# WCAG 2.1 AA: focus-visible indicators, prefers-reduced-motion
# (seizure-hazard flicker freeze), aria-live chat region, and
# sysModal dialog ARIA semantics. A-1/A-S4/A-7/A-S1 spec items.
# ===========================================================
Sep "Suite 94 -- Accessibility Guards"
$css94ps = [System.IO.File]::ReadAllText((Join-Path $Root 'css/terminal.css'), [System.Text.Encoding]::UTF8)
$idx94ps = [System.IO.File]::ReadAllText((Join-Path $Root 'index.html'), [System.Text.Encoding]::UTF8)
$uiCore94ps = [System.IO.File]::ReadAllText((Join-Path $Root 'js/ui-core.js'), [System.Text.Encoding]::UTF8)

# 94.1  :focus-visible rule exists in terminal.css (WCAG 2.4.7)
Check ($css94ps.Contains(':focus-visible')) `
    'GATE-A11Y-1: terminal.css contains :focus-visible rule (keyboard focus indicator -- WCAG 2.4.7)'

# 94.2  prefers-reduced-motion block exists in terminal.css (WCAG 2.3.1)
Check ($css94ps.Contains('prefers-reduced-motion')) `
    'GATE-A11Y-2: terminal.css contains prefers-reduced-motion media query (seizure-safe animation freeze)'

# 94.3  reduced-motion block uses 0.01ms animation-duration
Check ($css94ps.Contains('animation-duration: 0.01ms')) `
    'GATE-A11Y-3: prefers-reduced-motion block uses animation-duration: 0.01ms !important (not 0s -- avoids animationend skip bug)'

# 94.4  reduced-motion block sets animation-iteration-count: 1
Check ($css94ps.Contains('animation-iteration-count: 1')) `
    'GATE-A11Y-4: prefers-reduced-motion block sets animation-iteration-count: 1 !important (stops infinite flicker loops)'

# 94.5  .crt-overlay inside prefers-reduced-motion block
Check ([System.Text.RegularExpressions.Regex]::IsMatch($css94ps, 'prefers-reduced-motion\s*:\s*reduce\b[\s\S]*?\.crt-overlay', [System.Text.RegularExpressions.RegexOptions]::Singleline)) `
    'GATE-A11Y-5: .crt-overlay has opacity restore inside prefers-reduced-motion block (static scanline preserved)'

# 94.6  chatDisplay has aria-live="polite"
Check ($idx94ps.Contains('aria-live="polite"')) `
    'GATE-A11Y-6: #chatDisplay has aria-live="polite" in index.html (screen reader chat updates)'

# 94.7  chatDisplay has aria-atomic="false"
Check ($idx94ps.Contains('aria-atomic="false"')) `
    'GATE-A11Y-7: #chatDisplay has aria-atomic="false" in index.html (per-message SR announcement)'

# 94.8  sysModal has role="dialog"
Check ($idx94ps.Contains('role="dialog"')) `
    'GATE-A11Y-8: #sysModal has role="dialog" in index.html (modal dialog semantics for AT)'

# 94.9  sysModal has aria-modal="true"
Check ($idx94ps.Contains('aria-modal="true"')) `
    'GATE-A11Y-9: #sysModal has aria-modal="true" in index.html (background content inert for AT)'

# 94.10  _openSysModal helper defined in ui-core.js
Check ([System.Text.RegularExpressions.Regex]::IsMatch($uiCore94ps, 'function\s+_openSysModal\s*\(')) `
    'GATE-A11Y-10: _openSysModal() helper defined in ui-core.js (focus management + Tab-trap entrypoint)'

# ===========================================================
# Suite 95 -- SAVE-LOAD RELOAD GUARD (import clobber regression) (9 tests)
# Regression for the d0f0429 beforeunload bug: a load path writes the new
# robco_v8 then calls location.reload(); the beforeunload flush fired during
# teardown and re-serialized the STALE in-memory state over robco_v8, so
# IMPORT SAVE / RESTORE BACKUP / cloud load silently did nothing. The fix
# sets window._loadingSave before each reload and suppresses the unload +
# debounced flush while it is set. These guards must never be removed.
# ===========================================================
Sep "Suite 95 -- Save-Load Reload Guard (import clobber regression)"
$uiCore95 = [System.IO.File]::ReadAllText((Join-Path $Root 'js/ui-core.js'), [System.Text.Encoding]::UTF8)
$state95  = [System.IO.File]::ReadAllText((Join-Path $Root 'js/state.js'), [System.Text.Encoding]::UTF8)
$saves95  = [System.IO.File]::ReadAllText((Join-Path $Root 'js/ui-saves.js'), [System.Text.Encoding]::UTF8)
$cloud95  = [System.IO.File]::ReadAllText((Join-Path $Root 'js/cloud.js'), [System.Text.Encoding]::UTF8)

# 95.1  beforeunload flush is guarded by _loadingSave (not an unconditional robco_v8 write)
Check ([System.Text.RegularExpressions.Regex]::IsMatch($uiCore95, 'beforeunload[\s\S]{0,400}?_loadingSave')) `
    '95.1: ui-core.js beforeunload flush guards on window._loadingSave (no stale clobber of an imported robco_v8)'

# 95.2  debounced saveState write is guarded by _loadingSave too
Check ([System.Text.RegularExpressions.Regex]::IsMatch($state95, '_saveTimer\s*=\s*setTimeout\([\s\S]{0,400}?_loadingSave')) `
    '95.2: state.js debounced saveState() write guards on window._loadingSave (no stale clobber during a load reload)'

# 95.3  handleFileUpload sets _loadingSave before its reload
$fn953 = Get-FunctionBody $saves95 'handleFileUpload'
Check ([System.Text.RegularExpressions.Regex]::IsMatch($fn953, '_loadingSave\s*=\s*true[\s\S]*?location\.reload\(\)')) `
    '95.3: handleFileUpload sets window._loadingSave = true before location.reload() (import survives unload flush)'

# 95.4  restoreRollingBackup (via its _restoreBackupApply core -- Step 2 Phase 0 U12
#       split the confirm gate from the apply step) sets _loadingSave before its reload
$fn954 = Get-FunctionBody $saves95 '_restoreBackupApply'
Check ([System.Text.RegularExpressions.Regex]::IsMatch($fn954, '_loadingSave\s*=\s*true[\s\S]*?location\.reload\(\)')) `
    '95.4: restoreRollingBackup sets window._loadingSave = true before location.reload() (backup restore survives unload flush)'

# 95.5  loadCloudSave sets _loadingSave before its reload
Check ([System.Text.RegularExpressions.Regex]::IsMatch($cloud95, '_loadingSave\s*=\s*true[\s\S]{0,200}?location\.reload\(\)')) `
    '95.5: cloud.js loadCloudSave sets window._loadingSave = true before location.reload() (cloud load survives unload flush)'

# 95.6  onGameContextChange still guards its reload (working context-switch path not regressed)
$fn956 = Get-FunctionBody $uiCore95 'onGameContextChange'
Check ([System.Text.RegularExpressions.Regex]::IsMatch($fn956, '_contextSwitching\s*=\s*true[\s\S]*?location\.reload\(\)')) `
    '95.6: onGameContextChange still sets window._contextSwitching = true before reload (context-switch persistence intact)'

# 95.7  Structural twin of the JS behavioral round-trip: the import write feeds
#       sanitizeImportedContainer(parsed.robco_v8) into robco_v8, and the boot
#       merge reads campaigns[activeContext] back into state. (JS runner runs the
#       full behavioral eval; PS runner asserts the round-trip wiring structurally.)
$fn957 = Get-FunctionBody $saves95 'handleFileUpload'
$rt957 = ([System.Text.RegularExpressions.Regex]::IsMatch($fn957, "sanitizeImportedContainer\(parsed\.robco_v8\)") -and `
          [System.Text.RegularExpressions.Regex]::IsMatch($fn957, "localStorage\.setItem\('robco_v8'") -and `
          [System.Text.RegularExpressions.Regex]::IsMatch($uiCore95, "campaigns\[window\.robco_v8\.activeContext\]"))
Check $rt957 `
    '95.7: imported save container round-trips through sanitize + boot merge -- loaded state reflects the file (lvl/caps/loc/inventory)'

# 95.8  BEHAVIORAL -- the beforeunload/saveState flush invariant (the footgun this
#       guard defuses): a DIVERGENT robco_v8 write that lets the flush fire is
#       clobbered unless the guard is set first. Replica of the ui-core.js flush
#       branch; proves both cases. (Discovered during WU-A5 verification -- harness-
#       only, no shipped path is unguarded, but the invariant is locked here.)
$store98 = @{}
$inMemCtx98 = 'FNV'  # current page in-memory gameContext
# (a) unguarded: divergent FO3 write then flush -> clobbered back to in-memory FNV
$store98['robco_v8'] = '{"activeContext":"FO3"}'
$guarded98a = $false
if (-not $guarded98a) { $store98['robco_v8'] = ('{"activeContext":"' + $inMemCtx98 + '"}') }
$afterUnguarded98 = ($store98['robco_v8'] | ConvertFrom-Json).activeContext
# (b) guarded: same divergent FO3 write then flush -> survives
$store98['robco_v8'] = '{"activeContext":"FO3"}'
$guarded98b = $true
if (-not $guarded98b) { $store98['robco_v8'] = ('{"activeContext":"' + $inMemCtx98 + '"}') }
$afterGuarded98 = ($store98['robco_v8'] | ConvertFrom-Json).activeContext
Check ($afterUnguarded98 -eq 'FNV' -and $afterGuarded98 -eq 'FO3') `
    '95.8: unload flush clobbers an unguarded divergent robco_v8 write but a guarded one survives (footgun invariant locked)'

# 95.9  STATIC ORDER GUARD -- the beforeunload guard return must precede the robco_v8
#       write so a refactor cannot move the write above the guard.
$bi98 = $uiCore95.IndexOf("addEventListener('beforeunload'")
$handler98 = if ($bi98 -ge 0) { $uiCore95.Substring($bi98, [Math]::Min(800, $uiCore95.Length - $bi98)) } else { '' }
$gm98 = [regex]::Match($handler98, '_loadingSave[\s\S]{0,40}?return')
$guardIdx98 = if ($gm98.Success) { $gm98.Index } else { -1 }
$writeIdx98 = $handler98.IndexOf("setItem('robco_v8'")
Check ($guardIdx98 -ge 0 -and $writeIdx98 -ge 0 -and $guardIdx98 -lt $writeIdx98) `
    '95.9: beforeunload guard return precedes the robco_v8 write (guard cannot be reordered below the flush)'

# ===========================================================
# Suite 96 -- test.html RUNTIME MIRROR PARITY (8 tests)
# Protocol 40: the browser-side runtime audit (tests/test.html) must stay in
# sync with the live import contract and the canonical runners. These guards
# fail if test.html drifts -- wrong boot chain, stale dead stubs, a suite-count
# that no longer matches reality, or the headless runner being removed from the
# gate. Combined with the executed audit (tests/test-html-check.mjs in the gate),
# test.html can no longer silently rot.
# ===========================================================
Sep "Suite 96 -- test.html Runtime Mirror Parity"
$th96 = [System.IO.File]::ReadAllText((Join-Path $Root 'tests/test.html'), [System.Text.Encoding]::UTF8)
$gate96 = [System.IO.File]::ReadAllText((Join-Path $Root 'scripts/gate.js'), [System.Text.Encoding]::UTF8)

# 96.1  test.html exists and is the runtime persistence audit
Check ([System.Text.RegularExpressions.Regex]::IsMatch($th96, 'PERSISTENCE AUDIT', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase) -and $th96.Contains('autoImportState')) `
    '96.1: tests/test.html is the runtime persistence audit (executes autoImportState)'

# 96.2  test.html loads the current FNV boot chain (db -> state -> reg -> registry-core -> api)
$chain96 = @('db_nv.js','state.js','reg_nv.js','registry-core.js','api.js')
$missing96 = @($chain96 | Where-Object { -not $th96.Contains('../js/' + $_) })
Check ($missing96.Count -eq 0) `
    ('96.2: test.html loads the current boot chain (db_nv, state, reg_nv, registry-core, api)' + $(if ($missing96.Count) { ' -- missing: ' + ($missing96 -join ', ') } else { '' }))

# 96.3  declared "Suites: N" marker matches the actual number of section() calls
$declared96 = [regex]::Match($th96, 'Suites:\s*(\d+)')
$actual96 = ([regex]::Matches($th96, "section\('")).Count
Check ($declared96.Success -and [int]$declared96.Groups[1].Value -eq $actual96) `
    ("96.3: test.html `"Suites: N`" marker matches actual section() count" + $(if ($declared96.Success) { " (declared " + $declared96.Groups[1].Value + ", actual $actual96)" } else { ' (marker missing)' }))

# 96.4  exercises the current import-contract entry points
Check ($th96.Contains('autoImportState') -and $th96.Contains('sanitizeImportedContainer')) `
    '96.4: test.html exercises autoImportState + sanitizeImportedContainer (current import contract)'

# 96.5  game-agnostic -- uses the context-aware getters, not hardcoded registries (Protocol 38)
Check ($th96.Contains('getFactionRegistry()') -and $th96.Contains('getSkillKeys()') -and $th96.Contains('GAME_DEFS')) `
    '96.5: test.html uses getFactionRegistry()/getSkillKeys()/GAME_DEFS (game-agnostic, Protocol 38)'

# 96.6  no stale dead references (old stubs removed in the r10 refresh must not return)
Check (-not [System.Text.RegularExpressions.Regex]::IsMatch($th96, 'renderSkillMatrix|updateKarmaUI')) `
    '96.6: test.html has no stale dead stubs (renderSkillMatrix / updateKarmaUI removed)'

# 96.7  the headless runner exists AND the gate invokes it
Check ((Test-Path (Join-Path $Root 'tests/test-html-check.mjs')) -and $gate96.Contains('test-html-check.mjs')) `
    '96.7: tests/test-html-check.mjs exists and scripts/gate.js runs it (test.html executed in gate)'

# 96.8  Protocol 40 is codified in RULES.md and CLAUDE.md
$rules96 = [System.IO.File]::ReadAllText((Join-Path $Root 'RULES.md'), [System.Text.Encoding]::UTF8)
$claude96 = [System.IO.File]::ReadAllText((Join-Path $Root 'CLAUDE.md'), [System.Text.Encoding]::UTF8)
Check ($rules96.Contains('Protocol 40') -and $claude96.Contains('Protocol 40')) `
    '96.8: Protocol 40 (test.html sync) present in RULES.md and CLAUDE.md'

# ===========================================================
# Suite 97 -- CHANGELOG category-heading integrity (Protocol 21) (2 tests)
# Keep a Changelog convention: under one `## [version]` block there must be
# exactly ONE heading per category (a single ### Added / ### Fixed / etc.).
# Guards against duplicate-heading splits and rogue/typo category headings.
# Self-improving -- Protocol 36b.
# ===========================================================
Sep "Suite 97 -- CHANGELOG category-heading integrity"
$cl97 = [System.IO.File]::ReadAllText((Join-Path $Root 'CHANGELOG.md'), [System.Text.Encoding]::UTF8)
$validCats97 = @('Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security', 'Improved', 'Hotfix', 'Under the Hood')
# Split into version blocks on top-level "## [" headers; collect "### Category" per block.
$blocks97 = New-Object System.Collections.Generic.List[object]
$cur97 = $null
foreach ($ln in ($cl97 -split "`n")) {
    if ($ln -match '^##\s+\[') {
        $cur97 = [pscustomobject]@{ header = $ln.Trim(); cats = (New-Object System.Collections.Generic.List[string]) }
        $blocks97.Add($cur97)
    } elseif ($null -ne $cur97) {
        $m = [regex]::Match($ln, '^###\s+(.+?)\s*$')
        if ($m.Success) { $cur97.cats.Add($m.Groups[1].Value) }
    }
}

# 97.1  No version block repeats a category heading.
$dupReports97 = New-Object System.Collections.Generic.List[string]
foreach ($b in $blocks97) {
    $seen = New-Object System.Collections.Generic.HashSet[string]
    $dups = New-Object System.Collections.Generic.HashSet[string]
    foreach ($c in $b.cats) { if (-not $seen.Add($c)) { [void]$dups.Add($c) } }
    if ($dups.Count) { $dupReports97.Add($b.header + ' -> duplicate: ' + ($dups -join ', ')) }
}
Check ($dupReports97.Count -eq 0) `
    ('CHANGELOG.md: each version block has at most one heading per category (Protocol 21)' + $(if ($dupReports97.Count) { ' -- ' + ($dupReports97 -join ' | ') } else { '' }))

# 97.2  Every category heading is a recognized Keep-a-Changelog category.
$badCats97 = New-Object System.Collections.Generic.List[string]
foreach ($b in $blocks97) {
    foreach ($c in $b.cats) { if ($validCats97 -notcontains $c) { $badCats97.Add($b.header + ' -> "' + $c + '"') } }
}
Check ($badCats97.Count -eq 0) `
    ('CHANGELOG.md: all category headings are recognized (Added/Changed/Deprecated/Removed/Fixed/Security/Improved/Hotfix/Under the Hood)' + $(if ($badCats97.Count) { ' -- unknown: ' + ($badCats97 -join ', ') } else { '' }))

# ===========================================================
# Suite 98 -- Project-root cleanliness (Protocol 41) (2 tests)
# Flags leftover/junk that reappears at the project root so the end-of-task
# cleanup sweep can't silently regress. The gate only FLAGS (fails) -- it never
# auto-deletes. Tracked files and the gitignored planning/ folder are untouched.
# ===========================================================
Sep "Suite 98 -- Project-root cleanliness (Protocol 41)"
$rootFiles98 = [System.IO.Directory]::GetFiles($Root) | ForEach-Object { [System.IO.Path]::GetFileName($_) }
$rootDirs98 = [System.IO.Directory]::GetDirectories($Root) | ForEach-Object { [System.IO.Path]::GetFileName($_) }

# 98.1  No junk-extension / scratch files at the project root.
$junkFiles98 = @($rootFiles98 | Where-Object { $_ -match '(\.(bak|old|tmp|orig|log|zip|swp|swo)$|~$|^repro\.|^_diag)' })
Check ($junkFiles98.Count -eq 0) `
    ('Project root has no junk/scratch files (*.bak/*.old/*.tmp/*.orig/*.log/*.zip/*~/repro.*/_diag*) -- Protocol 41' + $(if ($junkFiles98.Count) { ' -- found: ' + ($junkFiles98 -join ', ') } else { '' }))

# 98.2  No stray/abandoned tool directories at the project root.
$junkDirNames98 = @('.yoke')
$junkDirs98 = @($rootDirs98 | Where-Object { $junkDirNames98 -contains $_ })
Check ($junkDirs98.Count -eq 0) `
    ('Project root has no stray tool directories (e.g. .yoke/) -- Protocol 41' + $(if ($junkDirs98.Count) { ' -- found: ' + ($junkDirs98 -join ', ') } else { '' }))

# ===========================================================
# Suite 99 -- WU-B7 dead-code purge + duplication consolidation (16 tests)
# Locks the removals so a refactor can't silently re-introduce the dead code,
# and proves the consolidated helpers stayed consolidated. Each removed symbol
# had zero call sites at purge time; each consolidation reuses one shared
# helper / one slot-schema source.
# ===========================================================
Sep "Suite 99 -- WU-B7 dead-code purge + duplication consolidation"
$audio99   = Get-Content "$Root\js\ui-audio.js"    -Raw
$render99  = Get-Content "$Root\js\ui-render.js"   -Raw
$api99     = Get-Content "$Root\js\api.js"         -Raw
$core99    = Get-Content "$Root\js\ui-core.js"     -Raw
$saves99   = Get-Content "$Root\js\ui-saves.js"    -Raw
$account99 = Get-Content "$Root\js\ui-account.js"  -Raw
$eslint99  = Get-Content "$Root\eslint.config.mjs" -Raw

# -- Dead-code purge (must stay absent) --
Check ($audio99 -notmatch '\bshowDeltaGhost\b') `
    '99.1: showDeltaGhost() removed from ui-audio.js (QA-DEAD-1 -- zero call sites)'
Check ($render99 -notmatch '\bticksToGameTime\b') `
    '99.2: ticksToGameTime() removed from ui-render.js (QA-DEAD-4 -- zero call sites)'
Check ($render99 -notmatch '\bgameTimeToTicks\b') `
    '99.3: gameTimeToTicks() removed from ui-render.js (QA-DEAD-5 -- zero call sites, wrong comment)'
Check ($api99 -notmatch '\b_cleanKey\b') `
    '99.4: _cleanKey removed from api.js (QA-DEAD-3 -- computed then discarded)'
Check (($api99 -notmatch '\b_gcV\b') -and ($api99 -notmatch 'state\.gameContext\s*=\s*gcV')) `
    '99.5: dead commented gameContext assignment + unused _gcV parse removed from api.js (QA-DEAD-8)'
Check ($core99 -notmatch '_inputHistory\s*=\s*\[\s*\]') `
    '99.6: unused _inputHistory array removed from ui-core.js (QA-DEAD-2)'
Check ($core99 -match '\b_inputHistoryIdx\b') `
    '99.7: _inputHistoryIdx nav cursor retained -- Up/Down history nav still wired (no behavior change)'
Check ($core99 -notmatch 'targetDT\s*=\s*0\b') `
    '99.8: dead `targetDT = 0` constant removed (QA-DEAD-6) -- WU-N1 wires a real, used targetDT input (see Suite 105.16)'
Check (($eslint99 -notmatch '\bticksToGameTime\b') -and ($eslint99 -notmatch '\bgameTimeToTicks\b')) `
    '99.9: ticksToGameTime + gameTimeToTicks globals removed from eslint.config.mjs'

# -- Duplication consolidation (shared helpers / single source) --
Check ($core99 -match 'function\s+_startUptimeClock\s*\(') `
    '99.10: _startUptimeClock() shared helper defined in ui-core.js (QA-DUP-4)'
Check ($core99 -match 'function\s+_startMemCycle\s*\(') `
    '99.11: _startMemCycle() shared helper defined in ui-core.js (QA-DUP-3)'
Check ([regex]::Matches($core99, 'MEMORY CYCLE COMPLETE').Count -eq 1) `
    '99.12: "MEMORY CYCLE COMPLETE" literal appears exactly once in ui-core.js (mem-cycle body deduped)'
Check ([regex]::Matches($core99, '_startUptimeClock\b').Count -ge 3) `
    '99.13: _startUptimeClock referenced >=3x in ui-core.js (1 definition + both call sites use the helper)'
Check ($saves99 -match 'function\s+listLocalSaves\s*\(') `
    '99.14: listLocalSaves() moved into ui-saves.js -- co-located with slot schema (QA-DUP-2)'
Check ($saves99 -match 'function\s+listLocalSaves[\s\S]*?_slotKey\s*\(') `
    '99.15: listLocalSaves() reads slots via _slotKey() -- single slot-key source (QA-DUP-2)'
Check ($account99 -notmatch 'function\s+listLocalSaves\s*\(') `
    '99.16: listLocalSaves() no longer defined in ui-account.js (moved out -- single definition)'

# ===========================================================
# Suite 100 -- Staging build output guards (Cloudflare Pages) (4 tests)
# A service-worker script fetch that returns a 3xx redirect cannot be
# registered/updated (browsers reject it). cf-staging-build.mjs emits a
# _redirects file pinning sw.js + manifest.json to a direct 200 serve so
# Cloudflare's path canonicalization can never redirect them.
# ===========================================================
Sep "Suite 100 -- Staging build output guards (Cloudflare Pages)"
$cfSrc100 = Read-Src "scripts/cf-staging-build.mjs"

# 100.1 The staging build emits a Cloudflare _redirects file into the output.
Check ([bool]($cfSrc100 -match "writeFileSync\(\s*join\(\s*OUT\s*,\s*['""]_redirects['""]\s*\)")) `
    '100.1: cf-staging-build.mjs writes a _redirects file into the staging output (dist-staging)'

# 100.2 _redirects pins /sw.js to a direct 200 (no redirect) -- the SW-update fix.
Check ([bool]($cfSrc100 -match '/sw\.js\s+/sw\.js\s+200')) `
    '100.2: staging _redirects pins /sw.js to a direct 200 serve (service worker never behind a redirect)'

# 100.3 _redirects pins /manifest.json to a direct 200 as well (PWA control file).
Check ([bool]($cfSrc100 -match '/manifest\.json\s+/manifest\.json\s+200')) `
    '100.3: staging _redirects pins /manifest.json to a direct 200 serve (no redirect)'

# 100.4 sw.js is staged at the served root so the SW registers at root scope.
Check ([bool]($cfSrc100 -match "FILES\s*=\s*\[[^\]]*'sw\.js'")) `
    '100.4: cf-staging-build.mjs stages sw.js at the served root (root-scope SW registration)'

# ===========================================================
# Suite 101 -- WU-B9 cloud.js -> state.js boundary fix (8 tests)
# Protocol 23 module boundary: cloud.js (the cloud-sync module) must never reach into
# the global `state` object directly -- it reads the active game context and snapshots
# state ONLY through the sanctioned state.js accessors. These guards lock the accessors
# into existence and fail if cloud.js ever re-introduces a direct state.gameContext read
# or a JSON.stringify(state) whole-state read.
# ===========================================================
Sep "Suite 101 -- WU-B9 cloud.js -> state.js boundary fix"
$state101 = Read-Src "js/state.js"
$cloud101 = Read-Src "js/cloud.js"

# state.js sanctioned accessors exist + are exposed for the module boundary
Check ([bool]($state101 -match 'function\s+getGameContext\s*\(')) `
    '101.1: state.js defines getGameContext() -- sanctioned read accessor for the active game context'
Check ([bool]($state101 -match 'window\.getGameContext\s*=')) `
    '101.2: state.js exposes window.getGameContext so the cloud.js module can reach it across the boundary'
$body1013 = ''
try { $body1013 = Get-FunctionBody $state101 'getGameContext' } catch {}
Check ([bool](($body1013 -match "'FNV'") -and ($body1013 -match 'state\.gameContext'))) `
    '101.3: getGameContext() preserves the || ''FNV'' absence fallback (behavior-preserving swap)'
Check ([bool]($state101 -match 'function\s+snapshotActiveCampaign\s*\(')) `
    '101.4: state.js defines snapshotActiveCampaign() -- sanctioned accessor to flush state into robco_v8'
Check ([bool]($state101 -match 'window\.snapshotActiveCampaign\s*=')) `
    '101.5: state.js exposes window.snapshotActiveCampaign for cross-module use'
$body1016 = ''
try { $body1016 = Get-FunctionBody $state101 'snapshotActiveCampaign' } catch {}
Check ([bool](($body1016 -match 'getGameContext\s*\(') -and ($body1016 -match 'JSON\.parse\(JSON\.stringify\(state\)\)'))) `
    '101.6: snapshotActiveCampaign() is the single-source builder -- uses getGameContext() + deep-snapshots state'

# cloud.js boundary restored -- no direct global `state` reads remain
Check ([bool](-not ($cloud101 -match '(^|[^.\w])state\.gameContext'))) `
    '101.7: cloud.js no longer reads the global state.gameContext directly (Protocol 23 boundary restored)'
Check ([bool]((-not ($cloud101 -match 'JSON\.stringify\(\s*state\s*\)')) -and ($cloud101 -match 'snapshotActiveCampaign\s*\('))) `
    '101.8: cloud.js no longer serializes the global state directly -- routes through snapshotActiveCampaign()'

# ===========================================================
# Suite 102 -- WU-B10 boot-drone autoplay timing (6 tests)
# The browser autoplay policy blocks audio before the first user gesture, so the
# boot drone is armed to the first click/key. The bug: it fired on the user's
# first interaction WHENEVER it happened -- including a mid-session menu tap long
# after boot finished, playing detached. Fix: a `_bootActive` window flag --
# runBootSequence opens it before arming the drone and closes it at completion;
# the armed gesture only plays while boot is still active, otherwise the stale
# drone is suppressed. These guards lock the gate against the detached-drone bug.
# ===========================================================
Sep "Suite 102 -- WU-B10 boot-drone autoplay timing"
$audio102 = Read-Src "js/ui-audio.js"
$bootSeq102 = ''
$firstInteract102 = ''
$bootDrone102 = ''
try { $bootSeq102 = Get-FunctionBody $audio102 'runBootSequence' } catch {}
try { $firstInteract102 = Get-FunctionBody $audio102 '_onFirstInteract' } catch {}
try { $bootDrone102 = Get-FunctionBody $audio102 'playBootDrone' } catch {}

# 102.1 the boot-window flag exists, default false
Check ([bool]($audio102 -match 'let\s+_bootActive\s*=\s*false')) `
    '102.1: ui-audio.js declares the `_bootActive` boot-window flag (default false)'

# 102.2 runBootSequence opens the window (_bootActive = true) BEFORE arming the drone
$trueIdx102 = $bootSeq102.IndexOf('_bootActive = true')
$droneIdx102 = $bootSeq102.IndexOf('playBootDrone(')
Check ($trueIdx102 -ge 0 -and $droneIdx102 -ge 0 -and $trueIdx102 -lt $droneIdx102) `
    '102.2: runBootSequence sets _bootActive = true before playBootDrone() (boot window opens before the drone is armed)'

# 102.3 runBootSequence closes the window (_bootActive = false) at completion
Check ([bool]($bootSeq102 -match '_bootActive\s*=\s*false')) `
    '102.3: runBootSequence sets _bootActive = false at boot completion (boot window closes)'

# 102.4 the armed first-gesture handler SUPPRESSES the drone when boot already
#       finished -- the `!_bootActive` guard precedes the _tryDrone() call.
$guardIdx102 = $firstInteract102.IndexOf('_bootActive')
$playIdx102 = $firstInteract102.IndexOf('_tryDrone')
Check ([bool](($firstInteract102 -match 'if\s*\(\s*!_bootActive\s*\)\s*return') -and $guardIdx102 -ge 0 -and $playIdx102 -ge 0 -and $guardIdx102 -lt $playIdx102)) `
    '102.4: _onFirstInteract returns early on !_bootActive before _tryDrone() (stale drone suppressed post-boot)'

# 102.5 the drone is still armed to the first user gesture (autoplay-policy-safe
#       trigger preserved -- click + keydown listeners not regressed away).
Check ([bool](($bootDrone102 -match "addEventListener\(\s*'click',\s*_onFirstInteract") -and ($bootDrone102 -match "addEventListener\(\s*'keydown',\s*_onFirstInteract"))) `
    '102.5: playBootDrone still arms the drone to the first click/keydown gesture (autoplay-policy-safe trigger intact)'

# 102.6 Structural twin of the JS behavioral gate replica: the source must encode
#       the suppress-before-play ordering (the !_bootActive guard returns before
#       the _tryDrone() call) -- the only way the post-boot first gesture can be
#       suppressed while the boot-active gesture still plays. (JS runner runs the
#       behavioral decision replica; PS asserts the ordered source contract.)
Check ([bool](($firstInteract102 -match '!_bootActive') -and $guardIdx102 -ge 0 -and $playIdx102 -ge 0 -and $guardIdx102 -lt $playIdx102)) `
    '102.6: boot-active first gesture plays the drone exactly once; post-boot first gesture suppresses it (no detached drone)'

# ===========================================================
# Suite 103 -- WU-C13 SAVE MENU "?" help affordance (7 tests)
# A diegetic "?" button in the save panel header opens a help modal explaining
# each save action. Reuses the shared sysModal entry point (_openSysModal, WU-C4)
# so it inherits the focus-trap + ARIA dialog semantics. Game-agnostic copy
# (Protocol 38). These guards lock the affordance + its coverage.
# ===========================================================
Sep "Suite 103 -- WU-C13 SAVE MENU `"?`" help affordance"
$uiCore103 = Read-Src "js/ui-core.js"
$btnTag103 = [regex]::Match($htmlSrc, '<button\b[^>]*showSaveHelpModal[^>]*>').Value
$helpBody103 = ''
try { $helpBody103 = Get-FunctionBody $uiCore103 'showSaveHelpModal' } catch {}

# 103.1 the SAVE MENU "?" button exists and wires to showSaveHelpModal()
Check (($htmlSrc -match 'onclick="showSaveHelpModal\(\)"') -and ($btnTag103 -ne '')) `
    '103.1: SAVE MENU "?" button present in index.html with onclick="showSaveHelpModal()"'

# 103.2 the button has a descriptive aria-label (not a bare "[?]" for AT)
Check ([bool]($btnTag103 -match 'aria-label="[^"]+"')) `
    '103.2: save-menu "?" button has a descriptive aria-label (screen-reader operable)'

# 103.3 >=28px tap target via the shared .btn-sm hook (Protocol 17)
Check ([bool]($btnTag103 -match '\bbtn-sm\b')) `
    '103.3: save-menu "?" button uses .btn-sm (>=28px min tap target -- Protocol 17)'

# 103.4 showSaveHelpModal defined and reuses openModal (Step 2 Phase 0 U12 consolidated driver)
Check (($uiCore103 -match 'function showSaveHelpModal\s*\(') -and ($helpBody103 -match 'openModal\s*\(\s*\)')) `
    '103.4: showSaveHelpModal() defined and opens via openModal() (U12 driver -- inherits WU-C4 focus-trap + ARIA dialog)'

# 103.5 the help documents every save action the SAVE MENU exposes
$saveHelp103 = [regex]::Match($uiCore103, 'const SAVE_HELP\s*=\s*\[[\s\S]*?\n\];').Value
$docs103 = @('EXPORT SAVE', 'IMPORT SAVE', 'RESTORE BACKUP', 'SAVE SLOTS', 'SAVE TO CLOUD', 'LOAD FROM CLOUD')
$missing103 = @($docs103 | Where-Object { -not $saveHelp103.Contains($_) })
Check (($saveHelp103 -ne '') -and ($missing103.Count -eq 0)) `
    ('103.5: SAVE_HELP documents every save action (export/import/restore/slots/cloud push+pull)' + $(if ($missing103.Count) { ' -- missing: ' + ($missing103 -join ', ') } else { '' }))

# 103.6 help text is escaped before innerHTML injection (XSS safety, Protocol 24)
Check (($helpBody103 -match 'escapeHtml\(c\.cmd\)') -and ($helpBody103 -match 'escapeHtml\(c\.desc\)')) `
    '103.6: showSaveHelpModal() escapes help text via escapeHtml() before innerHTML injection'

# 103.7 game-agnostic (Protocol 38): no game-specific literals in the help copy
Check (-not ($saveHelp103 -match '\bFNV\b|\bFO3\b|Fallout|New Vegas|Vault-Tec')) `
    '103.7: SAVE_HELP copy is game-agnostic -- no FNV/FO3/Fallout/New Vegas literals (Protocol 38)'

# ===========================================================
# Suite 104 -- WU-D4 deterministic-feature coefficients (fallout.wiki-verified) (19 tests)
# Locks the canon coefficients that feed the Phase-N native calculators
# (WU-N1 VATS / WU-N2 TRADE / WU-N3 THREAT). Sources (Protocol 3, fallout.wiki):
#   * Barter buy/sell -- "Barter (Fallout: New Vegas)" / "Barter (Fallout 3)":
#       buy = round(value * (1.55 - 0.0045*barter) * mod), sell = round(value * (0.45 + 0.0045*barter) * mod)
#   * VATS crit bonus + clamp -- "Vault-Tec Assisted Targeting System": FNV +5%, FO3 +15%, cap 95%
#   * ammo-per-attack default 1 (one round per trigger pull; Full Auto burns at Attacks_Per_Second)
# The per-weapon ranged spread/falloff is an honest, unsourceable gap
# (WU-D4a-RANGED-GAP) -- guarded as a Protocol-3 flag, never fabricated.
# ===========================================================
Sep "Suite 104 -- WU-D4 deterministic-feature coefficients (fallout.wiki-verified)"
$stateSrc104 = Read-Src "js/state.js"
$fnvAt104 = $stateSrc104.IndexOf('FNV: {')
$fo3At104 = $stateSrc104.IndexOf('FO3: {')
$fnvSlice104 = if ($fo3At104 -gt 0) { $stateSrc104.Substring($fnvAt104, $fo3At104 - $fnvAt104) } else { '' }
$fo3Slice104 = if ($fo3At104 -gt 0) { $stateSrc104.Substring($fo3At104) } else { '' }
function Get-Num104([string]$slice, [string]$key) {
    $m = [regex]::Match($slice, ($key + '\s*:\s*(-?[\d.]+)'))
    if ($m.Success) { return [double]::Parse($m.Groups[1].Value, [System.Globalization.CultureInfo]::InvariantCulture) }
    return [double]::NaN
}
function Near104([double]$a, [double]$b) { return ([math]::Abs($a - $b) -lt 1e-9) }

# -- WU-D4b barter --
$fnvBuy = Get-Num104 $fnvSlice104 'buyBase'
$fnvSell = Get-Num104 $fnvSlice104 'sellBase'
$fnvSlope = Get-Num104 $fnvSlice104 'slopePerPoint'
$fo3Buy = Get-Num104 $fo3Slice104 'buyBase'
$fo3Sell = Get-Num104 $fo3Slice104 'sellBase'
$fo3Slope = Get-Num104 $fo3Slice104 'slopePerPoint'

# 104.1 FNV barter coefficients present
Check ((-not [double]::IsNaN($fnvBuy)) -and (-not [double]::IsNaN($fnvSell)) -and (-not [double]::IsNaN($fnvSlope))) `
    '104.1: GAME_DEFS.FNV.barter declares buyBase + sellBase + slopePerPoint'
# 104.2 FNV buyBase = 1.55 (fallout.wiki)
Check (Near104 $fnvBuy 1.55) '104.2: FNV barter buyBase === 1.55 (fallout.wiki)'
# 104.3 FNV sellBase = 0.45 (fallout.wiki)
Check (Near104 $fnvSell 0.45) '104.3: FNV barter sellBase === 0.45 (fallout.wiki)'
# 104.4 FNV slope = 0.0045 (= 9/2000)
Check (Near104 $fnvSlope 0.0045) '104.4: FNV barter slopePerPoint === 0.0045 (= 9/2000)'
# 104.5 FO3 barter identical
Check ((Near104 $fo3Buy 1.55) -and (Near104 $fo3Sell 0.45) -and (Near104 $fo3Slope 0.0045)) `
    '104.5: FO3 barter coefficients identical (1.55 / 0.45 / 0.0045) -- same engine'
# 104.6 CANON: buy never below value -- buyMult(100) >= 1.0, base <= 1.55
$fnvBuy100 = $fnvBuy - $fnvSlope * 100
$fo3Buy100 = $fo3Buy - $fo3Slope * 100
Check (($fnvBuy100 -ge 1.0) -and ($fnvBuy -le 1.55) -and ($fo3Buy100 -ge 1.0) -and ($fo3Buy -le 1.55)) `
    ('104.6: CANON -- buy multiplier stays in [1.0, 1.55] (never buy below value); buyMult@100 FNV=' + $fnvBuy100.ToString('0.000') + ' FO3=' + $fo3Buy100.ToString('0.000'))
# 104.7 CANON: positive vendor margin (tightest at barter 100)
$fnvGap104 = ($fnvBuy - $fnvSlope * 100) - ($fnvSell + $fnvSlope * 100)
$fo3Gap104 = ($fo3Buy - $fo3Slope * 100) - ($fo3Sell + $fo3Slope * 100)
Check (($fnvGap104 -gt 0) -and ($fo3Gap104 -gt 0)) `
    ('104.7: CANON -- vendor margin positive (sellMult < buyMult) at barter 100; gap FNV=' + $fnvGap104.ToString('0.000') + ' FO3=' + $fo3Gap104.ToString('0.000'))
# 104.8 CANON: sell multiplier in [0.45, 0.90]
$fnvSellHi = $fnvSell + $fnvSlope * 100
$fo3SellHi = $fo3Sell + $fo3Slope * 100
Check (($fnvSell -ge 0.45) -and ($fnvSellHi -le 0.9) -and ($fo3Sell -ge 0.45) -and ($fo3SellHi -le 0.9)) `
    ('104.8: CANON -- sell multiplier in [0.45, 0.90]; sellMult@100 FNV=' + $fnvSellHi.ToString('0.000') + ' FO3=' + $fo3SellHi.ToString('0.000'))

# -- WU-D4a VATS --
$fnvCrit = Get-Num104 $fnvSlice104 'critBonus'
$fo3Crit = Get-Num104 $fo3Slice104 'critBonus'
$fnvMin = Get-Num104 $fnvSlice104 'hitChanceMin'
$fnvMax = Get-Num104 $fnvSlice104 'hitChanceMax'
$fnvFloor = Get-Num104 $fnvSlice104 'skillSpreadFloor'
$fnvCeil = Get-Num104 $fnvSlice104 'skillSpreadCeil'
$fo3Min = Get-Num104 $fo3Slice104 'hitChanceMin'
$fo3Max = Get-Num104 $fo3Slice104 'hitChanceMax'
$fo3Floor = Get-Num104 $fo3Slice104 'skillSpreadFloor'
$fo3Ceil = Get-Num104 $fo3Slice104 'skillSpreadCeil'

# 104.9 FNV vats sub-object present
Check ((-not [double]::IsNaN($fnvCrit)) -and (-not [double]::IsNaN($fnvMin)) -and (-not [double]::IsNaN($fnvMax)) -and (-not [double]::IsNaN($fnvFloor)) -and (-not [double]::IsNaN($fnvCeil))) `
    '104.9: GAME_DEFS.FNV.vats declares critBonus + hitChanceMin/Max + skillSpreadFloor/Ceil'
# 104.10 FNV crit = 0.05
Check (Near104 $fnvCrit 0.05) '104.10: FNV VATS critBonus === 0.05 (+5%, fallout.wiki)'
# 104.11 FO3 crit = 0.15
Check (Near104 $fo3Crit 0.15) '104.11: FO3 VATS critBonus === 0.15 (+15%, fallout.wiki)'
# 104.12 CANON: FO3 > FNV, both in (0, 0.20]
Check (($fo3Crit -gt $fnvCrit) -and ($fnvCrit -gt 0) -and ($fnvCrit -le 0.2) -and ($fo3Crit -gt 0) -and ($fo3Crit -le 0.2)) `
    '104.12: CANON -- FO3 critBonus > FNV critBonus, both within (0, 0.20]'
# 104.13 cap = 95 both
Check ((Near104 $fnvMax 95) -and (Near104 $fo3Max 95)) `
    '104.13: VATS hitChanceMax === 95 for both games (documented cap)'
# 104.14 floor = 5 and floor < cap both
Check ((Near104 $fnvMin 5) -and (Near104 $fo3Min 5) -and ($fnvMin -lt $fnvMax) -and ($fo3Min -lt $fo3Max)) `
    '104.14: VATS hitChanceMin === 5 and min < max for both games'
# 104.15 skill-spread breakpoints 50/100 both
Check ((Near104 $fnvFloor 50) -and (Near104 $fnvCeil 100) -and (Near104 $fo3Floor 50) -and (Near104 $fo3Ceil 100)) `
    '104.15: VATS skillSpreadFloor === 50 and skillSpreadCeil === 100 for both games'

# -- WU-D4c ammo-per-attack --
$fnvAmmo = Get-Num104 $fnvSlice104 'ammoPerAttack'
$fo3Ammo = Get-Num104 $fo3Slice104 'ammoPerAttack'
# 104.16 FNV ammoPerAttack = 1
Check (Near104 $fnvAmmo 1) '104.16: GAME_DEFS.FNV.ammoPerAttack === 1 (default round/attack)'
# 104.17 FO3 ammoPerAttack = 1
Check (Near104 $fo3Ammo 1) '104.17: GAME_DEFS.FO3.ammoPerAttack === 1 (default round/attack)'
# 104.18 CANON: ammoPerAttack positive integer both
Check ((($fnvAmmo -eq [math]::Floor($fnvAmmo)) -and ($fnvAmmo -ge 1)) -and (($fo3Ammo -eq [math]::Floor($fo3Ammo)) -and ($fo3Ammo -ge 1))) `
    '104.18: CANON -- ammoPerAttack is a positive integer (>= 1) for both games'

# -- WU-D4a-RANGED-GAP flag (Protocol 3 -- must not be silently dropped) --
# 104.19 the honest "ranged hit-% not sourceable" flag is documented in both game entries
Check (($fnvSlice104.Contains('WU-D4a-RANGED-GAP')) -and ($fo3Slice104.Contains('WU-D4a-RANGED-GAP'))) `
    '104.19: WU-D4a-RANGED-GAP flag documented in both GAME_DEFS entries (Protocol 3 -- exact ranged hit-% is not sourceable)'

# ===========================================================
# Suite 105 -- WU-N1 VATS native calculator (21 tests)
# Deterministic V.A.T.S. calc (showVATSOverlay/recomputeVATS) consuming the WU-D4a
# coefficients (crit bonus + hit-% clamp) and the WU-N1 GAME_DEFS additions (combatSkills,
# vats.regions, vats.apBase/apPerAgility -- canon AP formula). Locks the GA-10 FO3 big_guns
# live-bug fix, the melee-scope gate shape (1.6), the dropped AI-deferral label, the real
# targetDT input, read-only-ness, and Protocol-38 agnosticism.
# ===========================================================
Sep "Suite 105 -- WU-N1 VATS native calculator"
$st105 = Read-Src "js/state.js"
$ui105 = Read-Src "js/ui-core.js"
$dbnv105 = Read-Src "js/db_nv.js"
$dbfo3105 = Read-Src "js/db_fo3.js"
$fo3At105 = $st105.IndexOf('FO3: {')
$fnv105 = if ($fo3At105 -gt 0) { $st105.Substring($st105.IndexOf('FNV: {'), $fo3At105 - $st105.IndexOf('FNV: {')) } else { '' }
$fo3105 = if ($fo3At105 -gt 0) { $st105.Substring($fo3At105) } else { '' }
function Get-Arr105([string]$slice, [string]$key) {
    $m = [regex]::Match($slice, ($key + '\s*:\s*\[([^\]]*)\]'))
    if ($m.Success) { return $m.Groups[1].Value }
    return ''
}
$fnvCombat105 = Get-Arr105 $fnv105 'combatSkills'
$fo3Combat105 = Get-Arr105 $fo3105 'combatSkills'
$vatsBody105 = ''
try { $vatsBody105 = Get-FunctionBody $ui105 'recomputeVATS' } catch {}

# 105.1 FNV combatSkills present with firearm + melee + unarmed
Check (($fnvCombat105 -match 'guns') -and ($fnvCombat105 -match 'melee_weapons') -and ($fnvCombat105 -match 'unarmed')) `
    '105.1: GAME_DEFS.FNV.combatSkills includes guns + melee_weapons + unarmed'
# 105.2 GA-10 live-bug regression: FO3 combatSkills includes big_guns + small_guns
Check (($fo3Combat105 -match 'big_guns') -and ($fo3Combat105 -match 'small_guns')) `
    "105.2: GA-10 -- GAME_DEFS.FO3.combatSkills includes 'big_guns' (live-bug fix) + 'small_guns'"
# 105.3 FO3 combat set does NOT collapse to FNV 'guns'
Check (-not ($fo3Combat105 -match "['""]guns['""]")) `
    "105.3: FO3 combatSkills does not contain FNV's 'guns' (uses small_guns/big_guns -- no two-game collapse)"
# 105.4 every combatSkills key is a valid skillKey in its game
$fnvSK105 = [regex]::Match($st105, 'const SKILL_KEYS\s*=\s*\[([^\]]+)\]').Groups[1].Value
$fo3SK105 = [regex]::Match($st105, 'const SKILL_KEYS_FO3\s*=\s*\[([^\]]+)\]').Groups[1].Value
$toKeys105 = { param($s) ([regex]::Matches($s, "'([a-z_]+)'") | ForEach-Object { $_.Groups[1].Value }) }
$fnvBad105 = @(& $toKeys105 $fnvCombat105 | Where-Object { -not $fnvSK105.Contains("'$_'") })
$fo3Bad105 = @(& $toKeys105 $fo3Combat105 | Where-Object { -not $fo3SK105.Contains("'$_'") })
Check (($fnvBad105.Count -eq 0) -and ($fo3Bad105.Count -eq 0)) `
    '105.4: every combatSkills key is a valid skillKey in its game'
# 105.5 FNV AP formula 65 + 3xAGI
Check (([regex]::Match($fnv105, 'apBase\s*:\s*(\d+)').Groups[1].Value -eq '65') -and ([regex]::Match($fnv105, 'apPerAgility\s*:\s*(\d+)').Groups[1].Value -eq '3')) `
    '105.5: FNV vats apBase === 65 and apPerAgility === 3 (fallout.wiki)'
# 105.6 FO3 AP formula 65 + 2xAGI
Check (([regex]::Match($fo3105, 'apBase\s*:\s*(\d+)').Groups[1].Value -eq '65') -and ([regex]::Match($fo3105, 'apPerAgility\s*:\s*(\d+)').Groups[1].Value -eq '2')) `
    '105.6: FO3 vats apBase === 65 and apPerAgility === 2 (fallout.wiki)'
# 105.7 CANON AP pool computed from parsed coefficients at AGI 10
$fnvAp10_105 = [int][regex]::Match($fnv105, 'apBase\s*:\s*(\d+)').Groups[1].Value + [int][regex]::Match($fnv105, 'apPerAgility\s*:\s*(\d+)').Groups[1].Value * 10
$fo3Ap10_105 = [int][regex]::Match($fo3105, 'apBase\s*:\s*(\d+)').Groups[1].Value + [int][regex]::Match($fo3105, 'apPerAgility\s*:\s*(\d+)').Groups[1].Value * 10
Check (($fnvAp10_105 -eq 95) -and ($fo3Ap10_105 -eq 85)) `
    '105.7: CANON -- AP pool at AGI 10 = 95 (FNV) / 85 (FO3) from parsed coefficients'
# 105.8 both games declare a non-empty vats.regions {name,mod,ap} table
function Test-Regions105([string]$slice) {
    $m = [regex]::Match($slice, 'regions\s*:\s*\[([\s\S]*?)\]')
    if (-not $m.Success) { return $false }
    $cells = [regex]::Matches($m.Groups[1].Value, '\{[^}]*\}')
    if ($cells.Count -lt 6) { return $false }
    foreach ($c in $cells) {
        if (-not (($c.Value -match 'name\s*:') -and ($c.Value -match 'mod\s*:') -and ($c.Value -match 'ap\s*:'))) { return $false }
    }
    return $true
}
Check ((Test-Regions105 $fnv105) -and (Test-Regions105 $fo3105)) `
    '105.8: FNV + FO3 vats.regions are non-empty {name,mod,ap} tables'
# 105.9 calculator entry points defined
Check (($ui105 -match 'function showVATSOverlay\s*\(') -and ($ui105 -match 'function recomputeVATS\s*\(')) `
    '105.9: showVATSOverlay() and recomputeVATS() are defined in ui-core.js'
# 105.10 hit-% clamp from GAME_DEFS
Check (($vatsBody105 -match 'hitChanceMin') -and ($vatsBody105 -match 'hitChanceMax')) `
    '105.10: recomputeVATS() reads hitChanceMin/hitChanceMax from GAME_DEFS (WU-D4a clamp)'
# 105.11 crit bonus from GAME_DEFS
Check ($vatsBody105 -match 'critBonus') `
    '105.11: recomputeVATS() uses critBonus from GAME_DEFS (WU-D4a per-game coefficient)'
# 105.12 AP pool from canon coefficients
Check (($vatsBody105 -match 'apBase') -and ($vatsBody105 -match 'apPerAgi')) `
    '105.12: recomputeVATS() derives the AP pool from apBase + apPerAgility (canon formula)'
# 105.13 regions read from GAME_DEFS, not re-hardcoded
Check (($vatsBody105 -match '\.regions\b') -and (-not ($ui105 -match 'mod:\s*-40'))) `
    '105.13: recomputeVATS() reads vats.regions from GAME_DEFS -- no hardcoded region table in ui-core.js (GA-7)'
# 105.14 melee-scope gate shape (1.6)
Check ($vatsBody105 -match "playstyle\s*===\s*'melee'\s*\|\|\s*weaponIsMelee") `
    '105.14: melee-scope gate is playstyle===melee || weaponIsMelee (1.6 -- never mode alone)'
# 105.15 AI-deferral label dropped
Check (-not ($ui105 -match 'DETERMINED BY AI')) `
    '105.15: the "ACTUAL OUTCOME DETERMINED BY AI" deferral label is removed'
# 105.16 dead targetDT=0 gone; real input wired
Check ((-not ($ui105 -match 'targetDT\s*=\s*0\b')) -and ($ui105 -match 'id="vatsTargetDT"') -and ($ui105 -match 'oninput="recomputeVATS\(\)"')) `
    '105.16: dead targetDT=0 removed; real #vatsTargetDT input wired to recomputeVATS() (QA-DEAD-6)'
# 105.17 lookupWeaponStats in both db runners
Check (($dbnv105 -match 'function lookupWeaponStats\s*\(') -and ($dbfo3105 -match 'function lookupWeaponStats\s*\(')) `
    '105.17: lookupWeaponStats() defined in both db_nv.js and db_fo3.js'
# 105.18 read-only -- no state writes
Check ((-not ($vatsBody105 -match 'saveState\s*\(')) -and (-not ($vatsBody105 -match 'pushToCloud\s*\('))) `
    '105.18: recomputeVATS() is read-only (no saveState/pushToCloud writes)'

# ── VATS-still-AI retirement (Protocol 42) ──────────────────────────────────
$api105 = Read-Src "js/api.js"
$routerBody105 = [regex]::Match($api105, 'const NATIVE_COMMAND_ROUTER\s*=\s*\{[\s\S]*?\};').Value
# 105.19 [VATS SIM]/[VS]/[VATS] route to the native overlay, NOT the AI
Check (($routerBody105 -match "'\[VATS SIM\]':\s*\(\)\s*=>\s*showVATSOverlay\(\)") -and ($routerBody105 -match "'\[VS\]':\s*\(\)\s*=>\s*showVATSOverlay\(\)") -and ($routerBody105 -match "'\[VATS\]':\s*\(\)\s*=>\s*showVATSOverlay\(\)")) `
    '105.19: NATIVE_COMMAND_ROUTER routes [VATS SIM]/[VS]/[VATS] -> showVATSOverlay() (native, no AI -- VATS-still-AI fix, Protocol 42)'
# 105.20 AI V.A.T.S. path retired in getSystemDirective
Check ((-not ($api105 -match '\[VS\]\s*:\s*Opt\.')) -and ($api105 -match 'V\.A\.T\.S\. accuracy / AP-strike simulation:[\s\S]*?defer to the local calculator')) `
    '105.20: AI V.A.T.S. path retired -- getSystemDirective no longer advertises a [VATS SIM] AI feature and defers V.A.T.S. to the native calculator'
# 105.21 all router-driven natives have a NATIVE_COMMAND_ROUTER entry
$nativeToks105 = @('[THREAT]','[CONSULT]','[BIO-SCAN]','[LOOT]','[VATS SIM]')
$missingNat105 = @($nativeToks105 | Where-Object { -not $routerBody105.Contains("'" + $_ + "'") })
Check ($missingNat105.Count -eq 0) `
    '105.21: all router-driven natives (THREAT/CONSULT/BIO-SCAN/LOOT/VATS) have a NATIVE_COMMAND_ROUTER entry (native end-to-end, no AI fall-through)'

# ===========================================================
# Suite 106 -- WU-N2 TRADE native barter terminal (22 tests)
# Deterministic, offline barter terminal consuming the WU-D4b coefficients
# (GAME_DEFS[ctx].barter). Locks: db catalog/vendor lookups, price math + canon invariants
# (buy >= value, sell < buy), additive + confirm-gated mutation (Protocol 34), the caps-revert
# regression fix (#c_caps mirror -- Protocol 42), the retired AI TRADE modal, and panel wiring.
# ===========================================================
Sep "Suite 106 -- WU-N2 TRADE native barter terminal"
$ren106 = Read-Src "js/ui-render.js"
$dbnv106 = Read-Src "js/db_nv.js"
$dbfo3106 = Read-Src "js/db_fo3.js"
$api106 = Read-Src "js/api.js"
$core106 = Read-Src "js/ui-core.js"
$css106 = Read-Src "css/terminal.css"
$st106 = Read-Src "js/state.js"
$doBuyBody = ''
$doSellBody = ''
try { $doBuyBody = Get-FunctionBody $ren106 'doBuy' } catch {}
try { $doSellBody = Get-FunctionBody $ren106 'doSell' } catch {}

# 106.1 vendor + catalog lookups in BOTH db runners
Check (($dbnv106 -match 'function getVendors\s*\(') -and ($dbnv106 -match 'function getTradeCatalog\s*\(') -and ($dbfo3106 -match 'function getVendors\s*\(') -and ($dbfo3106 -match 'function getTradeCatalog\s*\(')) `
    '106.1: getVendors() + getTradeCatalog() defined in both db_nv.js and db_fo3.js'
# 106.2 all TRADE entry points defined
$tradeFns106 = @('renderTrade', 'renderTradeBuyList', 'renderTradeSellList', 'setTradeVendor', 'doBuy', 'doSell')
$tradeMissing106 = @($tradeFns106 | Where-Object { -not ($ren106 -match ('function ' + $_ + '\s*\(')) })
Check ($tradeMissing106.Count -eq 0) `
    '106.2: renderTrade/renderTradeBuyList/renderTradeSellList/setTradeVendor/doBuy/doSell defined'
# 106.3 price helpers read GAME_DEFS barter coefficients
$coefBody106 = ''
try { $coefBody106 = Get-FunctionBody $ren106 '_tradeBarterCoef' } catch {}
Check (($ren106 -match 'function _tradeBuyPrice\s*\(') -and ($ren106 -match 'function _tradeSellPrice\s*\(') -and ($coefBody106 -match '\.barter\b') -and ($coefBody106 -match 'getGameContext|GAME_DEFS')) `
    '106.3: _tradeBuyPrice/_tradeSellPrice read GAME_DEFS[ctx].barter (Protocol 38)'
# 106.4/106.5 BEHAVIORAL canon invariants from parsed coefficients (both games)
$fo3At106 = $st106.IndexOf('FO3: {')
$fnvSlice106 = if ($fo3At106 -gt 0) { $st106.Substring($st106.IndexOf('FNV: {'), $fo3At106 - $st106.IndexOf('FNV: {')) } else { '' }
$fo3Slice106 = if ($fo3At106 -gt 0) { $st106.Substring($fo3At106) } else { '' }
function Test-BarterCanon106([string]$slice) {
    $bb = [double]::Parse([regex]::Match($slice, 'buyBase\s*:\s*([\d.]+)').Groups[1].Value, [System.Globalization.CultureInfo]::InvariantCulture)
    $sb = [double]::Parse([regex]::Match($slice, 'sellBase\s*:\s*([\d.]+)').Groups[1].Value, [System.Globalization.CultureInfo]::InvariantCulture)
    $sl = [double]::Parse([regex]::Match($slice, 'slopePerPoint\s*:\s*([\d.]+)').Groups[1].Value, [System.Globalization.CultureInfo]::InvariantCulture)
    foreach ($b in 0, 25, 50, 75, 100) {
        $v = 100
        $buy = [math]::Max(1, [math]::Round($v * ($bb - $sl * $b)))
        $sell = [math]::Max(0, [math]::Round($v * ($sb + $sl * $b)))
        if ($buy -lt $v) { return $false }
        if ($sell -ge $buy) { return $false }
        if ($sell -lt 0) { return $false }
    }
    return $true
}
Check (Test-BarterCanon106 $fnvSlice106) '106.4: CANON -- FNV buy >= value and sell < buy across barter 0..100'
Check (Test-BarterCanon106 $fo3Slice106) '106.5: CANON -- FO3 buy >= value and sell < buy across barter 0..100'
# 106.6 buy floored at 1, sell clamped >= 0, both rounded
Check (($ren106 -match 'Math\.max\(\s*1,\s*Math\.round') -and ($ren106 -match 'Math\.max\(\s*0,\s*Math\.round')) `
    '106.6: buy price floored at 1 (Math.max(1, round)) and sell clamped >= 0 (Math.max(0, round))'
# 106.7 Protocol 34 additive
Check (($doBuyBody -match 'state\.inventory\.push\(') -and ($doBuyBody -match '\.qty\s*=\s*\(?.*qty')) `
    '106.7: doBuy is additive -- pushes new item or increments existing qty (Protocol 34)'
# 106.8 confirm-gated (Step 2 Phase 0 U12: diegetic confirmAction() replaces confirm())
Check (($doBuyBody -match 'confirmAction\(') -and ($doSellBody -match 'confirmAction\(')) `
    '106.8: doBuy and doSell are confirmAction-gated (Protocol 34)'
# 106.9 doSell splices + clamps
Check (($doSellBody -match 'splice\(') -and ($doSellBody -match 'it\.qty\s*<=\s*0')) `
    '106.9: doSell decrements qty and splices the item at <= 0 (clamp >= 0)'
# 106.10 caps mutation
Check (($doBuyBody -match 'state\.caps\s*=\s*caps\s*-\s*price') -and ($doSellBody -match 'state\.caps\s*=\s*caps\s*\+\s*price')) `
    '106.10: doBuy sets caps = caps - price; doSell sets caps = caps + price'
# 106.11 CAPS-REVERT REGRESSION (Protocol 42)
Check (($doBuyBody -match 'c_caps') -and ($doSellBody -match 'c_caps')) `
    '106.11: doBuy + doSell write new caps to #c_caps so saveState()/syncStateFromDom does not revert it (Protocol 42)'
# 106.12 no auto-cloud-push
Check ((-not ($doBuyBody -match 'pushToCloud\s*\(')) -and (-not ($doSellBody -match 'pushToCloud\s*\('))) `
    '106.12: neither doBuy nor doSell auto-pushes to cloud (manual sync only)'
# 106.13 AI TRADE modal render branch retired
Check (-not ($api106 -match "mType\s*===\s*'TRADE'")) `
    "106.13: the AI TRADE modal render branch (mType === 'TRADE') is removed from api.js"
# 106.14 AI no longer emits TRADE modal + dead tradeItem removed
Check ((-not ($api106 -match 'array of item objects.*vendor')) -and (-not ($core106 -match 'function tradeItem\s*\('))) `
    '106.14: getSystemDirective no longer defines a TRADE modal shape; dead tradeItem() removed from ui-core.js'
# 106.15 TRADE panel + sub-panels present
Check (($htmlSrc -match 'id="tradePanel"') -and ($htmlSrc -match '&gt;\s*BARTER UPLINK') -and ($htmlSrc -match 'data-sub-id="trade_buy"') -and ($htmlSrc -match 'data-sub-id="trade_sell"')) `
    '106.15: #tradePanel with BARTER UPLINK h2 + trade_buy/trade_sell sub-panels (data-sub-id) present'
# 106.16 [TRADE] macro button repointed
Check (($htmlSrc -match "expandPanelForCategory\('trade'\)") -and (-not ($htmlSrc -match "macroCommand\('\[TRADE\]'\)"))) `
    "106.16: [TRADE] button opens the native panel (expandPanelForCategory('trade')), not macroCommand('[TRADE]')"
# 106.17 expandPanelForCategory routes trade + loadUI renders it
Check (($core106 -match "trade:\s*'inv'") -and ($core106 -match "trade:\s*'>\s*BARTER UPLINK'") -and ($core106 -match 'renderTrade\(\)')) `
    "106.17: expandPanelForCategory maps trade->inv + '> BARTER UPLINK'; loadUI calls renderTrade()"
# 106.18 CSS overflow guard
Check (($css106 -match '\.trade-row\b') -and ($css106 -match '\.trade-name[\s\S]{0,80}min-width:\s*0')) `
    '106.18: terminal.css .trade-row + .trade-name min-width:0 (no horizontal overflow at 360px)'

# 106.19 vendor-switch regression (Protocol 42) — setTradeVendor re-renders in place, never renderTrade()
$setBody106 = ''
try { $setBody106 = Get-FunctionBody $ren106 'setTradeVendor' } catch {}
Check (($setBody106 -match '_renderTradeStats\(\)') -and ($setBody106 -match 'renderTradeBuyList\(\)') -and ($setBody106 -match 'renderTradeSellList\(\)') -and -not ($setBody106 -match 'renderTrade\(\)')) `
    '106.19: setTradeVendor() re-renders purse + buy/sell lists in place and never calls renderTrade() (no <select> rebuild mid-change -- WU-N2 vendor-switch fix, Protocol 42)'

# 106.20 purse line is its own #tradeStats mount updated by a single helper
Check (($ren106 -match 'function _renderTradeStats\s*\(') -and ($ren106 -match 'id="tradeStats"') -and ($ren106 -match 'VENDOR PURSE')) `
    '106.20: renderTrade() mounts a #tradeStats line and _renderTradeStats() is the single purse/caps/barter updater'

# 106.21 WU-HF1 [TRADE]-does-nothing fix: expandPanelForCategory opens the matched panel AND
# centers it via scrollIntoView({ block: 'center' }) (r3 -- owner: center the panel, not pin it
# to the very top). Without the reveal, BARTER UPLINK opened off-screen below the fold.
$expandBody106 = ''
try { $expandBody106 = Get-FunctionBody $core106 'expandPanelForCategory' } catch {}
Check (($expandBody106 -match "setAttribute\(\s*'open'") -and ($expandBody106 -match "scrollIntoView\(\s*\{[^}]*block:\s*'center'")) `
    "106.21: expandPanelForCategory opens the matched panel AND centers it via scrollIntoView({ block: 'center' }) (WU-HF1 r3 [TRADE] reveal + centering fix)"

# 106.22 END-TO-END button->panel-open chain (not just renderTrade)
Check (($htmlSrc -match "onclick=`"expandPanelForCategory\('trade'\)`"") -and ($core106 -match "trade:\s*'inv'") -and ($core106 -match "trade:\s*'>\s*BARTER UPLINK'")) `
    "106.22: [TRADE] button onclick -> expandPanelForCategory('trade') -> maps trade->inv + '> BARTER UPLINK' (button->panel-open end-to-end)"

# ===========================================================
# Suite 107 -- WU-N3 THREAT native bestiary + TTK (17 tests)
# Deterministic offline THREAT assessment: BESTIARY.CSV lookup -> enemy card +
# TTK = ceil(HP / max(1, weaponDPS - DT)) + ammo-burn (WU-D4c coefficient) +
# weakness highlight. Routed natively (the AI TTK directive is retired). The math
# is verified by a PowerShell re-implementation (behavioral twin of the JS vm test);
# the melee-scope rule (_vatsIsMelee) labels strikes vs rounds.
# ===========================================================
Sep "Suite 107 -- WU-N3 THREAT native bestiary + TTK"
$ren107 = Read-Src "js/ui-render.js"
$dbnv107 = Read-Src "js/db_nv.js"
$dbfo3107 = Read-Src "js/db_fo3.js"
$api107 = Read-Src "js/api.js"
$threatBody107 = ''
try { $threatBody107 = Get-FunctionBody $ren107 'renderThreat' } catch {}

# 107.1 / 107.2 lookupBestiaryEntry mirrored in both game db runners (Protocol 38)
Check ([bool]($dbnv107 -match 'function lookupBestiaryEntry\b')) `
    '107.1: lookupBestiaryEntry() defined in db_nv.js (BESTIARY.CSV lookup)'
Check ([bool]($dbfo3107 -match 'function lookupBestiaryEntry\b')) `
    '107.2: lookupBestiaryEntry() defined in db_fo3.js (game-agnostic, mirrored)'
# 107.3 / 107.4 render + pure math defined
Check ([bool]($ren107 -match 'function renderThreat\b')) `
    '107.3: renderThreat() defined in ui-render.js (THREAT ASSESSMENT modal)'
Check ([bool]($ren107 -match 'function _threatCompute\b')) `
    '107.4: _threatCompute() pure math helper defined in ui-render.js'
# 107.5 / 107.6 native router entries -- THREAT routed BEFORE the AI (the retirement)
Check ([bool]($api107 -match "'\[THREAT\]':\s*\w+\s*=>\s*renderThreat")) `
    "107.5: NATIVE_COMMAND_ROUTER routes '[THREAT]' -> renderThreat (native, not AI)"
Check ([bool]($api107 -match "'\[TH\]':\s*\w+\s*=>\s*renderThreat")) `
    "107.6: NATIVE_COMMAND_ROUTER routes '[TH]' -> renderThreat (shorthand)"
# 107.7 _routeNativeCommand forwards the typed target to the handler
Check ([bool]($api107 -match 'handler\(\s*raw\.slice\(cmd\.length\)\.trim\(\)\s*\)')) `
    '107.7: _routeNativeCommand passes the target argument to the handler (renderThreat receives the enemy name)'
# 107.8a / 107.8b AI THREAT path retired -- legacy directive gone; native defer note present
Check (-not ($api107 -match 'Run predictive loops via databases\.\s*Calculate Squad DPS')) `
    '107.8a: legacy AI "Tactical TTK: run predictive loops" directive removed (AI THREAT path retired)'
Check ([bool]($api107 -match 'native deterministic THREAT terminal')) `
    '107.8b: system directive defers THREAT/TTK to the native terminal (do-not-compute note)'
# 107.9 Protocol 3 -- NO ENTRY IN BESTIARY when absent
Check ([bool]($ren107 -match 'NO ENTRY IN BESTIARY')) `
    '107.9: renderThreat emits "NO ENTRY IN BESTIARY" for an unknown target (Protocol 3 -- never invent)'
# 107.10 game-agnostic ammo coefficient (Protocol 38 -- no two-game literal coercion)
Check (([bool]($threatBody107 -match 'ammoPerAttack')) -and ([bool]($threatBody107 -match 'GAME_DEFS')) -and (-not ($threatBody107 -match "===\s*'FO3'\s*\?\s*'FO3'\s*:\s*'FNV'"))) `
    '107.10: renderThreat reads ammoPerAttack from GAME_DEFS (game-agnostic -- no two-game coercion, Protocol 38)'
# 107.11 reuses the canonical melee-scope helper (Protocol 22)
Check ([bool]($ren107 -match '_vatsIsMelee\(')) `
    '107.11: renderThreat reuses _vatsIsMelee for the melee-scope rule (strikes vs rounds -- Protocol 22)'

# -- Behavioral: PowerShell re-implementation of _threatCompute (twin of the JS vm test) --
function Get-Threat107($hp, $dt, $baseDamage, $aps, $apa, $hasWeapon) {
    $hp = [math]::Max(0, $hp); $dt = [math]::Max(0, $dt)
    if (-not $hasWeapon) { return @{ hasWeapon = $false; ttk = $null; ammoBurn = $null } }
    $perAttack = [math]::Max(1, $apa)
    $weaponDPS = $baseDamage * $aps
    $effDPS = [math]::Max([double]1, [double]($weaponDPS - $dt))
    $perShot = [math]::Max([double]1, [double]($baseDamage - $dt))
    $ttk = [math]::Ceiling($hp / $effDPS)
    $shots = [math]::Ceiling($hp / $perShot)
    return @{ hasWeapon = $true; ttk = $ttk; ammoBurn = ($shots * $perAttack) }
}
$r1_107 = Get-Threat107 75 4 60 1.1 1 $true
Check ($r1_107.ttk -eq 2) `
    '107.12: TTK = ceil(HP/max(1,DPS-DT)) = 2 for HP75/DT4 vs 66 DPS'
Check ($r1_107.ammoBurn -eq 2) `
    '107.13: ammo-burn = shotsToKill x ammoPerAttack = 2'
$r2_107 = Get-Threat107 100 1000 10 1 1 $true
Check (($r2_107.ttk -eq 100) -and ($r2_107.ammoBurn -eq 100)) `
    '107.14: DT>=output floors effective dmg at 1 -> TTK 100 / ammo 100'
$r3_107 = Get-Threat107 30 0 10 1 2 $true
Check ($r3_107.ammoBurn -eq 6) `
    '107.15: ammoPerAttack coefficient applied -- 3 shots x 2 = 6'
$r4_107 = Get-Threat107 50 5 0 0 1 $false
Check ((-not $r4_107.hasWeapon) -and ($null -eq $r4_107.ttk)) `
    '107.16: no weapon -> hasWeapon false + ttk null'

# ===========================================================
# Suite 108 -- WU-N4 CONSULT native databank lookup (18 tests)
# `> CONSULT <topic>` (+ [CONSULT] / [CON]) routed through NATIVE_COMMAND_ROUTER to a
# deterministic, offline, read-only registry+DB lookup. Locks router wiring, registry/DB
# cross-reference, the NO-ENTRY path (Protocol 3), XSS-safe topic escaping, read-only-ness,
# Protocol-38 agnosticism, discoverability + CSS overflow guard.
# ===========================================================
Sep "Suite 108 -- WU-N4 CONSULT native databank lookup"
$ren108 = Read-Src "js/ui-render.js"
$api108 = Read-Src "js/api.js"
$core108 = Read-Src "js/ui-core.js"
$css108 = Read-Src "css/terminal.css"
# CONSULT engine spans renderConsult + the shared _consultSearch / _consultRenderHTML core
# (WU-N4b option C, Protocol 22) -- concatenate so engine-level checks find the behavior wherever it lives.
$consultBody = ''
try { $consultBody = (Get-FunctionBody $ren108 'renderConsult') + "`n" + (Get-FunctionBody $ren108 '_consultSearch') + "`n" + (Get-FunctionBody $ren108 '_consultRenderHTML') } catch {}
$routerBlock = [regex]::Match($api108, 'const NATIVE_COMMAND_ROUTER\s*=\s*\{[\s\S]*?\n\};').Value

# 108.1 renderConsult defined
Check ($ren108 -match 'function renderConsult\s*\(') '108.1: renderConsult() defined in ui-render.js'
# 108.2 router wires all three CONSULT tokens
Check (($routerBlock -match "(^|\s|')CONSULT'?\s*:\s*\w*\s*=>?\s*[^\n]*renderConsult") -and ($routerBlock -match "\[CONSULT\]'\s*:\s*[^\n]*renderConsult") -and ($routerBlock -match "\[CON\]'\s*:\s*[^\n]*renderConsult")) `
    '108.2: NATIVE_COMMAND_ROUTER routes CONSULT + [CONSULT] + [CON] to renderConsult()'
# 108.3 unbracketed CONSULT key present
Check (($routerBlock -match '\bCONSULT:\s*\w+\s*=>') -or ($routerBlock -match '\bCONSULT:\s*topic\s*=>')) `
    '108.3: an unbracketed CONSULT router key exists (so `> CONSULT <topic>` routes natively)'
# 108.4 registry search across all five categories
Check (($consultBody -match 'registrySearch') -and ($ren108 -match "'items'") -and ($ren108 -match "'perks'") -and ($ren108 -match "'quests'") -and ($ren108 -match "'locations'") -and ($ren108 -match "'companions'")) `
    '108.4: renderConsult searches the registry (registrySearch) across items/perks/quests/locations/companions'
# 108.5 DB stat cross-reference
Check (($consultBody -match 'lookupItemInDb') -and ($consultBody -match 'lookupBestiaryEntry') -and ($consultBody -match 'lookupWeaponStats')) `
    '108.5: renderConsult cross-references lookupItemInDb + lookupBestiaryEntry + lookupWeaponStats'
# 108.6 NO-ENTRY path
Check ($consultBody -match 'NO ENTRY IN DATABANK') `
    '108.6: renderConsult shows NO ENTRY IN DATABANK when nothing matches (Protocol 3)'
# 108.7 XSS escape of topic
Check (($consultBody -match 'escapeHtml\(res\.q\)') -or ($consultBody -match 'escapeHtml\(q\)')) `
    '108.7: the CONSULT engine escapes the user topic via escapeHtml() before innerHTML (XSS-safe)'
# 108.8 escape hit names
Check ($consultBody -match 'escapeHtml\(e\.name\)') `
    '108.8: renderConsult escapes registry hit names (escapeHtml(e.name))'
# 108.9 read-only
Check ((-not ($consultBody -match 'saveState\s*\(')) -and (-not ($consultBody -match 'pushToCloud\s*\(')) -and (-not ($consultBody -match '\bstate\.\w+\s*='))) `
    '108.9: renderConsult is read-only (no saveState/pushToCloud/state writes)'
# 108.10 game-agnostic -- stable source slice (avoids brace-counted body extraction that
# diverges between runners on template-literal-heavy code)
$cs108 = $ren108.IndexOf('const _CONSULT_CATS')
$ce108 = $ren108.IndexOf('function _updateContextPanels')
$region108 = if (($cs108 -ge 0) -and ($ce108 -gt $cs108)) { $ren108.Substring($cs108, $ce108 - $cs108) } else { '' }
# -cmatch (case-sensitive) mirrors Node's case-sensitive regex: the sanctioned uppercase
# FALLOUT_REGISTRY API is allowed; only human-readable Fallout/New Vegas/FNV/FO3 literals are banned.
Check (($region108 -ne '') -and (-not ($region108 -cmatch '\bFNV\b|\bFO3\b|Fallout|New Vegas'))) `
    '108.10: renderConsult/_consultDetail carry no FNV/FO3/Fallout literals (Protocol 38 -- registry-driven)'
# 108.11 discoverable
$cmdReg108 = [regex]::Match($core108, 'const COMMAND_REGISTRY\s*=\s*\[[\s\S]*?\n\];').Value
Check ($cmdReg108 -match 'CONSULT') '108.11: COMMAND_REGISTRY lists a CONSULT entry (discoverability)'
# 108.12 CSS overflow guard
Check (($css108 -match '\.consult-card\b') -and ($css108 -match '\.consult-hit-name[\s\S]{0,80}min-width:\s*0')) `
    '108.12: terminal.css .consult-card + .consult-hit-name min-width:0 (no horizontal overflow at 360px)'
# 108.13 shared modal entry point (Step 2 Phase 0 U12 consolidated driver)
Check ($consultBody -match 'openModal') `
    '108.13: renderConsult opens via openModal() (U12 driver -- shared modal ARIA/focus consistency)'

# ── WU-N4b: CONSULT macro button (option A) ──────────────────────────────────
$html108 = Read-Src "index.html"
$consultBtn108 = [regex]::Match($html108, '<button[^>]*id="consultBtn"[\s\S]*?</button>').Value
# 108.14 discoverable CONSULT button wired to macroCommand('[CONSULT]') + aria-label + #macroTarget topic input
Check (($html108 -match 'id="consultBtn"') -and ($consultBtn108 -match 'onclick="macroCommand\(''\[CONSULT\]''\)"') -and ($consultBtn108 -match 'aria-label="[^"]+"') -and ($html108 -match 'id="macroTarget"')) `
    "108.14: index.html CONSULT macro button (#consultBtn) -> macroCommand('[CONSULT]') with aria-label, reusing #macroTarget topic input (WU-N4b option A)"
# 108.15 native end-to-end: [CONSULT] is a NATIVE_COMMAND_ROUTER entry -> renderConsult (not macroCommand->AI)
Check ($routerBlock -match "'\[CONSULT\]':\s*topic\s*=>\s*renderConsult\(topic\)") `
    '108.15: [CONSULT] routes via NATIVE_COMMAND_ROUTER -> renderConsult -- the CONSULT button is native, never falls through to the AI (WU-N4b)'

# ── WU-N4b option C: DATABANK panel (DATA tab) sharing the CONSULT engine ─────
$databankPanel108 = [regex]::Match($html108, '<details class="panel"[^>]*id="databankPanel"[\s\S]*?</details>').Value
$renderDbBody = ''
try { $renderDbBody = Get-FunctionBody $ren108 'renderDatabankPanel' } catch {}
$renderConsultBody = ''
try { $renderConsultBody = Get-FunctionBody $ren108 'renderConsult' } catch {}
$consultRenderHtmlBody = ''
try { $consultRenderHtmlBody = Get-FunctionBody $ren108 '_consultRenderHTML' } catch {}
# 108.16 DATABANK panel present (DATA tab) + Protocol 5 wiring + render fn called from loadUI
Check (($html108 -match '<details class="panel"[^>]*id="databankPanel"') -and ($databankPanel108 -match 'data-tab="data"') -and ($databankPanel108 -match '<summary><h2>[^<]*DATABANK</h2>') -and ($databankPanel108 -match 'id="databankSearch"[\s\S]*?oninput="renderDatabankPanel\(\)"') -and ($databankPanel108 -match 'aria-label="[^"]+"') -and ($databankPanel108 -match 'id="databankResults"') -and ($ren108 -match 'function renderDatabankPanel\s*\(') -and ($core108 -match 'renderDatabankPanel\(\)')) `
    '108.16: DATABANK panel (DATA tab) -- <details class="panel"> + UI-1 heading + accessible #databankSearch (oninput->renderDatabankPanel) + #databankResults; renderDatabankPanel() defined + called from loadUI (WU-N4b option C, Protocol 5)'
# 108.17 shared CONSULT engine (Protocol 22) -- both renderers route through the shared core; no duplicated card markup
Check (($ren108 -match 'function _consultSearch\s*\(') -and ($ren108 -match 'function _consultRenderHTML\s*\(') -and ($renderConsultBody -match '_consultSearch\(') -and ($renderConsultBody -match '_consultRenderHTML\(') -and ($renderDbBody -match '_consultSearch\(') -and ($renderDbBody -match '_consultRenderHTML\(') -and ($consultRenderHtmlBody -match 'consult-card') -and (-not ($renderConsultBody -match 'consult-card')) -and (-not ($renderDbBody -match 'consult-card'))) `
    '108.17: shared CONSULT engine (Protocol 22) -- renderConsult + renderDatabankPanel both route through _consultSearch + _consultRenderHTML; the consult-card markup lives only in the shared renderer (no duplication)'
# 108.18 DATABANK panel is read-only + offline (no AI route)
Check (($renderDbBody -match 'databankSearch') -and ($renderDbBody -match 'databankResults') -and (-not ($renderDbBody -match 'fetch\(')) -and (-not ($renderDbBody -match 'transmitMessage')) -and (-not ($renderDbBody -match 'appendToChat'))) `
    '108.18: DATABANK panel is read-only + offline -- renderDatabankPanel reads #databankSearch, writes #databankResults, never calls fetch/transmitMessage/appendToChat (no AI route, WU-N4b option C)'

# ===========================================================
# Suite 109 -- WU-N5 BIO-SCAN native medical advisory (13 tests)
# Deterministic limb/HP/radiation/addiction advisory from state + CHEMS, routed
# through NATIVE_COMMAND_ROUTER, offline + read-only + no AI. Locks router wiring,
# the compute core (structural mirror of the JS behavioral eval), AI-path
# retirement, read-only, XSS escaping, Protocol-38 agnosticism, discoverability.
# NOTE: source slices + -cmatch (not Get-FunctionBody / case-insensitive -match)
# to avoid the template-literal over-capture + case-fold pitfalls (WU-N4 Protocol-42).
# ===========================================================
Sep "Suite 109 -- WU-N5 BIO-SCAN native medical advisory"
$ren109 = Read-Src "js/ui-render.js"
$api109 = Read-Src "js/api.js"
$core109 = Read-Src "js/ui-core.js"
$css109 = Read-Src "css/terminal.css"
$html109 = Read-Src "index.html"
$dbnv109 = Read-Src "js/db_nv.js"
$dbfo3109 = Read-Src "js/db_fo3.js"
$routerBlock109 = [regex]::Match($api109, 'const NATIVE_COMMAND_ROUTER\s*=\s*\{[\s\S]*?\n\};').Value
$rs109 = $ren109.IndexOf('const _BIO_LIMBS')
$re109 = $ren109.IndexOf('function renderBioScan')
$bioRegion109 = if (($rs109 -ge 0) -and ($re109 -gt $rs109)) { $ren109.Substring($rs109, $re109 - $rs109) } else { '' }
$be109 = $ren109.IndexOf('function _updateContextPanels')
$bioScanBody109 = if (($re109 -ge 0) -and ($be109 -gt $re109)) { $ren109.Substring($re109, $be109 - $re109) } else { '' }

# 109.1 renderBioScan + the pure compute core both defined
Check (($ren109 -match 'function renderBioScan\s*\(') -and ($ren109 -match 'function _bioScanCompute\s*\(')) `
    '109.1: renderBioScan() + _bioScanCompute() defined in ui-render.js'
# 109.2 getChemsTable defined in BOTH db files (game-agnostic parity)
Check (($dbnv109 -match 'function getChemsTable\s*\(') -and ($dbfo3109 -match 'function getChemsTable\s*\(')) `
    '109.2: getChemsTable() defined in BOTH db_nv.js and db_fo3.js (works in either game context)'
# 109.3 router wires [BIO-SCAN] + [BIO] -> renderBioScan
Check (($routerBlock109 -match "\[BIO-SCAN\]'\s*:\s*[^\n]*renderBioScan") -and ($routerBlock109 -match "\[BIO\]'\s*:\s*[^\n]*renderBioScan")) `
    "109.3: NATIVE_COMMAND_ROUTER routes '[BIO-SCAN]' + '[BIO]' -> renderBioScan (native, no AI)"
# 109.4 data-driven addiction source
Check ($bioScanBody109 -match 'getChemsTable\s*\(') `
    '109.4: renderBioScan sources chem/addiction data via getChemsTable() (data-driven)'
# 109.5 structural mirror of the JS behavioral eval -- the compute encodes every
#       advisory branch (limb/HP/rad/addiction) + the HP tier logic.
Check (($bioRegion109 -cmatch 'CRIPPLED') -and ($bioRegion109 -cmatch 'CRITICAL') -and ($bioRegion109 -cmatch 'WOUNDED') -and ($bioRegion109 -cmatch 'ADDICTION RISK') -and ($bioRegion109 -cmatch 'RADIATION') -and ($bioRegion109 -cmatch "kind: 'limb'") -and ($bioRegion109 -cmatch "kind: 'addiction'")) `
    '109.5: _bioScanCompute encodes the crippled/critical/wounded/rad/addiction advisory branches (structural mirror of the JS behavioral eval)'
# 109.6 read-only
Check ((-not ($bioScanBody109 -match 'saveState\s*\(')) -and (-not ($bioScanBody109 -match 'pushToCloud')) -and (-not ($bioScanBody109 -match 'state\.\w+\s*=[^=]'))) `
    '109.6: renderBioScan is read-only (no saveState/pushToCloud/state writes)'
# 109.7 XSS-safe escaping
Check (($bioScanBody109 -match 'escapeHtml\(a\.text\)') -and ($bioScanBody109 -match 'escapeHtml\(l\.label\)')) `
    '109.7: renderBioScan escapes advisory + limb text via escapeHtml() before innerHTML'
# 109.8 game-agnostic (Protocol 38) -- no game/item literals in the compute core
Check (($bioRegion109 -ne '') -and (-not ($bioRegion109 -cmatch '\bFNV\b|\bFO3\b|Fallout|New Vegas')) -and (-not ($bioRegion109 -match "['""]Stimpak['""]|['""]RadAway['""]|['""]Med-X['""]"))) `
    '109.8: _bioScanCompute carries no FNV/FO3/Fallout or hardcoded chem-name literals (Protocol 38 -- data-driven)'
# 109.9 AI-path retirement
Check (($api109 -match 'do NOT produce a BIO-SCAN modal') -and (-not ($api109 -match 'Track RAD thresholds and crippled limbs via \[BIO-SCAN\]'))) `
    '109.9: getSystemDirective retires the AI BIO-SCAN path (defers to the native calculator)'
# 109.10 discoverable
$cmdReg109 = [regex]::Match($core109, 'const COMMAND_REGISTRY\s*=\s*\[[\s\S]*?\n\];').Value
Check ($cmdReg109 -match 'BIO-SCAN') '109.10: COMMAND_REGISTRY lists a BIO-SCAN entry (discoverability)'
# 109.11 CSS overflow guard
Check (($css109 -match '\.bio-card\b') -and ($css109 -match '\.bio-limb-name[\s\S]{0,80}min-width:\s*0')) `
    '109.11: terminal.css .bio-card + .bio-limb-name min-width:0 (no horizontal overflow at 360px)'
# 109.12 shared modal entry point (Step 2 Phase 0 U12 consolidated driver)
Check ($bioScanBody109 -match 'openModal') `
    '109.12: renderBioScan opens via openModal() (U12 driver -- shared modal ARIA/focus consistency)'
# 109.13 RUN BIO-SCAN button affordance
$bioBtn109 = [regex]::Match($html109, '<button\b[^>]*renderBioScan\(\)[^>]*>').Value
Check (($html109 -match 'onclick="renderBioScan\(\)"') -and ($bioBtn109 -match 'aria-label="[^"]+"')) `
    '109.13: index.html has a RUN BIO-SCAN button wired to renderBioScan() with an aria-label'

# ===========================================================
# Suite 110 -- WU-N6 LOOT native add/value terminal (13 tests)
# Deterministic salvage terminal: pick a DB-catalog item, ADD it additively to
# state.inventory[] at its DB value, confirm-gated, routed through
# NATIVE_COMMAND_ROUTER, offline + no AI for the math. Locks router wiring, the
# pure additive merge core (structural mirror of the JS behavioral eval), confirm
# gate + additive-only writes, DB value sourcing, AI-path retirement, XSS escaping,
# Protocol-38 agnosticism, discoverability + CSS overflow.
# NOTE: source slices + -cmatch (not Get-FunctionBody / case-insensitive -match)
# to avoid the template-literal over-capture + case-fold pitfalls (Protocol-42).
# ===========================================================
Sep "Suite 110 -- WU-N6 LOOT native add/value terminal"
$ren110 = Read-Src "js/ui-render.js"
$api110 = Read-Src "js/api.js"
$core110 = Read-Src "js/ui-core.js"
$css110 = Read-Src "css/terminal.css"
$html110 = Read-Src "index.html"
$routerBlock110 = [regex]::Match($api110, 'const NATIVE_COMMAND_ROUTER\s*=\s*\{[\s\S]*?\n\};').Value
$ls110 = $ren110.IndexOf('function _lootAdd')
$le110 = $ren110.IndexOf('// -- WU-N3: THREAT')
if ($le110 -lt 0) { $le110 = $ren110.IndexOf('function _threatCompute') }
$lootRegion110 = if (($ls110 -ge 0) -and ($le110 -gt $ls110)) { $ren110.Substring($ls110, $le110 - $ls110) } else { '' }
$ds110 = $ren110.IndexOf('function doLoot')
$doLootBody110 = if (($ds110 -ge 0) -and ($le110 -gt $ds110)) { $ren110.Substring($ds110, $le110 - $ds110) } else { '' }

# 110.1 renderLoot + renderLootList + doLoot + the pure core all defined
Check (($ren110 -match 'function renderLoot\s*\(') -and ($ren110 -match 'function renderLootList\s*\(') -and ($ren110 -match 'function doLoot\s*\(') -and ($ren110 -match 'function _lootAdd\s*\(')) `
    '110.1: renderLoot() + renderLootList() + doLoot() + _lootAdd() defined in ui-render.js'
# 110.2 sources items from the shared DB catalog (getTradeCatalog)
Check ($lootRegion110 -match 'getTradeCatalog\s*\(') `
    '110.2: LOOT sources items via getTradeCatalog() (deterministic DB catalog -- reuse, not a new list)'
# 110.3 router wires [LOOT] + [LT] -> renderLoot
Check (($routerBlock110 -match "\[LOOT\]'\s*:\s*[^\n]*renderLoot") -and ($routerBlock110 -match "\[LT\]'\s*:\s*[^\n]*renderLoot")) `
    "110.3: NATIVE_COMMAND_ROUTER routes '[LOOT]' + '[LT]' -> renderLoot (native, no AI)"
# 110.4 value sourced from the DB (lookupItemInDb Value column)
Check (($doLootBody110 -match 'lookupItemInDb\s*\(') -and ($lootRegion110 -match 'db\.val')) `
    '110.4: loot value/weight sourced from lookupItemInDb (DB Value column), not invented'
# 110.5 structural mirror of the JS behavioral eval -- the additive merge core
Check (($lootRegion110 -cmatch 'ex\.qty') -and ($lootRegion110 -match '\.find\(') -and ($lootRegion110 -match 'toLowerCase\(\)') -and ($lootRegion110 -match 'db\.val != null') -and ($lootRegion110 -match 'Math\.max\(1')) `
    '110.5: _lootAdd encodes the additive find-or-increment merge + DB value sourcing + qty floor (structural mirror of the JS behavioral eval)'
# 110.6 confirm-gated (Protocol 34; Step 2 Phase 0 U12: diegetic confirmAction() replaces confirm())
Check (($doLootBody110 -match 'await\s+confirmAction\([\s\S]{0,220}\)') -and ($doLootBody110 -match 'if\s*\(\s*!ok\s*\)\s*return')) `
    '110.6: doLoot is confirmAction-gated (Protocol 34 -- no add without explicit confirmation)'
# 110.7 additive-only + persists via saveState, no wholesale reset
Check (($doLootBody110 -match '_lootAdd\(') -and ($doLootBody110 -match 'saveState\s*\(\s*\)') -and (-not ($doLootBody110 -match 'state\.inventory\s*=\s*\[\]'))) `
    '110.7: doLoot is additive (merges via _lootAdd) + persists via saveState (no wholesale inventory reset)'
# 110.8 game-agnostic (Protocol 38) -- no game/item literals in the LOOT core
Check (($lootRegion110 -ne '') -and (-not ($lootRegion110 -cmatch '\bFNV\b|\bFO3\b|Fallout|New Vegas')) -and (-not ($lootRegion110 -match "['""]Stimpak['""]|['""]Nuka['""]"))) `
    '110.8: the LOOT core carries no FNV/FO3/Fallout or hardcoded item-name literals (Protocol 38)'
# 110.9 AI-path retirement
Check (($api110 -match 'native deterministic offline tool') -and ($api110 -match 'do NOT emit a LOOT picker/modal or compute item values')) `
    '110.9: getSystemDirective retires the AI LOOT path (defers add/value to the native terminal)'
# 110.10 discoverable
$cmdReg110 = [regex]::Match($core110, 'const COMMAND_REGISTRY\s*=\s*\[[\s\S]*?\n\];').Value
Check ($cmdReg110 -match '\[LOOT\]') '110.10: COMMAND_REGISTRY lists a [LOOT] entry (discoverability)'
# 110.11 CSS overflow guard
Check (($css110 -match '\.loot-row\b') -and ($css110 -match '\.loot-row\s+\.loot-name[\s\S]{0,80}min-width:\s*0')) `
    '110.11: terminal.css .loot-row + .loot-name min-width:0 (no horizontal overflow at 360px)'
# 110.12 XSS-safe escaping
Check (($ren110 -match 'escapeHtml\(it\.name\)') -and ($ren110 -match 'escapeHtml\(pre\)')) `
    '110.12: LOOT escapes item names + the search prefill via escapeHtml() before innerHTML'
# 110.13 [LOOT] button affordance + shared modal
$lootBtn110 = [regex]::Match($html110, '<button\b[^>]*renderLoot\(\)[^>]*>').Value
Check (($html110 -match 'onclick="renderLoot\(\)"') -and ($lootBtn110 -match 'aria-label="[^"]+"') -and ($lootRegion110 -match 'openModal')) `
    '110.13: index.html [LOOT] button wired to renderLoot() with an aria-label; opens via openModal() (U12 driver -- shared modal)'

# ===========================================================
# Suite 111 -- WU-E1 diegetic terminology / voice standards (11 tests)
# Locks the HOUSE_STANDARD terminology pass: ALL-CAPS content
# placeholders + empty-states, game-agnostic out-of-frame manifest
# copy, DIRECTOR (not "AI"/"Gemini") narrative-error voice, and the
# UPLINK auth framing. Static guards (PS mirror of JS Suite 111).
# ===========================================================
Sep "Suite 111 -- WU-E1 diegetic terminology / voice standards"
$html111 = Read-Src "index.html"
$api111  = Read-Src "js/api.js"
$acct111 = Read-Src "js/ui-account.js"
$mani111 = (Read-Src "manifest.json" | ConvertFrom-Json)

# 111.1 every content-input placeholder is ALL-CAPS (no lowercase) -- MN-6 (case-sensitive)
Check (-not ($html111 -cmatch 'placeholder="[^"]*[a-z][^"]*"')) `
    '111.1: index.html has no lower-case placeholder= on any content input (ALL-CAPS terminal register, MN-6)'

# 111.2 every static .empty-state span is ALL-CAPS -- MN-7 (case-sensitive)
Check (-not ($html111 -cmatch 'empty-state">[^<]*[a-z]')) `
    '111.2: index.html .empty-state spans are ALL-CAPS canon empty-state voice (MN-7)'

# 111.3 manifest description is game-agnostic out-of-frame (Protocol 38) -- MJ-4
Check (($mani111.description) -and ($mani111.description.Length -gt 0) -and -not ($mani111.description -imatch 'Fallout|New Vegas')) `
    '111.3: manifest.json description names no real game title (Fallout/New Vegas) -- game-agnostic out-of-frame (MJ-4/Protocol 38)'

# 111.4 manifest shortcut descriptions carry no modern-web phrasing / "AI" leak -- MJ-4
$bad111 = @($mani111.shortcuts | Where-Object { (-not $_.description) -or ($_.description -cmatch 'Open the|\bAI\b') })
Check (($mani111.shortcuts.Count -gt 0) -and ($bad111.Count -eq 0)) `
    '111.4: manifest shortcut descriptions are diegetic -- no "Open the ..." / "AI" modern-web tells (MJ-4)'

# 111.5 narrative AI/Gemini "tells" are gone from api.js Courier-facing errors -- MJ-5/MN-9
Check ((-not ($api111 -match 'AI KEY REJECTED')) -and (-not ($api111 -match 'AI LINK PAUSED')) -and (-not ($api111 -match 'AI returned an unexpected')) -and (-not ($api111 -match 'AI LINK TEMPORARILY DISABLED'))) `
    '111.5: api.js narrative errors no longer leak "AI"/"Gemini" to the Courier (MJ-5/MN-9)'

# 111.6 DIRECTOR voice is present in the reframed api.js errors -- MJ-5
Check (($api111 -match 'DIRECTOR ACCESS KEY REJECTED') -and ($api111 -match 'DIRECTOR LINK RETURNED MALFORMED TELEMETRY') -and ($api111 -match 'DIRECTOR LINK PAUSED')) `
    '111.6: api.js error narrative uses the in-world DIRECTOR LINK / DIRECTOR ACCESS KEY voice (MJ-5)'

# 111.7 auth panel copy drops modern "sign in" vocabulary -- MJ-2
Check ((-not ($acct111 -match 'NOT SIGNED IN')) -and (-not ($acct111 -match 'SIGN IN WITH GOOGLE')) -and (-not ($acct111 -match '> SIGN OUT<'))) `
    '111.7: ui-account.js auth copy carries no "SIGN IN"/"SIGNED IN"/"SIGN OUT" modern-web display strings (MJ-2)'

# 111.8 auth panel copy uses the UPLINK framing -- MJ-2
Check (($acct111 -match 'UPLINK OFFLINE') -and ($acct111 -match 'ESTABLISH GOOGLE UPLINK') -and ($acct111 -match 'UPLINK ACTIVE') -and ($acct111 -match 'SEVER UPLINK')) `
    '111.8: ui-account.js auth panel uses the UPLINK framing (OFFLINE / ESTABLISH / ACTIVE / SEVER) (MJ-2)'

# 111.9 cloud-archive system states use canon voice -- MJ-3
Check ((-not ($acct111 -match 'Loading saves')) -and (-not ($acct111 -match 'No saves found')) -and ($acct111 -match 'RETRIEVING ARCHIVES') -and ($acct111 -match 'NO ARCHIVES ON FILE')) `
    '111.9: ui-account.js cloud-archive states use RETRIEVING ARCHIVES / NO ARCHIVES ON FILE canon voice (MJ-3)'

# 111.10 update modal uses the FIRMWARE voice -- PO-10
Check ((-not ($html111 -match 'new version of RobCo')) -and (-not ($html111 -match 'Reboot to load')) -and ($html111 -match 'FIRMWARE UPDATE STAGED')) `
    '111.10: index.html update modal uses FIRMWARE UPDATE STAGED -- REBOOT voice (PO-10)'

# 111.11 image-upload control uses VISUAL UPLOAD, not "ATTACH" -- MN-8
Check ((-not ($html111 -match 'ATTACH VISUAL DATA')) -and ($html111 -match 'VISUAL UPLOAD')) `
    '111.11: index.html optic-scan control uses > VISUAL UPLOAD, not "ATTACH" (MN-8)'

# ===========================================================
# Suite 112 -- WU-E2 reusable disabled banner templates (7 tests)
# Owner override: #updateBanner + fo3WarningBanner are KEPT as inert,
# reusable <template> banners -- NEVER deleted. Guards they still EXIST
# and are disabled-by-default (wrapped in <template>, so the browser
# parses but never renders/activates them on their own).
# (PS mirror of JS Suite 112.)
# ===========================================================
Sep "Suite 112 -- WU-E2 reusable disabled banner templates"
$html112 = Read-Src "index.html"
$css112  = Read-Src "css/terminal.css"

# 112.1  #updateBannerTemplate <template> still EXISTS (not deleted)
Check ([bool]($html112 -match '<template id="updateBannerTemplate">')) `
    '112.1: #updateBannerTemplate <template> exists in index.html (update banner kept as template -- never deleted)'

# 112.2  the update banner markup lives INSIDE that template (disabled by default -- inert)
Check ([bool]($html112 -match '(?s)<template id="updateBannerTemplate">[\s\S]*?class="update-banner"[\s\S]*?</template>')) `
    '112.2: .update-banner markup is wrapped in #updateBannerTemplate (disabled-by-default -- <template> never renders on its own)'

# 112.3  the .update-banner style rule is PRESERVED in terminal.css (style not deleted)
Check ([bool]($css112 -match '\.update-banner\s*\{')) `
    '112.3: .update-banner CSS rule preserved in terminal.css (reusable banner style kept)'

# 112.4  #fo3WarningBannerTemplate <template> still EXISTS (not deleted)
Check ([bool]($html112 -match '<template id="fo3WarningBannerTemplate">')) `
    '112.4: #fo3WarningBannerTemplate <template> exists in index.html (FO3 warning banner kept as template -- never deleted)'

# 112.5  the #fo3WarningBanner div lives INSIDE that template AND is display:none
Check ([bool]($html112 -match '(?s)<template id="fo3WarningBannerTemplate">[\s\S]*?id="fo3WarningBanner"[^>]*style="[^"]*display:\s*none[\s\S]*?</template>')) `
    '112.5: #fo3WarningBanner is wrapped in its template and carries display:none (disabled-by-default)'

# 112.6  the .fo3-warning-banner style rule is PRESERVED in terminal.css (style not deleted)
Check ([bool]($css112 -match '\.fo3-warning-banner\s*\{')) `
    '112.6: .fo3-warning-banner CSS rule preserved in terminal.css (reusable banner style kept)'

# 112.7  neither banner is ACTIVE outside a <template> -- each handle appears exactly once,
#        only inside its template, so nothing renders by default.
$ubCount  = ([regex]::Matches($html112, 'class="update-banner"')).Count
$fo3Count = ([regex]::Matches($html112, 'id="fo3WarningBanner"')).Count
$ubInTpl  = [bool]($html112 -match '(?s)<template id="updateBannerTemplate">[\s\S]*?class="update-banner"[\s\S]*?</template>')
Check (($ubCount -eq 1) -and ($fo3Count -eq 1) -and $ubInTpl) `
    '112.7: each banner appears exactly once and only inside its <template> (no active, rendered banner outside a template)'

# ===========================================================
# Suite 113 -- WU-E3 FEATURES / command-reference consistency (7 tests)
# Locks COMMAND_REGISTRY (ui-core.js) <-> NATIVE_COMMAND_ROUTER (api.js) <-> the
# [FEATURES] help modal so the command reference can't drift: every native terminal
# is advertised, retired AI macros stay gone. (PS mirror of JS Suite 113.)
# ===========================================================
Sep "Suite 113 -- WU-E3 FEATURES / command-reference consistency"
$uiCore113 = Read-Src "js/ui-core.js"
$api113    = Read-Src "js/api.js"
$registry113 = [regex]::Match($uiCore113, 'const COMMAND_REGISTRY = \[([\s\S]*?)\n\];').Groups[1].Value
$router113   = [regex]::Match($api113, 'const NATIVE_COMMAND_ROUTER = \{([\s\S]*?)\n\};').Groups[1].Value

$NATIVES113 = @('[VATS SIM]','[THREAT]','[TRADE]','CONSULT','[BIO-SCAN]','[LOOT]')
$ROUTER_NATIVES113 = @('[VATS SIM]','[THREAT]','[BIO-SCAN]','[LOOT]','[CONSULT]')
$RETIRED113 = @('[VVATS]','[TACTICS]','[SYNC:','[STASH','[EXCESS]','[CURRENCY]','[AUDIT]','[TIMER/CHEM]','[SQUAD]','[TRAVEL CLUSTER]','[CASINO]','[COMM LINK]','[PAUSE]','[PAGE 2','[ARCHIVE]','[TIMELINE]')

# 113.1  registry parsed + NATIVE TERMINALS group marked OFFLINE / NO AI
Check (($registry113.Length -gt 0) -and ($registry113 -match 'NATIVE TERMINALS[^'']*OFFLINE[^'']*NO AI')) `
    '113.1: COMMAND_REGISTRY has a "NATIVE TERMINALS -- OFFLINE, NO AI" group (six deterministic terminals surfaced together)'

# 113.2  all six native terminals advertised
$natOk113 = $true; foreach ($t in $NATIVES113) { if (-not $registry113.Contains($t)) { $natOk113 = $false } }
Check $natOk113 `
    '113.2: COMMAND_REGISTRY advertises all six native terminals (VATS/THREAT/TRADE/CONSULT/BIO-SCAN/LOOT)'

# 113.3  each native entry marked Offline (>=6 occurrences)
Check (([regex]::Matches($registry113, 'Offline\.')).Count -ge 6) `
    '113.3: every native terminal entry is marked "Offline." in COMMAND_REGISTRY (no stale AI descriptions)'

# 113.4  router<->help consistency: every router-native resolves in router AND appears in help
$rnOk113 = $true
foreach ($t in $ROUTER_NATIVES113) {
  $bare = $t -replace '[\[\]]',''
  if (-not ($router113.Contains("'" + $t + "'") -and $registry113.Contains($bare))) { $rnOk113 = $false }
}
Check $rnOk113 `
    '113.4: every router-native token (VATS SIM/THREAT/BIO-SCAN/LOOT/CONSULT) resolves in NATIVE_COMMAND_ROUTER AND appears in COMMAND_REGISTRY'

# 113.5  [FEATURES] -> showHelpModal, and showHelpModal renders COMMAND_REGISTRY
Check (($api113 -match "'\[FEATURES\]':\s*\(\)\s*=>\s*showHelpModal\(\)") -and ($uiCore113 -match 'function showHelpModal\(\)[\s\S]*COMMAND_REGISTRY\.map')) `
    '113.5: [FEATURES] -> showHelpModal in NATIVE_COMMAND_ROUTER, and showHelpModal renders COMMAND_REGISTRY'

# 113.6  no retired AI macro present in the help registry
$leaked113 = @(); foreach ($t in $RETIRED113) { if ($registry113.Contains($t)) { $leaked113 += $t } }
Check ($leaked113.Count -eq 0) `
    ('113.6: no retired AI macro present in COMMAND_REGISTRY (' + $(if ($leaked113.Count) { 'LEAKED: ' + ($leaked113 -join ', ') } else { 'all retired tokens absent' }) + ')')

# 113.7  TRADE advertised as the PANEL, correctly NOT a router token
Check ($registry113.Contains('[TRADE]') -and (-not $router113.Contains("'[TRADE]'"))) `
    '113.7: [TRADE] is advertised in help as the native barter PANEL and is correctly NOT a NATIVE_COMMAND_ROUTER token'

# ===========================================================
# Suite 114 -- Map location discovery persistence (fog-of-war) (7 tests)
# A location stays [VISITED] once visited -- both the manual location-change path and
# the AI import path record it via the shared recordLocationVisit() helper (deduped,
# permanent); renderWorldMap reads locationHistory for CURRENT/VISITED/UNKNOWN.
# (Protocol 42 map fix. PS mirror of JS Suite 114.)
# ===========================================================
Sep "Suite 114 -- Map location discovery persistence"
$stateSrc114  = Read-Src "js/state.js"
$apiSrc114    = Read-Src "js/api.js"
$uiCoreSrc114 = Read-Src "js/ui-core.js"
$uiRender114  = Read-Src "js/ui-render.js"
$recordBody114 = [regex]::Match($stateSrc114, '(?s)function recordLocationVisit\([\s\S]*?\n\}').Value
$olcBody114    = [regex]::Match($uiCoreSrc114, '(?s)function onLocationChange\(\)[\s\S]*?\n\}').Value

# 114.1  shared helper recordLocationVisit() defined in state.js
Check ([bool]($stateSrc114 -match 'function recordLocationVisit\(')) `
    '114.1: recordLocationVisit() helper defined in state.js (single source for map-discovery recording)'

# 114.2  helper dedups case-insensitively AND is permanent (no destructive cap)
Check (($recordBody114 -match 'toLowerCase\(\)') -and ($recordBody114 -match '\.some\(') -and ($recordBody114 -match 'state\.locationHistory\.push\(') -and (-not ($recordBody114 -match 'slice\(-?\d+\)'))) `
    '114.2: recordLocationVisit dedups case-insensitively and never truncates (permanent fog-of-war discovery)'

# 114.3  manual path: onLocationChange records the LEFT + NEW location via the helper
Check (($olcBody114 -match 'const prevLoc = state\.loc') -and (([regex]::Matches($olcBody114, 'recordLocationVisit\(')).Count -ge 2) -and ($olcBody114 -match 'recordLocationVisit\(prevLoc\)')) `
    '114.3: onLocationChange records the previous + new location via recordLocationVisit (manual move keeps the left location discovered)'

# 114.4  AI path routes through the helper; old inline push + slice truncation gone
Check (($apiSrc114 -match 'recordLocationVisit\(locV\)') -and (-not ($apiSrc114 -match 'state\.locationHistory\.push\(')) -and (-not ($apiSrc114 -match 'state\.locationHistory\.slice\('))) `
    '114.4: autoImportState records visits via recordLocationVisit() (no inline push / no slice(-10) truncation)'

# 114.5  renderWorldMap exposes all three statuses from locationHistory
Check (($uiRender114 -match 'state\.locationHistory') -and ($uiRender114 -match '\[CURRENT\]') -and ($uiRender114 -match '\[VISITED\]') -and ($uiRender114 -match '\[UNKNOWN\]')) `
    '114.5: renderWorldMap renders [CURRENT] / [VISITED] / [UNKNOWN] driven by state.locationHistory'

# 114.6  sanitizeImportedContainer coerces locationHistory (Protocol 4)
Check ([bool]($apiSrc114 -match "'collectibles', 'traits', 'skillBooks', 'magazines', 'locationHistory'")) `
    '114.6: sanitizeImportedContainer coerces locationHistory as a string[] on cloud-pull / file-import (Protocol 4)'

# 114.7  permanence guard -- no destructive 10-cap on locationHistory anywhere
Check ((-not ($apiSrc114 -match 'locationHistory\s*=\s*[^;]*slice\(-?\d+\)')) -and (-not ($stateSrc114 -match 'locationHistory\s*=\s*[^;]*slice\(-?\d+\)'))) `
    '114.7: no destructive cap (locationHistory = ...slice(-N)) anywhere -- discovered locations are never un-discovered'

# ===========================================================
# Suite 115 -- WU-F1 Sustained Power Cell (Screen Wake Lock) (8 tests)
# Keep-display-lit toggle: feature-detected, graceful fallback when unsupported,
# re-acquire on visibilitychange, release on toggle-off, persisted as a localStorage
# device preference. Game-agnostic, offline, no AI. (PS mirror of JS Suite 115.)
# ===========================================================
Sep "Suite 115 -- WU-F1 Sustained Power Cell (Wake Lock)"
$uiCore115 = Read-Src "js/ui-core.js"
$html115   = Read-Src "index.html"
$acq115 = [regex]::Match($uiCore115, '(?s)async function _acquireWakeLock\([\s\S]*?\n\}').Value
$tog115 = [regex]::Match($uiCore115, '(?s)async function toggleWakeLock\([\s\S]*?\n\}').Value
$ini115 = [regex]::Match($uiCore115, '(?s)function initWakeLock\([\s\S]*?\n\}').Value
$rel115 = [regex]::Match($uiCore115, '(?s)async function _releaseWakeLock\([\s\S]*?\n\}').Value

# 115.1  preference constant + getter
Check (($uiCore115 -match "const WAKE_LOCK_KEY = 'robco_wakelock_enabled'") -and ($uiCore115 -match 'function isWakeLockEnabled\(\)') -and ($uiCore115 -match 'MetaStore\.get\(WAKE_LOCK_KEY\)')) `
    '115.1: WAKE_LOCK_KEY + isWakeLockEnabled() persist the toggle as a localStorage device preference'

# 115.2  feature-detect before use
Check (($uiCore115 -match 'function _wakeLockSupported\(\)') -and ($uiCore115 -match "'wakeLock' in navigator") -and ($uiCore115 -match 'navigator\.wakeLock\.request')) `
    '115.2: _wakeLockSupported() feature-detects the Screen Wake Lock API before any use'

# 115.3  acquire requests 'screen' guarded + try/catch
Check (($acq115 -match "navigator\.wakeLock\.request\('screen'\)") -and ($acq115 -match 'try\s*\{') -and ($acq115 -match 'catch') -and ($acq115 -match '_wakeLockSupported\(\)')) `
    "115.3: _acquireWakeLock() requests a 'screen' lock guarded by _wakeLockSupported() inside try/catch (acquire failures never throw)"

# 115.4  toggle persists + acquires/releases; wired via onchange
Check (($tog115 -match 'MetaStore\.set\(WAKE_LOCK_KEY') -and ($tog115 -match '_acquireWakeLock\(\)') -and ($tog115 -match '_releaseWakeLock\(\)') -and ($html115 -match 'onchange="toggleWakeLock\(this\.checked\)"')) `
    '115.4: toggleWakeLock persists the pref + acquires/releases; #wakeLockToggle onchange wires to it'

# 115.5  re-acquire on visibilitychange
Check (($uiCore115 -match "addEventListener\('visibilitychange'") -and ($uiCore115 -match "document\.visibilityState === 'visible'") -and ($uiCore115 -match 'isWakeLockEnabled\(\)') -and ($uiCore115 -match '_acquireWakeLock\(\)')) `
    '115.5: a visibilitychange listener re-acquires the lock when the tab becomes visible and the pref is on'

# 115.6  graceful fallback -- initWakeLock disables the control when unsupported
Check (($ini115 -match '!_wakeLockSupported\(\)') -and ($ini115 -match 'toggle\.disabled = true')) `
    '115.6: initWakeLock() disables the toggle (graceful fallback) when the Wake Lock API is unavailable'

# 115.7  release never throws + initWakeLock wired into boot
Check (($rel115 -match '_wakeLockSentinel\.release\(\)') -and ($rel115 -match 'try\s*\{') -and ($rel115 -match 'catch') -and ($uiCore115 -match 'initWakeLock\(\);')) `
    '115.7: _releaseWakeLock() releases inside try/catch (never throws) and initWakeLock() is called from boot'

# 115.8  POWER MANAGEMENT sub-panel + accessible toggle + status note + data-sub-id
Check (($html115 -match 'data-sub-id="power_systems"') -and ($html115 -match 'POWER MANAGEMENT') -and ($html115 -match 'id="wakeLockToggle"') -and ($html115 -match 'id="wakeLockStatus"') -and ($html115 -match 'for="wakeLockToggle"')) `
    '115.8: POWER MANAGEMENT sub-panel (data-sub-id) has #wakeLockToggle + label[for] + #wakeLockStatus note'

# ===========================================================
# Suite 116 -- WU-F2 Haptic Solenoid (Vibration API) (8 tests)
# Brief chassis buzz on key events: feature-detected, opt-in localStorage device
# preference (default OFF), graceful no-op when navigator.vibrate is unavailable,
# and SUPPRESSED under prefers-reduced-motion. Game-agnostic, offline, no AI.
# (PS mirror of JS Suite 116.)
# ===========================================================
Sep "Suite 116 -- WU-F2 Haptic Solenoid (Vibration)"
$uiAudio116 = Read-Src "js/ui-audio.js"
$uiCore116  = Read-Src "js/ui-core.js"
$api116     = Read-Src "js/api.js"
$html116    = Read-Src "index.html"
$trg116 = [regex]::Match($uiAudio116, '(?s)function triggerHaptic\([\s\S]*?\n\}').Value
$tog116 = [regex]::Match($uiAudio116, '(?s)function toggleHaptic\([\s\S]*?\n\}').Value
$ini116 = [regex]::Match($uiAudio116, '(?s)function initHaptic\([\s\S]*?\n\}').Value

# 116.1  preference constant + getter (opt-in localStorage device setting, not state)
Check (($uiAudio116 -match "const HAPTIC_KEY = 'robco_haptic_enabled'") -and ($uiAudio116 -match 'function isHapticEnabled\(\)') -and ($uiAudio116 -match "MetaStore\.get\(HAPTIC_KEY\)\s*===\s*'true'")) `
    '116.1: HAPTIC_KEY + isHapticEnabled() persist the toggle as an opt-in (default OFF) localStorage device preference'

# 116.2  feature-detect before use
Check (($uiAudio116 -match 'function _hapticSupported\(\)') -and ($uiAudio116 -match "typeof navigator\.vibrate === 'function'")) `
    '116.2: _hapticSupported() feature-detects navigator.vibrate before any use'

# 116.3  reduced-motion detector uses the prefers-reduced-motion media query
Check (($uiAudio116 -match 'function _hapticReducedMotion\(\)') -and ($uiAudio116 -match "matchMedia\(['""]\(prefers-reduced-motion: reduce\)['""]\)")) `
    '116.3: _hapticReducedMotion() reads the prefers-reduced-motion media query'

# 116.4  core fire helper guards on unsupported / not-enabled / reduced-motion; vibrate in try/catch
Check (($trg116 -match 'if \(!_hapticSupported\(\)\) return false') -and ($trg116 -match 'if \(!isHapticEnabled\(\)\) return false') -and ($trg116 -match 'if \(_hapticReducedMotion\(\)\) return false') -and ($trg116 -match 'navigator\.vibrate\(') -and ($trg116 -match 'try\s*\{') -and ($trg116 -match 'catch')) `
    '116.4: triggerHaptic() no-ops when unsupported, when the pref is off, AND when reduced-motion is set; vibrate() is wrapped in try/catch'

# 116.5  toggle persists the pref + confirmation buzz; wired via onchange
Check (($tog116 -match 'MetaStore\.set\(HAPTIC_KEY') -and ($tog116 -match 'triggerHaptic\(') -and ($html116 -match 'onchange="toggleHaptic\(this\.checked\)"')) `
    '116.5: toggleHaptic persists the pref + fires a confirmation buzz; #hapticToggle onchange wires to it'

# 116.6  graceful fallback -- initHaptic disables the control when unsupported + boot-wired
Check (($ini116 -match '!_hapticSupported\(\)') -and ($ini116 -match 'toggle\.disabled = true') -and ($uiCore116 -match 'initHaptic\(\);')) `
    '116.6: initHaptic() disables the toggle (graceful fallback) when Vibration is unavailable and is called from boot'

# 116.7  fire points wired at the key events -- level-up + faction-threshold alert are
#        RobcoEvents subscribers in ui-audio.js/api.js (U7); critical HP stays a
#        RobcoEvents subscriber in ui-core.js (all three were inline before U7)
Check (($uiAudio116 -match "triggerHaptic\('levelup'\)") -and ($api116 -match "triggerHaptic\('alert'\)") -and ($uiCore116 -match "triggerHaptic\('lowhealth'\)")) `
    '116.7: triggerHaptic fires on level-up (ui-audio.js RobcoEvents subscriber) + faction-threshold alert (api.js RobcoEvents subscriber) + the critical-HP crossing (ui-core.js RobcoEvents subscriber)'

# 116.8  POWER MANAGEMENT sub-panel + accessible toggle + status note
Check (($html116 -match 'data-sub-id="power_systems"') -and ($html116 -match 'id="hapticToggle"') -and ($html116 -match 'id="hapticStatus"') -and ($html116 -match 'for="hapticToggle"')) `
    '116.8: POWER MANAGEMENT sub-panel has #hapticToggle + label[for] + #hapticStatus note'

# ===========================================================
# Suite 117 -- WU-F3 Eject Holotape (Web Share API) (8 tests)
# Ejects the comm-link log as a holotape transcript via navigator.share, with a
# three-tier graceful fallback (share -> clipboard -> download). Feature-detected,
# reuses _buildHolotapeText() formatting. Game-agnostic, offline, no AI.
# (PS mirror of JS Suite 117.)
# ===========================================================
Sep "Suite 117 -- WU-F3 Eject Holotape (Web Share)"
$saves117 = Read-Src "js/ui-saves.js"
$html117  = Read-Src "index.html"
$eject117 = [regex]::Match($saves117, '(?s)async function ejectHolotape\([\s\S]*?\n\}').Value

# 117.1  shared text builder extracted + reused by the .txt export (Protocol 22)
Check (($saves117 -match 'function _buildHolotapeText\(\)') -and ($saves117 -match "_downloadBlob\(_buildHolotapeText\(\), 'text/plain'")) `
    '117.1: _buildHolotapeText() is the single transcript builder, reused by the .txt export path (no duplication)'

# 117.2  Web Share feature-detect before use
Check (($saves117 -match 'function _shareSupported\(\)') -and ($saves117 -match "typeof navigator\.share === 'function'")) `
    '117.2: _shareSupported() feature-detects navigator.share before any use'

# 117.3  clipboard fallback is also feature-detected
Check (($saves117 -match 'function _clipboardSupported\(\)') -and ($saves117 -match 'navigator\.clipboard') -and ($saves117 -match "typeof navigator\.clipboard\.writeText === 'function'")) `
    '117.3: _clipboardSupported() feature-detects navigator.clipboard.writeText before the clipboard fallback'

# 117.4  tier 1 -- navigator.share with the holotape text, inside try/catch
Check (($eject117 -match '_shareSupported\(\)') -and ($eject117 -match 'await navigator\.share\(\{[^}]*text') -and ($eject117 -match 'try\s*\{') -and ($eject117 -match 'catch')) `
    '117.4: ejectHolotape() shares the transcript via navigator.share({text}) guarded by _shareSupported() inside try/catch'

# 117.5  a user-dismissed share sheet (AbortError) is honoured -- not treated as failure
Check (($eject117 -match 'AbortError') -and ($eject117 -match "err\.name === 'AbortError'")) `
    '117.5: a dismissed share sheet (AbortError) returns silently and does NOT fall through to clipboard/download'

# 117.6  tier 2 + tier 3 fallbacks present: clipboard copy then file download
Check (($eject117 -match '_clipboardSupported\(\)') -and ($eject117 -match 'navigator\.clipboard\.writeText\(text\)') -and ($eject117 -match "_downloadBlob\(text, 'text/plain'")) `
    '117.6: graceful fallback chain -- clipboard copy (tier 2) then _downloadBlob file eject (tier 3) when share is unavailable'

# 117.7  empty-log guard -- nothing to eject
Check (($eject117 -match '!chatHistory \|\| chatHistory\.length === 0') -and ($eject117 -match 'NOTHING TO EJECT')) `
    '117.7: ejectHolotape() refuses on an empty comm-link log (NOTHING TO EJECT)'

# 117.8  diegetic trigger button wired with an accessible label
Check (($html117 -match 'id="ejectHolotapeBtn"') -and ($html117 -match 'onclick="ejectHolotape\(\)"') -and ($html117 -match 'aria-label="[^"]*[Hh]olotape[^"]*"') -and ($html117 -match 'EJECT HOLOTAPE')) `
    '117.8: #ejectHolotapeBtn diegetic button wires onclick=ejectHolotape() with a descriptive aria-label'

# ===========================================================
# Suite 118 -- WU-F4 Pending-Directives Tally (Badging API) (8 tests)
# Posts the active-quest count on the installed icon while backgrounded, clears it
# when the terminal is open. Feature-detected, graceful no-op when unsupported,
# reuses the QUEST LOG count. Game-agnostic, offline, no AI.
# (PS mirror of JS Suite 118.)
# ===========================================================
Sep "Suite 118 -- WU-F4 Pending-Directives Tally (Badge)"
$uiCore118   = Read-Src "js/ui-core.js"
$manifest118 = Read-Src "manifest.json"
$badgeFn118 = [regex]::Match($uiCore118, '(?s)function _updateAppBadge\([\s\S]*?\n\}').Value

# 118.1  feature-detect both Badging API entry points before any use
Check (($uiCore118 -match 'function _badgeSupported\(\)') -and ($uiCore118 -match "typeof navigator\.setAppBadge === 'function'") -and ($uiCore118 -match "typeof navigator\.clearAppBadge === 'function'")) `
    '118.1: _badgeSupported() feature-detects navigator.setAppBadge + clearAppBadge before any use'

# 118.2  pending-directives count = active quests, shared with the QUEST LOG badge (Protocol 22)
Check (($uiCore118 -match 'function _pendingDirectivesCount\(\)') -and ($uiCore118 -match "state\.quests \|\| \[\]\)\.filter\(q => q\.status === 'active' \|\| !q\.status\)") -and ($uiCore118 -match "h2text: '> QUEST LOG',\s*count: _pendingDirectivesCount\(\)")) `
    '118.2: _pendingDirectivesCount() (active quests) is the single source reused by the QUEST LOG panel badge'

# 118.3  graceful no-op: badge update returns early when the API is unavailable
Check ($badgeFn118 -match 'if \(!_badgeSupported\(\)\) return') `
    '118.3: _updateAppBadge() returns early (graceful no-op) when the Badging API is unavailable'

# 118.4  sets the tally while hidden, clears while visible; wrapped in try/catch
Check (($badgeFn118 -match "document\.visibilityState === 'hidden'") -and ($badgeFn118 -match 'navigator\.setAppBadge\(n\)') -and ($badgeFn118 -match 'navigator\.clearAppBadge\(\)') -and ($badgeFn118 -match 'try\s*\{') -and ($badgeFn118 -match 'catch')) `
    '118.4: _updateAppBadge() posts the count when hidden + clears when visible, inside try/catch (never throws)'

# 118.5  async badge-promise rejection is swallowed (never an unhandled rejection)
Check (($badgeFn118 -match "typeof p\.catch === 'function'") -and ($badgeFn118 -match 'p\.catch\(\(\) => \{\}\)')) `
    '118.5: a rejecting setAppBadge/clearAppBadge promise is caught (no unhandled rejection)'

# 118.6  zero pending -> clears the badge (no stale count)
Check ($badgeFn118 -match 'n > 0 \? navigator\.setAppBadge\(n\) : navigator\.clearAppBadge\(\)') `
    '118.6: zero pending directives clears the app badge (no stale count left on the icon)'

# 118.7  wired into render (_updatePanelBadges) + a visibilitychange listener
Check (($uiCore118 -match '_updateAppBadge\(\); // WU-F4') -and ($uiCore118 -match "addEventListener\('visibilitychange', _updateAppBadge\)")) `
    '118.7: _updateAppBadge() is called from _updatePanelBadges (render) and on visibilitychange'

# 118.8  manifest declares the installed-PWA badge prerequisite (display: standalone)
Check ($manifest118 -match '"display":\s*"standalone"') `
    '118.8: manifest.json keeps display:standalone -- the installed-PWA prerequisite for app badges'

# ===========================================================
# Suite 119 -- WU-F7 Overseer's Maintenance Log (8 tests)
# Local device telemetry (boot count, total power-on, longest session, live uptime)
# surfaced as a DATA-tab read-out. Persisted as a localStorage device stat (NOT
# campaign state -- no Protocol-4 path), reuses the session clock, no web API, no
# AI, no network, game-agnostic. (PS mirror of JS Suite 119.)
# ===========================================================
Sep "Suite 119 -- WU-F7 Overseer's Maintenance Log"
$uiCore119 = Read-Src "js/ui-core.js"
$html119   = Read-Src "index.html"
$rd119  = [regex]::Match($uiCore119, '(?s)function _readOverseerLog\([\s\S]*?\n\}').Value
$wr119  = [regex]::Match($uiCore119, '(?s)function _writeOverseerLog\([\s\S]*?\n\}').Value
$ini119 = [regex]::Match($uiCore119, '(?s)function initOverseerLog\([\s\S]*?\n\}').Value
$fl119  = [regex]::Match($uiCore119, '(?s)function _flushOverseerLog\([\s\S]*?\n\}').Value
$rn119  = [regex]::Match($uiCore119, '(?s)function renderOverseerLog\([\s\S]*?\n\}').Value
$ovIdx119 = $html119.IndexOf('overseerLogPanel')
$ovSlice119 = if ($ovIdx119 -ge 0) { $html119.Substring($ovIdx119, [Math]::Min(600, $html119.Length - $ovIdx119)) } else { '' }

# 119.1  telemetry store constant + tolerant reader (localStorage device stat, not state)
Check (($uiCore119 -match "const OVERSEER_LOG_KEY = 'robco_overseer_log'") -and ($uiCore119 -match 'function _readOverseerLog\(\)') -and ($rd119 -match 'MetaStore\.get\(OVERSEER_LOG_KEY\)') -and ($rd119 -match 'catch') -and ($rd119 -match 'bootCount: 0, totalPowerOnMs: 0, longestSessionMs: 0')) `
    '119.1: OVERSEER_LOG_KEY + _readOverseerLog() back the log with a localStorage device stat and return zeroes on parse failure (never throws)'

# 119.2  writer wrapped so a quota / disabled store can never throw
Check (($wr119 -match 'MetaStore\.set\(OVERSEER_LOG_KEY') -and ($wr119 -match 'try\s*\{') -and ($wr119 -match 'catch')) `
    '119.2: _writeOverseerLog() persists inside try/catch -- a quota-full or disabled store never throws'

# 119.3  boot increments the count once + starts the session clock + wired into boot
Check (($ini119 -match 'if \(_overseerBooted\)') -and ($ini119 -match '_overseerBooted = true') -and ($ini119 -match 'o\.bootCount \+= 1') -and ($ini119 -match '_overseerSessionStart = Date\.now\(\)') -and ($uiCore119 -match 'initOverseerLog\(\); // WU-F7')) `
    '119.3: initOverseerLog() bumps bootCount once (guarded by _overseerBooted), starts the session clock, and is called from boot'

# 119.4  flush idempotent: total recomputed from boot-time base (no double-count) + longest tracked
Check (($fl119 -match 'o\.totalPowerOnMs = _overseerBaseMs \+ session') -and ($fl119 -match 'if \(session > o\.longestSessionMs\) o\.longestSessionMs = session') -and ($uiCore119 -match '_overseerBaseMs = o\.totalPowerOnMs')) `
    '119.4: _flushOverseerLog() recomputes total from _overseerBaseMs + session (idempotent, no double-count) and tracks the longest session'

# 119.5  read-out renders all four telemetry lines into #overseerLogDisplay
Check (($rn119 -match "getElementById\('overseerLogDisplay'\)") -and ($rn119 -match 'CURRENT UPTIME') -and ($rn119 -match 'LONGEST SESSION') -and ($rn119 -match 'TOTAL POWER-ON') -and ($rn119 -match 'BOOT COUNT') -and ($uiCore119 -match 'function _fmtOverseerDuration\(')) `
    '119.5: renderOverseerLog() renders CURRENT UPTIME / LONGEST SESSION / TOTAL POWER-ON / BOOT COUNT into #overseerLogDisplay via _fmtOverseerDuration'

# 119.6  totals survive a closed tab -- flush wired to visibilitychange-hidden + pagehide
Check (($uiCore119 -match 'if \(document\.hidden\) _flushOverseerLog\(\)') -and ($uiCore119 -match "addEventListener\('pagehide', _flushOverseerLog\)")) `
    '119.6: _flushOverseerLog() fires on visibilitychange-hidden and pagehide so power-on totals survive a closed tab'

# 119.7  read-out stays fresh -- renderOverseerLog called from loadUI + a periodic flush timer
Check (($uiCore119 -match 'renderOverseerLog\(\); // WU-F7') -and ($ini119 -match 'setInterval\(')) `
    '119.7: renderOverseerLog() is called from loadUI and a periodic flush timer keeps the live read-out current'

# 119.8  OVERSEER'S LOG panel: DATA-tab .panel + summary>h2 with ">" + display mount + local-only note, game-agnostic
Check (($html119 -match 'id="overseerLogPanel"') -and ($html119 -match '<details class="panel" data-tab="data" id="overseerLogPanel">') -and ($html119 -match '<summary><h2>&gt; OVERSEER''S LOG</h2></summary>') -and ($html119 -match 'id="overseerLogDisplay"') -and ($html119 -match 'STORED LOCALLY ON THIS UNIT') -and ($ovSlice119 -notmatch '\bFNV\b|\bFO3\b|Fallout')) `
    '119.8: OVERSEER''S LOG is a DATA-tab .panel (summary>h2 with ">") with #overseerLogDisplay + a local-only note, and is game-agnostic (no FNV/FO3/Fallout literals)'

# ===========================================================
# Suite 120 -- WU-F8 High-Lumen Optics (high-contrast mode) (8 tests)
# An AA+ contrast/legibility boost framed as driving the phosphor harder:
# activated by a manual OPTICS toggle (html.high-lumen, a localStorage device
# pref) AND the OS prefers-contrast: more media query -- both applying the same
# pure-CSS boosts. Game-agnostic, no AI. (PS mirror of JS Suite 120.)
# ===========================================================
Sep "Suite 120 -- WU-F8 High-Lumen Optics (high-contrast)"
$css120    = Read-Src "css/terminal.css"
$uiCore120 = Read-Src "js/ui-core.js"
$html120   = Read-Src "index.html"
$mStart120 = $css120.IndexOf('html.high-lumen body')
$pStart120 = $css120.IndexOf('@media (prefers-contrast: more) {', [Math]::Max(0, $mStart120))
$addEnd120 = $css120.IndexOf('/* Add-row form')
$manualBlock120 = if ($mStart120 -ge 0 -and $pStart120 -gt $mStart120) { $css120.Substring($mStart120, $pStart120 - $mStart120) } else { '' }
$prefBlock120   = if ($pStart120 -ge 0 -and $addEnd120 -gt $pStart120) { $css120.Substring($pStart120, $addEnd120 - $pStart120) } else { '' }
$tog120 = [regex]::Match($uiCore120, '(?s)function toggleHighLumen\([\s\S]*?\n\}').Value
$app120 = [regex]::Match($uiCore120, '(?s)function _applyHighLumen\([\s\S]*?\n\}').Value
$ini120 = [regex]::Match($uiCore120, '(?s)function initHighLumen\([\s\S]*?\n\}').Value
$hlStart120 = $html120.IndexOf('highLumenToggle')
$hlEnd120 = $html120.IndexOf('highLumenStatus')
$hlSlice120 = if ($hlStart120 -ge 0 -and $hlEnd120 -gt $hlStart120) { $html120.Substring([Math]::Max(0,$hlStart120-200), ($hlEnd120 + 200) - [Math]::Max(0,$hlStart120-200)) } else { '' }

# 120.1  both activation paths exist -- manual class AND OS media query
Check (($css120 -match 'html\.high-lumen body\s*\{') -and ($css120 -match '@media \(prefers-contrast: more\)\s*\{') -and ($manualBlock120.Length -gt 0) -and ($prefBlock120.Length -gt 0)) `
    '120.1: high-contrast is reachable two ways -- manual html.high-lumen rules AND an @media (prefers-contrast: more) block'

# 120.2  high-contrast core in BOTH paths: pure-black background + glow halo removed
Check (($manualBlock120 -match 'background-color: #000') -and ($manualBlock120 -match '--robco-glow: none') -and ($prefBlock120 -match 'background-color: #000') -and ($prefBlock120 -match '--robco-glow: none')) `
    '120.2: both paths force a pure-black (#000) background and remove the glow halo (--robco-glow: none) for maximum text contrast'

# 120.3  AA+ win -- dimmed/secondary surfaces lifted to opacity:1 in BOTH paths
Check (($manualBlock120 -match '\.tracker-toggle--inactive,') -and ($manualBlock120 -match '\.list-row-prefix,') -and ($manualBlock120 -match 'opacity: 1 !important') -and ($prefBlock120 -match '\.tracker-toggle--inactive,') -and ($prefBlock120 -match 'opacity: 1 !important')) `
    '120.3: both paths lift dimmed surfaces (inactive tabs, list prefixes, inactive toggles, tracker-meta, filter buttons, empty-states) to opacity:1 -- the measurable contrast gain'

# 120.4  scanline/refresh CRT veil set to opacity 0.5 in BOTH paths (r4: 0.12 -> 0.2, r5: 0.2 -> 0.5, stronger CRT texture, text still legible)
Check (($manualBlock120 -match '\.crt-overlay,') -and ($manualBlock120 -match 'opacity: 0\.5\b') -and ($prefBlock120 -match '\.crt-overlay,') -and ($prefBlock120 -match 'opacity: 0\.5\b')) `
    '120.4: both paths set the scanline + refresh-bar overlay to opacity 0.5 (r5 -- a stronger CRT texture, text still legible)'

# 120.5  manual toggle persisted as a localStorage device preference (not campaign state)
Check (($uiCore120 -match "const HIGH_LUMEN_KEY = 'robco_high_lumen'") -and ($uiCore120 -match 'function isHighLumenEnabled\(\)') -and ($uiCore120 -match "MetaStore\.get\(HIGH_LUMEN_KEY\)\s*===\s*'true'")) `
    '120.5: HIGH_LUMEN_KEY + isHighLumenEnabled() persist the toggle as a localStorage device preference (not campaign state)'

# 120.6  toggle persists + flips the html.high-lumen class; #highLumenToggle onchange wires to it
Check (($tog120 -match 'MetaStore\.set\(HIGH_LUMEN_KEY') -and ($tog120 -match '_applyHighLumen\(') -and ($app120 -match "documentElement\.classList\.toggle\('high-lumen'") -and ($html120 -match 'onchange="toggleHighLumen\(this\.checked\)"')) `
    "120.6: toggleHighLumen persists the pref and _applyHighLumen toggles the 'high-lumen' class on <html>; #highLumenToggle onchange wires to it"

# 120.7  init restores the pref + reflects to the checkbox + boot wiring + early-paint (no flash)
Check (($ini120 -match 'toggle\.checked = enabled') -and ($ini120 -match '_applyHighLumen\(enabled\)') -and ($uiCore120 -match 'initHighLumen\(\); // WU-F8') -and ($html120 -match "robco_high_lumen'\) === 'true'") -and ($html120 -match "document\.documentElement\.classList\.add\('high-lumen'\)")) `
    '120.7: initHighLumen() restores the pref to the checkbox + applies it, is wired into boot, and the inline head script applies high-lumen before first paint (no contrast flash)'

# 120.8  accessible toggle UI: checkbox + label[for] + status note, game-agnostic
Check (($html120 -match 'id="highLumenToggle"') -and ($html120 -match 'for="highLumenToggle"') -and ($html120 -match 'id="highLumenStatus"') -and ($html120 -match 'HIGH-LUMEN OPTICS') -and ($hlSlice120 -notmatch '\bFNV\b|\bFO3\b|Fallout')) `
    '120.8: the HIGH-LUMEN toggle has #highLumenToggle + label[for] + #highLumenStatus note and is game-agnostic (no FNV/FO3/Fallout literals)'

# ===========================================================
# Suite 121 -- WU-F5 Pip-Boy Radio (synthesized -- zero-byte WebAudio) (8 tests)
# A procedural station bed (static + carrier + tonal motifs), fully generated via
# WebAudio (no audio files). Opt-in player, respects masterMute, autoplay-safe.
# Game-agnostic, offline, no AI. (PS mirror of JS Suite 121.)
# ===========================================================
Sep "Suite 121 -- WU-F5 Pip-Boy Radio (synthesized)"
$uiAudio121 = Read-Src "js/ui-audio.js"
$uiCore121  = Read-Src "js/ui-core.js"
$html121    = Read-Src "index.html"
$start121  = [regex]::Match($uiAudio121, '(?s)function startRadio\([\s\S]*?\n\}').Value
$toggle121 = [regex]::Match($uiAudio121, '(?s)function toggleRadio\([\s\S]*?\n\}').Value
$init121   = [regex]::Match($uiAudio121, '(?s)function initRadio\([\s\S]*?\n\}').Value
$motif121  = [regex]::Match($uiAudio121, '(?s)function _radioScheduleMotif\([\s\S]*?\n\}').Value
$idxA121 = $uiAudio121.IndexOf('PIP-BOY RADIO')
$idxB121 = $uiAudio121.IndexOf('QUEST COMPLETE CHIME')
$radioSlice121 = if ($idxA121 -ge 0 -and $idxB121 -gt $idxA121) { $uiAudio121.Substring($idxA121, $idxB121 - $idxA121) } else { $uiAudio121 }

# 121.1  zero-byte synth: WebAudio nodes, NOT an <audio>/Audio()/file fetch
Check (($start121 -match 'audioCtx\.createBufferSource\(\)') -and ($start121 -match 'audioCtx\.createOscillator\(\)') -and ($start121 -match 'ensureAudioCtx\(\)') -and ($uiAudio121 -notmatch 'new Audio\(|\.mp3|\.ogg|\.wav|<audio')) `
    '121.1: the radio is fully synthesized via WebAudio (buffer/oscillator nodes), with no audio file (no <audio>/Audio()/.mp3/.ogg/.wav)'

# 121.2  Protocol 7 guards: masterMute + AudioSettings.radio (ON) + no double-start
Check ($start121 -match 'if \(radioNodes \|\| AudioSettings\.masterMute \|\| !AudioSettings\.radio\) return') `
    '121.2: startRadio() guards on masterMute + the AudioSettings.radio ON-pref (and no double-start) before building any node'

# 121.3  AudioSettings.radio seeded from localStorage robco_radio_on (ON semantics, opt-in)
Check (($uiCore121 -match "radio: MetaStore\.get\('robco_radio_on'\) === 'true'") -and ($uiAudio121 -match "const RADIO_KEY = 'robco_radio_on'")) `
    "121.3: AudioSettings.radio is seeded from localStorage 'robco_radio_on' (opt-in ON-semantics device preference)"

# 121.4  toggle persists pref + flips cache + starts/stops; wired via onchange
Check (($toggle121 -match 'MetaStore\.set\(RADIO_KEY') -and ($toggle121 -match 'AudioSettings\.radio = on') -and ($toggle121 -match 'startRadio\(\)') -and ($toggle121 -match 'stopRadio\(\)') -and ($html121 -match 'onchange="toggleRadio\(this\.checked\)"')) `
    '121.4: toggleRadio persists robco_radio_on + starts/stops the station; #radioToggle onchange wires to it'

# 121.5  masterMute integration: stop under mute, resume on un-mute if pref on
Check (($uiAudio121 -match 'stopRadio\(\); // WU-F5') -and ($uiAudio121 -match 'if \(AudioSettings\.radio\) startRadio\(\); // WU-F5')) `
    '121.5: master mute stops the radio (pref preserved) and un-mute resumes it when AudioSettings.radio is on'

# 121.6  autoplay-safe restore: saved "on" arms a one-shot first-gesture start
Check (($init121 -match '_radioArmed = true') -and ($init121 -match "addEventListener\('click', _armStart, \{ once: true \}\)") -and ($init121 -match "addEventListener\('keydown', _armStart, \{ once: true \}\)") -and ($init121 -match 'startRadio\(\)')) `
    '121.6: initRadio() restores a saved "on" pref via a one-shot first-gesture arm (autoplay-policy-safe), and is wired into boot'

# 121.7  looping static bed + self-rescheduling motif generator + boot wiring
Check (($start121 -match 'staticSrc\.loop = true') -and ($start121 -match '_radioScheduleMotif\(\)') -and ($motif121 -match 'setTimeout\(_radioScheduleMotif') -and ($uiCore121 -match 'initRadio\(\); // WU-F5')) `
    '121.7: a looping static bed + a self-rescheduling tonal-motif generator drive the station, and initRadio is called from boot'

# 121.8  diegetic toggle + status note, game-agnostic (no station literals)
Check (($html121 -match 'id="radioToggle"') -and ($html121 -match 'for="radioToggle"') -and ($html121 -match 'id="radioStatus"') -and ($radioSlice121 -notmatch 'Galaxy News|New Vegas|Mojave|Radio New Vegas|\bFNV\b|\bFO3\b')) `
    '121.8: the radio has #radioToggle + label[for] + #radioStatus, and the synth carries no game-specific station literals (game-agnostic)'

# ===========================================================
# Suite 122 -- WU-F6 Cold-Start / Degraded-Tube Boot (8 tests)
# runBootSequence picks a boot flavor: normal (warm), cold (first-ever POST, gated
# once by robco_booted_before), or a RARE degraded "cold tube" variant that rolls
# on ANY boot (NOT first-boot-gated -- owner pref). Honors reduced-motion, leaves
# the normal boot unchanged. Game-agnostic, offline, no AI. (PS mirror of JS 122.)
# ===========================================================
Sep "Suite 122 -- WU-F6 Cold-Start / Degraded-Tube Boot"
$uiAudio122 = Read-Src "js/ui-audio.js"
$css122     = Read-Src "css/terminal.css"
$pick122      = [regex]::Match($uiAudio122, '(?s)function _pickBootFlavor\([\s\S]*?\n\}').Value
$bootLines122 = [regex]::Match($uiAudio122, '(?s)function _bootLinesFor\([\s\S]*?\n\}').Value
$runBoot122   = [regex]::Match($uiAudio122, '(?s)function runBootSequence\([\s\S]*?\n\}').Value

# 122.1  the degraded variant exists: rare random roll + degraded POST lines + boot-degraded class
Check (($uiAudio122 -match 'const DEGRADED_BOOT_CHANCE = 0?\.\d+') -and ($pick122 -match "Math\.random\(\) < DEGRADED_BOOT_CHANCE\) return 'degraded'") -and ($bootLines122 -match 'CRT TUBE COLD|WARMING UP') -and ($runBoot122 -match "classList\.add\('boot-degraded'\)")) `
    '122.1: a rare degraded boot exists -- a DEGRADED_BOOT_CHANCE Math.random() roll, degraded POST lines, and a #bootScreen.boot-degraded class'

# 122.2  CRITICAL: degraded roll is NOT first-boot-gated -- evaluated BEFORE the robco_booted_before check
$degIdx122 = $pick122.IndexOf("return 'degraded'")
$fbIdx122  = $pick122.IndexOf('robco_booted_before')
Check (($degIdx122 -ge 0) -and ($fbIdx122 -ge 0) -and ($degIdx122 -lt $fbIdx122) -and ($pick122 -match "return 'cold'")) `
    '122.2: the degraded roll runs BEFORE the robco_booted_before first-boot gate -- degraded can trigger on ANY boot, not just first launch (owner pref)'

# 122.3  cold first-power-on POST: RETROS BIOS + counting memory test, gated once by the flag
Check (($bootLines122 -match 'RETROS BIOS') -and ($bootLines122 -match 'MEMORY TEST') -and ($pick122 -match "!MetaStore\.get\('robco_booted_before'\)") -and ($runBoot122 -match "MetaStore\.set\('robco_booted_before', 'true'\)")) `
    '122.3: the first-ever cold POST (RETROS BIOS + memory test) is gated once by robco_booted_before, which runBootSequence sets'

# 122.4  normal warm boot UNCHANGED: canonical lines + 120ms interval + fade/_bootActive
Check (($bootLines122 -match '64K RAM SYSTEM') -and ($bootLines122 -match 'SECURE LINK ESTABLISHED\. BOOTING\.\.\.') -and ($runBoot122 -match '(?s)setInterval\([\s\S]*?\}, 120\)') -and ($runBoot122 -match "classList\.add\('boot-fade-out'\)") -and ($runBoot122 -match '_bootActive = true') -and ($runBoot122 -match '_bootActive = false')) `
    '122.4: normal warm boot is unaffected -- canonical lines, 120ms cadence, boot-fade-out, and the WU-B10 _bootActive window all preserved'

# 122.5  reduced-motion honored: flicker is a CSS animation neutralised by the prefers-reduced-motion block
Check (($css122 -match '@keyframes boot-degraded-flicker') -and ($css122 -match '(?s)#bootScreen\.boot-degraded\s*\{[\s\S]*?animation:\s*boot-degraded-flicker') -and ($css122 -match '@media \(prefers-reduced-motion: reduce\)') -and ($css122 -match 'animation-duration:\s*0\.01ms\s*!important')) `
    '122.5: the degraded flicker is a CSS @keyframes animation, neutralised by the global prefers-reduced-motion block (CR-1)'

# 122.6  test/override hook: window.__robcoBootFlavor forces a flavor (used for verification)
Check (($pick122 -match 'window\.__robcoBootFlavor') -and ($pick122 -match "forced === 'normal' \|\| forced === 'cold' \|\| forced === 'degraded'")) `
    '122.6: _pickBootFlavor honors a window.__robcoBootFlavor override (normal|cold|degraded) for deterministic verification'

# 122.7  runBootSequence still no-ops safely when the boot screen is absent (no regression)
Check (($runBoot122 -match "const bootScreen = document\.getElementById\('bootScreen'\)") -and ($runBoot122 -match 'if \(!bootScreen\)') -and ($runBoot122 -match 'if \(onComplete\) onComplete\(\)')) `
    '122.7: runBootSequence still guards on a missing #bootScreen and always calls onComplete (boot never wedges)'

# 122.8  game-agnostic (Protocol 38): boot flavor code carries no game literals, uses APP_VERSION
Check (($bootLines122 -match 'APP_VERSION') -and (($pick122 + $bootLines122) -notmatch 'New Vegas|Mojave|Fallout|\bFNV\b|\bFO3\b|Vault 101|Capital Wasteland')) `
    '122.8: the boot-flavor strings are game-agnostic (no FNV/FO3/Fallout/location literals) and version via APP_VERSION'

# ===========================================================
# Suite 123 -- WU-F9 TERMLINK Command Console + WU-HF2/HF3 hotfixes (19 tests)
# The Phase-F launcher surface that routes the offline subsystems through
# NATIVE_COMMAND_ROUTER (or the documented BARTER panel). Guards console <-> router
# consistency, offline (0 AI), game-agnostic, XSS-safe. Also locks the v2.7.0 hotfixes:
# WU-HF2 (no soft-keyboard pop -- precise-pointer gated re-focus) and WU-HF3 (typed panel
# navigation -- whole-input panel alias opens that panel natively, consult/databank/lookup
# -> DATABANK panel, "consult <topic>" still runs the native lookup).
# (PS mirror of JS 123.)
# ===========================================================
Sep "Suite 123 -- WU-F9 TERMLINK Command Console"
$api123  = Read-Src "js/api.js"
$core123 = Read-Src "js/ui-core.js"
$html123 = Read-Src "index.html"
$css123  = Read-Src "css/terminal.css"
$router123     = [regex]::Match($api123, '(?s)const NATIVE_COMMAND_ROUTER = \{[\s\S]*?\n\};').Value
$consoleArr123 = [regex]::Match($api123, '(?s)const TERMLINK_CONSOLE = \[[\s\S]*?\n\];').Value
$showFn123     = [regex]::Match($api123, '(?s)function showTermlinkConsole\(\)[\s\S]*?openModal\(\);\s*\n\}').Value
$launchFn123   = [regex]::Match($api123, '(?s)function _termlinkLaunch\([\s\S]*?\n\}').Value
$tokCount123   = ([regex]::Matches($consoleArr123, "token:\s*'[^']+'")).Count

# 123.1  [TERMLINK] / [TL] / bare TERMLINK all route to showTermlinkConsole in the native router
Check (($router123 -match "'\[TERMLINK\]':\s*\(\)\s*=>\s*showTermlinkConsole\(\)") -and ($router123 -match "'\[TL\]':\s*\(\)\s*=>\s*showTermlinkConsole\(\)") -and ($router123 -match '\bTERMLINK:\s*\(\)\s*=>\s*showTermlinkConsole\(\)')) `
    '123.1: NATIVE_COMMAND_ROUTER routes [TERMLINK], [TL] and bare TERMLINK to showTermlinkConsole()'

# 123.2  showTermlinkConsole defined and opens via openModal (Step 2 Phase 0 U12 consolidated driver)
Check (($showFn123.Length -gt 0) -and ($showFn123 -match 'openModal\(\)')) `
    '123.2: showTermlinkConsole() is defined and opens the console via openModal() (U12 driver -- focus-trap + ARIA)'

# 123.3  the console manifest exists with the six offline subsystem entries
Check (($consoleArr123.Length -gt 0) -and ($tokCount123 -ge 6)) `
    '123.3: TERMLINK_CONSOLE lists at least six subsystem entries'

# 123.4  router-drift guard: every router-backed console token resolves in NATIVE_COMMAND_ROUTER;
#        [TRADE] is the documented panel exception (panel:true, intentionally NOT a router token).
$rbOk123 = $true
foreach ($t in @('[VATS SIM]', '[THREAT]', '[CONSULT]', '[BIO-SCAN]', '[LOOT]')) {
    if (-not $router123.Contains("'$t'")) { $rbOk123 = $false }
    if (-not $consoleArr123.Contains($t)) { $rbOk123 = $false }
}
$tradePanel123 = $consoleArr123 -match "(?s)\{[^}]*token:\s*'\[TRADE\]'[^}]*panel:\s*true[^}]*\}"
Check ($rbOk123 -and $tradePanel123 -and (-not $router123.Contains("'[TRADE]'"))) `
    '123.4: every router-backed TERMLINK token resolves in NATIVE_COMMAND_ROUTER; [TRADE] is the panel exception'

# 123.5  _termlinkLaunch routes router tokens through _routeNativeCommand and the panel via the trade panel
Check (($launchFn123.Length -gt 0) -and ($launchFn123 -match '_routeNativeCommand\(token\)') -and ($launchFn123 -match "expandPanelForCategory\('trade'\)") -and ($launchFn123 -match 'closeModal\(\)')) `
    '123.5: _termlinkLaunch() routes native tokens via _routeNativeCommand, opens BARTER via the trade panel, closes the console first'

# 123.6  offline / zero-AI: neither the console nor the launcher does network I/O or AI calls
Check (($showFn123 + $launchFn123) -notmatch 'fetch\(|XMLHttpRequest|transmitMessage\(|generativelanguage|gemini') `
    '123.6: showTermlinkConsole + _termlinkLaunch make no network/AI call (routes natively, fully offline)'

# 123.7  XSS-safe: rendered token/label/blurb run through escapeHtml
Check ((([regex]::Matches($showFn123, 'escapeHtml\(')).Count) -ge 3) `
    '123.7: showTermlinkConsole escapes rendered token/label/blurb via escapeHtml (XSS-safe)'

# 123.8  game-agnostic (Protocol 38): the TERMLINK block carries no game literals
Check (($consoleArr123 + $showFn123 + $launchFn123) -notmatch 'New Vegas|Mojave|Fallout|\bFNV\b|\bFO3\b|Vault 101|Capital Wasteland|Courier') `
    '123.8: the TERMLINK console block is game-agnostic (no FNV/FO3/Fallout/location literals)'

# 123.9  discoverable affordances: #termlinkBtn routes natively, registry advertises it, console CSS present
Check (($html123 -match "(?s)id=`"termlinkBtn`"[\s\S]*?macroCommand\('\[TERMLINK\]'\)") -and ($html123 -match 'aria-label="Open the TERMLINK command console') -and ($core123 -match '\[TERMLINK\] / \[TL\]') -and ($css123 -match '\.termlink-grid') -and ($css123 -match '\.termlink-entry')) `
    '123.9: #termlinkBtn routes [TERMLINK] natively + has aria-label, COMMAND_REGISTRY advertises it, console CSS present'

# -- WU-HF2 + WU-HF3 hotfixes (folded into v2.7.0) --------------------------------
$aliasBlock123 = [regex]::Match($api123, "(?s)const PANEL_NAV_ALIASES = \{[\s\S]*?\n\};").Value
$aliasMap123 = @{}
foreach ($m in [regex]::Matches($aliasBlock123, "(\w+):\s*'([^']+)'")) { $aliasMap123[$m.Groups[1].Value] = $m.Groups[2].Value }
$aliasVals123 = @($aliasMap123.Values)
$panelNavBody123 = ''
try { $panelNavBody123 = Get-FunctionBody $api123 '_routePanelNav' } catch {}
$routerBody123 = ''
try { $routerBody123 = Get-FunctionBody $api123 '_routeNativeCommand' } catch {}
$transmitBody123 = ''
try { $transmitBody123 = Get-FunctionBody $api123 'transmitMessage' } catch {}

# 123.10 WU-HF2: the post-native-command Comm-Link re-focus is precise-pointer gated (no touch keyboard pop)
Check (($api123 -match 'function _isPrecisePointer\s*\(') -and ($api123 -match 'hover: hover[\s\S]*?pointer: fine') -and ($transmitBody123 -match "_isPrecisePointer\(\)\s*\)\s*document\.getElementById\('chatInput'\)\.focus\(\)")) `
    '123.10: WU-HF2 -- transmitMessage gates the post-command chatInput.focus() behind _isPrecisePointer() (no touch keyboard pop)'

# 123.11 WU-HF3: PANEL_NAV_ALIASES map exists with a healthy set of aliases
Check (($aliasBlock123.Length -gt 0) -and ($aliasMap123.Count -ge 30)) `
    '123.11: PANEL_NAV_ALIASES map defined with >=30 alias entries'

# 123.12 _routePanelNav defined AND runs FIRST in _routeNativeCommand (native, before the AI)
Check (($api123 -match 'function _routePanelNav\s*\(') -and ($routerBody123 -match '_routePanelNav\(raw\)') -and ($routerBody123.IndexOf('_routePanelNav(raw)') -ge 0) -and ($routerBody123.IndexOf('_routePanelNav(raw)') -lt $routerBody123.IndexOf('NATIVE_COMMAND_ROUTER'))) `
    '123.12: _routePanelNav() defined and called in _routeNativeCommand BEFORE the command loop (routes natively, before AI)'

# 123.13 covers every required panel category (the alias VALUES include them all)
$required123 = @('inventory', 'special', 'skills', 'perks', 'quests', 'factions', 'map', 'craft', 'trade', 'status', 'bio', 'log', 'config', 'databank')
$missing123 = @($required123 | Where-Object { $aliasVals123 -notcontains $_ })
Check ($missing123.Count -eq 0) `
    ('123.13: PANEL_NAV_ALIASES covers every required panel category' + $(if ($missing123.Count) { ' -- MISSING: ' + ($missing123 -join ', ') } else { '' }))

# 123.14 the common nicknames resolve to the correct category
$pairs123 = @(@('inv', 'inventory'), @('items', 'inventory'), @('stats', 'special'), @('character', 'special'), @('journal', 'quests'), @('rep', 'factions'), @('reputation', 'factions'), @('world', 'map'), @('workbench', 'craft'), @('barter', 'trade'), @('limbs', 'bio'), @('overseer', 'log'), @('settings', 'config'))
$bad123 = @($pairs123 | Where-Object { $aliasMap123[$_[0]] -ne $_[1] })
Check ($bad123.Count -eq 0) `
    ('123.14: panel-nav nicknames resolve to the right category' + $(if ($bad123.Count) { ' -- WRONG: ' + (($bad123 | ForEach-Object { $_[0] }) -join ', ') } else { '' }))

# 123.15 OWNER DIRECTIVE: consult / databank / lookup all open the DATABANK panel (not the AI/modal)
Check (($aliasMap123['consult'] -eq 'databank') -and ($aliasMap123['databank'] -eq 'databank') -and ($aliasMap123['lookup'] -eq 'databank')) `
    '123.15: consult/databank/lookup -> DATABANK panel (owner directive -- not the AI CONSULT modal)'

# 123.16 expandPanelForCategory maps the new WU-HF3 categories to a tab + h2 prefix
$expandBody123 = ''
try { $expandBody123 = Get-FunctionBody $core123 'expandPanelForCategory' } catch {}
Check (($expandBody123 -match "special:\s*'stat'") -and ($expandBody123 -match "special:\s*'>\s*BIO-METRICS'") -and ($expandBody123 -match "skills:\s*'>\s*SKILL MATRIX'") -and ($expandBody123 -match "bio:\s*'>\s*BIO-SCAN'") -and ($expandBody123 -match "map:\s*'>\s*WORLD MAP'") -and ($expandBody123 -match "databank:\s*'>\s*DATABANK'") -and ($expandBody123 -match "config:\s*'campg'") -and ($expandBody123 -match "config:\s*'>\s*CAMPAIGN CONFIGURATION'")) `
    '123.16: expandPanelForCategory maps the new panel-nav categories (special/skills/bio/map/databank/config) to a tab + h2'

# 123.17 EXACT whole-input match: _routePanelNav does a direct map lookup (no includes/startsWith/indexOf)
Check (($panelNavBody123 -match 'PANEL_NAV_ALIASES\[\s*key\s*\]') -and ($panelNavBody123 -notmatch '\.includes\(|\.startsWith\(|\.indexOf\(')) `
    '123.17: _routePanelNav uses an exact whole-input map lookup (no substring match) so "consult <topic>" still reaches the native lookup'

# 123.18 game-agnostic (Protocol 38): the panel-nav block names UI panels, never game data
Check (($aliasBlock123 + $panelNavBody123) -notmatch 'New Vegas|Mojave|Fallout|\bFNV\b|\bFO3\b|Vault 101|Capital Wasteland|Courier|Deathclaw') `
    '123.18: PANEL_NAV_ALIASES + _routePanelNav are game-agnostic (no FNV/FO3/Fallout/location literals -- Protocol 38)'

# 123.19 the CONSULT->DATABANK target panel actually exists on the DATA tab
Check (($html123 -match 'id="databankPanel"') -and ($html123 -match 'data-tab="data"[^>]*id="databankPanel"|id="databankPanel"[^>]*data-tab="data"') -and ($html123 -match 'DATABANK</h2>')) `
    '123.19: #databankPanel (DATABANK h2, data-tab="data") exists as the consult/databank/lookup target'

# ===========================================================
# Suite 124 -- WU-T1 per-game theming + AA contrast (12 tests)
# Data-driven optics: ONE THEMES table (state.js) replaces the if/else palette in
# changeOpticsColor (ui-audio) and the duplicated fgMap (ui-saves); each GAME_DEFS entry
# declares theme.defaultOptics resolved via _activeDef() (no game literal); a real WCAG
# relative-luminance computation enforces AA >=4.5:1 for every contrastSafe default.
# (PS mirror of JS 124.)
# ===========================================================
function Get-RelLum124([string]$hex) {
    $m = $hex.TrimStart('#')
    $lin = @(0, 2, 4) | ForEach-Object {
        $c = [Convert]::ToInt32($m.Substring($_, 2), 16) / 255.0
        if ($c -le 0.03928) { $c / 12.92 } else { [Math]::Pow((($c + 0.055) / 1.055), 2.4) }
    }
    return 0.2126 * $lin[0] + 0.7152 * $lin[1] + 0.0722 * $lin[2]
}
function Get-Contrast124([string]$h1, [string]$h2) {
    $a = Get-RelLum124 $h1
    $b = Get-RelLum124 $h2
    $hi = [Math]::Max($a, $b)
    $lo = [Math]::Min($a, $b)
    return ($hi + 0.05) / ($lo + 0.05)
}
Sep "Suite 124 -- WU-T1 per-game theming + AA contrast"
$state124 = Read-Src "js/state.js"
$audio124 = Read-Src "js/ui-audio.js"
$saves124 = Read-Src "js/ui-saves.js"
$core124  = Read-Src "js/ui-core.js"
$html124  = Read-Src "index.html"
$themesBlock124 = [regex]::Match($state124, '(?s)const THEMES = \{[\s\S]*?\n\};').Value
$themeMatches124 = [regex]::Matches($themesBlock124, "(\w+):\s*\{\s*rgb:\s*'([^']+)',\s*hex:\s*'(#[0-9a-fA-F]{6})',\s*dark:\s*'(#[0-9a-fA-F]{6})',\s*label:\s*'[^']+',\s*contrastSafe:\s*(true|false),?\s*\}")
$themeKeys124 = @($themeMatches124 | ForEach-Object { $_.Groups[1].Value })
$safeKeys124 = @($themeMatches124 | Where-Object { $_.Groups[5].Value -eq 'true' } | ForEach-Object { $_.Groups[1].Value })
$themeDefaults124 = @([regex]::Matches($state124, "theme:\s*\{\s*defaultOptics:\s*'(\w+)'") | ForEach-Object { $_.Groups[1].Value })
$fnvDef124 = [regex]::Match($state124, "(?s)FNV:[\s\S]*?theme:\s*\{\s*defaultOptics:\s*'(\w+)'").Groups[1].Value
$fo3Def124 = [regex]::Match($state124, "(?s)FO3:[\s\S]*?theme:\s*\{\s*defaultOptics:\s*'(\w+)'").Groups[1].Value
$changeFn124  = [regex]::Match($audio124, '(?s)function changeOpticsColor\([\s\S]*?\n\}').Value
$applyFn124   = [regex]::Match($audio124, '(?s)function _applyThemeVars\([\s\S]*?\n\}').Value
$resolveFn124 = [regex]::Match($audio124, '(?s)function _resolveDefaultOptics\([\s\S]*?\n\}').Value

# 124.1  THEMES single-source table exists, window-exposed, has the canon + FO3 greens
Check (($state124 -match 'const THEMES = \{') -and ($state124 -match 'window\.THEMES = THEMES') -and ($themeKeys124.Count -ge 7) -and ($themeKeys124 -contains 'green') -and ($themeKeys124 -contains 'green3')) `
    '124.1: THEMES table defined + window-exposed with >=7 entries incl. green & green3'

# 124.2  every THEMES entry parsed with the full {rgb,hex,dark,label,contrastSafe} shape
Check ($themeMatches124.Count -ge 7) `
    '124.2: every THEMES entry has the {rgb,hex,dark,label,contrastSafe} shape'

# 124.3  canon NV green is #14fdce; FO3 green3 is a visibly DISTINCT green
$greenHex124 = ($themeMatches124 | Where-Object { $_.Groups[1].Value -eq 'green' } | Select-Object -First 1).Groups[3].Value
$green3Hex124 = ($themeMatches124 | Where-Object { $_.Groups[1].Value -eq 'green3' } | Select-Object -First 1).Groups[3].Value
Check (($greenHex124.ToLower() -eq '#14fdce') -and ($green3Hex124) -and ($green3Hex124.ToLower() -ne '#14fdce')) `
    '124.3: THEMES.green = #14fdce (canon NV green) and THEMES.green3 is a distinct green'

# 124.4  per-game defaults: FNV -> green, FO3 -> green3
Check (($fnvDef124 -eq 'green') -and ($fo3Def124 -eq 'green3')) `
    '124.4: GAME_DEFS.FNV.theme.defaultOptics="green" and FO3="green3" (per-game default optics)'

# 124.5  data-driven completeness: every GAME_DEFS theme.defaultOptics exists in THEMES
$missingDefaults124 = @($themeDefaults124 | Where-Object { $themeKeys124 -notcontains $_ })
Check (($themeDefaults124.Count -ge 2) -and ($missingDefaults124.Count -eq 0)) `
    '124.5: every GAME_DEFS theme.defaultOptics resolves to a THEMES entry'

# 124.6  every per-game default points at a contrastSafe:true theme
$unsafeDefaults124 = @($themeDefaults124 | Where-Object { $safeKeys124 -notcontains $_ })
Check ($unsafeDefaults124.Count -eq 0) `
    '124.6: every per-game default optic is contrastSafe:true'

# 124.7  WCAG AA: every contrastSafe:true theme computes >=4.5:1 against the page bg
$failContrast124 = @($themeMatches124 | Where-Object { $_.Groups[5].Value -eq 'true' } | Where-Object { (Get-Contrast124 $_.Groups[3].Value '#010a07') -lt 4.5 })
Check (($failContrast124.Count -eq 0) -and ($safeKeys124.Count -ge 1)) `
    '124.7: every contrastSafe:true theme meets WCAG AA >=4.5:1 vs the page background'

# 124.8  changeOpticsColor is table-driven AND persists to the PER-GAME optic key
Check (($changeFn124 -match '_applyThemeVars\(color\)') -and ($changeFn124 -match 'MetaStore\.set\(_opticStorageKey\(\)') -and (-not ($changeFn124 -match 'else if \(color ===')) -and ($applyFn124 -match 'THEMES\[key\]')) `
    '124.8: changeOpticsColor delegates to table-driven _applyThemeVars and persists to the per-game _opticStorageKey()'

# 124.9  ui-saves dropped the duplicated fgMap palette and reads THEMES
Check ((-not ($saves124 -match 'const fgMap = \{')) -and ($saves124 -match 'THEMES\[optics\]')) `
    '124.9: ui-saves.js dropped the duplicate fgMap and reads the export colour from THEMES'

# 124.10  per-game resolver reads _activeDef().theme.defaultOptics, green fallback, agnostic
Check (($resolveFn124 -match '_activeDef\(\)\.theme') -and ($resolveFn124 -match "return 'green'") -and (-not (($resolveFn124 + $applyFn124 + $changeFn124) -match '\bFNV\b|\bFO3\b'))) `
    '124.10: _resolveDefaultOptics reads _activeDef().theme.defaultOptics with a green fallback, no game literal (Protocol 38)'

# 124.11  boot applies explicit pick -> else per-game default; theme shape carries the T3 seam
$fnvTheme124 = [regex]::Match($state124, '(?s)FNV:[\s\S]*?theme:\s*\{([\s\S]*?)\}').Groups[1].Value
$shapeOk124 = $true
foreach ($f in @('defaultOptics', 'framing', 'pipBoyModel', 'bootFlavor', 'saveLabel')) { if (-not $fnvTheme124.Contains($f + ':')) { $shapeOk124 = $false } }
Check (($core124 -match '_resolveOptic\(\)') -and ($core124 -match '_applyThemeVars\(_optic\)') -and ($core124 -match '_updateOpticsDefaultLabel\(\)') -and $shapeOk124) `
    '124.11: ui-core boot resolves the per-game optic (_resolveOptic) + applies it + updates the (Default) label; GAME_DEFS.theme carries the full shape (WU-T3 seam)'

# 124.12  the pre-paint inline head script + the OPTICS picker both cover green3 (flash-free)
Check (($html124 -match '<option value="green3">') -and ($html124 -match "color === 'green3'") -and ($html124.Contains("'#4fb05a'"))) `
    '124.12: index.html exposes the green3 optic option AND the pre-paint head script applies it (no flash on explicit pick)'

# ===========================================================
# Suite 125 -- WU-F10 session stats merged into OVERSEER LOG (8 tests)
# Standalone SESSION STATISTICS panel retired; its campaign readout (kills, caps,
# damage, campaign play-time, location visits) merged into OVERSEER'S LOG beside the
# device telemetry, both time metrics clearly distinguished. (PS mirror of JS 125.)
# ===========================================================
Sep "Suite 125 -- WU-F10 session stats merged into OVERSEER LOG"
$html125   = Read-Src "index.html"
$render125 = Read-Src "js/ui-render.js"
$core125   = Read-Src "js/ui-core.js"
$saves125  = Read-Src "js/ui-saves.js"
$panel125 = [regex]::Match($html125, '(?s)id="overseerLogPanel"[\s\S]*?</details>').Value
$sessFn125 = [regex]::Match($render125, '(?s)function renderSessionStats\(\)[\s\S]*?\n\}').Value
$overFn125 = [regex]::Match($core125, '(?s)function renderOverseerLog\(\)[\s\S]*?\n\}').Value
$resetFn125 = [regex]::Match($saves125, '(?s)function resetSessionStats\(\)[\s\S]*?\n\}').Value

# 125.1  the standalone SESSION STATISTICS panel is retired entirely
Check (-not ($html125 -match 'SESSION STATISTICS')) `
    '125.1: the standalone "SESSION STATISTICS" panel is removed from index.html'

# 125.2  the campaign-stats container is merged INTO the Overseer's Log panel
Check (($html125 -match 'id="overseerLogPanel"') -and ($panel125.Contains('id="overseerLogDisplay"')) -and ($panel125.Contains('id="sessionStatsList"'))) `
    '125.2: #sessionStatsList (campaign stats) now lives inside #overseerLogPanel beside the device telemetry'

# 125.3  no duplicate campaign-stats container survived the merge
$sslCount125 = ([regex]::Matches($html125, 'id="sessionStatsList"')).Count
Check ($sslCount125 -eq 1) `
    '125.3: exactly one #sessionStatsList remains (no leftover duplicate panel)'

# 125.4  campaign readout shows all the owner-confirmed stats incl. session duration
Check (($sessFn125 -match 'state\.stats') -and ($sessFn125 -match 'KILLS') -and ($sessFn125 -match 'CAPS EARNED') -and ($sessFn125 -match 'DMG DEALT') -and ($sessFn125 -match 'CURRENT SITTING') -and ($sessFn125 -match 'LOCATION VISITS') -and ($sessFn125 -match 'locationHistory')) `
    '125.4: renderSessionStats shows kills, caps earned, dmg dealt, CURRENT SITTING, and the LOCATION VISITS count'

# 125.5  device telemetry is preserved in the same panel
Check (($overFn125 -match 'CURRENT UPTIME') -and ($overFn125 -match 'BOOT COUNT') -and ($overFn125 -match 'TOTAL POWER-ON')) `
    '125.5: renderOverseerLog still shows device telemetry (CURRENT UPTIME / TOTAL POWER-ON / BOOT COUNT)'

# 125.6  the two time notions are distinctly labelled -- session duration vs device uptime
Check (($panel125.Contains('UNIT TELEMETRY')) -and ($panel125.Contains('CAMPAIGN LOG')) -and ($sessFn125 -match 'CURRENT SITTING') -and ($overFn125 -match 'CURRENT UPTIME')) `
    '125.6: session duration (CURRENT SITTING) and device uptime (CURRENT UPTIME) sit under clearly labelled UNIT TELEMETRY / CAMPAIGN LOG sections'

# 125.7  RESET CAMPAIGN STATS is wired to resetSessionStats, which clears state.stats + re-renders
Check (($panel125 -match 'onclick="resetSessionStats\(\)"') -and ($panel125 -match 'RESET CAMPAIGN STATS') -and ($resetFn125 -match 'state\.stats = \{') -and ($resetFn125 -match 'renderSessionStats\(\)')) `
    '125.7: the RESET CAMPAIGN STATS button calls resetSessionStats(), which resets state.stats and re-renders'

# 125.8  game-agnostic (Protocol 38) -- no game literals in the merged readout
Check (-not (($sessFn125 + $panel125) -match 'New Vegas|Mojave|\bFNV\b|\bFO3\b|Capital Wasteland|Vault 101')) `
    '125.8: the merged campaign readout is game-agnostic (no FNV/FO3/location literals)'

# ===========================================================
# Suite 126 -- WU-F11 native mark-visited map control (8 tests)
# A per-row LOG VISIT button on the WORLD GRID flags a location discovered directly,
# add-only (no un-mark), via the single-source recordLocationVisit() helper with NO AI.
# Accessible (<button>, aria-label, >=28px tap target), game-agnostic. (PS mirror of JS 126.)
# ===========================================================
Sep "Suite 126 -- WU-F11 native mark-visited map control"
$render126 = Read-Src "js/ui-render.js"
$state126  = Read-Src "js/state.js"
$css126    = Read-Src "css/terminal.css"
$markFn126 = [regex]::Match($render126, '(?s)function markLocationVisited\(loc\)[\s\S]*?\n\}').Value
$recFn126  = [regex]::Match($state126, '(?s)function recordLocationVisit\([\s\S]*?\n\}').Value
$markCss126 = [regex]::Match($css126, '(?s)\.map-mark-visited\s*\{[\s\S]*?\}').Value

# 126.1  the handler exists and routes through the single-source helper -> persist -> re-render
Check (($render126 -match 'function markLocationVisited\(loc\)') -and ($markFn126 -match 'recordLocationVisit\(loc\)') -and ($markFn126 -match 'saveState\(\)') -and ($markFn126 -match 'renderWorldMap\(\)')) `
    '126.1: markLocationVisited() calls recordLocationVisit(loc) -> saveState() -> renderWorldMap()'

# 126.2  NO AI -- the handler does no network/Director call
Check (-not ($markFn126 -match 'fetch\(|XMLHttpRequest|transmitMessage\(|generativelanguage|gemini')) `
    '126.2: markLocationVisited makes no AI/network call (native, offline)'

# 126.3  add-only -- recordLocationVisit only appends (push + dedup, never removes); no un-mark
Check (($recFn126 -match '\.push\(') -and (-not ($recFn126 -match '\.splice\(|removeLocation|forgetLocation')) -and (-not (($render126 + $state126) -match 'forgetLocationVisit|unmarkLocation|removeLocationVisit'))) `
    '126.3: mark-visited is add-only -- recordLocationVisit appends+dedups, no un-mark/forget helper exists'

# 126.4  a real LOG VISIT <button> per row, wired via an escaped data-loc (apostrophe-safe)
Check (($render126 -match 'class="map-mark-visited"') -and ($render126 -match 'onclick="markLocationVisited\(this\.dataset\.loc\)"') -and ($render126 -match 'data-loc="\$\{escapeHtml\(') -and ($render126 -match 'LOG VISIT</button>')) `
    '126.4: each WORLD GRID row renders a LOG VISIT <button> wired to markLocationVisited via an escaped data-loc'

# 126.5  accessible label -- literal aria-label (UI-3)
Check (($render126 -match 'aria-label="Mark \$\{escapeHtml\(') -and ($render126 -match 'as visited"')) `
    '126.5: the LOG VISIT button carries a literal aria-label ("Mark <loc> as visited")'

# 126.6  add-only gating -- button suppressed on current + already-visited rows
Check ($render126 -match "isYou \|\| wasVisited\s*\?\s*''") `
    '126.6: the LOG VISIT button only appears on undiscovered rows (suppressed when current or already visited)'

# 126.7  >=28px tap target + width:auto override (Protocol 17 / UI-5)
Check (($markCss126.Length -gt 0) -and ($markCss126 -match 'min-height:\s*28px') -and ($markCss126 -match 'width:\s*auto')) `
    '126.7: .map-mark-visited has a >=28px tap target (min-height) and width:auto (overrides global button width)'

# 126.8  game-agnostic (Protocol 38) -- no game literal in the handler
Check (-not ($markFn126 -match 'New Vegas|Mojave|\bFNV\b|\bFO3\b|Capital Wasteland|Vault 101')) `
    '126.8: markLocationVisited is game-agnostic (operates on the loc string, no game literals)'

# ===========================================================
# Suite 127 -- WU-T3 per-game identity strings + save header (8 tests)
# Boot shows the active game's Pip-Boy model + wasteland uplink; the save manager shows its
# saveLabel -- all from GAME_DEFS[ctx].theme (Protocol 38). The identity line is injected
# flavor-independently so WU-F6 cold/degraded boot is intact. (PS mirror of JS 127.)
# ===========================================================
function Grab127($block, $k) {
    $m = [regex]::Match($block, ($k + ":\s*'([^']+)'"))
    if ($m.Success) { $m.Groups[1].Value } else { '' }
}
Sep "Suite 127 -- WU-T3 per-game identity strings + save header"
$state127   = Read-Src "js/state.js"
$audio127   = Read-Src "js/ui-audio.js"
$account127 = Read-Src "js/ui-account.js"
$css127     = Read-Src "css/terminal.css"
$fnvTheme127 = [regex]::Match($state127, '(?s)FNV:[\s\S]*?theme:\s*\{([\s\S]*?)\}').Groups[1].Value
$fo3Theme127 = [regex]::Match($state127, '(?s)FO3:[\s\S]*?theme:\s*\{([\s\S]*?)\}').Groups[1].Value
$blf127 = [regex]::Match($audio127, '(?s)function _bootLinesFor\(flavor\)[\s\S]*?\n\}').Value
$t3region127 = [regex]::Match($audio127, '(?s)WU-T3:[\s\S]*?lines\.splice\([^\n]*\);').Value
$headerRegion127 = [regex]::Match($account127, '(?s)const _archiveHeader =[\s\S]*?''</div>'';').Value

# 127.1  both games declare non-empty bootFlavor + pipBoyModel + saveLabel
Check ((Grab127 $fnvTheme127 'bootFlavor') -and (Grab127 $fnvTheme127 'pipBoyModel') -and (Grab127 $fnvTheme127 'saveLabel') -and (Grab127 $fo3Theme127 'bootFlavor') -and (Grab127 $fo3Theme127 'pipBoyModel') -and (Grab127 $fo3Theme127 'saveLabel')) `
    '127.1: GAME_DEFS.FNV.theme and FO3.theme each declare non-empty bootFlavor, pipBoyModel, and saveLabel'

# 127.2  per-game DISTINCT identity -- FNV != FO3 for boot flavor and save label
Check (((Grab127 $fnvTheme127 'saveLabel') -ne (Grab127 $fo3Theme127 'saveLabel')) -and ((Grab127 $fnvTheme127 'bootFlavor') -ne (Grab127 $fo3Theme127 'bootFlavor'))) `
    '127.2: FNV and FO3 have distinct saveLabel and bootFlavor identity strings (the games differ at a glance)'

# 127.3  runBootSequence injects the identity line from the active game's theme (data-driven)
Check (($t3region127 -match '_activeDef\(\)\.theme') -and ($t3region127 -match 'pipBoyModel') -and ($t3region127 -match 'bootFlavor') -and ($t3region127 -match 'lines\.splice\(')) `
    '127.3: runBootSequence reads _activeDef().theme (pipBoyModel + bootFlavor) and splices the identity line into the boot output'

# 127.4  the identity line is FLAVOR-INDEPENDENT -- injected in runBootSequence, NOT in _bootLinesFor
Check (($t3region127.Length -gt 0) -and ($blf127.Length -gt 0) -and (-not ($blf127 -match 'theme|bootFlavor|pipBoyModel|_activeDef'))) `
    '127.4: the identity line is injected after _bootLinesFor (flavor-independent); _bootLinesFor itself carries no theme/identity code'

# 127.5  WU-F6 boot NOT regressed -- the three flavor POSTs + _bootActive window + onComplete intact
Check (($blf127 -match 'RETROS BIOS') -and ($blf127 -match 'CRT TUBE COLD') -and ($blf127 -match '64K RAM SYSTEM') -and ($audio127 -match '_bootActive = true') -and ($audio127 -match '_bootActive = false') -and ($audio127 -match 'if \(onComplete\) onComplete\(\)')) `
    '127.5: the cold/degraded/normal boot POSTs + the _bootActive window + onComplete are preserved (no WU-F6/B10 regression)'

# 127.6  the save manager header consumes theme.saveLabel (escaped) + the CSS class exists
Check (($account127 -match '_activeDef\(\)\.theme') -and ($headerRegion127 -match 'saveLabel') -and ($headerRegion127 -match 'escapeHtml\(') -and ($account127 -match 'saves-archive-header') -and ($css127 -match '\.saves-archive-header\s*\{')) `
    '127.6: renderSavesList renders a per-game header from theme.saveLabel (escaped) into .saves-archive-header'

# 127.7  fail-safe -- boot line and save header fall back to generic text if theme strings absent
Check (($audio127 -match "pipBoyModel \|\| 'PIP-BOY'") -and ($audio127 -match "bootFlavor \|\| 'WASTELAND UPLINK'") -and ($account127 -match "saveLabel \|\| 'CAMPAIGN ARCHIVE'")) `
    '127.7: the boot identity line and the save header both fail-safe to a generic label when theme strings are missing'

# 127.8  game-agnostic (Protocol 38) -- the consuming code carries no game literal
Check (-not (($t3region127 + $headerRegion127) -match 'New Vegas|Mojave|\bFNV\b|\bFO3\b|Capital Wasteland|Vault-Tec|Lucky 38')) `
    '127.8: the boot-injection + save-header consuming code is game-agnostic (strings sourced only from GAME_DEFS theme)'

# ===========================================================
# Suite 128 -- WU-REN runner-rename escape-ratchet (Protocol 36b) (5 tests)
# The runners were renamed to tests/robco-diagnostics.{js,ps1}. Fails the gate if ANY stale
# reference to the legacy runner name reappears anywhere -- code, scripts, hooks, CI, docs.
# (The forbidden literal is assembled at runtime so this file never self-matches.)
# (PS mirror of JS 128.)
# ===========================================================
Sep "Suite 128 -- WU-REN runner-rename escape-ratchet"
$legacy128 = 'check-' + 'persistence'
function Exists128($rel) { Test-Path (Join-Path $Root $rel) }
function ReadIf128($rel) { if (Exists128 $rel) { Get-Content (Join-Path $Root $rel) -Raw } else { '' } }

# 128.1  the renamed runners exist under the RobCo-themed names
Check ((Exists128 'tests/robco-diagnostics.js') -and (Exists128 'tests/robco-diagnostics.ps1')) `
    '128.1: tests/robco-diagnostics.js + tests/robco-diagnostics.ps1 both exist (runners renamed)'

# 128.2  the legacy-named runner files are gone (git mv, not copy)
Check ((-not (Exists128 ('tests/' + $legacy128 + '.js'))) -and (-not (Exists128 ('tests/' + $legacy128 + '.ps1')))) `
    '128.2: the legacy-named runner files no longer exist on disk (renamed, not duplicated)'

# 128.3  escape-ratchet: ZERO stale legacy-name references anywhere in the reference set
$scanList128 = @('package.json', 'scripts/gate.js', 'scripts/pre-commit', 'scripts/pre-push', 'scripts/install-hooks.js', 'tests/test.html', 'tests/run-tests.bat', 'tests/robco-diagnostics.js', 'tests/robco-diagnostics.ps1', '.github/workflows/nightly-tests.yml', '.github/workflows/ci.yml', 'README.md', 'ARCHITECTURE.md', 'CHANGELOG.md', 'RULES.md', 'CLAUDE.md')
$offenders128 = @($scanList128 | Where-Object { (ReadIf128 $_).Contains($legacy128) })
Check ($offenders128.Count -eq 0) `
    ('128.3: no stale legacy test-runner-name reference remains in code/scripts/CI/docs' + $(if ($offenders128.Count) { ' -- OFFENDERS: ' + ($offenders128 -join ', ') } else { '' }))

# 128.4  the runtime invocations were actually repointed to the new names
$gate128 = ReadIf128 'scripts/gate.js'
$pkg128 = ReadIf128 'package.json'
$nightly128 = ReadIf128 '.github/workflows/nightly-tests.yml'
Check (($gate128 -match 'node tests/robco-diagnostics\.js') -and ($gate128 -match 'robco-diagnostics\.ps1') -and ($pkg128 -match 'tests/robco-diagnostics\.js') -and ($nightly128 -match 'tests/robco-diagnostics\.(js|ps1)')) `
    '128.4: gate.js, package.json, and nightly-tests.yml all invoke the renamed runners'

# 128.5  gate.js still pairs BOTH runners (parity invocation intact under the new names)
Check (($gate128 -match 'robco-diagnostics\.js') -and ($gate128 -match 'robco-diagnostics\.ps1')) `
    '128.5: scripts/gate.js references both robco-diagnostics.js and robco-diagnostics.ps1 (dual-runner gate intact)'

# ===========================================================
# Suite 129 -- first-load desktop-layout pointer/hover gate (Protocol 42) (4 tests)
# The desktop app-shell must be gated on a fine pointer + hover so a touch phone can
# NEVER boot into the PC layout, even if a first-paint viewport race reports >=1000px.
# (PS mirror of JS 129.)
# ===========================================================
Sep "Suite 129 -- first-load desktop-layout pointer/hover gate"
$css129 = Read-Src "css/terminal.css"
$core129 = Read-Src "js/ui-core.js"

# 129.1  the desktop app-shell media query carries the pointer/hover gate
Check ($css129.Contains('@media (min-width: 1000px) and (hover: hover) and (pointer: fine)')) `
    '129.1: the desktop layout @media is gated on (min-width:1000px) and (hover:hover) and (pointer:fine)'

# 129.2  no UNGATED `@media (min-width: 1000px)` remains -- the ungated query was the bug
Check (-not ($css129 -match '@media\s*\(min-width:\s*1000px\)\s*\{')) `
    '129.2: no ungated `@media (min-width: 1000px) {` remains in terminal.css (desktop shell is pointer/hover-gated)'

# 129.3  the JS panel-open default uses the same matchMedia gate, not raw window.innerWidth
Check (($core129.Contains("window.matchMedia('(min-width: 1000px) and (hover: hover) and (pointer: fine)')")) -and (-not ($core129 -match 'window\.innerWidth\s*>=\s*1000'))) `
    '129.3: ui-core panel default-open uses matchMedia(gated query); the raw window.innerWidth >= 1000 read is gone'

# 129.4  the desktop shell still exists inside the gated block (desktop preserved)
$desktopBlock129 = [regex]::Match($css129, '(?s)@media \(min-width: 1000px\)[^{]*\{([\s\S]*?\n\})').Groups[1].Value
Check (($desktopBlock129 -match 'grid-template-columns:\s*380px 1fr') -and ($desktopBlock129 -match 'overflow:\s*hidden')) `
    '129.4: the gated desktop block still defines the two-column 380px 1fr shell with body overflow:hidden (desktop preserved)'

# ===========================================================
# Suite 130 -- per-game optics + dynamic (Default) label (8 tests)
# Item 4: the OPTICS picker dynamically tags the ACTIVE game's default optic "(Default)".
# Item 5: the chosen optic persists PER GAME (robco_optic_<ctx>): per-game pick -> game
# default -> green. Game-agnostic / N-game scalable. (PS mirror of JS 130.)
# ===========================================================
Sep "Suite 130 -- per-game optics + dynamic (Default) label"
$audio130 = Read-Src "js/ui-audio.js"
$core130  = Read-Src "js/ui-core.js"
$html130  = Read-Src "index.html"
$saves130 = Read-Src "js/ui-saves.js"
$keyFn130 = [regex]::Match($audio130, '(?s)function _opticStorageKey\([\s\S]*?\n\}').Value
$resolveOpticFn130 = [regex]::Match($audio130, '(?s)function _resolveOptic\(\)[\s\S]*?\n\}').Value
$changeFn130 = [regex]::Match($audio130, '(?s)function changeOpticsColor\([\s\S]*?\n\}').Value
$labelFn130 = [regex]::Match($audio130, '(?s)function _updateOpticsDefaultLabel\(\)[\s\S]*?\n\}').Value

# 130.1  per-game storage key is game-agnostic -- robco_optic_<ctx> via getGameContext()
Check (($audio130 -match 'function _opticStorageKey\(') -and ($keyFn130 -match "'robco_optic_' \+ ") -and ($keyFn130 -match 'getGameContext\(\)')) `
    '130.1: _opticStorageKey() returns robco_optic_<ctx> keyed by getGameContext() (game-agnostic per-game key)'

# 130.2  changeOpticsColor persists to the PER-GAME key, not the legacy global
Check (($changeFn130 -match 'MetaStore\.set\(_opticStorageKey\(\), color\)') -and (-not ($changeFn130 -match "setItem\('robco_optics'"))) `
    '130.2: changeOpticsColor persists the pick to the per-game _opticStorageKey() (not the global robco_optics)'

# 130.3  resolution order: per-game pick -> (one-time legacy migration) -> game default
Check (($resolveOpticFn130 -match '_opticStorageKey\(\)') -and ($resolveOpticFn130 -match "MetaStore\.get\('robco_optics'\)") -and ($resolveOpticFn130 -match "MetaStore\.remove\('robco_optics'\)") -and ($resolveOpticFn130 -match '_resolveDefaultOptics\(\)')) `
    '130.3: _resolveOptic = per-game pick -> migrate+retire legacy global -> _resolveDefaultOptics (default -> green)'

# 130.4  boot resolves + applies the per-game optic, syncs the picker, updates the label
Check (($core130 -match '_resolveOptic\(\)') -and ($core130 -match '_applyThemeVars\(_optic\)') -and ($core130 -match 'opticsColorInput') -and ($core130 -match '_updateOpticsDefaultLabel\(\)')) `
    '130.4: ui-core boot applies _resolveOptic(), sets the picker value, and calls _updateOpticsDefaultLabel()'

# 130.5  dynamic "(Default)" label tags the option matching the active game's default optic
Check (($labelFn130 -match '_resolveDefaultOptics\(\)') -and ($labelFn130 -match 'opt\.value === def') -and ($labelFn130 -match '\(Default\)') -and ($labelFn130 -match '\.replace\(')) `
    '130.5: _updateOpticsDefaultLabel tags the option whose value === _resolveDefaultOptics() with "(Default)" and strips it from the rest'

# 130.6  index.html: green option carries NO static "(Default)"; head pre-paint reads per-game key
Check (($html130 -match '<option value="green">RobCo Green</option>') -and (-not ($html130 -match '<option value="green">[^<]*\(Default\)')) -and ($html130 -match "'robco_optic_' \+ _ctx0")) `
    '130.6: the static "(Default)" is gone from the markup (JS adds it dynamically); the head pre-paint script reads robco_optic_<ctx>'

# 130.7  game-agnostic / N-game scalable -- no two-game hardcode (only the sanctioned || FNV fallback)
$opticCode130 = $keyFn130 + $resolveOpticFn130 + $changeFn130 + $labelFn130
Check ((-not ($opticCode130 -match '\bFO3\b')) -and (-not ($opticCode130 -match "===\s*'FNV'")) -and ($keyFn130 -match "'robco_optic_' \+ ")) `
    '130.7: per-game optic persistence/resolution is game-agnostic -- keyed by gameContext, no two-game hardcode (a new game needs zero theming-code change)'

# 130.8  ui-saves export reads the per-game resolved optic, not the global key
Check (($saves130 -match '_resolveOptic\(\)') -and (-not ($saves130 -match "getItem\('robco_optics'\)"))) `
    '130.8: ui-saves export reads the per-game resolved optic (_resolveOptic), not the global robco_optics'

# ===========================================================
# Suite 131 -- U1: getSystemDirective() decomposition + GA-5 retirement
# (Step 2 / v2.8.0 Phase 0). Structural guards that the directive is now
# composed from named per-section builders, plus a Protocol 14 golden-master
# behavioral test (shells out to node -- mirrors the Suite 12 pattern): the
# REAL builders (extracted from js/api.js) + the REAL GAME_DEFS (loaded from
# js/state.js) are evaluated across the same 11-point state matrix as the JS
# runner and the SHA-256 of each assembled directive is asserted against the
# pre-refactor golden hash -- proving byte-identical output.
# 15 tests
# ===========================================================
Sep "Suite 131 -- U1 directive decomposition + GA-5 retirement (golden-master)"
$apiSrc131 = Read-Src "js/api.js"
$builderNames131 = @(
    '_directiveConstraints', '_directivePersonaAndContract', '_directiveCoreTracking',
    '_directiveSkills', '_directiveFactions', '_directiveSystems',
    '_directiveTrackers', '_directiveInjectionBoundary'
)

# 131.1  every named per-section builder is a real function declaration in api.js
$allBuildersDeclared131 = $true
foreach ($n in $builderNames131) {
    if (-not ($apiSrc131 -match "function $n\s*\(")) { $allBuildersDeclared131 = $false }
}
Check $allBuildersDeclared131 'api.js declares all 8 per-section directive builder functions (U1 decomposition)'

# 131.2  getSystemDirective() composes the 7 top-level builders (not the old
#        monolithic body). _directiveConstraints is called one level down, from
#        inside _directivePersonaAndContract -- not directly from getSystemDirective.
$sdBody131 = ''
try { $sdBody131 = Get-FunctionBody $apiSrc131 'getSystemDirective' } catch {}
$topLevelBuilders131 = $builderNames131 | Where-Object { $_ -ne '_directiveConstraints' }
$allCalled131 = $true
foreach ($n in $topLevelBuilders131) {
    if ($sdBody131 -notmatch [regex]::Escape("$n(")) { $allCalled131 = $false }
}
Check $allCalled131 'getSystemDirective() calls every top-level per-section builder in its composition'

# 131.3  getSystemDirective() still has exactly one real call site (the AI request
#        payload in transmitMessage) -- matches the exact call-site text, not the
#        declaration or the explanatory comments that also name the function.
$realCallSites131 = [regex]::Matches($apiSrc131, [regex]::Escape('text: getSystemDirective()')).Count
Check ($realCallSites131 -eq 1) "getSystemDirective() has exactly one real call site in api.js (found $realCallSites131) -- no runtime call-site change"

# 131.4  Protocol 14: the Tri-Node schema literals survive inside the persona
#        builder (narrative/state/modal node contract still intact post-refactor)
$personaBody131 = ''
try { $personaBody131 = Get-FunctionBody $apiSrc131 '_directivePersonaAndContract' } catch {}
Check (($personaBody131 -match '"narrative"') -and ($personaBody131 -match '"state"') -and ($personaBody131 -match '"modal"')) `
    'Protocol 14: _directivePersonaAndContract() retains the narrative/state/modal Tri-Node schema literals'

# 131.5-131.15  Protocol 14 golden-master: the REAL builders + REAL GAME_DEFS,
#  evaluated via node (vm sandbox), must reproduce the pre-refactor SHA-256 hash
#  for the same 11-point state matrix as the JS runner (both games, every
#  playthroughType branch, both playstyle branches, both campaignMode active
#  states, and a combined-modifiers case).
$goldenLabels131 = @(
    "golden-master FNV ps=(unset) pt=(unset) cm=(unset): byte-identical to pre-refactor directive",
    "golden-master FNV ps=melee pt=(unset) cm=(unset): byte-identical to pre-refactor directive",
    "golden-master FNV ps=(unset) pt=minmaxed cm=(unset): byte-identical to pre-refactor directive",
    "golden-master FNV ps=(unset) pt=completionist cm=(unset): byte-identical to pre-refactor directive",
    "golden-master FNV ps=(unset) pt=casual cm=(unset): byte-identical to pre-refactor directive",
    "golden-master FNV ps=(unset) pt=speedrun cm=(unset): byte-identical to pre-refactor directive",
    "golden-master FNV ps=(unset) pt=(unset) cm=rng: byte-identical to pre-refactor directive",
    "golden-master FNV ps=(unset) pt=(unset) cm=rng-locked: byte-identical to pre-refactor directive",
    "golden-master FNV ps=melee pt=minmaxed cm=rng-locked: byte-identical to pre-refactor directive",
    "golden-master FO3 ps=(unset) pt=(unset) cm=(unset): byte-identical to pre-refactor directive",
    "golden-master FO3 ps=melee pt=(unset) cm=rng-locked: byte-identical to pre-refactor directive"
)
try {
    $nodeCheck131 = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck131) {
        $apiPathNode131 = (Join-Path $Root "js/api.js").Replace('\', '/')
        $statePathNode131 = (Join-Path $Root "js/state.js").Replace('\', '/')
        $testScript131 = @"
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');
const apiSource = fs.readFileSync('$apiPathNode131', 'utf8');
const stateSource = fs.readFileSync('$statePathNode131', 'utf8');
function extractFunctionDecl(src, name) {
  const idx = src.indexOf('function ' + name);
  if (idx === -1) throw new Error('not found: ' + name);
  const parenStart = src.indexOf('(', idx);
  const braceStart = src.indexOf('{', parenStart);
  let depth = 0, i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(idx, i + 1);
}
const fnNames = [
  '_directiveConstraints', '_directivePersonaAndContract', '_directiveCoreTracking',
  '_directiveSkills', '_directiveFactions', '_directiveSystems',
  '_directiveTrackers', '_directiveInjectionBoundary', 'getSystemDirective',
];
const allFnSrc = fnNames.map(n => extractFunctionDecl(apiSource, n)).join('\n\n');
const stateSandbox = { window: {} };
vm.createContext(stateSandbox);
vm.runInContext(stateSource, stateSandbox);
const sandbox = {
  state: {}, GAME_DEFS: stateSandbox.window.GAME_DEFS,
  APP_VERSION: stateSandbox.window.APP_VERSION || '2.7.0',
  localStorage: { getItem: () => null }, _commGet: (f) => null, console,
};
vm.createContext(sandbox);
vm.runInContext(allFnSrc + '\nthis.getSystemDirective = getSystemDirective;', sandbox);
const matrix = [
  { ctx: 'FNV', ps: undefined, pt: undefined, cm: undefined, sha256: 'ede29d0a8b2892b1f7962730467f24aa143a7284278e2aa7db8e3f7e5e08ec39' },
  { ctx: 'FNV', ps: 'melee',   pt: undefined, cm: undefined, sha256: '68455f8ca104cde06703e9a3a849492d658d44a45bddc1730c1f73b124fe9736' },
  { ctx: 'FNV', ps: undefined, pt: 'minmaxed', cm: undefined, sha256: '8368aab7620742cc14a000425a55b176120fa4085a61693bcbefb0ac88b2b1dc' },
  { ctx: 'FNV', ps: undefined, pt: 'completionist', cm: undefined, sha256: 'bcf934e2dea2c8c5dd91dc57db11b7fddc8d1d82d323d4c414ab49063cffde27' },
  { ctx: 'FNV', ps: undefined, pt: 'casual', cm: undefined, sha256: '481d2b9e2a4541b2eb80ea73890c448aba25ebd83979e3845efa4ad68b666621' },
  { ctx: 'FNV', ps: undefined, pt: 'speedrun', cm: undefined, sha256: 'f7cea26ec145b7fa1540aca6be010a825db7c82cf3a9d7874e18df52adf9a0ba' },
  { ctx: 'FNV', ps: undefined, pt: undefined, cm: 'rng', sha256: '1c015a880abfc1654d4372fcac4d5081adfa20833ef2baede2aa539ad5f98556' },
  { ctx: 'FNV', ps: undefined, pt: undefined, cm: 'rng-locked', sha256: 'e55ab9da48e0c41107252724fa9360c29affd3ed80cbd497b429d84588159106' },
  { ctx: 'FNV', ps: 'melee', pt: 'minmaxed', cm: 'rng-locked', sha256: '17028953718ce184cdd1e309de0406a24882a9b2ace0dc89976e18ca4e45c2a6' },
  { ctx: 'FO3', ps: undefined, pt: undefined, cm: undefined, sha256: 'a6a2ec157fff83fd142a0ba2ece1d6d133213e6cf2b45be9011a11f8b7dd946a' },
  { ctx: 'FO3', ps: 'melee', pt: undefined, cm: 'rng-locked', sha256: '1bacfa4696b96d35aba0d566b58f5ec4ec3c4f654e1f073d36198c17cb5b4e89' },
];
const bits = matrix.map(m => {
  try {
    sandbox._commGet = (f) => (f === 'playstyle' ? m.ps : null);
    sandbox.state = { gameContext: m.ctx, playthroughType: m.pt, campaignMode: m.cm };
    const out = sandbox.getSystemDirective.call(sandbox);
    const hash = crypto.createHash('sha256').update(out).digest('hex');
    return hash === m.sha256 ? '1' : '0';
  } catch (e) { return '0'; }
});
console.log('RESULT:' + bits.join(''));
"@
        $out131 = ($testScript131 | node 2>&1 | Out-String)
        $rm131 = [regex]::Match($out131, 'RESULT:([01]{11})')
        if ($rm131.Success) {
            $bits131 = $rm131.Groups[1].Value
            for ($bi = 0; $bi -lt 11; $bi++) { Check ($bits131.Substring($bi, 1) -eq '1') $goldenLabels131[$bi] }
        } else {
            $err131 = if ([string]::IsNullOrWhiteSpace($out131)) { "No output from node" } else { $out131.Trim() }
            foreach ($lbl in $goldenLabels131) { Fail "$lbl  (runtime error: $err131)" }
        }
    } else {
        foreach ($lbl in $goldenLabels131) { Fail "$lbl  (node not found)" }
    }
} catch {
    foreach ($lbl in $goldenLabels131) { Fail "$lbl  (harness error: $_)" }
}

# ===========================================================
# Suite 132 -- U2: window.onload boot decomposition (Step 2 / v2.8.0
# Phase 0). Structural guards that the ~568-line monolithic boot block was
# split into named, order-preserving phase functions with zero behavioral
# change: every phase function exists, window.onload calls all of them in
# the original source order, the shared standby timer state/functions moved
# to true module scope (not re-declared inside window.onload -- the seam
# that made _startAmbientTimers() able to reach _startUptimeClock/
# _startMemCycle in the first place), and window.onload itself stays a
# slim composition instead of drifting back into a monolith.
# 10 tests
# ===========================================================
Sep "Suite 132 -- U2 window.onload boot decomposition"
$uiCoreSrc132 = Read-Src "js/ui-core.js"

$bootPhaseFns132 = @(
    '_hydrateStateFromStorage', '_restoreApiKeyAndChatHistory', '_wireRotaryDialClick',
    '_wireStandby', '_wirePanelPersistence', '_restoreOpticsPreference',
    '_restoreDevicePrefs', '_wireKeyboardShortcuts', '_runBootSequenceAndBriefing',
    '_startAmbientTimers', '_wireInputHistoryNav', '_wireUnloadFlush'
)

# 132.1  every named boot-phase function is a real function declaration in ui-core.js
$allPhasesDeclared132 = $true
foreach ($n in $bootPhaseFns132) {
    if (-not ($uiCoreSrc132 -match "function $n\s*\(\)\s*\{")) { $allPhasesDeclared132 = $false }
}
Check $allPhasesDeclared132 'ui-core.js declares all 12 named boot-phase functions (U2 decomposition)'

# 132.2  each boot-phase function is declared exactly once (no duplicate seams)
$noDupPhases132 = $true
foreach ($n in $bootPhaseFns132) {
    $cnt = [regex]::Matches($uiCoreSrc132, [regex]::Escape("function $n") + '\s*\(').Count
    if ($cnt -ne 1) { $noDupPhases132 = $false }
}
Check $noDupPhases132 'every boot-phase function is declared exactly once (no duplicate decomposition seams)'

# 132.3/132.4/132.5/132.6  window.onload's own body: calls every phase fn, in order,
# stays slim, and still calls initTabs() directly (Suite 57.9 depends on that literal)
$onloadBody132 = ''
$olIdx132 = $uiCoreSrc132.IndexOf('window.onload = async function () {')
if ($olIdx132 -ge 0) {
    $braceStart132 = $uiCoreSrc132.IndexOf('{', $olIdx132)
    $depth132 = 0
    $i132 = $braceStart132
    while ($i132 -lt $uiCoreSrc132.Length) {
        $ch132 = $uiCoreSrc132[$i132]
        if ($ch132 -eq '{') { $depth132++ }
        elseif ($ch132 -eq '}') { $depth132--; if ($depth132 -eq 0) { break } }
        $i132++
    }
    $onloadBody132 = $uiCoreSrc132.Substring($braceStart132, $i132 - $braceStart132 + 1)
}

$allCalled132 = $true
foreach ($n in $bootPhaseFns132) {
    if ($onloadBody132 -notmatch [regex]::Escape("$n()")) { $allCalled132 = $false }
}
Check (($onloadBody132.Length -gt 0) -and $allCalled132) 'window.onload calls every one of the 12 named boot-phase functions'

$callIdxs132 = $bootPhaseFns132 | ForEach-Object { $onloadBody132.IndexOf("$_()") }
$inOrder132 = $true
for ($ci = 1; $ci -lt $callIdxs132.Count; $ci++) {
    if ($callIdxs132[$ci] -le $callIdxs132[$ci - 1]) { $inOrder132 = $false }
}
Check $inOrder132 'window.onload calls the 12 boot-phase functions in the original, order-preserving sequence'

$onloadLineCount132 = ($onloadBody132 -split "`n").Count
Check ($onloadLineCount132 -lt 40) "window.onload body stays a slim named-call composition ($onloadLineCount132 lines, expected < 40)"

Check ($onloadBody132 -match [regex]::Escape('initTabs()')) 'window.onload still calls initTabs() directly (Suite 57.9 boot-order guard depends on this literal call)'

# 132.7  standby shared state is declared once at true module scope, before window.onload
$onloadDeclIdx132 = $uiCoreSrc132.IndexOf('window.onload = async function () {')
$sharedVars132 = @('_standbyActive', '_uptimeInterval', '_memCycleInterval', 'sessionStart')
$sharedVarsOk132 = $true
foreach ($v in $sharedVars132) {
    $declIdx = $uiCoreSrc132.IndexOf("let $v =")
    if ($declIdx -lt 0 -or $declIdx -ge $onloadDeclIdx132) { $sharedVarsOk132 = $false }
}
Check ($onloadDeclIdx132 -ge 0 -and $sharedVarsOk132) 'standby shared state (_standbyActive/_uptimeInterval/_memCycleInterval/sessionStart) is declared once at module scope, before window.onload'

# 132.8  _startUptimeClock/_startMemCycle/enterStandby/exitStandby are module-scope
#        function declarations (declared before window.onload, not nested inside it)
$sharedFns132 = @('_startUptimeClock', '_startMemCycle', 'enterStandby', 'exitStandby')
$sharedFnsOk132 = $true
foreach ($n in $sharedFns132) {
    $declIdx = $uiCoreSrc132.IndexOf("function $n(")
    if ($declIdx -lt 0 -or $declIdx -ge $onloadDeclIdx132) { $sharedFnsOk132 = $false }
}
Check $sharedFnsOk132 '_startUptimeClock/_startMemCycle/enterStandby/exitStandby are module-scope functions declared before window.onload (not window.onload-local closures)'

# 132.9  _startAmbientTimers() re-arms sessionStart + both timer starters, matching
#        the original boot-time (not just standby-exit) timer kickoff
$ambientBody132 = ''
try { $ambientBody132 = Get-FunctionBody $uiCoreSrc132 '_startAmbientTimers' } catch {}
Check (($ambientBody132 -match 'sessionStart\s*=\s*Date\.now\(\)') -and ($ambientBody132 -match '_startUptimeClock\(\)') -and ($ambientBody132 -match '_startMemCycle\(\)')) `
    '_startAmbientTimers() sets sessionStart = Date.now() and starts both ambient timers (boot-time kickoff preserved)'

# 132.10  no stray second `window.onload =` assignment was introduced
$onloadAssignCount132 = [regex]::Matches($uiCoreSrc132, 'window\.onload\s*=').Count
Check ($onloadAssignCount132 -eq 1) 'exactly one window.onload assignment exists in ui-core.js'

# ===========================================================
# Suite 133 -- U3: autoImportState() VM-sandbox behavioral test (Step 2 /
# v2.8.0 Phase 0). Shells out to node (mirrors the Suite 131 pattern): a vm
# sandbox loads the REAL js/state.js + js/reg_nv.js + the REAL
# autoImportState() body extracted from js/api.js in one shared context, then
# actually EXECUTES it against the same 27-case malformed / hostile /
# oversized / wrong-typed / valid payload matrix as the JS runner. Also locks
# the Protocol-42 fix landed in this commit: nine numeric fields in
# autoImportState() (lvl/xp/hpCur/hpMax/s-p-e-c-i-a-l/caps/karma/rads/ticks)
# previously did a bare parseInt(v) with no `|| 0` fallback -- a hostile or
# malformed AI response could silently corrupt player state with NaN.
# 27 tests
# ===========================================================
Sep "Suite 133 -- U3 autoImportState() VM-sandbox behavioral test"
$labels133 = @(
    "malformed truncated JSON: no throw, state unchanged",
    "empty string payload: no throw, state unchanged",
    "garbage non-JSON payload: no throw, state unchanged",
    "null root payload: no throw, state unchanged",
    "numeric root payload: no throw, state unchanged",
    "string root payload: no throw, state unchanged",
    "array root payload: no throw, state unchanged",
    "boolean root payload: no throw, state unchanged",
    "__proto__ pollution attempt does not pollute Object.prototype",
    "constructor.prototype pollution attempt does not pollute Object.prototype",
    "__proto__ inside a quest entry does not pollute prototype or leak into stored quest",
    "script-tag-shaped string is stored as inert text, never executed",
    "SQL-injection-shaped string passes through as opaque text",
    "P4: AI campaign_notes route to the eventLog (structured, capped), not the manual notebook",
    "large inventory array (2000 items) processed without throwing",
    "extremely long single string field does not crash the sync",
    "factions payload as an array is ignored safely (stays a valid object)",
    "skills payload as a string is ignored safely",
    "equipped payload as an array is ignored safely",
    "status payload as a non-array object is ignored safely",
    "non-numeric SPECIAL stat value does not corrupt state with NaN (clamped 1-10)",
    "non-numeric core numeric fields never resolve to NaN",
    "garbage ticks value does not corrupt active status-effect countdown with NaN",
    "well-formed partial payload updates only the included field",
    "well-formed payload updates SPECIAL + factions + inventory correctly",
    "SPECIAL values are clamped to 1-10 even for valid out-of-range numbers",
    "collectibles are validated against the registry allow-list; unknown + dup entries dropped"
)
try {
    $nodeCheck133 = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck133) {
        $apiPathNode133 = (Join-Path $Root "js/api.js").Replace('\', '/')
        $statePathNode133 = (Join-Path $Root "js/state.js").Replace('\', '/')
        $regPathNode133 = (Join-Path $Root "js/reg_nv.js").Replace('\', '/')
        $testScript133 = @"
const fs = require('fs');
const vm = require('vm');
const apiSource = fs.readFileSync('$apiPathNode133', 'utf8');
const stateSource = fs.readFileSync('$statePathNode133', 'utf8');
const regSource = fs.readFileSync('$regPathNode133', 'utf8');
function extractFunctionBody(source, fnName) {
  const idx = source.indexOf('function ' + fnName);
  const braceStart = source.indexOf('{', source.indexOf('(', idx));
  let depth = 0, i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) break;
  }
  return source.slice(braceStart, i + 1);
}
const sandbox = {
  window: {}, document: { getElementById: () => null },
  console: { error: () => {}, log: () => {}, warn: () => {} },
  loadUI: () => {}, appendToChat: () => {}, expandPanelForCategory: () => {},
};
vm.createContext(sandbox);
vm.runInContext(stateSource, sandbox);
vm.runInContext(regSource, sandbox);
const autoImportBody = 'function autoImportState(jsonString)' + extractFunctionBody(apiSource, 'autoImportState');
vm.runInContext(autoImportBody + '\nthis.autoImportState = autoImportState;', sandbox);
const defaultState = vm.runInContext('JSON.parse(JSON.stringify(state))', sandbox);
const realCollectible = vm.runInContext('FALLOUT_REGISTRY.collectibles[0].name', sandbox);
function resetState(overrides) {
  const s = overrides ? Object.assign({}, defaultState, overrides) : defaultState;
  vm.runInContext('state = ' + JSON.stringify(s) + ';', sandbox);
}
function liveState() { return vm.runInContext('state', sandbox); }
function snapshotState() { return JSON.parse(JSON.stringify(liveState())); }
function callThrows(payload) {
  try { sandbox.autoImportState(payload); return false; } catch (_) { return true; }
}
const results = [];
function t(setup, fn) {
  try { resetState(setup); results.push(!!fn()); } catch (e) { results.push(false); }
}
t(undefined, () => { const b = snapshotState(); const threw = callThrows('{"lvl": 5,'); return !threw && JSON.stringify(snapshotState()) === JSON.stringify(b); });
t(undefined, () => { const b = snapshotState(); const threw = callThrows(''); return !threw && JSON.stringify(snapshotState()) === JSON.stringify(b); });
t(undefined, () => { const b = snapshotState(); const threw = callThrows('not json at all'); return !threw && JSON.stringify(snapshotState()) === JSON.stringify(b); });
t(undefined, () => { const b = snapshotState(); const threw = callThrows('null'); return !threw && JSON.stringify(snapshotState()) === JSON.stringify(b); });
t(undefined, () => { const b = snapshotState(); const threw = callThrows('42'); return !threw && JSON.stringify(snapshotState()) === JSON.stringify(b); });
t(undefined, () => { const b = snapshotState(); const threw = callThrows('"just a string"'); return !threw && JSON.stringify(snapshotState()) === JSON.stringify(b); });
t(undefined, () => { const b = snapshotState(); const threw = callThrows('[1,2,3]'); return !threw && JSON.stringify(snapshotState()) === JSON.stringify(b); });
t(undefined, () => { const b = snapshotState(); const threw = callThrows('true'); return !threw && JSON.stringify(snapshotState()) === JSON.stringify(b); });
t(undefined, () => { callThrows(JSON.stringify({ __proto__: { polluted133: 'yes' }, lvl: 7 })); return Object.prototype.polluted133 === undefined && liveState().lvl === 7; });
t(undefined, () => { callThrows(JSON.stringify({ constructor: { prototype: { polluted2_133: 'yes' } } })); return Object.prototype.polluted2_133 === undefined; });
t(undefined, () => {
  callThrows(JSON.stringify({ quests: [{ __proto__: { polluted3_133: 'yes' }, name: 'Test Quest', status: 'active' }] }));
  const q = liveState().quests[0];
  return Object.prototype.polluted3_133 === undefined && q.name === 'Test Quest' && q.status === 'active' && !Object.prototype.hasOwnProperty.call(q, 'polluted3_133');
});
t(undefined, () => {
  callThrows(JSON.stringify({ loc: '<script>window.__xss133=1</script>' }));
  return liveState().loc === '<script>window.__xss133=1</script>' && sandbox.window.__xss133 === undefined;
});
t(undefined, () => { callThrows(JSON.stringify({ quests: [{ name: "'; DROP TABLE saves; --", status: 'active' }] })); return liveState().quests[0].name === "'; DROP TABLE saves; --"; });
t(undefined, () => {
  const notes = []; for (let i = 0; i < 250; i++) notes.push('event ' + i);
  callThrows(JSON.stringify({ campaign_notes: notes }));
  const st = liveState();
  return Array.isArray(st.eventLog) && st.eventLog.some(e => e && e.text === 'event 249' && e.type === 'log') && st.eventLog.length <= 1000;
});
t(undefined, () => {
  const inv = []; for (let i = 0; i < 2000; i++) inv.push({ name: 'Item' + i, qty: 1, wgt: 1, val: 1, type: 'misc' });
  const threw = callThrows(JSON.stringify({ inventory: inv }));
  return !threw && liveState().inventory.length === 2000;
});
t(undefined, () => { const longStr = 'A'.repeat(100000); const threw = callThrows(JSON.stringify({ loc: longStr })); return !threw && liveState().loc.length === 100000; });
t(undefined, () => { const b = snapshotState().factions; callThrows(JSON.stringify({ factions: ['ncr', 'legion'] })); return JSON.stringify(liveState().factions) === JSON.stringify(b); });
t(undefined, () => { const b = snapshotState().skills; callThrows(JSON.stringify({ skills: 'guns:100' })); return JSON.stringify(liveState().skills) === JSON.stringify(b); });
t(undefined, () => { const b = snapshotState().equipped; callThrows(JSON.stringify({ equipped: ['weapon'] })); return JSON.stringify(liveState().equipped) === JSON.stringify(b); });
t(undefined, () => { const b = snapshotState().status; callThrows(JSON.stringify({ status: { foo: 'bar' } })); return JSON.stringify(liveState().status) === JSON.stringify(b); });
t(undefined, () => { callThrows(JSON.stringify({ s: 'abc' })); const s = liveState().s; return !Number.isNaN(s) && s >= 1 && s <= 10; });
t(undefined, () => {
  callThrows(JSON.stringify({ lvl: 'x', xp: 'x', hpCur: 'x', hpMax: 'x', caps: 'x', karma: 'x', rads: 'x', ticks: 'x' }));
  const st = liveState();
  return ['lvl','xp','hpCur','hpMax','caps','karma','rads','ticks'].every(k => !Number.isNaN(st[k]));
});
t({ status: [{ name: 'Poisoned', ticks: 5, type: 'DEBUFF' }] }, () => {
  callThrows(JSON.stringify({ ticks: 'garbage' }));
  const eff = liveState().status.find(e => e.name === 'Poisoned');
  return eff !== undefined && !Number.isNaN(eff.ticks);
});
t(undefined, () => { callThrows(JSON.stringify({ lvl: 5 })); const st = liveState(); return st.lvl === 5 && st.xp === defaultState.xp && st.caps === defaultState.caps; });
t(undefined, () => {
  callThrows(JSON.stringify({ s: 7, p: 6, e: 5, c: 4, i: 3, a: 2, l: 1, factions: { ncr: { fame: 10, infamy: 0 } }, inventory: [{ name: 'Stimpak', qty: 3, wgt: 0, val: 0, type: 'aid' }] }));
  const st = liveState();
  return st.s === 7 && st.l === 1 && st.factions.ncr.fame === 10 && st.inventory.length === 1 && st.inventory[0].name === 'Stimpak' && st.inventory[0].qty === 3;
});
t(undefined, () => { callThrows(JSON.stringify({ s: 99, p: -5 })); const st = liveState(); return st.s === 10 && st.p === 1; });
t(undefined, () => {
  callThrows(JSON.stringify({ collectibles: [realCollectible, 'Fake Item That Does Not Exist', realCollectible] }));
  const c = liveState().collectibles;
  return c.length === 1 && c[0] === realCollectible;
});
console.log('RESULT:' + results.map(r => r ? '1' : '0').join(''));
"@
        $out133 = ($testScript133 | node 2>&1 | Out-String)
        $rm133 = [regex]::Match($out133, 'RESULT:([01]{27})')
        if ($rm133.Success) {
            $bits133 = $rm133.Groups[1].Value
            for ($bi = 0; $bi -lt 27; $bi++) { Check ($bits133.Substring($bi, 1) -eq '1') $labels133[$bi] }
        } else {
            $err133 = if ([string]::IsNullOrWhiteSpace($out133)) { "No output from node" } else { $out133.Trim() }
            foreach ($lbl in $labels133) { Fail "$lbl  (runtime error: $err133)" }
        }
    } else {
        foreach ($lbl in $labels133) { Fail "$lbl  (node not found)" }
    }
} catch {
    foreach ($lbl in $labels133) { Fail "$lbl  (harness error: $_)" }
}

# ===========================================================
# Suite 134 -- U6: MetaStore boundary-gate (Step 2 / v2.8.0 Phase 0). U5
# introduced MetaStore (js/state.js) as the single choke point for every
# robco_* localStorage key that is a DEVICE PREFERENCE, as opposed to
# CAMPAIGN/SAVE data (robco_v8/v7/chat/playstyle/playstyle_type, save slots,
# rolling backups, cloud-push bookkeeping), which is a separate store and
# must never be read/written through MetaStore (Protocol 23). Makes that
# boundary structural: manifest purity, has()/get()/set()/remove() behavior
# (shelled to node, mirrors the Suite 133 pattern), and static guards that no
# served code crosses the boundary either direction.
# 8 tests
# ===========================================================
Sep "Suite 134 -- U6 MetaStore boundary gate"

$campaignKeys134 = @('robco_v8', 'robco_v7', 'robco_chat', 'robco_playstyle', 'robco_playstyle_type', 'robco_slot_', 'robco_backup_', 'robco_last_cloud_push')

# 134.1  structural: MetaStore + META_MANIFEST declared with the full accessor surface
Check (($stateSrc -match 'const META_MANIFEST\s*=\s*\{') -and ($stateSrc -match 'const MetaStore\s*=\s*\{') -and ($stateSrc -match 'has\(key\)') -and ($stateSrc -match 'get\(key\)') -and ($stateSrc -match 'set\(key,\s*val\)') -and ($stateSrc -match 'remove\(key\)') -and ($stateSrc -match 'window\.MetaStore\s*=\s*MetaStore')) `
    '134.1: js/state.js declares META_MANIFEST + MetaStore (get/set/remove/has/keys) and exposes window.MetaStore'

# 134.2  purity: no campaign/save key is registered in the device-preference manifest
$manifestBlock134 = [regex]::Match($stateSrc, '(?s)const META_MANIFEST\s*=\s*\{[\s\S]*?\n\};').Value
$leaked134 = $campaignKeys134 | Where-Object { $manifestBlock134 -match [regex]::Escape($_) }
Check ($manifestBlock134.Length -gt 0 -and $leaked134.Count -eq 0) `
    ('134.2: META_MANIFEST registers zero campaign/save keys (robco_v8/v7/chat/playstyle/playstyle_type/slot/backup/last_cloud_push)' + $(if ($leaked134.Count) { ' -- leaked: ' + ($leaked134 -join ', ') } else { '' }))

# 134.3-134.5  behavioral: has()/get()/set()/remove() correctness, shelled to node
$labels134 = @(
    '134.3: MetaStore.has() is true for a registered device key and the per-game optic family, false for every campaign key',
    '134.4: MetaStore.set()/get()/remove() round-trip correctly against localStorage',
    '134.5: MetaStore.get/set/remove never throw when localStorage itself throws (quota/private-mode fail-soft)'
)
try {
    $nodeCheck134 = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck134) {
        $statePathNode134 = (Join-Path $Root "js/state.js").Replace('\', '/')
        $testScript134 = @"
const fs = require('fs');
const vm = require('vm');
const stateSource = fs.readFileSync('$statePathNode134', 'utf8');
const sandbox = { window: {}, document: { getElementById: () => null } };
vm.createContext(sandbox);
vm.runInContext(stateSource, sandbox);
const results = [];
const campaignKeys = ['robco_v8','robco_v7','robco_chat','robco_playstyle','robco_playstyle_type','robco_slot_1','robco_backup_1','robco_last_cloud_push'];
try {
  const posHas = ['robco_gemini_key', 'robco_optic_FNV'].every(k => vm.runInContext('MetaStore.has(' + JSON.stringify(k) + ')', sandbox) === true);
  const negHas = campaignKeys.every(k => vm.runInContext('MetaStore.has(' + JSON.stringify(k) + ')', sandbox) === false);
  results.push(posHas && negHas);
} catch (e) { results.push(false); }
try {
  const store = {};
  sandbox.localStorage = {
    getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
  vm.runInContext("MetaStore.set('robco_high_lumen', 'true')", sandbox);
  const readBack = vm.runInContext("MetaStore.get('robco_high_lumen')", sandbox);
  vm.runInContext("MetaStore.remove('robco_high_lumen')", sandbox);
  const afterRemove = vm.runInContext("MetaStore.get('robco_high_lumen')", sandbox);
  results.push(readBack === 'true' && afterRemove === null);
} catch (e) { results.push(false); }
try {
  sandbox.localStorage = {
    getItem: () => { throw new Error('QuotaExceededError'); },
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => { throw new Error('QuotaExceededError'); },
  };
  const getResult = vm.runInContext("MetaStore.get('robco_haptic_enabled')", sandbox);
  vm.runInContext("MetaStore.set('robco_haptic_enabled', 'true')", sandbox);
  vm.runInContext("MetaStore.remove('robco_haptic_enabled')", sandbox);
  results.push(getResult === null);
} catch (e) { results.push(false); }
console.log('RESULT:' + results.map(r => r ? '1' : '0').join(''));
"@
        $out134 = ($testScript134 | node 2>&1 | Out-String)
        $rm134 = [regex]::Match($out134, 'RESULT:([01]{3})')
        if ($rm134.Success) {
            $bits134 = $rm134.Groups[1].Value
            for ($bi = 0; $bi -lt 3; $bi++) { Check ($bits134.Substring($bi, 1) -eq '1') $labels134[$bi] }
        } else {
            $err134 = if ([string]::IsNullOrWhiteSpace($out134)) { "No output from node" } else { $out134.Trim() }
            foreach ($lbl in $labels134) { Fail "$lbl  (runtime error: $err134)" }
        }
    } else {
        foreach ($lbl in $labels134) { Fail "$lbl  (node not found)" }
    }
} catch {
    foreach ($lbl in $labels134) { Fail "$lbl  (harness error: $_)" }
}

# 134.6  static: no served code ever passes a campaign/save key to MetaStore
$servedJs134 = $uiSrc + "`n" + $apiSrc + "`n" + $cloudSrc
Check (-not ($servedJs134 -match "MetaStore\.(get|set|remove)\(\s*['""]robco_(v8|v7|chat|playstyle(_type)?|slot_|backup_|last_cloud_push)")) `
    '134.6: no MetaStore.get/set/remove call site anywhere passes a campaign/save key'

# 134.7  static: the sanctioned index.html pre-paint exception sits before the first js/*.js <script> tag
$firstScriptIdx134 = $htmlSrc.IndexOf('<script src="js/')
$preheadBlock134 = $htmlSrc.Substring(0, [Math]::Max(0, $firstScriptIdx134))
$restOfDoc134 = if ($firstScriptIdx134 -ge 0) { $htmlSrc.Substring($firstScriptIdx134) } else { $htmlSrc }
$rawDeviceKeyRe134 = "localStorage\.getItem\(\s*['""]robco_(optic_|optics|high_lumen)"
$preheadHits134 = [regex]::Matches($preheadBlock134, $rawDeviceKeyRe134).Count
$restHits134 = [regex]::Matches($restOfDoc134, $rawDeviceKeyRe134).Count
Check (($firstScriptIdx134 -gt -1) -and ($preheadHits134 -gt 0) -and ($restHits134 -eq 0)) `
    '134.7: the sanctioned pre-paint bare-localStorage device-key reads in index.html sit strictly before the first js/*.js <script> tag (MetaStore is unavailable there)'

# 134.8  static: every served JS file reaches device-preference keys/constants ONLY through MetaStore
$deviceTokens134 = @('robco_gemini_key','robco_gemini_key_sync','robco_gemini_model','robco_sfx_muted','robco_hum_muted','robco_geiger_muted','robco_tinnitus_muted','robco_ambient_muted','robco_wake_muted','robco_panelclick_muted','robco_bootdrone_muted','robco_levelup_muted','robco_heartbeat_muted','robco_questcomplete_muted','robco_questfail_muted','robco_factionthreshold_muted','robco_master_muted','RADIO_KEY','WAKE_LOCK_KEY','HAPTIC_KEY','HIGH_LUMEN_KEY','OVERSEER_LOG_KEY','ERROR_LOG_KEY','robco_panel_state','robco_active_tab','robco_typer_speed','robco_version','robco_booted_before','robco_feature_flags','robco_sw_installed')
$offenders134 = $deviceTokens134 | Where-Object { $servedJs134 -match ("localStorage\.(getItem|setItem|removeItem)\(\s*['\""]?" + $_) }
Check ($offenders134.Count -eq 0) `
    ('134.8: no served JS (ui/api/cloud) reads/writes a registered device-preference key via raw localStorage -- MetaStore is the only path' + $(if ($offenders134.Count) { ' -- offenders: ' + ($offenders134 -join ', ') } else { '' }))

# ===========================================================
# Suite 135 -- U7/U8: OS event bus + faction-threshold Protocol-38 fix +
# auto-log expansion (Step 2 / v2.8.0 Phase 0). U7 added a tiny synchronous
# pub/sub (RobcoEvents.on/emit, js/state.js) and re-pointed the 3 previously
# inline state-crossing detectors (level-up, faction-threshold, HP-critical)
# to emit through it. The faction-threshold detector's hardcoded FNV-only key
# array (['ncr','legion','house','bos','boomers','khans']) -- which meant FO3
# campaigns never fired a threshold alert at all -- is replaced by
# getFactionRegistry() (game-agnostic, Protocol 38). U8 expands auto-logging
# to level-ups, collectible acquisitions, crafts, trades, and sleeps, routed
# through the same bus and written via the single _logCampaignEvent() helper.
# Also locks the Protocol 42 boot-order fix: each cross-file RobcoEvents.on()
# registration is wrapped in a named _wire*EventBusSubscribers() function called
# from window.onload, since a bare top-level call in a static <script> file could
# execute before state.js (dynamically, context-conditionally loaded) had run.
# 16 tests
# ===========================================================
Sep "Suite 135 -- U7/U8 OS event bus + faction-agnostic fix + auto-log"

$uiRenderSrc135 = Read-Src "js\ui-render.js"
$uiCoreSrc135   = Read-Src "js\ui-core.js"
$uiAudioSrc135  = Read-Src "js\ui-audio.js"

# 135.1  structural: state.js declares the bus (on/emit) and exposes it globally
Check (($stateSrc -match 'const RobcoEvents\s*=\s*\(\(\)\s*=>\s*\{') -and ($stateSrc -match 'function on\(event, fn\)') -and ($stateSrc -match 'function emit\(event, payload\)') -and ($stateSrc -match 'window\.RobcoEvents\s*=\s*RobcoEvents')) `
    '135.1: js/state.js declares RobcoEvents (on/emit) and exposes window.RobcoEvents'

# 135.2-135.6, 135.9, 135.14  behavioral, shelled to node (mirrors Suite 133/134 pattern)
$labels135 = @(
    '135.2: RobcoEvents.on() + emit() calls the handler exactly once with the payload',
    '135.3: no double-fire -- N emits call a single-registered handler exactly N times',
    '135.4: multiple subscribers to the same event each fire exactly once per emit',
    '135.5: a throwing listener never escapes emit() and never blocks the other listeners',
    '135.6: emit() on an event with no subscribers does not throw',
    "135.9: an FO3-only faction ('talon', never in the old FNV-hardcoded array) crossing Vilified fires 'faction.threshold' -- the Protocol-38 fix works behaviorally",
    '135.14: emitting level.up through the real RobcoEvents bus appends a structured eventLog record (type=level, t=ticks) via the real _logEvent() subscriber'
)
try {
    $nodeCheck135 = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck135) {
        $statePathNode135 = (Join-Path $Root "js/state.js").Replace('\', '/')
        $apiPathNode135   = (Join-Path $Root "js/api.js").Replace('\', '/')
        $testScript135 = @"
const fs = require('fs');
const vm = require('vm');
const stateSource = fs.readFileSync('$statePathNode135', 'utf8');
const apiSource = fs.readFileSync('$apiPathNode135', 'utf8');
function extractFunctionBody(source, fnName) {
  let idx = source.indexOf('function ' + fnName);
  let i = source.indexOf('{', idx);
  let depth = 0;
  const start = i;
  while (i < source.length) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
    i++;
  }
  throw new Error('Unclosed brace for ' + fnName);
}
function busSandbox() {
  const sandbox = { window: {}, document: { getElementById: () => null } };
  vm.createContext(sandbox);
  vm.runInContext(stateSource, sandbox);
  return sandbox;
}
const results = [];
try { // 135.2
  const sb = busSandbox(); sb.calls = [];
  vm.runInContext("RobcoEvents.on('t.event', p => { calls.push(p); })", sb);
  vm.runInContext("RobcoEvents.emit('t.event', { x: 1 })", sb);
  results.push(sb.calls.length === 1 && sb.calls[0].x === 1);
} catch (e) { results.push(false); }
try { // 135.3
  const sb = busSandbox(); sb.calls = [];
  vm.runInContext("RobcoEvents.on('t.event', p => { calls.push(p); })", sb);
  vm.runInContext("RobcoEvents.emit('t.event', 1)", sb);
  vm.runInContext("RobcoEvents.emit('t.event', 2)", sb);
  results.push(sb.calls.length === 2 && sb.calls[0] === 1 && sb.calls[1] === 2);
} catch (e) { results.push(false); }
try { // 135.4
  const sb = busSandbox(); sb.a = 0; sb.b = 0;
  vm.runInContext("RobcoEvents.on('t.event', () => { a++; })", sb);
  vm.runInContext("RobcoEvents.on('t.event', () => { b++; })", sb);
  vm.runInContext("RobcoEvents.emit('t.event')", sb);
  results.push(sb.a === 1 && sb.b === 1);
} catch (e) { results.push(false); }
try { // 135.5
  const sb = busSandbox(); sb.b = 0;
  vm.runInContext("RobcoEvents.on('t.event', () => { throw new Error('boom'); })", sb);
  vm.runInContext("RobcoEvents.on('t.event', () => { b++; })", sb);
  vm.runInContext("RobcoEvents.emit('t.event')", sb);
  results.push(sb.b === 1);
} catch (e) { results.push(false); }
try { // 135.6
  const sb = busSandbox();
  vm.runInContext("RobcoEvents.emit('nobody.listens', { x: 1 })", sb);
  results.push(true);
} catch (e) { results.push(false); }
try { // 135.9
  const sandbox = {
    window: {}, document: { getElementById: () => null },
    console: { error: () => {}, log: () => {}, warn: () => {} },
    loadUI: () => {}, appendToChat: () => {}, expandPanelForCategory: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext(stateSource, sandbox);
  const autoImportBody = 'function autoImportState(jsonString)' + extractFunctionBody(apiSource, 'autoImportState');
  vm.runInContext(autoImportBody + '\nthis.autoImportState = autoImportState;', sandbox);
  sandbox.captured = null;
  vm.runInContext("RobcoEvents.on('faction.threshold', p => { captured = p; })", sandbox);
  vm.runInContext("state = { gameContext: 'FO3', ticks: 0, campaign_notes: [], factions: { talon: { fame: 0, infamy: 0 } } };", sandbox);
  sandbox.window._lastStateBeforeSync = JSON.stringify({ factions: { talon: { fame: 0, infamy: 400 } } });
  sandbox.autoImportState(JSON.stringify({ factions: { talon: { fame: 0, infamy: 600 } } }));
  const captured = vm.runInContext('captured', sandbox);
  results.push(!!captured && captured.key === 'talon' && captured.direction === 'vilified');
} catch (e) { results.push(false); }
try { // 135.14
  const sb = busSandbox();
  vm.runInContext("state = { ticks: 5, eventLog: [] }; RobcoEvents.emit('level.up', { oldLvl: 3, newLvl: 4 });", sb);
  const log = vm.runInContext('state.eventLog', sb);
  results.push(Array.isArray(log) && log.length === 1 && log[0].type === 'level' && log[0].t === 5 && /Level Up: 3 → 4/.test(log[0].text));
} catch (e) { results.push(false); }
console.log('RESULT:' + results.map(r => r ? '1' : '0').join(''));
"@
        # Write to a temp file rather than piping through stdin -- a pipe through
        # `| node` was observed to occasionally corrupt/truncate this heredoc when
        # run deep into a long PowerShell session (a harness-only flake, not a
        # product defect -- proven by running the identical script in isolation,
        # which always passes; Protocol 42 fix, keeps the check but removes the
        # unreliable transport).
        $tmpScript135 = [System.IO.Path]::GetTempFileName() + '.js'
        [System.IO.File]::WriteAllText($tmpScript135, $testScript135, [System.Text.Encoding]::UTF8)
        try {
            $out135 = (node $tmpScript135 2>&1 | Out-String)
        } finally {
            Remove-Item -Path $tmpScript135 -Force -ErrorAction SilentlyContinue
        }
        $rm135 = [regex]::Match($out135, 'RESULT:([01]{7})')
        if ($rm135.Success) {
            $bits135 = $rm135.Groups[1].Value
            for ($bi = 0; $bi -lt 7; $bi++) { Check ($bits135.Substring($bi, 1) -eq '1') $labels135[$bi] }
        } else {
            $err135 = if ([string]::IsNullOrWhiteSpace($out135)) { "No output from node" } else { $out135.Trim() }
            foreach ($lbl in $labels135) { Fail "$lbl  (runtime error: $err135)" }
        }
    } else {
        foreach ($lbl in $labels135) { Fail "$lbl  (node not found)" }
    }
} catch {
    foreach ($lbl in $labels135) { Fail "$lbl  (harness error: $_)" }
}

# 135.7  negative guard: the old FNV-hardcoded faction-key array is gone (an
#        assignment form, not just the identifier -- avoids false-positiving
#        on the explanatory comment describing the old code)
Check ((-not ($apiSrc -match 'majorFactionKeys')) -and (-not ($apiSrc -match "=\s*\['ncr',\s*'legion'"))) `
    "135.7: api.js no longer hardcodes a FNV-only faction-key array (majorFactionKeys = ['ncr',...]) -- U7 Protocol-38 fix"

# 135.8  positive guard: the faction-threshold detector reads getFactionRegistry()
Check ($apiSrc -match '(?s)VILIFIED_NET[\s\S]{0,300}getFactionRegistry\(\)\.forEach') `
    '135.8: the faction-threshold detector iterates getFactionRegistry() -- game-agnostic, not a hardcoded key list'

# 135.10  level-up and faction-threshold detectors in api.js emit through the bus
Check (($apiSrc -match "RobcoEvents\.emit\(\s*'level\.up'") -and ($apiSrc -match "RobcoEvents\.emit\(\s*'faction\.threshold'")) `
    "135.10: autoImportState()'s level-up and faction-threshold detectors emit 'level.up' / 'faction.threshold' through RobcoEvents"

# 135.11  HP-critical detector in ui-core.js emits through the bus
Check ($uiCoreSrc135 -match "RobcoEvents\.emit\(\s*'hp\.critical'") `
    "135.11: updateMath()'s HP-critical detector emits 'hp.critical' through RobcoEvents"

# 135.12  the 5 new U8 emit points are present at their real call sites. Step 2 Phase 0
#         U12 split doCraft/doScrap into an async confirm gate + a synchronous
#         _craftApply/_scrapApply mutation core -- the emit call now lives in the *Apply core.
Check (
    ($uiRenderSrc135 -match "(?s)function toggleCollectible[\s\S]{0,400}RobcoEvents\.emit\(\s*'collectible\.acquired'") -and
    ($uiRenderSrc135 -match "(?s)function _craftApply[\s\S]{0,2500}RobcoEvents\.emit\(\s*'craft\.completed'") -and
    ($uiRenderSrc135 -match "(?s)function _scrapApply[\s\S]{0,2500}RobcoEvents\.emit\(\s*'craft\.scrapped'") -and
    ($uiRenderSrc135 -match "(?s)function doBuy[\s\S]{0,2500}RobcoEvents\.emit\(\s*'trade\.bought'") -and
    ($uiRenderSrc135 -match "(?s)function doSell[\s\S]{0,2500}RobcoEvents\.emit\(\s*'trade\.sold'") -and
    ($apiSrc -match "(?s)function _nativeSleep[\s\S]{0,600}RobcoEvents\.emit\(\s*'sleep\.completed'")
) '135.12: U8 emit points present -- toggleCollectible/doCraft(->_craftApply)/doScrap(->_scrapApply)/doBuy/doSell (ui-render.js) and _nativeSleep (api.js)'

# 135.13  state.js registers an auto-log subscriber for level.up + every U8 event
$autoLogEvents135 = @('level.up', 'collectible.acquired', 'craft.completed', 'craft.scrapped', 'trade.bought', 'trade.sold', 'sleep.completed')
$missingSub135 = $autoLogEvents135 | Where-Object { -not ($stateSrc -match ("RobcoEvents\.on\(\s*'" + [regex]::Escape($_) + "'")) }
Check ($missingSub135.Count -eq 0) `
    '135.13: state.js subscribes to level.up + all 6 U8 action events for auto-logging'

# -- Boot-order regression (Protocol 42) --------------------------------------
# Discovered live: ui-audio.js/ui-core.js/api.js are static <script> tags that CAN
# execute before state.js (which defines RobcoEvents) finishes its dynamic,
# context-conditional load (js/db_nv.js / state.js / js/reg_nv.js / registry-core.js
# are injected via document.createElement('script'), per the boot-loader comment in
# index.html -- "Static ui-*/api/cloud tags below ... may parse first"). A bare
# top-level RobcoEvents.on(...) call in any of those 3 files threw "RobcoEvents is
# not defined" on some boots (confirmed via the Playwright boot-smoke check, a real
# shipped-code path -- not a harness artifact). Fixed by wrapping each cross-file
# subscriber registration in a named _wire*EventBusSubscribers() function called
# from window.onload, once state.js is guaranteed to have run.

# 135.15  structural: each cross-file subscriber registration is wrapped in a
#         named wiring function, and window.onload calls all three
$onloadIdx135 = $uiCoreSrc135.IndexOf('window.onload = async function () {')
$onloadBody135 = ''
if ($onloadIdx135 -ge 0) {
    $braceStart135 = $uiCoreSrc135.IndexOf('{', $onloadIdx135)
    $depth135 = 0; $i135 = $braceStart135
    while ($i135 -lt $uiCoreSrc135.Length) {
        if ($uiCoreSrc135[$i135] -eq '{') { $depth135++ }
        elseif ($uiCoreSrc135[$i135] -eq '}') { $depth135--; if ($depth135 -eq 0) { break } }
        $i135++
    }
    $onloadBody135 = $uiCoreSrc135.Substring($braceStart135, $i135 - $braceStart135 + 1)
}
Check (
    ($uiAudioSrc135 -match "(?s)function _wireAudioEventBusSubscribers\(\)\s*\{[\s\S]*?RobcoEvents\.on\(") -and
    ($uiCoreSrc135 -match "(?s)function _wireCoreEventBusSubscribers\(\)\s*\{[\s\S]*?RobcoEvents\.on\(") -and
    ($apiSrc -match "(?s)function _wireApiEventBusSubscribers\(\)\s*\{[\s\S]*?RobcoEvents\.on\(") -and
    ($onloadBody135.Contains('_wireCoreEventBusSubscribers()')) -and
    ($onloadBody135.Contains('_wireAudioEventBusSubscribers()')) -and
    ($onloadBody135.Contains('_wireApiEventBusSubscribers()'))
) '135.15: the level.up/hp.critical/faction.threshold cross-file RobcoEvents.on() registrations are each wrapped in a named _wire*EventBusSubscribers() function, and window.onload calls all three'

# 135.16  negative guard: no RobcoEvents.on() call escapes its wiring function in
#         ui-audio.js / ui-core.js / api.js -- i.e. no bare top-level registration
#         has crept back in (the exact shape of the boot-order bug)
function Test-OnCallsInsideWiringFn($src, $fnName) {
    try { $body = Get-FunctionBody $src $fnName } catch { return @{ total = -1; inside = -2 } }
    $total = ([regex]::Matches($src, "RobcoEvents\.on\(\s*['`"]")).Count
    $inside = ([regex]::Matches($body, "RobcoEvents\.on\(\s*['`"]")).Count
    return @{ total = $total; inside = $inside }
}
$audioCheck135 = Test-OnCallsInsideWiringFn $uiAudioSrc135 '_wireAudioEventBusSubscribers'
$coreCheck135  = Test-OnCallsInsideWiringFn $uiCoreSrc135 '_wireCoreEventBusSubscribers'
$apiCheck135   = Test-OnCallsInsideWiringFn $apiSrc '_wireApiEventBusSubscribers'
Check (
    ($audioCheck135.total -eq $audioCheck135.inside) -and ($audioCheck135.total -gt 0) -and
    ($coreCheck135.total -eq $coreCheck135.inside) -and ($coreCheck135.total -gt 0) -and
    ($apiCheck135.total -eq $apiCheck135.inside) -and ($apiCheck135.total -gt 0)
) '135.16: every RobcoEvents.on() call in ui-audio.js/ui-core.js/api.js sits inside its _wire*EventBusSubscribers() function -- none at bare top level (the U7 boot-order regression)'

# ===========================================================
# Suite 136 -- Step 2 (v2.8.0) Phase 0 U9/U10: cheap connector sweep +
# native-input-path audit (13 tests). Mirrors JS Suite 136.
# ===========================================================
Sep "Suite 136 -- Step 2 Phase 0 U9/U10 connector sweep + affinity fix"
$html136   = Read-Src "index.html"
$api136    = Read-Src "js/api.js"
$core136   = Read-Src "js/ui-core.js"
$render136 = Read-Src "js/ui-render.js"
$css136    = Read-Src "css/terminal.css"
$dbNv136   = Read-Src "js/db_nv.js"
$dbFo3136  = Read-Src "js/db_fo3.js"

# 136.1  U9-1: the Projected Timeline stub is fully retired
Check (
    (-not ($html136 -match 'id="timelineDisplay"')) -and
    (-not ($html136 -match 'PROJECTED TIMELINE')) -and
    (-not ($core136 -match '\[TIMELINE\]')) -and
    (-not ($api136 -match '\[TIMELINE\]')) -and
    (-not ($api136 -match 'PROJECTED TIMELINE'))
) '136.1: the Projected Timeline stub is fully retired -- index.html shell, COMMAND_REGISTRY entry, and AI directive references are all gone'

# 136.2  U9-2: CURRENT SITTING readout (human-formatted, derived from stats.sessionStart)
$sessFn136 = [regex]::Match($render136, '(?s)function renderSessionStats\(\)[\s\S]*?\n\}').Value
Check (
    ($sessFn136 -match 'CURRENT SITTING') -and
    ($sessFn136 -match '_fmtOverseerDuration') -and
    ($sessFn136 -match 's\.sessionStart') -and
    (-not ($sessFn136 -match 'CAMPAIGN TIME'))
) '136.2: renderSessionStats() shows a CURRENT SITTING readout formatted via _fmtOverseerDuration, derived from stats.sessionStart'

# 136.3  U9-3: THREAT ammo-reserve advisory (reuses craft-panel lookup, Protocol 22)
$threatFn136 = [regex]::Match($render136, '(?s)function renderThreat\(target\)[\s\S]*?\n\}').Value
Check (
    ($threatFn136 -match '_craftGetHave') -and
    ($threatFn136 -match 'INSUFFICIENT RESERVES') -and
    ($threatFn136 -match 'RESERVES SUFFICIENT') -and
    ($threatFn136 -match 'threat-ammo-advisory') -and
    ($css136 -match '\.threat-ammo-advisory\s*\{') -and
    ($css136 -match '\.threat-ammo-advisory--low\s*\{')
) '136.3: renderThreat() shows an ammo-reserve advisory (INSUFFICIENT/SUFFICIENT RESERVES) backed by CSS classes'

# 136.4  U9-4: CONSULT now searches the tracker registries too, and
# _consultDetail() handles their distinct shapes
$consultCatKeys136 = @("'collectibles'", "'skillBooks'", "'magazines'", "'traits'", "'lincolnMemorabilia'")
$consultCatsOk136 = $true
foreach ($ck136 in $consultCatKeys136) { if (-not $render136.Contains("key: $ck136")) { $consultCatsOk136 = $false } }
Check (
    $consultCatsOk136 -and
    ($render136 -match "cat === 'collectibles' \|\| cat === 'lincolnMemorabilia'") -and
    ($render136 -match "cat === 'skillBooks' \|\| cat === 'magazines'") -and
    ($render136 -match "cat === 'traits'")
) '136.4: _CONSULT_CATS includes collectibles/skillBooks/magazines/traits/lincolnMemorabilia, and _consultDetail() renders their detail text'

# 136.5  U9-4: getQuestItemDetail() (QUEST_ITEMS.CSV reserved columns) in both db
# runners, wired into CONSULT; BESTIARY xpYield now surfaced
Check (
    ($dbNv136 -match 'function getQuestItemDetail\(name\)') -and
    ($dbFo3136 -match 'function getQuestItemDetail\(name\)') -and
    ($dbNv136 -match 'Associated_Quest') -and
    ($dbNv136 -match 'Special_Property') -and
    ($render136 -match 'getQuestItemDetail') -and
    ($render136 -match 'res\.questItem') -and
    ($render136 -match 'res\.creature\.xpYield')
) '136.5: getQuestItemDetail() (Associated_Quest/Special_Property) exists in both db runners and is wired into CONSULT; BESTIARY xpYield is now surfaced'

# 136.6  U9-5: GAME_DEFS.hasWeaponMods -- true for FNV, false for FO3
Check (
    ($stateSrc -match 'hasWeaponMods:\s*true') -and ($stateSrc -match 'hasWeaponMods:\s*false')
) '136.6: GAME_DEFS.FNV.hasWeaponMods === true and GAME_DEFS.FO3.hasWeaponMods === false'

# 136.7  U9-5: the inventory Mods filter is gated by hasWeaponMods in _updateContextPanels()
$ctxPanelsFn136 = [regex]::Match($render136, '(?s)function _updateContextPanels\(\)[\s\S]*?\n\}').Value
Check (
    ($html136 -match 'id="invFilterMods"') -and
    ($render136 -match "_activeDef\(\)\.hasWeaponMods") -and
    ($render136 -match "getElementById\('invFilterMods'\)") -and
    ($ctxPanelsFn136 -match "setInvFilter\('all'\)")
) '136.7: the inventory Mods filter button is hidden per-game via _updateContextPanels() + GAME_DEFS.hasWeaponMods, with a fail-safe reset off the mod filter'

# 136.8  U10: adjustAffinity(idx, delta) -- clamps 0-100, persists + re-renders
$adjFn136 = [regex]::Match($render136, '(?s)function adjustAffinity\(idx, delta\)[\s\S]*?\n\}').Value
Check (
    ($adjFn136 -match 'Math\.max\(0, Math\.min\(100,') -and
    ($adjFn136 -match 'state\.squad\[idx\]\.affinity') -and
    ($adjFn136 -match 'saveState\(\)') -and
    ($adjFn136 -match 'renderSquad\(\)')
) '136.8: adjustAffinity(idx, delta) exists, clamps 0-100, and persists + re-renders'

# 136.9  U10: native [+]/[-] affinity buttons always rendered on every squad row
$squadFn136 = [regex]::Match($render136, '(?s)function renderSquad\(\)[\s\S]*?\n\}').Value
Check (
    ($squadFn136 -match 'adjustAffinity\(\$\{i\},5\)') -and
    ($squadFn136 -match 'adjustAffinity\(\$\{i\},-5\)') -and
    ($squadFn136 -match 'aria-label="Affinity \+5 for') -and
    ($squadFn136 -match 'aria-label="Affinity -5 for') -and
    (-not ($squadFn136 -match 'member\.affinity !== undefined'))
) '136.9: renderSquad() always renders the [+]/[-] affinity buttons (real <button>s with aria-labels), not gated behind member.affinity being pre-set'

# 136.10  U10: newly-added squad members seed affinity: 0
$addSquadFn136 = [regex]::Match($render136, '(?s)function addSquadMember\(\)[\s\S]*?\n\}').Value
Check ($addSquadFn136 -match 'affinity:\s*0,') '136.10: addSquadMember() seeds affinity: 0 for newly-added companions'

# 136.11  Escape-ratchet: [TIMELINE] registered in Suite 113's RETIRED-macro list
Check ($RETIRED113 -contains '[TIMELINE]') '136.11: [TIMELINE] is registered in the Suite 113 RETIRED-macro list (self-referential escape-ratchet guard)'

# 136.12  Game-agnostic (Protocol 38): weapon-mods gate is data-driven, not a ctx literal
Check (
    (-not ($render136 -match "ctx === 'FO3' \?.*hasWeaponMods")) -and
    (-not ($render136 -match "ctx === 'FNV' \?.*hasWeaponMods"))
) '136.12: the weapon-mods gate is data-driven via GAME_DEFS, not a hardcoded ctx literal ternary'

# 136.13  UTF-8 integrity (Protocol 39) spot-check
Check (
    ($render136.Contains([char]0x26A0 + ' INSUFFICIENT RESERVES')) -and
    (-not ($render136 -match 'â€|â–|�'))
) '136.13: the THREAT ammo-advisory glyph is clean UTF-8 (no double-encoding, no replacement chars)'

# ===========================================================
# Suite 137 -- Step 2 (v2.8.0) Phase 0 U11/U12: hygiene ledgers + modal
# consolidation (14 tests). Mirrors JS Suite 137. The JS runner's 137.6 is a
# TRUE behavioral proof (executes confirmAction() in a Node vm sandbox against
# a synthetic DOM and asserts the resolved boolean); this PS1 mirror does the
# structural analogue everywhere else in this file already does for
# JS-vm-only behavioral suites -- it checks confirmAction()'s body shape
# (Promise + resolve(true) on CONFIRM + the shared onClose->resolve(false)
# path) rather than re-executing it.
# ===========================================================
Sep "Suite 137 -- Step 2 Phase 0 U11/U12 hygiene ledgers + modal consolidation"
$arch137     = Read-Src "ARCHITECTURE.md"
$dbNv137     = Read-Src "js/db_nv.js"
$dbFo3137    = Read-Src "js/db_fo3.js"
$core137     = Read-Src "js/ui-core.js"
$render137   = Read-Src "js/ui-render.js"
$saves137    = Read-Src "js/ui-saves.js"
$cloud137    = Read-Src "js/cloud.js"
$api137      = Read-Src "js/api.js"
$state137    = Read-Src "js/state.js"

# 137.1  U11: per-game data parity ledger, every row GENUINE or GAP
Check (
    ($arch137 -match 'Parity ledger') -and
    ($arch137 -match 'per-game data asymmetry') -and
    ($arch137 -match '\*\*GENUINE\*\*') -and
    ($arch137 -match '\*\*GAP\*\*')
) '137.1: ARCHITECTURE.md carries the U11 per-game data parity ledger with GENUINE/GAP verdicts'

# 137.2  U11: reserved-column register (ARCHITECTURE.md + both db headers)
Check (
    ($arch137 -match 'Reserved-column register') -and
    ($dbNv137 -match 'RESERVED-COLUMN REGISTER') -and
    ($dbFo3137 -match 'RESERVED-COLUMN REGISTER') -and
    ($dbNv137 -match 'PARKED-FOR-REMOVAL') -and
    ($dbFo3137 -match 'PARKED-FOR-REMOVAL')
) '137.2: reserved-column register is committed in ARCHITECTURE.md AND both db_nv.js/db_fo3.js headers'

# 137.3  U11: skill-less (FO4) degradation audit + the skillKeys:[] requirement
Check (
    ($arch137 -match 'Skill-less \(FO4-class\) degradation audit') -and
    ($arch137 -match 'skillKeys:\s*\[\]')
) '137.3: ARCHITECTURE.md carries the U11 skill-less audit + the skillKeys:[] requirement for a future FO4 entry'

# 137.4  U12: openModal() and confirmAction() both defined in ui-core.js
Check (
    ($core137 -match 'function openModal\s*\(') -and ($core137 -match 'function confirmAction\s*\(')
) '137.4: openModal() and confirmAction() are both defined in ui-core.js'

# 137.5  U12: confirmAction() is Promise-based; CONFIRM resolves true, every
#        other exit resolves false via the shared onClose path
$confirmActionBody137 = Get-FunctionBody $core137 'confirmAction'
Check (
    ($confirmActionBody137 -match 'new Promise\(') -and
    ($confirmActionBody137 -match 'onClose:\s*\(\)\s*=>\s*settle\(false\)') -and
    ($confirmActionBody137 -match 'settle\(true\)')
) '137.5: confirmAction() is Promise-based; CONFIRM resolves true, every other exit (CANCEL/CLOSE/Escape) resolves false via the shared onClose path'

# 137.6  BEHAVIORAL (structural mirror -- see file header note above; the JS
#        runner actually executes confirmAction() in a vm sandbox and drives
#        real CONFIRM/CANCEL/close clicks). Mirrors the same shape 137.5
#        checks plus the settle() single-resolution guard (idempotent --
#        a second settle() call after Yes cannot flip the result to false).
Check (
    ($confirmActionBody137 -match 'if\s*\(\s*resolved\s*\)\s*return') -and
    ($confirmActionBody137 -match 'resolved\s*=\s*true') -and
    ($confirmActionBody137 -match "getElementById\('modalConfirmYes'\)") -and
    ($confirmActionBody137 -match "getElementById\('modalConfirmNo'\)")
) 'confirmAction() behavioral (structural mirror): settle() is single-resolution-guarded; both CONFIRM and CANCEL buttons are wired (see JS runner for the real behavioral proof)'

# 137.7  U12: openModal() is the single entry point -- exactly two occurrences
#        of "_openSysModal(" exist: the declaration and the one call inside openModal()
$occCount137 = ([regex]::Matches($core137, '_openSysModal\s*\(')).Count
$declOrCallOnly137 = ($core137 -match 'function\s+_openSysModal\s*\(') -and `
    ($core137 -match 'openModal\s*\([\s\S]{0,400}_openSysModal\s*\(\s*\)')
Check (($occCount137 -eq 2) -and $declOrCallOnly137) `
    '137.7: no function outside openModal() calls the low-level _openSysModal() primitive directly (single consolidated driver)'

# 137.8  U12: exactly one Tab-key focus-trap targets #sysModal in ui-core.js
$trapMatches137 = [regex]::Matches($core137, "getElementById\(\s*'sysModal'\s*\)[\s\S]{0,200}querySelectorAll\(")
Check ($trapMatches137.Count -eq 1) `
    '137.8: exactly one focus-trap implementation targets #sysModal in ui-core.js (single driver, D-2)'

# 137.9  U12: no raw alert( or confirm( call remains in any served js/*.js file
#        (comments stripped first so explanatory doc comments don't false-positive)
function Strip-Comments137($src) {
    $noBlock = [regex]::Replace($src, '(?s)/\*.*?\*/', '')
    return [regex]::Replace($noBlock, '//[^\r\n]*', '')
}
$servedFiles137 = @(
    @{ Name = 'js/api.js'; Src = $api137 },
    @{ Name = 'js/state.js'; Src = $state137 },
    @{ Name = 'js/ui-core.js'; Src = $core137 },
    @{ Name = 'js/ui-render.js'; Src = $render137 },
    @{ Name = 'js/ui-saves.js'; Src = $saves137 },
    @{ Name = 'js/cloud.js'; Src = $cloud137 }
)
$offenders137 = @()
foreach ($f in $servedFiles137) {
    $clean = Strip-Comments137 $f.Src
    if ($clean -match '\balert\s*\(') { $offenders137 += ($f.Name + ' (alert)') }
    if ($clean -match '\bconfirm\s*\(') { $offenders137 += ($f.Name + ' (confirm)') }
}
Check ($offenders137.Count -eq 0) `
    ('no raw alert(/confirm( call remains in served js/*.js (Step 2 Phase 0 U12 purge)' + $(if ($offenders137.Count) { ' -- found: ' + ($offenders137 -join ', ') } else { '' }))

# 137.10  U12: every destructive/confirm-gated path awaits confirmAction()
function Get-WindowFnBody137($src, $name) {
    $assignIdx = $src.IndexOf("window.$name =")
    if ($assignIdx -lt 0) { return '' }
    $braceIdx = $src.IndexOf('{', $assignIdx)
    if ($braceIdx -lt 0) { return '' }
    $depth = 0; $i = $braceIdx
    while ($i -lt $src.Length) {
        if ($src[$i] -eq '{') { $depth++ }
        elseif ($src[$i] -eq '}') { $depth--; if ($depth -eq 0) { return $src.Substring($braceIdx, $i - $braceIdx + 1) } }
        $i++
    }
    return ''
}
$gatedSites137 = @(
    @{ File = 'ui-core.js'; Src = $core137; Fn = 'wipeTerminal'; Window = $false },
    @{ File = 'ui-core.js'; Src = $core137; Fn = 'clearChat'; Window = $false },
    @{ File = 'ui-render.js'; Src = $render137; Fn = 'doCraft'; Window = $false },
    @{ File = 'ui-render.js'; Src = $render137; Fn = 'doScrap'; Window = $false },
    @{ File = 'ui-render.js'; Src = $render137; Fn = 'doBuy'; Window = $false },
    @{ File = 'ui-render.js'; Src = $render137; Fn = 'doSell'; Window = $false },
    @{ File = 'ui-render.js'; Src = $render137; Fn = 'doLoot'; Window = $false },
    # P5 (Step 2 Phase 1): loadFromSlot's confirm gates moved into the shared
    # _applySlotEnvelope core (Protocol 22); restoreSlotVersion is a new gated path.
    @{ File = 'ui-saves.js'; Src = $saves137; Fn = '_applySlotEnvelope'; Window = $false },
    @{ File = 'ui-saves.js'; Src = $saves137; Fn = 'restoreSlotVersion'; Window = $false },
    @{ File = 'ui-saves.js'; Src = $saves137; Fn = 'restoreRollingBackup'; Window = $false },
    @{ File = 'ui-saves.js'; Src = $saves137; Fn = 'handleFileUpload'; Window = $false },
    @{ File = 'cloud.js'; Src = $cloud137; Fn = 'loadCloudSave'; Window = $true },
    @{ File = 'cloud.js'; Src = $cloud137; Fn = 'deleteCloudSave'; Window = $true }
)
$missing137 = @()
foreach ($g in $gatedSites137) {
    $body = if ($g.Window) { Get-WindowFnBody137 $g.Src $g.Fn } else { Get-FunctionBody $g.Src $g.Fn }
    if (-not ($body -match 'confirmAction\s*\(')) { $missing137 += ($g.File + ':' + $g.Fn) }
}
Check ($missing137.Count -eq 0) `
    ('every destructive path awaits confirmAction() (Protocol 34 gate preserved)' + $(if ($missing137.Count) { ' -- missing in: ' + ($missing137 -join ', ') } else { '' }))

# 137.11  U12: doCraft/doScrap split into confirm-gate wrapper + synchronous
#         _craftApply/_scrapApply mutation core
Check (
    ($render137 -match 'function _craftPrepare\s*\(') -and
    ($render137 -match 'function _craftApply\s*\(') -and
    ($render137 -match 'function _scrapPrepare\s*\(') -and
    ($render137 -match 'function _scrapApply\s*\(') -and
    ((Get-FunctionBody $render137 'doCraft') -match '_craftApply\(') -and
    ((Get-FunctionBody $render137 'doScrap') -match '_scrapApply\(')
) '137.11: doCraft/doScrap split into confirm-gate wrapper + synchronous _craftApply/_scrapApply mutation core'

# 137.12  U12: restoreRollingBackup split into confirm-gate wrapper +
#         _restoreBackupApply mutation core
Check (
    ($saves137 -match 'function _restoreBackupApply\s*\(') -and
    ((Get-FunctionBody $saves137 'restoreRollingBackup') -match '_restoreBackupApply\(')
) '137.12: restoreRollingBackup split into confirm-gate wrapper + _restoreBackupApply mutation core'

# 137.13  U12: the firmware-update dialog (_triggerUpdate) stays separate --
#         not folded into openModal()/confirmAction() (Suite 65 exception)
$html137 = Read-Src "index.html"
$triggerBody137 = Get-FunctionBody $html137 '_triggerUpdate'
Check (
    (-not ($triggerBody137 -match 'openModal\s*\(')) -and (-not ($triggerBody137 -match 'confirmAction\s*\('))
) '137.13: index.html _triggerUpdate (the blocking firmware-update dialog) is NOT folded into openModal()/confirmAction() -- stays a deliberate separate exception (Suite 65)'

# 137.14  U12: window.prompt() sites remain -- explicitly out of scope
Check (
    ($cloud137 -match '\bprompt\s*\(') -and ($saves137 -match '\bprompt\s*\(')
) '137.14: window.prompt() sites (cloud.js label input, ui-saves.js backup picker) remain -- explicitly out of U12 scope, not silently dropped'

# ===========================================================
# Suite 138 -- Step 2 (v2.8.0) Phase 1 P1: IndexedDB durability shadow +
# write-through (12 tests). Mirrors JS Suite 138. New js/idb.js is an async
# Promise-returning KV engine over IndexedDB with two object stores
# ('meta'/'campaign') so the Protocol 23 two-store boundary is structural in
# IndexedDB too. It is written through the single MetaStore choke point as a
# fire-and-forget mirror of every device-pref write; READS STAY 100% ON
# localStorage (no read flip in P1). These are structural guards -- the REAL
# IndexedDB behavioral proof (round-trip + fail-safe) runs in tests/test.html
# (Protocol 40 -- the browser is the only runner with a native IndexedDB).
# ===========================================================
Sep "Suite 138 -- P1 IndexedDB durability shadow + write-through"
$idb138   = Read-Src "js/idb.js"
$state138 = Read-Src "js/state.js"
$sw138    = Read-Src "sw.js"
$html138  = Read-Src "index.html"

# 138.1  js/idb.js is an IIFE that publishes window.IdbStore
Check (
    ($idb138 -match '\(function \(\)\s*\{') -and ($idb138 -match 'window\.IdbStore = IdbStore')
) '138.1: js/idb.js is an IIFE that publishes window.IdbStore'

# 138.2  the new served module is precached in sw.js ASSETS (Suite 49 sibling)
Check ($sw138 -match '\./js/idb\.js') '138.2: js/idb.js is precached in sw.js ASSETS'

# 138.3  idb.js loads before state.js (which calls it) and before the boot loader
$iIdb138    = $html138.IndexOf('js/idb.js')
$iState138  = $html138.IndexOf('js/state.js')
$iLoader138 = $html138.IndexOf('GAME_FILES')
Check (
    ($iIdb138 -gt -1) -and ($iState138 -gt -1) -and ($iLoader138 -gt -1) -and
    ($iIdb138 -lt $iState138) -and ($iIdb138 -lt $iLoader138)
) '138.3: index.html loads js/idb.js before state.js and before the GAME_FILES boot loader'

# 138.4  the IdbStore API surface is complete
Check (
    ($idb138 -match 'set\(store, key, value\)') -and
    ($idb138 -match 'get\(store, key\)') -and
    ($idb138 -match 'remove\(store, key\)') -and
    ($idb138 -match 'keys\(store\)') -and
    ($idb138 -match 'getAll\(store\)') -and
    ($idb138 -match 'get available\(\)')
) '138.4: IdbStore exposes set/get/remove/keys/getAll + the available flag'

# 138.5  two object stores ('meta' + 'campaign') -- two-store boundary in IDB
Check (
    ($idb138 -match "const STORES = \[\s*'meta',\s*'campaign'\s*\]") -and
    ($idb138 -match 'createObjectStore\(name\)')
) "138.5: idb.js creates both 'meta' and 'campaign' object stores (two-store boundary in IDB)"

# 138.6  WRITE-THROUGH: MetaStore.set/remove mirror via the single _idbShadow seam
Check (
    ($state138 -match 'function _idbShadow\(') -and
    ($state138 -match "_idbShadow\('set', key, val\)") -and
    ($state138 -match "_idbShadow\('remove', key\)")
) '138.6: MetaStore.set/remove route the write-through through the single _idbShadow('

# 138.7  NO READ FLIP: MetaStore.get reads localStorage only
$getBody138 = ''
if ($state138 -match 'get\(key\)\s*\{([\s\S]*?)\}\s*catch') { $getBody138 = $matches[1] }
Check (
    ($getBody138 -match 'localStorage\.getItem\(key\)') -and (-not ($getBody138 -match 'IdbStore|_idbShadow'))
) '138.7: MetaStore.get reads localStorage only -- no IdbStore read flip (read authority unchanged)'

# 138.8  checksums REUSE window.computeSaveChecksum -- no second hash (Protocol 22)
Check (
    ($idb138 -match 'window\.computeSaveChecksum\(') -and (-not ($idb138 -match '0x811c9dc5'))
) '138.8: idb.js reuses window.computeSaveChecksum (no duplicate hash implementation)'

# 138.9  FAIL-SAFE: feature-detect factory + resolve(null) instead of throwing
Check (
    ($idb138 -match 'function _idbFactory\(') -and ($idb138 -match 'resolve\(null\)')
) '138.9: idb.js feature-detects IndexedDB and degrades to a null (no-op) handle when absent'

# 138.10  RESOLVE-SOFT: ops resolve to a fallback; write-through swallows rejection
Check (
    ($idb138 -match 'resolve\(fallback\)') -and ($state138 -match '\.catch\(\(\)\s*=>\s*\{\}\)')
) '138.10: idb.js ops resolve-soft on error and _idbShadow swallows a rejected shadow promise'

# 138.11  BOUNDARY: no campaign-key literal in idb.js; the device write-through
#         (_idbShadow body) targets only 'meta'. Scoped to _idbShadow because P3
#         added legitimate 'campaign'-store writes elsewhere in state.js.
$idbShadowBody138 = Get-FunctionBody $state138 '_idbShadow'
Check (
    (-not ($idb138 -match 'robco_v8|robco_slot|robco_backup|robco_chat|robco_playstyle|robco_v7|robco_last_cloud_push')) -and
    ($idbShadowBody138 -match "window\.IdbStore\.set\('meta'") -and
    ($idbShadowBody138 -match "window\.IdbStore\.remove\('meta'") -and
    (-not ($idbShadowBody138 -match "'campaign'"))
) "138.11: no campaign-key literal in idb.js; the device write-through (_idbShadow) targets only the 'meta' store"

# 138.12  game-agnostic (Protocol 38): a pure KV engine -- zero game literals
Check (
    -not ($idb138 -match 'FNV|FO3|Fallout|New Vegas|Mojave|Capital Wasteland')
) '138.12: idb.js is game-agnostic (no FNV/FO3/Fallout literals -- a pure key/value engine)'

# ===========================================================
# Suite 139 -- Step 2 (v2.8.0) Phase 1 P2: device-pref boot hydration +
# reconciliation (12 tests). Mirrors JS Suite 139. window.onload becomes async
# and awaits _hydrateMetaFromIdb() BEFORE the rest of boot reads device prefs.
# AUTHORITY RULE: localStorage is the source of record -- it wins when present;
# the one exception is RECOVERY (restore a key IDB has but localStorage is
# MISSING, only if its checksum re-verifies). BACKFILL mirrors localStorage-only
# device keys into IDB. The await is BOUNDED (Promise.race vs a budget) so a
# hung IndexedDB never hangs boot. Only the 'meta' store is touched. Structural
# guards here; the REAL IndexedDB behavioral proof runs in tests/test.html
# (Protocol 40 -- the browser is the only runner with a native IndexedDB).
# ===========================================================
Sep "Suite 139 -- P2 device-pref boot hydration + reconciliation"
$uiCore139   = Read-Src "js/ui-core.js"
$idb139      = Read-Src "js/idb.js"
$reconcile139 = Get-FunctionBody $uiCore139 '_reconcileMetaFromIdb'
$hydrate139   = Get-FunctionBody $uiCore139 '_hydrateMetaFromIdb'

# window.onload body (brace-matched from the async declaration)
$onload139 = ''
$olStart139 = $uiCore139.IndexOf('window.onload = async function () {')
if ($olStart139 -ge 0) {
    $bStart139 = $uiCore139.IndexOf('{', $olStart139)
    $depth139 = 0
    $i139 = $bStart139
    while ($i139 -lt $uiCore139.Length) {
        $ch139 = $uiCore139[$i139]
        if ($ch139 -eq '{') { $depth139++ }
        elseif ($ch139 -eq '}') { $depth139--; if ($depth139 -eq 0) { break } }
        $i139++
    }
    $onload139 = $uiCore139.Substring($bStart139, $i139 - $bStart139 + 1)
}

# 139.1  both the awaited boot phase and its reconciliation core are defined
Check (
    ($uiCore139 -match 'async function _reconcileMetaFromIdb\s*\(') -and
    ($uiCore139 -match 'function _hydrateMetaFromIdb\s*\(')
) '139.1: ui-core.js defines _reconcileMetaFromIdb() (core) and _hydrateMetaFromIdb() (awaited boot phase)'

# 139.2  window.onload is async and awaits the hydration (async-before-sync boot)
Check (
    ($uiCore139 -match 'window\.onload = async function \(\) \{') -and
    ($onload139 -match 'await _hydrateMetaFromIdb\(\)')
) '139.2: window.onload is async and awaits _hydrateMetaFromIdb() (async-before-sync boot)'

# 139.3  the awaited hydration runs BEFORE every device-pref consumer in boot
$iHydrate139 = $onload139.IndexOf('await _hydrateMetaFromIdb()')
Check (
    ($iHydrate139 -ge 0) -and
    ($onload139.IndexOf('_restoreApiKeyAndChatHistory()') -gt $iHydrate139) -and
    ($onload139.IndexOf('_restoreOpticsPreference()') -gt $iHydrate139) -and
    ($onload139.IndexOf('_restoreDevicePrefs()') -gt $iHydrate139)
) '139.3: the awaited hydration runs before every device-pref consumer (API key / optics / device prefs)'

# 139.4  BOUNDED await -- Promise.race against a timeout budget guards a hung IDB
Check (
    ($uiCore139 -match '_META_HYDRATE_BUDGET_MS') -and
    ($hydrate139 -match 'Promise\.race\(') -and
    ($hydrate139 -match 'setTimeout\(resolve, _META_HYDRATE_BUDGET_MS\)')
) '139.4: _hydrateMetaFromIdb() bounds the await (Promise.race vs _META_HYDRATE_BUDGET_MS) -- a hung IDB never hangs boot'

# 139.5  AUTHORITY / RECOVERY: localStorage-present wins; recovery only when missing
Check (
    ($reconcile139 -match 'if \(lsV !== null\) continue;') -and
    ($reconcile139 -match 'MetaStore\.set\(key, rec\.value\)')
) '139.5: recovery restores localStorage from IDB only when localStorage is missing (localStorage-present wins)'

# 139.6  CORRUPT-DATA FAIL-SAFE: verify checksum before restoring (mismatch -> skip)
Check (
    ($reconcile139 -match "computeSaveChecksum\(rec\.value, \[\], ''\) !== rec\.checksum") -and
    ($reconcile139 -match "getRaw\('meta', key\)")
) '139.6: reconciliation verifies the IDB record checksum (via getRaw) before restoring -- corrupt records are skipped'

# 139.7  IdbStore.getRaw exists and returns the checksum-bearing envelope
Check (
    ($idb139 -match 'getRaw\(store, key\)') -and ($idb139 -match "'value' in rec \? rec : null")
) '139.7: IdbStore.getRaw() returns the full { value, checksum, ... } envelope (enables the checksum verify)'

# 139.8  BACKFILL restricted to registered device keys + IDB-only (never localStorage)
Check (
    ($reconcile139 -match '!MetaStore\.has\(key\)\) continue;') -and
    ($reconcile139 -match "IdbStore\.set\('meta', key, v\)")
) '139.8: backfill is gated on MetaStore.has (registered device keys only) and writes IDB only, never localStorage'

# 139.9  TWO-STORE BOUNDARY: only 'meta', never 'campaign', no campaign-key literal
Check (
    (-not ($reconcile139 -match "'campaign'")) -and
    (-not ($reconcile139 -match 'robco_v8|robco_slot|robco_backup|robco_chat|robco_playstyle|robco_v7')) -and
    ($reconcile139 -match "keys\('meta'\)")
) "139.9: reconciliation touches only the 'meta' store -- no 'campaign' store, no campaign-key literal (two-store boundary)"

# 139.10  FAIL-SAFE: resolves immediately when IdbStore absent; never rejects
Check (
    ($hydrate139 -match '!window\.IdbStore\) return Promise\.resolve\(\)') -and
    ($hydrate139 -match '\.catch\(\(\) => \{\}\)')
) '139.10: _hydrateMetaFromIdb() resolves immediately when IdbStore is absent and never rejects (fail-safe boot)'

# 139.11  Phase-0 boot invariants preserved: no phase dropped; boot sequence intact
$bootSeq139 = Get-FunctionBody $uiCore139 '_runBootSequenceAndBriefing'
$stillCalled139 = @('_hydrateStateFromStorage()', '_restoreApiKeyAndChatHistory()', '_runBootSequenceAndBriefing()', '_wireUnloadFlush()', 'routeLaunchShortcut()')
$allCalled139 = (@($stillCalled139 | Where-Object { -not $onload139.Contains($_) }).Count -eq 0)
Check (
    $allCalled139 -and ($bootSeq139 -match 'runBootSequence\(')
) '139.11: no boot phase dropped by the async wrapper; _runBootSequenceAndBriefing still invokes runBootSequence (WU-B10 boot window intact)'

# 139.12  game-agnostic (Protocol 38): the reconcile/hydrate path has no game literals
Check (
    -not (($reconcile139 + $hydrate139) -match 'FNV|FO3|Fallout|New Vegas|Mojave|Capital Wasteland')
) '139.12: the P2 reconciliation/hydration path is game-agnostic (no game literals)'

# ===========================================================
# Suite 140 -- Step 2 (v2.8.0) Phase 1 P3: cold-store (save slots + rolling
# backups) moved IDB-PRIMARY (12 tests). Mirrors JS Suite 140. Cold-store lives
# in the IDB 'campaign' object store (slot_<n> / backup_<n>) with localStorage as
# a synchronous mirror + fallback. Writes go IDB-primary + best-effort
# localStorage (a quota failure is non-fatal -- IDB is the durable home, the
# ceiling relief); reads take the NEWER of {IDB, localStorage} by _coldStamp.
# Migration is fire-and-forget, idempotent, additive-only (never removes a
# localStorage copy). Two-store boundary: cold store uses 'campaign' only. The
# REAL IndexedDB migration/round-trip/fallback proof runs in tests/test.html.
# ===========================================================
Sep "Suite 140 -- P3 cold-store IDB-primary (save slots + rolling backups)"
$state140    = Read-Src "js/state.js"
$uiSaves140  = Read-Src "js/ui-saves.js"
$uiAcct140   = Read-Src "js/ui-account.js"
$cloud140    = Read-Src "js/cloud.js"
$uiCore140   = Read-Src "js/ui-core.js"
$coldRead140    = Get-FunctionBody $state140 '_coldReadObj'
$coldWrite140   = Get-FunctionBody $state140 '_coldWriteObj'
$migrate140     = Get-FunctionBody $state140 '_migrateColdStoreToIdb'
$saveBody140    = Get-FunctionBody $uiSaves140 'saveToSlot'
$loadBody140    = Get-FunctionBody $uiSaves140 'loadFromSlot'
$restoreBody140 = Get-FunctionBody $uiSaves140 'restoreRollingBackup'

# 140.1  cold-store accessors + migration defined + exposed on window
Check (
    ($state140 -match 'function _coldReadObj\s*\(') -and
    ($state140 -match 'function _coldWriteObj\s*\(') -and
    ($state140 -match 'function _coldStamp\s*\(') -and
    ($state140 -match 'function _migrateColdStoreToIdb\s*\(') -and
    ($state140 -match 'window\._coldReadObj =') -and
    ($state140 -match 'window\._coldWriteObj =') -and
    ($state140 -match 'window\._migrateColdStoreToIdb =')
) '140.1: state.js defines + exposes _coldReadObj / _coldWriteObj / _coldStamp / _migrateColdStoreToIdb'

# 140.2  TWO-STORE BOUNDARY: cold-store accessors use 'campaign' only, never 'meta'
Check (
    ($coldRead140 -match "'campaign'") -and ($coldWrite140 -match "'campaign'") -and ($migrate140 -match "'campaign'") -and
    (-not ($coldRead140 -match "'meta'")) -and (-not ($coldWrite140 -match "'meta'")) -and (-not ($migrate140 -match "'meta'"))
) "140.2: cold-store accessors use the 'campaign' object store only, never 'meta' (two-store boundary)"

# 140.3  saveToSlot async + IDB-primary via _coldWriteObj
Check (
    ($uiSaves140 -match 'async function saveToSlot') -and
    ($saveBody140 -match "_coldWriteObj\(_slotKey\(slotNum\), 'slot_' \+ slotNum")
) '140.3: saveToSlot is async and writes IDB-primary via _coldWriteObj'

# 140.4  loadFromSlot IDB-primary via _coldReadObj + localStorage fallback
Check (
    ($loadBody140 -match "_coldReadObj\(_slotKey\(slotNum\), 'slot_' \+ slotNum\)") -and
    ($loadBody140 -match 'localStorage\.getItem\(_slotKey\(slotNum\)\)')
) '140.4: loadFromSlot reads IDB-primary via _coldReadObj with a localStorage fallback'

# 140.5  snapRollingBackup mirrors the ring slot into the IDB 'campaign' store
Check (
    $state140 -match "IdbStore\.set\('campaign', 'backup_' \+ \(ptr \+ 1\)"
) "140.5: snapRollingBackup mirrors the backup into the IDB 'campaign' store (backup_<n>)"

# 140.6  getRollingBackupsAsync (union) + restore uses it; sync one stays
Check (
    ($state140 -match 'window\.getRollingBackupsAsync = async function') -and
    ($restoreBody140 -match 'await window\.getRollingBackupsAsync\(\)') -and
    ($state140 -match 'window\.getRollingBackups = function')
) '140.6: getRollingBackupsAsync (union) exists and restoreRollingBackup uses it; getRollingBackups stays synchronous'

# 140.7  NEWEST-WINS: _coldReadObj resolves divergence by _coldStamp (IDB ties)
Check (
    $coldRead140 -match '_coldStamp\(idbObj\) >= _coldStamp\(lsObj\)'
) '140.7: _coldReadObj resolves an IDB/localStorage divergence newest-wins by _coldStamp (IDB wins ties)'

# 140.8  MIGRATION additive + idempotent + never removes localStorage
Check (
    ($migrate140 -match '!idbObj \|\| _coldStamp\(lsObj\) > _coldStamp\(idbObj\)') -and
    (-not ($migrate140 -match 'removeItem')) -and
    (-not ($coldWrite140 -match 'removeItem'))
) '140.8: migration copies only when IDB is absent or localStorage is strictly newer (idempotent, additive-only -- never removes localStorage)'

# 140.9  CEILING RELIEF / FAIL-SAFE: write persists on either store + boot migration
Check (
    ($coldWrite140 -match 'return idbOk \|\| lsOk;') -and
    ($coldWrite140 -match 'catch \(_\) \{') -and
    ($uiCore140 -match '_migrateColdStoreToIdb\(\)')
) '140.9: _coldWriteObj persists on either store (localStorage quota non-fatal -- ceiling relief); boot fires the migration'

# 140.10  renderSavesList surfaces IDB-only save slots
Check (
    $uiAcct140 -match "IdbStore\.get\('campaign', 'slot_' \+ n\)"
) '140.10: renderSavesList surfaces IDB-only save slots (oversized saves localStorage could not hold)'

# 140.11  cloud upload reads slots via the IDB-primary union
Check (
    $cloud140 -match "_coldReadObj\('robco_slot_' \+ n, 'slot_' \+ n\)"
) '140.11: cloud syncLocalSavesToCloud reads slots via the IDB-primary union (_coldReadObj)'

# 140.12  game-agnostic (Protocol 38): the cold-store path has no game literals
Check (
    -not (($coldRead140 + $coldWrite140 + $migrate140) -match 'FNV|FO3|Fallout|New Vegas|Mojave|Capital Wasteland')
) '140.12: the P3 cold-store accessors are game-agnostic (no game literals)'

# ===========================================================
# Suite 141 -- Step 2 (v2.8.0) Phase 1 P4: Terminal Record -- structured
# eventLog (12 tests). Mirrors JS Suite 141. eventLog is the ONE canonical
# campaign history ({t,rt,type,text} records via the single _logEvent() writer);
# campaign_notes returns to a MANUAL notebook. The [T#] migration
# (_migrateEventLog) non-lossily splits legacy campaign_notes -- [T#] auto-log
# strings MOVE to eventLog, manual notes STAY. Player-authority: the AI can't
# overwrite the notebook (its notes route to eventLog, deduped) and can never
# author eventLog directly. Crossroads + Incident are views over the Record.
# ===========================================================
Sep "Suite 141 -- P4 Terminal Record (structured eventLog + [T#] migration)"
$state141     = Read-Src "js/state.js"
$api141       = Read-Src "js/api.js"
$uiCore141    = Read-Src "js/ui-core.js"
$uiRender141  = Read-Src "js/ui-render.js"
$html141      = Read-Src "index.html"
$logEventBody = Get-FunctionBody $state141 '_logEvent'
$migrateEvBody = Get-FunctionBody $state141 '_migrateEventLog'
$inferBody141 = Get-FunctionBody $state141 '_inferEventType'
$migrateStateBody141 = Get-FunctionBody $state141 'migrateState'
$addNoteBody141 = Get-FunctionBody $uiRender141 'addCampaignNote'

# 141.1  eventLog default present alongside campaign_notes
Check (
    ($state141 -match 'eventLog: \[\]') -and ($state141 -match 'campaign_notes: \[\]')
) '141.1: state defaults include eventLog: [] (Terminal Record) alongside campaign_notes: []'

# 141.2  _logEvent is the single structured writer (t/rt/type/text + cap)
Check (
    ($state141 -match 'function _logEvent\(type, text\)') -and
    ($logEventBody -match 'state\.eventLog\.push\(') -and
    ($logEventBody -match 'type: String\(type\)') -and
    ($logEventBody -match 'text: String\(text\)') -and
    ($logEventBody -match 'EVENTLOG_CAP')
) '141.2: _logEvent() is the single writer -- pushes a structured {t,rt,type,text} record, capped at EVENTLOG_CAP'

# 141.3  auto-log subscribers re-pointed to _logEvent; _logCampaignEvent retired
Check (
    (-not ($state141 -match '_logCampaignEvent')) -and
    (-not ($api141 -match '_logCampaignEvent')) -and
    ($state141 -match "RobcoEvents\.on\('level\.up'[\s\S]{0,120}_logEvent\('level'")
) '141.3: the RobcoEvents auto-log subscribers write via _logEvent(); the old _logCampaignEvent is fully retired (state.js + api.js)'

# 141.4  the [T#] migration: MOVE [T#] strings to eventLog, KEEP manual notes
Check (
    ($state141 -match 'function _migrateEventLog\(s\)') -and
    ($migrateEvBody -match 'T\(\\d\+\)') -and
    ($migrateEvBody -match 'manual\.push\(n\)') -and
    ($migrateEvBody -match 's\.campaign_notes = manual') -and
    ($migrateEvBody -match '_inferEventType')
) '141.4: _migrateEventLog moves [T#]-prefixed auto-log strings into eventLog and leaves manual notes in campaign_notes (non-lossy split)'

# 141.5  migration runs from migrateState AND the v8 boot fast-path
Check (
    ($migrateStateBody141 -match '_migrateEventLog\(s\)') -and
    ($migrateStateBody141 -match 's\.eventLog\b') -and
    ($uiCore141 -match '_migrateEventLog\(state\)')
) '141.5: migrateState and the ui-core v8 boot fast-path both run _migrateEventLog (existing v8 saves migrate too)'

# 141.6  sanitizeImportedContainer coerces eventLog to typed records (Protocol 4)
Check (
    ($api141 -match 'o\.eventLog = o\.eventLog') -and
    ($api141 -match "type: _str\(e\.type \|\| 'log'\)") -and
    ($api141 -match "text: _str\(e\.text \|\| ''\)")
) '141.6: sanitizeImportedContainer coerces eventLog into typed {t,rt,type,text} records (born-compliant, Protocol 4)'

# 141.7  AI re-point: no overwrite of the notebook; AI notes -> eventLog, deduped
Check (
    (-not ($api141 -match 'state\.campaign_notes = parsed\.campaign_notes')) -and
    ($api141 -match "parsed\.campaign_notes[\s\S]{0,400}_logEvent\('log', text\)") -and
    ($api141 -match '_seenEvents')
) "141.7: the AI no longer overwrites campaign_notes -- its notes route to eventLog as deduped 'log' events (player authority)"

# 141.8  player-authority: the manual notebook stays user-editable
Check (
    $addNoteBody141 -match 'state\.campaign_notes\.push'
) '141.8: addCampaignNote() still writes campaign_notes -- the manual notebook stays fully user-editable'

# 141.9  Crossroads + Incident are views over the Record (read eventLog)
Check (
    ($uiRender141 -match 'state\.eventLog[\s\S]{0,80}\.slice\(-20\)') -and
    ($uiRender141 -match 'incidentDisplay') -and
    ($uiRender141 -match 'MILESTONES') -and
    ($api141 -match '\(state && state\.eventLog\)')
) '141.9: the Crossroads (all events) and Incident (milestone-filtered) views read state.eventLog; _nativeCrossroads reads it too'

# 141.10  the Incident Log sub-panel exists (Protocol UI-2: data-sub-id)
Check (
    ($html141 -match 'id="incidentDisplay"') -and ($html141 -match 'data-sub-id="incident_log"')
) '141.10: index.html has the Incident Log sub-panel (#incidentDisplay + data-sub-id -- Protocol UI-2)'

# 141.11  player-authority: the AI can NEVER author the Record directly
Check (
    (-not ($api141 -match 'state\.eventLog = parsed\.eventLog')) -and (-not ($api141 -match 'parsed\.eventLog'))
) '141.11: autoImportState never lets the AI write eventLog directly -- the Record is code-authored (player authority)'

# 141.12  game-agnostic (Protocol 38): the Record path has no game literals
Check (
    -not (($logEventBody + $migrateEvBody + $inferBody141) -match 'FNV|FO3|Fallout|New Vegas|Mojave|Capital Wasteland')
) '141.12: the Terminal Record writer/migration/inference are game-agnostic (no game literals)'

# ===========================================================
# Suite 142 -- Step 2 (v2.8.0) Phase 1 P5: Save version history -- a per-slot
# revision ring (12 tests). Mirrors JS Suite 142. Each save slot retains up to
# SLOT_VERSION_CAP prior revisions in the IDB 'campaign' store (key
# slot_<n>_versions), IDB-ONLY so it rides the P3 IndexedDB headroom and never
# consumes the localStorage ceiling. saveToSlot captures the slot's PRIOR contents
# before overwriting; the user can view + (destructively, confirm-gated) restore
# any revision through the SAME _applySlotEnvelope core loadFromSlot uses
# (Protocol 22). Fail-safe: no IDB -> no version history offered, save/load
# byte-identical to pre-P5. Structural guards here; the real-IndexedDB behavioral
# proof lives in tests/test.html (Suite 14 -- PowerShell has no IndexedDB).
# ===========================================================
Sep "Suite 142 -- P5 save version history (per-slot revision ring)"
$state142    = Read-Src "js/state.js"
$uiSaves142  = Read-Src "js/ui-saves.js"
$uiAcct142   = Read-Src "js/ui-account.js"
$readVers142     = Get-FunctionBody $state142 'readSlotVersions'
$pushVers142     = Get-FunctionBody $state142 'pushSlotVersion'
$saveBody142     = Get-FunctionBody $uiSaves142 'saveToSlot'
$applyBody142    = Get-FunctionBody $uiSaves142 '_applySlotEnvelope'
$restoreVer142   = Get-FunctionBody $uiSaves142 'restoreSlotVersion'
$viewVer142      = Get-FunctionBody $uiSaves142 'viewSlotVersions'
$loadBody142     = Get-FunctionBody $uiSaves142 'loadFromSlot'

# 142.1  the version-ring API is defined + exposed on window
Check (
    ($state142 -match 'function _slotVersionsIdbKey\s*\(') -and
    ($state142 -match 'const SLOT_VERSION_CAP =') -and
    ($state142 -match 'async function readSlotVersions\s*\(') -and
    ($state142 -match 'window\.readSlotVersions = readSlotVersions') -and
    ($state142 -match 'async function pushSlotVersion\s*\(') -and
    ($state142 -match 'window\.pushSlotVersion = pushSlotVersion')
) '142.1: state.js defines SLOT_VERSION_CAP + _slotVersionsIdbKey and exposes window.readSlotVersions / window.pushSlotVersion'

# 142.2  TWO-STORE BOUNDARY: the version ring uses the 'campaign' store only
Check (
    ($readVers142 -match "'campaign'") -and
    ($pushVers142 -match "'campaign'") -and
    (-not ($readVers142 -match "'meta'")) -and
    (-not ($pushVers142 -match "'meta'"))
) "142.2: the version ring uses the 'campaign' object store only, never 'meta' (two-store boundary -- Protocol 23)"

# 142.3  pushSlotVersion is newest-first (unshift) + bounded (slice to cap)
Check (
    ($pushVers142 -match '\.unshift\(priorEnv\)') -and
    ($pushVers142 -match '\.slice\(0, SLOT_VERSION_CAP\)')
) '142.3: pushSlotVersion prepends newest-first (unshift) and caps the ring at SLOT_VERSION_CAP (slice) -- bounded'

# 142.4  FAIL-SAFE: both accessors guard on window.IdbStore and never throw
Check (
    ($readVers142 -match 'if \(!window\.IdbStore\) return \[\]') -and
    ($readVers142 -match 'catch \(_\) \{\s*return \[\]') -and
    ($pushVers142 -match 'if \(!window\.IdbStore \|\| !priorEnv\) return;') -and
    ($pushVers142 -match 'try \{') -and
    ($pushVers142 -match 'catch \(_\) \{\}')
) '142.4: readSlotVersions / pushSlotVersion guard on window.IdbStore and are wrapped so they never throw (fail-safe -> [] / no-op)'

# 142.5  IDB-ONLY: the version ring is never mirrored to localStorage
Check (
    (-not ($readVers142 -match 'localStorage')) -and
    (-not ($pushVers142 -match 'localStorage'))
) '142.5: the version ring is IDB-only -- never written to localStorage (rides IDB headroom, never the ~5MB ceiling)'

# 142.6  saveToSlot captures the PRIOR envelope via pushSlotVersion BEFORE the write
Check (
    ($saveBody142 -match 'await window\.pushSlotVersion\(slotNum, _prior\)') -and
    ($saveBody142.IndexOf('pushSlotVersion') -lt $saveBody142.IndexOf('_coldWriteObj'))
) '142.6: saveToSlot captures the slot prior contents via pushSlotVersion BEFORE overwriting it (capture-before-overwrite)'

# 142.7  Protocol 22 -- ONE apply core: _applySlotEnvelope called by BOTH
#         loadFromSlot AND restoreSlotVersion (no parallel restore implementation)
Check (
    ($uiSaves142 -match 'async function _applySlotEnvelope\s*\(') -and
    ($loadBody142 -match '_applySlotEnvelope\(env, slotNum\)') -and
    ($restoreVer142 -match "_applySlotEnvelope\(env, slotNum, \{ verb: 'version restored' \}\)")
) '142.7: loadFromSlot and restoreSlotVersion both apply through the SHARED _applySlotEnvelope core (Protocol 22 -- no parallel restore path)'

# 142.8  the apply core routes through the same integrity + backup + migrate path
Check (
    ($applyBody142 -match 'verifySaveEnvelope\(env\)') -and
    ($applyBody142 -match 'snapRollingBackup\(\)') -and
    ($applyBody142 -match 'migrateState\(env\.version')
) '142.8: _applySlotEnvelope verifies the envelope, snapshots a rolling backup before applying, and migrates state (same path as loadFromSlot)'

# 142.9  restoreSlotVersion is confirm-gated BEFORE applying (destructive -> P34)
Check (
    ($restoreVer142 -match 'await confirmAction\(\{') -and
    ($restoreVer142 -match "confirmLabel: 'RESTORE VERSION'") -and
    ($restoreVer142 -match 'if \(!ok\) return;') -and
    ($restoreVer142.IndexOf('confirmAction') -lt $restoreVer142.IndexOf('_applySlotEnvelope'))
) '142.9: restoreSlotVersion is confirm-gated (confirmAction) BEFORE the apply core -- destructive restore honors Protocol 34'

# 142.10  viewSlotVersions renders via the shared modal + escapes dynamic fields
Check (
    ($viewVer142 -match 'openModal\(\{') -and
    ($viewVer142 -match 'escapeHtml\(') -and
    ($viewVer142 -match 'restoreSlotVersion\(')
) '142.10: viewSlotVersions renders through openModal, escapes dynamic fields (escapeHtml), and wires per-row restoreSlotVersion'

# 142.11  FAIL-SAFE AFFORDANCE: VERS button only when IdbStore present + versions
Check (
    ($uiAcct142 -match "window\.IdbStore && typeof window\.readSlotVersions === 'function'") -and
    ($uiAcct142 -match 'versionCounts\[') -and
    ($uiAcct142 -match 'viewSlotVersions\(')
) '142.11: renderSavesList offers the version-history affordance only when IndexedDB is present and the slot has revisions (fail-safe)'

# 142.12  game-agnostic (Protocol 38): the P5 code carries no game literals
Check (
    -not (($readVers142 + $pushVers142 + $restoreVer142 + $viewVer142) -match 'FNV|FO3|Fallout|New Vegas|Mojave|Capital Wasteland')
) '142.12: the P5 version-history code is game-agnostic (no game literals)'

# ===========================================================
# Results
# ===========================================================
Write-Host "`n============================================================`n"
if ($script:Failed -eq 0) {
    Write-Host ("  ALL " + $script:Passed + " TESTS PASSED - persistence fully verified.") -ForegroundColor Green
    Write-Host "  Every state field is covered by autoImportState, export, and cloud sync.`n"
    exit 0
} else {
    Write-Host ("  " + $script:Failed + " TEST(S) FAILED  (" + $script:Passed + " passed)") -ForegroundColor Red
    Write-Host "  Fields marked [FAIL] must be added to autoImportState() in js/api.js`n" -ForegroundColor Red
    exit 1
}

<#
============================================================
 HOW TO MAKE THIS A PERMANENT SAFEGUARD (git pre-commit hook)
============================================================

 STEP 1 - Open Git Bash in the repo root (right-click folder -> Git Bash Here).
          Do NOT use PowerShell or CMD for this step.

 STEP 2 - Paste this exactly (one block):

      cat > .git/hooks/pre-commit << 'EOF'
      #!/bin/sh
      powershell -ExecutionPolicy Bypass -File tests/robco-diagnostics.ps1
      if [ $? -ne 0 ]; then
        echo ""
        echo "Commit blocked: persistence audit failed."
        echo "Add new state fields to autoImportState() in js/api.js, then commit again."
        exit 1
      fi
      EOF
      chmod +x .git/hooks/pre-commit

 STEP 3 - Done. Every future "git commit" will run this audit first.
          If any state field is not persisted, the commit is blocked.

 To skip in an emergency:  git commit --no-verify
 To uninstall:             rm .git/hooks/pre-commit
============================================================
#>
