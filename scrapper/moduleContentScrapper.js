all = document.querySelector(
  "body > main > div.container.med > div > div > div.col.l8.s12.m12 > div > div > div.row.allResources.no-margin.no-padding > ul",
);
data = {};
data["slug"] = window.location.href.substring(
  window.location.href.lastIndexOf("/") + 1,
);
data["problems"] = [];

for (let row of all.children) {
  if (!row.querySelector(".fa-code")) {
    continue;
  }

  const name = row.innerText.trim();
  const difficultyDomClassList = row.querySelectorAll("span")[2].classList;

  let difficulty = "-";
  if (difficultyDomClassList.contains("easy")) {
    difficulty = "Easy";
  } else if (difficultyDomClassList.contains("medium")) {
    difficulty = "Medium";
  } else if (difficultyDomClassList.contains("hard")) {
    difficulty = "Hard";
  }

  const slug = name.toLowerCase().replaceAll(" ", "-");

  data["problems"].push({ name, difficulty, slug });
}

console.log(JSON.stringify(data));
