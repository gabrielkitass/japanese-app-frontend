// Node.js でSVGからPNGを生成するスクリプト
// 実行: node generate-icons.js
// 前提: npm install sharp（初回のみ）

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('sharp がインストールされていません。以下を実行してください：');
    console.error('  cd app/frontend/icons && npm install sharp');
    process.exit(1);
  }

  const svgPath = path.join(__dirname, 'icon-source.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  const sizes = [192, 512];
  for (const size of sizes) {
    const outPath = path.join(__dirname, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✅ icon-${size}.png を生成しました`);
  }
}

generateIcons().catch(console.error);
