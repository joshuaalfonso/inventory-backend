import z from "zod";
export const employeeSchema = z.object({
    employee_id: z.number(),
    employee_name: z.string().min(8, "Name is required"),
    department_id: z.number(),
    email: z.string().email(),
});
