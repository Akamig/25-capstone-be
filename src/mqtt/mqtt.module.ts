import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { ProtobufService } from '../protobuf/protobuf.service';

@Module({
  providers: [MqttService, ProtobufService],
  exports: [MqttService],
})
export class MqttModule {}