import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { GymClass, ClassLevel } from '../../entities/gym-class.entity';
import { ClassEnrollment, EnrollmentStatus } from '../../entities/class-enrollment.entity';
import { Member } from '../../entities/member.entity';
import { CreateClassDto, UpdateClassDto, EnrollMemberDto, UpdateEnrollmentDto } from './dto/create-class.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(GymClass)
    private classRepository: Repository<GymClass>,
    @InjectRepository(ClassEnrollment)
    private enrollmentRepository: Repository<ClassEnrollment>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
  ) {}

  // Class CRUD
  async createClass(createClassDto: CreateClassDto): Promise<GymClass> {
    const gymClass = this.classRepository.create(createClassDto);
    return this.classRepository.save(gymClass);
  }

  async getAllClasses(page: number = 1, limit: number = 10): Promise<{ data: GymClass[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.classRepository.findAndCount({
      relations: ['trainer', 'enrollments'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getClassById(id: string): Promise<GymClass> {
    const gymClass = await this.classRepository.findOne({
      where: { id },
      relations: ['trainer', 'enrollments'],
    });

    if (!gymClass) {
      throw new NotFoundException('Class not found');
    }

    return gymClass;
  }

  async updateClass(id: string, updateClassDto: UpdateClassDto): Promise<GymClass> {
    const gymClass = await this.getClassById(id);

    Object.assign(gymClass, updateClassDto);

    return this.classRepository.save(gymClass);
  }

  async deleteClass(id: string): Promise<void> {
    const gymClass = await this.getClassById(id);
    await this.classRepository.remove(gymClass);
  }

  async getClassesByTrainer(trainerId: string, page: number = 1, limit: number = 10): Promise<{ data: GymClass[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.classRepository.findAndCount({
      where: { trainerId },
      relations: ['trainer', 'enrollments'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUpcomingClasses(daysAhead: number = 7): Promise<GymClass[]> {
    // This is simplified - in a real app you'd parse the schedule string
    return this.classRepository.find({
      where: { isActive: true },
      relations: ['trainer', 'enrollments'],
      order: { createdAt: 'ASC' },
      take: 10,
    });
  }

  async getClassesByLevel(level: ClassLevel, page: number = 1, limit: number = 10): Promise<{ data: GymClass[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.classRepository.findAndCount({
      where: { level },
      relations: ['trainer', 'enrollments'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Enrollment operations
  async enrollMember(classId: string, enrollMemberDto: EnrollMemberDto): Promise<ClassEnrollment> {
    const gymClass = await this.getClassById(classId);
    const member = await this.memberRepository.findOne({
      where: { id: enrollMemberDto.memberId },
    });

    if (!member) {
      throw new BadRequestException('Member not found');
    }

    // Check if class is at capacity
    if (gymClass.enrolled >= gymClass.capacity) {
      throw new BadRequestException('Class is at full capacity');
    }

    // Check if member is already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { classId, memberId: enrollMemberDto.memberId, status: EnrollmentStatus.ACTIVE },
    });

    if (existingEnrollment) {
      throw new BadRequestException('Member is already enrolled in this class');
    }

    const enrollment = this.enrollmentRepository.create({
      classId,
      memberId: enrollMemberDto.memberId,
      enrollmentDate: enrollMemberDto.enrollmentDate || new Date(),
      status: EnrollmentStatus.ACTIVE,
      notes: enrollMemberDto.notes,
    });

    // Increment class enrolled count
    gymClass.enrolled += 1;
    await this.classRepository.save(gymClass);

    return this.enrollmentRepository.save(enrollment);
  }

  async unenrollMember(classId: string, memberId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { classId, memberId, status: EnrollmentStatus.ACTIVE },
    });

    if (!enrollment) {
      throw new NotFoundException('Active enrollment not found');
    }

    enrollment.status = EnrollmentStatus.CANCELLED;
    await this.enrollmentRepository.save(enrollment);

    // Decrement class enrolled count
    const gymClass = await this.getClassById(classId);
    gymClass.enrolled = Math.max(0, gymClass.enrolled - 1);
    await this.classRepository.save(gymClass);
  }

  async getEnrollmentById(id: string): Promise<ClassEnrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['gymClass', 'member'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }

  async updateEnrollment(id: string, updateEnrollmentDto: UpdateEnrollmentDto): Promise<ClassEnrollment> {
    const enrollment = await this.getEnrollmentById(id);

    Object.assign(enrollment, updateEnrollmentDto);

    return this.enrollmentRepository.save(enrollment);
  }

  async getClassEnrollments(classId: string, page: number = 1, limit: number = 10): Promise<{ data: ClassEnrollment[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.enrollmentRepository.findAndCount({
      where: { classId },
      relations: ['member'],
      skip,
      take: limit,
      order: { enrollmentDate: 'DESC' },
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getMemberEnrollments(memberId: string, page: number = 1, limit: number = 10): Promise<{ data: ClassEnrollment[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.enrollmentRepository.findAndCount({
      where: { memberId },
      relations: ['gymClass'],
      skip,
      take: limit,
      order: { enrollmentDate: 'DESC' },
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getClassStatistics(classId: string): Promise<any> {
    const gymClass = await this.getClassById(classId);

    const [total, active, completed, cancelled] = await Promise.all([
      this.enrollmentRepository.count({ where: { classId } }),
      this.enrollmentRepository.count({ where: { classId, status: EnrollmentStatus.ACTIVE } }),
      this.enrollmentRepository.count({ where: { classId, status: EnrollmentStatus.COMPLETED } }),
      this.enrollmentRepository.count({ where: { classId, status: EnrollmentStatus.CANCELLED } }),
    ]);

    const totalSessionsAttended = await this.enrollmentRepository
      .createQueryBuilder('e')
      .select('SUM(e.sessionsAttended)', 'total')
      .where('e.classId = :classId', { classId })
      .getRawOne();

    return {
      className: gymClass.name,
      totalEnrollments: total,
      activeEnrollments: active,
      completedEnrollments: completed,
      cancelledEnrollments: cancelled,
      capacity: gymClass.capacity,
      occupancyRate: ((gymClass.enrolled / gymClass.capacity) * 100).toFixed(2),
      totalSessionsAttended: totalSessionsAttended.total || 0,
    };
  }
}
