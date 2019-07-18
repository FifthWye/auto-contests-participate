// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
  // 1 - success autentification data is valid
  // 2 - erorr autentification data isn't valid
  // 3 - enter code from main
  // 4 - authentication finished

  ipcRenderer.on("inputs", (event, arg) => {
    switch (arg) {
      case "1":
        //logging in
        break;
      case "2":
        //wrong data
        break;
      case "3":
        document.getElementById("userData").style.display = "none";
        document.getElementById("authenticationCode").style.display = "block";
        document.getElementById("panel").style.display = "none";
        break;
      case "4":
        document.getElementById("userData").style.display = "none";
        document.getElementById("authenticationCode").style.display = "none";
        document.getElementById("panel").style.display = "block";
        break;
      case "5":
        document.getElementById("start").disabled = false;
        break;
    }
  });

  // receive message from main.js
  ipcRenderer.on("log", (event, arg) => {
    let logsData = document.getElementById("logsData");
    logsData.value = logsData.value + arg + "\n";
    const textarea = document.getElementById("logsData");
    textarea.scrollTop = textarea.scrollHeight;
  });

  document.querySelector("#start").addEventListener("click", function() {
    const selectValue = document.getElementById("frequency").value;
    if (selectValue == 1) {
      document.getElementById("start").disabled = true;
      ipcRenderer.send("inputs", selectValue);
    } else if (selectValue >= 2 && selectValue <= 5) {
      document.getElementById("start").style.display = "none";
      document.getElementById("stop").style.display = "block";
      ipcRenderer.send("inputs", selectValue);
    }
  });

  document.querySelector("#stop").addEventListener("click", function() {
    ipcRenderer.send("stop", "1");
    document.getElementById("start").style.display = "block";
    document.getElementById("stop").style.display = "none";
  });

  document.querySelector("#submit").addEventListener("click", function() {
    let accData = {
      username: document.getElementById("username").value,
      password: document.getElementById("password").value
    };

    let logsData = document.getElementById("logsData");

    // send username to main.js
    ipcRenderer.send("userData", accData);

    logsData.value = "Start \n";

    document.querySelector("#sendCode").addEventListener("click", function() {
      let code = {
        code: document.getElementById("code").value
      };
      ipcRenderer.send("code", code);
    });
  });
});
