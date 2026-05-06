import type { Context } from "hono"
import { pool } from "../../config/connection.js"
import { formatISO_PH } from "../../shared/util/formatDate.js";
import { getAllPurchaseOrder, getPendingPurchaseOrder, getSinglePendingPurchaseOrder, getSinglePurchaseOrder } from "./purchase-order.service.js";


export const getPuchaseOrderController = async (c: Context) => {

    try {

        const data = await getAllPurchaseOrder();

        return c.json(data)

    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch PO items."
        }, 500);
    }

}


export const getSinglePurchaseOrderController = async (c: Context) => {


    const id = (c.req.param('purchase_order_id') || 0) as number;

    if (!id) {
        return c.json({ error: 'Missing required parameter: id' }, 400)
    }


    try {

        const data = await getSinglePurchaseOrder(id);

        return c.json(data)

    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch PO item."
        }, 500);
    }


}

export const getPendingPurchaseOrderController = async (c: Context) => {

    try {
        const data = await getPendingPurchaseOrder();
        return c.json(data)
    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to load data."
        }, 500);
    }

}

export const getSinglePendingPurchaseOrderController = async (c: Context) => {


    const id = (c.req.param('purchase_order_id') || 0) as number;

    if (!id) {
        return c.json({ error: 'Missing required parameter: id' }, 400)
    }

    try {

        const data = await getSinglePendingPurchaseOrder(id);
        return c.json(data)
    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to load data."
        }, 500);
    }

}

const ALLOWED_SORT_FIELDS = [
  'purchase_order_id',
  'purchase_order_date',
  'purchase_order_number',
  'purchase_request_number',
  'supplier_name',
  'total_price',
  'total_quantity',
  'created_at'
]

const ALLOWED_FILTERS = [
  'status',
  'supplier_id'
]

