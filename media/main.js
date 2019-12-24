(function() {
  const vscode = acquireVsCodeApi();

  window.addEventListener("message", event => {
    const contentHolderNode = document.getElementById("content");
    console.log("Message arrived");

    const message = event.data;

    switch (message.command) {
      case "UPDATE":
        contentHolderNode.innerHTML = message.data;
        break;
    }
  });
})();
