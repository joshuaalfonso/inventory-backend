import { pool } from "../../config/connection.js";
import { formatISO_PH } from "../../shared/util/formatDate.js";
import type { PurchaseOrderList } from "./purchase-order.model.js";



export const getAllPurchaseOrder = async () => {


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
        purchase_order_date: formatISO_PH(item.purchase_order_date),
        // purchase_order_item: JSON.parse(poRows[0].purchase_order_item || '[]')
    })) as PurchaseOrderList;

    return formatted


}

export const getSinglePurchaseOrder = async (id: number) => {
    const [rows]: any = await pool.query(
        `
            SELECT 
                po.purchase_order_id,
                po.purchase_order_number,
                po.purchase_order_date, 
                po.purchase_request_number,
                po.supplier_id,
                s.supplier_name,
                po.status,
                po.created_at,

                COALESCE(poi_total.total_price, 0) + 0 AS total_price,
                COALESCE(poi_total.total_quantity, 0) + 0 AS total_quantity,
                COALESCE(ii.total_delivered, 0) + 0 AS total_delivered,

                IFNULL(
                    CONCAT(
                        '[',
                        GROUP_CONCAT(
                            DISTINCT JSON_OBJECT(
                                'purchase_order_item_id', poi_item.purchase_order_item_id,
                                'purchase_order_id', poi_item.purchase_order_id,
                                'item_id', poi_item.item_id,

                                'item_name', i.item_name,
                                'brand_name', b.brand_name,
                                'category_name', c.category_name,
                                'item_type_name', it.item_type_name,
                                'unit_of_measure_name', uom.unit_of_measure_name,

                                'employee_id', poi_item.employee_id,
                                'employee_name', e.employee_name,
                                'department_name', dept.department_name,

                                'price', poi_item.price,
                                'ordered_quantity', poi_item.ordered_quantity,
                                'delivered_quantity', poi_item.total_received,

                                'remaining_quantity',
                                    (poi_item.ordered_quantity - poi_item.total_received)
                            )
                            SEPARATOR ','
                        ),
                        ']'
                    ),
                    '[]'
                ) AS purchase_order_item

            FROM 
                purchase_order po

            -- ITEM LEVEL (SAFE AGG)

            LEFT JOIN (
                SELECT 
                    poi.purchase_order_item_id,
                    poi.purchase_order_id,
                    poi.item_id,
                    poi.employee_id,
                    poi.ordered_quantity,
                    poi.price,
                    IFNULL(SUM(ii.received_quantity), 0) AS total_received
                FROM 
                    purchase_order_item poi
                LEFT JOIN 
                    incoming_item ii 
                ON 
                    ii.purchase_order_item_id = poi.purchase_order_item_id
                    AND ii.is_del = 0
                WHERE 
                    poi.is_del = 0
                GROUP BY 
                    poi.purchase_order_item_id,
                    poi.purchase_order_id,
                    poi.item_id,
                    poi.employee_id,
                    poi.ordered_quantity,
                    poi.price
            ) poi_item 
            ON 
                po.purchase_order_id = poi_item.purchase_order_id

            -- TOTAL ORDERED

            LEFT JOIN (
                SELECT 
                    purchase_order_id,
                    SUM(ordered_quantity) AS total_quantity,
                    SUM(price) AS total_price
                FROM 
                    purchase_order_item
                WHERE 
                    is_del = 0
                GROUP BY 
                    purchase_order_id
            ) poi_total 
            ON 
                po.purchase_order_id = poi_total.purchase_order_id

            -- TOTAL DELIVERED

            LEFT JOIN (
                SELECT 
                    poi.purchase_order_id,
                    SUM(ii.received_quantity) AS total_delivered
                FROM 
                    incoming_item ii
                JOIN 
                    purchase_order_item poi 
                ON 
                    ii.purchase_order_item_id = poi.purchase_order_item_id
                WHERE 
                    ii.is_del = 0
                    AND poi.is_del = 0
                GROUP BY 
                    poi.purchase_order_id
            ) ii 
            ON 
                po.purchase_order_id = ii.purchase_order_id

            -- MASTER DATA

            LEFT JOIN supplier s 
                ON po.supplier_id = s.supplier_id

            LEFT JOIN item i 
                ON poi_item.item_id = i.item_id

            LEFT JOIN brand b 
                ON i.brand_id = b.brand_id

            LEFT JOIN category c 
                ON i.category_id = c.category_id

            LEFT JOIN item_type it 
                ON i.item_type_id = it.item_type_id

            LEFT JOIN unit_of_measure uom 
                ON i.unit_of_measure_id = uom.unit_of_measure_id

            LEFT JOIN employee e 
                ON poi_item.employee_id = e.employee_id

            LEFT JOIN 
                department dept 
            ON 
                e.department_id = dept.department_id

            WHERE 
                po.purchase_order_id = ?

            GROUP BY 
                po.purchase_order_id,
                po.purchase_order_number,
                po.purchase_order_date,
                s.supplier_name,
                po.status,
                po.created_at,
                poi_total.total_quantity,
                ii.total_delivered

            ORDER BY 
                po.created_at DESC
        `, [id]
    );

    const result = {
        ...rows[0],
        purchase_order_date: formatISO_PH(rows[0].purchase_order_date),
        purchase_order_item: JSON.parse(rows[0].purchase_order_item || '[]')
    } as PurchaseOrderList

    return result
}


