@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Smart Point - Correction Previews WEBP

echo.
echo ============================================================
echo       SMART POINT - CORRECTION PREVIEWS WEBP
echo ============================================================
echo.

set "APP=C:\SMART POINT\app"
set "PREVIEW_SOURCE=C:\Users\USER\Pictures\base\Preview"
set "PUBLIC=%APP%\public"
set "PREVIEW_DEST=%PUBLIC%\previews"

if not exist "%APP%" (
    echo [ERREUR] Le dossier du projet n'existe pas :
    echo %APP%
    echo.
    pause
    exit /b 1
)

cd /d "%APP%"

echo [1/8] Verification du projet...
echo Projet : %APP%
echo.

if not exist "%APP%\src\lib\catalog.ts" (
    echo [ERREUR] src\lib\catalog.ts introuvable.
    pause
    exit /b 1
)

if not exist "%APP%\src\components\template-card.tsx" (
    echo [ERREUR] src\components\template-card.tsx introuvable.
    pause
    exit /b 1
)

echo [OK] Fichiers principaux trouves.
echo.

echo [2/8] Creation de la sauvegarde...

for /f "tokens=1-4 delims=/ " %%a in ("%date%") do set "DATESTAMP=%%a-%%b-%%c"
set "BACKUP=%APP%\BACKUP_PREVIEWS_%RANDOM%"

mkdir "%BACKUP%" >nul 2>&1

copy /Y "%APP%\src\lib\catalog.ts" "%BACKUP%\catalog.ts.bak" >nul
copy /Y "%APP%\src\components\template-card.tsx" "%BACKUP%\template-card.tsx.bak" >nul
copy /Y "%APP%\src\routes\index.tsx" "%BACKUP%\index.tsx.bak" >nul 2>nul

echo [OK] Sauvegarde :
echo %BACKUP%
echo.

echo [3/8] Modification de catalog.ts...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$p='src/lib/catalog.ts'; ^
$s=Get-Content -Raw -LiteralPath $p; ^
$s=$s -replace '(?m)^import preview1 from .*?\r?\n',''; ^
$s=$s -replace '(?m)^import preview2 from .*?\r?\n',''; ^
$s=$s -replace '(?m)^import preview3 from .*?\r?\n',''; ^
$s=$s -replace '(?m)^import preview4 from .*?\r?\n',''; ^
$s=$s -replace '(?m)^\s*preview_variant:\s*number;\r?\n',''; ^
$s=$s -replace '(?s)export const PREVIEWS = \[preview1, preview2, preview3, preview4\];\r?\n\r?\nexport function previewFor\(variant: number\) \{\r?\n.*?\r?\n\}\r?\n',''; ^
$fn='export function previewFor(template: Template): string {'+[Environment]::NewLine+'  const code = template.code.trim();'+[Environment]::NewLine+'  return `/previews/${encodeURIComponent(code)}.webp`;'+[Environment]::NewLine+'}'+[Environment]::NewLine; ^
$marker='export type SortKey = \"recent\" | \"name\" | \"slides\";'; ^
$s=$s.Replace($marker,$fn+[Environment]::NewLine+$marker); ^
Set-Content -LiteralPath $p -Value $s -Encoding UTF8"

if errorlevel 1 (
    echo [ERREUR] Impossible de modifier catalog.ts
    pause
    exit /b 1
)

echo [OK] catalog.ts corrige.
echo.

echo [4/8] Modification de template-card.tsx...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$p='src/components/template-card.tsx'; ^
$s=Get-Content -Raw -LiteralPath $p; ^
$s=$s.Replace('previewFor(template.preview_variant)','previewFor(template)'); ^
Set-Content -LiteralPath $p -Value $s -Encoding UTF8"

if errorlevel 1 (
    echo [ERREUR] Impossible de modifier template-card.tsx
    pause
    exit /b 1
)

echo [OK] template-card.tsx corrige.
echo.

