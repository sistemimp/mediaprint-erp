(Get-Content -Raw backend/pubblica/dashboard.php) | % {  -replace '\r','<CR>' -replace '\n','<NL>' } | Write-Output
