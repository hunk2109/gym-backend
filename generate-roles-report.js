const fs = require('fs');
const path = require('path');

function findControllers(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findControllers(filePath, fileList);
    } else if (filePath.endsWith('.controller.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const controllers = findControllers(path.join(__dirname, 'src', 'modules'));

let report = '# Distribución de Permisos por Roles en el Backend\n\n';

for (const controller of controllers) {
  const content = fs.readFileSync(controller, 'utf8');
  
  // Extract controller base path
  const controllerMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
  if (!controllerMatch) continue;
  const basePath = controllerMatch[1];
  
  // Find all methods with @Roles
  const methodRegex = /@(Get|Post|Put|Delete|Patch)\(['"]?([^'"]*)['"]?\)\s*(?:@(?:(?!@Roles)[\s\S])*?)?\s*@Roles\(([^)]+)\)\s*(?:@(?:(?!async)[\s\S])*?)?\s*async\s+([a-zA-Z0-9_]+)/g;
  
  const matches = [...content.matchAll(methodRegex)];
  if (matches.length > 0) {
    report += `## Módulo: \`/${basePath}\`\n\n`;
    report += '| Método | Ruta | Función | Roles Permitidos |\n';
    report += '|--------|------|---------|------------------|\n';
    
    for (const match of matches) {
      const httpMethod = match[1].toUpperCase();
      const subPath = match[2] ? `/${match[2]}` : '';
      const fullPath = `/${basePath}${subPath}`.replace(/\/\/+/g, '/');
      const functionName = match[4];
      const roles = match[3]
        .split(',')
        .map(r => r.trim().replace('UserRole.', ''))
        .join(', ');
        
      report += `| ${httpMethod} | \`${fullPath}\` | \`${functionName}()\` | ${roles} |\n`;
    }
    report += '\n';
  }
}

fs.writeFileSync('roles_report.md', report);
console.log('Report generated at roles_report.md');
