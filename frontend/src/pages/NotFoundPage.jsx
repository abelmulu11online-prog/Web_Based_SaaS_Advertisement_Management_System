import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Navbar } from '../components/layout/Navbar.jsx'
import { Button } from '../components/ui/Button.jsx'
import { ArrowLeft, Search } from 'lucide-react'

export default function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16" id="main-content">
        <div className="text-center max-w-sm">
          <p className="text-[80px] font-bold text-border leading-none mb-4">404</p>
          <h1 className="text-2xl font-bold text-ink mb-3">{t('common.notFound')}</h1>
          <p className="text-sm text-ink-2 mb-8 leading-relaxed">
            {t('common.notFoundDesc')}
          </p>
          <div className="flex gap-2.5 justify-center flex-wrap">
            <Button variant="primary" icon={<ArrowLeft size={14} />} onClick={() => navigate('/')}>
              {t('common.goHome')}
            </Button>
            <Button variant="secondary" icon={<Search size={14} />} onClick={() => navigate('/directory')}>
              {t('home.browseDirectory')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
