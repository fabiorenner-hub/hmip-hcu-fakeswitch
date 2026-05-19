$ErrorActionPreference = "Stop"

$version    = "1.1.0"
$imageTag   = "hmip-plugin-fake-switches:$version"
$outputFile = "hmip-plugin-fake-switches-$version.tar.gz"

Write-Host "==> Building ARM64 image: $imageTag"
docker buildx build --platform linux/arm64 --load -t $imageTag .
if ($LASTEXITCODE -ne 0) { throw "docker buildx build failed" }

Write-Host "==> Exporting to $outputFile"
$tarFile = "hmip-plugin-fake-switches-$version.tar"
docker save -o $tarFile $imageTag
if ($LASTEXITCODE -ne 0) { throw "docker save failed" }

$inStream  = [System.IO.File]::OpenRead($tarFile)
$outStream = [System.IO.File]::Create($outputFile)
$gz = New-Object System.IO.Compression.GZipStream($outStream, [System.IO.Compression.CompressionLevel]::Optimal)
$inStream.CopyTo($gz)
$gz.Dispose()
$outStream.Dispose()
$inStream.Dispose()
Remove-Item $tarFile

Write-Host ""
Write-Host "Done. Upload this file in the HCU web UI (Developer Mode enabled):"
Write-Host "  $(Resolve-Path $outputFile)"
