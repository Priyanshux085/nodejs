import { type Response } from "express";
import { EmailDTOLoginMethod, LoginDTO } from "src/appwrite/appwrite.interface";

export interface AuthDTO {
  name: string;
  email: string;
  password: string;
};

export interface SessionDTO {
  session: string;
};

export interface IAuthController {
  registerUser(authDTO: AuthDTO, res: Response): Promise<SessionDTO | void>;
  loginUser(authDTO: EmailDTOLoginMethod, res: Response): Promise<SessionDTO | void>;
}
