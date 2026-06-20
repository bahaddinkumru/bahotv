import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";

@Entity('user_penalties')
export class UserPenalty {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column({ default: false })
    is_banned: boolean;

    @Column({ default: 0 })
    warning_count: number;

    @Column({ default: 0 })
    ban_count: number;

    @Column({ type: 'text', nullable: true })
    ban_reason: string;

    @Column({ type: 'timestamp', nullable: true })
    banned_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    banned_until: Date | null;

    @Column({ nullable: true })
    proofImageUrl: string;

    @OneToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;
}