import { Hono } from "hono";
import { validator } from "../../lib/validators.js";
import { incomingSchema } from "./incoming.schema.js";
import { createIncomingController, getIncomingController, getPaginatedIncomingController } from "./incoming.controller.js";



export const incomingRoute = new Hono();



incomingRoute.get('', getPaginatedIncomingController);

// incomingRoute.get('', getIncomingController);


incomingRoute.post(
    '', 
    validator('json', incomingSchema),
    createIncomingController
);