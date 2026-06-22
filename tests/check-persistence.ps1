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
                  'followers','powder','kings','wgs','vangraff','crimson','chairmen','omertas')
foreach ($k in $EXP_FACTIONS) { Check ($factionKeys -contains $k) "FACTION_REGISTRY key: '$k'" }
$hasForEach = ($importBody -match 'FACTION_REGISTRY\.forEach') -and ($importBody -match 'parsed\.factions')
Check $hasForEach "autoImportState() imports factions via FACTION_REGISTRY.forEach"
Check ($factionKeys.Count -eq $EXP_FACTIONS.Count) ("FACTION_REGISTRY count = " + $factionKeys.Count + " (expected " + $EXP_FACTIONS.Count + ")")

# ===========================================================
# Suite 3 -- SKILL_KEYS completeness
# ===========================================================
Sep "Suite 3 -- SKILL_KEYS completeness"
$EXP_SKILLS = @('barter','energy_weapons','explosives','guns','lockpick',
                'medicine','melee_weapons','repair','science','sneak','speech','survival','unarmed')
foreach ($k in $EXP_SKILLS) { Check ($skillKeys -contains $k) "SKILL_KEYS: '$k'" }
$hasSkillLoop = ($importBody -match 'SKILL_KEYS\.forEach') -and ($importBody -match 'parsed\.skills')
Check $hasSkillLoop "autoImportState() imports skills via SKILL_KEYS.forEach"

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
$regSrc = Read-Src "js/registry.js"

Check ($regSrc -match 'const FALLOUT_REGISTRY')           "FALLOUT_REGISTRY global is declared"
Check ($regSrc -match 'function registrySearch')           "registrySearch() function is declared"
Check ($regSrc -match "quests\s*:")                        "FALLOUT_REGISTRY.quests category key exists"
Check ($regSrc -match "items\s*:")                         "FALLOUT_REGISTRY.items category key exists"
Check ($regSrc -match "perks\s*:")                         "FALLOUT_REGISTRY.perks category key exists"
Check ($regSrc -match "locations\s*:")                     "FALLOUT_REGISTRY.locations category key exists"
Check ($regSrc -match "companions\s*:")                    "FALLOUT_REGISTRY.companions category key exists"
Check ($regSrc -match '\.length\s*<\s*2')                  "registrySearch() enforces minimum query length of 2"
Check ($regSrc -match '\.slice\(0,\s*7\)')                 "registrySearch() caps results at 7"
Check ($regSrc -match 'fallout\.wiki')                     "registry.js contains fallout.wiki attribution comment"
Check ($regSrc -match "version\s*:\s*'[\d\.]+'")          "FALLOUT_REGISTRY.version is declared with semver string"
# Strip comment lines before checking for forbidden references
$regCode = ($regSrc -split "`n" | Where-Object { $_ -notmatch '^\s*//' }) -join "`n"
Check ($regCode -notmatch 'saveState\s*\(')                "registry.js does not call saveState() (pure reference data)"
Check ($regCode -notmatch 'localStorage')                  "registry.js does not reference localStorage (in code)"
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
