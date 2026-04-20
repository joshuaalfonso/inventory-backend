






export const generateAssetTag = async (conn: any, item_id: number) => {

    const [rows]: any = await conn.query(`
        SELECT COUNT(*) as count FROM asset WHERE item_id = ?
    `, [item_id]);

    const next = rows[0].count + 1;

    return `IT-ASSET-${item_id}-${String(next).padStart(6, '0')}`;
};