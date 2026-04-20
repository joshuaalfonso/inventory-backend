import { Hono } from "hono";
import { createBrandController, getBrandController, softDeleteBrandController, updateBrandController } from "./brand.controller.js";
import { brandSchema } from "./brand.schema.js";
import { validator } from "../../lib/validators.js";
export const brandRoute = new Hono();
brandRoute.get('', getBrandController);
brandRoute.post('', validator('json', brandSchema), createBrandController);
brandRoute.put('', validator('json', brandSchema), updateBrandController);
brandRoute.delete('/:brand_id', softDeleteBrandController);
