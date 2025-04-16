import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeatsModule } from './seats/seats.module';

@Module({
  imports: [SeatsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
