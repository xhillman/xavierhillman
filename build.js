import fs from "fs";
import path from "path";
import { applyTemplate } from "./js/template.js";
import matter from "gray-matter";
import { marked } from "marked";

const templatePath = "./templates/layout.html";
const layout = fs.readFileSync(templatePath, "utf-8");
const outputDir = "./dist";

function buildStaticPages() {
  const pagesConfigPath = "./config/pages.json";
  const pages = JSON.parse(fs.readFileSync(pagesConfigPath, "utf-8"));

  console.log("Building static pages...");

  pages.forEach((page) => {
    const srcHtml = fs.readFileSync(page.src, "utf-8");

    const finalHtml = applyTemplate(layout, {
      title: page.title,
      description: page.description,
      content: srcHtml,
    });

    const outputDir = path.dirname(page.out);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(page.out, finalHtml);

    console.log(`→ ${page.out}`);
  });
}

function buildBlogPosts() {
  const postsDir = "./content/posts";

  // create dist folder if not already created
  fs.mkdirSync(outputDir, { recursive: true });

  const postFiles = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

  // loop over blog post md files and create html version for dist
  console.log("Building blog post pages...");
  postFiles.forEach((post) => {
    // read and parse markdown
    const filePath = path.join(postsDir, post);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);
    const htmlContent = marked(content);

    // apply template
    const finalHtml = applyTemplate(layout, {
      ...data,
      content: htmlContent,
    });

    // add post to dist folder
    const postDir = path.join(outputDir, data.slug);
    fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, "index.html"), finalHtml);
    console.log(`→ ${data.slug}`);
  });
}

function buildProjects() {
  const projectsDir = "./content/projects";
  const outputDir = "./dist/projects";

  // create dist folder if not already created
  fs.mkdirSync(outputDir, { recursive: true });

  const projectFiles = fs
    .readdirSync(projectsDir)
    .filter((f) => f.endsWith(".md"));

  // loop over project md files and create html version for dist
  console.log("Building project pages...");
  projectFiles.forEach((file) => {
    // read and parse markdown
    const filePath = path.join(projectsDir, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");

    const { data, content } = matter(fileContent);

    if (!data.title || !data.slug) {
      console.warn(`Skipping ${file}: Missing title or slug.`);
      return;
    }

    const htmlContent = marked(content);

    // apply template
    const finalHtml = applyTemplate(layout, {
      ...data,
      content: htmlContent,
    });

    // add project to dist folder
    const projectOutDir = path.join(outputDir, data.slug);
    fs.mkdirSync(projectOutDir, { recursive: true });
    fs.writeFileSync(path.join(projectOutDir, "index.html"), finalHtml);

    console.log(`→ /projects/${data.slug}`);
  });
}

buildBlogPosts();
buildProjects();
