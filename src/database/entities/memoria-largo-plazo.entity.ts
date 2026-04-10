import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('memoria_largo_plazo')
export class MemoriaLargoPlazo {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Identificador del chat (número de WhatsApp) */
  @Column({ name: 'chat_id' })
  chatId!: string;

  /** Nombre del dato: nombre, pueblo, telefono, plan_medico, etc. */
  @Column({ type: 'varchar', length: 100 })
  clave!: string;

  /** Valor del dato */
  @Column({ type: 'text' })
  valor!: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
