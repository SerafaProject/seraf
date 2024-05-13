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
    projectPath: data.projectPath
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
    dev: true
  })

  installNpmPackage({
    packageName: "@types/node",
    projectPath: data.projectPath,
    dev: true
  })

  fs.writeFile(tsConfigPath, `
  {
    "compilerOptions": {
      "target": "es2016",
      "lib": [
        "es6"
      ],
      "module": "commonjs",
      "rootDir": "src",
      "moduleResolution": "node",
      "baseUrl": "src",
      "paths": {
        "@/*": [
          "*"
        ],
        "*": [
          "node_modules/*"
        ]
      },
      "resolveJsonModule": true,
      "allowJs": true,
      "outDir": "build",
      "esModuleInterop": true,
      "forceConsistentCasingInFileNames": true,
      "strict": true,
      "noImplicitAny": true,
      "skipLibCheck": true
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