import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type PropsWithChildren, type ReactNode, type SyntheticEvent } from 'react'
import { BrowserRouter, HashRouter, Link, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Clock3, Copy, Download, ExternalLink,
  FileText, Globe2, Layers3, LayoutDashboard, MapPin, Menu, Moon, NotebookPen, Package, PackageSearch, Paperclip, Pencil, Phone, Plus, Ruler,
  Search, Settings, ShieldAlert, ShoppingBag, Sun, Tag, Trash2, Upload, Users, X,
} from 'lucide-react'
import { messages, type Language } from './i18n'
import { useStore } from './store'
import { isAppData, type AppData, type Brand, type Category, type CustomerRequest, type Offer, type Product, type RequestItem } from './types'

type Theme = 'light' | 'dark'
type RequestLine = { productId: string; quantity: number }
type RequestContextValue = { lines: RequestLine[]; add: (productId: string, quantity: number) => void; update: (productId: string, quantity: number) => void; remove: (productId: string) => void; clear: () => void; storageError: string; clearStorageError: () => void }
import { Navigate } from 'react-router-dom'

const RequestContext = createContext<RequestContextValue | null>(null)
const getInitial = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch (error) {
    console.error(`Unable to read ${key}`, error)
    return fallback
  }
}
const idFor = (name: string) => `${name.toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')}-${Date.now().toString(36)}`
const handleProductImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  if (event.currentTarget.dataset.fallback) return
  event.currentTarget.dataset.fallback = 'true'
  event.currentTarget.src = `${import.meta.env.BASE_URL}product-placeholder.svg`
}
function updateCardSpotlight(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return
  const bounds = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - bounds.left) / bounds.width
  const y = (event.clientY - bounds.top) / bounds.height
  event.currentTarget.style.setProperty('--spotlight-x', `${x * 100}%`)
  event.currentTarget.style.setProperty('--spotlight-y', `${y * 100}%`)
  event.currentTarget.style.setProperty('--tilt-x', `${(0.5 - y) * 3}deg`)
  event.currentTarget.style.setProperty('--tilt-y', `${(x - 0.5) * 3}deg`)
}
function resetCardSpotlight(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return
  for (const property of ['--spotlight-x', '--spotlight-y', '--tilt-x', '--tilt-y']) {
    event.currentTarget.style.removeProperty(property)
  }
}
function updateSpotlight(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return
  const bounds = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--spotlight-x', `${((event.clientX - bounds.left) / bounds.width) * 100}%`)
  event.currentTarget.style.setProperty('--spotlight-y', `${((event.clientY - bounds.top) / bounds.height) * 100}%`)
}
function resetSpotlight(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return
  event.currentTarget.style.removeProperty('--spotlight-x')
  event.currentTarget.style.removeProperty('--spotlight-y')
}
function animateProductToRequest(image: string, source: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof Element.prototype.animate !== 'function') return
  const target = Array.from(document.querySelectorAll<HTMLElement>('[data-request-target]'))
    .find(element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0)
  const sourceImage = source.closest('.product-card')?.querySelector<HTMLImageElement>('.product-image img')
  if (!target || !sourceImage) return
  const start = sourceImage.getBoundingClientRect()
  const finish = target.getBoundingClientRect()
  const flyer = document.createElement('span')
  flyer.className = 'request-flyer'
  flyer.style.left = `${start.left}px`
  flyer.style.top = `${start.top}px`
  flyer.style.width = `${start.width}px`
  flyer.style.height = `${start.height}px`
  const flyerImage = document.createElement('img')
  flyerImage.src = image
  flyerImage.alt = ''
  flyer.append(flyerImage)
  document.body.append(flyer)
  const deltaX = finish.left + finish.width / 2 - (start.left + start.width / 2)
  const deltaY = finish.top + finish.height / 2 - (start.top + start.height / 2)
  const animation = flyer.animate([
    { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)', opacity: 1, borderRadius: '14px' },
    { offset: 0.14, transform: 'translate3d(0,-15px,0) scale(1.06) rotate(-4deg)', opacity: 1, borderRadius: '16px' },
    { transform: `translate3d(${deltaX}px,${deltaY}px,0) scale(.12) rotate(18deg)`, opacity: 0.25, borderRadius: '50%' },
  ], { duration: 760, easing: 'cubic-bezier(.2,.85,.28,1)' })
  animation.onfinish = () => flyer.remove()
  target.classList.remove('is-catching')
  requestAnimationFrame(() => target.classList.add('is-catching'))
  window.setTimeout(() => target.classList.remove('is-catching'), 520)
}
const useRequests = () => {
  const value = useContext(RequestContext)
  if (!value) throw new Error('Request context is missing')
  return value
}
const useCopy = (lang: Language) => (ar: string, en: string) => lang === 'ar' ? ar : en
function BrandLockup({ tagline }: { tagline: string }) {
  const { data } = useStore()
  const companyName = data.settings.companyName || 'ERASE'
  const logo = data.settings.logo.trim()
  return <><span className={`brand-symbol ${logo ? 'has-logo' : ''}`}>{logo ? <img src={logo} alt="" /> : <span />}</span><span className="brand-name">{companyName}<span className="brand-period">.</span><small>{tagline}</small></span></>
}

function AppProviders({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<RequestLine[]>(() => getInitial('erase-urt-request-list', []))
  const [storageError, setStorageError] = useState('')
  useEffect(() => {
    try {
      localStorage.setItem('erase-urt-request-list', JSON.stringify(lines))
      setStorageError('')
    } catch (error) {
      console.error('Unable to persist request list', error)
      setStorageError('تعذر حفظ قائمة الطلب في هذا الجهاز.')
    }
  }, [lines])
  const value = useMemo<RequestContextValue>(() => ({
    lines,
    add: (productId, quantity) => setLines(current => {
      const existing = current.find(line => line.productId === productId)
      return existing
        ? current.map(line => line.productId === productId ? { ...line, quantity: Math.min(1000000, line.quantity + quantity) } : line)
        : [...current, { productId, quantity }]
    }),
    update: (productId, quantity) => setLines(current => current.map(line => line.productId === productId ? { ...line, quantity } : line)),
    remove: productId => setLines(current => current.filter(line => line.productId !== productId)),
    clear: () => setLines([]),
    storageError,
    clearStorageError: () => setStorageError(''),
  }), [lines, storageError])
  return <RequestContext.Provider value={value}>{children}</RequestContext.Provider>
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => getInitial<Language>('erase-urt-language', 'ar'))
  const [theme, setTheme] = useState<Theme>(() => getInitial<Theme>('erase-urt-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('erase-urt-language', JSON.stringify(lang))
      localStorage.setItem('erase-urt-theme', JSON.stringify(theme))
    } catch (error) {
      console.error('Unable to save locale preferences', error)
    }
  }, [lang, theme])
  const contextValue = useMemo(() => ({ lang, setLang, theme, setTheme }), [lang, theme])
  const Router = import.meta.env.PROD ? HashRouter : BrowserRouter
  return (
    <Router>
      <LocaleContext.Provider value={contextValue}>
        <AppProviders>
          <StoreApplication />
        </AppProviders>
      </LocaleContext.Provider>
    </Router>
  )
}

type LocaleValue = { lang: Language; setLang: (lang: Language) => void; theme: Theme; setTheme: (theme: Theme) => void }
const LocaleContext = createContext<LocaleValue | null>(null)
function useLocale() {
  const locale = useContext(LocaleContext)
  if (!locale) throw new Error('Locale context is missing')
  return locale
}
function StoreApplication() {
  const { data, isLoading, storageError, clearStorageError } = useStore()
  const requestStore = useRequests()
  const { lang } = useLocale()
  const location = useLocation()
  const t = messages[lang]
  useEffect(() => {
    const base = import.meta.env.PROD
      ? new URL(import.meta.env.BASE_URL, window.location.origin).href
      : data.settings.homeUrl || window.location.origin
    try {
      const canonical = import.meta.env.PROD
        ? `${base}#${location.pathname}`
        : new URL(location.pathname, base).href
      let canonicalTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (!canonicalTag) {
        canonicalTag = document.createElement('link')
        canonicalTag.rel = 'canonical'
        document.head.append(canonicalTag)
      }
      canonicalTag.href = canonical
      const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (favicon) favicon.href = data.settings.favicon || `${import.meta.env.BASE_URL}favicon.svg`
      const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
      if (description) description.content = lang === 'ar'
        ? 'ERASE — مستلزمات مكتبية ومدرسية للأفراد والأعمال. اختر احتياجاتك واطلب عرض سعر.'
        : 'ERASE — stationery and office essentials for individuals and teams. Build a request and ask for a quote.'
      const pageTitles: Record<string, string> = {
        '/': lang === 'ar' ? 'ERASE — امسح القديم، اكتب الجديد' : 'ERASE — Write what’s next',
        '/products': lang === 'ar' ? 'المنتجات — ERASE' : 'Products — ERASE',
        '/categories': lang === 'ar' ? 'الفئات — ERASE' : 'Categories — ERASE',
        '/offers': lang === 'ar' ? 'العروض — ERASE' : 'Offers — ERASE',
        '/bulk-orders': lang === 'ar' ? 'طلبات الشركات — ERASE' : 'Business requests — ERASE',
        '/about': lang === 'ar' ? 'عن ERASE' : 'About ERASE',
        '/contact': lang === 'ar' ? 'تواصل معنا — ERASE' : 'Contact — ERASE',
        '/request': lang === 'ar' ? 'قائمة الطلب — ERASE' : 'Request list — ERASE',
      }
      if (!location.pathname.startsWith('/products/')) document.title = pageTitles[location.pathname] ?? 'ERASE'
      document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', document.title)
      document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', canonical)
      document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', document.title)
      document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', description?.content ?? '')
      let structuredData = document.querySelector<HTMLScriptElement>('#erase-structured-data')
      if (!structuredData) {
        structuredData = document.createElement('script')
        structuredData.id = 'erase-structured-data'
        structuredData.type = 'application/ld+json'
        document.head.append(structuredData)
      }
      structuredData.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: data.settings.companyName || 'ERASE',
        url: data.settings.homeUrl,
        description: description?.content ?? '',
      }).replace(/</g, '\\u003c')
    } catch (error) {
      console.error('Unable to update page metadata', error)
    }
  }, [data.settings.homeUrl, lang, location.pathname])
  if (isLoading) return <div className="app-loading" role="status"><BrandLockup tagline={lang === 'ar' ? 'امسح القديم، اكتب الجديد.' : 'Erase the old. Write what’s next.'} /><span>{lang === 'ar' ? 'نرتّب مساحتك...' : 'Setting up your space...'}</span></div>
  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<CatalogPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categories/:slug" element={<CatalogPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/bulk-orders" element={<BulkPage />} />
          <Route path="/business" element={<BulkPage />} />
          <Route path="/about" element={<InfoPage kind="about" />} />
          <Route path="/contact" element={<InfoPage kind="contact" />} />
          <Route path="/request" element={<RequestPage />} />
          <Route path="/request/checkout" element={<CheckoutPage />} />
          <Route path="/request/sent" element={<RequestSentPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="brands" element={<AdminBrands />} />
          <Route path="offers" element={<AdminOffers />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="backup" element={<AdminBackup />} />
          <Route path="*" element={<AdminNotFound />} />
        </Route>
      </Routes>
      {(storageError || requestStore.storageError) && <div className="storage-alert" role="alert"><span>{storageError || requestStore.storageError}</span><button onClick={() => { clearStorageError(); requestStore.clearStorageError() }} aria-label={t.close}><X size={16} /></button></div>}
    </>
  )
}

