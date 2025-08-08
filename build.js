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
    title: homeMeta.title || "Home",
    description: homeMeta.description || "",
    content: homeSrc,
  });
  fs.writeFileSync(path.join(outputDir, "index.html"), homeHtml);
  console.log("→ /");

  // 2) About page -> /about
  const aboutMeta = metaByOutput["about.html"] || {};
  const aboutSrc = fs.readFileSync("./about.html", "utf-8");
  const aboutHtml = applyTemplate(layout, {
    title: aboutMeta.title || "About",
    description: aboutMeta.description || "",
    content: aboutSrc,
  });
  const aboutOutDir = path.join(outputDir, "about");
  fs.mkdirSync(aboutOutDir, { recursive: true });
  fs.writeFileSync(path.join(aboutOutDir, "index.html"), aboutHtml);
  console.log("→ /about");

  // 3) Blog index page -> /blog
  const blogMeta = metaByOutput["blog.html"] || {};
  const blogTemplate = fs.readFileSync("./templates/blog.html", "utf-8");
  const postsDir = "./content/posts";
  const postFiles = fs.existsSync(postsDir)
    ? fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"))
    : [];
  const posts = postFiles
    .map((file) => {
      const filePath = path.join(postsDir, file);
      const { data } = matter(fs.readFileSync(filePath, "utf-8"));
      return {
        title: data.title || data.slug || file.replace(/\.md$/, ""),
        slug: data.slug,
        date: data.date ? new Date(data.date) : null,
      };
    })
    .filter((p) => p.slug);
  posts.sort((a, b) => {
    if (a.date && b.date) return b.date - a.date;
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return a.title.localeCompare(b.title);
  });
  const postsListHtml = posts
    .map(
      (p) =>
        `<li><a href="/${p.slug}/">${p.title}</a>${
          p.date ? ` <small>${p.date.toISOString().slice(0, 10)}</small>` : ""
        }</li>`
    )
    .join("\n");
  const blogContent = applyTemplate(blogTemplate, { posts: postsListHtml });
  const blogHtml = applyTemplate(layout, {
    title: blogMeta.title || "Blog",
    description: blogMeta.description || "",
    content: blogContent,
  });
  const blogOutDir = path.join(outputDir, "blog");
  fs.mkdirSync(blogOutDir, { recursive: true });
  fs.writeFileSync(path.join(blogOutDir, "index.html"), blogHtml);
  console.log("→ /blog");

  // 4) Projects index page -> /projects
  const projectsMeta = metaByOutput["projects.html"] || {};
  const projectsTemplate = fs.readFileSync("./templates/projects.html", "utf-8");
  const projectsDir = "./content/projects";
  const projectFiles = fs.existsSync(projectsDir)
    ? fs.readdirSync(projectsDir).filter((f) => f.endsWith(".md"))
    : [];
  const projects = projectFiles
    .map((file) => {
      const filePath = path.join(projectsDir, file);
      const { data } = matter(fs.readFileSync(filePath, "utf-8"));
      return {
        title: data.title || data.slug || file.replace(/\.md$/, ""),
        slug: data.slug,
      };
    })
    .filter((p) => p.slug);
  const projectsListHtml = projects
    .map((p) => `<li><a href="/projects/${p.slug}/">${p.title}</a></li>`)
    .join("\n");
  const projectsContent = applyTemplate(projectsTemplate, { projects: projectsListHtml });
  const projectsHtml = applyTemplate(layout, {
    title: projectsMeta.title || "Projects",
    description: projectsMeta.description || "",
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

buildStaticPages();
buildBlogPosts();
buildProjects();
