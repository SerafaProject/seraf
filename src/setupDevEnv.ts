import path from 'path'
import fs from 'fs'
import { installNpmPackage } from './utils'

const setupTypescript = (data: {
  projectPath: string
}) => {
  const tsConfigPath = path.resolve(data.projectPath, `tsconfig.json`)
  const srcPath = path.resolve(data.projectPath, `src`)

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
  projectPath: string
}) => {
  setupTypescript({
    projectPath: data.projectPath
  })
}