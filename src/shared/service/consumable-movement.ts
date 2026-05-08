import type { PoolConnection } from "mysql2/promise";


type MovementType =
  | "Incoming"
  | "Outgoing"
  | "Adjustment"


export interface ConsumableMovementInput {
  item_id: number;
  movement_type: MovementType;
  quantity: number;
  reference_id: number;
  remarks?: string | null;
  created_by: number;
}


export async function consumableMovementLog(
  conn: PoolConnection,
  data: ConsumableMovementInput
) {
  const {
    item_id,
    movement_type,
    quantity,
    reference_id,
    created_by
  } = data;

  // lock row
  const [rows]: any = await conn.query(
    `
    SELECT 
        quantity
    FROM 
        consumable_stock
    WHERE 
        item_id = ?
    FOR 
        UPDATE
    `,
    [item_id]
  );

  const currentQty =
    rows.length > 0 ? Number(rows[0].quantity) : 0;

  // signed quantity
  const qtyChange =
    movement_type === "Outgoing"
      ? -Math.abs(quantity)
      : Math.abs(quantity);

  const newBalance = currentQty + qtyChange;

  if (newBalance < 0) {
    throw new Error("Insufficient stock");
  }

  // create stock row if missing
  if (rows.length === 0) {
    await conn.query(
      `
      INSERT INTO 
        consumable_stock (
        item_id,
        quantity
      )
      VALUES (?, ?)
      `,
      [item_id, newBalance]
    );
  } else {
    await conn.query(
      `
      UPDATE 
        consumable_stock
      SET 
        quantity = ?
      WHERE 
        item_id = ?
      `,
      [newBalance, item_id]
    );
  }

  // insert movement log
  await conn.query(
    `
    INSERT INTO consumable_movement (
      item_id,
      movement_type,
      quantity,
      running_balance,
      reference_id,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      item_id,
      movement_type,
      qtyChange,
      newBalance,
      reference_id,
      created_by
    ]
  );
}