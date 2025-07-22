// Define a simple type for the seat object for clarity
interface Seat {
    rowNumber: number;
    seatNumber: number;
    // other properties can exist but are ignored by this function
}

/**
 * Formats seat and showtime data into a human-readable string.
 * @param seats - An array of seat objects.
 * @param startTime - The showtime start time as an ISO string or Date object.
 * @returns A formatted string, e.g., "Seats R3S6, R3S7, Showtime on Thursday @ 8:00 PM"
 */
export function formatShowtimeDescription(seats: Seat[], startTime: string | Date): string {
    // 1. Format the seat information
    const seatLabel = seats.length > 1 ? 'Seats' : 'Seat';
    const formattedSeats = seats
        .map(seat => `R${seat.rowNumber}S${seat.seatNumber}`)
        .join(', ');

    // 2. Format the date and time information
    const date = new Date(startTime);

    // Get the day of the week (e.g., "Thursday")
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

    // Get the time in 12-hour format with AM/PM (e.g., "8:00 PM")
    // We specify the timeZone as UTC to ensure it formats the time as 20:00
    // and not convert it to the server's local timezone.
    const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
    }).toUpperCase(); // To make "pm" -> "PM"

    // 3. Combine everything into the final string
    return `${seatLabel} ${formattedSeats}, Showtime on ${dayOfWeek} @ ${time}`;
}