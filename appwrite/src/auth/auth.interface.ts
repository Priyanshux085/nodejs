import { type Response } from "express";
import { EmailDTOLoginMethod } from "src/appwrite/appwrite.interface";
import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, MinLength } from "class-validator";

export class AuthDTO {
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;
};

export interface SessionDTO {
  session: string;
};

export interface IAuthController {
  registerUser(authDTO: AuthDTO, res: Response): Promise<SessionDTO | void>;
  loginUser(authDTO: EmailDTOLoginMethod, res: Response): Promise<SessionDTO | void>;
}
