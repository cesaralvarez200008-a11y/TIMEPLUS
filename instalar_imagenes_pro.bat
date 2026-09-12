@echo off
chcp 65001 > nul
echo ========================================================
echo   TIMEPLUS PRO - Instalando Imagenes Anatomicas 3D
echo ========================================================
echo.

if not exist "assets\exercises" (
    mkdir "assets\exercises"
    echo [+] Carpeta assets\exercises creada.
)

echo [+] Copiando imagenes anatomicas de alta definicion...
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\bench_press_anatomy_*.jpg" "assets\exercises\press_plano.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\bench_press_anatomy_*.jpg" "assets\exercises\press_mancuernas.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\bench_press_anatomy_*.jpg" "assets\exercises\press_inclinado.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\bench_press_anatomy_*.jpg" "assets\exercises\aperturas_pecho.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\bench_press_anatomy_*.jpg" "assets\exercises\flexiones.jpg"

copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\squat_anatomy_*.jpg" "assets\exercises\sentadilla.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\squat_anatomy_*.jpg" "assets\exercises\estocadas.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\squat_anatomy_*.jpg" "assets\exercises\subidas_podio.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\squat_anatomy_*.jpg" "assets\exercises\prensa_inclinada.jpg"

copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\military_press_anatomy_*.jpg" "assets\exercises\press_militar.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\military_press_anatomy_*.jpg" "assets\exercises\elevaciones_laterales.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\military_press_anatomy_*.jpg" "assets\exercises\remo_menton.jpg"

copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\deadlift_anatomy_*.jpg" "assets\exercises\peso_muerto.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\deadlift_anatomy_*.jpg" "assets\exercises\remo_barra.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\deadlift_anatomy_*.jpg" "assets\exercises\remo_mancuerna.jpg"

copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\pullup_anatomy_*.jpg" "assets\exercises\dominadas.jpg"

copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\dips_anatomy_*.jpg" "assets\exercises\fondos_paralelas.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\dips_anatomy_*.jpg" "assets\exercises\fondos_banco.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\dips_anatomy_*.jpg" "assets\exercises\rompe_craneo.jpg"
copy /Y "C:\Users\Rafael Carvajal\.gemini\antigravity\brain\a43a149d-a4a8-4b12-878d-077e71121df0\dips_anatomy_*.jpg" "assets\exercises\extension_triceps.jpg"

echo.
echo [OK] Todas las imagenes anatomicas fueron instaladas exitosamente!
echo.
echo [+] Subiendo a GitHub...
git add -A
git commit -m "feat: instalar imagenes anatomicas 3D en assets/exercises"
git push
echo.
echo ========================================================
echo   TODO LISTO! 
echo   Ahora ve a tu navegador y presiona Ctrl + F5
echo ========================================================
pause