export const getPaginatedPurchaseOrdersController = async (c: Context) => {
    try {
        const query = c.req.query();

        console.log(query)

        // pagination
        const page = parseInt(query.page || '1')
        const limit = parseInt(query.limit || '10')
        const offset = (page - 1) * limit

        // filters
        let where: string[] = ['po.is_del = 0']
        let params: any[] = []

        for (const key of ALLOWED_FILTERS) {
        const value = query[key]
            
        if (value) {
            where.push(`po.${key} = ?`)
            params.push(value)
        }

        }

        // optional search (supplier name)
        if (query.supplier_name) {
            where.push(`s.supplier_name LIKE ?`)
            params.push(`%${query.supplier_name}%`)
        }

        if (query.search) {
            where.push(`
                (
                    s.supplier_name LIKE ?
                    OR po.purchase_order_number LIKE ?
                    OR po.purchase_request_number LIKE ? 
                )
            `)

            params.push(
                `%${query.search}%`, 
                `%${query.search}%`,
                `%${query.search}%`
            ) 
        }

        const whereClause = `WHERE ${where.join(' AND ')}`

        // sorting (safe)
        const sort = ALLOWED_SORT_FIELDS.includes(query.sort)
        ? query.sort
        : 'purchase_order_date'

        const order = query.order === 'asc' ? 'ASC' : 'DESC'

        // MAIN QUERY (aggregated)
        const sql = `
            SELECT 
                po.purchase_order_id,
                po.purchase_order_number,
                po.purchase_order_date, 
                po.purchase_request_number,
                po.supplier_id,
                s.supplier_name,
                po.status,
                po.created_at,

                IFNULL(poi.total_quantity, 0) AS total_quantity,
                IFNULL(poi.total_price, 0) AS total_price,
                IFNULL(ii.total_delivered, 0) AS total_delivered

            FROM purchase_order po

            LEFT JOIN (
                SELECT 
                    purchase_order_id,
                    SUM(ordered_quantity) AS total_quantity,
                    SUM(ordered_quantity * price) AS total_price
                FROM purchase_order_item
                WHERE is_del = 0
                GROUP BY purchase_order_id
            ) poi ON po.purchase_order_id = poi.purchase_order_id
            
            LEFT JOIN (
                SELECT 
                    poi.purchase_order_id,
                    SUM(ii.received_quantity) AS total_delivered
                FROM incoming_item ii
                JOIN purchase_order_item poi 
                    ON ii.purchase_order_item_id = poi.purchase_order_item_id
                WHERE poi.is_del = 0
                GROUP BY poi.purchase_order_id
            ) ii ON po.purchase_order_id = ii.purchase_order_id

            LEFT JOIN supplier s
                ON po.supplier_id = s.supplier_id

            ${whereClause}

            GROUP BY po.purchase_order_id

            ORDER BY ${sort} ${order}

            LIMIT ? OFFSET ?
        `

        const [rows]: any = await pool.query(sql, [...params, limit, offset])

        // COUNT QUERY (no LIMIT)
        const countSql = `
            SELECT COUNT(DISTINCT po.purchase_order_id) as total
            FROM purchase_order po
            LEFT JOIN supplier s
                ON po.supplier_id = s.supplier_id
            ${whereClause}
        `

        const [countResult]: any = await pool.query(countSql, params)
        const total = countResult[0].total

        // format result
        const data = rows.map((row: any) => ({
            ...row,
            purchase_order_date: formatISO_PH(row.purchase_order_date),
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
        message: 'Failed to fetch purchase orders.'
        }, 500)
    }
} 


export const createPurchaseOrderController = async (c: any) => {

    
    const conn = await pool.getConnection();

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


    const conn = await pool.getConnection()

    try {

        const { 
            purchase_order_id,
            purchase_request_number, 
            purchase_order_number, 
            purchase_order_date, 
            supplier_id, 
            purchase_order_item 
        } = c.req.valid('json');

        await conn.beginTransaction();

        await conn.query(
            `
                UPDATE 
                    purchase_order 
                SET
                    purchase_request_number = ?,
                    purchase_order_number = ?,
                    purchase_order_date = ?,
                    supplier_id = ?
                WHERE 
                    purchase_order_id = ?
            `,
            [
                purchase_request_number,
                purchase_order_number,
                purchase_order_date,
                supplier_id,
                purchase_order_id
            ]
        );

        await conn.query(
            `
                UPDATE 
                    purchase_order_item
                SET
                    is_del = 1
                WHERE 
                    purchase_order_id = ?
            `,
            [purchase_order_id]
        );

        if (purchase_order_item && purchase_order_item.length > 0) {

            for (const item of purchase_order_item) {

                if (item.purchase_order_id) {
                    await conn.query(
                        `
                            UPDATE 
                                purchase_order_item 
                            SET
                                item_id = ?,
                                employee_id = ?,
                                ordered_quantity = ?,
                                price = ?,
                                is_del = 0
                            WHERE 
                                purchase_order_item_id = ? AND 
                                purchase_order_id = ?
                        `,
                        [
                            item.item_id,
                            item.employee_id,
                            item.ordered_quantity,
                            item.price,
                            item.purchase_order_item_id,
                            purchase_order_id
                        ]
                    );
                } else {
                    await conn.query(
                        `
                            INSERT INTO 
                                purchase_order_item (
                                    purchase_order_id,
                                    item_id,
                                    employee_id,
                                    ordered_quantity,
                                    price,
                                    is_del
                                ) VALUES (?, ?, ?, ?, ?, 0
                            )
                        `,
                        [
                            purchase_order_id,
                            item.item_id,
                            item.employee_id,
                            item.ordered_quantity,
                            item.price
                        ]
                    );
                }
            }

        }

        await conn.commit();

        return c.json({
            success: true,
            message: `'${purchase_order_number}' updated successfully.`
        });

    } catch (err) {

        console.log(err);
        await conn.rollback();

        return c.json({
            success: false,
            message: `Failed to update PO.`
        }, 500);

    } finally {
        conn.release();
    }


}



export const updatePurchaseOrderStatusController = async (c: any) => {

    try {

        const { 
            purchase_order_id,
            status,
        } = c.req.valid('json');

        await pool.query(
            `
                UPDATE 
                    purchase_order 
                SET
                    status = ?
                WHERE 
                    purchase_order_id = ?
            `,
            [
                status,
                purchase_order_id
            ]
        );

        return c.json({
            success: true,
            message: `Updated successfully`
        });

    } catch (err) {

        console.log(err);
        return c.json({
            success: false,
            message: `Failed to update`
        }, 500);

    } 


}