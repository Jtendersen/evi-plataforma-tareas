# Autoevaluación (V1)

Fecha: 15/11/2026. Se marca el nivel que hoy se puede sostener con evidencia, no el que se aspira a alcanzar.

| Criterio | Nivel | Qué falta para subir |
|---|---|---|
| Despliegue reproducible | En proceso | Probarlo en otra computadora para llegar a Logrado |
| Persistencia y recuperación | Logrado | Medir la recuperación con más datos para Destacado |
| Red y exposición | Logrado | Probar el acceso desde otro equipo para Destacado |
| Seguridad básica | Destacado | Nada pendiente |
| Evidencias y bitácora | Logrado | Sumar la trazabilidad de la devolución cuando exista (V2) |
| Uso documentado de la IA | Logrado | Nada pendiente |
| Transferencia | Sin nivel todavía | Depende de la prueba en otra PC |

## Despliegue reproducible: En proceso

- **Evidencia:** `README.md` (requisitos, pasos, puertos, solución de problemas). Todas las imágenes y dependencias con versión exacta y `package-lock.json` con `npm ci`. Se clonó el repo en una carpeta nueva y se desplegó siguiendo el README, sin pasos ocultos: servicios `healthy`, base vacía, backup y restore funcionando.
- **Por qué no es Logrado:** el criterio exige que lo reconstruya otra persona o en otra computadora. La prueba se hizo en la misma PC, con su caché de imágenes y de Docker, y con otro nombre de proyecto y otros puertos por convivir con el stack en uso.
- **Límite conocido:** `apk upgrade` en los Dockerfiles propios hace que un build dependa de la fecha (ver `docs/decisiones.md`).

## Persistencia y recuperación: Logrado

- **Evidencia:** conservación: `down` y `up` sin `-v`, volumen `tareas_db_data` intacto y datos idénticos byte a byte. Recuperación: `backup.sh`, y `restore.sh` en un proyecto paralelo con otro volumen y otros puertos, con la secuencia de ids continuando (siguiente id 5). Se distingue conservar (volumen) de recuperar (backup).
- **Capturas:** `docs/evidencias/05` y `06` (conservación) y `08`, `09` y `10` (backup, eliminación de una tarea, restauración y tarea recuperada tras recargar).
- **Elementos de Destacado ya presentes:** medición (330 ms), qué datos se pueden perder (lo posterior al último backup), límites del respaldo (mismo disco, sin cifrar, manual) y mejoras posibles, en `docs/decisiones.md`.
- **Salvedad:** la medición es sobre 3 filas, y el "otro entorno" fue la misma computadora. Para sostener Destacado conviene repetirla con más filas y en otra PC.

## Red y exposición: Logrado

- **Evidencia:** diagrama y tabla de servicios en el README. Red `backend`, resolución por nombre (`db`, `api`). Todos los puertos publicados en `127.0.0.1` (se comprobó con `docker compose ps`). `docs/decisiones.md` explica la exposición y cómo cambiaría para abrirla a la red.
- **Por qué no Destacado:** distinguir accesos locales y remotos "al trasladar a otra computadora" no se probó desde otro equipo.

## Seguridad básica: Destacado

- **Evidencia:** `.env.example` ficticio; `.env` en `.gitignore`; se verificó que ninguna clave real está en el historial de git ni en archivos versionados. Datos de prueba. Servicios sin root (API `node`, web `nginx`, Adminer sin privilegios; PostgreSQL arranca como root para inicializar y el servidor corre como `postgres`).
- **Riesgos abiertos con mitigaciones:** vulnerabilidades de las imágenes de terceros (análisis con Trivy antes y después), falta de autenticación y de TLS, respaldo sin cifrar. Todo en `docs/decisiones.md`.

## Evidencias y bitácora: Logrado

- **Evidencia:** `docs/bitacora.md` con dos decisiones, autoría y prueba propia con esperado, observado y conclusión. Capturas en `docs/evidencias/`: tablero (01), las dos pruebas de la bitácora (02 y 03), servicios `healthy` (04), persistencia antes y después de `down`/`up` (05 y 06), Adminer (07) y el ciclo de backup, eliminación y restauración (08 a 10).
- **Pendiente:** la trazabilidad de la devolución a V2 no puede existir todavía, porque aún no hubo devolución.

## Uso documentado de la IA: Logrado

- **Evidencia:** herramienta y modelo, qué fue mío y qué de la IA, y por decisión: consulta, respuesta relevante, qué se aceptó y descartó, razones y prueba propia. Se registran errores de la respuesta (healthcheck con `localhost`, arrastre dicho y no implementado) y que la causa del healthcheck no se encontró por cuenta propia.
## Transferencia: sin nivel todavía

No se puede marcar un nivel sin haber desplegado en otra computadora. **Material disponible:** problemas de portabilidad ya encontrados y resueltos (puertos ocupados por otro PostgreSQL y por Steam, finales de línea CRLF en scripts al clonar en Windows, healthcheck por IPv6), y dos decisiones con comprobación propia.