export const getPendingPurchaseOrder = async () => {


    const [rows]: any = await pool.query(`
        SELECT 
            po.purchase_order_id,
            po.purchase_order_number,
            po.purchase_order_date, 
            po.purchase_request_number,
            po.supplier_id,
            s.supplier_name,
            po.status,
            po.created_at,

            COALESCE(poi_total.total_quantity, 0) + 0 AS total_quantity,
            COALESCE(ii.total_delivered, 0) + 0 AS total_delivered,

            IFNULL(
                CONCAT(
                    '[',
                    GROUP_CONCAT(
                        DISTINCT JSON_OBJECT(
                            'purchase_order_item_id', poi_item.purchase_order_item_id,
                            'purchase_order_id', poi_item.purchase_order_id,
                            'item_id', poi_item.item_id,

                            'item_name', i.item_name,
                            'brand_name', b.brand_name,
                            'category_name', c.category_name,
                            'item_type_name', it.item_type_name,
                            'unit_of_measure_name', uom.unit_of_measure_name,

                            'employee_id', poi_item.employee_id,
                            'employee_name', e.employee_name,
                            'department_name', dept.department_name,

                            'price', poi_item.price,
                            'ordered_quantity', poi_item.ordered_quantity,
                            'total_received', poi_item.total_received,

                            'remaining_quantity',
                                (poi_item.ordered_quantity - poi_item.total_received)
                        )
                        SEPARATOR ','
                    ),
                    ']'
                ),
                '[]'
            ) AS purchase_order_item

        FROM 
            purchase_order po

        -- ITEM LEVEL (SAFE AGG)

        LEFT JOIN (
            SELECT 
                poi.purchase_order_item_id,
                poi.purchase_order_id,
                poi.item_id,
                poi.employee_id,
                poi.ordered_quantity,
                poi.price,
                IFNULL(SUM(ii.received_quantity), 0) AS total_received
            FROM 
                purchase_order_item poi
            LEFT JOIN 
                incoming_item ii 
            ON 
                ii.purchase_order_item_id = poi.purchase_order_item_id
                AND ii.is_del = 0
            WHERE 
                poi.is_del = 0
            GROUP BY 
                poi.purchase_order_item_id,
                poi.purchase_order_id,
                poi.item_id,
                poi.employee_id,
                poi.ordered_quantity,
                poi.price
            HAVING 
                (poi.ordered_quantity - IFNULL(SUM(ii.received_quantity), 0)) > 0
        ) poi_item 
        ON 
            po.purchase_order_id = poi_item.purchase_order_id

        -- TOTAL ORDERED

        LEFT JOIN (
            SELECT 
                purchase_order_id,
                SUM(ordered_quantity) AS total_quantity
            FROM 
                purchase_order_item
            WHERE 
                is_del = 0
            GROUP BY 
                purchase_order_id
        ) poi_total 
        ON 
            po.purchase_order_id = poi_total.purchase_order_id

        -- TOTAL DELIVERED

        LEFT JOIN (
            SELECT 
                poi.purchase_order_id,
                SUM(ii.received_quantity) AS total_delivered
            FROM 
                incoming_item ii
            JOIN 
                purchase_order_item poi 
            ON 
                ii.purchase_order_item_id = poi.purchase_order_item_id
            WHERE 
                ii.is_del = 0
            AND 
                poi.is_del = 0
            GROUP BY 
                poi.purchase_order_id
        ) ii 
        ON 
            po.purchase_order_id = ii.purchase_order_id

        -- MASTER DATA

        LEFT JOIN supplier s 
            ON po.supplier_id = s.supplier_id

        LEFT JOIN item i 
            ON poi_item.item_id = i.item_id

        LEFT JOIN brand b 
            ON i.brand_id = b.brand_id

        LEFT JOIN category c 
            ON i.category_id = c.category_id

        LEFT JOIN item_type it 
            ON i.item_type_id = it.item_type_id

        LEFT JOIN unit_of_measure uom 
            ON i.unit_of_measure_id = uom.unit_of_measure_id

        LEFT JOIN employee e 
            ON poi_item.employee_id = e.employee_id

        LEFT JOIN department dept 
            ON e.department_id = dept.department_id

        WHERE LOWER(po.status) = 'cheque released'

        GROUP BY 
            po.purchase_order_id,
            po.purchase_order_number,
            po.purchase_order_date,
            s.supplier_name,
            po.status,
            po.created_at,
            poi_total.total_quantity,
            ii.total_delivered

        HAVING 
            poi_total.total_quantity > IFNULL(ii.total_delivered, 0)

        ORDER BY 
            po.created_at DESC
    `);


    return rows.map((item: any) => ({
        ...item,
        purchase_order_date: formatISO_PH(item.purchase_order_date),
        purchase_order_item: JSON.parse(item.purchase_order_item || '[]')
    }))


}



