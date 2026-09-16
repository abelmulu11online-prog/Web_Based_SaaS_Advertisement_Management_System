/**
 * Turn a username, phone, or partial URL into an https link that opens the platform.
 */
export function normalizeSocialUrl(platform, raw) {
  const value = String(raw || '').trim()
  if (!value) return value

  if (platform === 'WHATSAPP') {
    const digits = value.replace(/\D/g, '')
    if (digits) return `https://wa.me/${digits}`
  }

  if (platform === 'TELEGRAM') {
    if (/^https?:\/\//i.test(value)) return value
    const username = value.replace(/^@/, '').replace(/^t\.me\//i, '')
    return `https://t.me/${username}`
  }

  if (!/^https?:\/\//i.test(value)) return `https://${value}`
  return value
}
