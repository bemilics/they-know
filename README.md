# They Know

**Mira lo que Google y Meta saben de ti. 100% local. 100% open source.**

They Know es una app de escritorio para personas **no técnicas** que:

1. Te guía paso a paso para descargar tus datos desde Google (Takeout) y Meta.
2. Te muestra qué encontró: ubicaciones, búsquedas, videos vistos.
3. Te guía paso a paso para **borrar lo que se puede borrar** y desactivar lo que se puede desactivar.
4. Te ayuda a **verificar** que el borrado funcionó.

## 🔒 Privacidad: el feature central

- **Cero telemetría. Cero cuentas. Cero llamadas a APIs de Google o Meta.**
- Tus archivos se procesan **100% en tu computador**. Nada se sube a ningún servidor. Nunca.
- La única conexión de red que hace la app es descargar las imágenes del mapa (OpenStreetMap) cuando miras tu historial de ubicaciones. Esas imágenes no contienen tus datos, y puedes usar toda la app sin el mapa.
- Cuando la app te muestra un enlace para borrar tus datos, ese enlace **se abre en tu navegador**: eres tú quien habla con Google/Meta, nunca la app.
- El código es abierto: puedes auditar que lo anterior es verdad.

## 📥 No soy técnico: ¿cómo empiezo?

1. Ve a la sección **Releases** de este repositorio (botón a la derecha).
2. Descarga el archivo para tu sistema:
   - **Windows**: `They-Know-Setup.exe` → doble clic → Siguiente, Siguiente.
   - **macOS**: `They-Know.dmg` → abrir y arrastrar a Aplicaciones.
   - **Linux**: `They-Know.AppImage` → doble clic (no instala nada).
3. Abre **They Know** y sigue el asistente. La app te dirá exactamente qué botón apretar en Google/Meta para descargar tus datos (puede tardar horas o días; ellos avisan por correo).

## ⚖️ Honestidad legal

They Know **nunca promete "borrado total"**. Cada consejo de limpieza indica con precisión qué tipo de acción es:

- **Borrar actividad visible**: sí se borra, es irreversible y no hay respaldo.
- **Desactivar recolección/personalización**: sí funciona, pero afecta la personalización de los servicios.
- **Modelos derivados**: las empresas pueden conservar datos derivados internamente; no es verificable desde fuera.

## Desarrollo

```bash
npm install
npm run dev        # modo desarrollo
npm run test       # tests (vitest)
npm run typecheck  # tipos
npm run lint       # lint
npm run dist       # instaladores (electron-builder)
```

Stack: Electron + React + TypeScript + Vite (electron-vite). Parsers en streaming con `unzipper`. i18n: `es-CL` (default) y `en` — todos los textos de instrucciones y disclaimers legales son contenido i18n, no código.

## Estructura

- `src/main` — proceso principal Electron (archivos, persistencia, deep links). **Sin red.**
- `src/parsers` — adapters por fuente (`GoogleTakeoutAdapter`, …). Detección por estructura y contenido, nunca por nombre de carpeta. Secciones desconocidas se omiten y se reportan en cobertura, nunca crashean.
- `src/preload` — puente IPC tipado (`contextBridge`).
- `src/renderer` — UI React. Única red: tiles de OpenStreetMap.
- `tests/fixtures` — exports sintéticos en ES y EN, incluido uno roto.
