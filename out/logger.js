"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
class Logger {
    log(data) {
        vscode.window.showInformationMessage(JSON.stringify(data));
    }
}
exports.default = new Logger();
//# sourceMappingURL=logger.js.map