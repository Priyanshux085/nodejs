import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { AppwriteModule } from './appwrite/appwrite.module';
import { AuthController } from './auth/auth.controller';
import { ConfigModule } from '@nestjs/config';
import { AppwriteService } from './appwrite/appwrite.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    AppwriteModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env']
    }),
    AuthModule
  ],
  providers: [AppService, AppwriteService],
  controllers: [AuthController],
})

export class AppModule { }