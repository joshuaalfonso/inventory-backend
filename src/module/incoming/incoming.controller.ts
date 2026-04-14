import type { Context } from "hono";
import { pool } from "../../config/connection.js";







export const getIncomingController = async (c: Context) => {

    return c.json({
        success: true
    })


}



export const createIncomingController = async (c: any) => {


    const conn = await pool.getConnection();

    try {

        const { 
            purchase_order_id, 
            incoming_date,
            incoming_item
        } = c.req.valid('json');

        await conn.beginTransaction();

        const [incomingResult]: any = await conn.query(
            `
                INSERT INTO 
                    incoming (
                        purchase_order_id,
                        incoming_date
                    ) 
                VALUES (?, ?)
            `,
            [
                purchase_order_id,
                incoming_date
            ]
        );

        const incomingId = incomingResult.insertId;

        if (incoming_item && incoming_item.length > 0) {

            for (const item of incoming_item) {

                if (item.received_quantity > item.ordered_quantity) {
                    throw new Error("Received quantity cannot exceed ordered quantity")
                }

                // Insert incoming_item
                await conn.query(
                    `
                        INSERT INTO 
                            incoming_item (
                                incoming_id,
                                purchase_order_item_id,
                                item_id,
                                received_quantity
                            )
                        VALUES 
                            (?, ?, ?, ?)
                    `,
                    [
                        incomingId,
                        item.purchase_order_item_id,
                        item.item_id,
                        item.received_quantity 
                    ]
                );

                await conn.query(
                    `
                        INSERT INTO 
                            consumable_stock (item_id, quantity)
                        VALUES 
                            (?, ?)
                        ON DUPLICATE KEY UPDATE
                            quantity = quantity + VALUES(quantity)
                    `,
                    [item.item_id, item.received_quantity]
                );

            }

            await conn.commit();

            return c.json({
                success: true,
                message: `Created successfully.`
            });

        }

    }

    catch (err) {
        console.log(err)
        await conn.rollback();
        return c.json({
            success: false,
            message: `Failed to create.`
        }, 500)
    }

    finally {
        conn.release();
    }



}