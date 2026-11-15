$utf8 = New-Object System.Text.UTF8Encoding($false)
$em = [string][char]0x2014
$tick = [string][char]0x2713

function Edit-File($path, $change) {
    $full = (Resolve-Path $path).Path
    $text = [System.IO.File]::ReadAllText($full, $utf8)
    $new = & $change $text
    if ($new -ne $text) {
        [System.IO.File]::WriteAllText($full, $new, $utf8)
        Write-Host "Updated $path"
    }
}

$iconDiv = '\s*<div class="(summary-icon|progress-icon|empty-icon|evaluation-icon|profile-avatar|feature-icon|notification-icon)">[^<]*</div>'
$iconSpan = '\s*<span>[^\w<]+</span>(?=\s*<h3>)'

Get-ChildItem pages\*.html, index.html | ForEach-Object {
    Edit-File $_.FullName {
        param($t)
        $t = [regex]::Replace($t, $iconDiv, '')
        $t = [regex]::Replace($t, $iconSpan, '')
        $t = $t.Replace(" $em ", ", ")
        $t
    }
}

Edit-File "js\main.js" {
    param($t)
    $t = [regex]::Replace($t, $iconDiv, '')
    $t = $t.Replace(" $em ", ", ")
    $t = $t.Replace("`"$em`"", '""')
    $t = $t.Replace(" $tick", "")
    $t
}