function PublicLayout() {
  const { lang, setLang, theme, setTheme } = useLocale()
  const { lines } = useRequests()
  const t = messages[lang]
  const copy = useCopy(lang)
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [introVisible, setIntroVisible] = useState(() => {
    try {
      return !sessionStorage.getItem('erase-intro-seen')
    } catch (error) {
      console.error('Unable to read intro preference', error)
      return false
    }
  })
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }, [location.pathname])
  useEffect(() => { if (searchOpen) searchInputRef.current?.focus() }, [searchOpen])
  useEffect(() => {
    let frame = 0
    const updateProgress = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight
        document.documentElement.style.setProperty('--page-scroll-progress', `${scrollable > 0 ? window.scrollY / scrollable : 0}`)
      })
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
      document.documentElement.style.removeProperty('--page-scroll-progress')
    }
  }, [location.pathname])
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('.public-site [data-reveal]:not(.is-visible)')
    if (!('IntersectionObserver' in window)) {
      sections.forEach(section => section.classList.add('is-visible'))
      return
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [location.pathname])
  useEffect(() => {
    if (!introVisible) return
    try {
      sessionStorage.setItem('erase-intro-seen', 'true')
    } catch (error) {
      console.error('Unable to save intro preference', error)
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const close = window.setTimeout(() => setIntroVisible(false), reduced ? 250 : 2050)
    return () => window.clearTimeout(close)
  }, [introVisible])
  const navLinks = [
    ['/products', t.navProducts],
    ['/categories', t.navCategories],
    ['/offers', t.navOffers],
    ['/bulk-orders', t.navBulk],
    ['/about', t.navAbout],
    ['/contact', t.navContact],
  ]
  return (
    <div className="public-site">
      {introVisible && <IntroReveal />}
      <div className="scroll-progress" aria-hidden="true" />
      <header className="site-header">
        <Link className="brand-lockup" to="/" aria-label="ERASE home">
          <BrandLockup tagline={copy('امسح القديم، اكتب الجديد.','Erase the old. Write what’s next.')} />
        </Link>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label={copy('القائمة الرئيسية','Main navigation')} onPointerMove={updateSpotlight} onPointerLeave={resetSpotlight}>
          {navLinks.map(([href, label]) => <NavLink key={href} to={href} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
          <Link className="mobile-request-link" to="/request">{t.request} <span>{lines.length}</span></Link>
        </nav>
        <div className="header-actions">
          <form className={`header-search ${searchOpen ? 'is-open' : ''}`} onSubmit={event => { event.preventDefault(); navigate(`/products?search=${encodeURIComponent(search)}`) }}>
            <button className="search-trigger" type="button" aria-label={t.search} aria-expanded={searchOpen} onClick={() => setSearchOpen(true)}><Search size={16} aria-hidden="true" /></button>
            <input ref={searchInputRef} aria-label={t.search} placeholder={t.search} value={search} onChange={event => setSearch(event.target.value)} />
          </form>
          <button className="icon-button lang-switch" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}><Globe2 size={17} /><span>{lang === 'ar' ? 'EN' : 'ع'}</span></button>
          <button className="icon-button theme-switch" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={copy('تغيير المظهر','Toggle theme')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
          <Link className="request-link" to="/request" data-request-target aria-label={`${t.request} (${lines.length})`}><ShoppingBag size={18} /><span>{t.request}</span><b>{lines.length}</b></Link>
          <Link className="tablet-request-link" to="/request" data-request-target aria-label={`${t.request} (${lines.length})`}><ShoppingBag size={18} /><b>{lines.length}</b></Link>
          <button className="icon-button menu-toggle" onClick={() => setMenuOpen(value => !value)} aria-label={menuOpen ? t.close : t.menu}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      <main className="page-transition" key={location.pathname}><Outlet /></main>
      <Footer />
      <div className="mobile-bottom-bar">
        <Link to="/products"><PackageSearch size={19} /><span>{t.navProducts}</span></Link>
        <Link to="/categories"><Layers3 size={19} /><span>{t.navCategories}</span></Link>
        <Link to="/request" data-request-target><ShoppingBag size={19} /><span>{t.request}{lines.length > 0 && <b>{lines.length}</b>}</span></Link>
        <Link to="/contact"><Globe2 size={19} /><span>{t.navContact}</span></Link>
      </div>
    </div>
  )
}

function IntroReveal() {
  const { lang } = useLocale()
  return <div className="intro-overlay" aria-hidden="true">
    <span className="intro-grid" />
    <span className="intro-orbit intro-orbit-one" />
    <span className="intro-orbit intro-orbit-two" />
    <span className="intro-kicker">ERASE / PAPER GOODS</span>
    <span className="intro-brand-mark"><span className="intro-mark-ring" /><Pencil size={32} strokeWidth={1.4} /><i /></span>
    <span className="intro-word">{Array.from('ERASE').map((letter, index) => <span key={`${letter}-${index}`} style={{ animationDelay: `${index * 90}ms` }}>{letter}</span>)}<b>.</b></span>
    <span className="intro-tagline">{lang === 'ar' ? 'امسح القديم، اكتب الجديد.' : 'Erase the old. Write what’s next.'}</span>
    <span className="intro-index">EST. 2024 <i /> BAGHDAD, IRAQ</span>
  </div>
}

function Footer() {
  const { lang } = useLocale()
  const t = messages[lang]
  const copy = useCopy(lang)
  const { data } = useStore()
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand"><Link className="brand-lockup" to="/"><BrandLockup tagline={t.footerTagline} /></Link><p>{t.source}</p></div>
        <div className="footer-links"><strong>{copy('اكتشف','Explore')}</strong><Link to="/products">{t.navProducts}</Link><Link to="/categories">{t.navCategories}</Link><Link to="/offers">{t.navOffers}</Link><Link to="/bulk-orders">{t.navBulk}</Link></div>
        <div className="footer-links"><strong>{copy('عن الشركة','Company')}</strong><Link to="/about">{t.navAbout}</Link><Link to="/contact">{t.navContact}</Link><Link to="/admin/login">{t.admin}</Link></div>
        <Link to="/bulk-orders" className="footer-cta"><span>{copy('احتياج لشركتك؟','Supplying a team?')}</span><b>{t.quote} <ArrowUpRight size={17} /></b></Link>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} ERASE</span><span>{copy('لا توجد أسعار على الموقع — اطلب عرضاً يناسب احتياجك.','No product prices online — request a quote for your needs.')}</span><span>{data.settings.companyName}</span></div>
    </footer>
  )
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="page-intro"><span className="eyebrow"><i />{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>
}

function HomePage() {
  const { lang } = useLocale()
  const { data } = useStore()
  const t = messages[lang]
  const copy = useCopy(lang)
  const categories = data.categories.filter(category => category.visible && category.featured).sort((a, b) => a.order - b.order).slice(0, 5)
  const products = data.products.filter(product => product.featured).slice(0, 4)
  const offer = data.offers.find(item => getOfferState(item) === 'Active')
  return (
    <div className="home-page">
      <section className="hero" data-reveal>
        <div className="hero-copy">
          <span className="eyebrow"><i />{copy('قرطاسية، بخطوة أبعد','Stationery, reimagined')}</span>
          <h1>{lang === 'ar' ? data.settings.heroTitleAr : data.settings.heroTitleEn}<span className="hero-underline" /></h1>
          <p>{lang === 'ar' ? data.settings.heroSubtitleAr : data.settings.heroSubtitleEn}</p>
          <div className="hero-actions"><Link className="button button-dark" to="/products">{t.browse}<ArrowLeft className="direction-icon" size={17} /></Link><Link className="text-link" to="/bulk-orders">{t.quote}<ArrowUpRight size={16} /></Link></div>
          <div className="hero-note"><span className="note-line" />{copy('للأفراد، الصفوف، وفرق العمل','For individuals, classrooms and teams')}</div>
        </div>
        <div className="hero-art">
          <div className="hero-art-grid" />
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-paper"><span className="paper-rule" /><span className="paper-rule" /><span className="paper-rule" /><span className="paper-rule" /><b>IDEAS<br />START HERE.</b><small>ERASE / 01</small></div>
          <div className="hero-pencil"><span /></div>
          <div className="hero-eraser"><i /></div>
          <div className="hero-stamp">A<br /><span>NEW</span><br />PAGE</div>
          <div className="hero-floater floater-notebook"><NotebookPen size={17} /><span>{copy('دفاتر وأفكار','NOTES & IDEAS')}</span></div>
          <div className="hero-floater floater-ruler"><Ruler size={16} /><span>{copy('ترتيب أدق','MADE TO PLAN')}</span></div>
          <div className="hero-floater floater-paperclip"><Paperclip size={17} /><span>ER / 01</span></div>
          <div className="hero-caption"><span>01 — 04</span><span>{copy('المستلزمات، برؤية مختلفة','Essentials, in a new light')}</span></div>
        </div>
        <div className="hero-side-label">{copy('اكتب ما يأتي','WRITE WHAT’S NEXT')}</div>
      </section>
      <section className="trust-strip" aria-label={copy('مزايا تجربة ERASE','The ERASE experience')}>
        <div className="trust-marquee">
          {[0, 1].map(copyIndex => <div className="trust-track" key={copyIndex} aria-hidden={copyIndex === 1}>
            <span>{copy('تجربة طلب واضحة','A clear request experience')}</span><i />
            <span>{copy('بدون أسعار مخفية','No hidden pricing')}</span><i />
            <span>{copy('من الفرد إلى المؤسسة','From individuals to institutions')}</span><i />
            <span>{copy('كل شيء يبدأ باحتياجك','Built around your needs')}</span><i />
          </div>)}
        </div>
      </section>
      <section className="section-block categories-section" data-reveal>
        <div className="section-heading"><div><span className="eyebrow"><i />02 — {copy('الفئات','CATEGORIES')}</span><h2>{t.categories}</h2><p>{t.categoriesIntro}</p></div><Link className="text-link" to="/categories">{t.navCategories}<ArrowUpRight size={16} /></Link></div>
        <div className="category-grid">
          {categories.map((category, index) => <CategoryTile key={category.id} category={category} index={index} />)}
          <Link to="/categories" className="category-more"><span>{copy('استكشف كل الفئات','Explore all categories')}</span><ArrowUpRight size={20} /></Link>
        </div>
      </section>
      <section className="section-block products-section" data-reveal>
        <div className="section-heading"><div><span className="eyebrow"><i />03 — {copy('المنتجات','PRODUCTS')}</span><h2>{t.featured}</h2><p>{t.featuredIntro}</p></div><Link className="text-link" to="/products">{t.allProducts}<ArrowUpRight size={16} /></Link></div>
        {products.length > 0 ? <ProductGrid products={products} /> : <EmptyState text={t.noResults} />}
      </section>
      {offer && <OfferFeature offer={offer} />}
      <section className="business-banner" data-reveal>
        <div className="banner-index">B2B / ERASE</div><div><span className="eyebrow"><i />{copy('للشركات والمؤسسات','FOR BUSINESS')}</span><h2>{lang === 'ar' ? <>احتياج أكبر؟<br />نرتبه معك.</> : <>A bigger need?<br />We’ll plan it with you.</>}</h2><p>{t.bulkIntro}</p><Link className="button button-paper" to="/bulk-orders">{t.navBulk}<ArrowUpRight size={17} /></Link></div><div className="banner-mark">E<span>.</span></div>
      </section>
      <section className="closing-line"><span>{copy('امسح القديم، اكتب الجديد.','Erase the old. Write what’s next.')}</span><ArrowDown size={18} /><Link to="/products">{t.browse}</Link></section>
    </div>
  )
}

function CategoryTile({ category, index }: { category: Category; index: number }) {
  const { lang } = useLocale()
  const imageSet = [
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80',
  ]
  return <Link className={`category-tile category-tile-${index + 1}`} data-reveal onPointerMove={updateSpotlight} onPointerLeave={resetSpotlight} to={`/categories/${category.slug}`} style={{ backgroundImage: `linear-gradient(0deg,rgba(23,31,28,.78),rgba(23,31,28,.08) 74%),url("${imageSet[index % imageSet.length]}")`, transitionDelay: `${Math.min(index, 7) * 65}ms` }}><span className="category-number">0{String(index + 1).padStart(2, '0')}</span><span className="category-chip">{lang === 'ar' ? 'اكتشف الفئة' : 'EXPLORE'}</span><b>{lang === 'ar' ? category.nameAr : category.nameEn}</b><ArrowUpRight size={17} /></Link>
}

function ProductGrid({ products }: { products: Product[] }) {
  return <div className="product-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
}

function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { lang } = useLocale()
  const { data } = useStore()
  const request = useRequests()
  const t = messages[lang]
  const copy = useCopy(lang)
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const feedbackTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => {
    if (feedbackTimer.current !== undefined) window.clearTimeout(feedbackTimer.current)
  }, [])
  const category = data.categories.find(item => item.id === product.categoryId)
  const availability = product.availability === 'available' ? t.available : product.availability === 'limited' ? t.limited : t.onRequest
  const updateQuantity = (value: string) => {
    if (!/^\d+$/.test(value)) return
    const parsed = Number(value)
    if (parsed > 0 && parsed <= 1000000) setQuantity(parsed)
  }
  return (
    <article className={`product-card product-card-${index % 4}`} data-reveal data-spotlight onPointerMove={updateCardSpotlight} onPointerLeave={resetCardSpotlight} style={{ transitionDelay: `${Math.min(index, 7) * 55}ms` }}>
      <Link to={`/products/${product.slug}`} className="product-image"><img loading="lazy" width="720" height="800" src={product.image} alt={lang === 'ar' ? product.nameAr : product.nameEn} onError={handleProductImageError} /><span className="product-image-index">ER / {String(index + 1).padStart(2, '0')}</span><span className="image-view"><ArrowUpRight size={18} /></span></Link>
      <div className="product-meta"><span>{category ? lang === 'ar' ? category.nameAr : category.nameEn : copy('غير مصنف','Uncategorized')}</span><span>{availability}</span></div>
      <Link to={`/products/${product.slug}`} className="product-title">{lang === 'ar' ? product.nameAr : product.nameEn}</Link>
      <div className="product-sku">{product.sku}</div>
      <div className="product-card-bottom"><div className="quantity-control small"><button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))} aria-label={copy('تقليل الكمية','Decrease quantity')}>−</button><input aria-label={t.quantity} inputMode="numeric" value={quantity} onChange={event => updateQuantity(event.target.value)} /><button type="button" onClick={() => setQuantity(value => Math.min(1000000, value + 1))} aria-label={copy('زيادة الكمية','Increase quantity')}>+</button></div><button className={`add-product ${justAdded ? 'just-added' : ''}`} onClick={event => { animateProductToRequest(product.image, event.currentTarget); request.add(product.id, quantity); setQuantity(1); setJustAdded(true); if (feedbackTimer.current !== undefined) window.clearTimeout(feedbackTimer.current); feedbackTimer.current = window.setTimeout(() => setJustAdded(false), 1100) }}>{justAdded ? <Check size={16} /> : <Plus size={16} />}<span>{justAdded ? t.added : t.add}</span></button></div>
      <span className="sr-only" aria-live="polite">{justAdded ? copy('تمت إضافة المنتج إلى قائمة الطلب','Product added to your request list') : ''}</span>
      <span className="sr-only">{t.noPrice}</span>
    </article>
  )
}

