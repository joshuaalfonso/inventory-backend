import { pool } from "../../config/connection.js";
import { idSchema } from "../../shared/schema/id.schema.js";
import type { EmployeeList } from "./employee.model.js";





export const getEmployeeController = async (c: any) => {

    try {
    
        const [rows] = await pool.query(
            `
                SELECT 
                    e.*,
                    d.department_name
                FROM 
                    employee e
                LEFT JOIN
                    department d
                ON
                    e.department_id = d.department_id
                WHERE
                    e.is_del = ?
                ORDER BY
                    e.created_at DESC
            `,
            [0]
        );

        const employees = rows as EmployeeList[];

        return c.json(employees)

    }

    catch (err) {
        console.log(err);
        return c.json({
            success: false,
            message: "Failed to fetch employees"
        }, 500);
    }

}


export const createEmployeeController = async (c: any) => {

    const { employee_name, department_id ,email } = c.req.valid('json');

    try {

        const [rows]: any = await pool.query(
            `
                SELECT 
                    employee_id
                FROM 
                    employee 
                WHERE 
                    employee_name = ? AND is_del = ? LIMIT 1
            `,
            [employee_name, 0]
        );

        if (rows.length > 0) {
            return c.json({
                success: false,
                message: "Employee already exists."
            }, 409);
        }

        await pool.query(
            `
                INSERT INTO
                    employee (employee_name, department_id, email)
                VALUES
                    (?, ?, ?)
            `,
            [employee_name, department_id, email]
        );

        return c.json({
            success: true,
            message: `'${employee_name}' created successfully.`
        })

    }

    catch (err) {
        console.error(err)
        return c.json({
            success: false,
            message: `Failed to create ${employee_name}.`
        }, 500)
    }

}

export const updateEmployeeController = async (c: any) => {

    try {

        const { employee_id, employee_name, department_id, email } = c.req.valid('json');

         const [rows]: any = await pool.query(
            `
                SELECT 
                    employee_id
                FROM 
                    employee 
                WHERE 
                    employee_name = ? AND is_del = ? LIMIT 1
            `,
            [employee_name, 0]
        );

        if (rows.length > 0) {
            return c.json({
                success: false,
                message: "Employee already exists."
            }, 409);
        }

        await pool.query(
            `
                Update 
                    employee 
                SET
                    employee_name = ?,
                    department_id = ?,
                    email = ?
                WHERE 
                    employee_id = ?
            `,
            [employee_name, department_id, email, employee_id]
        );

        return c.json({
            success: true,
            message: "Employee updated successfully."
        })

    }

    catch (err) {
        console.error(err)
        return c.json({
            success: false,
            message: "Failed to update employee."
        }, 500)
    }

}

export const softDeleteEmployeeController = async (c: any) => {

    try {
    
            const { employee_id } = c.req.param();
        
            const result = idSchema.safeParse(employee_id);
    
            if (!result.success) {
                return c.json({ 
                    success: false,
                    error: 'Missing field is required'
                }, 400);
            }
    
            await pool.query(
                `
                    Update 
                        employee 
                    SET
                        is_del = ? 
                    WHERE 
                        employee_id = ?
                `,
                [1, result.data]
            );
    
            return c.json({
                success: true,
                message: "Employee deleted successfully."
            })
     
        }
    
        catch (err) {
            console.error(err)
            return c.json({
                success: false,
                message: "Failed to delete employee."
            }, 500)
        }

}