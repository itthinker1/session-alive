const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 需要包含的文件和目录
const includePatterns = [
  'manifest.json',
  'background.js',
  'beep.wav',
  'translate.js',
  '_locales/**/*',
  'assets/**/*',
  'inject/**/*',
  'popup/**/*',
  'settings/**/*',
  'views/**/*'
];

// 需要排除的文件和目录
const excludePatterns = [
  '.git',
  '.DS_Store',
  'node_modules',
  'package.json',
  'package-lock.json',
  'build.js',
  'CLAUDE.md',
  'readme-resources',
  'README.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'LICENSE',
  'Privacy_Policy.md',
  'dist',
  '.zip'  // 排除所有 .zip 文件
];

function shouldInclude(relativePath) {
  // 检查是否在排除列表中
  for (const exclude of excludePatterns) {
    if (relativePath.startsWith(exclude) || relativePath.includes(exclude)) {
      return false;
    }
  }
  return true;
}

function getAllFiles(dir, basePath = '') {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

    if (!shouldInclude(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...getAllFiles(path.join(dir, entry.name), relativePath));
    } else if (entry.isFile()) {
      files.push({
        source: path.join(dir, entry.name),
        target: relativePath
      });
    }
  }

  return files;
}

async function build() {
  console.log('开始构建扩展包...');

  const version = require('./package.json').version;
  // 生成时间戳后缀，确保重复构建时文件名唯一
  const timestamp = Date.now();
  const outputName = `session-alive-v${version}-${timestamp}.zip`;
  const distDir = 'dist';

  // 确保 dist 目录存在
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log(`创建目录：${distDir}`);
  }

  const outputPath = path.join(distDir, outputName);
  console.log(`输出文件：${outputPath}`);

  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`\n构建成功！${outputPath} 已创建。`);
    const stats = fs.statSync(outputPath);
    console.log(`文件大小：${(stats.size / 1024).toFixed(2)} KB`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  const files = getAllFiles(__dirname);

  console.log(`找到 ${files.length} 个文件`);

  for (const file of files) {
    archive.file(file.source, { name: file.target });
    console.log(`添加：${file.target}`);
  }

  await archive.finalize();
}

build().catch(error => {
  console.error('构建失败：', error);
  process.exit(1);
});
