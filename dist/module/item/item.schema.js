import z from "zod";
export const itemSchema = z.object({
    item_id: z.number(),
    item_name: z.string(),
    brand_id: z.number(),
    category_id: z.number(),
    item_type_id: z.number(),
    unit_of_measure_id: z.number(),
});
