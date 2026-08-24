import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class BiometricLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  passwordHash: string; // The encrypted password unlocked from Secure Store
}
