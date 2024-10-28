// console.log("service_worker.js");

// (oauth_token !== undefined) => (user is authorized), (evals_expiration_date !== undefined) => (evals have been downloaded)

const defaults = {
  extendColorHorizontally: false,
  individualDifficultyColor: true,
  includeColor2: true,
  color1: "#00FF00",
  color2: "#FFFF00",
  color3: "#FF0000",
  opacity: 50, // 0-100
  useEvals: false,
};

const downloadEvalsUrl = "https://api.scu-schedule-helper.me/user"; // also in `manifest.json`

async function authorize() {
  try {
    await chrome.identity.clearAllCachedAuthTokens();
    const { token } = await chrome.identity.getAuthToken({
      interactive: true,
    });
    // console.log(await chrome.identity.getProfileUserInfo()); // DEBUG
    // const { email } = await chrome.identity.getProfileUserInfo(); // Gets email of user with the extension, not the user that just logged in
    // const domain = email.split('@')[1];
    const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });
    const userInfo = await response.json();
    const email = userInfo.email;
    const domain = userInfo.hd; // email.split('@')[1] for consistency with server?
    if (domain === "scu.edu") {
      // console.log('SCU email detected:', email); // DEBUG
      console.log(token); // DEBUG
      await chrome.storage.sync.set({ oauth_token: token });
      return [true, ""];
    } else {
      // console.log('Non-SCU email detected:', email); // DEBUG
      await fetch("https://accounts.google.com/o/oauth2/revoke?token=" + token);
      await chrome.identity.clearAllCachedAuthTokens();
      return [false, 'Authorization failed. Email does not end with "@scu.edu".'];
    }
  } catch (error) {
    return [false, "Authorization failed. User cancelled."];
  }
}

async function downloadEvals() {
  const { oauth_token: oAuthToken, access_token: accessToken } = await chrome.storage.sync.get([
    "oauth_token",
    "access_token",
  ]);
  const response = await fetch(downloadEvalsUrl, {
    method: "POST",
    headers: {
      Authorization: accessToken ? "Bearer " + accessToken : "OAuth " + oAuthToken,
    },
  });
  const data = await response.json();
  await chrome.storage.sync.set({ access_token: data.access_token });
  await chrome.storage.local.set({
    evals: data.data,
    evals_expiration_date: data.data_expiration_date,
  });
//   console.log("evals", data.data); // DEBUG
}

async function downloadEvalsIfNeeded() {
  const { oauth_token: oAuthToken } = await chrome.storage.sync.get("oauth_token");
  const { evals_expiration_date: evalsExpirationDate } = await chrome.storage.local.get(
    "evals_expiration_date"
  );
  if (oAuthToken && (evalsExpirationDate === undefined || evalsExpirationDate < new Date())) {
    await downloadEvals();
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log("service_worker.js received message:", request); // DEBUG

  if (request.url !== undefined) {
    fetch(request.url)
      .then((response) => response.text())
      .then((data) => sendResponse(data))
      .catch((error) => console.error(error));
    return true;
  }

  switch (request) {
    case "settingsChanged":
      chrome.tabs.query({}, (tabs) => {
        for (let tab of tabs) {
          if (tab.url && tab.url.startsWith("https://www.myworkday.com/scu/")) {
            chrome.tabs.sendMessage(tab.id, "settingsChanged", (response) => {
              if (chrome.runtime.lastError) {
              } // ignore
            });
          }
        }
      });
      break;

    case "getDefaults":
      sendResponse(defaults);
      break;

    case "authorize":
      authorize().then(([authorized, failStatus]) => sendResponse([authorized, failStatus]));
      return true; // Keep the message channel open for asynchronous response

    case "downloadEvals":
      downloadEvals().then(() => sendResponse());
      return true;

    case "downloadEvalsIfNeeded":
      downloadEvalsIfNeeded().then(() => sendResponse());
      return true;

    // case 'checkIfAuthorized':
    //     chrome.storage.sync.get('oauth_token', ({ oauth_token: oAuthToken }) => {
    //         sendResponse(oAuthToken !== undefined);
    //     });
    //     return true;
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.url.startsWith("https://www.myworkday.com/scu/")) {
      chrome.tabs.sendMessage(activeInfo.tabId, "settingsChanged", (response) => {
        if (chrome.runtime.lastError) {
        } // ignore
      });
    }
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.sync.get("oauth_token", ({ oauth_token: oAuthToken }) => {
    if (!oAuthToken) {
      chrome.tabs.create({ url: chrome.runtime.getURL("tab/tab.html") });
    }
  });
  if (details.reason == "install") {
    chrome.storage.sync.set(defaults);
  }
  // else if (details.reason == "update") {}
});

// Download evals on startup if download was interrupted, or evals are expired
chrome.runtime.onStartup.addListener(() => {
  downloadEvalsIfNeeded();
});
