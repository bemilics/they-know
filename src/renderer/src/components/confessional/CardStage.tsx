import { useTranslation } from 'react-i18next'
import type { Card } from '../../../../impact/types'

const RESERVED_I18N_KEYS = new Set([
  'lng',
  'lngs',
  'ns',
  'keySeparator',
  'nsSeparator',
  'defaultValue',
  'returnObjects',
  'returnDetails',
  'replace',
  'interpolation',
  'count',
  'context',
  'lowerCaseLng',
  'appendNamespaceToCIMode',
  'appendNamespaceToMissingKey',
  'ignoreJSONStructure'
])

function cardDatos(card: Card): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(card.datos_rellenables)) {
    if (RESERVED_I18N_KEYS.has(k)) continue
    out[k] = (v as { valor?: unknown }).valor
  }
  return out
}

function i18nPath(key: string): string {
  return key.startsWith('confessional:') ? key.slice('confessional:'.length) : key
}

export default function CardStage({
  card,
  revealed,
  index,
  total,
  onReveal,
  onNext,
  onClose
}: {
  card: Card
  revealed: number
  index: number
  total: number
  onReveal: () => void
  onNext: () => void
  onClose: () => void
}): React.JSX.Element {
  const { t } = useTranslation('confessional')

  const title = t(i18nPath(card.titulo_i18n_key), { defaultValue: card.id })
  const detail = t(i18nPath(card.detalle_i18n_key), {
    ...cardDatos(card),
    defaultValue: ''
  })

  const steps = card.reveal_steps
  const showTitle = revealed >= 1 || steps.length === 0
  const showDetail = revealed >= 2 || steps.length <= 1
  const showMeta = steps.length === 0 || revealed >= steps.length
  const allShown = showMeta

  return (
    <div className="card-stage" data-testid="card-stage">
      <div className="card-stage-head">
        <span className="card-stage-progress">
          {t('card.step', { current: index + 1, total })}
        </span>
        <span className={`epistemic-badge epistemic-${card.nivel}`}>
          {t(`card.levels.${card.nivel}`)}
        </span>
      </div>

      {showTitle ? (
        <h2 className="card-stage-title">{title}</h2>
      ) : (
        <div className="card-stage-blur" aria-hidden="true">
          ••••••••
        </div>
      )}

      {showDetail && detail ? <p className="card-stage-detail">{detail}</p> : null}

      {showMeta ? (
        <div className="card-stage-meta">
          <span className={`conf-badge conf-${card.confianza}`}>
            {t(`card.confidence.${card.confianza}`)}
          </span>
          <span className="sens-badge">{t(`levels.${card.nivel}`)}</span>
          {card.evidencia.length > 0 ? (
            <details className="card-evidence">
              <summary>{t('card.evidence')}</summary>
              <ul>
                {card.evidencia.map((ev, i) => (
                  <li key={i}>
                    {ev.tipo}: {ev.puntos} — {ev.detalle}
                    {ev.timestamps && ev.timestamps.length > 0
                      ? ` (${ev.timestamps.length})`
                      : ''}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="card-stage-actions">
        {!allShown ? (
          <button className="primary" onClick={onReveal} data-testid="reveal">
            {t('card.reveal')}
          </button>
        ) : (
          <button className="primary" onClick={onNext} data-testid="next">
            {index + 1 >= total ? t('card.finish') : t('card.next')}
          </button>
        )}
        <button className="secondary" onClick={onClose}>
          {t('card.close')}
        </button>
      </div>
      <p className="note">{t(`levels.${card.nivel}`)}</p>
    </div>
  )
}
