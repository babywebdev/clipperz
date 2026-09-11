$ErrorActionPreference = 'Stop'
$clipperzProject = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$clipperzModelDir = Join-Path $clipperzProject '_local\clipperz\data\cache\whisper'
$clipperzModelPath = [IO.Path]::GetFullPath((Join-Path $clipperzModelDir 'base.pt'))
$clipperzPartialPath = $clipperzModelPath + '.part'
if (-not $clipperzModelPath.StartsWith($clipperzModelDir + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unexpected model destination' }
# URL and digest read from the SHA-256-verified Whisper 20250625 source archive.
$clipperzModelHash = 'ed3a0b6b1c0edf879ad9b11b1af5a0e6ab5db9205f891f668f8b0e6c6326e34e'
$clipperzModelUrl = 'https://openaipublic.azureedge.net/main/whisper/models/ed3a0b6b1c0edf879ad9b11b1af5a0e6ab5db9205f891f668f8b0e6c6326e34e/base.pt'
New-Item -ItemType Directory -Path $clipperzModelDir -Force | Out-Null
if (-not (Test-Path -LiteralPath $clipperzModelPath)) {
    & 'C:\Windows\System32\curl.exe' --disable --fail --location --proto '=https' --proto-redir '=https' --continue-at - --retry 3 --connect-timeout 30 --speed-limit 1024 --speed-time 90 --silent --show-error --output $clipperzPartialPath --url $clipperzModelUrl
    if ($LASTEXITCODE -ne 0) { throw "Model download failed (curl $LASTEXITCODE)" }
    if ((Get-FileHash -LiteralPath $clipperzPartialPath -Algorithm SHA256).Hash -ne $clipperzModelHash) { throw 'Model SHA-256 mismatch' }
    # Both resolved paths are within the checked model cache; no recursive action.
    Move-Item -LiteralPath $clipperzPartialPath -Destination $clipperzModelPath
}
if ((Get-FileHash -LiteralPath $clipperzModelPath -Algorithm SHA256).Hash -ne $clipperzModelHash) { throw 'Cached model SHA-256 mismatch' }
$clipperzModelRecord = [pscustomobject]@{Model='base';Source=$clipperzModelUrl;SHA256=$clipperzModelHash;Path=$clipperzModelPath;Bytes=(Get-Item -LiteralPath $clipperzModelPath).Length}
$clipperzModelRecord | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $clipperzModelDir 'whisper-model.json') -Encoding utf8
$clipperzModelRecord | ConvertTo-Json
