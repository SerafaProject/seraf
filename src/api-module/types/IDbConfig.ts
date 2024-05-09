export type IDbConfig = {
  dbType: "mongodb" | "mysql"
  host: string
  port: number
  user: string
  password: string
  dbName: string
}
