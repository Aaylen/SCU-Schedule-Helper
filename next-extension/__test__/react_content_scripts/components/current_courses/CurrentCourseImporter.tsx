import React, { useEffect, useState } from "react";
import { Fade } from "@mui/material";
import ProgressCard from "../shared/ProgressCard";
import {
  ACADEMIC_PERIOD_PATTERN,
  CourseData,
  updateUserCourseData,
} from "../shared/utils";

export default function CurrentCourseImporter({
  sendResponse = (response?: any) => {},
}) {
  const [shouldImport, setShouldImport] = useState(true);
  const [progressMessage, setProgressMessage] = useState(
    "Waiting for page load",
  );
  const [progressNumerator, setProgressNumerator] = useState(0);
  const [progressDenominator, setProgressDenominator] = useState(0);

  useEffect(() => {
    let lastTableCount = 0;
    let tableCountStable = false;

    const tableCountInterval = setInterval(() => {
      const tableCount = document.querySelectorAll("table").length;
      if (tableCount === lastTableCount && tableCount > 0) {
        if (tableCountStable) {
          clearInterval(tableCountInterval);
          let totalRows = getRelevantRowCount();
          let totalProgress = totalRows + Math.floor(totalRows / 10); // Account for the backend processing time.
          setProgressDenominator(totalProgress);
          setProgressMessage(`Processing course 0/${totalRows}`);
          processAllTables(
            () => incrementProgressNumerator(totalRows),
            setProgressMessage,
          ).then((error) => {
            if (error) {
              setProgressMessage(error);
              sendResponse(error);
            } else {
              setProgressNumerator(totalProgress);
              setProgressMessage("Successfully imported courses.");
              sendResponse("Successfully imported courses.");
              setTimeout(() => {
                setShouldImport(false);
              }, 1000);
            }
          });
        } else {
          tableCountStable = true;
        }
      } else {
        tableCountStable = false;
      }
      lastTableCount = tableCount;
    }, 100);
  }, []);

  function incrementProgressNumerator(totalRows: number) {
    setProgressNumerator((prev) => {
      const newValue = prev + 1;
      setProgressMessage(`Processing course ${newValue}/${totalRows}`);
      return newValue;
    });
  }

  return (
    <Fade appear={false} in={shouldImport} timeout={1000}>
      <div>
        <ProgressCard
          title={"Importing courses"}
          progressMessage={progressMessage}
          progressNumerator={progressNumerator}
          progressDenominator={progressDenominator}
        />
      </div>
    </Fade>
  );
}

async function processAllTables(
  incrementProgressNumerator: () => void,
  setProgressMessage: (message: string) => void,
) {
  const relevantTables = getRelevantTables();
  const academicPeriods = getAcademicPeriods();

  let results: CourseData[] = [];
  for (let i = 0; i < academicPeriods.length; i++) {
    const table = relevantTables[i];
    const rows = Array.from(
      table.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>,
    );
    const academicPeriod = academicPeriods[i].innerText.trim();
    for (const row of rows) {
      const courseData = extractCourseData(row, academicPeriod);
      if (courseData) {
        results.push(courseData);
        incrementProgressNumerator();
      }
    }
  }
  setProgressMessage("Uploading to profile...");
  return await updateUserCourseData(results);
}

function extractCourseData(
  row: HTMLTableRowElement,
  academicPeriod: string,
): CourseData {
  const tds = row.querySelectorAll("td");
  const courseName = tds[4].innerText.trim();
  let professor = tds[9].innerText.trim();
  const profIndexOfPipe = professor.indexOf("|");
  if (profIndexOfPipe !== -1) {
    professor = professor.substring(0, profIndexOfPipe).trim();
  }
  professor = professor.replace("\n\n\n", " & ");
  const match = academicPeriod.match(ACADEMIC_PERIOD_PATTERN);
  if (!match) {
    console.error(`Error: Could not parse academic period: ${academicPeriod}`);
  }
  return {
    courseName,
    professor,
    academicPeriod: match ? `${match[1]} ${match[2]}` : academicPeriod,
  };
}

function getRelevantTables(): HTMLTableElement[] {
  return Array.from(
    document.querySelectorAll(
      "table > caption",
    ) as NodeListOf<HTMLTableCaptionElement>,
  )
    .filter((caption) => caption.innerText === "My Enrolled Courses")
    .map((caption) => caption.parentElement as HTMLTableElement);
}

function getRelevantRowCount(): number {
  return getRelevantTables().reduce(
    (acc, table) => acc + table.querySelectorAll("tbody > tr").length,
    0,
  );
}

function getAcademicPeriods(): HTMLTableCaptionElement[] {
  return Array.from(
    document.querySelectorAll(
      "[data-automation-id='fieldSetLegendLabel'",
    ) as NodeListOf<HTMLTableCaptionElement>,
  ).filter((caption) => caption.innerText.match(/Winter|Spring|Summer|Fall/));
}
