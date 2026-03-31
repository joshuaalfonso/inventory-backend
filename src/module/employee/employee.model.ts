

export interface EmployeeList {
    employee_id: number
    employee_name: string
    department_id: number
    department_name: string
    email: string
    created_at: string
}


export interface CreateEmployee {
    employee_id: number
    employee_name: string
    department_id: number
    email: string
}