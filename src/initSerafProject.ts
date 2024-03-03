import fs from 'fs'
import path from 'path'

export type IApiTypes = "express"
export type IDbTypes = "mongodb"

export interface ISerafProjectConfig {
  projectName: string
  api: IApiTypes
  db: IDbTypes
  path: string
}

export const initSerafProject = (data: {
  config: ISerafProjectConfig
}) => {
    fs.mkdirSync(path.resolve(data.config.path, data.config.projectName))
}