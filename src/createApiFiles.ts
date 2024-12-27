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
    packageName: "swagger-ui-express",
    projectPath: data.apiPath,
    version: "^5.0.1",
  })
  installNpmPackage({
    packageName: "@types/swagger-ui-express",
    projectPath: data.apiPath,
    version: "^4.1.7",
    dev: true
  })
  installNpmPackage({
    packageName: 'express',
    projectPath: data.apiPath,
    version: '^4.21.2'
  })

  installNpmPackage({
    packageName: 'cors',
    projectPath: data.apiPath,
    version: '^2.8.5'
  })
  installNpmPackage({
    packageName: '@types/cors',
    projectPath: data.apiPath,
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
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./../swagger.json";

import dotenv from 'dotenv'
dotenv.config()

const startServer = async () => {
  console.log('Starting server')
  try {
    
    await mongoose.connect(\`mongodb://\${process.env.MONGODB_HOST}:\${process.env.MONGODB_PORT}/\${process.env.MONGODB_DBNAME}\`)
    const app = express()
    app.use(cors())
    app.use(express.json())
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // BEGIN-ROUTES
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
  fs.writeFileSync(expressSetupPath, expressInitialSetup)

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
  dbConfig: IDbConfig,
  projectName: string
}) => {
  // Create API Folder
  console.log("Creating API folder")
  const apiPath = path.resolve(data.path, "api")
  fs.mkdirSync(apiPath)
  console.log(apiPath)
  const swaggerJsonPath = path.resolve(apiPath, "swagger.json")
  const swaggerJson = `
  {
  "openapi": "3.0.0",
    "info": {
      "title": "API ${data.projectName}",
      "version": "1.0.0",
      "description": ""
    },
    "servers": [
      {
        "url": "http://localhost:3333",
        "description": "Servidor local"
      }
    ],
    "paths": {
     
    
    },
    "components": {
      "schemas": {
        
      }
    }
  }
  
  `

  fs.writeFileSync(swaggerJsonPath, swaggerJson)

  // Create API src folder
  console.log("Creating API src folder")
  const srcPath = path.resolve(apiPath, "src")
  fs.mkdirSync(srcPath)

  console.log("Creating develop env config")
  setupDevEnv({
    projectPath: apiPath,
    dbConfig: data.dbConfig,
    serverPort: data.serverPort
  })

  console.log("Creating mongoose config")
  setupMongoose({
    apiPath: apiPath,
    dbConfig: data.dbConfig
  })
  console.log("Creating API common module")
  createApiModulesFiles({
    srcPath: srcPath
  })

  if (data.type === 'express') {
    console.log("Creating express config")
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



