import { pool } from "../../config/connection.js";
import type { Asset } from "./inventory-asset.model.js";






export const getInventoryAssetController = async (c: any) => {



    try {
            
        const [rows] = await pool.query(
            `
                SELECT 
                    a.serial_number,
                    a.asset_tag,
                    a.incoming_item_id,
                    ini.incoming_id,
                    a.status_id,
                    a.condition,
                    a.warranty_expiry,
                    a.assigned_to,
                    ast.name as status,
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
                    a.created_at
                FROM 
                    asset a
                LEFT JOIN
                    incoming_item ini
                ON
                    a.incoming_item_id = ini.incoming_item_id
                LEFT JOIN
                    item i
                ON
                    i.item_id = a.item_id
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
                    asset_status ast
                ON 
                    a.status_id = ast.asset_status_id

                WHERE
                    i.is_del = 0
                ORDER BY
                    i.item_name DESC
            `
        );

        const items = rows as Asset[];

        return c.json(items)
    
    } catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch asset"
        }, 500);
    }


}