import { pool } from "../../config/connection.js";
import { idSchema } from "../../shared/schema/id.schema.js";
export const getSupplierController = async (c) => {
    try {
        const [rows] = await pool.query(`
                SELECT 
                    * 
                FROM 
                    supplier
                WHERE
                    is_del = ?
                ORDER BY
                    created_at DESC
            `, [0]);
        const suppliers = rows;
        return c.json(suppliers);
    }
    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch supplier"
        }, 500);
    }
};
export const createSupplierController = async (c) => {
    try {
        const { supplier_name, supplier_address, contact_person, contact_number } = c.req.valid('json');
        const [rows] = await pool.query(`
                SELECT 
                    supplier_id
                FROM 
                    supplier
                WHERE 
                    supplier_name = ? AND is_del = ? LIMIT 1
            `, [supplier_name, 0]);
        if (rows.length > 0) {
            return c.json({
                success: false,
                message: `'${supplier_name}' already exists.`
            }, 409);
        }
        await pool.query(`
                INSERT INTO
                    supplier (supplier_name, supplier_address, contact_person, contact_number)
                VALUES
                    (?, ?, ?, ?)
            `, [supplier_name, supplier_address, contact_person, contact_number]);
        return c.json({
            success: true,
            message: `'${supplier_name}' created successfully.`
        });
    }
    catch (err) {
        console.error(err);
        return c.json({
            success: false,
            message: "Failed to create supplier."
        }, 500);
    }
};
export const updateSupplierController = async (c) => {
    try {
        const { supplier_id, supplier_name, supplier_address, contact_person, contact_number } = c.req.valid('json');
        const [rows] = await pool.query(`
                SELECT 
                    supplier_id
                FROM 
                    supplier
                WHERE 
                    supplier_name = ? AND is_del = ? LIMIT 1
            `, [supplier_name, 0]);
        if (rows.length > 0) {
            return c.json({
                success: false,
                message: `'${supplier_name}' already exists.`
            }, 409);
        }
        await pool.query(`
                Update 
                    supplier 
                SET
                    supplier_name = ?, supplier_address = ?, contact_person = ?, contact_number = ?
                WHERE 
                    supplier_id = ?
            `, [supplier_name, supplier_address, contact_person, contact_number, supplier_id]);
        return c.json({
            success: true,
            message: `'${supplier_name}' updated successfully.`
        });
    }
    catch (err) {
        console.error(err);
        return c.json({
            success: false,
            message: `Failed to update supplier.`
        }, 500);
    }
};
export const softDeleteSupplierController = async (c) => {
    try {
        const { supplier_id } = c.req.param();
        const result = idSchema.safeParse(supplier_id);
        if (!result.success) {
            return c.json({
                success: false,
                error: 'Missing field is required'
            }, 400);
        }
        // return c.json({ userId: result.data });
        await pool.query(`
                UPDATE 
                    supplier 
                SET
                    is_del = ? 
                WHERE 
                    supplier_id = ?
            `, [1, result.data]);
        return c.json({
            success: true,
            message: "Supplier deleted successfully."
        });
    }
    catch (err) {
        console.error(err);
        return c.json({
            success: false,
            message: "Failed to delete supplier."
        }, 500);
    }
};
