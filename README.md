# Auto-contests-participate
This app first logging using entered username \ password and automaticly participate in free contests.

App works in three steps: 

P.S. I removed big part of code ( sending arguments between proccesses, logging actions, ... ) from below examples just to explain how exactly puppeteer works on exact steps. Check main.js to see full code.

1) Singing in with passed parameters

```js
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

    //we find the Login btn using the innerText comparison because the 
    //selector used for the btn might be unstable
    await page.evaluate(() => {
      let btns = [...document.querySelectorAll("input")];
      btns.forEach(function(btn) {
        if (btn.value == "Log in") btn.click();
      });
    });

    try {
      await page.waitForSelector(".login_two_step", {
        timeout: 5000
      });
      let code = arg.code;
      await page.type("[name='code']", code);
      await page.click("[name='save']");
      await page.waitForSelector("#account-style");
```

2) Scraping the contests

```js
await page.goto(mainUrl + contestsPage);
await page.waitForSelector(".DiscussionListOptions");
await page.select("select#ctrl_order", "post_date");
//Filter contests by date
const cookies = await page.cookies();
await participateInCont(page, browser);
browser.close();
```


```js
async function participateInCont(page, browser) {
  await autoScroll(page);
  try {
    let contestsUrls = await page.evaluate(async () => {
      let mainDiv = document.getElementsByClassName(
        "latestThreads _insertLoadedContent"
      ).innerHTML;
      let urls = [];
      $("a.listBlock.main.PreviewTooltip", mainDiv).each(function() {
        var link = $(this).attr("href");
        let alreadyParticipate = $("h3.title i.fa", $(this)).length;
        //near contests you already participate there is an icon which shows that
        if (!alreadyParticipate) {
          let fullLink = mainUrl + "/" + link;
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
    //There is few rules for participating in different contests
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

        await page0.waitForSelector(
          ".LztContest--alreadyParticipating.button.marginBlock.alreadyParticipate.disabled"
        );
      } catch (err) {
        const alreadyInArray = contestsYouCantParticipate.includes(
          contestsUrls[i1]
        );
        if (!alreadyInArray) {
          contestsYouCantParticipate.push(contestsUrls[i1]);
        }
      }
    }

    await page0.close();
  } catch (error) {
    console.log(error);
  }
}
```

3) Just repeating participateInCont() function with set interval by user

Deploy settings 

On macOS/linux:

```
 export GH_TOKEN="<YOUR_TOKEN_HERE>"
```
On Windows, run in powershell:

```
 [Environment]::SetEnvironmentVariable("GH_TOKEN","<YOUR_TOKEN_HERE>","User")
```
