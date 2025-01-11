const OpenAI = require('openai');
const jwt = require('jsonwebtoken');

const ERRORS = {
  NO_HEADER: "no authorization header provided.",
  BAD_HEADER: "authorization header must provide an issued access token.",
  INVALID_TOKEN_TYPE: "invalid token type (expected access token)",
  BAD_ACCESS_TOKEN: "could not verify access token",
};

function unauthorizedError(message) {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: message })
  };
}

async function handleWithAuthorization(event, context, handler) {
  const userAuthorization = getUserAuthorization(event);
  if (!userAuthorization.userId) {
    return unauthorizedError(userAuthorization.authError);
  }
  return await handler(event, context, userAuthorization.userId);
}

function getUserAuthorization(event) {
  if (!event || !event.headers || !event.headers.authorization) {
    return { authError: ERRORS.NO_HEADER };
  }
  const authorizationHeader = event.headers.authorization;
  const [authType, token] = authorizationHeader.split(' ');

  if (!token || authType !== 'Bearer') {
    return {
      authError: ERRORS.BAD_HEADER,
    };
  }
  return verifyAccessToken(token);
}

function verifyAccessToken(accessToken) {
  try {
    const token = jwt.verify(accessToken, process.env.JWT_SECRET);
    if (token.type !== 'access') {
      return {
        authError: ERRORS.INVALID_TOKEN_TYPE,
      };
    }
    return { userId: token.sub };
  } catch (error) {
    return {
      authError: `${ERRORS.BAD_ACCESS_TOKEN} (${error}).`,
    };
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

async function chatHandler(event, context, userId) {
  try {
    const body = JSON.parse(event.body);
    const { message, threadId } = body;

    let currentThreadId = threadId;

    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
    }

    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: message,
      metadata: { userId }
    });

    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: ASSISTANT_ID
    });

    let runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
    while (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed: ' + runStatus.last_error?.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
    }

    const messages = await openai.beta.threads.messages.list(currentThreadId);
    const lastMessage = messages.data[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        threadId: currentThreadId,
        message: lastMessage.content[0].text.value
      })
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
}

let handler = (event, context) => handleWithAuthorization(event, context, chatHandler);
module.exports = { handler }