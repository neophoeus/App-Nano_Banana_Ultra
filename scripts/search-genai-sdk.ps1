param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Pattern
)

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
$appDir = Split-Path -Path $scriptDir -Parent
$targetDir = Join-Path $appDir "node_modules/@google/genai"

if (-not $Pattern -or $Pattern.Count -eq 0) {
    $Pattern = @(
        "generateContentStream",
        "sendMessageStream",
        "responsePromise"
    )
}

if (-not (Test-Path $targetDir)) {
    Write-Error "Missing $targetDir. Run run_install.bat first."
    exit 1
}

$rg = Get-Command rg -ErrorAction SilentlyContinue
$foundAny = $false

if ($rg) {
    foreach ($item in $Pattern) {
        $output = & $rg.Source -n -F -uu --color never $item $targetDir 2>$null
        if ($output) {
            $output
            $foundAny = $true
        }
    }
} else {
    $files = Get-ChildItem -Path $targetDir -Recurse -File
    foreach ($item in $Pattern) {
        $searchMatches = Select-String -Path $files.FullName -SimpleMatch $item
        foreach ($match in $searchMatches) {
            $relativePath = $match.Path.Substring($appDir.Length + 1)
            Write-Output ("{0}:{1}:{2}" -f $relativePath, $match.LineNumber, $match.Line.Trim())
            $foundAny = $true
        }
    }
}

if (-not $foundAny) {
    Write-Output "No matches found."
}

exit 0