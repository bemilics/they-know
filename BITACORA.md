# BITÁCORA — They Know

> Registro de estado, To-Dos y decisiones del proyecto.
> Este archivo SOLO se actualiza cuando el usuario lo pide explícitamente.

## Estado actual

- **Fase:** 1 (MVP) — **COMPLETA** (pendiente aprobación del usuario)
- **Fase Impacto (motor + confesionario):** A/B/C **implementadas, sin commitear** (apagón antes del commit)
- **Última actualización:** 2026-09-22 (motor de impacto + coreografía en working tree)
- **Salud:** tests 60/60 ✓ · typecheck ✓ · lint ✓ · build producción ✓ · `electron-builder --dir` ✓
- **Prueba manual Fase 1:** la app arranca con `npm run dev` ✓. El usuario probó importar la mock data: la importación corrió, pero **no está seguro de que los resultados se muestren correctos** → pendiente verificar visualmente el dashboard. Probará con su Takeout real cuando llegue.
- **Cambios sin commitear:** `src/impact/`, ConfessionalMode/CardStage, worker, i18n confessional, settings timezone, tests `tests/impact/`, configs (vitest/tsconfig/package).

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
- [ ] **Aprobación del usuario para cerrar Fase 1**

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

### FASE C — Tests (vitest) — **60/60 verdes**

- [x] Fixtures sintéticos: casa/trabajo/secundario 120 días, hits ES/EN, spike inyectado
- [x] Test por regla: casa/trabajo, streak, léxico ES/EN, spike, correlación, orden de cartas, share payload limpio, blur/reveal UI
- [x] Integración: progreso por etapas, determinismo, dataset vacío, settings timezone

## Pendiente conocido (no bloquea)

- **Verificar visualmente el dashboard con mock data** (usuario no quedó seguro de los resultados) y luego con su Takeout real cuando llegue.
- `npm audit` reporta vulnerabilidades en cadena de devDeps (electron-builder). No afectan la app empaquetada. Revisar antes de release público.
- Iconos de la app (electron-builder usa el default). Crear `build/icon.*`.
- `stream-json` v1.9 + `@types/stream-json` v1.7 (v3 existe pero sin tipos compatibles). Evaluar migración.

## Cerrar Fase Impacto (commitear)

- [ ] Commit de los cambios actuales (motor + confesionario + tests + configs)
- [ ] `npm run build` + prueba manual con mock data: CTA confesionario, reveal, share
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
npm run test    # 60 tests
npm run dist    # instaladores
```
