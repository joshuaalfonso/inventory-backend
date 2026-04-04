import { Hono } from "hono";
import { validator } from "../../lib/validators.js";
import { purchaseOrderSchema } from "./purchase-order.schema.js";
import { createPurchaseOrderController, getPuchaseOrderController, getSinglePurchaseOrderController, updatePurchaseOrderController } from "./purchase-order.controller.js";









export const purchaseOrderRoute = new Hono();


purchaseOrderRoute.get('', getPuchaseOrderController)
purchaseOrderRoute.get('/:purchase_order_id', getSinglePurchaseOrderController)

purchaseOrderRoute.post(
    '', 
    validator('json', purchaseOrderSchema),
    createPurchaseOrderController
);

purchaseOrderRoute.put(
    '', 
    validator('json', purchaseOrderSchema),
    updatePurchaseOrderController
);


