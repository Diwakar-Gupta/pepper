function e(e,s,l,t){Object.defineProperty(e,s,{get:l,set:t,enumerable:!0,configurable:!0})}var s=globalThis.parcelRequire17b7,l=s.register;l("5M0P5",function(l,t){Object.defineProperty(l.exports,"__esModule",{value:!0,configurable:!0}),e(l.exports,"default",()=>o);var r=s("ayMG0"),a=s("acw62"),d=s("lzNIT"),c=s("aphAM"),n=s("4pvZE"),i=s("6EoQy"),o=()=>{let{courseSlug:e,moduleSlug:s}=(0,c.useParams)(),[l,t]=(0,a.useState)(null);return((0,a.useEffect)(()=>{(async()=>{try{let l=await (0,n.default)(e,s);t(l)}catch(e){console.error("Error loading course:",e),setCourse(null)}})()},[s]),l)?(0,r.jsx)(i.default,{Component1:(0,r.jsxs)("div",{className:"bg-white shadow-md rounded-md",children:[(0,r.jsx)("h1",{className:"text-3xl font-bold mb-6 text-center",children:"DSA Questions"}),(0,r.jsxs)("table",{className:"w-full divide-y divide-gray-200",children:[(0,r.jsx)("thead",{children:(0,r.jsxs)("tr",{className:"bg-gray-200",children:[(0,r.jsx)("th",{className:"py-2 px-4",children:"Status"}),(0,r.jsx)("th",{className:"py-2 px-4",children:"Title"}),(0,r.jsx)("th",{className:"py-2 px-4",children:"Difficulty"})]})}),(0,r.jsx)("tbody",{children:l.map((e,s)=>(0,r.jsxs)("tr",{className:`${s%2==0?"bg-gray-50":"bg-white"} text-center`,children:[(0,r.jsx)("td",{className:"py-2 px-4",children:"-"}),(0,r.jsx)("td",{className:"py-2 px-4",children:(0,r.jsx)(d.Link,{to:`${e.slug}`,className:"text-blue-500 hover:underline",children:e.name})}),(0,r.jsx)("td",{className:"py-2 px-4",children:(0,r.jsx)("span",{className:`${"Easy"===e.difficulty?"bg-green-500":"Medium"===e.difficulty?"bg-yellow-500":"bg-red-500"} text-white px-2 py-1 rounded-full`,children:e.difficulty})})]},e.slug))})]})]})}):(0,r.jsx)("div",{children:"Course not found"})}}),l("4pvZE",function(l,t){e(l.exports,"default",()=>a);var r=s("7Yi7V"),a=async(e,s)=>{try{let l=await fetch(`${r.default}/database/courses/${e}/${s}.json`);if(!l.ok)throw Error("Failed to fetch course details");return await l.json()}catch(e){return console.error(e),null}}}),l("7Yi7V",function(s,l){e(s.exports,"default",()=>t);var t="/pepper"}),l("6EoQy",function(l,t){e(l.exports,"default",()=>d);var r=s("ayMG0");s("acw62");let a=(0,r.jsx)("div",{className:"flex justify-center items-center h-full",children:(0,r.jsx)("span",{children:"Nothing Here"})});var d=({Component1:e,Component2:s})=>(0,r.jsxs)("div",{className:"flex flex-col sm:flex-row gap-6 justify-center md:p-20 sm:p-2 bg-[#fcfcfd] h-full w-full",children:[(0,r.jsx)("div",{className:"grow shadow-md rounded-md bg-white",children:e||a}),(0,r.jsx)("div",{className:"sm:w-1/3 md:w-2/5 shadow-md rounded-md bg-white min-h-20",children:s||a})]})});
//# sourceMappingURL=ModuleDetailPage.a8bc76f6.js.map