"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
function _getHtmlForWebview(extensionPath, content) {
    const scriptPathOnDisk = vscode.Uri.file(path.join(extensionPath, "media", "main.js"));
    const scriptUri = scriptPathOnDisk.with({ scheme: "vscode-resource" });
    const nonce = getNonce();
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <style>
                html, body, div {
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                max-height: 100% !important;
                background-color: white !important;
                }
            </style>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
            <script nonce="${nonce}" src="${scriptUri}"></script>
            <div id="content">${content}</div>
        </body>
    </html>`;
}
exports._getHtmlForWebview = _getHtmlForWebview;
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
function renderError(error) {
    return `
      <div>
        <div>Some error occured:</div>
        <div>${JSON.stringify(error)}</div>
      </div>
    `;
}
exports.renderError = renderError;
//# sourceMappingURL=render.js.map