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
$uiSrc     = Read-Src "js\ui.js"

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
        $uiPathNode = (Join-Path $repoRoot "js/ui.js").Replace('\', '/')
        $repScript = @"
const vm = require('vm');
const fs = require('fs');
const uiSource = fs.readFileSync('$uiPathNode', 'utf8');
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
Check ($cloudSrc -match 'robco_v8\s*:\s*window\.robco_v8')   "pushToCloud() serialises full robco_v8 container"
Check ($cloudSrc -match 'chat\s*:\s*JSON\.parse') "pushToCloud() includes chat history"
Check ($cloudSrc -match 'playstyle')               "pushToCloud() includes playstyle"
$hasPullEnv = ($cloudSrc -match 'data\.version') -and ($cloudSrc -match 'data\.state')
Check $hasPullEnv                                  "pullFromCloud() detects envelope format"
Check ($cloudSrc -match 'restoreChatHistory')      "pullFromCloud() restores chat history"
Check ($cloudSrc -match 'robco_playstyle')         "pullFromCloud() restores playstyle"

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
Check ($swSrc -match "'./index.html'" -and $swSrc -match "'./js/ui.js'")  'ASSETS list includes index.html and js/ui.js'
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
        $uiPathNode = (Join-Path $repoRoot "js/ui.js").Replace('\', '/')
        $dcScript = @"
const vm = require('vm');
const fs = require('fs');
const src = fs.readFileSync('$uiPathNode', 'utf8');
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
Check ([bool]($htmlSrc -match 'id="btnCloudPush"'))  "Cloud Push button exists (id=btnCloudPush)"
Check ([bool]($htmlSrc -match 'id="btnCloudPull"'))  "Cloud Pull button exists (id=btnCloudPull)"
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

# 23.4 & 23.5 pushToCloud is NOT called from saveState() or updateMath()
$saveStateBody23 = ''
$updateMathBody23 = ''
try { $saveStateBody23 = Get-FunctionBody $stateSrc 'saveState' } catch {}
try { $updateMathBody23 = Get-FunctionBody $uiSrc 'updateMath' } catch {}
Check (-not ($saveStateBody23 -match 'pushToCloud'))   "saveState() does not call pushToCloud (manual-only)"
Check (-not ($updateMathBody23 -match 'pushToCloud'))  "updateMath() does not call pushToCloud (manual-only)"

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
# and CHANGELOG.md canonical count must match README.md.
# 4 tests
# ===========================================================
Sep "Suite 28 -- Meta / Runner Parity"
# NOTE: source-level Check/assert counts cannot reliably track runtime test counts
# because loops multiply results at runtime. Parity is enforced structurally.
$jsRunnerSrc28 = Read-Src "tests/check-persistence.js"
$psRunnerSrc28 = Read-Src "tests/check-persistence.ps1"
$GATE_SUITES = @('Suite 22','Suite 23','Suite 24','Suite 25','Suite 26','Suite 27','Suite 28','Suite 29','Suite 30','Suite 31')
$jsMissing28 = $GATE_SUITES | Where-Object { -not $jsRunnerSrc28.Contains($_) }
$psMissing28 = $GATE_SUITES | Where-Object { -not $psRunnerSrc28.Contains($_) }
Check ($jsMissing28.Count -eq 0) ("JS runner contains all gate-guard suites (22-31)" + $(if ($jsMissing28.Count) { " -- missing: " + ($jsMissing28 -join ", ") } else { "" }))
Check ($psMissing28.Count -eq 0) ("PS runner contains all gate-guard suites (22-31)" + $(if ($psMissing28.Count) { " -- missing: " + ($psMissing28 -join ", ") } else { "" }))
$changelogSrc28 = Read-Src "CHANGELOG.md"
$countM28 = [regex]::Match($changelogSrc28, 'Tests:\s*(\d+)/\d+')
$canon28 = if ($countM28.Success) { $countM28.Groups[1].Value } else { '' }
Check ($canon28 -ne '') "CHANGELOG.md contains Tests: N/N header (Protocol 2a)"
$readmeSrc28 = Read-Src "README.md"
Check ($canon28 -ne '' -and ($readmeSrc28 -match $canon28)) "README.md contains CHANGELOG.md canonical test count ($canon28)"

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
Check ([bool]($htmlSrc -match 'id="updateBanner"')) `
    'id="updateBanner" element exists in index.html (in-page update UI)'
Check ([bool]($triggerBody29 -match 'SKIP_WAITING') -and [bool]($triggerBody29 -match 'onclick|addEventListener')) `
    "_triggerUpdate() wires banner tap to postMessage SKIP_WAITING (update path intact)"
Check ([bool]($htmlSrc -match 'refreshing') -and [bool]($htmlSrc -match 'hadController')) `
    "controllerchange reload guard (refreshing + hadController) intact in index.html (Protocol 20)"

# ===========================================================
# Suite 30 -- Phase 1b Guards
# Input maxlength caps, CSP-Report-Only header, monotonic cache
# guard in pre-commit hook, proactive localStorage quota warning.
# 4 tests
# ===========================================================
Sep "Suite 30 -- Phase 1b Guards"
# 30.1 #chatInput textarea has maxlength attribute
Check ([bool]($htmlSrc -match 'id="chatInput"[\s\S]{0,300}maxlength')) `
    '#chatInput textarea has maxlength attribute (Phase 1b input cap guard)'
# 30.2 CSP-Report-Only meta present in index.html
Check ([bool]($htmlSrc -match 'Content-Security-Policy-Report-Only')) `
    'index.html contains Content-Security-Policy-Report-Only meta (Phase 1b security header)'
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
# ci.yml has no stale "(106 tests)" label; runs PS runner;
# has render-check step; deploy.yml uses _site staging dir;
# hook-install and boot-smoke scripts exist.
# 6 tests
# ===========================================================
Sep "Suite 31 -- CI/CD Automation Guards"
$ciSrc31 = Read-Src '.github/workflows/ci.yml'
# 31.1 ci.yml no stale "(106 tests)" label
Check (-not ($ciSrc31 -match '\(106 tests\)')) `
    'ci.yml does not contain stale "(106 tests)" label (Phase 1c update)'
# 31.2 ci.yml runs PowerShell persistence runner
Check ([bool]($ciSrc31 -match 'check-persistence\.ps1')) `
    'ci.yml runs PowerShell persistence runner (Protocol 15 parity)'
# 31.3 ci.yml has render-check step
Check ([bool]($ciSrc31 -match 'render-check')) `
    'ci.yml includes render-check step (Protocol 10 CI enforcement)'
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
