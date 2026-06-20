import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    @Index()
    tokenHash: string;

    @Column()
    @Index()
    userId: number;

    @ManyToOne(() => User, (user) => user.refreshTokens, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @Column({ type: 'timestamp' })
    lastUsedAt: Date; ı

    @Column({ default: false })
    isRevoked: boolean;

    @Column({ type: 'timestamp', nullable: true })
    revokedAt: Date;

    @Column({ type: 'uuid', nullable: true })
    replacedByTokenId: string;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ipAddress: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    userAgent: string;

    @CreateDateColumn()
    createdAt: Date;
}