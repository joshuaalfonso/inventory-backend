import { pool } from "../../config/connection.js";
import { idSchema } from "../../shared/schema/id.schema.js";
export const getItemController = async (c) => {
    try {
        const [rows] = await pool.query(`
                SELECT 
                    i.item_id,
                    i.item_name,
                    i.brand_id,
                    b.brand_name,
                    i.category_id,
                    c.category_name,
                    i.item_type_id,
                    it.item_type_name,
                    i.unit_of_measure_id,
                    uom.unit_of_measure_name,
                    i.created_at
                FROM 
                    item i
                LEFT JOIN 
                    brand b
                ON
                    i.brand_id = b.brand_id
                LEFT JOIN 
                    category c
                ON
                    i.category_id = c.category_id
                LEFT JOIN 
                    item_type it
                ON
                    i.item_type_id = it.item_type_id
                LEFT JOIN 
                    unit_of_measure uom
                ON
                    i.unit_of_measure_id = uom.unit_of_measure_id

                WHERE
                    i.is_del = ?
                ORDER BY
                    i.created_at DESC
            `, [0]);
        const items = rows;
        return c.json(items);
    }
    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch items"
        }, 500);
    }
};
export const createItemController = async (c) => {
    const { item_name, brand_id, category_id, item_type_id, unit_of_measure_id } = c.req.valid('json');
    try {
        const [rows] = await pool.query(`
                SELECT 
                    item_id
                FROM 
                    item 
                WHERE 
                    item_name = ? AND is_del = ? LIMIT 1
            `, [item_name, 0]);
        if (rows.length > 0) {
            return c.json({
                success: false,
                message: `'${item_name}' already exists.`
            }, 409);
        }
        await pool.query(`
                INSERT INTO
                    item (item_name, brand_id, category_id, item_type_id, unit_of_measure_id)
                VALUES
                    (?, ?, ?, ?, ?)
            `, [item_name, brand_id, category_id, item_type_id, unit_of_measure_id]);
        return c.json({
            success: true,
            message: "Item created successfully."
        });
    }
    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to create item."
        }, 500);
    }
};
export const updateItemController = async (c) => {
    const { item_id, item_name, brand_id, category_id, item_type_id, unit_of_measure_id } = c.req.valid('json');
    try {
        // const [rows]: any = await pool.query(
        //     `
        //         SELECT 
        //             item_id
        //         FROM 
        //             item 
        //         WHERE 
        //             item_name = ? AND is_del = ? LIMIT 1
        //     `,
        //     [item_name, 0]
        // );
        // if (rows.length > 0) {
        //     return c.json({
        //         success: false,
        //         message: `'${item_name}' already exists.`
        //     }, 409);
        // }
        await pool.query(`
                UPDATE 
                    item
                SET 
                    item_name = ?, 
                    brand_id = ?, 
                    category_id = ?, 
                    item_type_id = ?, 
                    unit_of_measure_id = ?
                WHERE 
                    item_id = ?
            `, [item_name, brand_id, category_id, item_type_id, unit_of_measure_id, item_id]);
        return c.json({
            success: true,
            message: "Item updated successfully."
        });
    }
    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to update item."
        }, 500);
    }
};
export const softDeleteItemController = async (c) => {
    try {
        const { item_id } = c.req.param();
        const result = idSchema.safeParse(item_id);
        if (!result.success) {
            return c.json({
                success: false,
                error: 'Missing field is required'
            }, 400);
        }
        // return c.json({ userId: result.data });
        await pool.query(`
                Update 
                    item 
                SET
                    is_del = ? 
                WHERE 
                    item_id = ?
            `, [1, result.data]);
        return c.json({
            success: true,
            message: "Item deleted successfully."
        });
    }
    catch (err) {
        console.error(err);
        return c.json({
            success: false,
            message: "Failed to delete item."
        }, 500);
    }
};
