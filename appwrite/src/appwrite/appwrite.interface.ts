import { ID } from "node-appwrite";

export interface CreateUserDTO {
  name: string;
  email: string;
  passwordHash: string;
  username: string;
}

export interface UserDTO {
  id: string
  name: string,
  username: string,
  email: string,
  passwordHash: string,
  sessionId: string
  $createdAt: Date,
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