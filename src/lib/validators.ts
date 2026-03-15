




import { zValidator } from '@hono/zod-validator'

export const validator = (target: 'json' | 'query' | 'param', schema: any) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          errors: result.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        400
      )
    }
  })