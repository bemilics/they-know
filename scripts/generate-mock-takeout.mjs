import { ZipFile } from 'yazl'
import { createWriteStream, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(process.argv[2] ?? path.join(here, '..', 'mock-takeout'))

function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260921)
const jitter = (base, range) => base + (rand() - 0.5) * range

function iso(y, m, d, h, min) {
  const offset = m >= 10 || m <= 3 ? '-03:00' : '-04:00'
  const p = (n) => String(n).padStart(2, '0')
  return `${y}-${p(m)}-${p(d)}T${p(h)}:${p(min)}:00.000${offset}`
}

function searchItem(title, y, m, d, h, min) {
  return {
    header: 'Búsqueda',
    title: `Buscaste ${title}`,
    titleUrl: `https://www.google.com/search?q=${encodeURIComponent(title).replace(/%20/g, '+')}`,
    time: iso(y, m, d, h, min),
    products: ['Búsqueda']
  }
}

function youtubeItem(title, channel, y, m, d, h, min) {
  return {
    header: 'YouTube',
    title: `Viste ${title}`,
    titleUrl: `https://www.youtube.com/watch?v=mock${Math.floor(rand() * 1e6)}`,
    subtitles: [{ name: channel, url: 'https://www.youtube.com/channel/mock' }],
    time: iso(y, m, d, h, min),
    products: ['YouTube']
  }
}

function visit(y, m, d, h1, h2, lat, lng, semanticType) {
  return {
    startTime: iso(y, m, d, h1, 0),
    endTime: iso(y, m, d, h2, 15),
    visit: {
      topCandidate: {
        placeLocation: { latLng: `${lat}°, ${lng}°` },
        semanticType
      }
    }
  }
}

function activity(y, m, d, h1, h2, from, to, type) {
  return {
    startTime: iso(y, m, d, h1, 0),
    endTime: iso(y, m, d, h2, 0),
    activity: {
      start: { latLng: `${from[0]}°, ${from[1]}°` },
      end: { latLng: `${to[0]}°, ${to[1]}°` },
      topCandidate: { type }
    }
  }
}

const HOME = [-33.4262, -70.6115]
const WORK = [-33.4132, -70.5856]
const PLACES = [
  { name: 'TYPE_SEARCHED_PLACE', at: [-33.4372, -70.6506] },
  { name: 'TYPE_HOME', at: HOME },
  { name: 'TYPE_SEARCHED_PLACE', at: [-33.4201, -70.6034] },
  { name: 'TYPE_SEARCHED_PLACE', at: [-33.3985, -70.5969] },
  { name: 'TYPE_SEARCHED_PLACE', at: [-33.4446, -70.6465] }
]

const searches = [
  ['horario museo bellas artes', 2023, 3, 12, 15, 20],
  ['completos italianos receta', 2023, 3, 18, 19, 5],
  ['clima santiago fin de semana', 2023, 4, 1, 9, 12],
  ['síntomas de ansiedad', 2023, 4, 2, 2, 47],
  ['cómo dormir mejor', 2023, 4, 2, 3, 15],
  ['dolor de pecho estrés', 2023, 4, 9, 3, 33],
  ['test de depresión online', 2023, 4, 9, 4, 2],
  ['terapeuta online chile precios', 2023, 4, 10, 1, 58],
  ['cuánto gana un programador en chile', 2023, 5, 14, 12, 30],
  ['cómo renunciar a mi trabajo', 2023, 5, 20, 2, 11],
  ['es normal sentirse vacío', 2023, 5, 20, 2, 26],
  ['pasajes a puerto montt', 2023, 6, 2, 18, 40],
  ['clínica santa maría horario visitas', 2023, 6, 15, 11, 5],
  ['resultados examen de sangre valores normales', 2023, 6, 15, 23, 51],
  ['isapre reclamos', 2023, 7, 4, 3, 19],
  ['ejercicios para la espalda', 2023, 8, 11, 20, 14],
  ['mejor cafetería providencia', 2023, 9, 2, 10, 45],
  ['divorcio cuánto cuesta chile', 2023, 10, 7, 2, 38],
  ['apartar hora psicólogo fonasa', 2023, 10, 8, 9, 2],
  ['ansiedad nocturna qué hacer', 2024, 1, 3, 3, 41],
  ['meditación guiada español', 2024, 1, 3, 4, 5],
  ['vuelos baratos a buenos aires', 2024, 2, 14, 16, 22],
  ['regalo aniversario pareja', 2024, 2, 27, 13, 10],
  ['curso de inglés online gratis', 2024, 3, 9, 11, 55],
  ['renuncia voluntaria finiquito', 2024, 4, 18, 2, 59],
  ['trabajo remoto ofertas chile', 2024, 4, 18, 3, 20],
  ['plantas de interior poca luz', 2024, 5, 25, 17, 33],
  ['seguro de salud complementario', 2024, 6, 30, 12, 15],
  ['insomnio causas', 2025, 1, 12, 3, 8],
  ['síntomas burnout laboral', 2025, 1, 12, 3, 29],
  ['cómo decir que no en el trabajo', 2025, 2, 3, 22, 47],
  ['parque metropolitano piscina horario', 2025, 2, 15, 10, 20],
  ['psicólogo online opiniones', 2025, 3, 1, 1, 44]
]

