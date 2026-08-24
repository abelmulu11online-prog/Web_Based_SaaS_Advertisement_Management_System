/**
 * categories.routes.js — Public category listing routes.
 *
 * GET /api/categories      — list all active top-level categories with children
 * GET /api/categories/:id  — get a single category by ID
 *
 * No authentication required — categories are public reference data.
 */
import { Router } from 'express'
import { asyncHandler, sendSuccess, createError } from '../../utils/index.js'
import pool from '../../db/index.js'

const router = Router()

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: List all active categories
 *     description: Returns active categories. Use ?flat=true for a flat list, otherwise returns a tree.
 *     tags:
 *       - Categories
 *     parameters:
 *       - in: query
 *         name: flat
 *         schema:
 *           type: boolean
 *         description: Return flat list instead of tree structure
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, parent_id, name, slug, description, icon, is_active
     FROM categories
     WHERE is_active = TRUE
     ORDER BY parent_id NULLS FIRST, name`,
  )

  const categories = result.rows

  if (req.query.flat === 'true') {
    return sendSuccess(res, 'Categories retrieved successfully', categories)
  }

  // Build tree structure
  const byId = {}
  const roots = []

  for (const cat of categories) {
    byId[cat.id] = { ...cat, children: [] }
  }

  for (const cat of categories) {
    if (cat.parent_id && byId[cat.parent_id]) {
      byId[cat.parent_id].children.push(byId[cat.id])
    } else if (!cat.parent_id) {
      roots.push(byId[cat.id])
    }
  }

  sendSuccess(res, 'Categories retrieved successfully', roots)
}))

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags:
 *       - Categories
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, parent_id, name, slug, description, icon, is_active
     FROM categories
     WHERE id = $1`,
    [req.params.id],
  )

  if (!result.rows[0]) {
    throw createError('Category not found', 404, 'CATEGORY_NOT_FOUND')
  }

  sendSuccess(res, 'Category retrieved successfully', result.rows[0])
}))

export default router
