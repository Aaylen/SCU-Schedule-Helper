import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchAndProcessText(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch the URL: ${response.statusText}`);
    }

    const html = await response.text();

    const dom = new JSDOM(html);
    const paragraphs = dom.window.document.querySelectorAll('p');

    return Array.from(paragraphs)
      .map((p) => p.textContent.trim())
      .filter((text) => text) 
      .join('\n\n'); 
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    return '';
  }
}

function getFilenameFromUrl(url) {
  try {
    const baseURL = 'https://www.scu.edu/bulletin/undergraduate/';
    let filename = url.replace(baseURL, '');
    filename = filename.replace(/\/*$/, '');
    filename = filename.replace(/\//g, '_');
    filename = filename.replace(/html.*$/, '');
    filename = filename.replace(/[^\w\s-]/g, '');
    filename = filename.replace(/[_-]+$/, '');
    
    if (!filename) {
      filename = 'index';
    }
    
    return `${filename}.txt`;
  } catch (error) {
    return `page_${Date.now()}.txt`;
  }
}
async function fetchBulletin(url, directory) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch the main bulletin URL: ${response.statusText}`);
    }

    const html = await response.text();

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
      .filter(({ href }) => href); 

    const dirPath = path.join(__dirname, directory);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    let chapter2Content = [];

    for (const { href, text } of links) {
      console.log(`Processing: ${text} (${href})`);
      
      const content = await fetchAndProcessText(href);
      
      if (href.includes('chapter-2')) {
        chapter2Content.push(`=== ${href} ===\n\n${content}\n\n`);
      } else {
        const filename = getFilenameFromUrl(href);
        fs.writeFileSync(
          path.join(dirPath, filename),
          content,
          'utf-8'
        );
        console.log(`Saved: ${filename}`);
      }
    }

    if (chapter2Content.length > 0) {
      const chapter2FilePath = path.join(dirPath, 'chapter_2.txt');
      fs.writeFileSync(
        chapter2FilePath,
        chapter2Content.join('\n' + '='.repeat(50) + '\n\n'),
        'utf-8'
      );
      console.log('Saved combined Chapter 2 content to chapter_2.txt');
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

const bulletinUrl = 'https://www.scu.edu/bulletin/undergraduate/';
fetchBulletin(bulletinUrl, 'bulletin');