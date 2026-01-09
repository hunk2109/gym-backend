import { IsNumber, IsOptional, IsObject } from 'class-validator';

export class BillBreakdownDto {
  [denomination: string]: number; // Aceptar string también
}

export class ReceiptDto {
  description?: string;
  amount?: number;
  quantity?: number;
}

export class OpenCashRegisterDto {
  @IsNumber()
  @IsOptional()
  openingAmount?: number;

  @IsObject()
  @IsOptional()
  billBreakdown?: BillBreakdownDto | Record<string, number>;

  @IsOptional()
  receipts?: ReceiptDto[] | any[];
}

export class CloseCashRegisterDto {
  @IsNumber()
  closingAmount: number;

  @IsObject()
  @IsOptional()
  billBreakdown?: BillBreakdownDto | Record<string, number>;

  @IsOptional()
  receipts?: ReceiptDto[] | any[];

  @IsNumber()
  @IsOptional()
  totalSalesAmount?: number;
}
