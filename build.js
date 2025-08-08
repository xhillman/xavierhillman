import 'dotenv/config';
import fs from "fs";
import path from "path";
import { applyTemplate } from "./js/template.js";
import { loadCollection, parseMarkdownFile } from "./js/markdown.js";

const templatePath = "./templates/layout.html";
const layout = fs.readFileSync(templatePath, "utf-8");
const outputDir = "./dist";
const ENV = process.env.ENV || "DEV"; // DEV | PROD
const isDev = ENV.toUpperCase() !== "PROD";
const basePath = isDev ? "/dist" : "";
const assetPrefix = isDev ? "/dist" : "";

function buildStaticPages() {
  const pagesConfigPath = "./config/pages.json";
  const pagesMeta = JSON.parse(fs.readFileSync(pagesConfigPath, "utf-8"));

  // Build a quick lookup by the config's output filename to get title/description
  const metaByOutput = Object.fromEntries(
    pagesMeta.map((p) => [p.output, { title: p.title, description: p.description }])
  );

  console.log("Building static pages...");

  // Ensure base dist directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // 1) Home page -> /
  const homeMeta = metaByOutput["index.html"] || {};
  const homeSrc = fs.readFileSync("./index.html", "utf-8");
  const homeHtml = applyTemplate(layout, {
    pageTitle: homeMeta.title || "Home",
    metaDescription: homeMeta.description || "",
    basePath,
    assetPrefix,
    content: homeSrc,
  });
  fs.writeFileSync(path.join(outputDir, "index.html"), homeHtml);
  console.log("→ /");

  // 2) About page -> /about
  const aboutMeta = metaByOutput["about.html"] || {};
  const aboutSrc = fs.readFileSync("./about.html", "utf-8");
  const aboutHtml = applyTemplate(layout, {
    pageTitle: aboutMeta.title || "About",
    metaDescription: aboutMeta.description || "",
    basePath,
    assetPrefix,
    content: aboutSrc,
  });
  const aboutOutDir = path.join(outputDir, "about");
  fs.mkdirSync(aboutOutDir, { recursive: true });
  fs.writeFileSync(path.join(aboutOutDir, "index.html"), aboutHtml);
  console.log("→ /about");

  // 3) Blog index page -> /blog
  const blogMeta = metaByOutput["blog.html"] || {};
  const blogTemplate = fs.readFileSync("./templates/blog.html", "utf-8");
  const posts = loadCollection("./content/posts");
  const postsListHtml = posts
    .map(
      (p) =>
        `<li><a href="${basePath}/${p.slug}/">${p.title}</a>${
          p.date ? ` <small>${p.date.toISOString().slice(0, 10)}</small>` : ""
        }</li>`
    )
    .join("\n");
  const blogContent = applyTemplate(blogTemplate, { posts: postsListHtml });
  const blogHtml = applyTemplate(layout, {
    pageTitle: blogMeta.title || "Blog",
    metaDescription: blogMeta.description || "",
    basePath,
    assetPrefix,
    content: blogContent,
  });
  const blogOutDir = path.join(outputDir, "blog");
  fs.mkdirSync(blogOutDir, { recursive: true });
  fs.writeFileSync(path.join(blogOutDir, "index.html"), blogHtml);
  console.log("→ /blog");

  // 4) Projects index page -> /projects
  const projectsMeta = metaByOutput["projects.html"] || {};
  const projectsTemplate = fs.readFileSync("./templates/projects.html", "utf-8");
  const projects = loadCollection("./content/projects");
  const projectsListHtml = projects
    .map((p) => `<li><a href="${basePath}/projects/${p.slug}/">${p.title}</a></li>`)
    .join("\n");
  const projectsContent = applyTemplate(projectsTemplate, { projects: projectsListHtml });
  const projectsHtml = applyTemplate(layout, {
    pageTitle: projectsMeta.title || "Projects",
    metaDescription: projectsMeta.description || "",
    basePath,
    assetPrefix,
    content: projectsContent,
  });
  const projectsOutDir = path.join(outputDir, "projects");
  fs.mkdirSync(projectsOutDir, { recursive: true });
  fs.writeFileSync(path.join(projectsOutDir, "index.html"), projectsHtml);
  console.log("→ /projects");
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
    const { data, html } = parseMarkdownFile(filePath);

    // apply template
    // normalize slug (remove any leading/trailing slashes)
    const normalizedSlug = data.slug;

    const finalHtml = applyTemplate(layout, {
      ...data,
      basePath,
      assetPrefix,
      content: html,
    });

    // add post to dist folder
    const postDir = path.join(outputDir, normalizedSlug);
    fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, "index.html"), finalHtml);
    console.log(`→ /${normalizedSlug}`);
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
    const { data, html } = parseMarkdownFile(filePath);

    if (!data.title || !data.slug) {
      console.warn(`Skipping ${file}: Missing title or slug.`);
      return;
    }

    // normalize slug (remove any leading/trailing slashes)
    const normalizedSlug = data.slug;

    // apply template
    const finalHtml = applyTemplate(layout, {
      ...data,
      basePath,
      assetPrefix,
      content: html,
    });

    // add project to dist folder
    const projectOutDir = path.join(outputDir, normalizedSlug);
    fs.mkdirSync(projectOutDir, { recursive: true });
    fs.writeFileSync(path.join(projectOutDir, "index.html"), finalHtml);

    console.log(`→ /projects/${normalizedSlug}`);
  });
}

buildStaticPages();
buildBlogPosts();
buildProjects();
