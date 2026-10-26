import type { AppData, Category, Product } from './types'

const paperImage = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=960&q=82'
const notebookImage = 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=960&q=82'
const pensImage = 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=960&q=82'
const deskImage = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=960&q=82'
const artImage = 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=960&q=82'
const foldersImage = 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=960&q=82'
const images = [paperImage, notebookImage, pensImage, deskImage, artImage, foldersImage]

export const initialCategories: Category[] = [
  { id: 'writing', slug: 'writing', nameAr: 'الكتابة والأقلام', nameEn: 'Writing & Pens', description: 'أدوات لكل فكرة تبدأ على الورق.', visible: true, featured: true, order: 1 },
  { id: 'paper', slug: 'paper', nameAr: 'الورق والدفاتر', nameEn: 'Paper & Notebooks', description: 'مساحة جديدة لكل ملاحظة وخطة.', visible: true, featured: true, order: 2 },
  { id: 'office', slug: 'office', nameAr: 'اللوازم المكتبية', nameEn: 'Office Supplies', description: 'أساسيات المكتب اليومية.', visible: true, featured: true, order: 3 },
  { id: 'organization', slug: 'organization', nameAr: 'الأرشفة والتنظيم', nameEn: 'Filing & Organization', description: 'ترتيب واضح لعمل أكثر سلاسة.', visible: true, featured: true, order: 4 },
  { id: 'school', slug: 'school', nameAr: 'اللوازم المدرسية', nameEn: 'School Supplies', description: 'احتياجات الدراسة والتعلّم.', visible: true, featured: false, order: 5 },
  { id: 'art', slug: 'art', nameAr: 'الرسم والفنون', nameEn: 'Art & Drawing', description: 'أدوات للأفكار التي تحتاج لوناً.', visible: true, featured: false, order: 6 },
  { id: 'printing', slug: 'printing', nameAr: 'الطباعة والحبر', nameEn: 'Printing & Ink', description: 'احتياجات الطباعة والنسخ.', visible: true, featured: false, order: 7 },
  { id: 'geometry', slug: 'geometry', nameAr: 'الأدوات الهندسية', nameEn: 'Geometry Tools', description: 'قياس ورسم بدقة.', visible: true, featured: false, order: 8 },
  { id: 'calculators', slug: 'calculators', nameAr: 'الآلات الحاسبة', nameEn: 'Calculators', description: 'أدوات الحساب للصف والمكتب.', visible: true, featured: false, order: 9 },
  { id: 'packaging', slug: 'packaging', nameAr: 'التغليف', nameEn: 'Packaging', description: 'تفاصيل عملية للتغليف.', visible: true, featured: false, order: 10 },
  { id: 'presentation', slug: 'presentation', nameAr: 'الاجتماعات والعروض', nameEn: 'Meeting & Presentation', description: 'أدوات لعرض الأفكار.', visible: true, featured: false, order: 11 },
  { id: 'gifts', slug: 'gifts', nameAr: 'الهدايا المكتبية', nameEn: 'Desk Gifts', description: 'اختيارات أنيقة للمكتب.', visible: true, featured: false, order: 12 },
  { id: 'office-essentials', slug: 'office-essentials', nameAr: 'مستلزمات المكتب', nameEn: 'Office Essentials', description: 'أساسيات المساحة المكتبية.', visible: true, featured: false, order: 13 },
  { id: 'learning', slug: 'learning', nameAr: 'منتجات التعليم', nameEn: 'Learning Tools', description: 'موارد وأدوات مساندة للتعلّم.', visible: true, featured: false, order: 14 },
]

