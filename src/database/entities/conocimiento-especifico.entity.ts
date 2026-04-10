import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('conocimiento_especifico')
export class ConocimientoEspecifico {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Título o categoría del conocimiento (ej: "Procedimientos", "Precios", "Seguros") */
  @Column({ type: 'varchar', length: 200 })
  titulo!: string;

  /** Instrucción o información que el bot debe conocer */
  @Column({ type: 'text' })
  contenido!: string;

  /** Si está activo, se inyecta en el system prompt de cada conversación */
  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
