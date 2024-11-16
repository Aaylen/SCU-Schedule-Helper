import { handler } from "./index.js";
const JWT = process.env.TEST_JWT_SECRET;

//can add more parameters for testing. Only have friends since that was last thing to be added.
//recommend not to test everything at once if looking to bug fix. since console will be flooded with logs.
async function runTest() {
    const event = {
      requestContext: {
        http: {
          method: "PUT",
        },
      },
      headers: {
        authorization: `Bearer ${JWT}`,
      },
      body: JSON.stringify({
        preferences : {
            preferredSectionTimeRange: { startHour: 9, startMinute: 30, endHour: 6, endMinute: 30 },
            scoreWeighting: { scuEvals: 75, rmp: 25 },
            },
        friends: {
            add: ["swdean"],
            remove: ["u#1"],
        },
        friendRequests : {
            send: ["u#3"],
            removeIncoming: ["u#4"],
            removeOutgoing: ["u#5"],
        }
    }),
};
  
    try {
      const response = await handler(event, null);
      console.log("Put User Result:", response);
    } catch (error) {
      console.error("Error during putUser:", error);
    }
}
runTest();
  