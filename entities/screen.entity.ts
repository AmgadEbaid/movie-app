import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Showtime } from "./showtime.entity";

@Entity()
export class Screen {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    name: string; // e.g., "Screen 1" or "IMAX Theatre"

    @Column({ type: "varchar", length: 50, nullable: true })
    screenType: string; // e.g., "IMAX", "3D", "Standard"

    @Column("int")
    totalRows: number;

    @Column("int")
    seatsPerRow: number;

    @Column({ type: "boolean", default: true })
    isActive: boolean;

    @OneToMany(() => Showtime, showtime => showtime.screen, { cascade: ["remove"] })
    showtimes: Showtime[];
}