echo [5/8] Creation du dossier public\previews...
echo.

if not exist "%PUBLIC%" mkdir "%PUBLIC%"
if not exist "%PREVIEW_DEST%" mkdir "%PREVIEW_DEST%"

echo [OK] Destination :
echo %PREVIEW_DEST%
echo.

echo [6/8] Copie des previews WEBP...
echo.

if not exist "%PREVIEW_SOURCE%" (
    echo [ATTENTION] Le dossier source des WEBP n'existe pas :
    echo %PREVIEW_SOURCE%
    echo.
    echo Le code est quand meme corrige.
    echo Les WEBP devront ensuite etre places dans :
    echo %PREVIEW_DEST%
    echo.
) else (
    set "COUNT=0"

    for /R "%PREVIEW_SOURCE%" %%F in (*.webp) do (
        copy /Y "%%F" "%PREVIEW_DEST%\" >nul
        set /a COUNT+=1
    )

    echo [OK] !COUNT! fichiers WEBP copies.
    echo.
)

echo [7/8] Correction des mentions 5 000 templates...
echo.

if exist "%APP%\src\routes\index.tsx" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$p='src/routes/index.tsx'; ^
    $s=Get-Content -Raw -LiteralPath $p; ^
    $s=$s.Replace('more than 5,000 professional PowerPoint templates','347+ professional PowerPoint templates'); ^
    $s=$s.Replace('more than 5,000 templates designed to help you create','347+ templates designed to help you create'); ^
    Set-Content -LiteralPath $p -Value $s -Encoding UTF8"
)

echo [OK] Texte du dashboard mis a jour.
echo.

echo [8/8] Verification des anciennes references...
echo.

echo ------------------------------------------------------------
echo Recherche preview-1.jpg / preview-2.jpg / preview-3.jpg
echo preview-4.jpg
echo ------------------------------------------------------------

findstr /S /I /N /C:"preview-1.jpg" "%APP%\src\*.ts" "%APP%\src\*.tsx" 2>nul
findstr /S /I /N /C:"preview-2.jpg" "%APP%\src\*.ts" "%APP%\src\*.tsx" 2>nul
findstr /S /I /N /C:"preview-3.jpg" "%APP%\src\*.ts" "%APP%\src\*.tsx" 2>nul
findstr /S /I /N /C:"preview-4.jpg" "%APP%\src\*.ts" "%APP%\src\*.tsx" 2>nul

echo.
echo ------------------------------------------------------------
echo Recherche preview_variant
echo ------------------------------------------------------------

findstr /S /I /N /C:"preview_variant" "%APP%\src\*.ts" "%APP%\src\*.tsx" 2>nul

echo.
echo ------------------------------------------------------------
echo Verification des WEBP
echo ------------------------------------------------------------

if exist "%PREVIEW_DEST%\001BC.webp" (
    echo [OK] 001BC.webp trouve.
) else (
    echo [ATTENTION] 001BC.webp non trouve dans public\previews.
)

echo.
echo ============================================================
echo              LANCEMENT DU BUILD
echo ============================================================
echo.

where bun >nul 2>&1

if errorlevel 1 (
    echo [ERREUR] Bun n'est pas trouve dans le PATH.
    echo.
    echo Essaie manuellement :
    echo cd /d "C:\SMART POINT\app"
    echo bun run build
    echo.
    pause
    exit /b 1
)

bun run build

echo.
echo ============================================================

if errorlevel 1 (
    echo [BUILD] ECHEC
    echo.
    echo La correction des previews est terminee,
    echo mais il reste au moins une erreur de build.
    echo.
    echo Sauvegarde disponible ici :
    echo %BACKUP%
) else (
    echo [BUILD] SUCCES !
    echo.
    echo Le systeme WEBP est maintenant prepare.
    echo.
    echo Les previews sont attendues sous :
    echo %PREVIEW_DEST%
)

echo ============================================================
echo.
pause
endlocal