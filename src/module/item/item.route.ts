import { Hono } from "hono";
import { createItemController, getItemController, softDeleteItemController, updateItemController } from "./item.controller.js";
import { validator } from "../../lib/validators.js";
import { itemSchema } from "./item.schema.js";



export const itemRoute = new Hono();


itemRoute.get('', getItemController);

itemRoute.post(
    '', 
    validator('json', itemSchema),
    createItemController
);

itemRoute.put(
    '', 
    validator('json', itemSchema),
    updateItemController
);

itemRoute.delete(
    '/:item_id',
    softDeleteItemController
)