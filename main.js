// Modules to control application life and create native browser window
const { app, BrowserWindow } = require("electron");
const path = require("path");
const $ = require("cheerio");
const Store = require("electron-store");
const store = new Store();
const puppeteer = require("puppeteer");
const { ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
const githubData = {
  'provider': 'github',
  'owner':    'FifthWye',
  'repo':     'auto-contests-participate',
  'token':    '401ecfdb63438bdc4c72154679a150aa662d8cc6'
};

autoUpdater.setFeedURL(githubData);
updater.autoDownload = false;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 500,
    icon: path.join(__dirname, "assets/icons/png/64x64.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.removeMenu();

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  mainWindow.webContents.on("did-finish-load", function() {
    if (
      store.get("username") &&
      store.get("password") &&
      store.get("puppeteerCookies")
    ) {
      mainWindow.webContents.send("inputs", "4");
    }
  });

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  autoUpdater.checkForUpdatesAndNotify();
  createWindow();
});

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function() {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

ipcMain.on("app_version", event => {
  event.sender.send("app_version", { version: app.getVersion() });
});

autoUpdater.on("update-available", () => {
  mainWindow.webContents.send("update_available");
});

autoUpdater.on("update-downloaded", () => {
  mainWindow.webContents.send("update_downloaded");
});

ipcMain.on("restart_app", () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on("reset", () => {
  store.delete("puppeteerCookies");
  mainWindow.webContents.send("log", "Account data was reset");
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const mainUrl = "https://lolzteam.net";
const contestsPage = "/forums/contests/"; //contests page
const loginUrl = "/login"; //login page

const puppeteerCookies = store.get("puppeteerCookies");
let contestsYouCantParticipate = [];

const chromium_path = puppeteer
  .executablePath()
  .replace("app.asar", "app.asar.unpacked");

if (puppeteerCookies) {
  ipcMain.on("inputs", async (event, arg) => {
    event.sender.send("log", "Start");
    if (arg == 1) {
      const browser0 = await puppeteer.launch({
        executablePath: chromium_path,
        headless: true
      });
      event.sender.send("log", "Creating page to work with.");
      const page = await browser0.newPage();
      event.sender.send("log", "Setting page cookies");
      await page.setCookie(...puppeteerCookies);
      event.sender.send(
        "log",
        "Downloading Home page to check if cookies are valid"
      );
      await page.goto(mainUrl, {
        waitUntil: "networkidle2"
      });
      event.sender.send("log", "Downloading contests page");
      await page.goto(mainUrl + contestsPage);
      await participateInCont(page, browser0);
      browser0.close();
      event.sender.send("log", "Finished now you participate in all contests");
    } else if (arg >= 2 && arg <= 5) {
      const browser1 = await puppeteer.launch({
        executablePath: chromium_path,
        headless: true
      });
      const interval =
        arg == 2 ? 60000 : arg == 3 ? 300000 : arg == 4 ? 1800000 : 3600000;
      const timeLeft =
        interval == 60000
          ? "1 min."
          : interval == 300000
          ? "5 min."
          : interval == 1800000
          ? "30 min."
          : "1 h.";
      event.sender.send("log", "Waiting " + timeLeft);
      let repeatFunc = setInterval(async () => {
        event.sender.send("log", "Creating page to work with.");
        const page = await browser1.newPage();
        event.sender.send("log", "Setting page cookies");
        await page.setCookie(...puppeteerCookies);
        event.sender.send(
          "log",
          "Downloading Home page to check if cookies are valid"
        );
        await page.goto(mainUrl, {
          waitUntil: "networkidle2"
        });
        event.sender.send("log", "Downloading contests page");
        await page.goto(mainUrl + contestsPage);
        event.sender.send(
          "log",
          "Going to participate in evrey avalible contest"
        );
        await participateInCont(page, browser1);
        event.sender.send(
          "log",
          "Finished now you participate in all contests"
        );
        event.sender.send("log", "\nWaiting " + timeLeft);
      }, interval);
      ipcMain.on("stop", (event, arg) => {
        if (arg == 1) {
          event.sender.send("log", "\nStop");
          clearInterval(repeatFunc);
          browser1.close();
        }
      });
    }
  });
} else {
  ipcMain.on("userData", async (event, arg) => {
    const username = arg.username; // arg.username;
    const password = arg.password; // arg.password;
    const browser2 = await puppeteer.launch({
      executablePath: chromium_path,
      headless: true
    });
    const page = await browser2.newPage();
    await page.goto(mainUrl + loginUrl, {
      waitUntil: "networkidle2"
    });

    //username
    await page.waitForSelector("[name='login']");
    await page.type("[name='login']", username);

    //password
    await page.keyboard.down("Tab");
    await page.keyboard.type(password);

    //we find the Login btn using the innerText comparison because the selector used for the btn might be unstable
    await page.evaluate(() => {
      let btns = [...document.querySelectorAll("input")];
      btns.forEach(function(btn) {
        if (btn.value == "Log in") btn.click();
      });
    });

    event.sender.send("log", "Trying to log in as " + username);

    try {
      await page.waitForSelector(".login_two_step", {
        timeout: 5000
      });
      store.set("username", username);
      store.set("password", password);
      event.sender.send("log", "Success. Please eneter code from email");
      event.sender.send("inputs", "3");
      await ipcMain.once("code", async (event, arg) => {
        let code = arg.code;
        await page.type("[name='code']", code);
        await page.click("[name='save']");
        await page.waitForSelector("#account-style");
        event.sender.send("log", "Success. Just logged in with code - " + code);
        event.sender.send("inputs", "4");
        await page.goto(mainUrl + contestsPage);
        await page.waitForSelector(".DiscussionListOptions");
        event.sender.send("log", "Moved to contests page");
        await page.select("select#ctrl_order", "post_date");
        const cookies = await page.cookies();
        store.set("puppeteerCookies", cookies);
        event.sender.send("log", "Filter contests by date");
        await participateInCont(page, browser2);
        browser2.close();
        event.sender.send(
          "log",
          "Finished now you participate in all contests"
        );
      });
    } catch (err) {
      event.sender.send("log", "Wrong user autentification data");
    }
  });
}

async function participateInCont(page, browser) {
  await autoScroll(page);
  mainWindow.webContents.send(
    "log",
    "Moved to the buttom of page to download more contests"
  );
  try {
    let contestsUrls = await page.evaluate(async () => {
      let mainDiv = document.getElementsByClassName(
        "latestThreads _insertLoadedContent"
      ).innerHTML;
      let urls = [];
      $("a.listBlock.main.PreviewTooltip", mainDiv).each(function() {
        var link = $(this).attr("href");
        let alreadyParticipate = $("h3.title i.fa", $(this)).length;
        if (!alreadyParticipate) {
          let fullLink = "https://lolzteam.net/" + link;
          urls.push(fullLink);
        }
      });
      return urls;
    });
    const page0 = await browser.newPage();
    if (contestsUrls.length == 0) {
      mainWindow.webContents.send(
        "log",
        "You already participate in every contest"
      );
    }

    //Filter contests user can't participate
    contestsUrls = contestsUrls.filter(function(el) {
      return !contestsYouCantParticipate.includes(el);
    });

    mainWindow.webContents.send(
      "log",
      "Amount of contests you don't participate - " + contestsUrls.length
    );

    for (let i1 = 0; i1 < contestsUrls.length; i1++) {
      await page0.goto(contestsUrls[i1], {
        waitUntil: "networkidle2"
      });
      try {
        await page0.waitForSelector(
          ".button.marginBlock.LztContest--Participate.primary"
        );
        await page0.click(
          ".button.marginBlock.LztContest--Participate.primary"
        );
        mainWindow.webContents.send(
          "log",
          "Success. Now you participate in contest - " + contestsUrls[i1]
        );

        await page0.waitForSelector(
          ".LztContest--alreadyParticipating.button.marginBlock.alreadyParticipate.disabled"
        );

        // await page0.click(".button.primary.marginBlock._participateNow");
        mainWindow.webContents.send(
          "log",
          "Success. Now you participate in contest - " + contestsUrls[i1]
        );
      } catch (err) {
        const alreadyInArray = contestsYouCantParticipate.includes(
          contestsUrls[i1]
        );
        mainWindow.webContents.send(
          "log",
          "Erorr. Skip contest. Not enougth likes to participate."
        );
        if (!alreadyInArray) {
          contestsYouCantParticipate.push(contestsUrls[i1]);
        }
      }
    }

    await page0.close();
    mainWindow.webContents.send("inputs", "5");
  } catch (error) {
    console.log(error);
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
