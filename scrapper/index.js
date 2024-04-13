import puppeteer from "puppeteer";
import { promises as fs } from "fs";

let browser = null;
let urlPrefix = "https://web.archive.org/web/20211018102323/";

const meta = [
  {
    name: "dsa-fundamentals",
    link: "https://web.archive.org/web/20211018102323/https://pepcoding.com/resources/online-java-foundation/",
  },
  {
    name: "levelup",
    link: "https://web.archive.org/web/20211018104938/https://pepcoding.com/resources/data-structures-and-algorithms-in-java-levelup/",
  },
  {
    name: "interview-prep",
    link: "https://web.archive.org/web/20211018094739/https://pepcoding.com/resources/data-structures-and-algorithms-in-java-interview-prep",
  },
];

async function getTaskType(task) {
  if (await task.$(".desc-icon>.svg-video")) {
    return "Video";
  } else if (await task.$(".desc-icon>.fa-code")) {
    return "Code";
  } else {
    return null;
  }
}

async function scrapTaskCode(page, parentSlug) {
  let detailDOMList = await page.$$("#resource > div.col.l12.s12.m8 > *");

  let name = await detailDOMList[0].evaluate((node) => node.innerText.trim());
  let slug = cleanString(name);
  slug = `${parentSlug}-${slug}`;

  let description = "";
  for (let i = 4; i < detailDOMList.length; i++) {
    description += await detailDOMList[i].evaluate((node) =>
      node.innerText.trim()
    );
    description += "\n";
  }

  let problemVideoLink = await (
    await page.$("#videoId")
  ).evaluate((node) => node.value);

  let solutionVideolink = await (
    await page.$("#solutionContainer iframe")
  ).evaluate((node) => node.src);

  let filePath = `scrappedData/problems/${slug}.json`;

  let payload = {
    name,
    slug,
    description,
    externalPlatforms: [],
    problemVideoLink,
    solutionVideolink,
  };

  await fs.writeFile(filePath, JSON.stringify(payload, null, 2));

  console.log("Wrote to file: ", filePath);

  return payload;
}

async function scrapSubModule(page, filePath, mySlug) {
  let tasks = await page.$$("ul.resourceList>li");

  let taskList = [];
  for (let task of tasks) {
    let name = await task.evaluate((node) => node.innerText.trim());
    let slug = cleanString(name);
    let type = await getTaskType(task);
    let link = await (await task.$("a")).evaluate((node) => node.href);

    if (type === "Code") {
      const taskpage = await browser.newPage();
      let response = await taskpage.goto(urlPrefix + link, {
        waitUntil: "load",
        timeout: 0,
      });

      if (response.status() === 200) {
        try {
          let meta = await scrapTaskCode(taskpage, mySlug);
          name = meta.name;
          slug = meta.slug;
        } catch (error) {
          console.error(`ERROR: task: ${slug}`, error);
        }
      } else {
      }

      await taskpage.close();

      taskList.push({
        type,
        slug,
        name,
      });
    }
  }
  await fs.writeFile(filePath, JSON.stringify(taskList, null, 2));

  console.log("Wrote to file: ", filePath);
}

async function scrapModules(page, folderPath) {
  let modules = await page.$$("ol>li");

  let results = [];

  async function processModule(module) {
    let moduleDetail = {};
    results.push(moduleDetail);

    moduleDetail["name"] = await (
      await module.$(".collapsible-header")
    ).evaluate((node) => node.innerText.trim());

    let subModules = await module.$$("li");

    let subModuleList = [];
    moduleDetail["topics"] = subModuleList;

    async function processSubModule(subModule) {
      let name = await subModule.evaluate((node) => node.innerText.trim());
      let slug = cleanString(name);

      subModuleList.push({
        name,
        slug,
      });

      let link = await (await subModule.$("a")).evaluate((node) => node.href);

      const smpage = await browser.newPage();
      await smpage.goto(urlPrefix + link, {
        waitUntil: "load",
        timeout: 0,
      });

      try {
        await scrapSubModule(smpage, `${folderPath}/${slug}.json`, slug);
      } catch (error) {
        console.error(`ERROR: ${submodule}: ${slug}`, error);
      }

      await smpage.close();
    }

    let promises = subModules.map(async (subModule) => {
      return processSubModule(subModule);
    });
    await Promise.all(promises);
  }

  let promises = modules.map(async (module) => {
    return processModule(module);
  });
  await Promise.all(promises);

  return results;
}

function cleanString(inputString) {
  // Remove all characters except alphabets and digits
  const cleanedString = inputString.replace(/[^a-zA-Z0-9]+/g, "-");
  return cleanedString.toLowerCase();
}

async function main() {
  browser = await puppeteer.launch({
    headless: false,
  });

  fs.mkdir("scrappedData/courses/", { recursive: true });
  fs.mkdir("scrappedData/problems/", { recursive: true });

  for (let { name, link } of meta) {
    let folderPath = `scrappedData/courses/${cleanString(name)}`;

    fs.mkdir(folderPath, { recursive: true });

    const page = await browser.newPage();
    await page.goto(link, { waitUntil: "load", timeout: 0 });

    let resultList = await scrapModules(page, folderPath);
    let levelDetails = {
      name: name,
      categorys: resultList,
    };

    await page.close();

    let filePath = `scrappedData/courses/${name}.json`;
    await fs.writeFile(filePath, JSON.stringify(levelDetails, null, 2));

    console.log("Wrote to file: ", filePath);
  }
}

main();
