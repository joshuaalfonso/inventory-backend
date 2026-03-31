import { Hono } from "hono";
import { createEmployeeController, getEmployeeController, softDeleteEmployeeController, updateEmployeeController } from "./employee.controller.js";
import { validator } from "../../lib/validators.js";
import { employeeSchema } from "./employee.schema.js";


export const employeeRoute = new Hono();



employeeRoute.get('', getEmployeeController);

employeeRoute.post('', validator('json', employeeSchema), createEmployeeController);

employeeRoute.put('', validator('json', employeeSchema), updateEmployeeController);

employeeRoute.delete( '/:employee_id', softDeleteEmployeeController);