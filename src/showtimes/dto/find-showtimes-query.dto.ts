import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

export class FindShowtimesQueryDto {
    @IsOptional()
    @IsDateString()
    date?: string;

    @IsOptional()
    @IsUUID()
    movieId?: string;

    @IsOptional()
    @IsUUID()
    screenId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    sortBy?: string = 'startTime';

    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.ASC;
}
