import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Column } from "typeorm";
import { User } from "./user.entity";
import { Showtime } from "./showtime.entity";
import { Seat } from "./seat.entity";

@Entity()
export class Reservation {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.reservations, { nullable: false })
    user: User; // The user who made the booking

    @ManyToOne(() => Showtime, showtime => showtime.reservations, { nullable: false })
    showtime: Showtime; // The showtime this booking is for

    @OneToMany(() => Seat, seat => seat.reservation, {
        cascade: true,
        eager: true // Always load seats with reservation
    })
    seats: Seat[]; // The list of seats included in this reservation

    @Column({
        type: "enum",
        enum: ["pending", "cancelled", "completed", "refunded"],
        default: "pending"
    })
    status: string;

    @Column({nullable: true})
    latest_charge: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalPrice: number;

    @Column()
    numberOfSeats: number; // Total number of seats reserved

    @Column({ nullable: true , length: 1024 })
    stripeSessionUrl: string; // Stripe session ID for payment tracking
    // Total price for the reservation
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}