import { IsNotEmpty, IsString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class SeatDto {
    @IsInt()
    @Min(1)
    rowNumber: number;

    @IsInt()
    @Min(1)
    seatNumber: number;
}

export class CreateReservationDto {
    @IsNotEmpty()
    @IsInt()
    showtimeId: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SeatDto)
    seats: SeatDto[];
}
