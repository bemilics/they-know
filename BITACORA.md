# BITÁCORA — They Know

> Registro de estado, To-Dos y decisiones del proyecto.
> Este archivo SOLO se actualiza cuando el usuario lo pide explícitamente.

## Estado actual

- **Fase:** 1 (MVP) — **COMPLETA** (pendiente aprobación del usuario)
- **Fase Impacto (motor + confesionario):** A/B/C **implementadas, sin commitear** (apagón antes del commit)
- **Fase Maps + Play Store:** **COMPLETA** (2026-09-24) — ingestión + cartas de impacto, sin commitear
- **Takeout real del usuario:** **parsea ✓** (bug HTML resuelto 2026-09-22; Maps/Play Store resuelto 2026-09-24)
- **Última actualización:** 2026-09-24 (soporte Maps + Play Store: parsers, cartas, UI, fixtures, 95/95)
- **Salud:** tests 95/95 ✓ · typecheck ✓ · lint ✓ · build producción ✓ · `electron-builder --dir` ✓
- **Prueba manual:** usuario confirmó con Takeout real: **"a simple vista funcionó"** (2026-09-24) ✓. Pendiente revisar el confesionario a fondo con datos reales.
- **Smoke real (3 zips del usuario):** **161.926 entidades** en ~4s (antes 128.825): youtube 81.677 · search 46.522 · **app 32.126** · **maps 1.382** · **purchase 217** · **review 2**. Secciones leídas: 40 (31 activity-html + 7 play-store + 2 maps-reviews). Omitidas: 63 = 15 `empty` + 48 `unknown-format` (Chrome, Encuestas, Perfil, Tareas, Finance, Home…). Impacto: 17 cartas, i18n completo.
- **Cambios sin commitear:** `src/impact/`, ConfessionalMode/CardStage, worker, i18n confessional, settings timezone, tests `tests/impact/`, configs (vitest/tsconfig/package) + **parser HTML** (`src/parsers/htmlActivity.ts`, adapter, ImportValidate, i18n import, fixtures/tests HTML) + **Maps/Play Store** (`src/parsers/google/{playStore,mapsReviews}.ts`, `detect.ts` con `orderHistory`/`isEmptyJson`, cascada HTML, `src/impact/infer/{purchases,appUsage}.ts`, Dashboard/ImportValidate/aggregates/LocationMap/coverage, i18n dashboard+confessional, fixture `takeout-maps-play.zip`, tests).

