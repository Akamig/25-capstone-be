import { IsBoolean, IsString } from 'class-validator';

export class UpdateSeatStatusDto {
  @IsString()
  seatId: string;

  @IsBoolean()
  occupied: boolean;
}
