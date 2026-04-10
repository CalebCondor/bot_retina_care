import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('historial_mensajes')
export class HistorialMensaje {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'chat_id' })
  chatId!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: 'user' | 'assistant' | 'system';

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
