/**
 * SocialLinksPage.jsx — Dashboard page to manage social media links.
 * Shows real brand icons in the platform selector and in the link rows.
 */
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  SiFacebook, SiInstagram, SiTiktok, SiTelegram, SiWhatsapp,
  SiLinkedin, SiYoutube, SiX, SiSnapchat, SiGithub,
} from 'react-icons/si'
import { Globe, Link } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { FormField, Input } from '../../components/ui/FormField.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { NoProfileGuard } from '../../features/profiles/components/NoProfileGuard.jsx'
import { useBusinessDetails, useUpsertBusinessDetails } from '../../features/profiles/hooks/useProfile.js'

const PLATFORMS = [
  { value: 'FACEBOOK',  label: 'Facebook',    icon: SiFacebook,  color: '#1877F2', bg: '#E7F0FD',
    placeholder: 'yourpage  or  https://facebook.com/yourpage' },
  { value: 'INSTAGRAM', label: 'Instagram',   icon: SiInstagram, color: '#E4405F', bg: '#FDE8EC',
    placeholder: 'yourusername  or  @yourusername' },
  { value: 'TIKTOK',    label: 'TikTok',      icon: SiTiktok,    color: '#000000', bg: '#F0F0F0',
    placeholder: 'yourusername  or  @yourusername' },
  { value: 'TELEGRAM',  label: 'Telegram',    icon: SiTelegram,  color: '#26A5E4', bg: '#E3F4FD',
    placeholder: '@yourusername  or  your_username' },
  { value: 'WHATSAPP',  label: 'WhatsApp',    icon: SiWhatsapp,  color: '#25D366', bg: '#E4FAF0',
    placeholder: '+251912345678  (phone number with country code)' },
  { value: 'LINKEDIN',  label: 'LinkedIn',    icon: SiLinkedin,  color: '#0A66C2', bg: '#E3EDF9',
    placeholder: 'your-name  or  https://linkedin.com/in/your-name' },
  { value: 'YOUTUBE',   label: 'YouTube',     icon: SiYoutube,   color: '#FF0000', bg: '#FFE8E8',
    placeholder: '@yourchannel  or  channel name' },
  { value: 'TWITTER',   label: 'X / Twitter', icon: SiX,         color: '#000000', bg: '#F0F0F0',
    placeholder: 'yourusername  or  @yourusername' },
  { value: 'SNAPCHAT',  label: 'Snapchat',    icon: SiSnapchat,  color: '#FFFC00', bg: '#FFFDE3',
    placeholder: 'yourusername' },
  { value: 'GITHUB',    label: 'GitHub',      icon: SiGithub,    color: '#181717', bg: '#F0F0F0',
    placeholder: 'yourusername  or  your-org' },
  { value: 'WEBSITE',   label: 'Website',     icon: Globe,       color: '#6B7280', bg: '#F3F4F6',
    placeholder: 'https://yourwebsite.com' },
  { value: 'OTHER',     label: 'Other link',  icon: Link,        color: '#6B7280', bg: '#F3F4F6',
    placeholder: 'https://...' },
]

const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.value, p]))

function PlatformBadge({ value, size = 18 }) {
  const p = PLATFORM_MAP[value] || PLATFORM_MAP.OTHER
  const IconComponent = p.icon
  return (
    <div
      className="flex items-center justify-center rounded-lg shrink-0"
      style={{ width: size + 12, height: size + 12, backgroundColor: p.bg }}
    >
      <IconComponent size={size} style={{ color: p.color }} />
    </div>
  )
}

