import { Hono } from "hono";
import { validator } from "../../lib/validators.js";
import { purchaseOrderSchema, updatePurchaseOrderStatusSchema } from "./purchase-order.schema.js";
import { createPurchaseOrderController, getPaginatedPurchaseOrdersController, getPendingPurchaseOrderController, getPuchaseOrderController, getSinglePendingPurchaseOrderController, getSinglePurchaseOrderController, updatePurchaseOrderController, updatePurchaseOrderStatusController } from "./purchase-order.controller.js";


export const purchaseOrderRoute = new Hono();


purchaseOrderRoute.get('', getPuchaseOrderController),
purchaseOrderRoute.get('/paginated', getPaginatedPurchaseOrdersController),
purchaseOrderRoute.get('/pending', getPendingPurchaseOrderController),
purchaseOrderRoute.get('/pending/:purchase_order_id', getSinglePendingPurchaseOrderController),
purchaseOrderRoute.get('/:purchase_order_id', getSinglePurchaseOrderController),

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

purchaseOrderRoute.put(
    '/status',
    validator('json', updatePurchaseOrderStatusSchema),
    updatePurchaseOrderStatusController
)


