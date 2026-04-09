import { IS_ALPHANUMERIC, IsAlphanumeric, IsDate, IsEmail, IsNotEmpty, IsString, IsStrongPassword, IsUUID, MinLength } from "class-validator";

export class CreateUserDTO {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 3,
    minUppercase: 1,
    minSymbols: 1,
    minNumbers: 3
  })
  passwordHash: string;

  @IsNotEmpty()
  @IsAlphanumeric()
  @MinLength(6)
  username: string;
}

export class UserDTO extends CreateUserDTO {
  @IsString()
  id: string

  @IsUUID("5")
  sessionId: string

  @IsDate()
  $createdAt: Date

  @IsDate()
  $updatedAt: Date
}

export type UserNameLoginMethod = {
  userName: string,
  password: string
};

export type EmailDTOLoginMethod = {
  email: string,
  password: string
};

export type LoginDTO = UserNameLoginMethod | EmailDTOLoginMethod;

export interface IAppwriteService {
  createUser(body: CreateUserDTO): Promise<UserDTO>
  getUserByEmail(body: EmailDTOLoginMethod): Promise<UserDTO>
  getUserByUserName(body: UserNameLoginMethod): Promise<UserDTO>
  checkEmailExist(emailStr: string): Promise<boolean>
}

export const UserTable = {
  databaseId: process.env.APPWRITE_DATABASE_ID || "",
  tableId: "user"
}