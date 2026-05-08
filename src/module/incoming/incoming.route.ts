import { Hono } from "hono";
import { validator } from "../../lib/validators.js";
import { incomingSchema } from "./incoming.schema.js";
import { createIncomingController, getCursorIncomingController, getIncomingController, getPaginatedIncomingController, getSingleIncomingController } from "./incoming.controller.js";



export const incomingRoute = new Hono();



incomingRoute.get('', getPaginatedIncomingController);
incomingRoute.get('/cursor', getCursorIncomingController);
incomingRoute.get('/:incoming_id', getSingleIncomingController);


// incomingRoute.get('', getIncomingController);


incomingRoute.post(
    '', 
    validator('json', incomingSchema),
    createIncomingController
);