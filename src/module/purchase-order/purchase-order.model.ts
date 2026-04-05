


interface PurchaseOrderItem {
  purchase_order_item_id: number;
  purchase_order_id: number;
  employee_id: number;
  item_id: number;
  item_name: string;
  brand_name: string;
  category_name: string;
  item_type_name: string;
  unit_of_measure_name: string;
  ordered_quantity: number;
  price: number;
};

export interface PurchaseOrderList {
  purchase_order_id: number;
  purchase_request_number: string;
  purchase_order_number: string;
  purchase_order_date: string;
  supplier_id: number;
  supplier_name: string;
  purchase_order_item: PurchaseOrderItem[];
  total_quantity: number;
  total_price: number;
  created_at: string;
};