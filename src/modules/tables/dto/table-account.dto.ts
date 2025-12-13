import { IsUUID, IsInt, IsOptional, IsString, IsDecimal } from 'class-validator';

export class AddItemToAccountDto {
  @IsUUID()
  productId: string;

  @IsInt()
  quantity: number;

  @IsDecimal({ decimal_digits: '2' })
  unitPrice: number;
}

export class RemoveItemFromAccountDto {
  @IsUUID()
  itemId: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
