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
$KNOWN = @('lvl','xp','hpCur','hpMax','s','p','e','c','i','a','l',
           'caps','loc','rads','karma','ticks',
           'la','ra','ll','rl','hd',
           'factions','skills','status','inventory','squad','campaign_notes','locationHistory',
           'gameContext','collectibles')  # v2.0 fields
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
                  'followers','powder','kings','wgs','vangraff','crimson','chairmen','omertas')
foreach ($k in $EXP_FACTIONS) { Check ($factionKeys -contains $k) "FACTION_REGISTRY key: '$k'" }
$hasForEach = ($importBody -match 'getFactionRegistry\(\)\.forEach') -and ($importBody -match 'parsed\.factions')
Check $hasForEach "autoImportState() imports factions via getFactionRegistry().forEach"
Check ($factionKeys.Count -eq $EXP_FACTIONS.Count) ("FACTION_REGISTRY count = " + $factionKeys.Count + " (expected " + $EXP_FACTIONS.Count + ")")

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
Check ($exportBody -match 'state\s*:\s*state\b')    "serialises full state object"
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
Check ($cloudSrc -match 'state\s*:\s*stateObj')   "pushToCloud() serialises full state"
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
Check ($regSrc -match "collectibles\s*:")                  "FALLOUT_REGISTRY.collectibles category key exists"
Check ($regSrc -match "zones\s*:")                         "FALLOUT_REGISTRY.zones category key exists"
Check ($regSrc -match '\.length\s*<\s*2')                  "registrySearch() enforces minimum query length of 2"
Check ($regSrc -match '\.slice\(0,\s*7\)')                 "registrySearch() caps results at 7"
Check ($regSrc -match 'fallout\.wiki')                     "reg_nv.js contains fallout.wiki attribution comment"
Check ($regSrc -match "version\s*:\s*'[\d\.]+'")          "FALLOUT_REGISTRY.version is declared with semver string"
# Strip comment lines before checking for forbidden references
$regCode = ($regSrc -split "`n" | Where-Object { $_ -notmatch '^\s*//' }) -join "`n"
Check ($regCode -notmatch 'saveState\s*\(')                "reg_nv.js does not call saveState() (pure reference data)"
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
const migrated = sandbox.migrateState('1.0.0', v1Payload);
if (!migrated.factions || !migrated.factions.ncr) throw new Error('Missing structured factions');
if (migrated.factions.ncr.fame !== 50) throw new Error('NCR fame not 50');
if (migrated.factions.legion.fame !== -10) throw new Error('Legion fame not -10');
if (!Array.isArray(migrated.perks)) throw new Error('Missing perks array');
if (!Array.isArray(migrated.quests)) throw new Error('Missing quests array');
if (!migrated.equipped || migrated.equipped.weapon !== null) throw new Error('Missing equipped object');
console.log('PASS');
"@
        $out = $testScript | node 2>&1 | Out-String
        if ($out -match 'PASS') {
            Pass "Node runtime test successful: migrated legacy payload correctly"
        } else {
            $err = if ([string]::IsNullOrWhiteSpace($out)) { "No output from node" } else { $out.Trim() }
            Fail "Node runtime test failed: $err"
        }
    } else {
        Pass "Node not found, skipping runtime execution test"
    }
} catch {
    Fail "Runtime test failed: $_"
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
