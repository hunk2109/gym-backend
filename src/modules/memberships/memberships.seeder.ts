import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../../entities/membership.entity';

@Injectable()
export class MembershipsSeeder {
  constructor(
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
  ) {}

  async seed() {
    try {
      const count = await this.membershipRepository.count();
      console.log('[Seeder] Conteo actual de membresías:', count);
      
      if (count === 0) {
        console.log('[Seeder] Iniciando creación de membresías de prueba...');
        
        const memberships = [
          {
            name: 'Plan Básico',
            description: 'Acceso básico al gimnasio',
            price: 29.99,
            durationMonths: 1,
            benefits: ['Acceso al gimnasio', 'Equipos básicos'],
            isActive: true,
          },
          {
            name: 'Plan Premium',
            description: 'Acceso completo con clases',
            price: 49.99,
            durationMonths: 1,
            benefits: ['Acceso al gimnasio', 'Todos los equipos', 'Clases grupales', 'Entrenador personal'],
            isActive: true,
          },
          {
            name: 'Plan Anual',
            description: 'Membresía de un año',
            price: 299.99,
            durationMonths: 12,
            benefits: ['Acceso ilimitado', 'Descuento en servicios', 'Entrenador dedicado'],
            isActive: true,
          },
        ];

        for (const membership of memberships) {
          const newMembership = this.membershipRepository.create(membership);
          const saved = await this.membershipRepository.save(newMembership);
          console.log('[Seeder] Membresía guardada:', saved.name, 'ID:', saved.id);
        }

        console.log('[Seeder] 3 membresías creadas exitosamente');
      } else {
        console.log('[Seeder] Ya existen membresías en la BD, saltando seed');
      }
    } catch (error) {
      console.error('[Seeder] Error durante seed:', error);
    }
  }
}
