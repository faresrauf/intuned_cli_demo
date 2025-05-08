import { BrowserContext, Page } from "playwright-core";
import { extendPlaywrightPage } from "@intuned/sdk/playwright";

interface Params {
  bookFullUrl: string;
}

interface BookInfo {
  name: string;
  upc: string;
  numberOfReviews?: string;
}

export default async function handler(
  params: Params,
  _playwrightPage: Page,
  context: BrowserContext
) {
  const page = extendPlaywrightPage(_playwrightPage);

  try {
    console.log(`Navigating to book URL: ${params.bookFullUrl}`);
    await page.goto(params.bookFullUrl);
    await page.waitForLoadState("networkidle");
    
    console.log("Extracting book details...");
    
    // Extract book name from the page title
    const nameElement = page.locator(".product_main h1");
    const name = await nameElement.textContent() || "";
    
    // Extract UPC from the product information table
    // The UPC is in the first row of the table
    const upcElement = page.locator("table.table-striped tr:nth-child(1) td");
    const upc = await upcElement.textContent() || "";
    
    // Extract number of reviews
    const reviewsElement = await page.locator(".product_page .star-rating");
    let numberOfReviews = "";
    
    if (await reviewsElement.count() > 0) {
      // Get the parent element containing the review text
      const reviewsContainer = await page.locator(".product_page p:has-text('review')");
      if (await reviewsContainer.count() > 0) {
        numberOfReviews = await reviewsContainer.textContent() || "";
        // Extract just the number if possible
        const match = numberOfReviews.match(/(\d+)\s+review/);
        if (match && match[1]) {
          numberOfReviews = match[1];
        }
      }
    }
    
    const bookInfo: BookInfo = {
      name: name.trim(),
      upc: upc.trim()
    };
    
    // Only add numberOfReviews if it was found
    if (numberOfReviews) {
      bookInfo.numberOfReviews = numberOfReviews.trim();
    }
    
    console.log(`Successfully extracted details for book: ${name}`);
    return bookInfo;
    
  } catch (error) {
    console.error("Error extracting book details:", error);
    
    // Return partial data if possible or throw error
    try {
      // Attempt to at least get the name
      const emergencyName = await page.locator(".product_main h1").textContent() || "Unknown Book";
      
      return {
        name: emergencyName.trim(),
        upc: "Error retrieving UPC"
      };
    } catch (secondaryError) {
      throw new Error(`Failed to extract book details: ${error}`);
    }
  }
}