import * as fs from 'fs';
import * as path from 'path';

function findPrismaFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            findPrismaFiles(filePath, fileList);
        } else if (file.endsWith('.prisma') && file !== 'schema.prisma' && file !== 'base.prisma') {
            fileList.push(filePath);
        }
    });

    return fileList;
}

function mergePrismaFiles(prismaFiles: string[]): string {
    const parts: string[] = [];

    prismaFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf-8').trim();
        if (content) {
            parts.push(content);
            parts.push('');
        }
    });

    return parts.join('\n');
}

function main() {
    const rootDir = path.join(__dirname, '..', '..');
    const prismaDir = path.join(rootDir, 'prisma');
    const modelsDir = path.join(rootDir, 'src', 'models');
    const outputFile = path.join(prismaDir, 'schema.prisma');

    const basePrisma = path.join(modelsDir, 'base.prisma');
    const modelFiles = findPrismaFiles(modelsDir);

    const allFiles = [basePrisma, ...modelFiles];

    console.log(`\n Found ${allFiles.length} .prisma file(s):`);
    allFiles.forEach((file) => {
        console.log(`   - ${path.relative(process.cwd(), file)}`);
    });

    console.log('\nMerging files...');
    const mergedContent = mergePrismaFiles(allFiles);

    fs.writeFileSync(outputFile, mergedContent, 'utf-8');

    console.log(`\n Successfully merged into: ${path.relative(process.cwd(), outputFile)}`);
}

try {
    main();
} catch (error) {
    process.exit(1);
}