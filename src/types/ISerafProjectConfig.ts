import { IApiConfig, IDbConfig } from "../api-module"

export interface ISerafProjectConfig {
  projectName: string
  api: IApiConfig
  db: IDbConfig
}
