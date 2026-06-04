import { execSync } from 'child_process';
import path from 'path';

try {
  console.log("Running database push directly...");
  const prismaCliPath = path.resolve('node_modules', 'prisma', 'build', 'index.js');
  execSync(`node "${prismaCliPath}" db push`, { stdio: 'inherit' });
  console.log("Database push complete.");
} catch (err) {
  console.error("Error pushing database:", err.message);
  process.exit(1);
}