export default function SocialLinksPage() {
  const { data, isLoading } = useBusinessDetails()
  const upsertMutation = useUpsertBusinessDetails()

  const [links, setLinks] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  if (data && links === null) {
    setLinks(data.social_links?.length > 0
      ? data.social_links.map(l => ({ platform: l.platform, url: l.url }))
      : []
    )
  }

  const currentLinks = links ?? []

  function addLink() {
    const used = new Set(currentLinks.map(l => l.platform))
    const next = PLATFORMS.find(p => !used.has(p.value))
    setLinks([...currentLinks, { platform: next?.value || 'OTHER', url: '' }])
  }

  function updateLink(i, field, value) {
    setLinks(currentLinks.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  function removeLink(i) {
    setLinks(currentLinks.filter((_, idx) => idx !== i))
  }

  async function handleSave(e) {
    e.preventDefault()
    const validLinks = currentLinks.filter(l => l.url.trim())
    if (validLinks.length === 0 && currentLinks.length > 0) {
      setError('Please enter at least one URL or username.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await upsertMutation.mutateAsync({ social_links: validLinks })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save social links')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return (
    <DashboardLayout title="Social Links">
      <div className="space-y-3 max-w-lg">
        {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout title="Social Links">
      <NoProfileGuard>
        <div className="max-w-lg space-y-5">
          <p className="text-[13px] text-ink-2">
            Add your social media profiles and website links. They appear as branded buttons on your public profile.
          </p>

          <form onSubmit={handleSave} className="space-y-3">
            {/* Empty state */}
            {currentLinks.length === 0 && (
              <div className="bg-surface border-2 border-dashed border-border rounded-2xl p-8 text-center">
                {/* Show all platform icons as a preview */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {PLATFORMS.slice(0, 8).map(p => {
                    const IconComponent = p.icon
                    return (
                      <div
                        key={p.value}
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: p.bg }}
                      >
                        <IconComponent size={20} style={{ color: p.color }} />
                      </div>
                    )
                  })}
                </div>
                <p className="text-[14px] font-semibold text-ink mb-1">No social links yet</p>
                <p className="text-[13px] text-ink-3 mb-4">Add Facebook, Instagram, TikTok, WhatsApp and more.</p>
              </div>
            )}

            {/* Link rows */}
            {currentLinks.map((link, i) => {
              const platformInfo = PLATFORM_MAP[link.platform] || PLATFORM_MAP.OTHER
              return (
                <div
                  key={i}
                  className="bg-surface border border-border rounded-xl p-4 flex gap-3 items-start"
                  style={{ borderLeftWidth: '3px', borderLeftColor: platformInfo.color }}
                >
                  {/* Brand icon badge */}
                  <PlatformBadge value={link.platform} size={20} />

                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Platform selector */}
                      <div className="sm:w-44 shrink-0">
                        <select
                          value={link.platform}
                          onChange={e => updateLink(i, 'platform', e.target.value)}
                          className="w-full h-9 px-3 bg-canvas border border-border rounded-lg text-[13px] text-ink outline-none focus:border-brand cursor-pointer"
                        >
                          {PLATFORMS.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Input — accepts username, phone, or full URL */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={link.url}
                          onChange={e => updateLink(i, 'url', e.target.value)}
                          placeholder={platformInfo.placeholder || 'Username or URL'}
                          className="w-full h-9 px-3 bg-canvas border border-border rounded-lg text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-brand transition-colors"
                        />
                      </div>
                    </div>

                    {/* Contextual hint */}
                    <p className="text-[11px] text-ink-3 leading-snug">
                      {link.platform === 'WHATSAPP'
                        ? 'Enter your phone number with country code — e.g. +251912345678'
                        : link.platform === 'WEBSITE' || link.platform === 'OTHER'
                        ? 'Enter the full URL starting with https://'
                        : 'Enter your username — we\'ll build the link for you'}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    className="p-1.5 text-ink-3 hover:text-danger hover:bg-red-50 rounded-lg transition-colors shrink-0 mt-0.5"
                    title="Remove"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Plus size={13} />}
              onClick={addLink}
            >
              Add {currentLinks.length > 0 ? 'another' : 'social link'}
            </Button>

            {error && <p className="text-[13px] text-danger">{error}</p>}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" variant="primary" loading={saving}>Save links</Button>
              {saved && <span className="text-[13px] text-emerald-600 font-medium">✓ Saved</span>}
            </div>
          </form>
        </div>
      </NoProfileGuard>
    </DashboardLayout>
  )
}
