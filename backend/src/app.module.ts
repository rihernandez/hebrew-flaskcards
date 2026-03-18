import { Module } from '@nestjs/common';
import { WordsModule } from './words/words.module';

@Module({
  imports: [
    WordsModule,
  ],
})
export class AppModule {}
