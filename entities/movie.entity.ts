import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";
import { MovieGenre } from './movie-genre.enum';

@Entity()
export class Movie {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ length: 255 })
    title: string;

    @Column("text", { nullable: true })
    description: string;

    @Column("int")
    releaseYear: number;

    @Column({
        type: "enum",
        enum: ["G", "PG", "PG-13", "R", "NC-17"],
        default: "G"
    })
    rating: string;

    @Column({
        type: "text",
        transformer: {
            to: (value: MovieGenre[]) => value ? JSON.stringify(value) : '[]',
            from: (value: string) => value ? JSON.parse(value) : []
        }
    })
    genres: MovieGenre[];

    @Column({ nullable: true }) // URL for the main cover image
    coverImageUrl: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}