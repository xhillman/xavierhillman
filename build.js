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

function cleanDist() {
  try {
    fs.rmSync(outputDir, { recursive: true, force: true });
  } catch (_) {
    // ignore
  }
}

function copyPublicAssets() {
  const publicDir = "./public";
  if (!fs.existsSync(publicDir)) return;
  try {
    // Node >=16.7 has cpSync
    if (typeof fs.cpSync === "function") {
      fs.cpSync(publicDir, outputDir, { recursive: true });
    } else {
      copyDirRecursive(publicDir, outputDir);
    }
  } catch (err) {
    console.warn("Asset copy failed:", err.message);
  }
}

function copyDirRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

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
    bodyClass: "page-home",
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
    bodyClass: "page-about",
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
        `<li><a href="${basePath}/blog/${p.slug}/">${p.title}</a>${
          p.date ? ` <small>${p.dateFormatted}</small>` : ""
        }</li>`
    )
    .join("\n");
  const blogContent = applyTemplate(blogTemplate, { posts: postsListHtml });
  const blogHtml = applyTemplate(layout, {
    pageTitle: blogMeta.title || "Blog",
    metaDescription: blogMeta.description || "",
    basePath,
    assetPrefix,
    bodyClass: "page-blog",
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
    bodyClass: "page-projects",
    content: projectsContent,
  });
  const projectsOutDir = path.join(outputDir, "projects");
  fs.mkdirSync(projectsOutDir, { recursive: true });
  fs.writeFileSync(path.join(projectsOutDir, "index.html"), projectsHtml);
  console.log("→ /projects");
}

function buildBlogPosts() {
  const postsDir = "./content/posts";
  const postTemplatePath = "./templates/post.html";
  const postTemplate = fs.existsSync(postTemplatePath)
    ? fs.readFileSync(postTemplatePath, "utf-8")
    : "{{content}}";

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

    const postWrapped = applyTemplate(postTemplate, { ...data, content: html });
    const finalHtml = applyTemplate(layout, {
      ...data,
      basePath,
      assetPrefix,
      content: postWrapped,
    });

    // add post to dist/blog folder
    const postDir = path.join(outputDir, "blog", normalizedSlug);
    fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, "index.html"), finalHtml);
    console.log(`→ /blog/${normalizedSlug}`);
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

function buildSitemapAndRobots() {
  const distRoot = path.resolve(outputDir);
  const urls = [];

  function pushUrl(relativePath) {
    const normalized = relativePath.replace(/\\/g, "/");
    urls.push(normalized);
  }

  // Walk dist for index.html files to create URL list
  function walk(dir, base = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(distRoot, full);
      if (entry.isDirectory()) {
        walk(full, path.join(base, entry.name));
      } else if (entry.isFile() && entry.name === "index.html") {
        const dirPath = path.dirname(rel);
        const normalizedDir = dirPath === "." ? "" : dirPath;
        // root index is "" -> "/"
        const urlPath = normalizedDir === "" ? "/" : `/${normalizedDir}/`;
        pushUrl(urlPath);
      }
    }
  }

  walk(distRoot);

  // Deduplicate and sort
  const uniqueUrls = Array.from(new Set(urls)).sort();

  // Base URL from env (optional), default to empty domain-less URLs
  const baseUrl = process.env.SITE_URL || ""; // e.g., https://example.com

  const sitemapXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...uniqueUrls.map((u) => `  <url><loc>${baseUrl}${u}</loc></url>`),
    '</urlset>'
  ].join("\n");

  fs.writeFileSync(path.join(outputDir, "sitemap.xml"), sitemapXml);

  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    baseUrl ? `Sitemap: ${baseUrl}/sitemap.xml` : ''
  ].filter(Boolean).join("\n");

  fs.writeFileSync(path.join(outputDir, "robots.txt"), robotsTxt);
}

cleanDist();
buildStaticPages();
buildBlogPosts();
buildProjects();
copyPublicAssets();
buildSitemapAndRobots();
