import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { toPublicUser } from '../common/public-user';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    if (createUserDto.email) {
      createUserDto.email = createUserDto.email.trim().toLowerCase();
    }
    return this.prisma.user.create({ data: createUserDto });
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { isDeleted: false },
    });
    // Projected: this is a client-facing list and the raw rows carry the
    // bcrypt hash.
    return users.map(toPublicUser);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.isDeleted) throw new NotFoundException('User not found');
    return toPublicUser(user);
  }

  /**
   * The unprojected row, for callers that need the hash — only the
   * authentication service, comparing a password. Named so that using it by
   * accident reads as a mistake.
   */
  async findOneWithSecrets(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.isDeleted) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    return this.prisma.user.findUnique({
      where: { email: normalizedEmail, isDeleted: false },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    });
  }
}
