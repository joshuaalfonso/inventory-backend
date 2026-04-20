import { Hono } from "hono";
import { createItemTypeController, getItemTypeController, softDeleteItemTypeController, updateItemTypeController } from "./item-type.controller.js";
import { itemTypeSchema } from "./item-type.schema.js";
import { validator } from "../../lib/validators.js";
export const itemTypeRoute = new Hono();
itemTypeRoute.get('', getItemTypeController);
itemTypeRoute.post('', validator('json', itemTypeSchema), createItemTypeController);
itemTypeRoute.put('', validator('json', itemTypeSchema), updateItemTypeController);
itemTypeRoute.delete('/:item_type_id', softDeleteItemTypeController);
