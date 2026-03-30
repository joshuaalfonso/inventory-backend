import { pool } from "../../config/connection.js";
import { idSchema } from "../../shared/schema/id.schema.js";
import type { DepartmentList } from "./department.model.js";



export const getDepartmentController = async (c: any) => {


    try {
    
        const [rows] = await pool.query(
            `
                SELECT 
                    * 
                FROM 
                    department
                WHERE
                    is_del = ?
                ORDER BY
                    created_at DESC
            `,
            [0]
        );

        const departments = rows as DepartmentList[];

        return c.json(departments)

    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch brands"
        }, 500);
    }


}



export const createDepartmentController = async (c: any) => {

    const { department_name } = c.req.valid('json');

    try {

        const [rows]: any = await pool.query(
            `
                SELECT 
                    department_id
                FROM 
                    department 
                WHERE 
                    department_name = ? AND is_del = ? LIMIT 1
            `,
            [department_name, 0]
        );

        if (rows.length > 0) {
            return c.json({
                success: false,
                message: `${department_name} already exists.`
            }, 409);
        }

        await pool.query(
            `
                INSERT INTO
                    department (department_name)
                VALUES
                    (?)
            `,
            [department_name]
        );

        return c.json({
            success: true,
            message: `${department_name} created successfully.`
        })

    }

    catch (err) {
        console.error(err)
        return c.json({
            success: false,
            message: `Failed to create ${department_name}.`
        }, 500)
    }

}
export const updateDepartmentController = async (c: any) => {

    try {

        const { department_id, department_name } = c.req.valid('json');

        const [rows]: any = await pool.query(
            `
                SELECT 
                    department_id
                FROM 
                    department 
                WHERE 
                    department_name = ? AND is_del = ? LIMIT 1
            `,
            [department_name, 0]
        );

        if (rows.length > 0) {
            return c.json({
                success: false,
                message: "Department already exists."
            }, 409);
        }

        await pool.query(
            `
                Update 
                    department 
                SET
                    department_name = ? 
                WHERE 
                    department_id = ?
            `,
            [department_name, department_id]
        );

        return c.json({
            success: true,
            message: "Department updated successfully."
        })

    }

    catch (err) {
        console.error(err)
        return c.json({
            success: false,
            message: "Failed to update department."
        }, 500)
    }

}
export const softDeleteDepartmentController = async (c: any) => {

    try {
    
        const { department_id } = c.req.param();
    
        const result = idSchema.safeParse(department_id);

        if (!result.success) {
            return c.json({ 
                success: false,
                error: 'Missing field is required'
            }, 400);
        }

        // return c.json({ userId: result.data });

        await pool.query(
            `
                Update 
                    department 
                SET
                    is_del = ? 
                WHERE 
                    department_id = ?
            `,
            [1, result.data]
        );

        return c.json({
            success: true,
            message: "Department deleted successfully."
        })
    
    }

    catch (err) {
        console.error(err)
        return c.json({
            success: false,
            message: "Failed to delete department."
        }, 500)
    }

}