## Decisiones tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-09-21 | electron-vite + React 18 + TS estricto | Tooling estándar para Electron+Vite |
| 2026-09-21 | Parseo en proceso **main** con `unzipper` + `stream-json` | Zips grandes; renderer no toca archivos; Records.json gigantes en streaming real |
| 2026-09-21 | Umbral streaming: 8MB (`BIG_FILE_THRESHOLD`) | Bajo ese tamaño, buffer+`JSON.parse` (más simple y confiable) |
| 2026-09-21 | Estilos: CSS plano con variables | Diseño emocional propio, sin dependencias; fuentes del sistema (cero red) |
| 2026-09-21 | Estado renderer: `zustand` | Liviano |
| 2026-09-21 | i18n: `react-i18next`, 5 namespaces JSON, `es-CL` default | Instrucciones/disclaimers editables sin tocar lógica |
| 2026-09-21 | package name y appId: `they-know` | Definido por el usuario |
| 2026-09-21 | Ubicaciones: mapa Leaflet como tarjeta destacada (máx. 3000 puntos muestreados) | Definido por el usuario |
| 2026-09-21 | **Se elimina ShareCard del MVP** | No tiene sentido para el propósito (decisión del usuario) |
| 2026-09-21 | Detección de adapters por estructura+contenido (shape JSON, headers ES/EN, `products`), nunca nombre de carpeta | Takeout cambia nombres según idioma |
| 2026-09-21 | Sección faltante/formato nuevo → omitir + reportar cobertura, nunca crashear | Regla dura del proyecto |
| 2026-09-21 | Deep links: allowlist de hosts (`google.com`, `youtube.com`, `meta.com`, `facebook.com`, `instagram.com`) + solo HTTPS | `shell.openExternal` nunca debe abrir URLs arbitrarias |
| 2026-09-21 | CSP estricta; renderer solo a OSM (`img-src`/`connect-src`); navegación y `window.open` bloqueados | Cero red salvo tiles |
| 2026-09-21 | Persistencia: `FileStore` puro testeable + binding Electron; escritura atómica (tmp+rename) | Tests sin Electron; nunca dejar JSON a medio escribir |
| 2026-09-21 | Fixture roto + "no es takeout" + Records ~9MB en streaming como tests permanentes | Regla dura: nunca crashear |
| 2026-09-21 | Mock data: generador `scripts/generate-mock-takeout.mjs` (`npm run mock`), 2 zips en `mock-takeout/` (gitignored) | El usuario no quiere probar con sus datos reales todavía |
| 2026-09-22 | **Selector de importación dividido en dos botones**: "elegir archivos .zip" (`openFile`) y "elegir carpeta" (`openDirectory`) | Bug conocido de Electron/GTK en Linux: `openFile`+`openDirectory` combinados no dejan navegar carpetas |
| 2026-09-22 | Warnings `GetVSyncParametersIfAvailable` en consola = inofensivos (GPU Linux) | Solo ruido de desarrollo, no afectan la app |
| 2026-09-22 | **Motor de impacto: módulo puro `src/impact/`** (TypeScript, cero Electron/DOM) | Testeable en Node con vitest; transparencia de inferencia es el producto |
| 2026-09-22 | Clustering lugares: grilla + union-find (radio 150m), no HDBSCAN | Determinista, sin dependencias, suficiente para casa/trabajo/secundarios |
| 2026-09-22 | Léxico versionado JSON `src/impact/lexicon/v1/` (ES+EN, 7 categorías) | Copy y términos editables sin tocar lógica |
| 2026-09-22 | Cartas: nivel epistémico + confianza + evidencia + `reveal_steps` | Cadena de deducción visible; reveal progresivo vago → específico |
| 2026-09-22 | Pesos de impacto: correlaciones 45, sensibles 40, lugares 30, spikes 25, streaks 15 | Orden de mayor a menor impacto estimado |
| 2026-09-22 | Procesamiento en WebWorker (`impact.worker.ts`) con progress events + fallback síncrono | UI no se congela con 1-2M de puntos |
| 2026-09-22 | Timezone en onboarding + persistencia `settings.json` vía IPC/FileStore | Horarios nocturnos/laborales en hora local del usuario |
| 2026-09-22 | Share payload redactado (`buildSharePayload`): sin términos de búsqueda ni timestamps crudos | Cero contenido sensible en tarjetas para compartir |
| 2026-09-22 | Tests UI con happy-dom + `@testing-library/react` (`.test.tsx`) | Verificar blur/reveal sin Electron |
| 2026-09-22 | **Takeout moderno exporta actividad en HTML** (`MiActividad.html`, `historial de reproducciones.html`), no JSON | Diagnóstico con los zips reales del usuario; el parser solo miraba `.json` → `source: unknown` engañoso |
| 2026-09-22 | Parser HTML de actividad: celdas `outer-cell`, sniff 256KB (CSS Google ~141KB > `HEAD_SNIFF_BYTES`), streaming por marcador | `src/parsers/htmlActivity.ts`; fechas ES/EN + `a.m./p.m.` + `GMT±HH:MM` (incl. U+202F) |
| 2026-09-22 | YouTube HTML solo si header contiene `youtube` **o** hay link `watch?v=` | Evita falsos positivos de "Has visto" en Publicidad/Gmail |
| 2026-09-22 | HTML no-actividad → skip **silencioso** (no entra a cobertura) | Takeout real trae cientos de HTML de juegos/ayuda; no inundar UI |
| 2026-09-22 | Fallo `source==='unknown'`: conservar el `ParseReport` y mostrar cobertura + `filesScanned` (máx. 50 omitidas) | Mensaje "no es Takeout" era engañoso y descartaba el diagnóstico (`store.ts`) |
| 2026-09-22 | **Ubicaciones ausentes en Takeout 2026 del usuario**: no hay `Records.json` ni Semantic (Timeline solo en dispositivo) | Sección vacía en dashboard = esperado, no inventar datos |
| 2026-09-24 | **Alcance Maps/Play:** "ingestión + cartas de impacto"; tipos de entidad **nuevos** (`maps`, `app`, `purchase`, `review`), no reutilizar existentes (decisión del usuario) | Limpio por trazabilidad en el motor de impacto |
| 2026-09-24 | Reseñas de Maps con **texto completo**: lugar + rating + fecha + texto (decisión del usuario) | El texto de la reseña es el dato incómodo |
| 2026-09-24 | `SkipReason 'empty'`: `[]`, `{}` y objetos con solo arrays vacíos → "vacío", nunca "formato no reconocido" | Distinguir "Google no exportó nada" de "no lo entendemos" |
| 2026-09-24 | `Order History.json` (wrapper `orderHistory`) → `purchase`; **dedup de compras por timestamp solo en JSON con `detalle`** | Order History solapa 91/99 con Purchase History; el HTML de actividad tiene precisión de segundo (`.000`) y se entrechocaba |
| 2026-09-24 | Prefijos de verbo HTML con **límite de palabra** + fallback a la línea siguiente (omite fechas/"Ubicación actual") | Medido en celdas reales: `Empezaste a comprar<br>Kimi` y `Buscaste<br>Título` se caían con espacio fijo |
| 2026-09-24 | Visitas web genéricas (header = dominio en `Chrome/` y `Publicidad/MiActividad.html`, 13.601 celdas) siguen **omitidas** | Historial de navegación queda como candidato de tipo `web` (fuera de alcance de esta fase) |
| 2026-09-24 | Pesos cartas nuevas: `purchase_*=40`, `app_night=30`, `app_top=20`; todas las etapas `x,4` | Ídem regla de pesos por tipo de carta |

