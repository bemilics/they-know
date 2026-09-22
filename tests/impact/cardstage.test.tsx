// @vitest-environment happy-dom
import { describe, expect, it, beforeAll } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import i18n from '../../src/renderer/src/i18n'
import CardStage from '../../src/renderer/src/components/confessional/CardStage'
import type { Card } from '../../src/impact/types'
import { buildSharePayload, serializeShare } from '../../src/impact/share/payload'
import { runImpact } from '../../src/impact/cards/generator'
import { buildSyntheticDataset } from './fixtures/synthetic'

beforeAll(async () => {
  await i18n.changeLanguage('es-CL')
})

const baseCard: Card = {
  id: 'lugar_casa',
  nivel: 'hecho',
  titulo_i18n_key: 'confessional:places.casa.titulo',
  detalle_i18n_key: 'confessional:places.casa.detalle',
  datos_rellenables: {
    noches: { valor: 120, unidad: 'dias' },
    lat: { valor: -33.45 },
    lng: { valor: -70.66 }
  },
  evidencia: [
    {
      tipo: 'noches_cluster',
      puntos: 120,
      detalle: 'cluster_nocturno_dominante'
    }
  ],
  confianza: 'alta',
  sensibilidad: 'media',
  reveal_steps: ['cluster', 'noches']
}

describe('CardStage', () => {
  it('muestra blur hasta revelar y revela por pasos', () => {
    cleanup()
    const noop = (): void => undefined
    render(
      <CardStage
        card={baseCard}
        revealed={0}
        index={0}
        total={3}
        onReveal={noop}
        onNext={noop}
        onClose={noop}
      />
    )
    const stage = screen.getByTestId('card-stage')
    expect(stage.textContent).toContain('•••')
    expect(stage.textContent).not.toContain('Tu casa se repite')

    cleanup()
    const revealed: number[] = []
    render(
      <CardStage
        card={baseCard}
        revealed={1}
        index={0}
        total={3}
        onReveal={() => revealed.push(1)}
        onNext={noop}
        onClose={noop}
      />
    )
    expect(screen.getByTestId('card-stage').textContent).toContain('Tu casa se repite')
    expect(screen.getByTestId('reveal')).toBeTruthy()

    cleanup()
    render(
      <CardStage
        card={baseCard}
        revealed={2}
        index={0}
        total={3}
        onReveal={noop}
        onNext={noop}
        onClose={noop}
      />
    )
    expect(screen.getByTestId('next')).toBeTruthy()
    expect(screen.getByTestId('card-stage').textContent).toContain('confianza alta')
  })

  it('el botón siguiente llama a onNext', () => {
    cleanup()
    let clicked = false
    render(
      <CardStage
        card={{ ...baseCard, reveal_steps: [] }}
        revealed={0}
        index={0}
        total={2}
        onReveal={() => undefined}
        onNext={() => {
          clicked = true
        }}
        onClose={() => undefined}
      />
    )
    fireEvent.click(screen.getByTestId('next'))
    expect(clicked).toBe(true)
  })
})

describe('share cards sin contenido sensible', () => {
  it('payload de share del dataset no incluye terminos sensibles', () => {
    const entities = buildSyntheticDataset()
    const result = runImpact(entities, {
      timezone: 'America/Santiago',
      lexiconVersion: 'v1',
      now: Date.parse('2025-05-01T12:00:00Z')
    })
    const raw = serializeShare(buildSharePayload(result))
    expect(raw).not.toContain('psiquiatra')
    expect(raw).not.toContain('farmacia')
    expect(raw).not.toContain('timestamps')
    expect(raw).not.toContain('deudas con el banco')
    expect(raw).not.toContain('entrevista de trabajo')
  })
})
