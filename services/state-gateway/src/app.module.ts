import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ClientsModule,
  Transport,
  type ClientProviderOptions,
} from '@nestjs/microservices';
import { AuthTokenGuard } from './auth/auth-token.guard';
import { PreferencesController } from './preferences/preferences.controller';
import { PreferencesService } from './preferences/preferences.service';
import { LearningController } from './learning/learning.controller';
import { LearningService } from './learning/learning.service';
import { ProgressionController } from './progression/progression.controller';
import { ProgressionService } from './progression/progression.service';
import { ContentGatewayController } from './content/content.controller';
import { ContentGatewayService } from './content/content.service';

const redisHost = process.env.REDIS_HOST ?? 'localhost';
const redisPort = Number(process.env.REDIS_PORT ?? 6379);

const clientConfigs: ClientProviderOptions[] = [
  {
    name: 'PREFS_CLIENT',
    transport: Transport.REDIS,
    options: { host: redisHost, port: redisPort },
  },
  {
    name: 'LEARNING_CLIENT',
    transport: Transport.REDIS,
    options: { host: redisHost, port: redisPort },
  },
  {
    name: 'PROGRESSION_CLIENT',
    transport: Transport.REDIS,
    options: { host: redisHost, port: redisPort },
  },
  {
    name: 'AUTH_CLIENT',
    transport: Transport.REDIS,
    options: { host: redisHost, port: redisPort },
  },
  {
    name: 'CONTENT_CLIENT',
    transport: Transport.REDIS,
    options: { host: redisHost, port: redisPort },
  },
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.register(clientConfigs),
  ],
  controllers: [
    PreferencesController,
    LearningController,
    ProgressionController,
    ContentGatewayController,
  ],
  providers: [
    AuthTokenGuard,
    PreferencesService,
    LearningService,
    ProgressionService,
    ContentGatewayService,
  ],
})
export class AppModule {}
