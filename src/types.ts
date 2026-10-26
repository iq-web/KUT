export type Product = {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  sku: string
  brandId: string
  categoryId: string
  image: string
  gallery: string[]
  availability: 'available' | 'limited' | 'on-request'
  pack: string
  carton: string
  specifications: string
  colors: string
  sizes: string
  featured: boolean
}

export type Category = {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  description: string
  visible: boolean
  featured: boolean
  order: number
}

export type Brand = {
  id: string
  name: string
  description: string
  logo: string
}

export type Offer = {
  id: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  image: string
  type: string
  startsAt: string
  endsAt: string
  status: 'Draft' | 'Scheduled' | 'Active' | 'Paused' | 'Expired' | 'Archived'
  productIds: string[]
  categoryIds: string[]
}

export type RequestItem = {
  productId: string
  nameSnapshot: string
  slugSnapshot: string
  quantity: number
  skuSnapshot: string
}

export type CustomerRequest = {
  id: string
  customer: string
  phone: string
  company: string
  governorate: string
  notes: string
  type: 'Standard' | 'Bulk'
  status: 'New' | 'Reviewing' | 'Contacted' | 'Processing' | 'Completed' | 'Cancelled'
  createdAt: string
  items: RequestItem[]
}

export type SiteSettings = {
  companyName: string
  logo: string
  favicon: string
  whatsapp: string
  phone: string
  email: string
  address: string
  instagram: string
  facebook: string
  workingHours: string
  heroTitleAr: string
  heroTitleEn: string
  heroSubtitleAr: string
  heroSubtitleEn: string
  homeUrl: string
}

export type AppData = {
  products: Product[]
  categories: Category[]
  brands: Brand[]
  offers: Offer[]
  requests: CustomerRequest[]
  settings: SiteSettings
}

export function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  const settings = data.settings
  return ['products', 'categories', 'brands', 'offers', 'requests'].every(key => Array.isArray(data[key]))
    && Boolean(settings && typeof settings === 'object' && Object.values(settings).every(item => typeof item === 'string'))
}
