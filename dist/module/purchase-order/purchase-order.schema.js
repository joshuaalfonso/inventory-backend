import z from "zod";
export const purchaseOrderItemSchema = z.object({
    purchase_order_item_id: z.number(),
    purchase_order_id: z.number(),
    employee_id: z.number(),
    item_id: z.number(),
    ordered_quantity: z.number().nonnegative(),
    price: z.number().nonnegative(),
});
export const purchaseOrderSchema = z.object({
    purchase_order_id: z.number().default(0),
    purchase_request_number: z.string(),
    purchase_order_number: z.string().optional(),
    purchase_order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    supplier_id: z.number(),
    purchase_order_item: z.array(purchaseOrderItemSchema)
});