function OfferFeature({ offer }: { offer: Offer }) {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  return <section className="offer-feature"><div className="offer-image"><img loading="lazy" src={offer.image} alt="" /><span className="offer-mark">{copy('مبادرة موسمية','SEASONAL')}</span></div><div className="offer-copy"><span className="eyebrow"><i />04 — {copy('عرض مختار','A SELECTED OFFER')}</span><h2>{lang === 'ar' ? offer.titleAr : offer.titleEn}</h2><p>{lang === 'ar' ? offer.descriptionAr : offer.descriptionEn}</p><Countdown endsAt={offer.endsAt} /><Link className="text-link" to="/offers">{copy('شاهد العروض','See offers')}<ArrowUpRight size={16} /></Link></div></section>
}

function Countdown({ endsAt }: { endsAt: string }) {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  const getRemaining = () => Math.max(0, new Date(endsAt).getTime() - Date.now())
  const [remaining, setRemaining] = useState(getRemaining)
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(getRemaining()), 1000)
    return () => window.clearInterval(timer)
  }, [endsAt])
  if (!Number.isFinite(remaining) || remaining <= 0) return <span className="offer-expired">{copy('انتهى العرض','Offer ended')}</span>
  const days = Math.floor(remaining / 86400000)
  const hours = Math.floor((remaining % 86400000) / 3600000)
  const minutes = Math.floor((remaining % 3600000) / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  return <div className="countdown" aria-label={copy('الوقت المتبقي للعرض','Time remaining for this offer')}><CountdownCell value={days} unit={copy('يوم','DAY')} /><span>:</span><CountdownCell value={hours} unit={copy('ساعة','HOUR')} /><span>:</span><CountdownCell value={minutes} unit={copy('دقيقة','MIN')} /><span>:</span><CountdownCell value={seconds} unit={copy('ثانية','SEC')} /></div>
}
function CountdownCell({ value, unit }: { value: number; unit: string }) {
  return <div className="countdown-cell"><b>{String(value).padStart(2, '0')}</b><span>{unit}</span></div>
}

function CatalogPage() {
  const { lang } = useLocale()
  const { data } = useStore()
  const t = messages[lang]
  const copy = useCopy(lang)
  const location = useLocation()
  const params = useParams()
  const query = new URLSearchParams(location.search)
  const [search, setSearch] = useState(query.get('search') ?? '')
  const [categoryFilter, setCategoryFilter] = useState(params.slug ?? '')
  const [sort, setSort] = useState('featured')
  useEffect(() => { setSearch(query.get('search') ?? ''); setCategoryFilter(params.slug ?? '') }, [location.search, params.slug])
  const currentCategory = data.categories.find(category => category.slug === categoryFilter)
  const filtered = data.products.filter(product => {
    const category = data.categories.find(item => item.id === product.categoryId)
    const content = `${product.nameAr} ${product.nameEn} ${product.sku} ${product.descriptionAr} ${product.descriptionEn} ${category?.nameAr ?? ''} ${category?.nameEn ?? ''}`.toLocaleLowerCase()
    return (!categoryFilter || product.categoryId === currentCategory?.id) && content.includes(search.trim().toLocaleLowerCase())
  })
  if (sort === 'name') filtered.sort((a, b) => (lang === 'ar' ? a.nameAr : a.nameEn).localeCompare(lang === 'ar' ? b.nameAr : b.nameEn))
  if (sort === 'sku') filtered.sort((a, b) => a.sku.localeCompare(b.sku))
  return (
    <div className="page-shell">
      <PageIntro eyebrow={`01 — ${copy('دليل المنتجات','PRODUCT DIRECTORY')}`} title={currentCategory ? lang === 'ar' ? currentCategory.nameAr : currentCategory.nameEn : t.allProducts} description={currentCategory?.description || t.discover} />
      <div className="catalog-controls"><label className="catalog-search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t.search} aria-label={t.search} /></label><label className="catalog-select"><span>{copy('الفئة','CATEGORY')}</span><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="">{t.allProducts}</option>{data.categories.filter(category => category.visible).map(category => <option key={category.id} value={category.slug}>{lang === 'ar' ? category.nameAr : category.nameEn}</option>)}</select><ChevronDown size={16} /></label><label className="catalog-select"><span>{copy('ترتيب حسب','SORT')}</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="featured">{copy('المختارة','Featured')}</option><option value="name">{copy('الاسم','Name')}</option><option value="sku">SKU</option></select><ChevronDown size={16} /></label></div>
      <div className="catalog-count"><span>{String(filtered.length).padStart(2, '0')} {t.productsCount}</span><span>{copy('كل المنتجات بلا أسعار — اطلب عرضاً حسب احتياجك.','Products shown without prices — request a quote for your needs.')}</span></div>
      {filtered.length ? <ProductGrid products={filtered} /> : <EmptyState text={t.noResults} />}
    </div>
  )
}

function CategoriesPage() {
  const { lang } = useLocale()
  const { data } = useStore()
  const t = messages[lang]
  const copy = useCopy(lang)
  const categories = data.categories.filter(category => category.visible).sort((a, b) => a.order - b.order)
  return <div className="page-shell"><PageIntro eyebrow={`02 — ${copy('كل الفئات','ALL CATEGORIES')}`} title={t.categories} description={t.categoriesIntro} /><div className="all-category-grid">{categories.map((category, index) => <CategoryTile key={category.id} category={category} index={index} />)}</div></div>
}

