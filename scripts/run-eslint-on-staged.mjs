import { execFileSync } from "node:child_process";

const files = process.argv.slice(2);

if (files.length === 0) {
  process.exit(0);
}

const projects = ["client", "tokenbound-client", "soroban-client"];

const groupedFiles = new Map(projects.map((project) => [project, []]));

for (const file of files) {
  const project = projects.find(
    (candidate) => file === candidate || file.startsWith(`${candidate}/`),
  );

  if (!project) {
    continue;
  }

  const relativePath = file.slice(project.length + 1);

  if (relativePath) {
    groupedFiles.get(project).push(relativePath);
  }
}

for (const [project, projectFiles] of groupedFiles.entries()) {
  if (projectFiles.length === 0) {
    continue;
  }

  execFileSync("npm", ["exec", "--", "eslint", ...projectFiles], {
    cwd: project,
    stdio: "inherit",
  });
}
