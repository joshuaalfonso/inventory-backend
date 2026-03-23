import z from "zod";




export const categorySchema = z.object({
  category_id: z.number(),
  category_name: z.string(),
});