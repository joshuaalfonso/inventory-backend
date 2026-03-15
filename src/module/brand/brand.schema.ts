import z from "zod";




export const brandSchema = z.object({
  brand_id: z.number().optional(),
  brand_name: z.string(),
});



// export type BrandInput = z.infer<typeof brandSchema>