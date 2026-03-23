import type { Context } from "hono";
import { pool } from "../../config/connection.js";
import { idSchema } from "../../shared/schema/id.schema.js";
import type { ItemTypeList } from "./item-type.model.js";




export const getItemTypeController = async (c: Context) => {

    try {

        const [rows] = await pool.query(
            `
                SELECT 
                    * 
                FROM 
                    item_type
                WHERE
                    is_del = ?
                ORDER BY
                    created_at DESC
            `,
            [0]
        );

        const itemTypes = rows as ItemTypeList[];

        return c.json(itemTypes);

    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch item type"
        }, 500);
    }


}



export const createItemTypeController = async (c: any) => {

    const { item_type_name } = c.req.valid('json');

    try {

        const [rows]: any = await pool.query(
            `
                SELECT 
                    item_type_id
                FROM 
                    item_type 
                WHERE 
                    item_type_name = ? AND is_del = ? LIMIT 1
            `,
            [item_type_name, 0]
        );

        if (rows.length > 0) {
            return c.json({
                success: false,
                message: "Item Type already exists."
            }, 409);
        }

        await pool.query(
            `
                INSERT INTO
                    item_type (item_type_name)
                VALUES
                    (?)
            `,
            [item_type_name]
        );

        return c.json({
            success: true,
            message: "Item type created successfully."
        })

    }

    catch (err) {
        console.error(err)
        return c.json({
            success: false,
            message: "Failed to create item type."
        }, 500)
    }


}


export const updateItemTypeController = async (c: any) => {


    try {

        const { item_type_id, item_type_name } = c.req.valid('json');

        const [rows]: any = await pool.query(
            `
                SELECT 
                    item_type_id
                FROM 
                    item_type 
                WHERE 
                    item_type_name = ? AND is_del = ? LIMIT 1
            `,
            [item_type_name, 0]
        );

        if (rows.length > 0) {
            return c.json({
                success: false,
                message: "Item type already exists."
            }, 409);
        }

        await pool.query(
            `
                Update 
                    item_type 
                SET
                    item_type_name = ? 
                WHERE 
                    item_type_id = ?
            `,
            [item_type_name, item_type_id]
        );

        return c.json({
            success: true,
            message: "Item type updated successfully."
        })

    }

    catch (err) {
        console.error(err)
        return c.json({
            success: false,
            message: "Failed to update item type."
        }, 500)
    }

}


export const softDeleteItemTypeController = async (c: any) => {

    try {

        const { item_type_id } = c.req.param();
    
        const result = idSchema.safeParse(item_type_id);

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
                    item_type 
                SET
                    is_del = ? 
                WHERE 
                    item_type_id = ?
            `,
            [1, result.data]
        );

        return c.json({
            success: true,
            message: "Item type deleted successfully."
        })
 
    }

    catch (err) {
        console.error(err)
        return c.json({
            success: false,
            message: "Failed to delete item type."
        }, 500)
    }

}