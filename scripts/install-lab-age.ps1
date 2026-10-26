# Optional project-local, pinned tool for the invented-corpus rehearsal only.
# No PATH/global installation, owner key, Firebase login or production access.
$ErrorActionPreference = 'Stop'
if (-not $IsWindows -or [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString() -ne 'X64') {
    throw 'This pinned archive is for Windows x64 only; do not substitute an installer.'
}
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolDirectory = Join-Path $projectRoot '.firebase/tools/age-v1.3.2'
$executable = Join-Path $toolDirectory 'age/age.exe'
if (Test-Path -LiteralPath $toolDirectory) { throw 'Tool directory already exists; verify it instead of overwriting.' }
New-Item -ItemType Directory -Path $toolDirectory | Out-Null
$archive = Join-Path $toolDirectory 'age.zip'
Invoke-WebRequest -Uri 'https://github.com/FiloSottile/age/releases/download/v1.3.2/age-v1.3.2-windows-amd64.zip' -OutFile $archive
$expected = 'f48d8f8f9ebe903ab5027ed067652f2cc1db94bc206976430133b905dcd8e8c7'
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) {
    throw 'Official GitHub release archive SHA256 differs. Do not extract or execute.'
}
Expand-Archive -LiteralPath $archive -DestinationPath $toolDirectory
& $executable --version
if ($LASTEXITCODE -ne 0) { throw 'Pinned age tool did not execute.' }