export const getSinglePendingPurchaseOrder = async (id: number) => {


    const [rows]: any = await pool.query(
        `
            SELECT 
                po.purchase_order_id,
                po.purchase_order_number,
                po.purchase_order_date, 
                po.purchase_request_number,
                po.supplier_id,
                s.supplier_name,
                po.status,
                po.created_at,

                COALESCE(poi_total.total_price, 0) + 0 AS total_price,
                COALESCE(poi_total.total_quantity, 0) + 0 AS total_quantity,
                COALESCE(ii.total_delivered, 0) + 0 AS total_delivered,

                IFNULL(
                    CONCAT(
                        '[',
                        GROUP_CONCAT(
                            DISTINCT JSON_OBJECT(
                                'purchase_order_item_id', poi_item.purchase_order_item_id,
                                'purchase_order_id', poi_item.purchase_order_id,
                                'item_id', poi_item.item_id,

                                'item_name', i.item_name,
                                'brand_name', b.brand_name,
                                'category_name', c.category_name,
                                'item_type_name', it.item_type_name,
                                'unit_of_measure_name', uom.unit_of_measure_name,

                                'employee_id', poi_item.employee_id,
                                'employee_name', e.employee_name,
                                'department_name', dept.department_name,

                                'price', poi_item.price,
                                'ordered_quantity', poi_item.ordered_quantity,
                                'delivered_quantity', poi_item.total_received,

                                'remaining_quantity',
                                    (poi_item.ordered_quantity - poi_item.total_received)
                            )
                            SEPARATOR ','
                        ),
                        ']'
                    ),
                    '[]'
                ) AS purchase_order_item

            FROM 
                purchase_order po

            -- ITEM LEVEL (SAFE AGG)

            LEFT JOIN (
                SELECT 
                    poi.purchase_order_item_id,
                    poi.purchase_order_id,
                    poi.item_id,
                    poi.employee_id,
                    poi.ordered_quantity,
                    poi.price,
                    IFNULL(SUM(ii.received_quantity), 0) AS total_received
                FROM 
                    purchase_order_item poi
                LEFT JOIN 
                    incoming_item ii 
                ON 
                    ii.purchase_order_item_id = poi.purchase_order_item_id
                    AND ii.is_del = 0
                WHERE 
                    poi.is_del = 0
                GROUP BY 
                    poi.purchase_order_item_id,
                    poi.purchase_order_id,
                    poi.item_id,
                    poi.employee_id,
                    poi.ordered_quantity,
                    poi.price
                HAVING 
                    (poi.ordered_quantity - IFNULL(SUM(ii.received_quantity), 0)) > 0
            ) poi_item 
            ON 
                po.purchase_order_id = poi_item.purchase_order_id

            -- TOTAL ORDERED

            LEFT JOIN (
                SELECT 
                    purchase_order_id,
                    SUM(ordered_quantity) AS total_quantity,
                    SUM(price) AS total_price
                FROM 
                    purchase_order_item
                WHERE 
                    is_del = 0
                GROUP BY 
                    purchase_order_id
            ) poi_total 
            ON 
                po.purchase_order_id = poi_total.purchase_order_id

            -- TOTAL DELIVERED

            LEFT JOIN (
                SELECT 
                    poi.purchase_order_id,
                    SUM(ii.received_quantity) AS total_delivered
                FROM 
                    incoming_item ii
                JOIN 
                    purchase_order_item poi 
                ON 
                    ii.purchase_order_item_id = poi.purchase_order_item_id
                WHERE 
                    ii.is_del = 0
                    AND poi.is_del = 0
                GROUP BY 
                    poi.purchase_order_id
            ) ii 
            ON 
                po.purchase_order_id = ii.purchase_order_id

            -- MASTER DATA

            LEFT JOIN supplier s 
                ON po.supplier_id = s.supplier_id

            LEFT JOIN item i 
                ON poi_item.item_id = i.item_id

            LEFT JOIN brand b 
                ON i.brand_id = b.brand_id

            LEFT JOIN category c 
                ON i.category_id = c.category_id

            LEFT JOIN item_type it 
                ON i.item_type_id = it.item_type_id

            LEFT JOIN unit_of_measure uom 
                ON i.unit_of_measure_id = uom.unit_of_measure_id

            LEFT JOIN employee e 
                ON poi_item.employee_id = e.employee_id

            LEFT JOIN 
                department dept 
            ON 
                e.department_id = dept.department_id

            WHERE 
                po.purchase_order_id = ?

            GROUP BY 
                po.purchase_order_id,
                po.purchase_order_number,
                po.purchase_order_date,
                s.supplier_name,
                po.status,
                po.created_at,
                poi_total.total_quantity,
                ii.total_delivered

            ORDER BY 
                po.created_at DESC
        `, [id]
    );

    const result = {
        ...rows[0],
        purchase_order_date: formatISO_PH(rows[0].purchase_order_date),
        purchase_order_item: JSON.parse(rows[0].purchase_order_item || '[]')
    } as PurchaseOrderList

    return result

}