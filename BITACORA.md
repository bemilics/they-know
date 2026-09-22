# BITÁCORA — They Know

> Registro de estado, To-Dos y decisiones del proyecto.
> Este archivo SOLO se actualiza cuando el usuario lo pide explícitamente.

## Estado actual

- **Fase:** 1 (MVP) — **COMPLETA** (pendiente aprobación del usuario)
- **Última actualización:** 2026-09-22 (cierre de sesión)
- **Salud:** tests 34/34 ✓ · typecheck ✓ · lint ✓ · build producción ✓ · `electron-builder --dir` ✓
- **Prueba manual:** la app arranca con `npm run dev` ✓. El usuario probó importar la mock data: la importación corrió, pero **no está seguro de que los resultados se muestren correctos** → pendiente verificar visualmente el dashboard. Probará con su Takeout real cuando llegue.

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

## Pendiente conocido (no bloquea)

- **Verificar visualmente el dashboard con mock data** (usuario no quedó seguro de los resultados) y luego con su Takeout real cuando llegue.
- `npm audit` reporta vulnerabilidades en cadena de devDeps (electron-builder). No afectan la app empaquetada. Revisar antes de release público.
- Iconos de la app (electron-builder usa el default). Crear `build/icon.*`.
- `stream-json` v1.9 + `@types/stream-json` v1.7 (v3 existe pero sin tipos compatibles). Evaluar migración.

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
npm run test    # 34 tests
npm run dist    # instaladores
```
