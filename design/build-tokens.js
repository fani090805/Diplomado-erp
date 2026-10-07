#!/usr/bin/env node
'use strict';

/**
 * Genera los colores de web y Android desde design/tokens.json (única fuente).
 *
 *   node design/build-tokens.js           # escribe los dos archivos generados
 *   node design/build-tokens.js --check   # sólo verifica que estén al día (CI / pruebas)
 *
 * Salidas (NO se editan a mano):
 *   frontend/src/design-system/tokens/colors.generated.js  → GENERATED_COLORS (lo usa colors.js)
 *   android/app/src/main/java/com/diplomado/erp/ui/theme/ColorTokens.kt → object ColorTokens (lo usa Color.kt)
 *
 * Además verifica que Color.kt tenga un alias `val FaiX = ColorTokens.X` por
 * cada token con nombre `android` (así los nombres que usa el código no cambian).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOKENS = path.join(__dirname, 'tokens.json');
const WEB_OUT = path.join(ROOT, 'frontend/src/design-system/tokens/colors.generated.js');
const ANDROID_DIR = path.join(ROOT, 'android/app/src/main/java/com/diplomado/erp/ui/theme');
const ANDROID_OUT = path.join(ANDROID_DIR, 'ColorTokens.kt');
const ANDROID_ALIASES = path.join(ANDROID_DIR, 'Color.kt');

const HEADER = 'ARCHIVO GENERADO por design/build-tokens.js desde design/tokens.json. NO EDITAR A MANO.';

const pascal = (key) => key.charAt(0).toUpperCase() + key.slice(1);

/** "#RRGGBB" o "rgba(r, g, b, a)" → "0xAARRGGBB" (Compose Color). */
function toArgb(value) {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) return `0xFF${hex[1].toUpperCase()}`;
  const rgba = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/i.exec(value);
  if (rgba) {
    const [r, g, b] = rgba.slice(1, 4).map(Number);
    const alpha = Math.round(Number(rgba[4]) * 255);
    const h = (n) => n.toString(16).toUpperCase().padStart(2, '0');
    return `0x${h(alpha)}${h(r)}${h(g)}${h(b)}`;
  }
  throw new Error(`Color no soportado: ${value} (usa #RRGGBB o rgba(r, g, b, a))`);
}

function loadTokens() {
  const json = JSON.parse(fs.readFileSync(TOKENS, 'utf8'));
  const groups = Object.entries(json.colors);
  const seen = new Set();
  for (const [, tokens] of groups) {
    for (const [key, token] of Object.entries(tokens)) {
      if (seen.has(key)) throw new Error(`Token repetido: ${key}`);
      seen.add(key);
      toArgb(token.value); // valida el formato
    }
  }
  return groups;
}

function buildWeb(groups) {
  const lines = [`/**`, ` * ${HEADER}`, ` * Paleta FAI Solution ERP para web (se usa a través de colors.js → COLORS).`, ` */`, `export const GENERATED_COLORS = {`];
  for (const [group, tokens] of groups) {
    lines.push(`  // ${group}`);
    for (const [key, token] of Object.entries(tokens)) lines.push(`  ${key}: '${token.value}',`);
  }
  lines.push('};', '');
  return lines.join('\n');
}

function buildAndroid(groups) {
  const lines = [
    'package com.diplomado.erp.ui.theme',
    '',
    'import androidx.compose.ui.graphics.Color',
    '',
    `// ${HEADER}`,
    '// Paleta FAI Solution ERP para Android (Color.kt expone los nombres Fai* que usa el código).',
    'object ColorTokens {',
  ];
  for (const [group, tokens] of groups) {
    lines.push(`    // ${group}`);
    for (const [key, token] of Object.entries(tokens)) lines.push(`    val ${pascal(key)} = Color(${toArgb(token.value)})`);
  }
  lines.push('}', '');
  return lines.join('\n');
}

/** Alias que faltan o sobran en Color.kt respecto a los nombres `android` de tokens.json. */
function checkAliases(groups) {
  const expected = new Map();
  for (const [, tokens] of groups) {
    for (const [key, token] of Object.entries(tokens)) if (token.android) expected.set(token.android, pascal(key));
  }
  const source = fs.readFileSync(ANDROID_ALIASES, 'utf8');
  const actual = new Map([...source.matchAll(/^val (\w+) = ColorTokens\.(\w+)\s*$/gm)].map((m) => [m[1], m[2]]));
  const problems = [];
  for (const [name, target] of expected) {
    if (actual.get(name) !== target) problems.push(`Color.kt: falta "val ${name} = ColorTokens.${target}"`);
  }
  for (const name of actual.keys()) if (!expected.has(name)) problems.push(`Color.kt: "${name}" no tiene nombre android en tokens.json`);
  if (/Color\(0x/.test(source)) problems.push('Color.kt no debe definir colores a mano (usa ColorTokens)');
  return problems;
}

function main() {
  const check = process.argv.includes('--check');
  const groups = loadTokens();
  const outputs = [
    [WEB_OUT, buildWeb(groups)],
    [ANDROID_OUT, buildAndroid(groups)],
  ];
  const problems = [];
  for (const [file, content] of outputs) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (check) {
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
      if (current !== content) problems.push(`${rel} no está al día: ejecuta node design/build-tokens.js`);
    } else {
      fs.writeFileSync(file, content);
      console.log(`✔ ${rel}`);
    }
  }
  problems.push(...checkAliases(groups));
  if (problems.length) {
    console.error(problems.map((p) => `✖ ${p}`).join('\n'));
    process.exitCode = 1;
  } else if (check) {
    console.log('✔ Colores de web y Android al día con design/tokens.json');
  }
}

if (require.main === module) main();

module.exports = { toArgb, loadTokens, buildWeb, buildAndroid, checkAliases };
