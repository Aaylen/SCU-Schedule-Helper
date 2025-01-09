import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchAndProcessText(url) {
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
    return Array.from(paragraphs)
      .map((p) => p.textContent.trim())
      .filter((text) => text) // Remove empty strings
      .join('\n\n'); // Separate paragraphs with newlines
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    return '';
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

    // Create the directory if it doesn't exist
    const dirPath = path.join(__dirname, directory);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Initialize an array to store chapter 2 content
    let chapter2Content = [];

    // Process all links
    for (const { href, text } of links) {
      console.log(`Processing: ${text} (${href})`);
      
      if (href.includes('chapter-2')) {
        // For chapter 2 content, collect it in the array
        const content = await fetchAndProcessText(href);
        chapter2Content.push(`=== ${text} ===\n\n${content}\n\n`);
      } else {
        // For other chapters, save individual files
        const content = await fetchAndProcessText(href);
        const safeFileName = text.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        fs.writeFileSync(
          path.join(dirPath, `${safeFileName}.txt`),
          content,
          'utf-8'
        );
        console.log(`Saved: ${safeFileName}.txt`);
      }
    }

    // If we have chapter 2 content, save it to a single file
    if (chapter2Content.length > 0) {
      const chapter2FilePath = path.join(dirPath, 'Chapter_2_Complete.txt');
      fs.writeFileSync(
        chapter2FilePath,
        chapter2Content.join('\n' + '='.repeat(50) + '\n\n'),
        'utf-8'
      );
      console.log(`Saved combined Chapter 2 content to Chapter_2_Complete.txt`);
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// URL to fetch the bulletin
const bulletinUrl = 'https://www.scu.edu/bulletin/undergraduate/';
fetchBulletin(bulletinUrl, 'bulletin');