## To-Dos Fase 1 (completada)

- [x] Scaffold + configs + CI + README
- [x] Parsers: tipos, zipStream (multi-zip), detección
- [x] GoogleTakeoutAdapter: ubicaciones, búsquedas, YouTube
- [x] Tests parsers: fixtures ES/EN, multi-zip, roto
- [x] Persistencia: snapshot + checklist
- [x] IPC + preload
- [x] i18n es-CL/en + wizard onboarding + validación import
- [x] Dashboard: mapa, timeline, contadores, dato incómodo
- [x] Módulo limpieza: deep links, disclaimers, checklist persistente
- [x] Suite verde: test + typecheck + lint + build
- [x] **Parser HTML de actividad** (Takeout moderno ES/EN) + UX de fallo con cobertura real
- [ ] **Aprobación del usuario para cerrar Fase 1**
- [x] **Prueba visual con Takeout real** (`npm run dev`) — usuario: "a simple vista funcionó" (2026-09-24)

## Fase Impacto — Motor + Confesionario (implementada, sin commitear)

### FASE A — Motor de inferencia (`src/impact/`)

- [x] Módulo puro TS, cero dependencias Electron/DOM
- [x] `time.ts` / `geo.ts`: timezone local, haversine, clustering grilla+union-find
- [x] `infer/places.ts`: CASA (más noches 19:00-07:00), TRABAJO (días laborales 9:00-18:00, sesión 6h+, ≥300m de casa), LUGARES_SECUNDARIOS (20+ noches)
- [x] Streak días consecutivos + cobertura nocturna 02:00-04:00 local
- [x] `infer/searchLexicon.ts` + `lexicon/v1/lexicon.json`: 7 categorías ES/EN, normalización acentos/minúsculas, hits + confianza
- [x] `infer/spikes.ts`: volumen semanal, z-score ≥2, top spikes con fecha y delta
- [x] `infer/correlations.ts`: join búsqueda ↔ cluster ±30min / radio 150m
- [x] `cards/generator.ts`: cartas ordenadas por peso, cada una con nivel/confianza/evidencia/`reveal_steps`/`sensibilidad`
- [x] `share/payload.ts`: payload de share sin contenido sensible (test)
- [x] WebWorker + progress stages (init→places→lexicon→spikes→correlations→cards→done)

**No cableado aún (era del prompt):** histograma horario y “momento más representativo” calculados pero no en las cartas; streak solo usa `tipo==='location'` (prompt: any source); `runImpact` devuelve `places: []`; categorías léxico ≠ prompt literal (sin `sexual`/`duelo`, con `trabajo`).

### FASE B — Coreografía (`ConfessionalMode.tsx` + `CardStage.tsx`)

- [x] Pantalla de aviso/intro al entrar (tono cuidadoso, opción salir/volver)
- [x] Una carta a la vez, fullscreen, mínima UI
- [x] Reveal progresivo manual por `reveal_steps` (vago → específico → evidencia)
- [x] CTA desde Dashboard + fase `confessional` en App/router
- [x] i18n `confessional` es-CL + en (copy de todas las cartas)
- [x] Línea de nivel/implicancia al pie de cada carta
- [x] Resumen final + contador “N cartas”
- [x] Timezone en onboarding + persistencia

