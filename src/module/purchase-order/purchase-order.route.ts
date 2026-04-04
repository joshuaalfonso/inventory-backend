import { Hono } from "hono";
import { validator } from "../../lib/validators.js";
import { purchaseOrderSchema } from "./purchase-order.schema.js";
import { createPurchaseOrderController, getPuchaseOrderController } from "./purchase-order.controller.js";









export const purchaseOrderRoute = new Hono();


purchaseOrderRoute.get('', getPuchaseOrderController)

purchaseOrderRoute.post(
    '', 
    validator('json', purchaseOrderSchema),
    createPurchaseOrderController
);


