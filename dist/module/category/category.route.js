import { Hono } from "hono";
import { createCategoryController, getCategoryController, softDeleteCategoryController, updateCategoryController } from "./category.controller.js";
import { validator } from "../../lib/validators.js";
import { categorySchema } from "./category.schema.js";
export const categoryRoute = new Hono();
categoryRoute.get('', getCategoryController);
categoryRoute.post('', validator('json', categorySchema), createCategoryController);
categoryRoute.put('', validator('json', categorySchema), updateCategoryController);
categoryRoute.delete('/:category_id', softDeleteCategoryController);
