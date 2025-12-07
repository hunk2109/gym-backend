import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../../entities/member.entity';

@Injectable()
export class BirthdayReportService {
  constructor(
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
  ) {}

  async getTodaysBirthdays() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Query para obtener miembros que cumplen años hoy
    const members = await this.membersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .select([
        'member.id',
        'member.dateOfBirth',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
      ])
      .where(`MONTH(member.dateOfBirth) = :month`, { month })
      .andWhere(`DAY(member.dateOfBirth) = :day`, { day })
      .orderBy('user.firstName', 'ASC')
      .getMany();

    return members.map(m => {
      const age = this.calculateAge(m.dateOfBirth);
      return {
        id: m.id,
        name: `${m.user.firstName} ${m.user.lastName}`,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        phone: m.user.phone,
        birthDate: m.dateOfBirth,
        age,
      };
    });
  }

  async getUpcomingBirthdays(days: number = 7) {
    const today = new Date();
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + days);

    const members = await this.membersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .select([
        'member.id',
        'member.dateOfBirth',
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
      ])
      .orderBy('user.firstName', 'ASC')
      .getMany();

    const upcoming = members
      .filter(m => {
        const bday = new Date(m.dateOfBirth);
        const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
        
        // Si el cumpleaños ya pasó este año, usamos el del próximo año
        if (nextBday < today) {
          nextBday.setFullYear(nextBday.getFullYear() + 1);
        }

        return nextBday <= upcomingDate && nextBday > today;
      })
      .map(m => {
        const age = this.calculateAge(m.dateOfBirth) + 1;
        const bday = new Date(m.dateOfBirth);
        const nextBday = new Date(new Date().getFullYear(), bday.getMonth(), bday.getDate());
        if (nextBday < new Date()) {
          nextBday.setFullYear(nextBday.getFullYear() + 1);
        }

        const daysUntil = Math.ceil((nextBday.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: m.id,
          name: `${m.user.firstName} ${m.user.lastName}`,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
          phone: m.user.phone,
          birthDate: m.dateOfBirth,
          nextAge: age,
          daysUntil,
          date: nextBday,
        };
      });

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  async getBirthdaysThisMonth() {
    const today = new Date();
    const month = today.getMonth() + 1;

    const members = await this.membersRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .select([
        'member.id',
        'member.dateOfBirth',
        'user.firstName',
        'user.lastName',
      ])
      .where(`MONTH(member.dateOfBirth) = :month`, { month })
      .orderBy('DAY(member.dateOfBirth)', 'ASC')
      .getMany();

    return members.map(m => {
      const age = this.calculateAge(m.dateOfBirth);
      const bday = new Date(m.dateOfBirth);
      return {
        id: m.id,
        name: `${m.user.firstName} ${m.user.lastName}`,
        day: bday.getDate(),
        age: age + 1,
      };
    });
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }
}
