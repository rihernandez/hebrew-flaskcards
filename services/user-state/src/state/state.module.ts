import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { StateController } from './state.controller';
import { StateService } from './state.service';
import { StateItem, StateItemSchema } from './schemas/state-item.schema';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([{ name: StateItem.name, schema: StateItemSchema }]),
  ],
  controllers: [StateController],
  providers: [StateService, JwtStrategy],
})
export class StateModule {}
