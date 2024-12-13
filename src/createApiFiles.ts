import path from "path";
import fs from 'fs'
import { IApiConfig, IApiTypes, IDbConfig } from "./api-module";
import { createApiModulesFiles } from "./apiModules";
import { appendDotenvVar, setupDevEnv } from "./setupDevEnv";
import { installNpmPackage } from "./utils";




const setupExpress = (data: {
  apiPath: string,
  srcPath: string,
  apiConfig: IApiConfig
}) => {
  installNpmPackage({
    packageName: 'express',
    projectPath: data.apiPath,
    version: '^4.21.2'
  })

  installNpmPackage({
    packageName: 'cors',
    projectPath:  data.apiPath,
    version: '^2.8.5'
  })
  installNpmPackage({
    packageName: '@types/cors',
    projectPath:  data.apiPath,
    version: '^2.8.17',
    dev: true
  })

  installNpmPackage({
    packageName: '@types/express',
    projectPath: data.apiPath,
    dev: true,
    version: '^5.0.0'
  })

  appendDotenvVar({
    projectPath: data.apiPath,
    key: 'SERVER_PORT',
    value: data.apiConfig.serverPort.toString()
  })

  const expressInitialSetup =
`
import cors from "cors"
import express from "express"
import mongoose from "mongoose"

const startServer = async () => {
  console.log('Starting server')
  try {
    
    await mongoose.connect(\`mongodb://\${process.env.MONGODB_HOST}:\${process.env.MONGODB_PORT}/\${process.env.MONGODB_DBNAME}\`)
    const app = express()
    app.use(cors())
    // BEGIN-ROUTES
    // app.use(express.json())
    // app.use('/example', exampleRoutes)
    // app.use('/track', trackRoutes)
    // app.use('/subject', subjectRoutes)
    // app.use('/question', questionRoutes)
    // app.use('/question-set', questionSetRoutes)
    // app.use('/topic', topicRoutes)
    //END-ROUTES

    // app.use('/user', userRoutes)

    app.listen(process.env.SERVER_PORT, () => {
      console.log(\`QuironStdAPI listening on port \${process.env.SERVER_PORT}\`)
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
    projectPath: data.apiPath,
    version: '^8.9.0'
  })
  console.log("Setup Mongoose")
  console.log(data.apiPath)
  appendDotenvVar({
    projectPath: data.apiPath,
    key: 'MONGODB_DBNAME',
    value: `${data.dbConfig.dbName}`
  })
  appendDotenvVar({
    projectPath: data.apiPath,
    key: 'MONGODB_HOST',
    value: data.dbConfig.host
  })
  appendDotenvVar({
    projectPath: data.apiPath,
    key: 'MONGODB_PORT',
    value: `${data.dbConfig.port}`
  })
  appendDotenvVar({
    projectPath: data.apiPath,
    key: 'MONGODB_USER',
    value: `${data.dbConfig.user}`
  })
  appendDotenvVar({
    projectPath: data.apiPath,
    key: 'MONGODB_PASSWORD',
    value: `${data.dbConfig.password}`
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



