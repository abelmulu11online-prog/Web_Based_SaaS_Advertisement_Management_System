/**
 * CategoryIcon.jsx — Maps category names/slugs to real lucide-react SVG icons.
 * Used everywhere categories appear: home page grid, category bar, profile cards.
 */
import {
  Scissors, Dumbbell, Sparkles, Smile,
  HardHat, Wrench, Layers, Flame,
  Palette, Camera, Video, Pen,
  BookOpen, GraduationCap,
  Utensils, Coffee, ShoppingBag,
  Laptop, Smartphone, Code, Globe,
  Briefcase, Scale, HeartPulse, Calculator,
  Home, Zap, Droplets, Leaf, Shield,
  Car, Truck, Package,
  ShoppingCart,
  LayoutGrid
} from 'lucide-react'

// Map: category slug → { icon component, color classes }
const ICON_MAP = {
  // ── Beauty & Wellness ──────────────────────────────────────────
  'beauty-wellness':  { icon: Sparkles,    bg: 'bg-pink-50',    text: 'text-pink-500' },
  'fitness':          { icon: Dumbbell,    bg: 'bg-orange-50',  text: 'text-orange-500' },
  'hair-salons':      { icon: Scissors,    bg: 'bg-purple-50',  text: 'text-purple-500' },
  'nail-salons':      { icon: Smile,       bg: 'bg-rose-50',    text: 'text-rose-500' },
  'spas':             { icon: Sparkles,    bg: 'bg-teal-50',    text: 'text-teal-500' },

  // ── Construction & Trades ──────────────────────────────────────
  'construction':           { icon: HardHat,  bg: 'bg-amber-50',   text: 'text-amber-600' },
  'building-construction':  { icon: HardHat,  bg: 'bg-amber-50',   text: 'text-amber-600' },
  'roofing':                { icon: Home,     bg: 'bg-amber-50',   text: 'text-amber-600' },
  'tiling-flooring':        { icon: Layers,   bg: 'bg-stone-50',   text: 'text-stone-500' },
  'welding':                { icon: Flame,    bg: 'bg-red-50',     text: 'text-red-500' },

  // ── Creative & Media ───────────────────────────────────────────
  'creative':         { icon: Palette,     bg: 'bg-violet-50',  text: 'text-violet-500' },
  'graphic-design':   { icon: Pen,         bg: 'bg-violet-50',  text: 'text-violet-500' },
  'photography':      { icon: Camera,      bg: 'bg-blue-50',    text: 'text-blue-500' },
  'videography':      { icon: Video,       bg: 'bg-indigo-50',  text: 'text-indigo-500' },

  // ── Education & Tutoring ───────────────────────────────────────
  'education':        { icon: BookOpen,    bg: 'bg-sky-50',     text: 'text-sky-600' },
  'tutoring':         { icon: GraduationCap, bg: 'bg-sky-50',   text: 'text-sky-600' },

  // ── Food & Beverage ────────────────────────────────────────────
  'food-beverage':    { icon: Utensils,    bg: 'bg-orange-50',  text: 'text-orange-500' },
  'restaurants':      { icon: Utensils,    bg: 'bg-orange-50',  text: 'text-orange-500' },
  'cafes':            { icon: Coffee,      bg: 'bg-amber-50',   text: 'text-amber-700' },
  'bakeries':         { icon: Utensils,    bg: 'bg-yellow-50',  text: 'text-yellow-600' },
  'catering':         { icon: ShoppingBag, bg: 'bg-orange-50',  text: 'text-orange-500' },
  'street-food':      { icon: Utensils,    bg: 'bg-red-50',     text: 'text-red-500' },

  // ── Home Services ─────────────────────────────────────────────
  'home-services':    { icon: Home,        bg: 'bg-green-50',   text: 'text-green-600' },
  'electrical':       { icon: Zap,         bg: 'bg-yellow-50',  text: 'text-yellow-500' },
  'plumbing':         { icon: Droplets,    bg: 'bg-blue-50',    text: 'text-blue-500' },
  'cleaning':         { icon: Sparkles,    bg: 'bg-cyan-50',    text: 'text-cyan-500' },
  'painting':         { icon: Pen,         bg: 'bg-lime-50',    text: 'text-lime-600' },
  'gardening':        { icon: Leaf,        bg: 'bg-green-50',   text: 'text-green-600' },
  'security-systems': { icon: Shield,      bg: 'bg-slate-50',   text: 'text-slate-600' },

  // ── Professional Services ─────────────────────────────────────
  'professional':     { icon: Briefcase,   bg: 'bg-blue-50',    text: 'text-blue-600' },
  'legal':            { icon: Scale,       bg: 'bg-indigo-50',  text: 'text-indigo-600' },
  'medical':          { icon: HeartPulse,  bg: 'bg-red-50',     text: 'text-red-500' },
  'accounting':       { icon: Calculator,  bg: 'bg-green-50',   text: 'text-green-600' },
  'consulting':       { icon: Briefcase,   bg: 'bg-blue-50',    text: 'text-blue-600' },

  // ── Retail & Shops ────────────────────────────────────────────
  'retail':           { icon: ShoppingBag, bg: 'bg-pink-50',    text: 'text-pink-500' },
  'shop':             { icon: ShoppingCart, bg: 'bg-pink-50',   text: 'text-pink-500' },

  // ── Technology & Repair ───────────────────────────────────────
  'tech':             { icon: Laptop,      bg: 'bg-slate-50',   text: 'text-slate-600' },
  'computer-repair':  { icon: Laptop,      bg: 'bg-slate-50',   text: 'text-slate-600' },
  'phone-repair':     { icon: Smartphone,  bg: 'bg-slate-50',   text: 'text-slate-600' },
  'software-development': { icon: Code,    bg: 'bg-indigo-50',  text: 'text-indigo-600' },
  'web-development':  { icon: Globe,       bg: 'bg-indigo-50',  text: 'text-indigo-600' },

  // ── Transport & Logistics ─────────────────────────────────────
  'transport':        { icon: Car,         bg: 'bg-blue-50',    text: 'text-blue-500' },
  'logistics':        { icon: Truck,       bg: 'bg-blue-50',    text: 'text-blue-500' },
  'delivery':         { icon: Package,     bg: 'bg-amber-50',   text: 'text-amber-600' },
}

