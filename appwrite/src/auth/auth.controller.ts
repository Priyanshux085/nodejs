import { Body, Controller, Post, Res } from '@nestjs/common';
import type { IAuthController, SessionDTO, AuthDTO } from './auth.interface';
import { AppwriteService } from 'src/appwrite/appwrite.service';
import { type Response } from 'express';
import { hashPassword } from './password';
import { type EmailDTOLoginMethod } from 'src/appwrite/appwrite.interface';

@Controller('auth')
export class AuthController implements IAuthController {
  constructor(
    private readonly appwriteService: AppwriteService
  ) { }

  @Post("/register")
  async registerUser(@Body() authDTO: AuthDTO, @Res() res: Response): Promise<SessionDTO | void> {
    try {
      const dto: AuthDTO = {
        ...authDTO,
      }

      const isEmailExist = await this.appwriteService.checkEmailExist(dto.email)
      console.log("isEmailExist", isEmailExist)

      if (isEmailExist) {
        res.status(400).json({
          ok: false,
          status: 400,
          error: "Email already exists"
        });

        return;
      }

      await this.appwriteService.createUser({
        username: dto.name,
        email: dto.email,
        name: dto.name,
        passwordHash: hashPassword(dto.password),
      });

      res.json({
        ok: true,
        data: dto,
      });
    } catch (error: any) {
      console.error(error);
      res.status(400).json({
        ok: false,
        error: error.message || "An unexpected error occurred",
        cause: error.cause?.name || "Unknown",
        response: error.cause?.response, // Extract true Appwrite error message
        statusCode: error.cause?.code || 500
      });
    }
  }

  @Post("/login")
  async loginUser(@Body() authDTO: EmailDTOLoginMethod, @Res() res: Response): Promise<SessionDTO | void> {
    try {
      const result = await this.appwriteService.getUserByEmail({
        email: authDTO.email,
        password: authDTO.password
      })

      res
        .status(200)
        .json({
          ok: true,
          data: result
        })
      return;
    } catch (error: any) {
      console.log(error)
      res.json({
        ok: false,
        error: error.message || "An unexpected error occured",
        cause: error.cause?.name || "Unknown",
      })
    }
  }
}