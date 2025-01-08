import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchAndSaveParagraphText(url, directory, fileName) {
  try {
    // Fetch the page content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch the URL: ${response.statusText}`);
    }

    // Get the HTML content
    const html = await response.text();

    // Parse the HTML using jsdom
    const dom = new JSDOM(html);
    const paragraphs = dom.window.document.querySelectorAll('p');

    // Extract text content from all <p> tags
    const textContent = Array.from(paragraphs)
      .map((p) => p.textContent.trim())
      .filter((text) => text) // Remove empty strings
      .join('\n\n'); // Separate paragraphs with newlines

    // Define the directory and file path
    const dirPath = path.join(__dirname, directory);
    const filePath = path.join(dirPath, fileName);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Save the text content as a .txt file
    fs.writeFileSync(filePath, textContent, 'utf-8');
    console.log(`Paragraph text saved to ${filePath}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

async function fetchBulletin(url, directory) {
  try {
    // Fetch the main bulletin page
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch the main bulletin URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Parse the main page and get all links
    const dom = new JSDOM(html);
    const linkElements = dom.window.document.querySelectorAll(
      '#collapsibleNavbar > nav > ul a'
    );

    const baseURL = 'https://www.scu.edu/bulletin/undergraduate/';
    const links = Array.from(linkElements)
      .map((a) => {
        const href = a.getAttribute('href');
        return {
          href: href.startsWith('http') ? href : new URL(href, baseURL).href,
          text: a.textContent.trim(),
        };
      })
      .filter(({ href }) => href); // Filter out empty hrefs

    // Iterate over each link and fetch content
    for (const { href, text } of links) {
      console.log(`Processing: ${text} (${href})`);
      const safeFileName = text.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      await fetchAndSaveParagraphText(href, directory, `${safeFileName}.txt`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// URL to fetch the bulletin
const bulletinUrl = 'https://www.scu.edu/bulletin/undergraduate/';
fetchBulletin(bulletinUrl, 'bulletin');

