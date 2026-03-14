import { Hono } from "hono";
import { getBrandController } from "./brand.controller.js";



export const brandRoute = new Hono();



brandRoute.get('', getBrandController);