**No implementado aún (era del prompt):** blur por defecto en contenido sensible con “click para revelar” (solo blur pre-reveal universal); opción global “excluir categorías sensibles”; auto-reveal ~800ms (hoy manual); pin Leaflet / número grande en último reveal; tarjeta PNG de resumen; línea de implicancia “qué actor podría usar esto” (hoy solo niveles genéricos); test de título de ventana / logs.

### FASE C — Tests (vitest) — **72/72 verdes**

- [x] Fixtures sintéticos: casa/trabajo/secundario 120 días, hits ES/EN, spike inyectado
- [x] Test por regla: casa/trabajo, streak, léxico ES/EN, spike, correlación, orden de cartas, share payload limpio, blur/reveal UI
- [x] Integración: progreso por etapas, determinismo, dataset vacío, settings timezone
- [x] HTML activity: fechas ES/EN, celdas search/youtube, visitas omitidas, fixtures `takeout-html*.zip`, noise-only → unknown

## Bug Takeout real (2026-09-22, resuelto)

**Síntoma:** "Esto no parece un Takeout de Google" con los 3 zips del usuario (juntos, carpeta o sueltos).

**Causa:** export moderno de Google trae `Takeout/Mi actividad/*/MiActividad.html` y `YouTube…/historial de *.html`; el adapter solo procesaba `.json` → `coverage.parsed = 0` → `source: 'unknown'` y el reporte se descartaba en `store.ts`. Los logs `GetVSyncParametersIfAvailable` eran ruido de GPU/Linux (ya catalogados).

**Zips del usuario** (`~/Documents/google-personal-data/brankitis/`):
- `…-2-001.zip` (12.4GB): YouTube HTML history + videos + CSV — historia en `.html` no `.json`
- `…-3-001.zip` (9.6MB): `Mi actividad/**/MiActividad.html` (~33k celdas búsqueda) — sin `.json` de actividad
- `…-4-001.zip` (944MB): solo Gmail `.mbox` — sin secciones soportadas
- **Sin** `Location History/` ni Semantic (Google no exporta Timeline a la nube)

**Fix:** `htmlActivity.ts` + adapter acepta `.html` (sniff 256KB + streaming `outer-cell`) + store conserva reporte en fallo + i18n `helpNoZips`/`scanned`/`moreSkipped` + fixtures/tests. Smoke con zips reales: 128.825 entidades, ~7s, suite 72/72.

## Fase Maps + Play Store (2026-09-24, completa, sin commitear)

Contexto: 72 secciones se omitían como "formato no reconocido"; el usuario priorizó Maps y Play Store con alcance "ingestión + cartas de impacto".

### Ingestión

- [x] `SkipReason 'empty'` + `isEmptyJson` (también objetos con solo arrays vacíos) en `detect.ts`
- [x] Detección por **contenido**: GeoJSON `FeatureCollection` → `maps-reviews`; wrappers Play `install/libraryDoc/purchaseHistory/subscription/orderHistory/device/userSetting` → `play-store` (con espacios duros ` ` en rutas, ya tolerado por zipStream)
- [x] `src/parsers/google/mapsReviews.ts`: reseñas → `tipo:'review'`, coords `[lng,lat]` invertidas, detalle `rating★ — texto`
- [x] `src/parsers/google/playStore.ts`: installs → `app`; libraryDoc subs → `purchase`; purchaseHistory/subscriptions → `purchase` con detalle `purchase|subscription|order|library · precio · método/estado`; `device`/`userSetting` leídos con records 0
- [x] Cascada HTML de actividad (medida celda por celda contra los zips reales): `Indicaciones a` → `maps`; `Se ha utilizado`/`llamado` → `app`; `Empezaste a comprar` → `purchase`; `Buscaste` en header Maps/Play → `search` con `product`; visitas de tienda misma y ruido Maps (`explorado en`, `se ha visualizado`…) → omitidos; lugar sin verbo + header Maps → `maps`
- [x] Streaming preservado (>8MB en streaming, sniff 256KB HTML)

### Impacto + UI

- [x] Léxico/spikes/representativeMoment consideran `tipo==='maps'`; `matchCategory` exportado
- [x] `infer/purchases.ts`: `purchase_total/night/<categoría>/activeSubs` (nivel `hecho`); `infer/appUsage.ts`: `app_top` (≥10), `app_night` (≥20, noche local)
- [x] Copy i18n es-CL/en: compras y apps; el copy de `app_night` aclara que Play sincroniza en lotes (hora aproximada)
- [x] Share payload redacta `aplicacion/ejemplo/producto/lugar`
- [x] Dashboard: tarjeta de secciones nuevas (sin CTA de limpieza), mapa incluye reseñas (`mapPoints`), cobertura agrupada (`summarizeSkipped`, `emptySummary`); ImportValidate agrupa omitidas

