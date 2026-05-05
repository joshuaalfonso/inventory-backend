import type { Context } from "hono";
import { pool } from "../../config/connection.js";
import { generateAssetTag } from "./incoming.service.js";
import type { Incoming } from "./incoming.model.js";
import { formatISO_PH } from "../../shared/util/formatDate.js";



export const getIncomingController = async (c: Context) => {

    try {
        
            const [rows] = await pool.query(
                `
                    SELECT 
                        *
                    FROM 
                        incoming
                    ORDER BY
                        incoming.created_at DESC;
                `,
                [0]
            );
    
            const incomings = rows as Incoming[];
    
            return c.json(incomings)
    }


    catch (err) {
        console.log(err)
        return c.json({
            success: false,
            message: 'Failed to load incoming'
        })
    }


}


const ALLOWED_SORT_FIELDS = [
  'purchase_order_number',
  'incoming_date',
  'sales_invoice_number',
  'total_received',
  'created_at'
]

const ALLOWED_FILTERS = [
  'purchase_order_id'
]

export const getPaginatedIncomingController = async (c: Context) => {
    try {
        const query = c.req.query();

        console.log(query)

        // pagination
        const page = parseInt(query.page || '1')
        const limit = parseInt(query.limit || '10')
        const offset = (page - 1) * limit

        // filters
        let where: string[] = ['i.is_del = 0']
        let params: any[] = []

        for (const key of ALLOWED_FILTERS) {
        const value = query[key]
            
        if (value) {
            where.push(`po.${key} = ?`)
            params.push(value)
        }

        }

        if (query.search) {
            where.push(`
                (
                    i.sales_invoice_number LIKE ?
                    OR po.purchase_order_number LIKE ?
                )
            `)

            params.push(
                `%${query.search}%`, 
                `%${query.search}%`
            ) 
        }

        const whereClause = `WHERE ${where.join(' AND ')}`

        // sorting (safe)
        const sort = ALLOWED_SORT_FIELDS.includes(query.sort)
        ? query.sort
        : 'created_at'

        const order = query.order === 'asc' ? 'ASC' : 'DESC'

        // main query (aggregated)

        const sql = `
            SELECT 
                i.incoming_id,
                i.sales_invoice_number,
                i.incoming_date,
                i.purchase_order_id, 
                po.purchase_order_number,
                i.created_at,

                IFNULL(ii.total_received, 0) AS total_received

            FROM incoming i

            LEFT JOIN purchase_order po
                ON i.purchase_order_id = po.purchase_order_id

            LEFT JOIN (
                SELECT 
                    incoming_id,
                    SUM(received_quantity) AS total_received
                FROM 
                    incoming_item
                WHERE 
                    is_del = 0
                GROUP 
                    BY incoming_id
            ) ii ON i.incoming_id = ii.incoming_id

            ${whereClause}

            GROUP BY i.incoming_id

            ORDER BY ${sort} ${order}

            LIMIT ? OFFSET ?
            `

            const [rows]: any = await pool.query(sql, [...params, limit, offset])

            // COUNT QUERY (no LIMIT)
            const countSql = `
                SELECT 
                    COUNT(DISTINCT i.incoming_id) as total
                FROM 
                    incoming i
                LEFT JOIN 
                    purchase_order po
                ON 
                    i.purchase_order_id = po.purchase_order_id
                ${whereClause}
        `

        const [countResult]: any = await pool.query(countSql, params)
        const total = countResult[0].total

        // format result
        const data = rows.map((row: any) => ({
            ...row,
            incoming_date: formatISO_PH(row.incoming_date),
        }))

        return c.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data,
        })

    } catch (err) {
        console.error(err)
        return c.json({
        success: false,
        message: 'Failed to fetch incoming'
        }, 500)
    }
} 



export const createIncomingController = async (c: any) => {


    const conn = await pool.getConnection();

    try {

        const { 
            purchase_order_id, 
            incoming_date,
            incoming_item,
            sales_invoice_number
        } = c.req.valid('json');

        await conn.beginTransaction();

        const [incomingResult]: any = await conn.query(
            `
                INSERT INTO 
                    incoming (
                        purchase_order_id,
                        incoming_date,
                        sales_invoice_number
                    ) 
                VALUES (?, ?, ?)
            `,
            [
                purchase_order_id,
                incoming_date,
                sales_invoice_number
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