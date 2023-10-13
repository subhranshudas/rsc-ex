import { parse } from "querystring";
import fs from 'fs-extra';
import path from 'path';

export const getPostData = (req) => {
    return new Promise((resolve, reject) => {
      try {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString(); // convert Buffer to string
        });
        req.on('end', () => {
          let output = ''

          if (req.headers['content-type'] === 'application/json') {
            output = JSON.parse(body)
          } else {
            output = parse(body)
          }

          resolve(output); // parse the body and resolve the promise
        });
      } catch (err) {
        reject(err);
      }
    });
  };


const dir = './comments';

export async function manageComments(slug, commentData) {
   
    const filePath = path.join(dir, `${slug}.json`);

    console.log("filepath: ", filePath)
  
    let data = [];
    if (await fs.pathExists(filePath)) {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      data = JSON.parse(fileContent);
    }
  
    data.push(commentData);
  
    // fs.outputFile will create the directory if it doesn't exist
    await fs.outputFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}


export async function readComments(slug) {
  const filePath = path.join(dir, `${slug}.json`);

  // Check if the file exists
  if (await fs.pathExists(filePath)) {
    // If the file exists, read and parse the JSON data
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return data;
  } else {
    // If the file doesn't exist, return an empty array or throw an error as per your requirement
    return [];
  }
}

export function getFormattedTimestamp(timestamp) {
  // Create a Date object from the timestamp
  const date = new Date(timestamp);

  // Define a function to format the date as required
  const options = {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour12: true, // Use 12-hour time format
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

