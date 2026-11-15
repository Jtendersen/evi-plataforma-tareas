# Bitácora

**Autor:** Juan Manuel Tierno · **Fecha:** 14/11/2026 · **Proyecto:** plataforma de tareas con Docker Compose

## Origen del proyecto

Tomé una lista de tareas que había hecho en 2022 (HTML, CSS y JS, sin backend, publicada en https://jtendersentodolist.netlify.app/; el repositorio original se perdió) y la actualicé y dockericé para darle más contexto: API, PostgreSQL con persistencia, estados Kanban y orquestación con Compose.

## Uso de IA

Herramienta: Claude Code (modelo Claude Sonnet 5.5).

- **Mío:** la idea de partir de mi To Do, el contexto (tablero Kanban de una pyme), la elección del stack (Node + Express, PostgreSQL, frontend sin framework, Adminer más DBeaver) y el avance paso a paso: pedí que me explicara cada uno antes de ejecutarlo por mi cuenta.
- **De la IA:** propuso la arquitectura y escribió la API en función de la aplicación funcionando que teniamos, revision de borradores de Dockerfiles y del `docker compose`, los scripts de backup y restore y la documentación, y ejecutó las pruebas de la sesión.
- **Revisión:** probé la interfaz y detecté un error de la respuesta (ver decisión 2). Los resultados de las pruebas propias de cada decisión están marcados como tales.

## Decisión 1: puertos publicados

- **Consulta:** armar el compose con la base accesible desde DBeaver, que ya uso.
- **Respuesta relevante:** publicar PostgreSQL en `127.0.0.1:5432` y el frontend en el 8080. Al levantar falló con `ports are not available ... forbidden by its access permissions`, mensaje que sugiere un problema de permisos de Windows. La causa real era otra: en mi PC ya corre un PostgreSQL local en 5432 y 5433, y Steam usa el 8080 (se diagnosticó con `Get-NetTCPConnection`).
- **Aceptado:** publicar solo en `127.0.0.1` y poner los puertos en variables de `.env`. **Descartado:** 5432, 5433 y 8080; quedaron 5440 (base) y 8082 (web).
- **Prueba propia:** `Get-NetTCPConnection -LocalPort 5432 -State Listen` (PowerShell), y luego `docker run --rm -p 127.0.0.1:5432:5432 alpine true` y `docker run --rm -p 127.0.0.1:5441:5432 alpine true`.
  - Esperado: el 5432 aparece en estado `Listen` y Docker no puede publicarlo; con el 5441 (libre) el comando termina sin error.
  - Observado: `Get-NetTCPConnection` muestra algo escuchando en el 5432 (en `::` y en `0.0.0.0`). Con el 5432, Docker respondió `ports are not available: exposing port TCP 127.0.0.1:5432 -> 127.0.0.1:0: listen tcp4 127.0.0.1:5432: bind: An attempt was made to access a socket in a way forbidden by its access permissions`. Con el 5441 el comando no devolvió nada, es decir, no hubo error.
  - Conclusión: el mensaje habla de permisos, pero el error sale del bind porque el puerto ya está ocupado: el mismo comando funciona con un puerto libre. Por eso los puertos del host van en variables de `.env`.

## Decisión 2: errores detectados al revisar los Dockerfiles y el compose

- **Consulta:** comprobar que el stack funcionaba de verdad, y no solo que las imágenes se construyeran.
- **Respuesta relevante:** la IA entregó el Dockerfile del frontend con un `HEALTHCHECK` que consultaba `http://localhost:8080/`. Al revisar `docker compose ps` apareció `web` como `unhealthy` aunque la página abría. Con `docker inspect` se vio `Connection refused`: dentro del contenedor `localhost` resuelve a IPv6 (`::1`) y nginx escucha solo en IPv4. También se detectó que los scripts `.sh` llegarían con finales de línea CRLF al clonar en Windows, lo que los rompería.
- **Aceptado:** el healthcheck pasó a usar `127.0.0.1`, y se agregó un `.gitattributes` que fuerza LF en scripts, Dockerfiles y archivos de configuración. **Descartado:** dar el servicio por bueno porque la web abría.
- **Otro error de la respuesta:** la IA dijo que las tarjetas se podían arrastrar cuando solo había un selector de estado. Lo noté yo al probar la interfaz y se implementó después.
- **Prueba propia:** `docker compose exec web wget -O /dev/null http://localhost:8080/` y luego lo mismo con `http://127.0.0.1:8080/`.
  - Esperado: con `localhost` falla con `Connection refused`; con `127.0.0.1` responde.
  - Observado: con `localhost`, `wget` mostró `Connecting to localhost:8080 ([::1]:8080)` y `wget: can't connect to remote host: Connection refused`. Con `127.0.0.1` se conectó y guardó la página (1823 bytes).
  - Conclusión: dentro del contenedor `localhost` se resuelve a la dirección IPv6 `::1`, y nginx solo escucha en IPv4, por eso el chequeo fallaba aunque el servicio funcionaba. No pude llegar a la causa por mi cuenta: la explicación surgió consultando con la IA, y la comprobé reproduciendo yo el error.
