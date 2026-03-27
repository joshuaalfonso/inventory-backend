import type { Context } from "hono";
import { pool } from "../../config/connection.js";
import { idSchema } from "../../shared/schema/id.schema.js";
import type { UnitOfMeasureList } from "./unit-of-measure.model.js";




export const getUnitOfMeasureController = async (c: Context) => {

    try {

        const [rows] = await pool.query(
            `
                SELECT 
                    * 
                FROM 
                    unit_of_measure
                WHERE
                    is_del = ?
                ORDER BY
                    created_at DESC
            `,
            [0]
        );

        const itemTypes = rows as UnitOfMeasureList[];

        return c.json(itemTypes);

    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch unit of measure"
        }, 500);
    }


}



export const createUnitOfMeasureController = async (c: any) => {

    const { unit_of_measure_name } = c.req.valid('json');

    try {

        const [rows]: any = await pool.query(
            `
                SELECT 
                    unit_of_measure_id
                FROM 
                    unit_of_measure 
                WHERE 
                    unit_of_measure_name = ? AND is_del = ? LIMIT 1
            `,
            [unit_of_measure_name, 0]
        );

        if (rows.length > 0) {
            return c.json({
                success: false,
                message: `'${unit_of_measure_name}' already exists.`
            }, 409);
        }

        await pool.query(
            `
                INSERT INTO
                    unit_of_measure (unit_of_measure_name)
                VALUES
                    (?) 
            `, 
            [unit_of_measure_name] 
        );

        return c.json({
            success: true,
            message: `'${unit_of_measure_name}' created successfully.`
        })

    }

    catch (err) {
        console.error(err)
        return c.json({
            success: false,
            message: `Failed to create ${unit_of_measure_name}.`
        }, 500)
    }


}


export const updateUnitOfMeasureController = async (c: any) => {


    try {

        const { unit_of_measure_id, unit_of_measure_name } = c.req.valid('json');

        const [rows]: any = await pool.query(
            `
                SELECT 
                    item_type_id
                FROM 
                    item_type 
                WHERE 
                    item_type_name = ? AND is_del = ? LIMIT 1
            `,
            [unit_of_measure_name, 0]
        );

        if (rows.length > 0) {
            return c.json({
                success: false,
                message: `${unit_of_measure_name} already exists.`
            }, 409);
        }

        await pool.query(
            `
                Update 
                    unit_of_measure 
                SET
                    unit_of_measure_name = ? 
                WHERE 
                    unit_of_measure_id = ?
            `,
            [unit_of_measure_name, unit_of_measure_id]
        );

        return c.json({
            success: true,
            message: `${unit_of_measure_name} updated successfully.`
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


export const softDeleteUnifOfMeasureController = async (c: any) => {

    try {

        const { unit_of_measure_id } = c.req.param();
    
        const result = idSchema.safeParse(unit_of_measure_id);

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
                    unit_of_measure 
                SET
                    is_del = ? 
                WHERE 
                    unit_of_measure_id = ?
            `,
            [1, result.data]
        );

        return c.json({
            success: true,
            message: `${unit_of_measure_id} deleted successfully.`
        })
 
    }

    catch (err) {
        console.error(err)
        return c.json({
            success: false,
            message: `Failed to delete item.`
        }, 500)
    }

}