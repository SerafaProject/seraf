import path from 'path'
import fs from 'fs'
import { installNpmPackage } from './utils'
import { IDbConfig } from './api-module'

/* 
MONGO_URL=
SERVER_PORT=${data.serverPort}
*/

export const appendDotenvVar = (data: {
  projectPath: string,
  key: string,
  value: string
}) => {
  // Lê o conteúdo atual do arquivo
    // Resolve the absolute path to the .env file
  const dotenvPath = path.resolve(data.projectPath, '.env');
    // Construct the string to append
  const entry = `${data.key}=${data.value}\n`;
    // Append the entry to the .env file
  fs.appendFileSync(dotenvPath, entry);

}



export const setupApiDotenv = (data: {
  projectPath: string,
  dbConfig: IDbConfig,
  serverPort: number
}) => {
  installNpmPackage({
    packageName: 'dotenv',
    projectPath: data.projectPath,
    version: '^16.4.7'
  })

  const dotenvPath = path.resolve(data.projectPath, `.env`)

  fs.writeFile(dotenvPath, ``, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${dotenvPath}`);
    }
  });
}

const setupTypescript = (data: {
  projectPath: string
}) => {
  const tsConfigPath = path.resolve(data.projectPath, `tsconfig.json`)

  installNpmPackage({
    packageName: "typescript",
    projectPath: data.projectPath,
    dev: true,
    version: '^5.7.2'
  })

  installNpmPackage({
    packageName: "@types/node",
    projectPath: data.projectPath,
    dev: true,
    version: '^22.10.2'
  })

  fs.writeFile(tsConfigPath, `
{
  "compilerOptions": {
    "target": "es5",                          
    "module": "commonjs",                    
    "lib": ["es6"],                     
    "allowJs": true,
    "outDir": "build",                          
    "rootDir": "src",
    "strict": true,         
    "noImplicitAny": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  }
}
  `, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${tsConfigPath}`);
    }
  });
}


export const setupDevEnv = (data: {
  projectPath: string,
  dbConfig: IDbConfig,
  serverPort: number
}) => {
  setupTypescript({
    projectPath: data.projectPath
  })
  setupApiDotenv({
    dbConfig: data.dbConfig,
    projectPath: data.projectPath,
    serverPort: data.serverPort
  })
}