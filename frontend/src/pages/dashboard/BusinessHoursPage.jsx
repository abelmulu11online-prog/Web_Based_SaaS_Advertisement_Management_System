import { useState } from 'react'
import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { NoProfileGuard } from '../../features/profiles/components/NoProfileGuard.jsx'
import { useBusinessDetails, useUpsertBusinessDetails } from '../../features/profiles/hooks/useProfile.js'

const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6]

const DEFAULT_HOURS = DAY_INDICES.map(i => ({
  day_of_week: i,
  opens_at: '09:00',
  closes_at: '18:00',
  is_closed: i === 0,
}))

export default function BusinessHoursPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useBusinessDetails()
  const upsertMutation = useUpsertBusinessDetails()

  const [hours, setHours] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  if (data && hours === null) {
    if (data.business_hours?.length === 7) {
      setHours(data.business_hours.map(h => ({
        day_of_week: h.day_of_week,
        opens_at: h.opens_at ? h.opens_at.slice(0, 5) : '09:00',
        closes_at: h.closes_at ? h.closes_at.slice(0, 5) : '18:00',
        is_closed: h.is_closed ?? false,
      })))
    } else {
      setHours(DEFAULT_HOURS)
    }
  }

  const currentHours = hours ?? DEFAULT_HOURS

  function update(i, field, value) {
    setHours(currentHours.map((h, idx) => idx === i ? { ...h, [field]: value } : h))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await upsertMutation.mutateAsync({ business_hours: currentHours })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err?.response?.data?.message || t('profile.hours.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return (
    <DashboardLayout title={t('profile.hours.title')}>
      <div className="space-y-3 max-w-lg">
        {DAY_INDICES.map(d => <Skeleton key={d} className="h-14 rounded-lg" />)}
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title={t('profile.hours.title')}>
      <NoProfileGuard>
        <div className="max-w-lg space-y-5">
          <p className="text-[13px] text-ink-2">
            {t('profile.hours.subtitle')}
          </p>

          <form onSubmit={handleSave} className="space-y-2">
            {currentHours.sort((a, b) => {
              const order = [1, 2, 3, 4, 5, 6, 0]
              return order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week)
            }).map((h) => {
              const realIdx = currentHours.indexOf(h)
              return (
                <div key={h.day_of_week}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    h.is_closed ? 'bg-surface-2 border-border opacity-60' : 'bg-surface border-border'
                  }`}
                >
                  <span className="text-[13px] font-semibold text-ink w-24 shrink-0">
                    {t(`profile.hours.days.${h.day_of_week}`)}
                  </span>

                  {h.is_closed ? (
                    <span className="text-[13px] text-ink-3 flex-1">{t('profile.hours.closed')}</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={h.opens_at}
                        onChange={e => update(realIdx, 'opens_at', e.target.value)}
                        className="h-8 px-2 bg-canvas border border-border rounded text-[13px] text-ink outline-none focus:border-brand"
                      />
                      <span className="text-ink-3 text-[12px]">{t('profile.hours.to')}</span>
                      <input
                        type="time"
                        value={h.closes_at}
                        onChange={e => update(realIdx, 'closes_at', e.target.value)}
                        className="h-8 px-2 bg-canvas border border-border rounded text-[13px] text-ink outline-none focus:border-brand"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => update(realIdx, 'is_closed', !h.is_closed)}
                    className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full border transition-all shrink-0 ${
                      h.is_closed
                        ? 'bg-canvas border-border text-ink-2 hover:border-brand hover:text-brand'
                        : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {h.is_closed ? t('profile.hours.setOpen') : t('profile.hours.markClosed')}
                  </button>
                </div>
              )
            })}

            {error && <p className="text-[13px] text-danger">{error}</p>}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" variant="primary" icon={<Clock size={13} />} loading={saving}>
                {t('profile.hours.saveHours')}
              </Button>
              {saved && <span className="text-[13px] text-emerald-600 font-medium">{t('profile.hours.saved')}</span>}
            </div>
          </form>
        </div>
      </NoProfileGuard>
    </DashboardLayout>
  )
}
