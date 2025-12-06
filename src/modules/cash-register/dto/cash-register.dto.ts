export class BillBreakdownDto {
  [denomination: string]: number; // Aceptar string también
}

export class ReceiptDto {
  description?: string;
  amount?: number;
  quantity?: number;
}

export class OpenCashRegisterDto {
  openingAmount?: number;
  billBreakdown?: BillBreakdownDto | Record<string, number>;
  receipts?: ReceiptDto[] | any[];
}

export class CloseCashRegisterDto {
  closingAmount?: number;
  billBreakdown?: BillBreakdownDto | Record<string, number>;
  receipts?: ReceiptDto[] | any[];
  totalSalesAmount?: number;
}
