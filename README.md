# Melodía Secreta

Juego web para adivinar canciones con 6 intentos. Mantiene el reproductor oficial de YouTube IFrame API y transmite el audio desde YouTube: el proyecto no descarga ni aloja archivos musicales.

## Qué se mejoró

- Catálogo dinámico desde YouTube Data API v3, con búsqueda de videos musicales incrustables.
- Catálogo combinado con `data/songs.json` para que el juego siga funcionando si el servicio remoto no está configurado o falla.
- Caché en el navegador durante 24 horas y caché en el backend. Se recomienda Cloudflare KV para que el catálogo cacheado se comparta entre regiones y no se repitan búsquedas de YouTube.
- Deduplicación por ID de video y por título/artista normalizados.
- Historial de canciones vistas limitado a 5.000 identificadores en el almacenamiento local.
- Menos consultas al reproductor por segundo (5 en vez de 20), sin cambiar la lógica de los fragmentos.
- Frontend estático apto para GitHub Pages y backend independiente en Cloudflare Workers.

## Desarrollo local

Requiere Node.js y npm:

```bash
npm install
npm run typecheck
npm run build
npm start
```

Abrí `http://localhost:5500`. Si no configurás el endpoint del catálogo, el juego usa las canciones de `data/songs.json`.

## Publicar gratis

### 1. Crear la clave de YouTube

1. Entrá a Google Cloud Console y creá un proyecto.
2. Habilitá **YouTube Data API v3**.
3. Creá una API key. Restringila a YouTube Data API v3 y, si corresponde, establecé límites de cuota.
4. No pongas esa clave en `index.html`, en TypeScript ni en ningún archivo del frontend.

La API de búsqueda consume cuota. El Worker hace una búsqueda por cada consulta temática al renovar el catálogo (hasta 9 consultas, 100 unidades por búsqueda, según las cuotas actuales del proyecto). La caché persistente reduce las renovaciones repetidas.

### 2. Publicar el backend en Cloudflare Workers

Desde una terminal, dentro de la carpeta `worker`:

```bash
npm install -g wrangler
wrangler login
wrangler deploy --name melodia-secreta-catalog --compatibility-date 2026-10-01
wrangler secret put YOUTUBE_API_KEY
```

Cuando lo solicite, pegá la API key. La URL será similar a `https://melodia-secreta-catalog.TUUSUARIO.workers.dev`.

**Caché persistente recomendada:** creá un KV namespace desde Cloudflare, copiá `worker/wrangler.toml.example` a `worker/wrangler.toml`, descomentá el binding `CATALOG_KV` y reemplazá el ID por el real. Después desplegá de nuevo. Sin KV, se usa la caché de borde de Cloudflare, que puede no compartirse entre todas las regiones.

En la configuración del Worker, `ALLOWED_ORIGINS` puede quedar en `*` para pruebas. Para producción, limitá la variable a los orígenes reales, por ejemplo `https://TUUSUARIO.github.io` y el dominio personalizado si lo usás (separados por coma). Si usás GitHub Pages con una ruta de proyecto, el origen sigue siendo `https://TUUSUARIO.github.io`, sin la ruta.

Probá el endpoint:

```text
https://TU-WORKER.workers.dev/health
https://TU-WORKER.workers.dev/api/catalog
```

La segunda ruta debe devolver un objeto con `songs`, `generatedAt` y `cached`.

### 3. Publicar el frontend en GitHub Pages

1. Subí el contenido de este proyecto a un repositorio de GitHub.
2. En `index.html`, cambiá la meta `melodia-api-base` por la URL completa del Worker, incluyendo `/api/catalog`:

```html
<meta name="melodia-api-base" content="https://TU-WORKER.workers.dev/api/catalog">
```

3. Ejecutá `npm install`, `npm run typecheck` y `npm run build`; subí también `dist/main.js` generado.
4. En GitHub, abrí **Settings → Pages** y publicá desde la rama y carpeta donde esté `index.html` (habitualmente `main` y `/ (root)`).
5. Abrí el enlace que te entrega GitHub Pages. Los jugadores solo necesitan ese enlace; no instalan nada ni descargan archivos de música.

Si usás un flujo de GitHub Actions para compilar, asegurate de publicar el `dist/main.js` generado junto con `index.html`, `css/` y `data/`.

## Funcionamiento del catálogo

- El Worker busca videos con `videoEmbeddable=true`, `videoSyndicated=true` y categoría Música, ordenados por vistas.
- Después descarta lo que no sirve para jugar: mixes, playlists, en vivo, karaokes, remixes, covers, discos completos, canales que no son un artista y títulos sin formato "Artista - Título" (salvo canales VEVO o "Artista - Topic").
- Con una segunda consulta (`videos.list`, 1 unidad de cuota por cada 50 videos) verifica que cada video sea público, incrustable y dure entre 2 y 9 minutos.
- Se eliminan duplicados por ID de video y se normalizan títulos/artistas para reducir canciones repetidas.
- El título y el artista se infieren de los metadatos del video y del canal. YouTube no garantiza metadatos musicales uniformes, por lo que puede haber algún resultado incorrectamente etiquetado.
- Los videos pueden eliminarse, restringirse o cambiar sus permisos. El juego omite los que fallan al cargar durante la sesión.
- El catálogo no es literalmente infinito: depende de los resultados que entregue YouTube, de la cuota disponible y de la caché. El backend renueva el catálogo cada 24 horas.

## Estructura relevante

- `src/catalog.ts`: catálogo local/remoto, caché del navegador y búsqueda.
- `src/main.ts`: selección aleatoria y control de rondas.
- `src/player.ts`: reproductor oficial de YouTube.
- `src/storage.ts`: estadísticas e historial local.
- `worker/index.js`: API de catálogo y caché.
- `worker/wrangler.toml.example`: ejemplo de configuración de Cloudflare.

## Aviso

La API key de YouTube debe guardarse como secreto en Cloudflare. No la subas a GitHub. Respetá los términos de YouTube API Services y las condiciones de reproducción incrustada. El audio se sirve desde YouTube; esta aplicación no descarga ni almacena canciones.
