import { pool } from "../../config/connection.js";
import type { InventoryConsumableList } from "./inventory-consumable.model.js";







export const getInventoryConsumableController = async (c: any) => {


    try {
        
        const [rows] = await pool.query(
            `
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
                    COALESCE(cs.quantity, 0) AS quantity,
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
                LEFT JOIN
                    consumable_stock cs
                ON
                    i.item_id = cs.item_id

                WHERE
                    i.is_del = ?
                    AND it.item_type_name = ?
                ORDER BY
                    i.item_name DESC
            `,
            [0, 'Consumable']
        );

        const items = rows as InventoryConsumableList[];

        return c.json(items)
 
    } catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch items"
        }, 500);
    }

}

