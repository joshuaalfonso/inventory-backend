import { Hono } from "hono";
import { departmentSchema } from "./department.schema.js";
import { validator } from "../../lib/validators.js";
import { createDepartmentController, getDepartmentController, softDeleteDepartmentController, updateDepartmentController } from "./department.controller.js";


export const departmentRoute = new Hono();


departmentRoute.get('', getDepartmentController);


departmentRoute.post(
    '', 
    validator('json', departmentSchema),
    createDepartmentController
)

departmentRoute.put(
    '', 
    validator('json', departmentSchema),
    updateDepartmentController
)

departmentRoute.delete(
    '/:department_id',
    softDeleteDepartmentController
)