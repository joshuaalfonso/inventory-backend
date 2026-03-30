import z from "zod";






export const departmentSchema = z.object({
  department_id: z.number().optional(),
  department_name: z.string(),
});