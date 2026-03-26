import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthTokenGuard } from '../auth/auth-token.guard';
import { ContentController } from './content.controller';
import { ContentRpcController } from './content.rpc.controller';
import { ContentService } from './content.service';
import { ConfigRecord, ConfigRecordSchema } from './schemas/config-record.schema';
import { LanguageRecord, LanguageSchema } from './schemas/language.schema';
import { TopicRecord, TopicSchema } from './schemas/topic.schema';
import { Word, WordSchema } from './schemas/word.schema';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_CLIENT',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
        },
      },
    ]),
    MongooseModule.forFeature([
      { name: Word.name, schema: WordSchema },
      { name: LanguageRecord.name, schema: LanguageSchema },
      { name: TopicRecord.name, schema: TopicSchema },
      { name: ConfigRecord.name, schema: ConfigRecordSchema },
    ]),
  ],
  controllers: [ContentController, ContentRpcController],
  providers: [ContentService, AuthTokenGuard],
})
export class ContentModule {}
