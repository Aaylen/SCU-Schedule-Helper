import { fetchWithAuth, signIn, signOut } from "./utils/authorization.js";
import { prodServerUrl } from "./utils/constants.js";
import {
  downloadEvals,
  downloadProfessorNameMappings,
} from "./utils/evalsAndMappings.js";
import { handleNotification, subscribe } from "./utils/notifications.js";
import { getRmpRatings } from "./utils/rmp.js";
import {
  importCurrentCourses,
  deleteAccount,
  importCourseHistory,
  queryUserByName,
  refreshInterestedSections,
  refreshUserData,
  updateUser,
} from "./utils/user.js";
import { prodChatEndpoint } from "./utils/constants.js";

chrome.runtime.onInstalled.addListener((object) => {
  let internalUrl = chrome.runtime.getURL("landing_page/index.html");

  if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: internalUrl }, function (tab) {});
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.url !== undefined) {
    fetch(request.url)
      .then((response) => response.text())
      .then((data) => sendResponse(data))
      .catch((error) => console.error(error));
  }

  if (request.type === "updateUser") {
    updateUser(request.updateItems, request.allowLocalOnly || false).then(
      (response) => {
        sendResponse(response);
      },
    );
  }

  if (request.type === "getRmpRatings") {
    getRmpRatings(request.profName, false)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        console.error("RMP Rating Query Error:", error);
        sendResponse(null);
      });
  }

  if (request.type === "queryUserByName") {
    queryUserByName(request.name).then((response) => {
      sendResponse(response);
    });
  }

  if (request.type === "submitFeedback") {
    handleFeedbackSubmission(request.data).then((response) => {
      sendResponse(response);
    });
  }

  switch (request) {
    case "signIn":
      signIn().then((response) => {
        sendResponse(response);
      });
      break;
    case "signOut":
      signOut().then((response) => {
        sendResponse(response);
      });
      break;
    case "deleteAccount":
      deleteAccount().then((response) => {
        sendResponse(response);
      });
      break;
    case "downloadEvals":
      downloadEvals().then(() => {
        sendResponse();
      });
      break;
    case "importCurrentCourses":
      importCurrentCourses().then((response) => {
        sendResponse(response);
      });
      break;
    case "importCourseHistory":
      importCourseHistory().then((response) => {
        sendResponse(response);
      });
      break;

    case "runStartupChecks":
      runStartupChecks().then(() => {
        sendResponse();
      });
      break;
    default:
      break;
  }
  return true;
});

self.addEventListener("push", function (event) {
  console.log(
    `Push had this data: "${JSON.stringify(event.data.json(), null, 2)}"`,
  );
  handleNotification(event.data.json());
});

self.addEventListener("activate", async (event) => {
  // Set refresh date to 4 days from now.
  await chrome.storage.local.set({
    refreshSelfDataDate: new Date(
      Date.now() + 4 * 24 * 60 * 60 * 1000,
    ).getTime(),
  });
  await subscribe();
});

async function runStartupChecks() {
  const refreshSelfDataDate = (
    await chrome.storage.local.get("refreshSelfDataDate")
  ).refreshSelfDataDate;
  if (
    refreshSelfDataDate === undefined ||
    new Date() > new Date(refreshSelfDataDate)
  ) {
    await refreshUserData();
    await chrome.storage.local.set({
      refreshSelfDataDate: new Date(
        Date.now() + 4 * 24 * 60 * 60 * 1000,
      ).getTime(),
    });
  }
  // Check if the evals need to be redownloaded.
  await downloadEvals();
  await downloadProfessorNameMappings();
  // Check if we need to expire any interestedSections.
  await refreshInterestedSections();
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.type === 'chatMessage') {
    handleChatMessage(request.message, request.threadId)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ error: error.message }));
    return true; 
  }

  if (request.type === 'ping') {
    sendResponse({ status: 'alive' });
    return true;
  }

});



async function handleChatMessage(message, threadId, authorization) {
    console.log('Processing chat message:', { message, threadId });
    
    try {
    

        const response = await fetchWithAuth(prodChatEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                threadId
            })
        });

        console.log('API Response Status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const jsonResponse = await response.json();
        console.log('API Response Data:', jsonResponse);
        return jsonResponse;
    } catch (error) {
        console.error('Error in handleChatMessage:', error);
        return {
            error: error.message,
            statusCode: error.statusCode || 500
        };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'chatMessage') {
        handleChatMessage(request.message, request.threadId, request.authorization)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ 
                error: error.message,
                statusCode: error.statusCode || 500
            }));
        return true;
    }

    if (request.type === 'ping') {
        sendResponse({ status: 'alive' });
        return true;
    }
});