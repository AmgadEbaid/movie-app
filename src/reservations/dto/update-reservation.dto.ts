import { PartialType } from '@nestjs/mapped-types';
import { CreateReservationDto } from './create-reservation.dto';
import { IsEnum, IsOptional } from 'class-validator';

export enum ReservationStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    CANCELLED = 'cancelled',
}

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
    @IsOptional()
    @IsEnum(ReservationStatus)
    status?: ReservationStatus;
}
