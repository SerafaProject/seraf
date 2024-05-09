"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSerafProject = void 0;
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var createApiFiles_1 = require("./createApiFiles");
var createProjectFolder = function (data) {
    fs_1.default.mkdirSync(path_1.default.resolve(data.projectPath));
};
var createConfigFile = function (data) {
    var filePath = path_1.default.resolve(data.path, "seraf-project-config.json");
    fs_1.default.writeFile(filePath, JSON.stringify(data.config, null, 2), function (err) {
        if (err) {
            console.error('Error writing file:', err);
        }
        else {
            console.log("Code written to file: ".concat(filePath));
        }
    });
};
var initSerafProject = function (data) {
    var projectPath = path_1.default.resolve(data.path, data.config.projectName);
    createProjectFolder({
        projectPath: projectPath
    });
    createConfigFile({
        path: projectPath,
        config: data.config
    });
    (0, createApiFiles_1.createApiFiles)({
        path: projectPath,
        serverPort: data.config.api.serverPort,
        type: data.config.api.apiType,
        dbConfig: data.config.db
    });
};
exports.initSerafProject = initSerafProject;
