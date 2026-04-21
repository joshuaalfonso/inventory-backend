import { Hono } from "hono";
import { getInventoryConsumableController } from "./inventory-consumable.controller.js";






export const inventoryConsumableRoute = new Hono();



inventoryConsumableRoute.get('', getInventoryConsumableController);