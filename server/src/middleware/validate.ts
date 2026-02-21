import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Zod validation middleware factory.
 * Takes a schema that may validate body, params, and/or query.
 */
export function validate(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Replace with parsed (coerced/defaulted) values
      if (result.body !== undefined) {
        req.body = result.body;
      }
      if (result.params !== undefined) {
        req.params = result.params;
      }
      if (result.query !== undefined) {
        req.query = result.query;
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err);
        return;
      }
      next(err);
    }
  };
}
