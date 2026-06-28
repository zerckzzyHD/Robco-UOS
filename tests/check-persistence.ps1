<#
.SYNOPSIS
    RobCo Persistence Audit

.DESCRIPTION
    Auto-discovers every field in state.js and verifies it is handled by
    autoImportState(), exportSaveFile(), pushToCloud(), and handleFileUpload().

.NOTES
    Run from project root:
        powershell -ExecutionPolicy Bypass -File tests\check-persistence.ps1

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
# Mirror of Node KNOWN_KEYS (check-persistence.js Suite 0): the 27 legacy keys.
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
    "getFactionStanding('ncr', 50, 20) returns 'Unpredictable'",
    "getFactionStanding('ncr', 0, 30) returns 'Shunned'",
    "getFactionStanding('ncr', 80, 20) returns 'Merciful Thug'",
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
    gfs('ncr', 50, 20).label === 'Unpredictable',
    gfs('ncr', 0, 30).label === 'Shunned',
    gfs('ncr', 80, 20).label === 'Merciful Thug',
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
Check ([bool]($htmlSrc -match 'id="timelineDisplay"')) 'Timeline display shell exists in index.html (id="timelineDisplay")'
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

Check ($regSrc -match 'const FALLOUT_REGISTRY')           "FALLOUT_REGISTRY global is declared"
Check ($regSrc -match 'function registrySearch')           "registrySearch() function is declared"
Check ($regSrc -match "quests\s*:")                        "FALLOUT_REGISTRY.quests category key exists"
Check ($regSrc -match "items\s*:")                         "FALLOUT_REGISTRY.items category key exists"
Check ($regSrc -match "perks\s*:")                         "FALLOUT_REGISTRY.perks category key exists"
Check ($regSrc -match "locations\s*:")                     "FALLOUT_REGISTRY.locations category key exists"
Check ($regSrc -match "companions\s*:")                    "FALLOUT_REGISTRY.companions category key exists"
Check ($regSrc -match '\.length\s*<\s*2')                  "registrySearch() enforces minimum query length of 2"
Check ($regSrc -match '\.slice\(0,\s*7\)')                 "registrySearch() caps results at 7"
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
# cannot regress.
# 9 tests
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

# 21.3 Trade modal does NOT embed raw item.name in an inline onclick attribute
$tradeStart = $apiSrc.IndexOf("mType === 'TRADE'")
$tradeEnd   = $apiSrc.IndexOf("} else {", $tradeStart)
$tradeBlock = if ($tradeStart -ge 0 -and $tradeEnd -gt $tradeStart) { $apiSrc.Substring($tradeStart, $tradeEnd - $tradeStart) } else { '' }
Check ($tradeBlock -notmatch 'onclick\s*=\s*[''"`]\s*tradeItem\s*\(') `
    "Trade modal does not use inline onclick=""tradeItem(...)"" (XSS-2 guard)"

# 21.4 Trade modal uses addEventListener for click binding
Check ($tradeBlock -match "addEventListener\s*\(\s*['""]click['""]") `
    "Trade modal binds click via addEventListener (XSS-2 guard)"

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
Check ([bool]($htmlSrc -match "onclick=""macroCommand\('\[TRADE\]'\)"""))     "TRADE macro button wired"
Check ([bool]($htmlSrc -match "onclick=""macroCommand\('\[LOOT\]'\)"""))      "LOOT macro button wired"
# V.A.T.S. Calculator
Check ([bool]($htmlSrc -match 'id="vatsCalcBtn"'))  "V.A.T.S. CALCULATOR button exists (id=vatsCalcBtn)"

# ===========================================================
# Suite 23 -- Prohibited Patterns (Group 2)
# Static checks that banned patterns haven't crept back in.
# 5 tests
# ===========================================================
Sep "Suite 23 -- Prohibited Patterns"

