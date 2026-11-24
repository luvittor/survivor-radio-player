param(
  [switch]$ValidateOnly,
  [string]$ConfigPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$sshTarget = $null
$remoteArchive = $null
$localArchive = $null
$uploaded = $false

function Invoke-Checked {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command falhou com codigo $LASTEXITCODE."
  }
}

function Assert-RemotePath {
  param([string]$Value, [string]$Name)

  if ($Value -notmatch '^/[A-Za-z0-9._/-]+$' -or $Value.Split('/') -contains '..') {
    throw "$Name deve ser um caminho absoluto sem espacos ou caracteres de shell."
  }
}

Push-Location -LiteralPath $projectRoot
try {
  if (-not $ConfigPath) { $ConfigPath = Join-Path $PSScriptRoot 'deploy.local.json' }
  if (-not $ValidateOnly -or (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
    if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
      throw "Configuracao ausente: $ConfigPath. Copie scripts/deploy.example.json para scripts/deploy.local.json e preencha os valores."
    }
    $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
    foreach ($name in @('sshTarget', 'remotePlayerPath', 'remoteBackupRoot', 'remoteUploadDir', 'serviceName', 'playerUrl', 'statusUrl')) {
      if (-not ($config.PSObject.Properties.Name -contains $name) -or -not ($config.$name -is [string]) -or [string]::IsNullOrWhiteSpace($config.$name)) {
        throw "Configuracao obrigatoria ausente: $name"
      }
    }
    if ($config.sshTarget -notmatch '^[A-Za-z0-9_][A-Za-z0-9_.-]*@[A-Za-z0-9_][A-Za-z0-9_.-]*$') { throw 'sshTarget invalido.' }
    $sshTarget = $config.sshTarget
    Assert-RemotePath $config.remotePlayerPath 'remotePlayerPath'
    Assert-RemotePath $config.remoteBackupRoot 'remoteBackupRoot'
    Assert-RemotePath $config.remoteUploadDir 'remoteUploadDir'
    if ($config.serviceName -notmatch '^[A-Za-z0-9_.@-]+$') { throw 'serviceName invalido.' }
    foreach ($name in @('playerUrl', 'statusUrl')) {
      $uri = $null
      if (-not [Uri]::TryCreate($config.$name, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -notin @('http', 'https')) {
        throw "$name deve ser uma URL HTTP(S) absoluta."
      }
    }
    if (-not $config.playerUrl.EndsWith('/')) { throw 'playerUrl deve terminar com /.' }
  }

  $revision = (& git rev-parse --short HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel identificar a revisao Git.' }
  $changes = & git status --porcelain
  if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel verificar a working tree.' }
  $action = if ($ValidateOnly) { 'Validando' } else { 'Publicando' }
  if ($changes) {
    Write-Host "$action a working tree local (HEAD $revision, com alteracoes nao commitadas)."
  } else {
    Write-Host "$action a revisao $revision."
  }

  Invoke-Checked 'npm.cmd' @('run', 'test:all')
  Invoke-Checked 'npm.cmd' @('run', 'lint')
  Invoke-Checked 'npm.cmd' @('run', 'build')

  if ($ValidateOnly) {
    Write-Host 'Validacao concluida. Nenhum arquivo foi publicado.'
    return
  }

  Invoke-Checked 'ssh' @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', $sshTarget, 'hostname')

  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $archiveName = "deploy-$revision-$stamp-$PID.zip"
  $localArchive = Join-Path $projectRoot "test-results\$archiveName"
  $remoteArchive = $config.remoteUploadDir.TrimEnd('/') + '/' + $archiveName
  Compress-Archive -Path (Join-Path $projectRoot 'dist\*') -DestinationPath $localArchive -CompressionLevel Optimal
  $digest = (Get-FileHash -LiteralPath $localArchive -Algorithm SHA256).Hash.ToLowerInvariant()

  $uploaded = $true
  Invoke-Checked 'scp' @('-o', 'BatchMode=yes', $localArchive, "${sshTarget}:$remoteArchive")

  $remoteProgram = @'
from pathlib import Path, PurePosixPath
from datetime import datetime
import base64
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import zipfile

config = json.loads(base64.b64decode("__CONFIG_B64__"))
target = Path(config["remotePlayerPath"])
archive = Path(config["remoteArchive"])
expected = config["sha256"]
backup = Path(config["remoteBackupRoot"]) / datetime.now().strftime("%Y%m%d-%H%M%S-%f")

assert target.is_dir(), "Pasta do player ausente"
assert not Path(config["remoteBackupRoot"]).resolve().is_relative_to(target.resolve()), "Backup dentro do player"
assert not Path(config["remoteUploadDir"]).resolve().is_relative_to(target.resolve()), "Upload dentro do player"
assert os.stat(target).st_dev == os.stat(config["remoteUploadDir"]).st_dev, "Upload e player em sistemas de arquivos diferentes"
assert hashlib.sha256(archive.read_bytes()).hexdigest() == expected, "Hash do ZIP divergente"
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None, "ZIP corrompido"
    names = z.namelist()
    assert names and all(
        n and not n.startswith("/") and "\\" not in n and ":" not in n
        and ".." not in PurePosixPath(n).parts for n in names
    ), "Caminho invalido no ZIP"
    with tempfile.TemporaryDirectory(prefix="player-deploy-", dir=config["remoteUploadDir"]) as temp:
        temp = Path(temp)
        stage = temp / "new"
        old = temp / "old"
        stage.mkdir()
        old.mkdir()
        z.extractall(stage)
        assert (stage / "index.html").is_file(), "index.html ausente"
        assets = list((stage / "assets").iterdir())
        assert assets and all(asset.is_file() for asset in assets), "Assets ausentes"

        backup.mkdir(parents=True, exist_ok=False)
        shutil.copytree(target, backup / "player")
        try:
            for entry in target.iterdir():
                os.replace(entry, old / entry.name)
            for entry in stage.iterdir():
                if entry.is_dir():
                    shutil.copytree(entry, target / entry.name)
                else:
                    shutil.copy2(entry, target / entry.name)
            for entry in stage.rglob("*"):
                if entry.is_file():
                    relative = entry.relative_to(stage)
                    assert hashlib.sha256(entry.read_bytes()).digest() == hashlib.sha256(
                        (target / relative).read_bytes()
                    ).digest(), f"Arquivo divergente: {relative}"
            assert subprocess.run(
                ["systemctl", "is-active", "--quiet", config["serviceName"]]
            ).returncode == 0, "Servico inativo"
            with urllib.request.urlopen(config["playerUrl"], timeout=10) as response:
                assert response.status == 200 and response.read() == (stage / "index.html").read_bytes()
            for asset in assets:
                with urllib.request.urlopen(
                    config["playerUrl"] + "assets/" + asset.name, timeout=10
                ) as response:
                    assert response.status == 200 and response.read() == asset.read_bytes()
            with urllib.request.urlopen(config["statusUrl"], timeout=10) as response:
                assert response.status == 200 and isinstance(json.load(response), dict)
        except BaseException:
            for entry in list(target.iterdir()):
                if entry.is_dir():
                    shutil.rmtree(entry)
                else:
                    entry.unlink()
            for entry in (backup / "player").iterdir():
                if entry.is_dir():
                    shutil.copytree(entry, target / entry.name)
                else:
                    shutil.copy2(entry, target / entry.name)
            print(f"Publicacao revertida; backup: {backup / 'player'}", file=sys.stderr)
            raise

print(json.dumps({"status": "deployed", "backup": str(backup / "player"),
                  "assets": [asset.name for asset in assets], "service": "active"}))
'@
  $remoteConfig = @{
    remotePlayerPath = $config.remotePlayerPath
    remoteBackupRoot = $config.remoteBackupRoot
    remoteUploadDir = $config.remoteUploadDir
    remoteArchive = $remoteArchive
    serviceName = $config.serviceName
    playerUrl = $config.playerUrl
    statusUrl = $config.statusUrl
    sha256 = $digest
  } | ConvertTo-Json -Compress
  $configBytes = [Text.Encoding]::UTF8.GetBytes($remoteConfig)
  $configBase64 = [Convert]::ToBase64String($configBytes)
  $remoteProgram = $remoteProgram.Replace('__CONFIG_B64__', $configBase64)
  $result = $remoteProgram | & ssh -o BatchMode=yes $sshTarget 'python3 -'
  if ($LASTEXITCODE -ne 0) { throw 'A publicacao falhou; confira a saida do Survivor e o backup.' }
  $result | Write-Output
} finally {
  if ($uploaded) {
    & ssh -o BatchMode=yes $sshTarget "rm -- $remoteArchive"
    if ($LASTEXITCODE -ne 0) { Write-Warning "Nao foi possivel remover o ZIP remoto: $remoteArchive" }
  }
  if ($localArchive -and (Test-Path -LiteralPath $localArchive)) {
    Remove-Item -LiteralPath $localArchive
  }
  Pop-Location
}
