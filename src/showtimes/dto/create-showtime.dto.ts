import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateShowtimeDto {
    @IsNotEmpty()
    @IsString()
    movieId: string;

    @IsNotEmpty()
    @IsString()
    screenId: string;

    @IsNotEmpty()
    @IsDateString()
    startTime: string;

    @IsNumber()
    price: number;
}
