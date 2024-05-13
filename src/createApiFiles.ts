import path from "path";
import fs from 'fs'
import { IApiConfig, IApiTypes, IDbConfig } from "./api-module";
import { createApiModulesFiles } from "./createApiModulesFiles";
import { appendDotenvVar, setupDevEnv } from "./setupDevEnv";
import { installNpmPackage } from "./utils";




const setupExpress = (data: {
  apiPath: string,
  srcPath: string,
  apiConfig: IApiConfig
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

  appendDotenvVar({
    projectPath: data.apiPath,
    key: 'SERVER_PORT',
    value: data.apiConfig.serverPort.toString()
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



const setupMongoose = (data: {
  apiPath: string,
  dbConfig: IDbConfig
}) => {
  installNpmPackage({
    packageName: 'mongoose',
    projectPath: data.apiPath
  })
  console.log("Setup Mongoose")
  console.log(data.apiPath)
  appendDotenvVar({
    projectPath: data.apiPath,
    key: 'MONGO_URL',
    value: `mongodb://${data.dbConfig.host}:${data.dbConfig.port}`
  })
}

export const createApiFiles = (data: {
  type: IApiTypes,
  path: string,
  serverPort: number,
  dbConfig: IDbConfig
}) => {
  // Create API Folder
  console.log("Create API Path")
  const apiPath = path.resolve(data.path, "api")
  fs.mkdirSync(apiPath)
  console.log(apiPath)
  
  // Create API src folder
  const srcPath = path.resolve(apiPath, "src")
  fs.mkdirSync(srcPath)

  
  setupDevEnv({
    projectPath: apiPath,
    dbConfig: data.dbConfig,
    serverPort: data.serverPort
  })


  setupMongoose({
    apiPath: apiPath,
    dbConfig: data.dbConfig
  })

  createApiModulesFiles({
    srcPath: srcPath
  })

  if (data.type === 'express') {
    setupExpress({
      apiPath: apiPath,
      srcPath: srcPath,
      apiConfig: {
        apiType: 'express',
        serverPort: data.serverPort
      }
    })
  } else {
    throw new Error(`Invalid ApiType ${data.type}`)
  }
}



