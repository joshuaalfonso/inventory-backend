import z from "zod";
export const incomingItemSchema = z.object({
    incoming_item_id: z.number().default(0),
    purchase_order_item_id: z.number(),
    item_id: z.number(),
    item_type_name: z.string(),
    ordered_quantity: z.number().nonnegative(),
    received_quantity: z.number().nonnegative(),
});
export const incomingSchema = z.object({
    incoming_id: z.number().default(0),
    purchase_order_id: z.number(),
    incoming_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    incoming_item: z.array(incomingItemSchema)
});
