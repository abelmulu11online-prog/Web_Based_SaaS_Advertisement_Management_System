import { Globe, Link, Share2, Send, GitBranch } from 'lucide-react'

// Lucide-react v1.x removed branded social icons (Facebook, Instagram, etc.)
// We use generic stand-ins that convey the same meaning without brand trademarks.
const ICONS = {
  FACEBOOK:  <Share2    size={15} />,
  INSTAGRAM: <Share2    size={15} />,
  LINKEDIN:  <Link      size={15} />,
  YOUTUBE:   <Share2    size={15} />,
  GITHUB:    <GitBranch size={15} />,
  TELEGRAM:  <Send      size={15} />,
  WEBSITE:   <Globe     size={15} />,
  OTHER:     <Globe     size={15} />,
}

const LABELS = {
  FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', LINKEDIN: 'LinkedIn',
  YOUTUBE: 'YouTube', GITHUB: 'GitHub', TELEGRAM: 'Telegram',
  TIKTOK: 'TikTok', TWITTER: 'X', SNAPCHAT: 'Snapchat',
  WHATSAPP: 'WhatsApp', WEBSITE: 'Website', OTHER: 'Link',
}

export function SocialLinks({ links = [], className = '' }) {
  if (!links.length) return null
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map(link => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title={LABELS[link.platform] || link.platform}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-ink-2 bg-surface-2 border border-border rounded hover:border-border-2 hover:text-ink transition-colors hover:no-underline"
        >
          {ICONS[link.platform] || <Globe size={14} />}
          {LABELS[link.platform] || link.platform}
        </a>
      ))}
    </div>
  )
}
