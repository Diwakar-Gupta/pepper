# Pepper: DSA Learning Platform

**Pepper** is a static Data Structures and Algorithms (DSA) learning platform inspired by Pepcoding. It provides high-quality educational content and supports local code execution for hands-on practice.

## How It Works

1. Go to the website:  
   👉 [https://diwakar-gupta.github.io/pepper/](https://diwakar-gupta.github.io/pepper/)

2. To run code from the browser, you need to set up the **judge** on your computer.

3. Follow the steps in [`judge/README.md`](judge/README.md) to install and run it.

Once the judge is running, the website will automatically detect it and let you run or submit code.

---

## Repository Structure

- **frontend/** – The main web application, built with React and Parcel. Hosted at [diwakar-gupta.github.io/pepper](https://diwakar-gupta.github.io/pepper/).
- **judge/** – Local code execution backend supporting Java, Python, and C++. You **must run this locally** to enable code execution from the frontend.
- **scrapper/** – Tools for scraping course/problem data. Optional and used primarily for development or content updates.

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone git@github.com:Diwakar-Gupta/pepper.git
   cd pepper
   ```
2. **Install frontend dependencies and run the web app:**
Follow the steps in [`frontend/README.md`](frontend/README.md) to install and run it.
3. **Run the judge for local code execution:**
Follow the steps in [`judge/README.md`](judge/README.md) to install and run it.

## Subproject READMEs

- [frontend/README.md](frontend/README.md): Web app details, development, and deployment.
- [judge/README.md](judge/README.md): Local code execution backend setup and usage.

## License

This project is licensed under the [Apache License](LICENSE).
