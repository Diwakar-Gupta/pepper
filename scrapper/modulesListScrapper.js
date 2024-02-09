data = {};
data["categorys"] = [];
data["slug"] = window.location.href.substring(
  window.location.href.lastIndexOf("/") + 1,
);
if (data["slug"].length == 0) {
  const link = window.location.href.substring(
    0,
    window.location.href.length - 1,
  );
  data["slug"] = link.substring(link.lastIndexOf("/") + 1);
}
a = document.querySelector(
  "body > main > div.container.med > div > div > div.col.l8.s12.m12 > div > div > ol",
);

for (let c1 of a.children) {
  category = {};
  category["name"] = c1.children[0].innerText.trim();
  category["topics"] = [];

  for (let topicDom of c1.children[1].querySelectorAll("li")) {
    let topic = {};
    topic["name"] = topicDom.innerText.trim();
    topic["slug"] = topic["name"]
      .toLowerCase()
      .replaceAll(" ", "-")
      .replaceAll(",", "");

    category["topics"].push(topic);
  }

  data["categorys"].push(category);
}

console.log(JSON.stringify(data));
