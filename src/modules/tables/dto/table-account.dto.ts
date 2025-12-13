import { IsUUID, IsInt, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class AddItemToAccountDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;
}

export class RemoveItemFromAccountDto {
  @IsUUID()
  itemId: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
