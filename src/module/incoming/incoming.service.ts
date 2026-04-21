






export const generateAssetTag = async (conn: any) => {
    const year = new Date().getFullYear();

    const [rows]: any = await conn.query(`
        SELECT COUNT(*) as count FROM asset WHERE YEAR(created_at) = ?
    `, [year]);

    const next = rows[0].count + 1;

    return `IT-ASSET-${year}-${String(next).padStart(6, '0')}`;
};