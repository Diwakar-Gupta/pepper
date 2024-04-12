import puppeteer from "puppeteer";

const meta = [
  {"name": "Level 1: DSA Fundamentals"", "link": "https://web.archive.org/web/20211018102323/https://pepcoding.com/resources/online-java-foundation/"},
  {"name": "Level 2: LevelUp", "link": "https://web.archive.org/web/20211018104938/https://pepcoding.com/resources/data-structures-and-algorithms-in-java-levelup/"},
  {"name": "Level 3: Interview Preparation", "link": "https://web.archive.org/web/20211018094739/https://pepcoding.com/resources/data-structures-and-algorithms-in-java-interview-prep"}
];

async function scrapModules(page, name, link) {
  
}

async function main() {
  
  let browser = await puppeteer.launch({
    headless: false,
  });

  for(let {name, link} of meta){

  const page = await browser.newPage();
    await page.goto(link, { waitUntil: "load", timeout: 0 });

    await scrapModules(page, name, link);
  }


}


main();

