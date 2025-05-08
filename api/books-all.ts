import { BrowserContext, Page } from "playwright-core";
import { extendPlaywrightPage } from "@intuned/sdk/playwright";
import { extendPayload } from "@intuned/sdk/runtime";

interface Params {
  // Add your params here
  maxBooks?: number;
}

interface Book {
  name: string;
  bookUrl: string;
}

export default async function handler(
  params: Params,
  _playwrightPage: Page,
  context: BrowserContext
) {
  // Extends playwright page with Intuned helpers
  const page = extendPlaywrightPage(_playwrightPage);
  
  // Set maximum number of books to scrape (default: all books on page)
  const maxBooks = params.maxBooks || Number.MAX_SAFE_INTEGER;

  try {
    console.log("Navigating to books.toscrape.com...");
    await page.goto("https://books.toscrape.com/");
    await page.waitForLoadState("networkidle");
    
    console.log("Extracting book data...");
    
    // Select all book containers on the page
    const bookElements = await page.locator("article.product_pod").all();
    console.log(`Found ${bookElements.length} books on the page`);
    
    const books: Book[] = [];
    
    // Process each book element up to the maximum specified
    for (let i = 0; i < Math.min(bookElements.length, maxBooks); i++) {
      const bookElement = bookElements[i];
      
      try {
        // Extract book title
        const titleElement = await bookElement.locator("h3 a");
        const name = await titleElement.getAttribute("title") || "";
        
        // Extract book URL
        const bookUrl = await titleElement.getAttribute("href") || "";
        
        // Add to results if we have valid data
        if (name && bookUrl) {
          books.push({
            name: name.trim(),
            bookUrl: bookUrl.trim()
          });
          
          console.log(`Extracted book: ${name}`);
        }
      } catch (error) {
        console.error(`Error extracting book ${i}:`, error);
      }
    }
    
    console.log(`Successfully extracted ${books.length} books`);
    
    // Schedule book-details API calls for each book
    books.forEach((book) => {
      // Determine full URL based on whether the book URL is relative or absolute
      const fullUrl = book.bookUrl.startsWith("http") 
        ? book.bookUrl 
        : `${new URL(book.bookUrl, page.url()).href}`;
        
      extendPayload({
        api: "book-details",
        parameters: {
          bookFullUrl: fullUrl,
        },
      });
      
      console.log(`Scheduled book-details API for: ${book.name}`);
    });
    
    return books;
  } catch (error) {
    console.error("Error in book scraping:", error);
    
    
    // Return empty array if scraping fails
    return [];
  }
}