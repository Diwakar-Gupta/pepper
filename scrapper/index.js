import puppeteer from "puppeteer";
import { promises as fs } from "fs";

let browser = null;
let urlPrefix = "https://web.archive.org/web/20211018102323/";

const meta = [
  {
    name: "Level 1: DSA Fundamentals",
    link: "https://web.archive.org/web/20211018102323/https://pepcoding.com/resources/online-java-foundation/",
  },
  {
    name: "Level 2: LevelUp",
    link: "https://web.archive.org/web/20211018104938/https://pepcoding.com/resources/data-structures-and-algorithms-in-java-levelup/",
  },
  {
    name: "Level 3: Interview Preparation",
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

async function scrapTaskCode(page) {
  let detailDOMList = await page.$$("#resource > div.col.l12.s12.m8 > *");

  let name = await detailDOMList[0].evaluate((node) => node.innerText.trim());

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

  return {
    name,
    description,
    problemVideoLink,
  };
}

async function scrapSubModule(page) {
  let tasks = await page.$$("ul.resourceList>li");

  let taskList = [];
  for (let task of tasks) {
    let details = {};

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
          details["meta"] = await scrapTaskCode(taskpage);
        } catch (error) {
          details["meta"] = null;
        }
      } else {
        details["meta"] = null;
      }

      await taskpage.close();
    }
  }
  return taskList;
}

async function scrapModules(page) {
  let modules = await page.$$("ol>li");

  let results = [];

  for (let module of modules) {
    let moduleDetail = {};
    moduleDetail["name"] = await (
      await module.$(".collapsible-header")
    ).evaluate((node) => node.innerText.trim());

    let subModules = await module.$$("li");

    let subModuleList = [];
    moduleDetail["subModules"] = subModuleList;

    for (let subModule of subModules) {
      let subModuleDetail = {};

      subModuleDetail["name"] = await subModule.evaluate((node) =>
        node.innerText.trim()
      );
      subModuleDetail["link"] = await (
        await subModule.$("a")
      ).evaluate((node) => node.href);

      console.log("link is: ", subModuleDetail["link"]);

      const smpage = await browser.newPage();
      await smpage.goto(urlPrefix + subModuleDetail["link"], {
        waitUntil: "load",
        timeout: 0,
      });

      try {
        subModuleDetail["tasks"] = await scrapSubModule(smpage);
      } catch (error) {
        subModuleDetail["tasks"] = null;
      }

      await smpage.close();

      subModuleList.push(subModuleDetail);
    }
  }

  return results;
}

async function main() {
  browser = await puppeteer.launch({
    headless: false,
  });

  for (let { name, link } of meta) {
    const page = await browser.newPage();
    await page.goto(link, { waitUntil: "load", timeout: 0 });

    let resultList = await scrapModules(page);
    let levelDetails = {
      name: name,
      link: link,
      modules: resultList,
    };

    await page.close();

    await fs.writeFile(
      `scrappedData/{name}.json`,
      JSON.stringify(levelDetails, null, 2)
    );
  }
}

main();
