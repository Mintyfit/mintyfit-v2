@echo off
REM ============================================================================
REM  MintyFit v2 - Overnight Claude Code Runner (v4)
REM  - Loads SESSION-08 and SESSION-09 from external task folder
REM  - Tracks current session via CURRENT-SESSION.txt state file
REM  - Stops on failure sentinels, respects domain-cutover guard
REM ============================================================================

setlocal enabledelayedexpansion

set PROJECT_DIR=D:\WORKS\Minty\NewMintyAprill2026\AprillBuild
set TASKS_DIR=D:\WORKS\Minty\NewMintyAprill2026\New build tasks
set SESSION_08_FILE=%TASKS_DIR%\SESSION-08-ADMIN-BLOG-SEO.md
set SESSION_09_FILE=%TASKS_DIR%\SESSION-09-POLISH-DEPLOY.md

set LOG_FILE=%PROJECT_DIR%\overnight-log.txt
set OUTPUT_FILE=%PROJECT_DIR%\last-output.txt
set STATE_FILE=%PROJECT_DIR%\CURRENT-SESSION.txt
set LIMIT_WAIT_MINUTES=60
set NORMAL_WAIT_SECONDS=15
set MAX_RETRIES=20

cd /d "%PROJECT_DIR%"

echo. >> "%LOG_FILE%"
echo === OVERNIGHT BUILD STARTED %DATE% %TIME% === >> "%LOG_FILE%"
echo === OVERNIGHT BUILD STARTED ===

REM --- Verify task files exist before starting ---
if not exist "%SESSION_08_FILE%" (
    echo ERROR: SESSION-08 file not found at %SESSION_08_FILE% >> "%LOG_FILE%"
    echo ERROR: SESSION-08 file not found at %SESSION_08_FILE%
    goto :end
)
if not exist "%SESSION_09_FILE%" (
    echo ERROR: SESSION-09 file not found at %SESSION_09_FILE% >> "%LOG_FILE%"
    echo ERROR: SESSION-09 file not found at %SESSION_09_FILE%
    goto :end
)

REM --- Initialize state file if missing ---
if not exist "%STATE_FILE%" (
    echo 08> "%STATE_FILE%"
    echo [%TIME%] State file initialized to SESSION-08 >> "%LOG_FILE%"
)

set ATTEMPT=0

:retry
if !ATTEMPT! geq %MAX_RETRIES% (
    echo [%TIME%] Max retries reached. Stopping. >> "%LOG_FILE%"
    echo Max retries reached. Stopping.
    goto :end
)

REM --- Hard-stop sentinels BEFORE launching ---
if exist "%PROJECT_DIR%\OVERNIGHT-COMPLETE.md" (
    echo [%TIME%] OVERNIGHT-COMPLETE.md found. Done. >> "%LOG_FILE%"
    echo ALL TASKS COMPLETE!
    goto :end
)

if exist "%PROJECT_DIR%\knowledge\sessions\SESSION-08-FAILURE.md" (
    echo [%TIME%] SESSION-08-FAILURE.md found. Stopping per protocol. >> "%LOG_FILE%"
    echo SESSION-08 FAILED. Stopping. Check knowledge\sessions\SESSION-08-FAILURE.md
    goto :end
)

if exist "%PROJECT_DIR%\knowledge\sessions\SESSION-09-FAILURE.md" (
    echo [%TIME%] SESSION-09-FAILURE.md found. Stopping. >> "%LOG_FILE%"
    echo SESSION-09 FAILED. Stopping. Check knowledge\sessions\SESSION-09-FAILURE.md
    goto :end
)

REM --- Read current session from state file ---
set /p CURRENT_SESSION=<"%STATE_FILE%"
set CURRENT_SESSION=!CURRENT_SESSION: =!

if "!CURRENT_SESSION!"=="08" (
    set SESSION_FILE=%SESSION_08_FILE%
    set SESSION_LABEL=SESSION-08
) else if "!CURRENT_SESSION!"=="09" (
    set SESSION_FILE=%SESSION_09_FILE%
    set SESSION_LABEL=SESSION-09
) else if "!CURRENT_SESSION!"=="DONE" (
    echo [%TIME%] State is DONE. Finishing. >> "%LOG_FILE%"
    echo State DONE. Finishing.
    goto :end
) else (
    echo [%TIME%] Unknown state: !CURRENT_SESSION!. Stopping. >> "%LOG_FILE%"
    echo Unknown session state: !CURRENT_SESSION!. Stopping.
    goto :end
)

