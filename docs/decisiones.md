# Decisiones técnicas

## Stack

| Componente | Elección | Justificación | Alternativa descartada |
|---|---|---|---|
| API | Node.js 22 + Express 5 | Mismo lenguaje que el frontend previo; solo dos dependencias (`express`, `pg`) | Flask/FastAPI: igual de válidas, pero implicaban cambiar de lenguaje |
| Base de datos | PostgreSQL 16 | Restricciones `CHECK` para validar estados en la base; `pg_dump` incluido para respaldos | MySQL/MariaDB: válidas, sin ventaja para este caso |
| Frontend | HTML, CSS y JS sin framework, servido por nginx | Un tablero de tres columnas no justifica un build; menos piezas que explicar y desplegar | React + Vite: añade Node y un build multi-etapa sin aportar al objetivo del TP |
| Admin | Adminer | Contenedor liviano que acompaña al stack, sin instalar nada en el host | pgAdmin: más pesado. DBeaver se usa en el equipo del autor vía `127.0.0.1:5440` |
| Imágenes base | Variantes `alpine` | Menor tamaño y menos paquetes | Debian: imagen bastante más grande (no medida en este proyecto); Alpine usa musl, sin impacto aquí porque `pg` es JavaScript puro |

Todas las imágenes y dependencias tienen versión exacta (no `latest`) y `package-lock.json` con `npm ci`, para que un build futuro parta de las mismas versiones.

## Dockerfiles

- **Orden de capas:** primero `package.json` y `package-lock.json` y la instalación de dependencias; después el código. Si solo cambia el código, Docker reutiliza la capa de dependencias.
- **Sin privilegios:** la API corre como `node` (uid 1000) y nginx como `nginx` (uid 101, imagen `nginx-unprivileged`, que escucha en 8080 porque un usuario sin privilegios no puede usar el 80). Si se explotara una vulnerabilidad, el atacante queda sin root dentro del contenedor.
- **Forma exec en `CMD`:** Node es el PID 1 y recibe `SIGTERM` directamente.
- **`HEALTHCHECK`:** la API consulta `/health`, que ejecuta `SELECT 1`; así "healthy" implica que la base responde. El chequeo de `web` usa `127.0.0.1` y no `localhost`, porque dentro del contenedor `localhost` resuelve a IPv6 y nginx escucha solo en IPv4 (error real encontrado durante las pruebas).
- **`.dockerignore`:** evita copiar `node_modules` y `.env` al contexto de build.
- **`EXPOSE` no publica puertos**, solo documenta; la publicación la hace `ports:` en el compose.

## Red y exposición

- Red bridge propia `backend`: los servicios se resuelven por nombre mediante el DNS interno de Docker.
- **Todos los puertos publicados escuchan en `127.0.0.1`**, no en `0.0.0.0`. Con esto, otro equipo de la red no puede llegar a la base, a Adminer ni a la API. Para exponer la aplicación a la red local habría que cambiar el bind de `web` a `0.0.0.0` (o quitar el prefijo), y se debería añadir TLS y autenticación, que este proyecto no tiene.
- Puertos del host elegidos: 8082 (web), 3000 (API), 8081 (Adminer), 5440 (PostgreSQL). Se evitaron 5432/5433 (PostgreSQL local del equipo de desarrollo) y 8080 (Steam). Son variables en `.env`.
- La API está publicada para poder probarla con curl o Postman. El navegador no la necesita, porque nginx reenvía `/api/`. Quitar ese puerto reduciría la superficie expuesta; se mantiene por comodidad de prueba.
- Orden de arranque: `depends_on` con `condition: service_healthy` hace que la API y Adminer esperen a que PostgreSQL esté listo; además la API reintenta la conexión al iniciar.

## Persistencia y recuperación

| Tema | Detalle |
|---|---|
| Volumen | Volumen con nombre `db_data` en `/var/lib/postgresql/data`; sobrevive a `docker compose down` y solo se borra con `down -v` |
| Respaldo | `pg_dump --clean --if-exists` en formato SQL plano: legible, auditable y portable. El script falla si el archivo queda vacío |
| Restauración | `psql` con `ON_ERROR_STOP`: corta ante el primer error |
| Medición | Restauración de 3 filas (2.922 bytes) en un entorno vacío: 330 ms. Es una medida con pocos datos y no se extrapola a volúmenes grandes |
| Límites | Respaldo manual: se pierde lo escrito después del último backup. El respaldo queda en el mismo disco que el volumen. No está cifrado |
| Mejoras posibles | Programar el backup, copiarlo fuera del equipo, cifrarlo y verificar periódicamente que restaura |

## Seguridad

- Credenciales fuera del repositorio: `.env` está en `.gitignore`; se entrega `.env.example` con valores ficticios.
- La API usa consultas parametrizadas (sin concatenar SQL) y valida estados y prioridades; el frontend inserta datos con `textContent`, no `innerHTML`, para evitar XSS.
- La base y los servicios no se exponen fuera del equipo (ver Red y exposición).

### Análisis de vulnerabilidades de las imágenes

Escáner: Trivy 0.76.2 (contenedor), sobre las imágenes exportadas a `.tar`, severidades CRITICAL y HIGH, base de datos de vulnerabilidades al 14/11/2026. `docker scout` no se usó porque requiere iniciar sesión.

| Imagen | Antes | Después | Origen |
|---|---|---|---|
| `tareas-api` | 1 crítica, 17 altas | 0 / 0 | 13 en paquetes internos de `npm` (no del código de la app) y 5 del sistema (openssl, musl, zlib) |
| `tareas-web` | 1 crítica, 12 altas | 0 / 0 | Paquetes del sistema Alpine (expat, xslt, brotli, curl, musl, zlib) |
| `postgres:16.16-alpine3.24` | 1 crítica, 25 altas | Sin cambio | Biblioteca estándar de Go dentro del binario `gosu` de la imagen |
| `adminer:6.3.0` | 0 críticas, 38 altas | Sin cambio | `libpq` del sistema |

Mitigaciones aplicadas a las imágenes propias:

1. `apk upgrade` durante el build, que instala las correcciones publicadas para el sistema base.
2. En la API, se elimina `npm` de la imagen final: solo se usa para instalar dependencias y ninguna de las vulnerabilidades de paquetes Node estaba en `express` ni `pg`. Un `npm audit` de la app dio 0.

Riesgos abiertos:

- Las imágenes oficiales de PostgreSQL y Adminer se usan en su último tag disponible; las vulnerabilidades se resuelven cuando sus mantenedores publiquen una versión nueva. Se aceptan porque ambos servicios solo escuchan en `127.0.0.1` y no procesan entradas de usuarios externos. Mitigación: revisar nuevas versiones y repetir el análisis.
- `apk upgrade` hace que el resultado de un build dependa de la fecha en que se ejecuta, aun con el tag de la base fijo. Se priorizó la seguridad sobre la reproducibilidad exacta de los paquetes del sistema. Alternativa: fijar el digest de la imagen base y actualizarlo de forma deliberada.
- No hay autenticación en la API ni en la web, ni TLS. Es aceptable mientras todo escuche en `127.0.0.1`, y dejaría de serlo si se expusiera a la red.
- El escaneo es una foto del 14/11/2026; las vulnerabilidades se publican a diario.