# 23.1 No innerHTML += in ui.js (render functions must use bulk assignment)
Check (-not ($uiSrc -match 'innerHTML\s*\+=')) "ui.js has no innerHTML += (O(n^2) re-parse guard)"

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
Check ([bool]($sysDirBody25 -match "'narrative'|`"narrative`"")) "getSystemDirective() contains 'narrative' key (AI tri-node schema)"
Check ([bool]($sysDirBody25 -match "'state'|`"state`""))         "getSystemDirective() contains 'state' key (AI tri-node schema)"
Check ([bool]($sysDirBody25 -match "'modal'|`"modal`""))         "getSystemDirective() contains 'modal' key (AI tri-node schema)"

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
$jsRunnerSrc28 = Read-Src "tests/check-persistence.js"
$psRunnerSrc28 = Read-Src "tests/check-persistence.ps1"
$GATE_SUITES = @('Suite 22','Suite 23','Suite 24','Suite 25','Suite 26','Suite 27','Suite 28','Suite 29','Suite 30','Suite 31','Suite 32','Suite 33','Suite 34','Suite 35','Suite 36','Suite 37','Suite 38','Suite 39','Suite 40','Suite 41','Suite 49','Suite 50','Suite 51','Suite 52','Suite 53','Suite 54','Suite 55','Suite 56','Suite 57','Suite 58','Suite 59','Suite 60','Suite 61','Suite 62','Suite 63','Suite 64','Suite 65','Suite 66','Suite 67','Suite 68','Suite 69','Suite 70','Suite 71','Suite 72')
$jsMissing28 = $GATE_SUITES | Where-Object { -not $jsRunnerSrc28.Contains($_) }
$psMissing28 = $GATE_SUITES | Where-Object { -not $psRunnerSrc28.Contains($_) }
Check ($jsMissing28.Count -eq 0) ("JS runner contains all gate-guard suites (22-41, 49-69)" + $(if ($jsMissing28.Count) { " -- missing: " + ($jsMissing28 -join ", ") } else { "" }))
Check ($psMissing28.Count -eq 0) ("PS runner contains all gate-guard suites (22-41, 49-69)" + $(if ($psMissing28.Count) { " -- missing: " + ($psMissing28 -join ", ") } else { "" }))
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
# gated on CI via workflow_run + conclusion == 'success';
# hook-install and boot-smoke scripts exist;
# pre-commit hook is conditional (served-file gate).
# 11 tests
# ===========================================================
Sep "Suite 31 -- CI/CD Automation Guards"
$ciSrc31 = Read-Src '.github/workflows/ci.yml'
# 31.1 ci.yml no stale "(106 tests)" label
Check (-not ($ciSrc31 -match '\(106 tests\)')) `
    'ci.yml does not contain stale "(106 tests)" label (Phase 1c update)'
# 31.2 gate.js runs PowerShell persistence runner + ci.yml calls npm run gate
$gateSrc31 = Read-Src 'scripts/gate.js'
Check (($gateSrc31 -match 'check-persistence\.ps1') -and ($ciSrc31 -match 'npm run gate')) `
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
# 31.8 deploy.yml uses workflow_run trigger (gated on CI)
$deploySrc31b = Read-Src '.github/workflows/deploy.yml'
Check ([bool]($deploySrc31b -match 'workflow_run')) `
    'deploy.yml uses workflow_run trigger (deploy gated on CI -- not a bare push to main)'
# 31.9 deploy.yml workflow_run gate requires conclusion == 'success'
Check ([bool]($deploySrc31b -match "conclusion == 'success'")) `
    "deploy.yml workflow_run gate requires conclusion == 'success' (broken CI cannot deploy)"
# 31.10 scripts/pre-commit gates cache-bump on staged served files (conditional)
$hookSrc31 = Read-Src 'scripts/pre-commit'
Check (([bool]($hookSrc31 -match 'git diff --cached --name-only')) -and ([bool]($hookSrc31 -match 'SERVED='))) `
    'scripts/pre-commit gates cache-bump check on staged served files via git diff --cached (conditional Protocol 1)'
# 31.11 scripts/pre-commit has SKIP branch for non-served commits
Check (([bool]($hookSrc31 -match 'SKIP.*No served')) -or ([bool]($hookSrc31 -match 'cache bump not required'))) `
    'scripts/pre-commit has SKIP branch -- non-served commits bypass the cache-bump check'

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

# 32.6 index.html skill matrix has >= 13 class="skill-row" elements
$htmlSrc32 = Read-Src 'index.html'
$skillRowCount32 = ([regex]::Matches($htmlSrc32, 'class="skill-row"')).Count
Check ($skillRowCount32 -ge 13) "index.html skill matrix has >= 13 .skill-row elements (found $skillRowCount32)"

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

# 33.4 --robco-green-rgb set in changeOpticsColor() branches in ui.js (>=6 calls)
$rgbUi33 = ([regex]::Matches($uiSrc, "setProperty\('--robco-green-rgb'")).Count
Check ($rgbUi33 -ge 6) "changeOpticsColor() sets --robco-green-rgb in >=6 branches (found $rgbUi33) (P1-1)"

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

# 35.1 campaign_notes capped to 200 after auto-log pushes in api.js (P7-14)
$capCount35 = ([regex]::Matches($apiSrc35, 'campaign_notes\.length\s*>\s*200')).Count
Check ($capCount35 -ge 2) "campaign_notes capped to 200 after auto-log pushes in api.js (P7-14)"

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

# 35.6 registrySearch has _registrySearchCache memoization in reg_nv.js (P7-13)
Check ([bool]($regNvSrc35 -match '_registrySearchCache')) 'registrySearch has _registrySearchCache memoization in reg_nv.js (P7-13)'

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
$kdSnippet36 = if ($kdIdx36 -ge 0) { $uiSrc36.Substring($kdIdx36, [Math]::Min(2000, $uiSrc36.Length - $kdIdx36)) } else { '' }
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
# 4 tests
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
# 10 tests
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
# 12 tests
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
# confirm-gated load/delete, picker UI wired.
# 16 tests
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

# 46.10  loadCloudSave is gated behind confirm()
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
Check ([bool]($loadBody46 -match '\bconfirm\b')) `
    'loadCloudSave is gated behind confirm() — never auto-loads (data-safety)'

# 46.11  loadCloudSave routes through sanitizeImportedContainer AND migrateState
Check (([bool]($loadBody46 -match 'sanitizeImportedContainer')) -and ([bool]($loadBody46 -match 'migrateState'))) `
    'loadCloudSave routes through sanitizeImportedContainer AND migrateState (hardened load path)'

# 46.12  deleteCloudSave is confirm-gated
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
Check ([bool]($delBody46 -match '\bconfirm\b')) `
    'deleteCloudSave is confirm-gated (explicit confirmation before deleting cloud save)'

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
# 11 tests
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

# 48.7  LKG key robco_feature_flags is both read from and written to localStorage
Check (([bool]($cloudSrc -match 'robco_feature_flags')) -and ([bool]($cloudSrc -match "localStorage\.setItem\s*\(\s*'robco_feature_flags")) -and ([bool]($cloudSrc -match "localStorage\.getItem\s*\(\s*'robco_feature_flags"))) `
    "cloud.js reads and writes 'robco_feature_flags' localStorage key (last-known-good persistence)"

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
# ring are wired consistently across all load/save paths.
# 56 tests
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

# 51.10  loadFromSlot calls verifySaveEnvelope
$loadSlotBody51 = Get-FnBody51 $uiSrc51 'loadFromSlot'
Check ($loadSlotBody51 -match 'verifySaveEnvelope') `
    "loadFromSlot calls verifySaveEnvelope (integrity check before slot load)"

# 51.11  loadFromSlot calls snapRollingBackup
Check ($loadSlotBody51 -match 'snapRollingBackup') `
    "loadFromSlot calls snapRollingBackup (rolling backup before slot load)"

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
$restoreBody51 = Get-FnBody51 $uiSrc51 'restoreRollingBackup'
Check ($restoreBody51 -match 'sanitizeImportedContainer' -and $restoreBody51 -match 'migrateState') `
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

# 51.36  restoreRollingBackup is confirm-gated (Protocol 34)
Check ($restoreBody51 -match 'confirm\(') `
    'restoreRollingBackup is confirm-gated (Protocol 34 -- destructive state replacement requires user confirmation)'

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
$gsdBody54 = Get-FunctionBody $apiSrc54 'getSystemDirective'
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
# Suite 56 -- UI Module Split Guards + Boot-Loader Migration
# Protocol-20 static guards: each ui-*.js must exist, appear
# in sw.js ASSETS, and be wired in index.html before api.js.
# Also guards the document.write -> createElement migration.
# 34 tests
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

# 57.7b wipeTerminal still has >=2 confirm() calls (double-confirm gate regression guard)
$confirmCount57 = ([regex]::Matches($uiCoreSrc57, '\bconfirm\s*\(')).Count
Check ($confirmCount57 -ge 2) `
    ("wipeTerminal still has >=2 confirm() calls (found $confirmCount57) -- double-confirm gate intact")

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
# 2 tests
# ===========================================================
Sep "Suite 62 -- Changelog viewer guards"
$uiCoreSrc62 = Read-Src "js/ui-core.js"

# 62.1 Boot-time viewer skips [Unreleased] -- uses sections.find() to select first versioned section
Check ([bool]($uiCoreSrc62 -match 'sections\.find')) `
    'Changelog boot-time viewer uses .find() to skip [Unreleased] and select first versioned section'

# 62.2 Viewer strips HTML comments
Check ([bool]($uiCoreSrc62 -match 'replace\(.*<!--')) `
    'Changelog viewer strips HTML comments (<!-- --> pattern)'

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

# 63.2  saveCurrentToCloud uses addDoc (additive) and not setDoc (Protocol 34)
$scIdx63 = $cloudSrc63.IndexOf('saveCurrentToCloud')
$scSlice63 = if ($scIdx63 -ge 0) { $cloudSrc63.Substring($scIdx63, [Math]::Min(2000, $cloudSrc63.Length - $scIdx63)) } else { '' }
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
# focus trap, Esc blocked, fail-safe, &&controller regression guards.
# 12 tests
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

# 65.8  Case A call site still gates on navigator.serviceWorker.controller (boot-safety regression guard)
Check ([bool]($htmlSrc -match 'reg\.waiting\s*&&\s*navigator\.serviceWorker\.controller')) `
    'Case A: _triggerUpdate called only when reg.waiting && navigator.serviceWorker.controller (boot-safety guard intact)'

# 65.9  Case B call site still gates on navigator.serviceWorker.controller
Check ([bool]($htmlSrc -match "state\s*===\s*'installed'\s*&&\s*navigator\.serviceWorker\.controller")) `
    "Case B: _triggerUpdate called only when state==='installed' && navigator.serviceWorker.controller (boot-safety guard intact)"

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

# ===========================================================
# Suite 66 -- FO3 Lincoln Memorabilia Tracker (Phase 6 Task 4)
# state.lincolnItems, migration, autoImportState validated map,
# reg_fo3 array, GAME_DEFS.FO3.tracksLincoln, render/handler guards.
# 17 tests
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
$sdBody66 = ''
try { $sdBody66 = Get-FunctionBody $apiSrc66 'getSystemDirective' } catch {}
Check ([bool]($sdBody66 -match 'lincolnItems')) `
    'getSystemDirective() references lincolnItems (Protocol 14 -- AI contract updated for new state field)'

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
$sdBody67 = ''
try { $sdBody67 = Get-FunctionBody $apiSrc67 'getSystemDirective' } catch {}
Check ([bool]($sdBody67 -match 'state\.traits')) `
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
# seedNewCampaignInventory definition + guards.
# 14 tests
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

# 70.12  FNV guard: function returns early if ctx !== 'FNV'
Check ([bool]($seedBody70 -match "ctx\s*!==\s*['""]FNV['""]")) `
    'seedNewCampaignInventory() has FNV guard (ctx !== "FNV") -- prevents canteen leaking to FO3'

# 70.13  Empty-inventory guard
Check ($seedBody70 -match 'inventory' -and $seedBody70 -match 'length') `
    'seedNewCampaignInventory() checks inventory.length -- prevents duplicate seed'

# 70.14  New-campaign guard (ticks === 0)
Check ([bool]($seedBody70 -match 'ticks')) `
    'seedNewCampaignInventory() checks ticks -- prevents seeding on reload of played campaign'

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
Check ([bool]($uiCoreSrc71 -match "JSON\.parse\s*\(\s*localStorage\.getItem\s*\(\s*['""]robco_panel_state['""]\s*\)\s*\|\|\s*'\{\}'")) `
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
      powershell -ExecutionPolicy Bypass -File tests/check-persistence.ps1
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
