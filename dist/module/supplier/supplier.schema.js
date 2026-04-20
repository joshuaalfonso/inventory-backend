import z from "zod";
export const supplierSchema = z.object({
    supplier_id: z.number(),
    supplier_name: z.string(),
    supplier_address: z.string().optional(),
    contact_person: z.string().optional(),
    contact_number: z.string().optional(),
});
