import type { Context } from "hono"
import { pool } from "../../config/connection.js"
import { formatISO_PH } from "../../shared/util/formatDate.js";
import type { PurchaseOrderList } from "./purchase-order.model.js";


export const getPuchaseOrderController = async (c: Context) => {

    try {

        const [poRows]: any = await pool.query(
            `
                SELECT 
                    po.purchase_order_id,
                    po.purchase_order_number,
                    po.purchase_order_date,
                    po.purchase_request_number,
                    po.supplier_id,
                    s.supplier_name,
                    po.created_at,
                    IFNULL(SUM(poi.ordered_quantity), 0) AS total_quantity,
                    IFNULL(SUM(poi.ordered_quantity * poi.price), 0) AS total_price
                FROM 
                    purchase_order po
                LEFT JOIN
                    purchase_order_item poi
                ON
                    po.purchase_order_id = poi.purchase_order_id
                AND
                    poi.is_del = 0
                LEFT JOIN
                    supplier s
                ON
                    po.supplier_id = s.supplier_id
                GROUP 
                    BY po.purchase_order_id
            `,
        )

        const formatted = poRows.map((item: any) => ({
            ...item,
            purchase_order_date: formatISO_PH(item.purchase_order_date)
        })) as PurchaseOrderList;

        return c.json(formatted)

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


    try {

        const id = c.req.param('purchase_order_id');

        const [rows]: any = await pool.query( 
            `
                SELECT 
                    po.*,
                    s.supplier_name,
                    IFNULL(SUM(poi.ordered_quantity), 0) AS total_quantity,
                    IFNULL(SUM(poi.ordered_quantity * poi.price), 0) AS total_price,
                    CONCAT(
                        '[',
                        IFNULL(
                            GROUP_CONCAT(
                                JSON_OBJECT(
                                    'purchase_order_item_id', poi.purchase_order_item_id,
                                    'purchase_order_id', poi.purchase_order_id,
                                    'item_id', poi.item_id,
                                    'item_name', i.item_name,
                                    'brand_name', b.brand_name,
                                    'category_name', c.category_name,
                                    'item_type_name', it.item_type_name,
                                    'unit_of_measure_name', uom.unit_of_measure_name,
                                    'employee_id', poi.employee_id,
                                    'employee_name', e.employee_name,
                                    'department_name', dept.department_name,
                                    'ordered_quantity', poi.ordered_quantity,
                                    'price', poi.price
                                )
                            ),
                            ''
                        ),
                        ']'
                    ) AS purchase_order_item
                FROM 
                    purchase_order po
                LEFT JOIN 
                    purchase_order_item poi
                ON 
                    po.purchase_order_id = poi.purchase_order_id
                AND poi.is_del = 0
                LEFT JOIN
                    supplier s
                ON
                    po.supplier_id = s.supplier_id
                LEFT JOIN 
                    item i
                ON 
                    poi.item_id = i.item_id
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
                    employee e
                ON 
                    poi.employee_id = e.employee_id
                LEFT JOIN 
                    department dept
                ON 
                    e.department_id = dept.department_id
                WHERE 
                    po.purchase_order_id = ?
                GROUP 
                    BY po.purchase_order_id
            `,
            [id]
        )

        const result = {
            ...rows[0],
            purchase_order_date: formatISO_PH(rows[0].purchase_order_date),
            purchase_order_item: JSON.parse(rows[0].purchase_order_item || '[]')
        } as PurchaseOrderList

        return c.json(result)

    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch PO item."
        }, 500);
    }


}

const ALLOWED_SORT_FIELDS = [
  'purchase_order_id',
  'purchase_order_date',
  'total_price',
  'total_quantity'
]

const ALLOWED_FILTERS = [
  'status',
  'supplier_id'
]

export const getPaginatedPurchaseOrdersController = async (c: Context) => {
  try {
    const query = c.req.query()

    // 📄 Pagination
    const page = parseInt(query.page || '1')
    const limit = parseInt(query.limit || '10')
    const offset = (page - 1) * limit

    // 🔎 Filters
    let where: string[] = ['po.is_del = 0']
    let params: any[] = []

    for (const key of ALLOWED_FILTERS) {
      const value = query[key]

      if (value) {
        where.push(`po.${key} = ?`)
        params.push(value)
      }
    }

    // 🔍 Optional search (supplier name)
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

    // 🔃 Sorting (safe)
    const sort = ALLOWED_SORT_FIELDS.includes(query.sort)
      ? query.sort
      : 'purchase_order_date'

    const order = query.order === 'asc' ? 'ASC' : 'DESC'

    // 🧠 MAIN QUERY (aggregated)
    const sql = `
      SELECT 
        po.purchase_order_id,
        po.purchase_order_number,
        po.purchase_order_date,
        po.purchase_request_number,
        po.supplier_id,
        s.supplier_name,
        po.created_at,

        IFNULL(SUM(poi.ordered_quantity), 0) AS total_quantity,
        IFNULL(SUM(poi.ordered_quantity * poi.price), 0) AS total_price

      FROM purchase_order po

      LEFT JOIN purchase_order_item poi
        ON po.purchase_order_id = poi.purchase_order_id
        AND poi.is_del = 0

      LEFT JOIN supplier s
        ON po.supplier_id = s.supplier_id

      ${whereClause}

      GROUP BY po.purchase_order_id

      ORDER BY ${sort} ${order}

      LIMIT ? OFFSET ?
    `

    const [rows]: any = await pool.query(sql, [...params, limit, offset])

    // 📊 COUNT QUERY (no LIMIT)
    const countSql = `
      SELECT COUNT(DISTINCT po.purchase_order_id) as total
      FROM purchase_order po
      LEFT JOIN supplier s
        ON po.supplier_id = s.supplier_id
      ${whereClause}
    `

    const [countResult]: any = await pool.query(countSql, params)
    const total = countResult[0].total

    // 🎯 Format result
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