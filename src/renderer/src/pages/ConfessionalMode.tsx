import { useTranslation } from 'react-i18next'
import CardStage from '../components/confessional/CardStage'
import { useAppStore } from '../state/store'

export default function ConfessionalMode(): React.JSX.Element | null {
  const { t } = useTranslation(['confessional', 'common'])
  const snapshot = useAppStore((s) => s.snapshot)
  const impactCards = useAppStore((s) => s.impactCards)
  const impactRunning = useAppStore((s) => s.impactRunning)
  const impactProgress = useAppStore((s) => s.impactProgress)
  const impactError = useAppStore((s) => s.impactError)
  const confessionalIndex = useAppStore((s) => s.confessionalIndex)
  const confessionalRevealed = useAppStore((s) => s.confessionalRevealed)
  const confessionalDone = useAppStore((s) => s.confessionalDone)
  const openConfessional = useAppStore((s) => s.openConfessional)
  const closeConfessional = useAppStore((s) => s.closeConfessional)
  const revealNext = useAppStore((s) => s.revealNext)
  const advanceConfessional = useAppStore((s) => s.advanceConfessional)

  if (!snapshot) return null

  if (impactRunning) {
    const stage = impactProgress?.stage
    return (
      <div className="confessional confessional-loading" data-testid="confessional-loading">
        <h1>{t('confessional:intro.analyzing')}</h1>
        {stage ? (
          <>
            <p className="lead">
              {t('confessional:intro.analyzingStage', {
                stage: t(`confessional:progress.${stage}`)
              })}
            </p>
            <div className="progress-bar">
              <div
                className="fill"
                style={{
                  width: `${impactProgress ? Math.round((impactProgress.done / Math.max(1, impactProgress.total)) * 100) : 0}%`
                }}
              />
            </div>
          </>
        ) : null}
        <p className="note">{t('confessional:intro.subtitle')}</p>
      </div>
    )
  }

  if (impactError) {
    return (
      <div className="confessional">
        <div className="error-card">
          <h2>{t('confessional:intro.error')}</h2>
          <div className="actions-row">
            <button className="primary" onClick={() => void openConfessional()}>
              {t('confessional:intro.retry')}
            </button>
            <button className="secondary" onClick={() => closeConfessional()}>
              {t('common:back')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!impactCards) {
    return (
      <div className="confessional">
        <h1>{t('confessional:intro.title')}</h1>
        <p className="lead">{t('confessional:intro.subtitle')}</p>
        <div className="actions-row">
          <button className="primary" onClick={() => void openConfessional()}>
            {t('confessional:intro.start')}
          </button>
          <button className="secondary" onClick={() => closeConfessional()}>
            {t('common:back')}
          </button>
        </div>
      </div>
    )
  }

  if (impactCards.length === 0) {
    return (
      <div className="confessional">
        <h1>{t('confessional:intro.empty')}</h1>
        <button className="secondary" onClick={() => closeConfessional()}>
          {t('confessional:card.backToDossier')}
        </button>
      </div>
    )
  }

  if (confessionalDone) {
    return (
      <div className="confessional confessional-end" data-testid="confessional-end">
        <h1>{t('confessional:card.endTitle')}</h1>
        <p className="lead">{t('confessional:card.endSubtitle')}</p>
        <p className="note">
          {t('confessional:card.nCards', { count: impactCards.length })}
        </p>
        <div className="actions-row">
          <button className="primary" onClick={() => closeConfessional()}>
            {t('confessional:card.backToDossier')}
          </button>
        </div>
      </div>
    )
  }

  const card = impactCards[confessionalIndex]
  if (!card) return null

  return (
    <div className="confessional" data-testid="confessional">
      <div className="confessional-progress-track" aria-hidden="true">
        <div
          className="confessional-progress-fill"
          style={{
            width: `${((confessionalIndex + (confessionalRevealed >= card.reveal_steps.length ? 1 : 0)) / impactCards.length) * 100}%`
          }}
        />
      </div>
      <CardStage
        card={card}
        revealed={confessionalRevealed}
        index={confessionalIndex}
        total={impactCards.length}
        onReveal={revealNext}
        onNext={advanceConfessional}
        onClose={closeConfessional}
      />
    </div>
  )
}