### Tests — **95/95 verdes** (antes 72)

- [x] `detect`: GeoJSON, wrappers Play incl. `orderHistory`, `isEmptyJson` (arrays vacíos)
- [x] `htmlActivity`: describe "Maps y Play Store" (8 tests: indicaciones, lugar sin verbo, búsqueda con product, used, llamada, empezaste, ruido, tienda)
- [x] `google.test`: fixture `takeout-maps-play.zip` (ruta con NBSP) — app=4, purchase=6 (dedup GPA↔PH verificado), maps=2, search=2, review=1, skipped=3 todas `empty`
- [x] `engine.test`: léxico maps, cartas compras/apps, redacción share
- [x] `npm run test` + `typecheck` + `lint` + `build` ✓

### Verificación cruzada (datos reales)

- Compras: conteo independiente en Python = **130 timestamps JSON únicos + 87 HTML = 217** = exacto lo que dio el parser.
- Celda por celda con el parser TS: `buscaste` 37.679/0 null · `indicaciones` 530/530 · `empezaste` 87/87 · `utilizado` 30.677/0.
- Correcciones halladas en el camino: (1) prefijos con espacio final perdían celdas `<br>`; (2) dedup de compras colisionaba eventos HTML mismo-segundo (10 recuperadas); (3) estado de suscripción tomaba el último cambio leído, no el más reciente.

## Pendiente conocido (no bloquea)

- **Candidato tipo `web` (fuera de alcance actual):** historial de navegación real — `Chrome/Historial.json` (578KB, `Browser History`) + **13.601 celdas `Has visitado`** con header=dominio en `Chrome/MiActividad.html` y `Publicidad/MiActividad.html` (también clics de publicidad). Sensibilísimo; requeriría tipo nuevo + cartas + redacción en share.
- Resto de `unknown-format` (48 en el Takeout real): Encuestas HaTS (18), Blogger (6), Perfil, Tareas (1 lista), Google Finance, App de Home, Rutas/Settings, Maps auto-Q&A (2, sin timestamp), Chrome config.
- **Prueba visual del confesionario con Takeout real**: dashboard confirmado "a simple vista" (2026-09-24), confesionario sin revisar a fondo.
- Verificar visualmente el dashboard con mock data (usuario no quedó seguro de los resultados).
- `npm audit` reporta vulnerabilidades en cadena de devDeps (electron-builder). No afectan la app empaquetada. Revisar antes de release público.
- Iconos de la app (electron-builder usa el default). Crear `build/icon.*`.
- `stream-json` v1.9 + `@types/stream-json` v1.7 (v3 existe pero sin tipos compatibles). Evaluar migración.

## Cerrar Fase Impacto (commitear)

- [ ] Commit de los cambios actuales (motor + confesionario + tests + configs + parser HTML Takeout + **fase Maps/Play Store**)
- [ ] `npm run build` + prueba manual con mock data: CTA confesionario, reveal, share
- [ ] Prueba manual con Takeout real: confesionario (dashboard ya visto: "a simple vista funcionó", 2026-09-24)
- [ ] Opcional post-commit: excluir sensibles, tarjeta PNG, auto-reveal 800ms, pin mapa, implicancia por actor

## Fase 2 (no iniciada — requiere aprobación de Fase 1)

- MetaAdapter (intereses de anuncios, anunciantes, actividad fuera de Meta) + limpieza Meta
- Modo Verificación: re-importar export, comparar con snapshot, vista antes/después, reporte "¿sirvió?"

## Reglas duras (permanentes)

1. Cero telemetría, cero cuentas, cero APIs Google/Meta. Renderer: solo tiles OSM.
2. Nunca prometer "borrado total". Disclaimers precisos por tipo: visible / desactivar / modelos derivados.
3. Adapters independientes, detección por estructura+contenido, tolerantes a secciones faltantes.
4. Instrucciones y disclaimers = i18n (es-CL default, en), separados del código.
5. ZIPs grandes en streaming; soporte multi-ZIP (takeout-001.zip…).
6. Deep links vía `shell.openExternal` en proceso principal.
7. Tests obligatorios antes de marcar cada fase como lista.

## Comandos útiles

```bash
npm run dev     # desarrollo
npm run mock    # regenerar mock-takeout/ (datos falsos ES, 2 zips)
npm run test    # 95 tests
npm run dist    # instaladores
```
