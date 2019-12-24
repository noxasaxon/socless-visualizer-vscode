"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const yaml = require("js-yaml");
const path = require("path");
const vscode = require("vscode");
const fs = require("fs");
var FileFormat;
(function (FileFormat) {
    FileFormat[FileFormat["JSON"] = 0] = "JSON";
    FileFormat[FileFormat["YML"] = 1] = "YML";
})(FileFormat || (FileFormat = {}));
function getFileFormat(filePath) {
    switch (path.extname(filePath)) {
        case ".json": {
            return FileFormat.JSON;
        }
        case ".yml": {
            return FileFormat.YML;
        }
        default: {
            throw new Error("Unknown file format");
        }
    }
}
function readFile() {
    return __awaiter(this, void 0, void 0, function* () {
        const resource = vscode.window.activeTextEditor.document.uri;
        const document = yield vscode.workspace.openTextDocument(resource);
        return document.getText();
    });
}
function parseFileStructure(fileFormat, rawText) {
    try {
        switch (fileFormat) {
            case FileFormat.JSON: {
                return JSON.parse(rawText);
            }
            case FileFormat.YML: {
                return yaml.safeLoad(rawText);
            }
        }
    }
    catch (error) {
        throw new Error(`Error occured during parsing of file structure: ${error}`);
    }
}
function isStateFunctionDefinition(document) {
    return document.StartAt && document.States;
}
function getDefinition(document) {
    if (isStateFunctionDefinition(document)) {
        // return {
        //   StartAt: document.StartAt,
        //   States: document.States
        // };
        return document;
    }
    // Serverless file - take just first
    if (document.stepFunctions && document.stepFunctions.stateMachines) {
        const stateMachinesNames = Object.keys(document.stepFunctions.stateMachines);
        const firstName = stateMachinesNames[0];
        const stateMachineValue = document.stepFunctions.stateMachines[firstName];
        const isFileReference = typeof stateMachineValue === "string";
        if (isFileReference) {
            const [, filePath, stateMachineName] = stateMachineValue.match(/\$\{file\((.*)\):(.*)\}/);
            const absoluteFilePath = path.join(vscode.window.activeTextEditor.document.fileName, "..", filePath);
            const fileText = fs.readFileSync(absoluteFilePath, "utf-8");
            const stateMachines = parseFileStructure(FileFormat.YML, fileText);
            return stateMachines[stateMachineName].definition;
        }
        else {
            return document.stepFunctions.stateMachines[firstName].definition;
        }
    }
    // Serverless separate function declaration
    const flowName = Object.keys(document)[0];
    if (flowName &&
        document[flowName] &&
        document[flowName].definition &&
        isStateFunctionDefinition(document[flowName].definition)) {
        return document[flowName].definition;
    }
    throw new Error("Could not extract function definition");
}
function parse(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileFormat = getFileFormat(filePath);
        const rawData = yield readFile();
        const parsedData = parseFileStructure(fileFormat, rawData);
        const definition = getDefinition(parsedData);
        return definition;
    });
}
exports.default = parse;
//# sourceMappingURL=parse.js.map