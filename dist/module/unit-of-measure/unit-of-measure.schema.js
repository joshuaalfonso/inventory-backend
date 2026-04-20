import z from "zod";
export const unitOfMeasureSchema = z.object({
    unit_of_measure_id: z.number(),
    unit_of_measure_name: z.string(),
});
