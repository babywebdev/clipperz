$ErrorActionPreference = 'Stop'
$clipperzProject = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$clipperzRoot = Join-Path $clipperzProject '_local\clipperz'
$clipperzWheelhouse = Join-Path $clipperzRoot 'data\cache\wheels'
$clipperzReport = Get-Content -LiteralPath (Join-Path $clipperzProject 'config/windows/wheels.json') -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Path $clipperzWheelhouse -Force | Out-Null
foreach ($clipperzItem in ($clipperzReport.install | Sort-Object { $_.metadata.name })) {
    $clipperzUri = [uri]$clipperzItem.download_info.url
    if ($clipperzUri.Scheme -ne 'https' -or $clipperzUri.Host -notin @('files.pythonhosted.org','download.pytorch.org','download-r2.pytorch.org')) { throw 'Unapproved wheel host' }
    $clipperzName = [uri]::UnescapeDataString([IO.Path]::GetFileName($clipperzUri.AbsolutePath))
    if ([IO.Path]::GetFileName($clipperzName) -ne $clipperzName -or $clipperzName -notlike '*.whl') { throw 'Unexpected wheel filename' }
    $clipperzDest = [IO.Path]::GetFullPath((Join-Path $clipperzWheelhouse $clipperzName))
    $clipperzPartial = $clipperzDest + '.part'
    if (-not $clipperzDest.StartsWith($clipperzWheelhouse + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Destination outside wheelhouse' }
    $clipperzExpected = $clipperzItem.download_info.archive_info.hashes.sha256
    if ($clipperzExpected -notmatch '^[0-9a-f]{64}$') { throw 'Missing SHA-256' }
    if (Test-Path -LiteralPath $clipperzDest) {
        if ((Get-FileHash -LiteralPath $clipperzDest -Algorithm SHA256).Hash -ne $clipperzExpected) { throw "Hash mismatch: $clipperzName" }
        Write-Output "Verified existing $clipperzName"
        continue
    }
    Write-Output "Downloading/resuming $clipperzName"
    & 'C:\Windows\System32\curl.exe' --disable --fail --location --proto '=https' --proto-redir '=https' --continue-at - --retry 3 --connect-timeout 30 --speed-limit 1024 --speed-time 90 --silent --show-error --output $clipperzPartial --url $clipperzUri.GetLeftPart([System.UriPartial]::Path)
    if ($LASTEXITCODE -ne 0) { throw "Download failed: $clipperzName (curl $LASTEXITCODE)" }
    if ((Get-FileHash -LiteralPath $clipperzPartial -Algorithm SHA256).Hash -ne $clipperzExpected) { throw "Download hash mismatch: $clipperzName" }
    # Both resolved files are inside the checked wheelhouse; no recursive move/delete.
    Move-Item -LiteralPath $clipperzPartial -Destination $clipperzDest
    Write-Output "Verified download $clipperzName"
}
Write-Output "All $($clipperzReport.install.Count) wheels verified."

