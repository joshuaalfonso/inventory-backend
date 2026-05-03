import { Hono } from "hono";
import { getInventoryAssetController } from "./inventory-asset.controller.js";








export const inventoryAssetRoute = new Hono();



inventoryAssetRoute.get('', getInventoryAssetController);