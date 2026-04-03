import { Hono } from "hono";
import { createSupplierController, getSupplierController, softDeleteSupplierController, updateSupplierController } from "./supplier.controller.js";
import { validator } from "../../lib/validators.js";
import { supplierSchema } from "./supplier.schema.js";



export const supplierRoute = new Hono();


supplierRoute.get('', getSupplierController);


supplierRoute.post(
    '',
    validator('json', supplierSchema),
    createSupplierController
)

supplierRoute.put(
    '',
    validator('json', supplierSchema),
    updateSupplierController
)

supplierRoute.delete(
    '/:supplier_id',
    softDeleteSupplierController
)