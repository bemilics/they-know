# BITÁCORA — They Know

> Registro de estado, To-Dos y decisiones del proyecto.
> Este archivo SOLO se actualiza cuando el usuario lo pide explícitamente.

## Estado actual

- **Fase:** 1 (MVP) — en construcción
- **Última actualización:** 2026-09-21 (creación inicial)

## Decisiones tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-09-21 | electron-vite + React 18 + TS estricto | Tooling estándar para Electron+Vite |
| 2026-09-21 | Parseo en proceso **main** con `unzipper` (streaming) | Zips grandes; renderer no toca archivos |
| 2026-09-21 | Estilos: CSS plano con variables | Diseño emocional propio, sin dependencias; fuentes locales (cero red) |
| 2026-09-21 | Estado renderer: `zustand` | Liviano |
| 2026-09-21 | i18n: `react-i18next`, namespaces JSON, `es-CL` default | Instrucciones/disclaimers editables sin tocar lógica |
| 2026-09-21 | package name y appId: `they-know` | Definido por el usuario |
| 2026-09-21 | Ubicaciones: mapa Leaflet como tarjeta destacada | Definido por el usuario |
| 2026-09-21 | **Se elimina ShareCard del MVP** | No tiene sentido para el propósito (decisión del usuario) |
| 2026-09-21 | Detección de adapters por estructura+contenido, nunca nombre de carpeta | Takeout cambia nombres según idioma |
| 2026-09-21 | Sección faltante/formato nuevo → omitir + reportar cobertura, nunca crashear | Regla dura del proyecto |

## To-Dos Fase 1

- [ ] Scaffold + configs + CI + README
- [ ] Parsers: tipos, zipStream (multi-zip), detección
- [ ] GoogleTakeoutAdapter: ubicaciones, búsquedas, YouTube
- [ ] Tests parsers: fixtures ES/EN, multi-zip, roto
- [ ] Persistencia: snapshot + checklist
- [ ] IPC + preload
- [ ] i18n es-CL/en + wizard onboarding + validación import
- [ ] Dashboard: mapa, timeline, contadores, dato incómodo
- [ ] Módulo limpieza: deep links, disclaimers, checklist persistente
- [ ] Suite verde: test + typecheck + lint

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
