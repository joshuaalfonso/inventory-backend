import { pool } from "../../config/connection.js";
import { idSchema } from "../../shared/schema/id.schema.js";
import type { BrandList } from "./brand.model.js";
import type { Context } from "hono";

export const getBrandController = async (c: Context) => {


    try {

        const [rows] = await pool.query(
            `
                SELECT 
                    * 
                FROM 
                    brand
                WHERE
                    is_del = ?
            `,
            [0]
        );

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


export const createBrandController = async (c: any) => {

    const { brand_name } = c.req.valid('json');

    try {

        const [rows]: any = await pool.query(
            `
                SELECT 
                    brand_id
                FROM 
                    brand 
                WHERE 
                    brand_name = ? LIMIT 1
            `,
            [brand_name]
        );

        if (rows.length > 0) {
            return c.json({
                success: false,
                message: "Brand already exists."
            }, 409);
        }

        await pool.query(
            `
                INSERT INTO
                    brand (brand_name)
                VALUES
                    (?)
            `,
            [brand_name]
        );

        return c.json({
            success: true,
            message: "Brand created successfully."
        })

    }

    catch (err) {
        console.error(err)
        c.json({
            success: false,
            message: "Failed to create brand."
        }, 500)
    }

}


export const updateBrandController = async (c: any) => {

    const { brand_id, brand_name } = c.req.valid('json');

    try {

        const [rows]: any = await pool.query(
            `
                SELECT 
                    brand_id
                FROM 
                    brand 
                WHERE 
                    brand_name = ? LIMIT 1
            `,
            [brand_name]
        );

        if (rows.length > 0) {
            return c.json({
                success: false,
                message: "Brand already exists."
            }, 409);
        }

        await pool.query(
            `
                Update 
                    brand 
                SET
                    brand_name = ? 
                WHERE 
                    brand_id = ?
            `,
            [brand_name, brand_id]
        );

        return c.json({
            success: true,
            message: "Brand updated successfully."
        })

    }

    catch (err) {
        console.error(err)
        c.json({
            success: false,
            message: "Failed to update brand."
        }, 500)
    }

}


export const softDeleteBrandController = async (c: any) => {

    try {

        const { brand_id } = c.req.param();
    
        const result = idSchema.safeParse(brand_id);

        if (!result.success) {
            return c.json({ 
                success: false,
                error: 'Missing field is required'
            }, 400);
        }

        // return c.json({ userId: result.data });

        await pool.query(
            `
                Update 
                    brand 
                SET
                    is_del = ? 
                WHERE 
                    brand_id = ?
            `,
            [1, result.data]
        );

        return c.json({
            success: true,
            message: "Brand deleted successfully."
        })

    }

    catch (err) {
        console.error(err)
        c.json({
            success: false,
            message: "Failed to delete brand."
        }, 500)
    }

}