const DEFAULT = { icon: LayoutGrid, bg: 'bg-gray-50', text: 'text-gray-400' }

/**
 * Resolve config from slug, falling back to name-based matching.
 */
function resolve(slug, name) {
  if (slug && ICON_MAP[slug]) return ICON_MAP[slug]
  // Try partial slug match
  if (slug) {
    const match = Object.keys(ICON_MAP).find(k => slug.includes(k) || k.includes(slug))
    if (match) return ICON_MAP[match]
  }
  // Try name-based match
  if (name) {
    const lower = name.toLowerCase()
    const match = Object.entries(ICON_MAP).find(([k]) => lower.includes(k.replace(/-/g, ' ')))
    if (match) return match[1]
  }
  return DEFAULT
}

/**
 * CategoryIcon — renders a colored square with the category's SVG icon inside.
 *
 * Props:
 *   slug      {string}  category slug from DB
 *   name      {string}  category name (fallback for matching)
 *   size      {number}  icon size in px (default 20)
 *   boxSize   {string}  Tailwind w/h for the outer box (default 'w-10 h-10')
 *   rounded   {string}  Tailwind rounded class (default 'rounded-xl')
 *   className {string}  extra classes on the outer box
 */
export function CategoryIcon({ slug, name, size = 20, boxSize = 'w-10 h-10', rounded = 'rounded-xl', className = '' }) {
  const cfg = resolve(slug, name)
  const IconComp = cfg.icon

  return (
    <div className={`${boxSize} ${rounded} ${cfg.bg} flex items-center justify-center shrink-0 ${className}`}>
      <IconComp size={size} className={cfg.text} strokeWidth={1.8} />
    </div>
  )
}

/**
 * CategoryIconInline — just the SVG, no box. For use inside buttons/chips.
 */
export function CategoryIconInline({ slug, name, size = 15, className = '' }) {
  const cfg = resolve(slug, name)
  const IconComp = cfg.icon
  return <IconComp size={size} className={`${cfg.text} ${className}`} strokeWidth={1.8} />
}
