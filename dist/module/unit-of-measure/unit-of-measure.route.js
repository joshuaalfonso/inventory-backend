import { Hono } from "hono";
import { createUnitOfMeasureController, getUnitOfMeasureController, softDeleteUnifOfMeasureController, updateUnitOfMeasureController } from "./unit-of-measure.controller.js";
import { validator } from "../../lib/validators.js";
import { unitOfMeasureSchema } from "./unit-of-measure.schema.js";
export const unitOfMeasureRoute = new Hono();
unitOfMeasureRoute.get('', getUnitOfMeasureController);
unitOfMeasureRoute.post('', validator('json', unitOfMeasureSchema), createUnitOfMeasureController);
unitOfMeasureRoute.put('', validator('json', unitOfMeasureSchema), updateUnitOfMeasureController);
unitOfMeasureRoute.delete('/:unit_of_measure_id', softDeleteUnifOfMeasureController);
