import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { SecurityEvent, SecurityEventDocument } from './schemas/security-event.schema';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(SecurityEvent.name) private securityEventModel: Model<SecurityEventDocument>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userModel.findOne({ email: dto.email });
    if (exists) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.userModel.create({ ...dto, password: hashed });
      const token = this.signToken(user);
      return { token, user: this.sanitize(user) };
    } catch (err: any) {
      if (err.code === 11000) throw new ConflictException('Email already registered');
      throw err;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.signToken(user);
    const safeUser = this.sanitize(user);
    return {
      token,
      user: safeUser,
      mustChangePassword: Boolean(safeUser.mustChangePassword),
    };
  }

  async validateToken(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user || !user.isActive) throw new UnauthorizedException();
    return { valid: true, user };
  }

  async validateAccessToken(token: string) {
    if (!token) throw new UnauthorizedException('Missing token');

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token);
      if (!payload?.sub) throw new UnauthorizedException('Invalid token payload');

      const user = await this.userModel.findById(payload.sub).select('-password');
      if (!user || !user.isActive) throw new UnauthorizedException('User inactive');

      return { valid: true, user };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async logFailedTokenValidation(payload: {
    sourceService?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    reason?: string;
    tokenHash?: string;
  }) {
    await this.securityEventModel.create({
      type: 'TOKEN_VALIDATION_FAILED',
      sourceService: payload.sourceService ?? null,
      ip: payload.ip ?? null,
      userAgent: payload.userAgent ?? null,
      path: payload.path ?? null,
      reason: payload.reason ?? null,
      tokenHash: payload.tokenHash ?? null,
    });

    return { logged: true };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: dto }, { new: true })
      .select('-password');
    return user;
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email: normalizedEmail });
    if (!user) {
      return {
        success: true,
        message:
          'If the email exists, a temporary password has been sent.',
      };
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const hashed = await bcrypt.hash(temporaryPassword, 10);

    user.password = hashed;
    user.mustChangePassword = true;
    user.temporaryPasswordIssuedAt = new Date();
    await user.save();

    await this.sendTemporaryPasswordEmail(normalizedEmail, temporaryPassword);

    return {
      success: true,
      message:
        'If the email exists, a temporary password has been sent.',
    };
  }

  async changeTemporaryPassword(userId: string, newPassword: string) {
    const user = await this.userModel.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!user.mustChangePassword) {
      throw new UnauthorizedException('No temporary password change required');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    user.temporaryPasswordIssuedAt = null;
    await user.save();

    return {
      success: true,
      message: 'Password updated. Please login again.',
    };
  }

  private signToken(user: UserDocument) {
    return this.jwtService.sign({ sub: user._id, email: user.email });
  }

  private sanitize(user: UserDocument) {
    const { password, ...rest } = user.toObject();
    return rest;
  }

  private generateTemporaryPassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let out = '';
    for (let i = 0; i < 12; i += 1) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  }

  private async sendTemporaryPasswordEmail(email: string, temporaryPassword: string) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM ?? 'no-reply@flaskcard.local';

    if (!host || !user || !pass) {
      this.logger.warn(
        `SMTP not configured. Temporary password for ${email}: ${temporaryPassword}`,
      );
      return;
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Flaskcard - Temporary password',
      text: `Your temporary password is: ${temporaryPassword}. Please login and change it immediately.`,
    });
  }
}
