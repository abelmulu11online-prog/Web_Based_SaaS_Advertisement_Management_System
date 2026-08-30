import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'

const LINKS = {
  Marketplace: [
    { to: '/ads', label: 'Browse listings' },
    { to: '/ads?category=Products', label: 'Products' },
    { to: '/ads?category=Services', label: 'Services' },
    { to: '/ads?category=Jobs', label: 'Jobs' },
    { to: '/ads?category=Properties', label: 'Properties' },
  ],
  Advertise: [
    { to: '/register', label: 'Create account' },
    { to: '/pricing', label: 'Pricing plans' },
    { to: '/dashboard', label: 'My dashboard' },
    { to: '/dashboard/advertisements/new', label: 'Post an ad' },
  ],
  Company: [
    { to: '#', label: 'About us' },
    { to: '#', label: 'Contact' },
    { to: '#', label: 'Privacy policy' },
    { to: '#', label: 'Terms of service' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-ink text-white/60 mt-auto pt-12 pb-8 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">

        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="text-[17px] font-bold text-white tracking-tight mb-3">
            Gebeta<span className="text-brand">Market</span>
          </div>
          <p className="text-[13px] leading-relaxed mb-4">
            Ethiopia's local marketplace for products, services, jobs, and businesses.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <MapPin size={12} />
            Addis Ababa, Ethiopia
          </div>
        </div>

        {/* Link columns */}
        {Object.entries(LINKS).map(([section, links]) => (
          <div key={section}>
            <h3 className="text-[11px] font-semibold text-white uppercase tracking-widest mb-4">
              {section}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {links.map(({ to, label }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-[13px] text-white/60 hover:text-white hover:no-underline transition-colors duration-150"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-wrap justify-between items-center gap-3 text-xs text-white/35">
        <span>© {new Date().getFullYear()} GebetaMarket. All rights reserved.</span>
        <span>Built in Ethiopia 🇪🇹</span>
      </div>
    </footer>
  )
}
