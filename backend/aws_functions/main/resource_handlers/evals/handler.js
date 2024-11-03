import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getDataExpirationDate } from "./utils/dates.js";
import { internalServerError, validResponse } from "../../utils/responses.js";
import { unsupportedMethodError } from "../../utils/responses.js";

const s3 = new S3Client({
  region: process.env.AWS_S3_BUCKET_REGION,
});

export async function handleEvalsRequest(event, context, userId) {
  if (event.httpMethod === "GET") return await handleGetEvalsRequest();
  else return unsupportedMethodError("evals", event.httpMethod);
}

async function handleGetEvalsRequest() {
  try {
    // Fetch the JSON file content from S3
    const command = new GetObjectCommand({
      Bucket: process.env.SCU_SCHEDULE_HELPER_BUCKET_NAME,
      Key: process.env.AGGREGATE_EVALS_JSON_OBJECT_KEY,
    });
    const data = await s3.send(command);
    return validResponse({
      data_expiration_date: getDataExpirationDate(),
      data: JSON.parse(await data.Body.transformToString()),
    });
  } catch (error) {
    console.error(`could not fetch evals JSON due to error ${error}`);
    return internalServerError(`could not fetch evals JSON due to error ${error}`);
  }
}
