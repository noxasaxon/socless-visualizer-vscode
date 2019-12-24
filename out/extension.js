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
const vscode = require("vscode");
const parse_1 = require("./parsing/parse");
const visualize_1 = require("./visualize");
const logger_1 = require("./logger");
const path = require("path");
const render_1 = require("./rendering/render");
const util_1 = require("./util");
// import { StepFunction } from "./interfaces";
const apb_1 = require("./apb");
function updateContent(activeFilePath, panel) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("VSCE updateContent");
        let renderingResult;
        try {
            const document = yield parse_1.default(activeFilePath);
            const stepFunction = new apb_1.default(document).StateMachine;
            renderingResult = yield visualize_1.default(stepFunction);
        }
        catch (error) {
            renderingResult = render_1.renderError(error);
        }
        panel.webview.postMessage({
            command: "UPDATE",
            data: renderingResult
        });
    });
}
const updateContentDebounced = util_1.debounce(updateContent, 300);
function activate(context) {
    let disposable = vscode.commands.registerCommand("extension.showSOCless", () => __awaiter(this, void 0, void 0, function* () {
        const activeFilePath = vscode.window.activeTextEditor.document.uri
            .fsPath;
        const fileName = activeFilePath.split(/\/|\\/).reverse()[0];
        const resourceColumn = (vscode.window.activeTextEditor &&
            vscode.window.activeTextEditor.viewColumn) ||
            vscode.ViewColumn.One;
        const panel = vscode.window.createWebviewPanel(fileName, fileName, resourceColumn + 1, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, "media"))
            ]
        });
        try {
            const stepFunction = yield parse_1.default(activeFilePath);
            console.log('read sf: ');
            console.log(stepFunction);
            const renderedPlaybook = new apb_1.default(stepFunction).StateMachine;
            console.log(renderedPlaybook);
            // const renderingResult = await visualize(stepFunction);
            const renderingResult = yield visualize_1.default(renderedPlaybook);
            panel.webview.html = render_1._getHtmlForWebview(context.extensionPath, renderingResult);
        }
        catch (error) {
            console.log(error);
            logger_1.default.log(error);
        }
        vscode.workspace.onDidChangeTextDocument((event) => __awaiter(this, void 0, void 0, function* () {
            const isActiveDocumentEdit = event.document.uri.fsPath === activeFilePath;
            const hasSomethingChanged = event.contentChanges.length > 0;
            if (isActiveDocumentEdit && hasSomethingChanged) {
                updateContentDebounced(activeFilePath, panel);
            }
        }), null);
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case "alert":
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        }, null);
        panel.webview.postMessage({ command: "refactor" });
    }));
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map