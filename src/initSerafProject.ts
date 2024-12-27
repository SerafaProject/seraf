import fs from 'fs'
import path from 'path'

import { ISerafProjectConfig } from './types'
import { createApiFiles } from './createApiFiles'
import { performInstall } from './utils'







export const initSerafProject = (data: {
  config: ISerafProjectConfig,
  path: string
}) => {
  const projectPath = path.resolve(data.path, data.config.projectName)
  console.log("Creating project folder")
  fs.mkdirSync(projectPath)

  console.log("Creating seraf-project-config.json")
  const filePath = path.resolve(projectPath, `seraf-project-config.json`)
  fs.writeFileSync(filePath, JSON.stringify(data.config, null, 2))
  createApiFiles({
    path: projectPath,
    serverPort: data.config.api.serverPort,
    type: data.config.api.apiType,
    dbConfig: data.config.db,
    projectName: data.config.projectName
  })
}

