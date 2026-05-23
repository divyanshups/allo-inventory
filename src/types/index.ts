export interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  inventory: WarehouseStock[];
}

export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

export interface ReservationDetail {
  id: string;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  quantity: number;
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    description: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}