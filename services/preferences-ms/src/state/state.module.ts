import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StateController } from './state.controller';
import { StateService } from './state.service';
import { StateItem, StateItemSchema } from './schemas/state-item.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: StateItem.name, schema: StateItemSchema }])],
  controllers: [StateController],
  providers: [StateService],
})
export class StateModule {}
