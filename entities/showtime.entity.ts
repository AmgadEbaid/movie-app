import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from "typeorm";
import { Movie } from "./movie.entity";
import { Reservation } from "./reservation.entity";
import { Screen } from "./screen.entity";


@Entity()
export class Showtime {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Movie, movie => movie.showtimes, { nullable: false })
    movie: Movie;

    @ManyToOne(() => Screen, screen => screen.showtimes, { nullable: false }) // Link to a physical screen
    screen: Screen;

    @Column("timestamp")
    startTime: Date;

    @Column("timestamp")
    endTime: Date;

    @OneToMany(() => Reservation, reservation => reservation.showtime, { cascade: true })
    reservations: Reservation[]; // A showtime can have many reservations
}