import path from "path";
import fs from 'fs'
import { IApiTypes, IDbConfig } from "./api-module";
import { createApiModulesFiles } from "./createApiModulesFiles";
import { setupDevEnv } from "./setupDevEnv";
import { installNpmPackage } from "./utils";


const setupApiDotenv = (data: {
  projectPath: string,
  dbConfig: IDbConfig,
  serverPort: number
}) => {
  installNpmPackage({
    packageName: 'dotenv',
    projectPath: data.projectPath
  })

  const dotenvPath = path.resolve(data.projectPath, `.env`)

  fs.writeFile(dotenvPath, `
    MONGO_URL=mongodb://${data.dbConfig.host}:${data.dbConfig.port}
    SERVER_PORT=${data.serverPort}
  `, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${dotenvPath}`);
    }
  });
}



const setupExpress = (data: {
  apiPath: string,
  srcPath: string
}) => {
  installNpmPackage({
    packageName: 'express',
    projectPath: data.apiPath
  })

  installNpmPackage({
    packageName: '@types/express',
    projectPath: data.apiPath,
    dev: true
  })

  const expressInitialSetup =
    `
import express, { Request, Response } from 'express'
import { envSetup } from '@/envSetup'
import mongoose from 'mongoose'
// import { exampleRoutes } from '@/application/example'
// import { userRoutes } from '@/application/user'
// import { sessionRoutes } from '@/application/session'
// import { videoRoutes } from '@/application/video'

const startServer = async () => {
console.log('Starting server')
try {
envSetup()
await mongoose.connect(process.env.MONGO_URL ?? '')
const app = express()
app.use(express.json())
// app.use('/example', exampleRoutes)
// app.use('/user', userRoutes)
// app.use('/session', sessionRoutes)
// app.use('/video', videoRoutes)

app.listen(process.env.SERVER_PORT, () => {
  console.log(\`Backend Template listening on port ${process.env.SERVER_PORT}\`)
})
console.log('MongoDB connected')
} catch (error) {
console.log(error)
}
}


startServer()
`;

  const expressSetupPath = path.resolve(data.srcPath, "expressSetup.ts")
  fs.writeFile(expressSetupPath, expressInitialSetup, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${expressSetupPath}`);
    }
  });

}

const addDotenvVar = (data: {
  projectPath: string,
  key: string,
  value: string
}) => {
  
}

export const createApiFiles = (data: {
  type: IApiTypes,
  path: string,
  serverPort: number,
  dbConfig: IDbConfig
}) => {
  // Create API Folder
  const apiPath = path.resolve(data.path, "api")
  fs.mkdirSync(apiPath)

  // Create DotEnv Files
  setupApiDotenv({
    projectPath: apiPath,
    dbConfig: data.dbConfig,
    serverPort: data.serverPort
  })

  // Create API src folder
  const srcPath = path.resolve(apiPath, "src")
  fs.mkdirSync(srcPath)

  setupExpress({
    apiPath: apiPath,
    srcPath: srcPath
  })


  installNpmPackage({
    packageName: 'mongoose',
    projectPath: apiPath
  })

  createApiModulesFiles({
    srcPath: srcPath
  })

  setupDevEnv({
    projectPath: apiPath
  })

  if (data.type === 'express') {
    setupExpress({
      apiPath: apiPath,
      srcPath: srcPath
    })
  } else {
    throw new Error(`Invalid ApiType ${data.type}`)
  }
}



