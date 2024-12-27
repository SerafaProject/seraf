import * as fs from "fs";
import * as path from "path";
import { Project } from "ts-morph";
import * as prettier from "prettier";

// Caminho da pasta
const folderPath = path.resolve("api", "src"); // Substitua pelo caminho correto

// Função para encontrar todos os arquivos .ts na pasta
const findAllTsFiles = (dir: string): string[] => {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findAllTsFiles(filePath));
    } else if (filePath.endsWith(".ts") && !filePath.endsWith(".d.ts")) {
      results.push(filePath);
    }
  });
  return results;
};

// Formatar e corrigir imports
export const processFiles = async () => {
  // Configuração do projeto com tsconfig.json
  const project = new Project({
    tsConfigFilePath: path.resolve("api", "tsconfig.json"),
    skipAddingFilesFromTsConfig: true, // Adicionamos os arquivos manualmente
  });

  // Busca arquivos .ts na pasta
  const tsFiles = findAllTsFiles(folderPath);

  // Adiciona os arquivos ao projeto
  tsFiles.forEach((filePath) => project.addSourceFileAtPath(filePath));

  // Obter configurações do Prettier
  const prettierOptions = (await prettier.resolveConfig(path.resolve("api"))) || {
    parser: "typescript",
  };

  for (const sourceFile of project.getSourceFiles()) {
    // Corrigir imports ausentes
    sourceFile.fixMissingImports();

    // Organizar os imports
    sourceFile.organizeImports();

    // Salvar alterações antes de formatar
    await sourceFile.save();

    // Formatar com Prettier
    const formattedCode = await prettier.format(sourceFile.getFullText(), prettierOptions);

    // Sobrescrever o arquivo formatado
    fs.writeFileSync(sourceFile.getFilePath(), formattedCode, "utf8");
  }

  console.log("Todos os arquivos foram processados!");
};


