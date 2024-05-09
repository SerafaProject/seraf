import path from "path";
import fs from 'fs'
import { IApiTypes, IDbConfig } from "./api-module";
import { createApiModulesFiles } from "./createApiModulesFiles";
import { setupDevEnv } from "./setupDevEnv";
import { installNpmPackage } from "./utils";

export const createApiFiles = (data: {
  type: IApiTypes,
  path: string,
  serverPort: number,
  dbConfig: IDbConfig
}) => {
  const apiPath = path.resolve(data.path, "api")
  
  fs.mkdirSync(apiPath)
  const dotenvPath = path.resolve(apiPath, `.env`)

  fs.writeFile(dotenvPath, `
    MONGO_URL=mongodb://${data.dbConfig.host}:${data.dbConfig.port}
  `, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${dotenvPath}`);
    }
  });
  
  const srcPath = path.resolve(apiPath, "src")
  fs.mkdirSync(srcPath)
  
  installNpmPackage({
    packageName: 'express',
    projectPath: apiPath
  })


  installNpmPackage({
    packageName: '@types/express',
    projectPath: apiPath,
    dev: true
  })
  

  installNpmPackage({
    packageName: 'dotenv',
    projectPath: apiPath
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
    const expressInitialSetup =
      `
    import express from 'express';
    import mongoose from 'mongoose';
    import dotenv from 'dotenv';
    dotenv.config();

    const app = express();
    
    const port = ${data.serverPort};

    app.get('/', (req, res) => {
      res.send('Hello, World!');
    });


    app.listen(port, async () => {
      await mongoose.connect('mongodb://${data.dbConfig.host}:${data.dbConfig.port}')
      console.log(\`Server is listening at http://localhost:\${port}\`);
    });
    `;

    const expressSetupPath = path.resolve(srcPath, "expressSetup.ts")
    fs.writeFile(expressSetupPath, expressInitialSetup, (err) => {
      if (err) {
        console.error('Error writing file:', err);
      } else {
        console.log(`Code written to file: ${expressSetupPath}`);
      }
    });
  } else {
    throw new Error(`Invalid ApiType ${data.type}`)
  }
}
