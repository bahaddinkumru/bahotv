import { Exclude } from "class-transformer";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { RefreshToken } from "../../auth/entities/refresh-token.entity";
import { Role } from "../../../common/enums/role.enum";
import { UserPenalty } from "./user-penalty.entity";
import { Notification } from "../../notification/entities/notification.entity";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    surname: string;

    @Column()
    gender: string;

    @Column({ unique: true })
    email: string;

    @Column()
    @Exclude()
    password: string;

    @Column({ default: false })
    @Exclude()
    is_active: boolean;

    @Column()
    university: string;

    @Column({ nullable: true })
    @Exclude()
    verification_code: string;

    @Column({ type: 'timestamp', nullable: true })
    @Exclude()
    verification_code_expires: Date;

    @Column({ default: false })
    filter_university: boolean;

    @Column({ default: false })
    filter_gender: boolean;

    @Column({
        type: 'enum',
        enum: Role,
        default: Role.USER
    })
    role: Role;

    @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user, {
        cascade: true,
    })
    refreshTokens: RefreshToken[];

    @OneToOne(() => UserPenalty, (penalty) => penalty.user)
    penalty: UserPenalty;

    @OneToMany(() => Notification, (notification) => notification.user)
    notifications: Notification[];

    @CreateDateColumn()
    @Exclude()
    createdAt: Date;

    @UpdateDateColumn()
    @Exclude()
    updatedAt: Date;

    @DeleteDateColumn()
    @Exclude()
    deletedAt: Date;

}