function ProductPage() {
  const { slug } = useParams()
  const { lang } = useLocale()
  const { data } = useStore()
  const request = useRequests()
  const t = messages[lang]
  const copy = useCopy(lang)
  const product = data.products.find(item => item.slug === slug)
  const [quantity, setQuantity] = useState(1)
  const [notice, setNotice] = useState('')
  const [activeImage, setActiveImage] = useState(product?.image ?? '')
  useEffect(() => {
    if (product) {
      document.title = `${lang === 'ar' ? product.nameAr : product.nameEn} — ERASE`
      document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', document.title)
      document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', document.title)
      return () => { document.title = 'ERASE — امسح القديم، اكتب الجديد' }
    }
    return
  }, [lang, product])
  useEffect(() => { setActiveImage(product?.image ?? ''); setQuantity(1); setNotice('') }, [product?.id, product?.image])
  if (!product) return <div className="page-shell"><EmptyState text={t.productNotFound} action={<Link className="button button-dark" to="/products">{t.browse}</Link>} /></div>
  const category = data.categories.find(item => item.id === product.categoryId)
  const brand = data.brands.find(item => item.id === product.brandId)
  const related = data.products.filter(item => item.id !== product.id && item.categoryId === product.categoryId).slice(0, 3)
  const productName = lang === 'ar' ? product.nameAr : product.nameEn
  const galleryImages = Array.from(new Set([product.image, ...product.gallery].filter(Boolean)))
  return (
    <div className="page-shell product-detail-page">
      <div className="breadcrumb"><Link to="/">{t.home}</Link><span>/</span><Link to="/products">{t.navProducts}</Link><span>/</span><span>{productName}</span></div>
      <div className="product-detail"><div className="detail-image"><img src={activeImage || product.image} alt={productName} width="1000" height="1000" onError={handleProductImageError} /><span>ERASE / {product.sku}</span>{galleryImages.length > 1 && <div className="detail-thumbnails">{galleryImages.map((image, index) => <button type="button" key={`${image}-${index}`} className={activeImage === image ? 'selected' : ''} onClick={() => setActiveImage(image)} aria-label={`${copy('عرض صورة','Show image')} ${index + 1}`} aria-pressed={activeImage === image}><img src={image} alt="" onError={handleProductImageError} /></button>)}</div>}</div><div className="detail-copy"><span className="eyebrow"><i />{category ? lang === 'ar' ? category.nameAr : category.nameEn : copy('منتج','PRODUCT')}</span><h1>{productName}</h1><p className="detail-description">{lang === 'ar' ? product.descriptionAr : product.descriptionEn}</p><div className="detail-sku"><span>SKU</span><b>{product.sku}</b><span>{product.availability === 'available' ? t.available : product.availability === 'limited' ? t.limited : t.onRequest}</span></div><div className="detail-facts"><DetailFact label={copy('العلامة','BRAND')} value={brand?.name || copy('حسب التوفر','On request')} /><DetailFact label={copy('التعبئة','PACK')} value={product.pack || '—'} /><DetailFact label={copy('الكرتون','CARTON')} value={product.carton || '—'} /><DetailFact label={copy('الألوان / المقاسات','COLORS / SIZES')} value={[product.colors, product.sizes].filter(Boolean).join(' · ') || '—'} /></div>{product.specifications && <div className="specification"><b>{copy('المواصفات','Specifications')}</b><p>{product.specifications}</p></div>}<div className="detail-actions"><div className="quantity-control"><button onClick={() => setQuantity(value => Math.max(1, value - 1))} aria-label={copy('تقليل الكمية','Decrease quantity')}>−</button><input aria-label={t.quantity} inputMode="numeric" value={quantity} onChange={event => { const value = event.target.value; if (/^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 1000000) setQuantity(Number(value)) }} /><button onClick={() => setQuantity(value => Math.min(1000000, value + 1))} aria-label={copy('زيادة الكمية','Increase quantity')}>+</button></div><button className="button button-dark" onClick={() => { request.add(product.id, quantity); setNotice(t.added); window.setTimeout(() => setNotice(''), 2400) }}>{t.add}<Plus size={17} /></button></div>{notice && <span className="inline-success" role="status"><Check size={16} />{notice}</span>}<Link className="text-link detail-contact" to="/contact">{copy('استفسر عن هذا المنتج','Ask about this product')}<ArrowUpRight size={16} /></Link></div></div>
      {related.length > 0 && <section className="related-products"><div className="section-heading"><div><span className="eyebrow"><i />{copy('قد يناسبك أيضاً','MORE TO EXPLORE')}</span><h2>{copy('من نفس الفئة','From the same category')}</h2></div></div><ProductGrid products={related} /></section>}
    </div>
  )
}
function DetailFact({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><b>{value}</b></div>
}

function OffersPage() {
  const { lang } = useLocale()
  const { data } = useStore()
  const t = messages[lang]
  const copy = useCopy(lang)
  const offers = data.offers.filter(offer => ['Active', 'Scheduled'].includes(getOfferState(offer)))
  return <div className="page-shell"><PageIntro eyebrow={`03 — ${copy('العروض والمبادرات','OFFERS & INITIATIVES')}`} title={t.offers} description={t.offersIntro} />{offers.length ? <div className="offers-grid">{offers.map(offer => { const state = getOfferState(offer); return <article className="offer-card" key={offer.id}><div className="offer-card-image"><img src={offer.image} alt="" loading="lazy" /><span>{state === 'Scheduled' ? copy('قريباً','COMING SOON') : offer.type}</span></div><div className="offer-card-copy"><span className="eyebrow"><i />{state === 'Scheduled' ? copy('يبدأ قريباً','UPCOMING') : copy('متاح الآن','AVAILABLE NOW')}</span><h2>{lang === 'ar' ? offer.titleAr : offer.titleEn}</h2><p>{lang === 'ar' ? offer.descriptionAr : offer.descriptionEn}</p>{state === 'Active' && <Countdown endsAt={offer.endsAt} />}<Link className="text-link" to="/products">{t.browse}<ArrowUpRight size={16} /></Link></div></article>})}</div> : <EmptyState text={copy('لا توجد عروض منشورة حالياً.','There are no published offers right now.')} />}</div>
}

function getOfferState(offer: Offer): Offer['status'] {
  if (offer.status === 'Archived' || offer.status === 'Paused' || offer.status === 'Draft') return offer.status
  const now = Date.now()
  const start = new Date(offer.startsAt).getTime()
  const end = new Date(offer.endsAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Draft'
  if (now < start) return 'Scheduled'
  if (now > end) return 'Expired'
  return 'Active'
}

function RequestPage() {
  const { lang } = useLocale()
  const { data } = useStore()
  const request = useRequests()
  const t = messages[lang]
  const copy = useCopy(lang)
  const selected = request.lines.map(line => ({ ...line, product: data.products.find(product => product.id === line.productId) })).filter((line): line is RequestLine & { product: Product } => Boolean(line.product))
  const totalItems = selected.reduce((sum, line) => sum + line.quantity, 0)
  return <div className="page-shell request-page"><PageIntro eyebrow={`04 — ${copy('قائمة التجهيز','REQUEST LIST')}`} title={t.request} description={copy('اجمع المنتجات والكميات التي تحتاجها في مكان واحد.','Bring products and quantities together in one place.')} /><div className="request-layout"><div className="request-items">{selected.length ? selected.map(({ product, quantity }) => <RequestRow key={product.id} product={product} quantity={quantity} />) : <EmptyState text={t.empty} action={<Link className="button button-dark" to="/products">{t.keepBrowsing}<ArrowLeft className="direction-icon" size={16} /></Link>} />}</div>{selected.length > 0 && <aside className="request-summary"><span className="eyebrow"><i />{copy('ملخص الطلب','REQUEST SUMMARY')}</span><div className="summary-line"><span>{copy('عدد المنتجات','Products')}</span><b>{selected.length}</b></div><div className="summary-line"><span>{copy('إجمالي القطع','Total units')}</span><b>{totalItems.toLocaleString(lang === 'ar' ? 'ar' : 'en')}</b></div><p>{t.disclaimer}</p><Link className="button button-dark button-full" to="/request/checkout">{t.quote}<ArrowLeft className="direction-icon" size={17} /></Link><button className="text-button" onClick={request.clear}>{copy('إفراغ القائمة','Clear list')}</button></aside>}</div></div>
}

function RequestSentPage() {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  const location = useLocation()
  const whatsappUrl = (location.state as { whatsappUrl?: string } | null)?.whatsappUrl
  return <div className="page-shell request-sent"><span className="sent-check"><Check size={30} /></span><span className="eyebrow"><i />ERASE / REQUEST</span><h1>{copy('طلبك صار جاهزاً.','Your request is ready.')}</h1><p>{copy('تم حفظ تفاصيل الطلب على هذا الجهاز. أرسل الرسالة في WhatsApp حتى تصل إلى فريق ERASE.','Your request was saved on this device. Send the message in WhatsApp so the ERASE team receives it.')}</p>{whatsappUrl && <a className="text-link sent-whatsapp-link" href={whatsappUrl} target="_blank" rel="noopener noreferrer">{copy('إذا لم يفتح WhatsApp تلقائياً، افتحه هنا.','If WhatsApp did not open automatically, open it here.')}<ExternalLink size={16} /></a>}<Link className="button button-dark" to="/products">{messages[lang].browse}<ArrowLeft className="direction-icon" size={16} /></Link></div>
}

function RequestRow({ product, quantity }: { product: Product; quantity: number }) {
  const { lang } = useLocale()
  const request = useRequests()
  const t = messages[lang]
  const copy = useCopy(lang)
  return <article className="request-row"><Link to={`/products/${product.slug}`} className="request-row-image"><img src={product.image} alt="" onError={handleProductImageError} /></Link><div className="request-row-info"><Link to={`/products/${product.slug}`}>{lang === 'ar' ? product.nameAr : product.nameEn}</Link><span>{product.sku} · {copy('متوفر لطلب عرض سعر','Quote on request')}</span></div><div className="quantity-control"><button onClick={() => quantity > 1 ? request.update(product.id, quantity - 1) : request.remove(product.id)} aria-label={copy('تقليل الكمية','Decrease quantity')}>−</button><input aria-label={t.quantity} inputMode="numeric" value={quantity} onChange={event => { const value = event.target.value; if (/^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 1000000) request.update(product.id, Number(value)) }} onBlur={event => { if (!event.target.value) request.update(product.id, 1) }} /><button onClick={() => request.update(product.id, Math.min(1000000, quantity + 1))} aria-label={copy('زيادة الكمية','Increase quantity')}>+</button></div><button className="icon-button remove-line" onClick={() => request.remove(product.id)} aria-label={t.remove}><Trash2 size={17} /></button></article>
}

function CheckoutPage() {
  const { lang } = useLocale()
  const { data, setData } = useStore()
  const request = useRequests()
  const navigate = useNavigate()
  const t = messages[lang]
  const copy = useCopy(lang)
  const [error, setError] = useState('')
  const selected = request.lines.map(line => ({ ...line, product: data.products.find(product => product.id === line.productId) })).filter((line): line is RequestLine & { product: Product } => Boolean(line.product))
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (selected.length === 0) { setError(t.empty); return }
    if (!data.settings.whatsapp.replace(/\D/g, '')) { setError(t.whatsappMissing); return }
    const form = new FormData(event.currentTarget)
    const values = {
      customer: String(form.get('name') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      company: String(form.get('company') || '').trim(),
      governorate: String(form.get('governorate') || '').trim(),
      notes: String(form.get('notes') || '').trim(),
    }
    const items: RequestItem[] = selected.map(({ product, quantity }) => ({
      productId: product.id, nameSnapshot: lang === 'ar' ? product.nameAr : product.nameEn, slugSnapshot: product.slug, quantity, skuSnapshot: product.sku,
    }))
    const record: CustomerRequest = {
      id: `ER-${Date.now().toString(36).toUpperCase()}`,
      ...values, type: 'Standard', status: 'New', createdAt: new Date().toISOString(), items,
    }
    setData(current => ({ ...current, requests: [record, ...current.requests] }))
    const lines = lang === 'ar' ? [
      'طلب جديد — ERASE', '',
      'بيانات العميل:',
      `الاسم: ${values.customer}`,
      `الشركة: ${values.company || '—'}`,
      `الهاتف: ${values.phone}`,
      `المحافظة: ${values.governorate || '—'}`,
      '', 'تفاصيل الطلب:', '',
      ...selected.flatMap(({ product, quantity }, index) => [
        `${index + 1}. ${product.nameAr}`,
        `الكمية: ${quantity.toLocaleString('en')}`,
        `SKU: ${product.sku}`,
        `الرابط: ${window.location.origin}/products/${product.slug}`,
        '',
      ]),
      'نوع الطلب: كمية اعتيادية',
      `ملاحظات: ${values.notes || 'أحتاج عرض سعر للكميات أعلاه.'}`,
      '', 'يرجى تزويدي بعرض السعر والتوفر والتجهيز.',
    ] : [
      'New request — ERASE', '',
      'Customer details:',
      `Name: ${values.customer}`,
      `Company: ${values.company || '—'}`,
      `Phone: ${values.phone}`,
      `Governorate: ${values.governorate || '—'}`,
      '', 'Request details:', '',
      ...selected.flatMap(({ product, quantity }, index) => [
        `${index + 1}. ${product.nameEn}`,
        `Quantity: ${quantity.toLocaleString('en')}`,
        `SKU: ${product.sku}`,
        `Link: ${window.location.origin}/products/${product.slug}`,
        '',
      ]),
      'Request type: Standard',
      `Notes: ${values.notes || 'Please quote the requested quantities.'}`,
      '', 'Please share availability, a quote and fulfillment details.',
    ]
    const phone = data.settings.whatsapp.replace(/\D/g, '')
    const target = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`
    window.open(target, '_blank', 'noopener,noreferrer')
    request.clear()
    navigate('/request/sent', { replace: true, state: { whatsappUrl: target } })
  }
  return <div className="page-shell checkout-page"><PageIntro eyebrow={`05 — ${copy('بيانات الطلب','REQUEST DETAILS')}`} title={t.quote} description={t.disclaimer} /><div className="checkout-layout"><form className="contact-form" onSubmit={submit}><h2>{t.customerDetails}</h2><div className="form-grid"><label>{t.name}<input required name="name" autoComplete="name" placeholder={copy('الاسم الكامل','Full name')} /></label><label>{t.phone}<input required name="phone" type="tel" autoComplete="tel" placeholder={copy('07XXXXXXXXX','Phone number')} /></label><label>{t.company}<input name="company" autoComplete="organization" /></label><label>{t.governorate}<select name="governorate" defaultValue=""><option value="">{copy('اختر المحافظة','Select governorate')}</option>{['بغداد','البصرة','نينوى','أربيل','النجف','كربلاء','ذي قار','الأنبار','ديالى','كركوك','بابل','واسط','ميسان','المثنى','القادسية','صلاح الدين','دهوك','السليمانية'].map(value => <option key={value}>{lang === 'ar' ? value : governorateEn[value] ?? value}</option>)}</select></label><label className="full-field">{t.notes}<textarea name="notes" rows={4} placeholder={copy('أي تفاصيل تساعدنا على تجهيز عرض مناسب...','Anything that helps us prepare a relevant quote...')} /></label></div>{error && <div className="form-error" role="alert"><ShieldAlert size={17} />{error}</div>}<button className="button button-dark" type="submit">{t.sendWhatsApp}<ArrowUpRight size={17} /></button><p className="form-footnote">{copy('سيتم حفظ الطلب في سجل لوحة الإدارة على هذا الجهاز، ثم فتح WhatsApp لإرساله.','The request is stored in this device’s admin list, then WhatsApp opens to send it.')}</p></form><aside className="checkout-items"><span className="eyebrow"><i />{copy('تفاصيل القائمة','LIST DETAILS')}</span>{selected.length ? selected.map(({ product, quantity }) => <div className="checkout-line" key={product.id}><img src={product.image} alt="" /><span>{lang === 'ar' ? product.nameAr : product.nameEn}<small>{product.sku}</small></span><b>× {quantity}</b></div>) : <p>{t.empty}</p>}<Link to="/request" className="text-link">{copy('تعديل القائمة','Edit request list')}<ArrowRight className="direction-icon" size={15} /></Link></aside></div></div>
}

const governorateEn: Record<string, string> = { 'بغداد': 'Baghdad', 'البصرة': 'Basra', 'نينوى': 'Nineveh', 'أربيل': 'Erbil', 'النجف': 'Najaf', 'كربلاء': 'Karbala', 'ذي قار': 'Dhi Qar', 'الأنبار': 'Anbar', 'ديالى': 'Diyala', 'كركوك': 'Kirkuk', 'بابل': 'Babil', 'واسط': 'Wasit', 'ميسان': 'Maysan', 'المثنى': 'Al Muthanna', 'القادسية': 'Al-Qadisiyyah', 'صلاح الدين': 'Saladin', 'دهوك': 'Duhok', 'السليمانية': 'Sulaymaniyah' }

function BulkPage() {
  const { lang } = useLocale()
  const { data, setData } = useStore()
  const t = messages[lang]
  const copy = useCopy(lang)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setWhatsappUrl('')
    if (!data.settings.whatsapp.replace(/\D/g, '')) { setError(t.whatsappMissing); return }
    const selected = data.products.filter(product => (quantities[product.id] ?? 0) > 0)
    if (selected.length === 0) { setError(copy('اختر منتجاً واحداً على الأقل وأدخل كمية صحيحة.','Select at least one product and enter a valid quantity.')); return }
    const form = new FormData(event.currentTarget)
    const values = { customer: String(form.get('name') || '').trim(), phone: String(form.get('phone') || '').trim(), company: String(form.get('company') || '').trim(), governorate: String(form.get('governorate') || '').trim(), notes: String(form.get('notes') || '').trim() }
    const items: RequestItem[] = selected.map(product => ({ productId: product.id, nameSnapshot: lang === 'ar' ? product.nameAr : product.nameEn, slugSnapshot: product.slug, quantity: quantities[product.id], skuSnapshot: product.sku }))
    const record: CustomerRequest = { id: `ER-${Date.now().toString(36).toUpperCase()}`, ...values, type: 'Bulk', status: 'New', createdAt: new Date().toISOString(), items }
    setData(current => ({ ...current, requests: [record, ...current.requests] }))
    const message = (lang === 'ar' ? [
      'طلب كميات كبيرة — ERASE', '',
      `الاسم: ${values.customer}`, `الشركة: ${values.company || '—'}`, `الهاتف: ${values.phone}`, `المحافظة: ${values.governorate || '—'}`, '',
      ...selected.flatMap((product, index) => [`${index + 1}. ${product.nameAr}`, `الكمية: ${quantities[product.id].toLocaleString('en')}`, `SKU: ${product.sku}`, `الرابط: ${window.location.origin}/products/${product.slug}`, '']),
      `ملاحظات: ${values.notes || 'أحتاج عرض سعر للكميات أعلاه.'}`, '', 'يرجى تزويدي بعرض السعر والتوفر والتجهيز.',
    ] : [
      'Bulk request — ERASE', '',
      `Name: ${values.customer}`, `Company: ${values.company || '—'}`, `Phone: ${values.phone}`, `Governorate: ${values.governorate || '—'}`, '',
      ...selected.flatMap((product, index) => [`${index + 1}. ${product.nameEn}`, `Quantity: ${quantities[product.id].toLocaleString('en')}`, `SKU: ${product.sku}`, `Link: ${window.location.origin}/products/${product.slug}`, '']),
      `Notes: ${values.notes || 'Please quote the requested quantities.'}`, '', 'Please share availability, a quote and fulfillment details.',
    ]).join('\n')
    const target = `https://wa.me/${data.settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    setWhatsappUrl(target)
    window.open(target, '_blank', 'noopener,noreferrer')
    setQuantities({})
    event.currentTarget.reset()
    setSuccess(copy('تم حفظ طلب الكميات وإعداده للإرسال عبر WhatsApp.','Bulk request saved and prepared for WhatsApp.'))
  }
  return <div className="page-shell bulk-page"><PageIntro eyebrow={`06 — B2B / ERASE`} title={t.bulkTitle} description={t.bulkIntro} /><form className="bulk-form" onSubmit={submit}><div className="bulk-form-head"><div><span className="eyebrow"><i />01 — {t.selectItems}</span><h2>{copy('ما الذي تحتاجه؟','What do you need?')}</h2></div><span>{copy('الحد الأعلى لكل صنف: 1,000,000','Maximum per item: 1,000,000')}</span></div><div className="bulk-product-list">{data.products.map(product => <label className="bulk-product" key={product.id}><span className="bulk-product-name"><input type="checkbox" checked={(quantities[product.id] ?? 0) > 0} onChange={event => setQuantities(current => ({ ...current, [product.id]: event.target.checked ? 1 : 0 }))} /><span>{lang === 'ar' ? product.nameAr : product.nameEn}<small>{product.sku}</small></span></span><input className="bulk-quantity" type="number" step="1" min="0" max="1000000" value={quantities[product.id] || ''} onChange={event => { const value = event.target.value; const parsed = Number(value); if (!value) setQuantities(current => ({ ...current, [product.id]: 0 })); else if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 1000000) setQuantities(current => ({ ...current, [product.id]: parsed })) }} placeholder={copy('الكمية','Qty')} aria-label={`${t.quantity}: ${lang === 'ar' ? product.nameAr : product.nameEn}`} /></label>)}</div><div className="bulk-details"><div><span className="eyebrow"><i />02 — {t.customerDetails}</span><h2>{copy('كيف نتواصل معك؟','How should we reach you?')}</h2></div><div className="form-grid"><label>{t.name}<input required name="name" /></label><label>{t.phone}<input required name="phone" type="tel" /></label><label>{t.company}<input name="company" /></label><label>{t.governorate}<select name="governorate" defaultValue=""><option value="">{copy('اختر المحافظة','Select governorate')}</option>{Object.entries(governorateEn).map(([ar, en]) => <option key={ar} value={ar}>{lang === 'ar' ? ar : en}</option>)}</select></label><label className="full-field">{t.notes}<textarea name="notes" rows={3} /></label></div></div>{error && <div className="form-error" role="alert">{error}</div>}{success && <div className="inline-success" role="status">{success}</div>}{whatsappUrl && <a className="text-link sent-whatsapp-link bulk-whatsapp-link" href={whatsappUrl} target="_blank" rel="noopener noreferrer">{copy('إعادة فتح رسالة WhatsApp','Open the WhatsApp message')}<ExternalLink size={16} /></a>}<button className="button button-dark" type="submit">{t.sendWhatsApp}<ArrowUpRight size={17} /></button></form></div>
}

function InfoPage({ kind }: { kind: 'about' | 'contact' }) {
  const { lang } = useLocale()
  const { data } = useStore()
  const t = messages[lang]
  const copy = useCopy(lang)
  const about = kind === 'about'
  const settings = data.settings
  return <div className="page-shell info-page">{about
    ? <AboutExperience />
    : <><PageIntro eyebrow="ERASE / 02" title={t.contactTitle} description={t.contactCopy} /><div className="contact-cards"><ContactItem icon={<ShoppingBag />} label={t.navProducts} value={copy('استفسر عن التوفر وعروض الأسعار.','Ask about availability and quotes.')} /><ContactItem icon={<Users />} label={t.navBulk} value={copy('طلبات الشركات والمدارس والكميات.','Requests for organizations and larger quantities.')} /><ContactItem icon={<Globe2 />} label={copy('قنوات التواصل','Contact channels')} value={settings.email || settings.phone || copy('أضف بيانات التواصل من لوحة الإدارة.','Add contact details in Admin settings.')} /></div><div className="contact-detail-row">{settings.phone ? <a href={`tel:${settings.phone}`}><Phone size={16} />{settings.phone}</a> : <span><Phone size={16} />{copy('رقم الهاتف يضاف من لوحة الإدارة.','Phone number is set in Admin settings.')}</span>}{settings.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}{settings.address ? <span><MapPin size={16} />{settings.address}</span> : <span><MapPin size={16} />{copy('العنوان يضاف من لوحة الإدارة.','Address is set in Admin settings.')}</span>}{settings.whatsapp && <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp <ExternalLink size={15} /></a>}</div></>}
  </div>
}

function AboutExperience() {
  const { lang } = useLocale()
  const { data } = useStore()
  const t = messages[lang]
  const copy = useCopy(lang)
  const featured = data.products.filter(product => product.featured).slice(0, 3)
  const contact = data.settings
  const brandName = contact.companyName || 'ERASE'
  return <>
    <PageIntro eyebrow="ERASE / 01" title={t.aboutTitle} description={t.aboutCopy} />
    <section className="about-story" data-reveal>
      <div className="manifesto-visual"><span>{brandName}</span><i /><small>MAKE ROOM FOR<br />WHAT’S NEXT.</small><div className="about-orbit" /></div>
      <div className="about-story-copy">
        <span className="eyebrow"><i />{copy('من نحن','WHO WE ARE')}</span>
        <h2 className="about-letter-heading">{copy('قرطاسية ترتّب يومك وتفتح مساحة لأفكارك.','Stationery to shape your day and make room for ideas.')}</h2>
        <p>{copy('ERASE شركة قرطاسية تجمع مستلزمات الكتابة والدراسة والمكتب في مكان واحد. نرتّب لك المنتجات بوضوح، وتختار احتياجك وكميتك قبل ما تطلب عرض سعر يناسبك.','ERASE is a stationery company bringing together writing, study and office essentials. Browse clearly organized products, choose what you need and the quantities, then request a quote tailored to your order.')}</p>
        <p>{copy('سواء كنت تجهّز مكتباً، صفاً دراسياً أو طلباً لمؤسسة، نخلي بداية الطلب سهلة وواضحة — من اكتشاف المنتج إلى تجهيز قائمة احتياجك.','Whether you are preparing an office, classroom or an organization order, we make it easier to get started — from finding a product to building your request list.')}</p>
        <Link className="button button-dark" to="/products">{t.browse}<ArrowUpRight size={16} /></Link>
      </div>
    </section>
    <section className="about-contact-panel glass-panel" data-reveal>
      <div className="about-contact-heading"><span className="eyebrow"><i />{copy('ERASE — مستلزمات قرطاسية','ERASE — STATIONERY & SUPPLIES')}</span><h2>{copy('نرتّب احتياجك، قطعة قطعة.','Thoughtful essentials, ready for your list.')}</h2></div>
      <div className="about-contact-details">
        <div className="about-contact-detail"><span className="about-detail-icon"><MapPin size={19} /></span><span>{copy('العنوان','ADDRESS')}</span><b>{contact.address || copy('أضف عنوان الشركة من إعدادات لوحة الإدارة.','Add the company address in Admin settings.')}</b></div>
        <div className="about-contact-detail"><span className="about-detail-icon"><Phone size={19} /></span><span>{copy('رقم الهاتف','PHONE')}</span>{contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : <b>{copy('أضف رقم الهاتف من إعدادات لوحة الإدارة.','Add the phone number in Admin settings.')}</b>}</div>
      </div>
    </section>
    <section className="about-products" data-reveal>
      <div className="about-products-heading"><div><span className="eyebrow"><i />{copy('مساحة لأفكارك','A LITTLE INSPIRATION')}</span><h2>{copy('ابدأ من احتياجك.','Start with what you need.')}</h2></div><span className="about-pen-destination">{copy('خطوة أولى، فكرة جديدة','A fresh line starts here')}</span></div>
      <div className="about-product-grid">{featured.map((product, index) => <Link className="about-product-card" data-reveal key={product.id} to={`/products/${product.slug}`} style={{ transitionDelay: `${index * 90}ms` }}><span className="about-product-index">ER / {String(index + 1).padStart(2, '0')}</span><img src={product.image} alt={lang === 'ar' ? product.nameAr : product.nameEn} loading="lazy" onError={handleProductImageError} /><span className="about-product-name">{lang === 'ar' ? product.nameAr : product.nameEn}</span><ArrowUpRight size={16} /></Link>)}</div>
      {!featured.length && <Link className="button button-outline" to="/products">{t.browse}<ArrowUpRight size={16} /></Link>}
    </section>
    <section className="about-next-step" data-reveal><span className="eyebrow"><i />{copy('جاهز ترتّب قائمتك؟','READY TO BUILD YOUR LIST?')}</span><h2>{copy('احتياجك أكبر؟ نرتبه معك.','A bigger need? We’ll plan it with you.')}</h2><p>{copy('اكتشف المنتجات، اجمعها في قائمة الطلب، وشاركنا التفاصيل حتى نجهز لك عرض السعر.','Explore products, gather them in your request list and share the details so we can prepare a quote.')}</p><Link className="button button-paper" to="/bulk-orders">{t.navBulk}<ArrowUpRight size={16} /></Link></section>
    <JourneyPencil />
  </>
}

function JourneyPencil() {
  useEffect(() => {
    const pencil = document.querySelector<HTMLElement>('.journey-pencil')
    if (!pencil || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const story = document.querySelector<HTMLElement>('.about-story-copy')
        const destination = document.querySelector<HTMLElement>('.about-pen-destination')
        const productSection = document.querySelector<HTMLElement>('.about-products')
        if (!story || !destination || !productSection) return
        const storyBounds = story.getBoundingClientRect()
        const destinationBounds = destination.getBoundingClientRect()
        const productsBounds = productSection.getBoundingClientRect()
        const startY = storyBounds.top + 115
        const endY = destinationBounds.top + destinationBounds.height / 2
        const startScroll = window.scrollY + storyBounds.top + 115
        const endScroll = window.scrollY + destinationBounds.top + destinationBounds.height / 2
        const progress = Math.max(0, Math.min(1, (window.scrollY + window.innerHeight * .48 - startScroll) / Math.max(1, endScroll - startScroll)))
        const x1 = storyBounds.right - 35
        const y1 = startY
        const x2 = destinationBounds.left + destinationBounds.width / 2
        const y2 = endY
        const x = x1 + (x2 - x1) * progress
        const y = y1 + (y2 - y1) * progress - Math.sin(progress * Math.PI) * 65
        const sectionVisible = productsBounds.bottom > 90
        const visible = sectionVisible && window.scrollY + window.innerHeight * .48 >= startScroll - 90
        pencil.style.opacity = visible ? String(progress < 1 ? Math.min(1, progress * 3 + .2) : .95) : '0'
        pencil.style.transform = `translate3d(${x - 22}px,${y - 22}px,0) rotate(${(-48 + progress * 133)}deg) scale(${.82 + progress * .18})`
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return <div className="journey-pencil" aria-hidden="true"><Pencil size={37} strokeWidth={1.5} /><span /></div>
}
function ContactItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <article className="contact-card">{icon}<span>{label}</span><b>{value}</b></article>
}
function NotFound() {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  return <div className="page-shell not-found"><span>404</span><h1>{copy('يبدو أننا محونا هذه الصفحة.','Looks like this page got erased.')}</h1><Link className="button button-dark" to="/">{messages[lang].home}<ArrowLeft className="direction-icon" size={16} /></Link></div>
}
function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  return <div className="empty-state"><span className="empty-icon"><PackageSearch size={24} /></span><h3>{text}</h3>{action || <Link className="text-link" to="/products">{copy('تابع التصفح','Continue browsing')}<ArrowUpRight size={16} /></Link>}</div>
}

function AdminLogin() {
  const { lang, theme, setTheme } = useLocale()
  const copy = useCopy(lang)
  const navigate = useNavigate()
  const t = messages[lang]
  const enterPreview = () => {
    sessionStorage.setItem('erase-admin-preview', 'true')
    navigate('/admin')
  }
  return <main className="admin-login" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <div className="admin-login-art"><Link className="brand-lockup" to="/"><BrandLockup tagline={t.footerTagline} /></Link><div className="login-art-copy"><span>ERASE / ADMIN</span><h1>{lang === 'ar' ? <>مساحة العمل،<br />مرتبة من جديد.</> : <>A workspace,<br />written anew.</>}</h1><p>{copy('إدارة المنتجات والطلبات والعروض من مكان واحد.','Manage products, requests and offers in one place.')}</p></div><div className="login-glyph">E<span>.</span></div></div>
    <div className="admin-login-form"><div className="admin-login-tools"><button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={copy('تغيير المظهر','Toggle theme')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button><button className="icon-button" onClick={() => window.location.href = '/'} aria-label={t.home}><Globe2 size={17} /></button></div><span className="eyebrow"><i />{copy('دخول الإدارة','ADMIN ACCESS')}</span><h2>{copy('مرحباً بعودتك.','Welcome back.')}</h2><p>{copy('ابدأ بإدارة مساحة ERASE.','Sign in to manage your ERASE workspace.')}</p><button className="button button-dark button-full" onClick={enterPreview}>{copy('دخول المعاينة','Enter preview')}<ArrowUpRight size={17} /></button><div className="demo-warning"><ShieldAlert size={18} /><p><b>{copy('وضع معاينة محلي','Local preview mode')}</b><br />{copy('هذه لوحة تجريبية على هذا الجهاز فقط وليست محمية بتسجيل دخول حقيقي. اربط خدمة مصادقة قبل النشر العام.','This is a local demo, not real authentication. Connect a secure auth service before public deployment.')}</p></div><Link className="text-link" to="/">{t.home}<ArrowLeft className="direction-icon" size={16} /></Link></div>
  </main>
}

const adminNavigation = [
  { path: '/admin', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/admin/products', labelAr: 'المنتجات', labelEn: 'Products', icon: Package },
  { path: '/admin/categories', labelAr: 'الفئات', labelEn: 'Categories', icon: Layers3 },
  { path: '/admin/brands', labelAr: 'العلامات', labelEn: 'Brands', icon: Tag },
  { path: '/admin/offers', labelAr: 'العروض', labelEn: 'Offers', icon: Clock3 },
  { path: '/admin/requests', labelAr: 'الطلبات', labelEn: 'Requests', icon: FileText },
  { path: '/admin/customers', labelAr: 'العملاء', labelEn: 'Customers', icon: Users },
]

function AdminLayout() {
  const { lang, setLang, theme, setTheme } = useLocale()
  const copy = useCopy(lang)
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const authorized = sessionStorage.getItem('erase-admin-preview') === 'true'
  if (!authorized) return <Navigate to="/admin/login" replace />
  const active = adminNavigation.find(item => item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path))
  return <div className="admin-shell" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}><Link className="brand-lockup" to="/admin"><BrandLockup tagline="ADMIN STUDIO" /></Link><div className="workspace-label">{copy('مساحة العمل','WORKSPACE')}<span>DEMO</span></div><nav>{adminNavigation.map(item => { const Icon = item.icon; return <NavLink key={item.path} end={item.exact} to={item.path} onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}><Icon size={18} /><span>{lang === 'ar' ? item.labelAr : item.labelEn}</span></NavLink> })}</nav><div className="admin-sidebar-bottom"><NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'active' : ''}><Settings size={18} /><span>{copy('الإعدادات','Settings')}</span></NavLink><NavLink to="/admin/backup" className={({ isActive }) => isActive ? 'active' : ''}><Download size={18} /><span>{copy('نسخ احتياطي','Backup & data')}</span></NavLink><Link to="/" className="admin-exit"><ExternalLink size={17} /><span>{copy('عرض الموقع','View website')}</span></Link></div></aside>
    {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label={copy('إغلاق القائمة','Close navigation')} />}
    <div className="admin-main"><header className="admin-topbar"><button className="icon-button admin-menu-button" onClick={() => setSidebarOpen(true)} aria-label={copy('القائمة','Open navigation')}><Menu size={18} /></button><div className="admin-breadcrumb"><span>{copy('مساحة الإدارة','ADMIN')}</span><b>/</b><strong>{active ? lang === 'ar' ? active.labelAr : active.labelEn : 'ERASE'}</strong></div><div className="admin-top-actions"><button className="icon-button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label={copy('تغيير اللغة','Change language')}><Globe2 size={17} /><span>{lang === 'ar' ? 'EN' : 'ع'}</span></button><button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={copy('تغيير المظهر','Toggle theme')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button><div className="admin-profile"><span className="admin-avatar">E</span><span>ERASE<small>{copy('مدير تجريبي','Demo admin')}</small></span></div></div></header><div className="admin-content"><div className="admin-demo-notice"><ShieldAlert size={17} /><span>{copy('بيانات محفوظة في هذا المتصفح فقط. لوحة المعاينة لا توفر مصادقة آمنة أو قاعدة بيانات مشتركة.','Data is saved in this browser only. Preview mode has no secure authentication or shared database.')}</span></div><Outlet /></div></div>
  </div>
}