const videos = [
  ['Cómo dejar de procrastinar', 'Canal Motivacional', 2023, 3, 5, 21, 10],
  ['Documental: la ansiedad social', 'Psicología Hoy', 2023, 4, 2, 22, 45],
  ['Yoga para dormir 20 minutos', 'Calma Diaria', 2023, 4, 2, 23, 30],
  ['Review Nintendo Switch 2', 'TecnoChile', 2023, 5, 11, 20, 5],
  ['Cómo negociar tu sueldo', 'Finanzas Simples', 2023, 5, 20, 21, 40],
  ['Meditación guiada 10 min', 'Calma Diaria', 2023, 6, 1, 23, 15],
  ['Tour por Barrio Italia', 'Santiago Secreto', 2023, 7, 8, 19, 26],
  ['Qué es el burnout y cómo salir', 'Psicología Hoy', 2023, 10, 8, 22, 3],
  ['Rutina espalda sana oficina', 'Movimiento Libre', 2023, 11, 19, 18, 44],
  ['Cómo cocinar completos', 'Cocina Chilena', 2024, 1, 13, 20, 31],
  ['Lo que nadie te dice de la terapia', 'Psicología Hoy', 2024, 2, 2, 23, 52],
  ['Aprende inglés: 100 frases', 'Inglés Fácil', 2024, 3, 10, 21, 18],
  ['Documental: el costo de estar siempre conectado', 'DW Español', 2024, 4, 20, 22, 37],
  ['Respiración 4-7-8 para ansiedad', 'Calma Diaria', 2025, 1, 12, 3, 35],
  ['Cómo armar tu portafolio dev', 'Código Claro', 2025, 2, 4, 20, 12]
]

const months = [
  [2023, 3], [2023, 5], [2023, 7], [2023, 10], [2024, 2], [2024, 4], [2025, 1], [2025, 3]
]
const semanticByMonth = new Map()
for (const [y, m] of months) {
  const items = []
  for (let d = 1; d <= 26; d += 2) {
    items.push(visit(y, m, d, 9, 18, jitter(WORK[0], 0.001), jitter(WORK[1], 0.001), 'TYPE_SEARCHED_PLACE'))
    items.push(activity(y, m, d, 8, 9, [jitter(HOME[0], 0.001), jitter(HOME[1], 0.001)], [jitter(WORK[0], 0.001), jitter(WORK[1], 0.001)], rand() > 0.5 ? 'IN_PASSENGER_VEHICLE' : 'WALKING'))
    const place = PLACES[Math.floor(rand() * PLACES.length)]
    items.push(visit(y, m, Math.min(d + 1, 28), 19, 21, jitter(place.at[0], 0.004), jitter(place.at[1], 0.004), place.name))
  }
  const key = `${y}/${y}_${['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][m - 1]}`
  semanticByMonth.set(key, items)
}

const records = []
for (let d = 1; d <= 40; d++) {
  for (let k = 0; k < 6; k++) {
    const day = new Date(Date.UTC(2023, 2, d, 12 + k * 2, Math.floor(rand() * 59)))
    records.push({
      timestampMs: String(day.getTime()),
      latitudeE7: Math.round(jitter(HOME[0], 0.06) * 1e7),
      longitudeE7: Math.round(jitter(HOME[1], 0.06) * 1e7),
      accuracy: 20 + Math.floor(rand() * 100)
    })
  }
}

const browserHistory = JSON.stringify({
  'Browser History': [
    { title: 'Example', url: 'https://example.com', time_usec: 1705316400000000 }
  ]
})

function writeZip(zipPath, files) {
  return new Promise((resolve, reject) => {
    mkdirSync(path.dirname(zipPath), { recursive: true })
    const zip = new ZipFile()
    for (const [name, content] of Object.entries(files)) {
      zip.addBuffer(Buffer.from(content, 'utf8'), name)
    }
    zip.end()
    const out = createWriteStream(zipPath)
    zip.outputStream.pipe(out)
    out.on('close', resolve)
    out.on('error', reject)
  })
}

const zip1 = {
  'Takeout/Mi actividad/Búsqueda/MiActividad.json': JSON.stringify(
    searches.map((s) => searchItem(...s)),
    null,
    2
  ),
  'Takeout/YouTube y YouTube Music/historial/historial-de-reproducciones.json': JSON.stringify(
    videos.map((v) => youtubeItem(...v)),
    null,
    2
  )
}

const zip2 = {
  'Takeout/Historial de ubicaciones/Records.json': JSON.stringify({ locations: records }),
  'Takeout/Chrome/BrowserHistory.json': browserHistory
}
for (const [key, items] of semanticByMonth) {
  zip2[`Takeout/Historial de ubicaciones/Historial de ubicaciones semántico/${key}.json`] =
    JSON.stringify(items, null, 2)
}

await writeZip(path.join(outDir, 'takeout-mock-001.zip'), zip1)
await writeZip(path.join(outDir, 'takeout-mock-002.zip'), zip2)

console.log(`Mock takeout generado en: ${outDir}`)
console.log('  takeout-mock-001.zip  (búsquedas + youtube)')
console.log('  takeout-mock-002.zip  (ubicaciones + chrome sin soportar)')
