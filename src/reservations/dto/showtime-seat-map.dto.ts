export class SeatMapSeatDto {
    rowNumber: number;
    seatNumber: number;
    isOccupied: boolean;
}

export class SeatMapRowDto {
    rowNumber: number;
    seats: SeatMapSeatDto[];
}

export class ShowtimeSeatMapDto {
    showtimeId: number;
    screenName: string;
    totalRows: number;
    seatsPerRow: number;
    seatMap: SeatMapRowDto[];
}