function AdminNotFound() {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  return <div className="admin-panel admin-not-found"><span className="eyebrow"><i />ERASE / 404</span><h1>{copy('هذه الصفحة غير موجودة.','This admin page does not exist.')}</h1><Link className="text-link" to="/admin">{copy('العودة إلى النظرة العامة','Back to overview')}<ArrowLeft className="direction-icon" size={15} /></Link></div>
}

function AdminHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="admin-page-heading"><div><span className="eyebrow"><i />{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}
function AdminDashboard() {
  const { lang } = useLocale()
  const { data } = useStore()
  const copy = useCopy(lang)
  const countUnits = data.requests.reduce((total, request) => total + request.items.reduce((subtotal, item) => subtotal + item.quantity, 0), 0)
  const cards = [
    { label: copy('المنتجات','Products'), value: data.products.length, icon: Package, link: '/admin/products', tone: 'orange' },
    { label: copy('الفئات','Categories'), value: data.categories.length, icon: Layers3, link: '/admin/categories', tone: 'blue' },
    { label: copy('طلبات جديدة','New requests'), value: data.requests.filter(request => request.status === 'New').length, icon: FileText, link: '/admin/requests', tone: 'green' },
    { label: copy('القطع المطلوبة','Units requested'), value: countUnits.toLocaleString(), icon: ShoppingBag, link: '/admin/requests', tone: 'violet' },
  ]
  return <><AdminHeading eyebrow="ERASE / OVERVIEW" title={copy('مساحة عملك.','Your workspace.')} description={copy('هذه لوحة تجريبية لإدارة بيانات موقع ERASE.','A local preview dashboard for ERASE site data.')} action={<Link className="button button-dark admin-action" to="/admin/products"><Plus size={17} />{copy('إضافة منتج','Add product')}</Link>} /><div className="admin-stats">{cards.map(card => { const Icon = card.icon; return <Link to={card.link} className="admin-stat-card" key={card.label}><span className={`stat-icon ${card.tone}`}><Icon size={19} /></span><span>{card.label}</span><b>{card.value}</b><small>{copy('عرض التفاصيل','View details')}<ArrowUpRight size={14} /></small></Link> })}</div><div className="admin-dashboard-grid"><section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow"><i />{copy('آخر الطلبات','LATEST REQUESTS')}</span><h2>{copy('نشاط الطلبات','Request activity')}</h2></div><Link to="/admin/requests" className="text-link">{copy('كل الطلبات','All requests')}<ArrowUpRight size={15} /></Link></div>{data.requests.length ? <RequestTable requests={data.requests.slice(0, 5)} compact /> : <div className="admin-empty"><span><FileText size={20} /></span><p>{copy('ستظهر الطلبات هنا بعد حفظها من واجهة الموقع.','Requests appear here after they are submitted through the site.')}</p></div>}</section><section className="admin-panel admin-quick-actions"><div className="panel-heading"><div><span className="eyebrow"><i />{copy('إعداد سريع','QUICK SETUP')}</span><h2>{copy('ابدأ بتجهيز الموقع','Set up your site')}</h2></div></div><QuickSetup href="/admin/settings" icon={<Settings size={17} />} label={copy('أضف رقم WhatsApp','Add WhatsApp number')} /><QuickSetup href="/admin/products" icon={<Package size={17} />} label={copy('حدّث بيانات المنتجات','Update product details')} /><QuickSetup href="/admin/offers" icon={<Tag size={17} />} label={copy('جهّز أول عرض','Prepare an offer')} /><div className="setup-note">{copy('تظهر بيانات العرض التوضيحي ضمن سجل الموقع. حدّثها أو استبدلها قبل النشر.','Sample data is visible on the site. Update or replace it before publishing.')}</div></section></div></>
}
function QuickSetup({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return <Link to={href} className="quick-setup">{icon}<span>{label}</span><ArrowUpRight size={15} /></Link>
}

function AdminProducts() {
  const { lang } = useLocale()
  const { data, setData } = useStore()
  const copy = useCopy(lang)
  const [editing, setEditing] = useState<Product | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const filtered = data.products.filter(product => `${product.nameAr} ${product.nameEn} ${product.sku}`.toLowerCase().includes(search.toLowerCase()))
  const remove = (product: Product) => {
    if (!window.confirm(copy(`حذف «${product.nameAr}»؟`,`Delete “${product.nameEn}”?`))) return
    setData(current => ({ ...current, products: current.products.filter(item => item.id !== product.id) }))
  }
  const duplicate = (product: Product) => setData(current => ({ ...current, products: [{ ...product, id: idFor(product.slug), slug: `${product.slug}-copy-${Date.now().toString(36)}`, nameAr: `${product.nameAr} — نسخة`, nameEn: `${product.nameEn} — Copy`, sku: `${product.sku}-COPY` }, ...current.products] }))
  return <><AdminHeading eyebrow="CATALOG / 01" title={copy('المنتجات','Products')} description={copy(`${data.products.length} منتج في كتالوج ERASE. لا تُعرض أي أسعار للعملاء.`,`${data.products.length} products in the ERASE catalog. Product prices are never shown to customers.`)} action={<button className="button button-dark admin-action" onClick={() => setEditing('new')}><Plus size={17} />{copy('إضافة منتج','Add product')}</button>} /><div className="admin-toolbar"><label className="admin-search"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={copy('ابحث بالاسم أو SKU...','Search name or SKU...')} /></label><span>{filtered.length} {copy('منتج','products')}</span></div><div className="table-wrap"><table className="admin-table"><thead><tr><th>{copy('المنتج','PRODUCT')}</th><th>SKU</th><th>{copy('الفئة','CATEGORY')}</th><th>{copy('التوفر','AVAILABILITY')}</th><th>{copy('الإجراءات','ACTIONS')}</th></tr></thead><tbody>{filtered.map(product => <tr key={product.id}><td><div className="table-product"><img src={product.image} alt="" /><span>{lang === 'ar' ? product.nameAr : product.nameEn}<small>{product.slug}</small></span></div></td><td>{product.sku}</td><td>{data.categories.find(item => item.id === product.categoryId)?.[lang === 'ar' ? 'nameAr' : 'nameEn'] ?? '—'}</td><td><StatusBadge value={product.availability} /></td><td><div className="table-actions"><button className="icon-button" onClick={() => setEditing(product)} aria-label={copy('تعديل','Edit')}><Pencil size={16} /></button><button className="icon-button" onClick={() => duplicate(product)} aria-label={copy('نسخ','Duplicate')}><Copy size={16} /></button><button className="icon-button danger" onClick={() => remove(product)} aria-label={copy('حذف','Delete')}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="admin-empty">{copy('لا توجد منتجات تطابق البحث.','No products match your search.')}</div>}</div>{editing && <ProductEditor product={editing === 'new' ? null : editing} categories={data.categories} brands={data.brands} onClose={() => setEditing(null)} onSave={product => { setData(current => ({ ...current, products: editing === 'new' ? [product, ...current.products] : current.products.map(item => item.id === product.id ? product : item) })); setEditing(null) }} />}</>
}

function AdminCategories() {
  const { lang } = useLocale()
  const { data, setData } = useStore()
  const copy = useCopy(lang)
  const [editing, setEditing] = useState<Category | null | 'new'>(null)
  const changeOrder = (category: Category, direction: number) => setData(current => {
    const ordered = [...current.categories].sort((a, b) => a.order - b.order)
    const index = ordered.findIndex(item => item.id === category.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ordered.length) return current
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    return { ...current, categories: ordered.map((item, order) => ({ ...item, order: order + 1 })) }
  })
  const remove = (category: Category) => {
    if (data.products.some(product => product.categoryId === category.id)) { window.alert(copy('لا يمكن حذف فئة مرتبطة بمنتجات. انقل المنتجات إلى فئة أخرى أولاً.','This category has products. Move them to another category first.')); return }
    if (window.confirm(copy(`حذف «${category.nameAr}»؟`,`Delete “${category.nameEn}”?`))) setData(current => ({ ...current, categories: current.categories.filter(item => item.id !== category.id) }))
  }
  return <><AdminHeading eyebrow="CATALOG / 02" title={copy('الفئات','Categories')} description={copy('رتّب الفئات التي تساعد الزائر على إيجاد احتياجه.','Organize the categories that help visitors find what they need.')} action={<button className="button button-dark admin-action" onClick={() => setEditing('new')}><Plus size={17} />{copy('إضافة فئة','Add category')}</button>} /><div className="admin-category-list">{[...data.categories].sort((a, b) => a.order - b.order).map(category => <article className="admin-category-row" key={category.id}><div className="category-order">{String(category.order).padStart(2, '0')}</div><div className="admin-category-info"><b>{lang === 'ar' ? category.nameAr : category.nameEn}</b><span>{category.slug} · {data.products.filter(item => item.categoryId === category.id).length} {copy('منتج','products')}</span></div><StatusBadge value={category.visible ? 'Visible' : 'Hidden'} /><div className="table-actions"><button className="icon-button" onClick={() => changeOrder(category, -1)} aria-label={copy('تحريك للأعلى','Move up')}><ArrowUpRight className="rotate-up" size={16} /></button><button className="icon-button" onClick={() => changeOrder(category, 1)} aria-label={copy('تحريك للأسفل','Move down')}><ArrowDown size={16} /></button><button className="icon-button" onClick={() => setEditing(category)} aria-label={copy('تعديل','Edit')}><Pencil size={16} /></button><button className="icon-button danger" onClick={() => remove(category)} aria-label={copy('حذف','Delete')}><Trash2 size={16} /></button></div></article>)}</div>{editing && <CategoryEditor category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={category => { setData(current => ({ ...current, categories: editing === 'new' ? [...current.categories, category] : current.categories.map(item => item.id === category.id ? category : item) })); setEditing(null) }} nextOrder={data.categories.length + 1} />}</>
}

function AdminBrands() {
  const { lang } = useLocale()
  const { data, setData } = useStore()
  const copy = useCopy(lang)
  const [editing, setEditing] = useState<Brand | null | 'new'>(null)
  const remove = (brand: Brand) => {
    if (data.products.some(product => product.brandId === brand.id)) { window.alert(copy('هذه العلامة مرتبطة بمنتجات. عدّل المنتجات قبل حذفها.','This brand is used by products. Update those products before deleting it.')); return }
    if (window.confirm(copy(`حذف «${brand.name}»؟`,`Delete “${brand.name}”?`))) setData(current => ({ ...current, brands: current.brands.filter(item => item.id !== brand.id) }))
  }
  return <><AdminHeading eyebrow="CATALOG / 03" title={copy('العلامات التجارية','Brands')} description={copy('أضف العلامات التي تتوفر لديكم فعلياً فقط.','Add only brands you actually supply.')} action={<button className="button button-dark admin-action" onClick={() => setEditing('new')}><Plus size={17} />{copy('إضافة علامة','Add brand')}</button>} /><div className="admin-brand-grid">{data.brands.length ? data.brands.map(brand => <article key={brand.id} className="admin-brand-card">{brand.logo ? <img src={brand.logo} alt="" /> : <span className="brand-placeholder">{brand.name.slice(0, 1).toUpperCase()}</span>}<div><b>{brand.name}</b><small>{data.products.filter(product => product.brandId === brand.id).length} {copy('منتج','products')}</small></div><button className="icon-button" onClick={() => setEditing(brand)} aria-label={copy('تعديل','Edit')}><Pencil size={16} /></button><button className="icon-button danger" onClick={() => remove(brand)} aria-label={copy('حذف','Delete')}><Trash2 size={16} /></button></article>) : <div className="admin-empty">{copy('لا توجد علامات مضافة. لا نستخدم علامات تجارية افتراضية غير مؤكدة.','No brands added. We do not show unverified sample brands.')}</div>}</div>{editing && <BrandEditor brand={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={brand => { setData(current => ({ ...current, brands: editing === 'new' ? [...current.brands, brand] : current.brands.map(item => item.id === brand.id ? brand : item) })); setEditing(null) }} />}</>
}

function AdminOffers() {
  const { lang } = useLocale()
  const { data, setData } = useStore()
  const copy = useCopy(lang)
  const [editing, setEditing] = useState<Offer | null | 'new'>(null)
  const remove = (offer: Offer) => {
    if (window.confirm(copy(`حذف العرض «${offer.titleAr}»؟`,`Delete offer “${offer.titleEn}”?`))) setData(current => ({ ...current, offers: current.offers.filter(item => item.id !== offer.id) }))
  }
  const toggle = (offer: Offer) => setData(current => ({ ...current, offers: current.offers.map(item => item.id === offer.id ? { ...item, status: item.status === 'Paused' ? 'Active' : 'Paused' } : item) }))
  const duplicate = (offer: Offer) => setData(current => ({ ...current, offers: [{ ...offer, id: idFor('offer'), titleAr: `${offer.titleAr} — نسخة`, titleEn: `${offer.titleEn} — Copy`, status: 'Draft' }, ...current.offers] }))
  return <><AdminHeading eyebrow="CAMPAIGNS / 01" title={copy('العروض','Offers')} description={copy('أدر المبادرات الموسمية. الأسعار غير معروضة في الواجهة العامة.','Manage seasonal offers. Prices are not displayed on the public site.')} action={<button className="button button-dark admin-action" onClick={() => setEditing('new')}><Plus size={17} />{copy('إضافة عرض','Add offer')}</button>} /><div className="admin-offer-list">{data.offers.map(offer => <article className="admin-offer-row" key={offer.id}><img src={offer.image} alt="" /><div className="admin-category-info"><b>{lang === 'ar' ? offer.titleAr : offer.titleEn}</b><span>{offer.type} · {new Date(offer.startsAt).toLocaleDateString()} – {new Date(offer.endsAt).toLocaleDateString()}</span><small>{offer.productIds.length} {copy('منتجات مرتبطة','linked products')} · {offer.categoryIds.length} {copy('فئات','categories')}</small></div><StatusBadge value={offer.status} /><div className="table-actions"><button className="icon-button" onClick={() => setEditing(offer)} aria-label={copy('تعديل','Edit')}><Pencil size={16} /></button><button className="icon-button" onClick={() => duplicate(offer)} aria-label={copy('نسخ','Duplicate')}><Copy size={16} /></button><button className="icon-button" onClick={() => toggle(offer)} aria-label={offer.status === 'Paused' ? copy('استئناف','Resume') : copy('إيقاف مؤقت','Pause')}>{offer.status === 'Paused' ? <Check size={16} /> : <Clock3 size={16} />}</button><button className="icon-button danger" onClick={() => remove(offer)} aria-label={copy('حذف','Delete')}><Trash2 size={16} /></button></div></article>)}{data.offers.length === 0 && <div className="admin-empty">{copy('لا توجد عروض محفوظة.','No offers have been saved.')}</div>}</div>{editing && <OfferEditor offer={editing === 'new' ? null : editing} products={data.products} categories={data.categories} onClose={() => setEditing(null)} onSave={offer => { setData(current => ({ ...current, offers: editing === 'new' ? [offer, ...current.offers] : current.offers.map(item => item.id === offer.id ? offer : item) })); setEditing(null) }} />}</>
}

function AdminRequests() {
  const { lang } = useLocale()
  const { data, setData } = useStore()
  const copy = useCopy(lang)
  return <><AdminHeading eyebrow="CUSTOMER / 01" title={copy('الطلبات','Requests')} description={copy('طلبات عروض الأسعار المرسلة من هذا الجهاز.','Quote requests saved from this device.')} /><div className="table-wrap"><RequestTable requests={data.requests} onStatus={(request, status) => setData(current => ({ ...current, requests: current.requests.map(item => item.id === request.id ? { ...item, status } : item) }))} /></div>{data.requests.length === 0 && <div className="admin-empty">{copy('لم تُسجل طلبات بعد.','No requests yet.')}</div>}</>
}
function RequestTable({ requests, compact = false, onStatus }: { requests: CustomerRequest[]; compact?: boolean; onStatus?: (request: CustomerRequest, status: CustomerRequest['status']) => void }) {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  return <div className="table-wrap"><table className="admin-table"><thead><tr><th>{copy('رقم الطلب','REQUEST')}</th><th>{copy('العميل','CUSTOMER')}</th>{!compact && <th>{copy('المنتجات والكميات','ITEMS & QUANTITIES')}</th>}<th>{copy('تاريخ الطلب','DATE')}</th><th>{copy('الحالة','STATUS')}</th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td><b>{request.id}</b><small className="cell-sub">{request.type === 'Bulk' ? 'B2B' : copy('اعتيادي','Standard')}</small></td><td>{request.customer}<small className="cell-sub">{request.phone}{request.company ? ` · ${request.company}` : ''}</small></td>{!compact && <td>{request.items.length} {copy('منتج','items')}<small className="cell-sub">{request.items.map(item => `${item.nameSnapshot} × ${item.quantity.toLocaleString()}`).join(' · ')}</small></td>}<td>{new Date(request.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-IQ' : 'en')}</td><td>{onStatus ? <select className="status-select" value={request.status} onChange={event => onStatus(request, event.target.value as CustomerRequest['status'])}>{(['New', 'Reviewing', 'Contacted', 'Processing', 'Completed', 'Cancelled'] as const).map(status => <option key={status} value={status}>{copy(statusLabels[status].ar, statusLabels[status].en)}</option>)}</select> : <StatusBadge value={request.status} />}</td></tr>)}</tbody></table></div>
}
const statusLabels: Record<CustomerRequest['status'], { ar: string; en: string }> = {
  New: { ar: 'جديد', en: 'New' }, Reviewing: { ar: 'قيد المراجعة', en: 'Reviewing' }, Contacted: { ar: 'تم التواصل', en: 'Contacted' }, Processing: { ar: 'قيد التجهيز', en: 'Processing' }, Completed: { ar: 'مكتمل', en: 'Completed' }, Cancelled: { ar: 'ملغي', en: 'Cancelled' },
}

function AdminCustomers() {
  const { lang } = useLocale()
  const { data } = useStore()
  const copy = useCopy(lang)
  const customers = Array.from(new Map(data.requests.map(request => [request.phone, request])).values())
  return <><AdminHeading eyebrow="CUSTOMER / 02" title={copy('العملاء','Customers')} description={copy('جهات الاتصال المستخرجة من الطلبات المحفوظة.','Contacts derived from saved requests.')} /><div className="table-wrap"><table className="admin-table"><thead><tr><th>{copy('الاسم','NAME')}</th><th>{copy('الهاتف','PHONE')}</th><th>{copy('الشركة','COMPANY')}</th><th>{copy('المحافظة','GOVERNORATE')}</th><th>{copy('الطلبات','REQUESTS')}</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.phone}><td>{customer.customer}</td><td>{customer.phone}</td><td>{customer.company || '—'}</td><td>{customer.governorate || '—'}</td><td>{data.requests.filter(request => request.phone === customer.phone).length}</td></tr>)}</tbody></table>{customers.length === 0 && <div className="admin-empty">{copy('سيظهر العملاء بعد وصول طلبات. لا توجد بيانات عملاء وهمية.','Customers will appear as requests arrive. No sample customer records are used.')}</div>}</div></>
}

function AdminSettings() {
  const { lang } = useLocale()
  const { data, setData } = useStore()
  const copy = useCopy(lang)
  const [saved, setSaved] = useState(false)
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const settings = Object.fromEntries(form.entries()) as AppData['settings']
    setData(current => ({ ...current, settings }))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }
  const fields: { name: keyof AppData['settings']; ar: string; en: string; type?: string; placeholder?: string }[] = [
    { name: 'companyName', ar: 'اسم الشركة', en: 'Company name' },
    { name: 'logo', ar: 'رابط شعار الشركة', en: 'Company logo URL', type: 'url', placeholder: 'https://...' },
    { name: 'favicon', ar: 'رابط أيقونة المتصفح', en: 'Favicon URL', type: 'url', placeholder: 'https://...' },
    { name: 'whatsapp', ar: 'رقم WhatsApp مع رمز الدولة', en: 'WhatsApp number with country code', placeholder: '+9647XXXXXXXXX' },
    { name: 'phone', ar: 'الهاتف', en: 'Phone', type: 'tel' },
    { name: 'email', ar: 'البريد الإلكتروني', en: 'Email', type: 'email' },
    { name: 'address', ar: 'العنوان', en: 'Address' },
    { name: 'instagram', ar: 'رابط Instagram', en: 'Instagram URL' },
    { name: 'facebook', ar: 'رابط Facebook', en: 'Facebook URL' },
    { name: 'workingHours', ar: 'ساعات العمل', en: 'Working hours' },
    { name: 'homeUrl', ar: 'رابط الموقع الرسمي', en: 'Canonical website URL', placeholder: 'https://example.com' },
  ]
  return <><AdminHeading eyebrow="CONFIGURATION / 01" title={copy('إعدادات الموقع','Site settings')} description={copy('لا تستخدم بيانات حقيقية قبل أن يزودك بها صاحب الموقع.','Do not use real company details until provided by the site owner.')} /><form className="settings-form" onSubmit={save}><section className="admin-panel settings-section"><div className="panel-heading"><div><span className="eyebrow"><i />01 — {copy('بيانات الشركة','COMPANY DETAILS')}</span><h2>{copy('معلومات التواصل','Contact information')}</h2></div></div><div className="form-grid">{fields.map(field => <label key={field.name}>{lang === 'ar' ? field.ar : field.en}<input name={field.name} type={field.type || 'text'} defaultValue={data.settings[field.name]} placeholder={field.placeholder} /></label>)}</div></section><section className="admin-panel settings-section"><div className="panel-heading"><div><span className="eyebrow"><i />02 — {copy('محتوى الصفحة الرئيسية','HOMEPAGE CONTENT')}</span><h2>{copy('العنوان الرئيسي','Hero content')}</h2></div></div><div className="form-grid"><label>Hero title / عربي<input name="heroTitleAr" defaultValue={data.settings.heroTitleAr} /></label><label>Hero title / English<input name="heroTitleEn" defaultValue={data.settings.heroTitleEn} /></label><label className="full-field">Hero subtitle / عربي<textarea name="heroSubtitleAr" defaultValue={data.settings.heroSubtitleAr} rows={3} /></label><label className="full-field">Hero subtitle / English<textarea name="heroSubtitleEn" defaultValue={data.settings.heroSubtitleEn} rows={3} /></label></div></section><div className="settings-save-row"><span>{saved && <span className="inline-success"><Check size={16} />{copy('تم حفظ الإعدادات','Settings saved')}</span>}</span><button className="button button-dark" type="submit">{copy('حفظ الإعدادات','Save settings')}<Check size={16} /></button></div></form></>
}

function AdminBackup() {
  const { lang } = useLocale()
  const { data, setData } = useStore()
  const copy = useCopy(lang)
  const [message, setMessage] = useState('')
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `erase-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  const importData = (event: FormEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onerror = () => setMessage(copy('تعذرت قراءة الملف.','Could not read the file.'))
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result))
        if (!isAppData(parsed)) throw new Error('Invalid backup')
        setData(parsed)
        setMessage(copy('تم استيراد النسخة الاحتياطية.','Backup imported.'))
      } catch (error) {
        console.error('Invalid ERASE backup file', error)
        setMessage(copy('ملف النسخة الاحتياطية غير صالح أو غير مكتمل.','Backup file is invalid or incomplete.'))
      }
    }
    reader.readAsText(file)
    event.currentTarget.value = ''
  }
  return <><AdminHeading eyebrow="DATA / 01" title={copy('النسخ الاحتياطي والبيانات','Backup & data')} description={copy('صدّر نسخة احتياطية أو استورد بيانات JSON.','Export a backup or import JSON data.')} /><div className="backup-grid"><section className="admin-panel backup-card"><span className="backup-icon"><Download size={22} /></span><span className="eyebrow"><i />01 — EXPORT</span><h2>{copy('احتفظ بنسخة آمنة.','Keep a safe copy.')}</h2><p>{copy('تصدير جميع المنتجات والفئات والعلامات والعروض والطلبات والإعدادات بصيغة JSON.','Export all products, categories, brands, offers, requests and settings as JSON.')}</p><button className="button button-dark" onClick={exportData}>{copy('تنزيل النسخة','Download backup')}<Download size={16} /></button></section><section className="admin-panel backup-card"><span className="backup-icon"><Upload size={22} /></span><span className="eyebrow"><i />02 — IMPORT</span><h2>{copy('استعادة البيانات.','Restore your data.')}</h2><p>{copy('استيراد ملف ERASE JSON سيستبدل البيانات المحلية الحالية. تأكد من تنزيل نسخة أولاً.','Importing an ERASE JSON file replaces current local data. Export a backup first.')}</p><label className="button button-outline file-input-label">{copy('اختيار ملف JSON','Choose JSON file')}<Upload size={16} /><input type="file" accept=".json,application/json" onChange={importData} /></label></section></div>{message && <div className="inline-success backup-message" role="status">{message}</div>}<div className="data-note"><ShieldAlert size={19} /><p><b>{copy('مهم قبل الإطلاق','Important before launch')}</b><br />{copy('هذه البيانات تُحفظ في المتصفح الحالي فقط. لا تُعد قاعدة بيانات أو تخزيناً سحابياً. اربط Supabase أو API ومصادقة آمنة قبل الاستخدام الفعلي.','This data lives only in this browser. It is not a database or cloud storage. Connect Supabase or an API and secure authentication before production.')}</p></div></>
}

function StatusBadge({ value }: { value: string }) {
  const { lang } = useLocale()
  const translated: Record<string, { ar: string; en: string }> = {
    available: { ar: 'متوفر', en: 'Available' }, limited: { ar: 'محدود', en: 'Limited' }, 'on-request': { ar: 'حسب الطلب', en: 'On request' },
    Visible: { ar: 'ظاهر', en: 'Visible' }, Hidden: { ar: 'مخفي', en: 'Hidden' },
    Active: { ar: 'نشط', en: 'Active' }, Paused: { ar: 'متوقف', en: 'Paused' }, Scheduled: { ar: 'مجدول', en: 'Scheduled' }, Expired: { ar: 'منتهي', en: 'Expired' }, Archived: { ar: 'مؤرشف', en: 'Archived' }, Draft: { ar: 'مسودة', en: 'Draft' },
  }
  const text = translated[value] ? lang === 'ar' ? translated[value].ar : translated[value].en : value
  return <span className={`status-badge status-${value.toLowerCase().replace(/ /g, '-')}`}><i />{text}</span>
}

function AdminModal({ title, close, children }: PropsWithChildren<{ title: string; close: () => void }>) {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [close])
  return <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget) close() }}><div className="editor-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><span className="eyebrow"><i />ERASE / STUDIO</span><h2>{title}</h2></div><button className="icon-button" type="button" onClick={close} aria-label={copy('إغلاق','Close')}><X size={19} /></button></div>{children}</div></div>
}

function ProductEditor({ product, categories, brands, onClose, onSave }: { product: Product | null; categories: Category[]; brands: Brand[]; onClose: () => void; onSave: (product: Product) => void }) {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nameAr = String(form.get('nameAr') || '').trim()
    const nameEn = String(form.get('nameEn') || '').trim()
    const slug = String(form.get('slug') || '').trim().toLowerCase()
    const sku = String(form.get('sku') || '').trim()
    if (!nameAr || !nameEn || !slug || !sku) { setError(copy('أكمل الاسم والرابط وSKU.','Name, slug and SKU are required.')); return }
    const gallery = String(form.get('gallery') || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean)
    const selectedCategory = String(form.get('categoryId') || '')
    onSave({
      id: product?.id ?? idFor(slug), slug,
      nameAr, nameEn,
      descriptionAr: String(form.get('descriptionAr') || '').trim(),
      descriptionEn: String(form.get('descriptionEn') || '').trim(),
      sku, brandId: String(form.get('brandId') || ''), categoryId: selectedCategory,
      image: String(form.get('image') || '').trim(), gallery,
      availability: String(form.get('availability') || 'available') as Product['availability'],
      pack: String(form.get('pack') || '').trim(), carton: String(form.get('carton') || '').trim(),
      specifications: String(form.get('specifications') || '').trim(), colors: String(form.get('colors') || '').trim(), sizes: String(form.get('sizes') || '').trim(),
      featured: form.get('featured') === 'on',
    })
  }
  return <AdminModal title={product ? copy('تعديل منتج','Edit product') : copy('منتج جديد','New product')} close={onClose}><form className="editor-form" onSubmit={submit}><div className="form-grid"><label>{copy('الاسم بالعربية','Name in Arabic')}<input name="nameAr" defaultValue={product?.nameAr} required /></label><label>{copy('الاسم بالإنجليزية','Name in English')}<input name="nameEn" defaultValue={product?.nameEn} required /></label><label>Slug<input name="slug" defaultValue={product?.slug} required /></label><label>SKU<input name="sku" defaultValue={product?.sku} required /></label><label>{copy('الفئة','Category')}<select name="categoryId" defaultValue={product?.categoryId || categories[0]?.id} required>{categories.map(category => <option key={category.id} value={category.id}>{category.nameAr} / {category.nameEn}</option>)}</select></label><label>{copy('العلامة','Brand')}<select name="brandId" defaultValue={product?.brandId || ''}><option value="">—</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label>{copy('التوفر','Availability')}<select name="availability" defaultValue={product?.availability ?? 'available'}><option value="available">{copy('متوفر','Available')}</option><option value="limited">{copy('محدود','Limited')}</option><option value="on-request">{copy('حسب الطلب','On request')}</option></select></label><label>{copy('رابط الصورة','Image URL')}<input name="image" defaultValue={product?.image} type="url" placeholder="https://..." required /></label><label className="full-field">{copy('الوصف بالعربية','Description in Arabic')}<textarea name="descriptionAr" rows={2} defaultValue={product?.descriptionAr} /></label><label className="full-field">{copy('الوصف بالإنجليزية','Description in English')}<textarea name="descriptionEn" rows={2} defaultValue={product?.descriptionEn} /></label><label>{copy('حجم العبوة','Pack')}<input name="pack" defaultValue={product?.pack} /></label><label>{copy('حجم الكرتون','Carton')}<input name="carton" defaultValue={product?.carton} /></label><label>{copy('الألوان','Colors')}<input name="colors" defaultValue={product?.colors} /></label><label>{copy('المقاسات','Sizes')}<input name="sizes" defaultValue={product?.sizes} /></label><label className="full-field">{copy('المواصفات','Specifications')}<textarea name="specifications" rows={2} defaultValue={product?.specifications} /></label><label className="full-field">{copy('صور إضافية (رابط لكل سطر)','Additional images (one URL per line)')}<textarea name="gallery" rows={2} defaultValue={product?.gallery.join('\n')} /></label><label className="checkbox-label full-field"><input type="checkbox" name="featured" defaultChecked={product?.featured} />{copy('إبراز على الصفحة الرئيسية','Feature on home page')}</label></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>{copy('إلغاء','Cancel')}</button><button className="button button-dark" type="submit">{copy('حفظ المنتج','Save product')}<Check size={16} /></button></div></form></AdminModal>
}

function CategoryEditor({ category, onClose, onSave, nextOrder }: { category: Category | null; onClose: () => void; onSave: (category: Category) => void; nextOrder: number }) {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const nameAr = String(form.get('nameAr') || '').trim()
    const nameEn = String(form.get('nameEn') || '').trim()
    const slug = String(form.get('slug') || '').trim().toLowerCase()
    if (!nameAr || !nameEn || !slug) return
    onSave({ id: category?.id ?? idFor(slug), slug, nameAr, nameEn, description: String(form.get('description') || '').trim(), order: Number(form.get('order')) || nextOrder, visible: form.get('visible') === 'on', featured: form.get('featured') === 'on' })
  }
  return <AdminModal title={category ? copy('تعديل فئة','Edit category') : copy('فئة جديدة','New category')} close={onClose}><form className="editor-form" onSubmit={submit}><div className="form-grid"><label>{copy('الاسم بالعربية','Name in Arabic')}<input name="nameAr" defaultValue={category?.nameAr} required /></label><label>{copy('الاسم بالإنجليزية','Name in English')}<input name="nameEn" defaultValue={category?.nameEn} required /></label><label>Slug<input name="slug" defaultValue={category?.slug} required /></label><label>{copy('الترتيب','Order')}<input name="order" type="number" min="1" defaultValue={category?.order ?? nextOrder} /></label><label className="full-field">{copy('الوصف','Description')}<textarea name="description" rows={3} defaultValue={category?.description} /></label><label className="checkbox-label"><input type="checkbox" name="visible" defaultChecked={category?.visible ?? true} />{copy('إظهار الفئة','Visible')}</label><label className="checkbox-label"><input type="checkbox" name="featured" defaultChecked={category?.featured ?? false} />{copy('إبراز في الرئيسية','Featured')}</label></div><div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>{copy('إلغاء','Cancel')}</button><button className="button button-dark" type="submit">{copy('حفظ الفئة','Save category')}<Check size={16} /></button></div></form></AdminModal>
}

function BrandEditor({ brand, onClose, onSave }: { brand: Brand | null; onClose: () => void; onSave: (brand: Brand) => void }) {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    if (!name) return
    onSave({ id: brand?.id ?? idFor(name), name, description: String(form.get('description') || '').trim(), logo: String(form.get('logo') || '').trim() })
  }
  return <AdminModal title={brand ? copy('تعديل علامة','Edit brand') : copy('علامة جديدة','New brand')} close={onClose}><form className="editor-form" onSubmit={submit}><div className="form-grid"><label>{copy('الاسم','Name')}<input name="name" defaultValue={brand?.name} required /></label><label>{copy('رابط الشعار','Logo URL')}<input name="logo" type="url" defaultValue={brand?.logo} /></label><label className="full-field">{copy('الوصف','Description')}<textarea name="description" rows={3} defaultValue={brand?.description} /></label></div><div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>{copy('إلغاء','Cancel')}</button><button className="button button-dark" type="submit">{copy('حفظ العلامة','Save brand')}<Check size={16} /></button></div></form></AdminModal>
}

function OfferEditor({ offer, products, categories, onClose, onSave }: { offer: Offer | null; products: Product[]; categories: Category[]; onClose: () => void; onSave: (offer: Offer) => void }) {
  const { lang } = useLocale()
  const copy = useCopy(lang)
  const [status, setStatus] = useState<Offer['status']>(offer?.status ?? 'Draft')
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const linkedProducts = form.getAll('productIds').map(String)
    const linkedCategories = form.getAll('categoryIds').map(String)
    const titleAr = String(form.get('titleAr') || '').trim()
    const titleEn = String(form.get('titleEn') || '').trim()
    const startsAt = new Date(String(form.get('startsAt')))
    const endsAt = new Date(String(form.get('endsAt')))
    if (!titleAr || !titleEn) return
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt) {
      setError(copy('تأكد أن تاريخ النهاية يأتي بعد تاريخ البداية.','Make sure the end date is after the start date.'))
      return
    }
    onSave({
      id: offer?.id ?? idFor('offer'), titleAr, titleEn,
      descriptionAr: String(form.get('descriptionAr') || '').trim(), descriptionEn: String(form.get('descriptionEn') || '').trim(),
      image: String(form.get('image') || '').trim(), type: String(form.get('type') || 'Seasonal'),
      startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(),
      status, productIds: linkedProducts, categoryIds: linkedCategories,
    })
  }
  const dateValue = (value?: string) => value ? new Date(value).toISOString().slice(0, 16) : ''
  return <AdminModal title={offer ? copy('تعديل عرض','Edit offer') : copy('عرض جديد','New offer')} close={onClose}><form className="editor-form" onSubmit={submit}><div className="form-grid"><label>{copy('العنوان بالعربية','Title in Arabic')}<input name="titleAr" defaultValue={offer?.titleAr} required /></label><label>{copy('العنوان بالإنجليزية','Title in English')}<input name="titleEn" defaultValue={offer?.titleEn} required /></label><label>{copy('نوع العرض','Offer type')}<select name="type" defaultValue={offer?.type || 'Seasonal'}>{['Seasonal', 'Product', 'Category', 'Bulk', 'Business', 'Promotion', 'Limited'].map(value => <option key={value}>{value}</option>)}</select></label><label>{copy('الحالة','Status')}<select value={status} onChange={event => setStatus(event.target.value as Offer['status'])}>{(['Draft', 'Scheduled', 'Active', 'Paused', 'Expired', 'Archived'] as const).map(value => <option key={value}>{value}</option>)}</select></label><label>{copy('تاريخ البداية','Start date')}<input type="datetime-local" name="startsAt" defaultValue={dateValue(offer?.startsAt)} required /></label><label>{copy('تاريخ النهاية','End date')}<input type="datetime-local" name="endsAt" defaultValue={dateValue(offer?.endsAt)} required /></label><label className="full-field">{copy('رابط صورة العرض','Offer image URL')}<input name="image" type="url" defaultValue={offer?.image} required /></label><label className="full-field">{copy('الوصف بالعربية','Description in Arabic')}<textarea name="descriptionAr" rows={2} defaultValue={offer?.descriptionAr} /></label><label className="full-field">{copy('الوصف بالإنجليزية','Description in English')}<textarea name="descriptionEn" rows={2} defaultValue={offer?.descriptionEn} /></label><fieldset className="check-fieldset full-field"><legend>{copy('المنتجات المرتبطة','Linked products')}</legend>{products.map(product => <label className="checkbox-label" key={product.id}><input type="checkbox" name="productIds" value={product.id} defaultChecked={offer?.productIds.includes(product.id)} />{product.nameAr}</label>)}</fieldset><fieldset className="check-fieldset full-field"><legend>{copy('الفئات المرتبطة','Linked categories')}</legend>{categories.map(category => <label className="checkbox-label" key={category.id}><input type="checkbox" name="categoryIds" value={category.id} defaultChecked={offer?.categoryIds.includes(category.id)} />{category.nameAr}</label>)}</fieldset></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>{copy('إلغاء','Cancel')}</button><button className="button button-dark" type="submit">{copy('حفظ العرض','Save offer')}<Check size={16} /></button></div></form></AdminModal>
}
