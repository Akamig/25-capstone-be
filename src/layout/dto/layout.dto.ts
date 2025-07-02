import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';

export class CreateLayoutDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  location: string;

  @IsString()
  @IsNotEmpty()
  canvasSize: string;
}

export class CreateSeatDto {
  @IsString()
  @IsNotEmpty()
  seatName: string;

  @IsInt()
  @Min(0)
  seatX: number;

  @IsInt()
  @Min(0)
  seatY: number;

  @IsUUID()
  layoutId: string;

  @IsString()
  @IsNotEmpty()
  moduleId: number;
}

export class ReserveSeatDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  minutes?: number;
}
