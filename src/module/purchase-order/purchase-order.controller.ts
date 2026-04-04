import type { Context } from "hono"
import { pool } from "../../config/connection.js"


export const getPuchaseOrderController = async (c: Context) => {

    try {

        const [poRows] = await pool.query(
            `
                SELECT 
                    po.purchase_order_id,
                    po.purchase_order_number,
                    po.purchase_order_date,
                    po.purchase_request_number,
                    po.supplier_id,
                    s.supplier_name,
                    po.created_at
                FROM 
                    purchase_order po
                LEFT JOIN
                    supplier s
                ON
                    po.supplier_id = s.supplier_id
            `,
        )


        return c.json(poRows)

    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch PO items."
        }, 500);
    }

}


export const createPurchaseOrderController = async (c: any) => {

    
    const conn = await pool.getConnection()

    try {

        const { 
            purchase_request_number, 
            purchase_order_number, 
            purchase_order_date, 
            supplier_id, 
            purchase_order_item 
        } = c.req.valid('json');

        await conn.beginTransaction();

        const [poResult]: any = await conn.query(
            `INSERT INTO purchase_order (
                purchase_request_number,
                purchase_order_number,
                purchase_order_date,
                supplier_id
            ) VALUES (?, ?, ?, ?)`,
            [
                purchase_request_number,
                purchase_order_number,
                purchase_order_date,
                supplier_id
            ]
        )

        const purchaseOrderId = poResult.insertId;

        if (purchase_order_item && purchase_order_item.length > 0) {

            const values = purchase_order_item.map((item: any) => [
                purchaseOrderId,
                item.item_id,
                item.employee_id,
                item.ordered_quantity,
                item.price
            ])

            await conn.query(
                `INSERT INTO 
                    purchase_order_item
                    (
                        purchase_order_id,
                        item_id,
                        employee_id,
                        ordered_quantity,
                        price
                    ) VALUES ?`,
                [values]
            )

        }

        await conn.commit()


        return c.json({
            success: true,
            message: `'${purchase_order_number}' created successfully.`
        });

    }

    catch (err) {
        console.log(err)
        await conn.rollback();
        return c.json({
            success: false,
            message: `Failed to create PO.`
        }, 500)
    }

    finally {
        conn.release()
    }


}

export const updatePurchaseOrderController = async (c: any) => {


    try {
        return c.json({
            success: true
        })
    }

    catch (err) {
        return c.json({
            success: false
        }, 500)
    }


}