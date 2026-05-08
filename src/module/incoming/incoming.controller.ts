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

    const query = c.req.query()

    const page = Math.max(parseInt(query.page || '1'), 1)
    const limit = Math.min(Math.max(parseInt(query.limit || '10'), 1), 100)
    const offset = (page - 1) * limit

    const where: string[] = ['i.is_del = 0']
    const params: any[] = []

    for (const key of ALLOWED_FILTERS) {
        const value = query[key]
        if (value) {
            where.push(`po.${key} = ?`)
            params.push(value)
        }
    }

    if (query.search) {
        where.push(`(
            i.sales_invoice_number LIKE ?
            OR po.purchase_order_number LIKE ?
        )`)

        const searchValue = `${query.search}%`
        params.push(searchValue, searchValue)
    }

    const whereClause = where.length
        ? `WHERE ${where.join(' AND ')}`
        : ''

   
    const SORT_MAP: Record<string, string> = {
        created_at: 'i.created_at',
        incoming_date: 'i.incoming_date',
        purchase_order_number: 'po.purchase_order_number',
        sales_invoice_number: 'i.sales_invoice_number',
        incoming_id: 'i.incoming_id'
    }

    const sort = SORT_MAP[query.sort] || 'i.incoming_id'
    // const sort = SORT_MAP[query.sort] || 'i.created_at'
    const order = query.order === 'asc' ? 'ASC' : 'DESC'

    const sql = `
        SELECT 
            i.incoming_id,
            i.incoming_code,
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
            FROM incoming_item
            WHERE is_del = 0
            GROUP BY incoming_id
        ) ii
            ON i.incoming_id = ii.incoming_id
        ${whereClause}
        ORDER BY ${sort} ${order}
        LIMIT ? OFFSET ?
    `

    const [rows]: any = await pool.query(sql, [
        ...params,
        limit,
        offset,
    ])

    const countSql = `
        SELECT COUNT(DISTINCT i.incoming_id) AS total
        FROM incoming i
        LEFT JOIN purchase_order po
            ON i.purchase_order_id = po.purchase_order_id
        ${whereClause}
    `

    const [countResult]: any = await pool.query(countSql, params)
    const total = countResult[0]?.total || 0

    const data = rows.map((row: any) => ({
        incoming_id: row.incoming_id,
        incoming_code: row.incoming_code,
        sales_invoice_number: row.sales_invoice_number,
        purchase_order_number: row.purchase_order_number,
        purchase_order_id: row.purchase_order_id,
        incoming_date: formatISO_PH(row.incoming_date),
        created_at: row.created_at,
        total_received: row.total_received,
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



export const getCursorIncomingController = async (c: Context) => {
    try {

        const query = c.req.query()

        const limit = Math.min(
            Math.max(parseInt(query.limit || '10'), 1),
            100
        )

        const cursor = query.cursor
            ? parseInt(query.cursor)
            : null

        const where: string[] = ['i.is_del = 0']
        const params: any[] = []

        /**
         * FILTERS
         */
        for (const key of ALLOWED_FILTERS) {
            const value = query[key]

            if (value) {
                where.push(`po.${key} = ?`)
                params.push(value)
            }
        }

        /**
         * SEARCH
         */
        if (query.search) {
            where.push(`(
                i.sales_invoice_number LIKE ?
                OR po.purchase_order_number LIKE ?
            )`)

            const searchValue = `${query.search}%`

            params.push(searchValue, searchValue)
        }

        /**
         * SORTING
         *
         * Cursor pagination works BEST with unique stable columns.
         * We use incoming_id as the default.
         */
        const SORT_MAP: Record<string, string> = {
            incoming_id: 'i.incoming_id',
            created_at: 'i.created_at',
            incoming_date: 'i.incoming_date',
            sales_invoice_number: 'i.sales_invoice_number',
            purchase_order_number: 'po.purchase_order_number'
        }

        const sort = SORT_MAP[query.sort] || 'i.incoming_id'

        const order =
            query.order === 'ASC'
                ? 'ASC'
                : 'DESC'

        /**
         * CURSOR CONDITION
         *
         * IMPORTANT:
         * Cursor pagination requires deterministic ordering.
         *
         * Best case:
         * ORDER BY incoming_id DESC
         */
        if (cursor !== null) {
            if (order === 'ASC') {
                where.push(`${sort} > ?`)
            } else {
                where.push(`${sort} < ?`)
            }

            params.push(cursor)
        }

        const whereClause = where.length
            ? `WHERE ${where.join(' AND ')}`
            : ''

        /**
         * MAIN QUERY
         *
         * NO OFFSET
         */
        const sql = `
            SELECT 
                i.incoming_id,
                i.incoming_code,
                i.sales_invoice_number,
                i.incoming_date,
                i.purchase_order_id,
                po.purchase_order_number,
                i.created_at,
                IFNULL(ii.total_received, 0) AS total_received
            FROM 
                incoming i

            LEFT JOIN purchase_order po
                ON i.purchase_order_id = po.purchase_order_id

            LEFT JOIN (
                SELECT 
                    incoming_id,
                    SUM(received_quantity) AS total_received
                FROM incoming_item
                WHERE is_del = 0
                GROUP BY incoming_id
            ) ii
                ON i.incoming_id = ii.incoming_id

            ${whereClause}

            ORDER BY ${sort} ${order}

            LIMIT ?
        `

        const [rows]: any = await pool.query(sql, [
            ...params,
            limit + 1, // fetch one extra row
        ])

        /**
         * HAS MORE
         */
        const hasMore = rows.length > limit

        if (hasMore) {
            rows.pop()
        }

        /**
         * NEXT CURSOR
         */
        const nextCursor =
            rows.length > 0
                ? rows[rows.length - 1].incoming_id
                : null

        /**
         * FORMAT RESPONSE
         */
        const data = rows.map((row: any) => ({
            incoming_id: row.incoming_id,
            sales_invoice_number: row.sales_invoice_number,
            purchase_order_number: row.purchase_order_number,
            purchase_order_id: row.purchase_order_id,
            incoming_date: formatISO_PH(row.incoming_date),
            created_at: row.created_at,
            total_received: row.total_received,
        }))

        return c.json({
            limit,
            hasMore,
            nextCursor,
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

    const today = new Date();

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const datePart = `${yyyy}${mm}${dd}`;


    const conn = await pool.getConnection();

    try {

        const { 
            purchase_order_id, 
            incoming_date,
            incoming_item,
            sales_invoice_number
        } = c.req.valid('json');
        

        await conn.beginTransaction();

        const [lastRow]: any = await pool.query(`
            SELECT 
                incoming_id
            FROM 
                incoming
            ORDER BY 
                incoming_id DESC
            LIMIT 1
        `);

        const nextId = lastRow.length > 0
        ? lastRow[0].incoming_id + 1
        : 1;

        const nextNumber = String(nextId).padStart(4, '0');

        const incomingCode = `INC-${datePart}-${nextNumber}`;

        const [incomingResult]: any = await conn.query(
            `
                INSERT INTO 
                    incoming (
                        incoming_code,
                        purchase_order_id,
                        incoming_date,
                        sales_invoice_number
                    ) 
                VALUES (?, ?, ?, ?)
            `,
            [
                incomingCode,
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


export const getSingleIncomingController = async (c: Context) => {


    const id = (c.req.param('incoming_id') || 0) as number;
    
    if (!id) {
        return c.json({ error: 'Missing required parameter: id' }, 400)
    }

    try {

        const [rows]: any = await pool.query(`
            SELECT 
                i.incoming_id,
                incoming_code,
                i.incoming_date,
                i.purchase_order_id,
                po.purchase_order_number,
                i.sales_invoice_number,
                ii_total.total_received,
                i.created_at

            FROM
                incoming i
            LEFT JOIN
                purchase_order po
            ON
                i.purchase_order_id = po.purchase_order_id
            LEFT JOIN (
                SELECT
                    incoming_id,
                    SUM(received_quantity) AS total_received
                FROM
                    incoming_item 
                WHERE 
                    is_del = 0
                GROUP BY 
                    incoming_id
            ) ii_total
            ON
                i.incoming_id = ii_total.incoming_id
            WHERE
                i.incoming_id = ?
        `, [id]);

        const [items]: any = await pool.query(`
            SELECT
                ii.incoming_item_id,
                ii.incoming_id,
                ii.item_id,
                i.item_name,
                b.brand_name,
                c.category_name,
                it.item_type_name,
                uom.unit_of_measure_name,
                ii.received_quantity
            FROM 
                incoming_item ii
            LEFT JOIN 
                item i
            ON 
                ii.item_id = i.item_id
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
                ii.incoming_id = ?
            AND 
                ii.is_del = 0  
        `, [id]);


        return c.json({
            ...rows[0],
            incoming_item: items
        });

    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch PO item."
        }, 500);
    }



} 