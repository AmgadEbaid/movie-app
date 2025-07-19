import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Reservation } from "./reservation.entity";

@Entity()
export class Seat {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("int")
    rowNumber: number;

    @Column("int")
    seatNumber: number;

    @ManyToOne(() => Reservation, reservation => reservation.seats)
    reservation: Reservation; // Link back to the parent reservation
}