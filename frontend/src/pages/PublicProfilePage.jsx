/**
 * PublicProfilePage.jsx — Premium digital identity page.
 * i18n: English / አማርኛ via react-i18next
 */
import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Users, MessageCircle, Phone, Mail, Globe, Send,
  ArrowRight, Star, FolderOpen, FileText, Award, MessageSquare,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navbar }  from '../components/layout/Navbar.jsx'
import { Footer }  from '../components/layout/Footer.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { Button }  from '../components/ui/Button.jsx'
import { ProfileHeader }    from '../features/profiles/components/ProfileHeader.jsx'
import { ProfileNav }       from '../features/profiles/components/ProfileNav.jsx'
import { ProfileAbout }     from '../features/profiles/components/ProfileAbout.jsx'
import { ServiceCard }      from '../features/profiles/components/ServiceCard.jsx'
import { PortfolioCard }    from '../features/profiles/components/PortfolioCard.jsx'
import { PostCard }         from '../features/profiles/components/PostCard.jsx'
import { AchievementCard }  from '../features/profiles/components/AchievementCard.jsx'
import { ReviewsList }      from '../features/profiles/components/ReviewsList.jsx'
import { ReviewForm }       from '../features/profiles/components/ReviewForm.jsx'
import {
  usePublicProfile, usePublicServices,
  usePublicPortfolio, usePublicPosts, usePublicAchievements,
  usePublicReviews, useSubmitReview, useDeleteReview,
  useAddReviewReply, useDeleteReviewReply, useMyProfile,
} from '../features/profiles/hooks/useProfile.js'

/* ── Shared primitives ───────────────────────────────────────────────────────── */

function SectionTitle({ children, count, action }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-6">
      <h2 className="text-[18px] sm:text-[20px] font-bold text-ink tracking-tight">
        {children}
        {count > 0 && (
          <span className="ml-2 text-[14px] font-normal text-ink-3 tabular-nums">{count}</span>
        )}
      </h2>
      {action}
    </div>
  )
}

function ViewAllLink({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:text-brand-hover hover:underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
    >
      {label} <ArrowRight size={13} />
    </button>
  )
}

function Section({ children, className = '' }) {
  return (
    <section className={`py-8 border-b border-border last:border-b-0 ${className}`}>
      {children}
    </section>
  )
}

function EmptySection({ icon: Icon, message }) {
  return (
    <div className="py-10 text-center">
      <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-3">
        <Icon size={18} className="text-ink-4" aria-hidden="true" />
      </div>
      <p className="text-[13.5px] text-ink-3">{message}</p>
    </div>
  )
}

