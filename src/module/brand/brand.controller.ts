import { pool } from "../../config/connection.js";
import type { BrandList } from "./brand.model.js";
import type { Context } from "hono";

export const getBrandController = async (c: Context) => {


    try {

        const [rows] = await pool.query("SELECT * FROM brand");

        const users = rows as BrandList[];

        return c.json(users)

    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch brands"
        }, 500);
    }

}