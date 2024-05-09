import fs from 'fs'
import path from 'path'

import { ISerafProjectConfig } from './types'
import { createApiFiles } from './createApiFiles'
import { installNpmPackage } from './utils'


const createProjectFolder = (data: {
  projectPath: string
}) => {
  fs.mkdirSync(path.resolve(data.projectPath))
}

const createConfigFile = (data: {
  config: ISerafProjectConfig,
  path: string
}) => {
  const filePath = path.resolve(data.path, `seraf-project-config.json`)

  fs.writeFile(filePath, JSON.stringify(data.config, null, 2), (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${filePath}`);
    }
  });
}



export const initSerafProject = (data: {
  config: ISerafProjectConfig,
  path: string
}) => {
  const projectPath = path.resolve(data.path, data.config.projectName)

  createProjectFolder({
    projectPath: projectPath
  })




  createConfigFile({
    path: projectPath,
    config: data.config
  })

  createApiFiles({
    path: projectPath,
    serverPort: data.config.api.serverPort,
    type: data.config.api.apiType,
    dbConfig: data.config.db
  })
}