/* ── Portfolio gallery ───────────────────────────────────────────────────────── */
function PortfolioGallery({ items, maxItems }) {
  const { t } = useTranslation()
  const capped = maxItems ? items.slice(0, maxItems) : items
  if (!capped.length) return <EmptySection icon={FolderOpen} message={t('profile.public.noPortfolio')} />

  if (capped.length === 1) {
    return (
      <div className="max-w-lg">
        <PortfolioCard item={capped[0]} variant="large" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="col-span-2 sm:col-span-1 row-span-1 sm:row-span-2">
        <PortfolioCard item={capped[0]} variant="large" />
      </div>
      {capped.slice(1).map(item => (
        <PortfolioCard key={item.id} item={item} />
      ))}
    </div>
  )
}

/* ── Rating summary ──────────────────────────────────────────────────────────── */
function ReviewSummary({ stats }) {
  const { t } = useTranslation()
  const avg   = Number(stats?.avg_rating)  || 0
  const count = stats?.review_count || 0
  if (!count) return null

  function ratingLabel(a) {
    if (a >= 4.5) return t('profile.public.excellent')
    if (a >= 4)   return t('profile.public.veryGood')
    if (a >= 3)   return t('profile.public.good')
    if (a >= 2)   return t('profile.public.fair')
    return t('profile.public.poor')
  }

  return (
    <div className="flex items-center gap-5 mb-7 pb-7 border-b border-border">
      <div className="text-center shrink-0">
        <div className="text-[44px] font-extrabold text-ink leading-none tracking-tight">
          {avg.toFixed(1)}
        </div>
        <div className="flex justify-center gap-0.5 mt-1.5">
          {[1, 2, 3, 4, 5].map(n => (
            <Star
              key={n}
              size={13}
              className={n <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-border-2'}
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="text-[12px] text-ink-3 mt-1">
          {count} {count !== 1 ? t('profile.public.reviews_plural') : t('profile.public.review')}
        </p>
      </div>
      <div className="w-px h-16 bg-border shrink-0" aria-hidden="true" />
      <div>
        <p className="text-[15px] font-semibold text-ink mb-0.5">{ratingLabel(avg)}</p>
        <p className="text-[13px] text-ink-2">
          {count !== 1
            ? t('profile.public.basedOnPlural', { count })
            : t('profile.public.basedOn', { count })}
        </p>
      </div>
    </div>
  )
}

/* ── Loading skeleton ────────────────────────────────────────────────────────── */
function ProfileSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-0">
      <Skeleton className="h-44 sm:h-56 rounded-none" />
      <div className="px-0 pt-4">
        <div className="flex items-end justify-between -mt-10 mb-5">
          <Skeleton className="w-20 h-20 rounded-xl border-[3px] border-surface" />
          <Skeleton className="h-9 w-28 rounded-lg hidden sm:block" />
        </div>
        <Skeleton className="h-3 w-24 rounded mb-2" />
        <Skeleton className="h-7 w-56 rounded mb-2" />
        <Skeleton className="h-4 w-40 rounded mb-4" />
        <Skeleton className="h-3 w-32 rounded mb-6" />
        <div className="flex gap-6 border-b border-border pb-0 mb-0">
          {['Overview', 'Services', 'Portfolio', 'Reviews'].map(l => (
            <Skeleton key={l} className="h-3 w-14 rounded mb-3" />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Mobile sticky contact bar ───────────────────────────────────────────────── */
function MobileContactBar({ profile }) {
  const { t } = useTranslation()
  const c = profile.contact
  if (!c) return null

  let primaryHref  = null
  let primaryLabel = null
  let PrimaryIcon  = null

  if (c.whatsapp) {
    primaryHref  = `https://wa.me/${c.whatsapp.replace(/\D/g, '')}`
    primaryLabel = t('profile.public.whatsapp')
    PrimaryIcon  = MessageCircle
  } else if (c.phone) {
    primaryHref  = `tel:${c.phone}`
    primaryLabel = t('profile.public.call')
    PrimaryIcon  = Phone
  } else if (c.email) {
    primaryHref  = `mailto:${c.email}`
    primaryLabel = t('profile.public.email')
    PrimaryIcon  = Mail
  }

  if (!primaryHref) return null

  return (
    <div
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-sm border-t border-border px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 flex items-center gap-2"
      role="complementary"
      aria-label="Contact actions"
    >
      {c.phone && primaryLabel !== t('profile.public.call') && (
        <a
          href={`tel:${c.phone}`}
          className="h-11 w-11 flex items-center justify-center border border-border rounded-xl text-ink-2 hover:border-brand-border hover:text-brand transition-all shrink-0"
          aria-label={t('profile.public.call')}
        >
          <Phone size={16} />
        </a>
      )}
      {c.telegram && (
        <a
          href={`https://t.me/${c.telegram.replace('@', '')}`}
          target="_blank" rel="noopener noreferrer"
          className="h-11 w-11 flex items-center justify-center border border-border rounded-xl text-ink-2 hover:border-brand-border hover:text-brand transition-all shrink-0"
          aria-label="Telegram"
        >
          <Send size={16} />
        </a>
      )}
      <a
        href={primaryHref}
        target={primaryLabel === t('profile.public.whatsapp') ? '_blank' : undefined}
        rel={primaryLabel === t('profile.public.whatsapp') ? 'noopener noreferrer' : undefined}
        className="flex-1 h-11 rounded-xl bg-brand text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-brand-hover active:scale-[0.98] transition-all duration-150"
      >
        {PrimaryIcon && <PrimaryIcon size={16} aria-hidden="true" />}
        {primaryLabel}
      </a>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   PublicProfilePage
══════════════════════════════════════════════════════════════════════════════ */
export default function PublicProfilePage() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const [activeTab,  setActiveTab]  = useState('overview')
  const [reviewPage, setReviewPage] = useState(1)
  const isLoggedIn = !!localStorage.getItem('accessToken')

  /* ── Data ──────────────────────────────────────────────────────────────── */
  const { data: profile,      isLoading, error } = usePublicProfile(slug)
  const { data: servicesData  }  = usePublicServices(slug)
  const { data: portfolioData }  = usePublicPortfolio(slug)
  const { data: postsData     }  = usePublicPosts(slug)
  const { data: achievements  }  = usePublicAchievements(slug)
  const { data: reviewsData,  isLoading: reviewsLoading } = usePublicReviews(slug, reviewPage)
  const { data: myProfile     }  = useMyProfile()

  const submitReview    = useSubmitReview(slug)
  const deleteReview    = useDeleteReview(slug)
  const addReviewReply  = useAddReviewReply(slug)
  const deleteReviewReply = useDeleteReviewReply(slug)

  const isProfileOwner = !!(myProfile && profile && myProfile.slug === profile.slug)

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  async function handleReviewSubmit(data) {
    try { await submitReview.mutateAsync(data) } catch (err) { console.error(err) }
  }
  async function handleReviewDelete(reviewId) {
    try { await deleteReview.mutateAsync(reviewId) } catch (err) { console.error(err) }
  }
  async function handleReplySubmit(reviewId, body) {
    await addReviewReply.mutateAsync({ reviewId, body })
  }
  async function handleDeleteReply(reviewId) {
    await deleteReviewReply.mutateAsync(reviewId)
  }

  /* ── Loading ───────────────────────────────────────────────────────────── */
  if (isLoading) return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />
      <main className="flex-1"><ProfileSkeleton /></main>
      <Footer />
    </div>
  )

  /* ── Not found ─────────────────────────────────────────────────────────── */
  if (error || !profile) return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-5 py-20">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-5">
            <Users size={28} className="text-ink-4" aria-hidden="true" />
          </div>
          <h1 className="text-[20px] font-bold text-ink mb-2">{t('profile.public.notFound')}</h1>
          <p className="text-[14px] text-ink-2 mb-6 leading-relaxed">
            {t('profile.public.notFoundDesc', { slug })}
          </p>
          <Link to="/directory">
            <Button variant="primary" size="md">{t('profile.public.browseDirectory')}</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )

  /* ── Derived data ──────────────────────────────────────────────────────── */
  const sections       = profile.sections || {}
  const services       = servicesData?.services    || []
  const portfolioItems = portfolioData?.items       || []
  const posts          = postsData?.posts           || []
  const reviews        = reviewsData?.reviews       || []
  const reviewStats    = reviewsData?.stats         || {}
  const reviewPagination = reviewsData?.pagination  || {}

  const tabs = [
    { key: 'overview',      label: t('profile.public.overview'),      count: 0 },
    sections.services     > 0 && { key: 'services',     label: t('profile.public.services'),     count: sections.services },
    sections.portfolio    > 0 && { key: 'portfolio',    label: t('profile.public.portfolio'),    count: sections.portfolio },
    sections.posts        > 0 && { key: 'posts',        label: t('profile.public.updates'),      count: sections.posts },
    sections.achievements > 0 && { key: 'achievements', label: t('profile.public.achievements'), count: sections.achievements },
    { key: 'reviews',  label: t('profile.public.reviews'), count: sections.reviews || 0 },
    { key: 'about',    label: t('profile.public.about'),   count: 0, mobileOnly: true },
  ].filter(Boolean)

  const visibleTabs = tabs.filter(t => !t.mobileOnly)

  /* ── Section renderers ─────────────────────────────────────────────────── */

  const OverviewContent = () => (
    <>
      {services.length > 0 && (
        <Section>
          <SectionTitle
            count={sections.services}
            action={sections.services > 4 && (
              <ViewAllLink
                label={t('profile.public.allServices', { count: sections.services })}
                onClick={() => setActiveTab('services')}
              />
            )}
          >
            {t('profile.public.services')}
          </SectionTitle>
          <div>
            {services.slice(0, 4).map((s, i) => (
              <ServiceCard key={s.id} service={s} compact index={i} />
            ))}
          </div>
        </Section>
      )}

      {portfolioItems.length > 0 && (
        <Section>
          <SectionTitle
            count={sections.portfolio}
            action={sections.portfolio > 5 && (
              <ViewAllLink
                label={t('profile.public.viewAll')}
                onClick={() => setActiveTab('portfolio')}
              />
            )}
          >
            {t('profile.public.portfolio')}
          </SectionTitle>
          <PortfolioGallery items={portfolioItems} maxItems={5} />
        </Section>
      )}

      {posts.length > 0 && (
        <Section>
          <SectionTitle
            count={sections.posts}
            action={sections.posts > 2 && (
              <ViewAllLink
                label={t('profile.public.seeAllUpdates')}
                onClick={() => setActiveTab('posts')}
              />
            )}
          >
            {t('profile.public.latestUpdates')}
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.slice(0, 2).map(p => <PostCard key={p.id} post={p} />)}
          </div>
        </Section>
      )}

      {achievements?.length > 0 && (
        <Section>
          <SectionTitle
            count={achievements.length}
            action={achievements.length > 3 && (
              <ViewAllLink
                label={t('profile.public.seeAll')}
                onClick={() => setActiveTab('achievements')}
              />
            )}
          >
            {t('profile.public.achievements')}
          </SectionTitle>
          <div>
            {achievements.slice(0, 3).map(a => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </Section>
      )}

      <Section>
        <SectionTitle
          count={sections.reviews || 0}
          action={(sections.reviews || 0) > 3 && (
            <ViewAllLink
              label={t('profile.public.allReviews', { count: sections.reviews })}
              onClick={() => setActiveTab('reviews')}
            />
          )}
        >
          {t('profile.public.reviews')}
        </SectionTitle>
        <ReviewSummary stats={reviewStats} />
        <ReviewsList
          reviews={reviews.slice(0, 3)}
          stats={reviewStats}
          loading={reviewsLoading}
          currentUserId={null}
          isProfileOwner={isProfileOwner}
          onDelete={handleReviewDelete}
          onReply={handleReplySubmit}
          onDeleteReply={handleDeleteReply}
        />
      </Section>

      {!services.length && !portfolioItems.length && !posts.length && !achievements?.length && (
        <Section><ProfileAbout profile={profile} /></Section>
      )}
    </>
  )

  const ServicesContent = () => (
    <Section>
      <SectionTitle count={sections.services}>{t('profile.public.services')}</SectionTitle>
      {services.length === 0
        ? <EmptySection icon={FileText} message={t('profile.public.noServices')} />
        : <div>{services.map((s, i) => <ServiceCard key={s.id} service={s} index={i} />)}</div>
      }
    </Section>
  )

  const PortfolioContent = () => (
    <Section>
      <SectionTitle count={sections.portfolio}>{t('profile.public.portfolio')}</SectionTitle>
      <PortfolioGallery items={portfolioItems} />
    </Section>
  )

  const PostsContent = () => (
    <Section>
      <SectionTitle count={sections.posts}>{t('profile.public.updates')}</SectionTitle>
      {posts.length === 0
        ? <EmptySection icon={FileText} message={t('profile.public.noPosts')} />
        : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.map(p => <PostCard key={p.id} post={p} />)}
          </div>
      }
    </Section>
  )

  const AchievementsContent = () => (
    <Section>
      <SectionTitle count={achievements?.length}>{t('profile.public.achievements')}</SectionTitle>
      {!achievements?.length
        ? <EmptySection icon={Award} message={t('profile.public.noAchievements')} />
        : <div>{achievements.map(a => <AchievementCard key={a.id} achievement={a} />)}</div>
      }
    </Section>
  )

  const ReviewsContent = () => (
    <section className="py-8">
      <SectionTitle count={sections.reviews || 0}>{t('profile.public.reviews')}</SectionTitle>
      <ReviewSummary stats={reviewStats} />
      <div className="mb-7">
        <ReviewForm
          slug={slug}
          isLoggedIn={isLoggedIn}
          onSubmit={handleReviewSubmit}
          loading={submitReview.isPending}
        />
      </div>
      <ReviewsList
        reviews={reviews}
        stats={reviewStats}
        loading={reviewsLoading}
        hasMore={reviewPagination.has_next}
        onLoadMore={() => setReviewPage(p => p + 1)}
        loadingMore={reviewsLoading && reviewPage > 1}
        currentUserId={null}
        isProfileOwner={isProfileOwner}
        onDelete={handleReviewDelete}
        onReply={handleReplySubmit}
        onDeleteReply={handleDeleteReply}
      />
    </section>
  )

  const AboutContent = () => (
    <section className="py-8"><ProfileAbout profile={profile} /></section>
  )

  function renderActiveSection() {
    switch (activeTab) {
      case 'services':     return <ServicesContent />
      case 'portfolio':    return <PortfolioContent />
      case 'posts':        return <PostsContent />
      case 'achievements': return <AchievementsContent />
      case 'reviews':      return <ReviewsContent />
      case 'about':        return <AboutContent />
      default:             return <OverviewContent />
    }
  }

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      <Navbar />

      <main className="flex-1" id="main-content">

        {/* Breadcrumb */}
        <nav className="bg-canvas border-b border-border" aria-label="Breadcrumb">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-2.5 flex items-center gap-1.5 text-[12px] text-ink-3">
            <Link to="/" className="hover:text-brand hover:no-underline transition-colors">
              {t('profile.public.home')}
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/directory" className="hover:text-brand hover:no-underline transition-colors">
              {t('profile.public.directory')}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink truncate max-w-[160px]">{profile.display_name}</span>
          </div>
        </nav>

        {/* Page body */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8">

          {/* Profile header — full width */}
          <div className="-mx-5 sm:-mx-8">
            <ProfileHeader profile={profile} />
          </div>

          {/* Nav */}
          {visibleTabs.length > 1 && (
            <div className="-mx-5 sm:-mx-8">
              <ProfileNav
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          )}

          {/* Two-column layout */}
          <div className="flex gap-10 items-start pt-2">

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {renderActiveSection()}
            </div>

            {/* Desktop sidebar */}
            <aside
              className="hidden lg:block w-72 shrink-0 sticky top-[108px]"
              aria-label="Profile details"
            >
              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-5">
                  <ProfileAbout profile={profile} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
      <MobileContactBar profile={profile} />
    </div>
  )
}
