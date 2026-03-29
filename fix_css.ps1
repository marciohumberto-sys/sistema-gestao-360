$path = 'c:\Users\marci\OneDrive\Documentos\Antigravity\GPI\src\pages\Dashboard.css'
$content = Get-Content $path
$newContent = $content[0..1529]
$newContent += '    background: rgba(16, 185, 129, 0.1);'
$newContent += '    color: #10B981;'
$newContent += '}'
$newContent += ''
$newContent += '@keyframes dash { to { stroke-dashoffset: 0; } }'
$newContent | Set-Content $path -Encoding UTF8
