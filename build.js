import fs from "fs";
import path from "path";
import  {applyTemplate}  from "./js/template.js";
import matter from "gray-matter";
import { marked } from "marked";


const postsDir = "./content/posts";
const templatePath = "./templates/layout.html";
const outputDir = './dist';

fs.mkdirSync(outputDir, { recursive: true });

const layout = fs.readFileSync(templatePath, "utf-8");
const postFiles = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

console.log("Begin building posts...")
postFiles.forEach(post => {
    const filePath = path.join(postsDir, post);
    const fileContent = fs.readFileSync(filePath, "utf-8")
    const { data, content } = matter(fileContent);
    console.log(`Building post: ${data.title}`)
    const htmlContent = marked(content);
    const finalHtml = applyTemplate(layout, {
        ...data,
        content: htmlContent
    })
    const postDir = path.join(outputDir, data.slug);
    fs.mkdirSync(postDir, {recursive: true});
    fs.writeFileSync(path.join(postDir, "index.html"), finalHtml);
    console.log(`${data.slug} successfully built.`)
})