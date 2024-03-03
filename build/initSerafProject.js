"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSerafProject = void 0;
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var initSerafProject = function (data) {
    fs_1.default.mkdirSync(path_1.default.resolve(data.config.path, data.config.projectName));
};
exports.initSerafProject = initSerafProject;
