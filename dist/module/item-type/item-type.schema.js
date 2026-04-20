import z from "zod";
export const itemTypeSchema = z.object({
    item_type_id: z.number(),
    item_type_name: z.string(),
    description: z.string(),
});
