/**
 * middleware/validate.js — Reusable Zod validation middleware.
 *
 * Usage:
 *   import { validate } from '../middleware/validate.js'
 *   import { z } from 'zod'
 *
 *   const schema = z.object({
 *     body: z.object({ name: z.string().min(1) }),
 *     query: z.object({ page: z.coerce.number().int().positive().optional() }),
 *     params: z.object({ id: z.string().uuid() }),
 *   })
 *
 *   router.post('/resource', validate(schema), controller.create)
 *
 * The schema should be an object schema whose keys are a subset of
 * { body, query, params }.  Any key not present in the schema is
 * left un-validated.
 */
import { ZodError } from 'zod'

/**
 * Build an Express middleware that validates request parts against a Zod schema.
 *
 * @param {import('zod').ZodTypeAny} schema
 *   A Zod object schema with optional keys: body, query, params
 * @returns {import('express').RequestHandler}
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    })

    if (result.success) {
      // Replace request fields with the parsed (and coerced) values
      if (result.data.body !== undefined) req.body = result.data.body
      if (result.data.query !== undefined) req.query = result.data.query
      if (result.data.params !== undefined) req.params = result.data.params
      return next()
    }

    // Format Zod issues into a human-readable list
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        issues,
      },
    })
  }
}

/**
 * Type guard — returns true when `err` is a ZodError.
 * Useful in the centralised error handler.
 *
 * @param {unknown} err
 * @returns {err is ZodError}
 */
export function isZodError(err) {
  return err instanceof ZodError
}
