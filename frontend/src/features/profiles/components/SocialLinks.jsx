/**
 * SocialLinks.jsx — Professional social media link buttons with real brand icons.
 * Uses react-icons/si (Simple Icons) for authentic brand SVGs with correct colors.
 */
import {
  SiFacebook, SiInstagram, SiTiktok, SiTelegram, SiWhatsapp,
  SiLinkedin, SiYoutube, SiX, SiSnapchat, SiGithub,
} from 'react-icons/si'
import { Globe, Link } from 'lucide-react'

// Brand colors — official hex codes for each platform
const BRAND_CONFIG = {
  FACEBOOK:  { icon: SiFacebook,  color: '#1877F2', bg: '#E7F0FD', label: 'Facebook' },
  INSTAGRAM: { icon: SiInstagram, color: '#E4405F', bg: '#FDE8EC', label: 'Instagram' },
  TIKTOK:    { icon: SiTiktok,    color: '#000000', bg: '#F0F0F0', label: 'TikTok' },
  TELEGRAM:  { icon: SiTelegram,  color: '#26A5E4', bg: '#E3F4FD', label: 'Telegram' },
  WHATSAPP:  { icon: SiWhatsapp,  color: '#25D366', bg: '#E4FAF0', label: 'WhatsApp' },
  LINKEDIN:  { icon: SiLinkedin,  color: '#0A66C2', bg: '#E3EDF9', label: 'LinkedIn' },
  YOUTUBE:   { icon: SiYoutube,   color: '#FF0000', bg: '#FFE8E8', label: 'YouTube' },
  TWITTER:   { icon: SiX,        color: '#000000', bg: '#F0F0F0', label: 'X / Twitter' },
  SNAPCHAT:  { icon: SiSnapchat,  color: '#FFFC00', bg: '#FFFDE3', label: 'Snapchat' },
  GITHUB:    { icon: SiGithub,    color: '#181717', bg: '#F0F0F0', label: 'GitHub' },
  WEBSITE:   { icon: Globe,       color: '#6B7280', bg: '#F3F4F6', label: 'Website' },
  OTHER:     { icon: Link,        color: '#6B7280', bg: '#F3F4F6', label: 'Link' },
}

export function SocialLinks({ links = [], className = '' }) {
  if (!links.length) return null

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map(link => {
        const config = BRAND_CONFIG[link.platform] || BRAND_CONFIG.OTHER
        const IconComponent = config.icon

        return (
          <a
            key={link.id || link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={config.label}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-[12.5px] transition-all duration-150 hover:no-underline hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            style={{
              backgroundColor: config.bg,
              color: config.color,
              border: `1.5px solid ${config.color}22`,
            }}
          >
            <IconComponent
              size={15}
              style={{ color: config.color, flexShrink: 0 }}
            />
            <span>{config.label}</span>
          </a>
        )
      })}
    </div>
  )
}
