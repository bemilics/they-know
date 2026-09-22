import { ZipFile } from 'yazl'
import { createWriteStream, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

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

const esSearch = JSON.stringify([
  {
    header: 'Búsqueda',
    title: 'Buscaste cómo dormir mejor',
    titleUrl: 'https://www.google.com/search?q=c%C3%B3mo+dormir+mejor',
    time: '2024-03-02T04:12:33.000-03:00',
    products: ['Búsqueda']
  },
  {
    header: 'Búsqueda',
    title: 'Buscaste síntomas de ansiedad',
    time: '2024-03-05T23:41:10.000-03:00',
    products: ['Búsqueda']
  },
  {
    header: 'Búsqueda',
    title: 'Visitaste Google Maps',
    time: '2024-03-06T10:00:00.000-03:00',
    products: ['Búsqueda']
  }
])

const esYoutube = JSON.stringify([
  {
    header: 'YouTube',
    title: 'Viste Cómo dejar de procrastinar',
    titleUrl: 'https://www.youtube.com/watch?v=abc123',
    subtitles: [{ name: 'Canal Motivacional', url: 'https://www.youtube.com/channel/x' }],
    time: '2024-03-03T21:15:00.000-03:00',
    products: ['YouTube']
  },
  {
    header: 'YouTube',
    title: 'Viste Documental ansiedad social',
    titleUrl: 'https://www.youtube.com/watch?v=def456',
    subtitles: [{ name: 'Canal Psicología' }],
    time: '2024-03-04T22:30:00.000-03:00',
    products: ['YouTube']
  }
])

const esSemantic = JSON.stringify([
  {
    startTime: '2024-03-01T13:00:00.000-03:00',
    endTime: '2024-03-01T14:00:00.000-03:00',
    visit: {
      topCandidate: {
        placeLocation: { latLng: '-33.4489°, -70.6693°' },
        semanticType: 'TYPE_SEARCHED_PLACE'
      }
    }
  },
  {
    startTime: '2024-03-02T09:00:00.000-03:00',
    endTime: '2024-03-02T09:30:00.000-03:00',
    activity: {
      start: { latLng: '-33.4500°, -70.6600°' },
      end: { latLng: '-33.4400°, -70.6500°' },
      topCandidate: { type: 'WALKING' }
    }
  }
])

const enSearch = JSON.stringify([
  {
    header: 'Search',
    title: 'Searched for how to delete my data',
    titleUrl: 'https://www.google.com/search?q=how+to+delete+my+data',
    time: '2024-01-15T13:45:00.000Z',
    products: ['Search']
  },
  {
    header: 'Search',
    title: 'Searched for divorce lawyer near me',
    time: '2024-01-16T02:20:00.000Z',
    products: ['Search']
  }
])

const enYoutube = JSON.stringify([
  {
    header: 'YouTube',
    title: 'Watched Privacy tutorial 2024',
    titleUrl: 'https://www.youtube.com/watch?v=xyz789',
    subtitles: [{ name: 'Privacy Channel' }],
    time: '2024-01-10T18:00:00.000Z',
    products: ['YouTube']
  }
])

const enRecords = JSON.stringify({
  locations: [
    { timestampMs: '1705316400000', latitudeE7: -334489000, longitudeE7: -706693000, accuracy: 100 },
    { timestampMs: '1705320000000', latitudeE7: -334500000, longitudeE7: -706600000, accuracy: 50 },
    { timestamp: '2024-01-16T10:00:00.000Z', latitudeE7: -334400000, longitudeE7: -706500000 }
  ]
})

const unknownJson = JSON.stringify({ foo: 'bar', nested: { a: [1, 2, 3] } })

await writeZip(path.join(here, 'takeout-es.zip'), {
  'Takeout/Mi actividad/Búsqueda/MiActividad.json': esSearch,
  'Takeout/YouTube y YouTube Music/historial/historial-de-reproducciones.json': esYoutube,
  'Takeout/Historial de ubicaciones/Semantic/2024/2024_MARZO.json': esSemantic
})

await writeZip(path.join(here, 'takeout-en.zip'), {
  'Takeout/My Activity/Search/MyActivity.json': enSearch,
  'Takeout/YouTube and YouTube Music/history/watch-history.json': enYoutube,
  'Takeout/Location History/Records.json': enRecords
})

await writeZip(path.join(here, 'takeout-multi', 'takeout-001.zip'), {
  'Takeout/My Activity/Search/MyActivity.json': enSearch
})
await writeZip(path.join(here, 'takeout-multi', 'takeout-002.zip'), {
  'Takeout/Location History/Records.json': enRecords
})

await writeZip(path.join(here, 'broken.zip'), {
  'Takeout/My Activity/Search/MyActivity.json': '{ this is not valid json [[[',
  'Takeout/Something New/format.json': unknownJson
})

await writeZip(path.join(here, 'not-a-takeout.zip'), {
  'readme.txt': 'hello world',
  'photos/cat.jpg': 'fakejpegbytes'
})

console.log('fixtures generated')
