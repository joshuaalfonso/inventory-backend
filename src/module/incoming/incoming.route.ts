import { Hono } from "hono";
import { validator } from "../../lib/validators.js";
import { incomingSchema } from "./incoming.schema.js";
import { createIncomingController } from "./incoming.controller.js";



export const incomingRoute = new Hono();



incomingRoute.get('', );


incomingRoute.post(
    '', 
    validator('json', incomingSchema),
    createIncomingController
);