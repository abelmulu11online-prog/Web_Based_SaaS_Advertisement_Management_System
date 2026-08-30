/**
 * profiles.schemas.js — Zod validation schemas for the profiles module.
 */
import { z } from 'zod'

const uuid   = z.string().uuid()
const optUrl = z.string().url('Invalid URL').max(500).optional()
const optStr = (max = 200) => z.string().max(max).optional()
const pageQ  = z.coerce.number().int().positive().optional()

// ── Shared ─────────────────────────────────────────────────────────────────────

const tagsSchema = z.array(z.string().max(50)).max(20).optional()

const paginationQuery = z.object({
  query: z.object({
    page:      pageQ,
    page_size: pageQ,
  }).optional(),
})

// ── Profile extended update ────────────────────────────────────────────────────

export const updateExtendedProfileSchema = z.object({
  body: z.object({
    profile_type: z.enum(['PERSONAL','PROFESSIONAL','FREELANCER','SHOP','BUSINESS','COMPANY','ORGANIZATION']).optional(),
    headline:     z.string().max(150).optional(),
    display_name: z.string().min(1).max(200).optional(),
    slug:         z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
    description:  z.string().max(2000).optional(),
    category_id:  uuid.optional(),
    country:      optStr(100),
    region:       optStr(100),
    city:         optStr(100),
    area:         optStr(100),
    address_line: optStr(300),
    latitude:     z.coerce.number().min(-90).max(90).optional(),
    longitude:    z.coerce.number().min(-180).max(180).optional(),
    location_precision: z.enum(['CITY','DISTRICT','FULL']).optional(),
    contact_phone:   z.string().regex(/^\+?[1-9][\d\s]{6,14}$/, 'Invalid phone').transform(v => v.replace(/\s/g, '')).optional(),
    contact_email:   z.string().email().transform(v => v.toLowerCase().trim()).optional(),
    website_url:     optUrl,
    whatsapp:        z.string().regex(/^\+?[1-9][\d\s]{6,14}$/).transform(v => v.replace(/\s/g, '')).optional(),
    telegram_username: z.string().max(100).optional(),
    phone_visibility:  z.enum(['PUBLIC','LOGGED_IN','HIDDEN']).optional(),
    email_visibility:  z.enum(['PUBLIC','LOGGED_IN','HIDDEN']).optional(),
    is_published:      z.boolean().optional(),
  }).strict().refine(d => Object.keys(d).length > 0, { message: 'At least one field required' }),
})

// ── Slug check ─────────────────────────────────────────────────────────────────

export const slugParamSchema = z.object({
  params: z.object({ slug: z.string().min(2).max(100) }),
})

// ── Search ─────────────────────────────────────────────────────────────────────

export const searchProfilesSchema = z.object({
  query: z.object({
    search:       z.string().max(200).optional(),
    profile_type: z.enum(['PERSONAL','PROFESSIONAL','FREELANCER','SHOP','BUSINESS','COMPANY','ORGANIZATION']).optional(),
    category_id:  uuid.optional(),
    city:         z.string().max(100).optional(),
    country:      z.string().max(100).optional(),
    page:         pageQ,
    page_size:    pageQ,
  }).optional(),
})

// ── Products ───────────────────────────────────────────────────────────────────

const productBody = z.object({
  title:        z.string().min(1).max(200),
  description:  z.string().max(5000).optional(),
  category_id:  uuid.optional(),
  price:        z.coerce.number().min(0).optional(),
  currency:     z.string().max(10).optional(),
  price_type:   z.enum(['FIXED','NEGOTIABLE','CONTACT_FOR_PRICE','FREE']).optional(),
  brand:        optStr(100),
  condition:    z.enum(['NEW','USED','REFURBISHED']).optional(),
  availability: z.enum(['IN_STOCK','OUT_OF_STOCK','PRE_ORDER','DISCONTINUED']).optional(),
  tags:         tagsSchema,
  is_featured:  z.boolean().optional(),
  is_published: z.boolean().optional(),
  sort_order:   z.number().int().optional(),
})

