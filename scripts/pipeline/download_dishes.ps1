$rawDir = "data/raw_howtocook"
if (!(Test-Path $rawDir)) {
    New-Item -ItemType Directory -Path $rawDir | Out-Null
}

$targets = Get-Content -Raw -Encoding UTF8 "data/harvest_targets.json" | ConvertFrom-Json

$count = 0
$total = $targets.Count
Write-Host "Starting download of $total dishes via PowerShell..."

foreach ($t in $targets) {
    $dest = Join-Path $rawDir "$($t.slug).md"
    if (Test-Path $dest) {
        $count++
        Write-Host "[$count/$total] Already exists: $($t.slug)"
        continue
    }

    $encodedParts = $t.sourceFile.Split('/') | ForEach-Object { [System.Uri]::EscapeDataString($_) }
    $encodedPath = $encodedParts -join '/'
    $url = "https://raw.githubusercontent.com/Anduin2017/HowToCook/master/$encodedPath"

    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15 -Headers @{ "User-Agent" = "PowerShell" }
        [System.IO.File]::WriteAllText($dest, $resp.Content, [System.Text.Encoding]::UTF8)
        $count++
        Write-Host "[$count/$total] Downloaded: $($t.slug)"
    } catch {
        Write-Host "[$count/$total] FAILED: $($t.slug) - $($_.Exception.Message)"
    }
}

Write-Host "Done. Available: $count / $total"
