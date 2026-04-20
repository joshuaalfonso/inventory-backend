import z from "zod";
export const idSchema = z.string().regex(/^\d+$/, "ID must be a number");
