import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Footer } from '../components/layout/Footer.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { ProfileHeader } from '../features/profiles/components/ProfileHeader.jsx'
import { ProfileNav } from '../features/profiles/components/ProfileNav.jsx'
import { ProfileAbout } from '../features/profiles/components/ProfileAbout.jsx'
import { ProductCard } from '../features/profiles/components/ProductCard.jsx'
import { ServiceCard } from '../features/profiles/components/ServiceCard.jsx'
import { PortfolioCard } from '../features/profiles/components/PortfolioCard.jsx'
import { PostCard } from '../features/profiles/components/PostCard.jsx'
import { AchievementCard } from '../features/profiles/components/AchievementCard.jsx'
import {
  usePublicProfile, usePublicProducts, usePublicServices,
  usePublicPortfolio, usePublicPosts, usePublicAchievements,
} from '../features/profiles/hooks/useProfile.js'

function SectionGrid({ children, cols = 3 }) {
  const colMap = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }
  return <div className={`grid grid-cols-1 ${colMap[cols]} gap-4`}>{children}</div>
}

function SectionHeader({ title, count }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
      {count > 0 && <span className="text-[12px] text-ink-3">{count} item{count !== 1 ? 's' : ''}</span>}
    </div>
  )
}

export default function PublicProfilePage() {
  const { slug } = useParams()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: profile, isLoading, error } = usePublicProfile(slug)
  const { data: productsData }   = usePublicProducts(slug)
  const { data: servicesData }   = usePublicServices(slug)
  const { data: portfolioData }  = usePublicPortfolio(slug)
  const { data: postsData }      = usePublicPosts(slug)
  const { data: achievements }   = usePublicAchievements(slug)

  if (isLoading) return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      </div>
      <Footer />
    </>
  )

  if (error || !profile) return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-[15px] font-semibold text-ink mb-2">Profile not found</p>
        <p className="text-[13.5px] text-ink-3 mb-6">The profile <strong>@{slug}</strong> does not exist or is not public.</p>
        <Link to="/" className="text-brand text-[13.5px]">Go home</Link>
      </div>
      <Footer />
    </>
  )

  const sections = profile.sections || {}
  const tabs = [
    { key: 'overview',      label: 'Overview',      count: 0 },
    sections.products     > 0 && { key: 'products',  label: 'Products',     count: sections.products },
    sections.services     > 0 && { key: 'services',  label: 'Services',     count: sections.services },
    sections.portfolio    > 0 && { key: 'portfolio', label: 'Portfolio',    count: sections.portfolio },
    sections.posts        > 0 && { key: 'posts',     label: 'Updates',      count: sections.posts },
    sections.achievements > 0 && { key: 'achievements', label: 'Achievements', count: sections.achievements },
    { key: 'about', label: 'About', count: 0 },
  ].filter(Boolean)

  const products    = productsData?.products    || []
  const services    = servicesData?.services    || []
  const portfolioItems = portfolioData?.items   || []
  const posts       = postsData?.posts          || []

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <ProfileHeader profile={profile} />
        {tabs.length > 2 && (
          <ProfileNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        )}

        <div className="space-y-6">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {products.length > 0 && (
                <div>
                  <SectionHeader title="Products" count={sections.products} />
                  <SectionGrid cols={3}>
                    {products.slice(0, 6).map(p => <ProductCard key={p.id} product={p} />)}
                  </SectionGrid>
                  {sections.products > 6 && (
                    <button onClick={() => setActiveTab('products')} className="mt-3 text-[13px] text-brand hover:underline">
                      View all {sections.products} products
                    </button>
                  )}
                </div>
              )}
              {services.length > 0 && (
                <div>
                  <SectionHeader title="Services" count={sections.services} />
                  <SectionGrid cols={2}>
                    {services.slice(0, 4).map(s => <ServiceCard key={s.id} service={s} />)}
                  </SectionGrid>
                  {sections.services > 4 && (
                    <button onClick={() => setActiveTab('services')} className="mt-3 text-[13px] text-brand hover:underline">
                      View all {sections.services} services
                    </button>
                  )}
                </div>
              )}
              {portfolioItems.length > 0 && (
                <div>
                  <SectionHeader title="Portfolio" count={sections.portfolio} />
                  <SectionGrid cols={3}>
                    {portfolioItems.slice(0, 3).map(i => <PortfolioCard key={i.id} item={i} />)}
                  </SectionGrid>
                </div>
              )}
              {posts.length > 0 && (
                <div>
                  <SectionHeader title="Recent Updates" count={sections.posts} />
                  <SectionGrid cols={2}>
                    {posts.slice(0, 2).map(p => <PostCard key={p.id} post={p} />)}
                  </SectionGrid>
                </div>
              )}
              {achievements?.length > 0 && (
                <div>
                  <SectionHeader title="Achievements" count={achievements.length} />
                  <div className="space-y-3">
                    {achievements.slice(0, 3).map(a => <AchievementCard key={a.id} achievement={a} />)}
                  </div>
                </div>
              )}
              {/* If profile has nothing yet */}
              {!products.length && !services.length && !portfolioItems.length && !posts.length && !achievements?.length && (
                <ProfileAbout profile={profile} />
              )}
            </>
          )}

          {/* PRODUCTS */}
          {activeTab === 'products' && (
            <div>
              <SectionHeader title="Products" count={sections.products} />
              <SectionGrid cols={3}>
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </SectionGrid>
            </div>
          )}

          {/* SERVICES */}
          {activeTab === 'services' && (
            <div>
              <SectionHeader title="Services" count={sections.services} />
              <SectionGrid cols={2}>
                {services.map(s => <ServiceCard key={s.id} service={s} />)}
              </SectionGrid>
            </div>
          )}

          {/* PORTFOLIO */}
          {activeTab === 'portfolio' && (
            <div>
              <SectionHeader title="Portfolio" count={sections.portfolio} />
              <SectionGrid cols={3}>
                {portfolioItems.map(i => <PortfolioCard key={i.id} item={i} />)}
              </SectionGrid>
            </div>
          )}

          {/* POSTS */}
          {activeTab === 'posts' && (
            <div>
              <SectionHeader title="Updates" count={sections.posts} />
              <SectionGrid cols={2}>
                {posts.map(p => <PostCard key={p.id} post={p} />)}
              </SectionGrid>
            </div>
          )}

          {/* ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div>
              <SectionHeader title="Achievements" count={achievements?.length} />
              <div className="space-y-3">
                {achievements?.map(a => <AchievementCard key={a.id} achievement={a} />)}
              </div>
            </div>
          )}

          {/* ABOUT */}
          {activeTab === 'about' && (
            <div className="bg-surface border border-border rounded-lg p-5">
              <ProfileAbout profile={profile} />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
