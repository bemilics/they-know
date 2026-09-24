import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { NormalizedEntity } from '../../../shared/types'
import { pointsWithCoords, samplePoints } from '../lib/aggregates'

const MAX_POINTS = 3000

function FitBounds({ points }: { points: [number, number][] }): null {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 10)
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map((p) => L.latLng(p[0], p[1]))), { maxZoom: 11 })
    }
  }, [points, map])
  return null
}

export default function LocationMap({
  entities
}: {
  entities: NormalizedEntity[]
}): React.JSX.Element | null {
  const { t } = useTranslation('dashboard')
  const points = useMemo(() => {
    const withCoords = samplePoints(pointsWithCoords(entities), MAX_POINTS)
    return withCoords.map((e) => [e.lat as number, e.lng as number] as [number, number])
  }, [entities])

  if (points.length === 0) return null

  return (
    <div>
      <MapContainer
        center={points[0]}
        zoom={3}
        scrollWheelZoom={false}
        className="map-container"
        attributionControl={false}
      >
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} />
        {points.map((p, i) => (
          <CircleMarker
            key={i}
            center={p}
            radius={3}
            pathOptions={{ color: '#e8a87c', fillColor: '#e8a87c', fillOpacity: 0.5, weight: 1 }}
          />
        ))}
      </MapContainer>
      <p className="map-note">
        OpenStreetMap · {t('map.note')}
      </p>
    </div>
  )
}
