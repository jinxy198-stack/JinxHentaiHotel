const { app, BrowserWindow } = require("electron");
const path = require("node:path");

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 600,
        title: "JinxHentaiHotel",
        icon: path.join(__dirname, "build", "JinxLogo.png"),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    win.loadFile(path.join(__dirname, "/build/JinxHentaiHotel.html"));

    // Uncomment this while testing if you want dev tools.
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});