set /a ATTEMPT+=1
echo [%TIME%] Attempt !ATTEMPT! - working on !SESSION_LABEL! >> "%LOG_FILE%"
echo Attempt !ATTEMPT! - working on !SESSION_LABEL!

if exist "%OUTPUT_FILE%" del "%OUTPUT_FILE%"

claude "OVERNIGHT UNATTENDED RUN. You are working on !SESSION_LABEL!. Read the session file at: !SESSION_FILE!  Also read CLAUDE.md and CHECKPOINT.md in the project root for context. Execute the next incomplete task from !SESSION_LABEL!, verify it works (run 'next build' where relevant), update CHECKPOINT.md, write/update a wrap-up to knowledge/sessions/!SESSION_LABEL!-WRAPUP.md, commit and push to GitHub, then continue to the next task within !SESSION_LABEL!. HARD RULES: (1) Do NOT point mintyfit.com at the new Vercel project. Do NOT modify DNS for mintyfit.com. Do NOT assign mintyfit.com domain to mintyfit-v2 in Vercel. Only deploy to mintyfit-v2.vercel.app. If a step requires production domain cutover, SKIP it, mark DEFERRED in the wrap-up, continue with everything else. (2) If !SESSION_LABEL! is SESSION-08 and it fails at any step, write knowledge/sessions/SESSION-08-FAILURE.md with full error context and STOP - do not proceed. (3) When !SESSION_LABEL! is fully complete (all tasks done, build passing, committed and pushed), overwrite %STATE_FILE% with the literal text '09' if you just finished SESSION-08, or 'DONE' if you just finished SESSION-09. This advances the runner. (4) If everything across both sessions is done, also create OVERNIGHT-COMPLETE.md in the project root and stop." > "%OUTPUT_FILE%" 2>&1

REM --- Re-check sentinels AFTER run ---
if exist "%PROJECT_DIR%\OVERNIGHT-COMPLETE.md" (
    echo [%TIME%] ALL TASKS COMPLETE! >> "%LOG_FILE%"
    echo ALL TASKS COMPLETE!
    goto :end
)

if exist "%PROJECT_DIR%\knowledge\sessions\SESSION-08-FAILURE.md" (
    echo [%TIME%] SESSION-08-FAILURE.md created. Stopping. >> "%LOG_FILE%"
    echo SESSION-08 FAILED. Stopping.
    goto :end
)

if exist "%PROJECT_DIR%\knowledge\sessions\SESSION-09-FAILURE.md" (
    echo [%TIME%] SESSION-09-FAILURE.md created. Stopping. >> "%LOG_FILE%"
    echo SESSION-09 FAILED. Stopping.
    goto :end
)

REM --- Check if state advanced to DONE ---
set /p NEW_STATE=<"%STATE_FILE%"
set NEW_STATE=!NEW_STATE: =!
if "!NEW_STATE!"=="DONE" (
    echo [%TIME%] State file shows DONE. Finishing. >> "%LOG_FILE%"
    echo State DONE. Finishing.
    goto :end
)

REM --- Limit detection ---
findstr /I /C:"5-hour limit" /C:"usage limit reached" /C:"limit reached" /C:"try again at" /C:"rate limit" "%OUTPUT_FILE%" > nul
if !ERRORLEVEL! equ 0 (
    echo [%TIME%] Limit hit. Waiting %LIMIT_WAIT_MINUTES% minutes... >> "%LOG_FILE%"
    echo Limit hit. Waiting %LIMIT_WAIT_MINUTES% minutes...
    set /a WAIT_SECONDS=%LIMIT_WAIT_MINUTES%*60
    timeout /t !WAIT_SECONDS! /nobreak > nul
    goto :retry
)

REM --- Clean exit, brief pause then continue ---
echo [%TIME%] Claude exited. Continuing in %NORMAL_WAIT_SECONDS% sec... >> "%LOG_FILE%"
echo Claude exited. Continuing in %NORMAL_WAIT_SECONDS% sec...
timeout /t %NORMAL_WAIT_SECONDS% /nobreak > nul
goto :retry

:end
echo === OVERNIGHT BUILD FINISHED %DATE% %TIME% === >> "%LOG_FILE%"
echo === OVERNIGHT BUILD FINISHED ===
pause