export const createProductSchema   = z.object({ body: productBody.strict() })
export const updateProductSchema   = z.object({
  params: z.object({ id: uuid }),
  body: productBody.partial().strict().refine(d => Object.keys(d).length > 0, { message: 'At least one field required' }),
})
export const productParamSchema    = z.object({ params: z.object({ id: uuid }) })
export const listProductsSchema    = paginationQuery

// ── Services ───────────────────────────────────────────────────────────────────

const serviceBody = z.object({
  title:        z.string().min(1).max(200),
  description:  z.string().max(5000).optional(),
  category_id:  uuid.optional(),
  price_from:   z.coerce.number().min(0).optional(),
  currency:     z.string().max(10).optional(),
  pricing_type: z.enum(['FIXED','STARTING_FROM','HOURLY','NEGOTIABLE','CONTACT_FOR_PRICE']).optional(),
  location:     optStr(200),
  availability: z.enum(['AVAILABLE','UNAVAILABLE','BY_APPOINTMENT']).optional(),
  tags:         tagsSchema,
  is_featured:  z.boolean().optional(),
  is_published: z.boolean().optional(),
  sort_order:   z.number().int().optional(),
})

export const createServiceSchema   = z.object({ body: serviceBody.strict() })
export const updateServiceSchema   = z.object({
  params: z.object({ id: uuid }),
  body: serviceBody.partial().strict().refine(d => Object.keys(d).length > 0, { message: 'At least one field required' }),
})
export const serviceParamSchema    = z.object({ params: z.object({ id: uuid }) })

// ── Portfolio ──────────────────────────────────────────────────────────────────

const portfolioBody = z.object({
  title:           z.string().min(1).max(200),
  description:     z.string().max(5000).optional(),
  category:        optStr(100),
  client:          optStr(200),
  project_url:     optUrl,
  completion_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  tags:            tagsSchema,
  is_featured:     z.boolean().optional(),
  is_published:    z.boolean().optional(),
  sort_order:      z.number().int().optional(),
})

export const createPortfolioSchema = z.object({ body: portfolioBody.strict() })
export const updatePortfolioSchema = z.object({
  params: z.object({ id: uuid }),
  body: portfolioBody.partial().strict().refine(d => Object.keys(d).length > 0, { message: 'At least one field required' }),
})
export const portfolioParamSchema  = z.object({ params: z.object({ id: uuid }) })

// ── Posts ──────────────────────────────────────────────────────────────────────

const postBody = z.object({
  title:        z.string().max(200).optional(),
  content:      z.string().min(1).max(5000),
  post_type:    z.enum(['UPDATE','ANNOUNCEMENT','PROMOTION','ACHIEVEMENT','PROJECT']).optional(),
  visibility:   z.enum(['PUBLIC','HIDDEN']).optional(),
  is_published: z.boolean().optional(),
  is_pinned:    z.boolean().optional(),
})

export const createPostSchema      = z.object({ body: postBody.strict() })
export const updatePostSchema      = z.object({
  params: z.object({ id: uuid }),
  body: postBody.partial().strict().refine(d => Object.keys(d).length > 0, { message: 'At least one field required' }),
})
export const postParamSchema       = z.object({ params: z.object({ id: uuid }) })

// ── Achievements ───────────────────────────────────────────────────────────────

const achievementBody = z.object({
  title:           z.string().min(1).max(200),
  description:     z.string().max(2000).optional(),
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  organization:    optStr(200),
  certificate_url: optUrl,
  external_link:   optUrl,
  is_published:    z.boolean().optional(),
  sort_order:      z.number().int().optional(),
})

export const createAchievementSchema = z.object({ body: achievementBody.strict() })
export const updateAchievementSchema = z.object({
  params: z.object({ id: uuid }),
  body: achievementBody.partial().strict().refine(d => Object.keys(d).length > 0, { message: 'At least one field required' }),
})
export const achievementParamSchema  = z.object({ params: z.object({ id: uuid }) })

// ── Content image params ───────────────────────────────────────────────────────

export const contentImageParamSchema = z.object({
  params: z.object({ id: uuid, imageId: uuid }),
})
