import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../../user/entities/user.entity";
import { ComplaintReason, ComplaintStatus } from "../enums/complaint.enum";

@Entity('complaints')
export class Complaint {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    reporterId: number;

    @Column()
    reportedId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'reporterId' })
    reporter: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'reportedId' })
    reported: User;

    @Column({ type: 'enum', enum: ComplaintReason })
    reason: ComplaintReason;

    @Column({ nullable: true })
    proofImageUrl: string;

    @Column({ type: 'enum', enum: ComplaintStatus, default: ComplaintStatus.PENDING })
    status: ComplaintStatus;

    @Column({ nullable: true, type: 'text' })
    adminNote: string;

    @CreateDateColumn()
    createdAt: Date;
}