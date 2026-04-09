import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Account, Client, ID, Query, TablesDB } from "node-appwrite";
import { CreateUserDTO, EmailDTOLoginMethod, IAppwriteService, LoginDTO, UserDTO, UserNameLoginMethod, UserTable } from './appwrite.interface';
import { error } from 'console';

import { hashPassword, verifyPassword } from '../auth/password';

@Injectable()
export class AppwriteService implements IAppwriteService {
  private client: Client;
  private table: TablesDB;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || "")
      .setProject(process.env.APPWRITE_PROJECT_ID || "")
      .setKey(process.env.APPWRITE_API_KEY || "");

    this.table = new TablesDB(this.client)
  }

  async createUser(body: CreateUserDTO): Promise<UserDTO> {
    try {
      // this.table.createTable()
      const uuid: string = ID.unique();
      const dto: UserDTO = {
        ...body,
        id: uuid,
        sessionId: ID.unique(), // Use ID.unique() instead of hardcoded string
        $createdAt: new Date(),
        $updatedAt: new Date(),
      }
      const { id, sessionId, $createdAt, $updatedAt, ...baseData } = dto

      await this.table.createRow({
        data: {
          ...baseData,
        },
        databaseId: "69d7a7ee0027a567ccec",
        tableId: "user",
        rowId: id
      });

      return {
        ...dto
      }
    } catch (error: unknown) {
      throw new Error("Failed to create user", {
        cause: error
      })
    }
  }

  async getUserByEmail(body: EmailDTOLoginMethod): Promise<UserDTO> {
    try {
      const dto = await this.table.listRows({
        databaseId: UserTable.databaseId,
        tableId: UserTable.tableId,
        queries: [
          Query.equal("email", body.email),
          Query.limit(1)
        ]
      })

      console.log(dto)

      return {
        id: dto.rows[0].id,
        name: dto.rows[0].name,
        username: dto.rows[0].username,
        email: dto.rows[0].email,
        passwordHash: dto.rows[0].passwordHash,
        sessionId: dto.rows[0].sessionId,
        $createdAt: new Date(dto.rows[0].$createdAt),
        $updatedAt: new Date(dto.rows[0].$updatedAt)
      }
    } catch (error: any) {
      throw new Error("Failed to error", {
        cause: error
      })
    }
  }

  async getUserByUserName(body: UserNameLoginMethod): Promise<UserDTO> {
    try {
      const { rows } = await this.table.listRows({
        databaseId: UserTable.databaseId,
        tableId: UserTable.tableId,
        queries: [
          Query.equal("username", body.userName),
        ]
      })

      if (!rows || rows.length === 0) {
        throw new Error("Invalid username or password");
      }

      const dto = rows[0]

      if (!verifyPassword(body.password, dto.passwordHash)) {
        throw new Error("Invalid username or password");
      }

      return {
        id: dto.id,
        name: dto.name,
        username: dto.username,
        email: dto.email,
        passwordHash: dto.passwordHash,
        sessionId: dto.sessionId,
        $createdAt: new Date(dto.$createdAt),
        $updatedAt: new Date(dto.$updatedAt)
      }

    } catch (error: any) {
      throw new Error("Failed to error", {
        cause: error
      })
    }
  }

  async checkEmailExist(emailStr: string): Promise<boolean> {
    const dto = await this.table.listRows({
      databaseId: UserTable.databaseId,
      tableId: UserTable.tableId,
      queries: [
        Query.equal("email", emailStr)
      ]
    })

    console.log(dto.rows)
    return dto.rows.length > 0
  }
}