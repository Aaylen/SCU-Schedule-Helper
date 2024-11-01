import jwtLib from "jsonwebtoken";
import {
  GetAuthTokenResponse,
  OAuthInfo,
  unauthorizedErrorBody,
  validResponseBody,
} from "./model.js";

const ERRORS = {
  NO_HEADER: "no authorization header provided.",
  BAD_HEADER: "authorization header must provide an issued refresh token or a Google OAuth token.",
  GOOGLE_OAUTH_ERROR: "error fetching user info from Google",
  BAD_EMAIL: "invalid email (not in scu.edu).",
  EMAIL_NOT_VERIFIED: "invalid email (email is not verified).",
  BAD_REFRESH_TOKEN: "could not verify refresh token",
  INVALID_TOKEN_TYPE: "invalid token type (provided access token, expected refresh token)",
};

export async function handler(event, context) {
  const userAuthorization = await getUserAuthorization(event);
  if (!userAuthorization.isAuthorized) return unauthorizedErrorBody(userAuthorization.authError);
  else {
    let tokenResponse = new GetAuthTokenResponse();
    tokenResponse.accessToken = generateDataAccessToken(userAuthorization.userId);
    // 2 days less than a year (the actual expiration date), just to be safe :)
    let tokenExpDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 363);
    tokenResponse.accessTokenExpirationDate = getUnixTimestamp(tokenExpDate);
    if (userAuthorization.oAuthInfo != null) {
      tokenResponse.refreshToken = generateRefreshToken(userAuthorization.userId);
      tokenResponse.oAuthInfo = userAuthorization.oAuthInfo;
    }
    return validResponseBody(tokenResponse);
  }
}

/**
 *  Get the users information using authorization header.
 */
async function getUserAuthorization(event) {
  if (!event || !event.headers || !event.headers.authorization)
    return { isAuthorized: false, authError: ERRORS.NO_HEADER };
  const authorizationHeader = event.headers.authorization;
  const authType = authorizationHeader.split(" ")[0];
  if (authorizationHeader.split(" ").length !== 2 || !["OAuth", "Bearer"].includes(authType)) {
    return {
      isAuthorized: false,
      authError: ERRORS.BAD_HEADER,
    };
  }
  if (authType === "OAuth") return await verifyGoogleOAuthToken(authorizationHeader.split(" ")[1]);
  else if (authType === "Bearer")
    return await verifyRefreshToken(authorizationHeader.split(" ")[1]);
}

export function generateDataAccessToken(userId) {
  return jwtLib.sign({ sub: userId, type: "access" }, process.env.JWT_SECRET, { expiresIn: "1y" });
}

export function generateRefreshToken(userId) {
  return jwtLib.sign({ sub: userId, type: "refresh" }, process.env.JWT_SECRET, {
    expiresIn: "100y",
  });
}

async function verifyGoogleOAuthToken(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const personInfo = await response.json();

  if (personInfo.error) {
    return {
      isAuthorized: false,
      authError: `${ERRORS.GOOGLE_OAUTH_ERROR} (${personInfo.error_description})`,
    };
  } else if (personInfo.hd != "scu.edu") {
    return {
      isAuthorized: false,
      authError: ERRORS.BAD_EMAIL,
    };
  } else if (!personInfo.email_verified) {
    return {
      isAuthorized: false,
      authError: ERRORS.EMAIL_NOT_VERIFIED,
    };
  } else {
    return {
      userId: personInfo.email.split("@")[0],
      isAuthorized: true,
      oAuthInfo: new OAuthInfo(personInfo.email, personInfo.name, personInfo.picture),
    };
  }
}

async function verifyRefreshToken(refreshToken) {
  try {
    const token = jwtLib.verify(refreshToken, process.env.JWT_SECRET);
    if (token.type !== "refresh") {
      return {
        isAuthorized: false,
        authError: ERRORS.INVALID_TOKEN_TYPE,
      };
    }
    return { userId: token.sub, isAuthorized: true };
  } catch (error) {
    return {
      isAuthorized: false,
      authError: `${ERRORS.BAD_REFRESH_TOKEN} (${error}).`,
    };
  }
}

function getUnixTimestamp(date) {
  return Math.floor(date.getTime() / 1000);
}
