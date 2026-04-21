import type { Context } from "hono";
import { pool } from "../../config/connection.js";
import { generateAssetTag } from "./incoming.service.js";







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
                const [incomingItemResult]:any =  await conn.query(
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

                // await conn.query(
                //     `
                //         INSERT INTO 
                //             consumable_stock (item_id, quantity)
                //         VALUES 
                //             (?, ?)
                //         ON DUPLICATE KEY UPDATE
                //             quantity = quantity + VALUES(quantity)
                //     `,
                //     [item.item_id, item.received_quantity]
                // );

                //  consumable
                if (item.item_type_name == "Consumable") {

                    await conn.query(
                        `
                            INSERT INTO 
                                consumable_stock (item_id, quantity)
                            VALUES 
                                (?, ?)
                            ON 
                                DUPLICATE KEY 
                            UPDATE
                                quantity = quantity + VALUES(quantity)
                    `, [item.item_id, item.received_quantity]);

                }

                // asset
                if (item.item_type_name == "Asset") {

                    if (!item.asset_item) {
                        throw new Error("Asset is empty");
                    }

                    for (const asset of item.asset_item) {

                        const serial = asset.serial_number?.trim();

                        const cleanSerial = serial === "" ? null : serial;

                        if (cleanSerial) {

                            const [rows]: any = await conn.query(`
                                SELECT asset_id FROM asset WHERE serial_number = ?
                            `, [cleanSerial]);

                            if (rows.length > 0) {
                                throw new Error(`Duplicate serial number: ${cleanSerial}`);
                            }

                        }

                        // generate asset tag
                        const assetTag = await generateAssetTag(conn);

                        await conn.query(`
                            INSERT INTO asset (
                                asset_tag,
                                incoming_item_id,
                                item_id,
                                serial_number
                            )
                            VALUES (?, ?, ?, ?) 
                        `, [
                            assetTag,
                            incomingItemResult.insertId,
                            item.item_id,
                            cleanSerial,
                        ]);
                        
                    }

                }

            }

            await conn.commit();

            return c.json({
                success: true,
                message: `Created successfully.`
            });

        }

    }

    catch (err: any) {
        // console.log(err) 
        await conn.rollback();
        return c.json({
            success: false,
            message: err.message || `Failed to create.`,
        }, 500)
    }

    finally {
        conn.release();
    }



}