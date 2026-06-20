import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({ default: 'info' })
    type: string;

    @Column({ default: false })
    is_read: boolean;

    @CreateDateColumn()
    createdAt: Date;
}