const demoProducts: Product[] = [
  ['a5-notebook', 'دفتر ملاحظات A5', 'A5 Notebook', 'دفتر عملي للملاحظات اليومية والتخطيط.', 'A practical notebook for everyday notes and planning.', 'ER-DEMO-001', 'paper', 1, true],
  ['ballpoint-pens', 'قلم جاف — مجموعة', 'Ballpoint Pens — Set', 'أقلام للكتابة اليومية في الصف والمكتب.', 'Pens for everyday writing at school and work.', 'ER-DEMO-002', 'writing', 2, true],
  ['premium-paper', 'ورق طباعة أبيض', 'White Printing Paper', 'ورق متعدد الاستخدامات للاحتياجات المكتبية.', 'Multipurpose paper for office needs.', 'ER-DEMO-003', 'printing', 0, true],
  ['desk-organizer', 'منظم مكتب', 'Desk Organizer', 'حافظ على أساسيات المكتب قريبة ومرتبة.', 'Keep everyday desk essentials close and organized.', 'ER-DEMO-004', 'organization', 3, false],
  ['sketchbook', 'دفتر رسم', 'Sketchbook', 'أوراق للرسم والتجارب الفنية.', 'Pages for drawing and creative practice.', 'ER-DEMO-005', 'art', 4, true],
  ['document-folder', 'ملف مستندات', 'Document Folder', 'حل بسيط لحفظ الأوراق والمستندات.', 'A simple way to keep papers and documents together.', 'ER-DEMO-006', 'organization', 5, false],
  ['school-kit', 'أدوات هندسية', 'Geometry Set', 'مجموعة أدوات أساسية للرسم الهندسي.', 'A basic set of tools for geometry work.', 'ER-DEMO-007', 'geometry', 4, false],
  ['meeting-notes', 'دفتر اجتماعات', 'Meeting Notebook', 'دفتر منظم للملاحظات وخطط الاجتماعات.', 'A structured notebook for meeting notes and plans.', 'ER-DEMO-008', 'office', 1, false],
].map(([slug, nameAr, nameEn, descriptionAr, descriptionEn, sku, categoryId, imageIndex, featured]) => {
  const index = imageIndex as number
  return {
    id: slug as string,
    slug: slug as string,
    nameAr: nameAr as string,
    nameEn: nameEn as string,
    descriptionAr: descriptionAr as string,
    descriptionEn: descriptionEn as string,
    sku: sku as string,
    brandId: '',
    categoryId: categoryId as string,
    image: images[index],
    gallery: [images[index]],
    availability: 'available',
    pack: '',
    carton: '',
    specifications: '',
    colors: '',
    sizes: '',
    featured: featured as boolean,
  }
})

const today = new Date()
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

export const initialData: AppData = {
  products: demoProducts,
  categories: initialCategories,
  brands: [],
  offers: [
    {
      id: 'welcome-demo',
      titleAr: 'بداية موسم جديد',
      titleEn: 'A New Season Begins',
      descriptionAr: 'استكشف اختياراتنا الموسمية من مستلزمات الدراسة والمكتب. تواصل معنا للتوفر والتفاصيل.',
      descriptionEn: 'Explore a seasonal selection for study and work. Contact us for availability and details.',
      image: notebookImage,
      type: 'Seasonal',
      startsAt: today.toISOString(),
      endsAt: nextWeek.toISOString(),
      status: 'Active',
      productIds: ['a5-notebook', 'ballpoint-pens'],
      categoryIds: ['paper', 'writing'],
    },
  ],
  requests: [],
  settings: {
    companyName: 'ERASE',
    logo: '',
    favicon: '',
    whatsapp: '',
    phone: '',
    email: '',
    address: '',
    instagram: '',
    facebook: '',
    workingHours: '',
    heroTitleAr: 'كل فكرة كبيرة، تبدأ من صفحة.',
    heroTitleEn: 'Every big idea starts on a page.',
    heroSubtitleAr: 'أدوات الكتابة، الدراسة والعمل — مختارة لترافق يومك من أول سطر.',
    heroSubtitleEn: 'Writing, study and work essentials, selected to move with your day.',
    homeUrl: 'https://example.com',
  },
}
