import { IsString, IsInt, IsOptional, IsBoolean, Min, MaxLength } from 'class-validator';

export class CreateScreenDto {
    @IsString()
    @MaxLength(100)
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    screenType?: string;

    @IsInt()
    @Min(1)
    totalRows: number;

    @IsInt()
    @Min(1)
    seatsPerRow: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean = true;
}
