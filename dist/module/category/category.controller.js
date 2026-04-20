import { pool } from "../../config/connection.js";
import { idSchema } from "../../shared/schema/id.schema.js";
export const getCategoryController = async (c) => {
    try {
        const [rows] = await pool.query(`
                SELECT 
                    * 
                FROM 
                    category
                WHERE
                    is_del = ?
                ORDER BY
                    created_at DESC
            `, [0]);
        const categories = rows;
        return c.json(categories);
    }
    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch categories"
        }, 500);
    }
};
export const createCategoryController = async (c) => {
    const { category_name } = c.req.valid('json');
    try {
        const [rows] = await pool.query(`
                SELECT 
                    category_id
                FROM 
                    category 
                WHERE 
                    category_name = ? AND is_del = ? LIMIT 1
            `, [category_name, 0]);
        if (rows.length > 0) {
            return c.json({
                success: false,
                message: "Category already exists."
            }, 409);
        }
        await pool.query(`
                INSERT INTO
                    category (category_name)
                VALUES
                    (?)
            `, [category_name]);
        return c.json({
            success: true,
            message: "Category created successfully."
        });
    }
    catch (err) {
        console.error(err);
        return c.json({
            success: false,
            message: "Failed to create category."
        }, 500);
    }
};
export const updateCategoryController = async (c) => {
    try {
        const { category_id, category_name } = c.req.valid('json');
        const [rows] = await pool.query(`
                SELECT 
                    category_id
                FROM 
                    category 
                WHERE 
                    category_name = ? AND is_del = ? LIMIT 1
            `, [category_name, 0]);
        if (rows.length > 0) {
            return c.json({
                success: false,
                message: "Category already exists."
            }, 409);
        }
        await pool.query(`
                Update 
                    category 
                SET
                    category_name = ? 
                WHERE 
                    category_id = ?
            `, [category_name, category_id]);
        return c.json({
            success: true,
            message: "Category updated successfully."
        });
    }
    catch (err) {
        console.error(err);
        return c.json({
            success: false,
            message: "Failed to update category."
        }, 500);
    }
};
export const softDeleteCategoryController = async (c) => {
    try {
        const { brand_id } = c.req.param();
        const result = idSchema.safeParse(brand_id);
        if (!result.success) {
            return c.json({
                success: false,
                error: 'Missing field is required'
            }, 400);
        }
        // return c.json({ userId: result.data });
        await pool.query(`
                Update 
                    category 
                SET
                    is_del = ? 
                WHERE 
                    category_id = ?
            `, [1, result.data]);
        return c.json({
            success: true,
            message: "Category deleted successfully."
        });
    }
    catch (err) {
        console.error(err);
        return c.json({
            success: false,
            message: "Failed to delete category."
        }, 500);
    }
};
