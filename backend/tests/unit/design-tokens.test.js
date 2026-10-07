'use strict';

/**
 * Paridad de colores web ↔ Android: los archivos generados deben corresponder
 * a design/tokens.json y Color.kt debe exponer un alias Fai* por cada token
 * de Android. Si falla: `node design/build-tokens.js` (desde la raíz).
 */
const fs = require('fs');
const path = require('path');
const { toArgb, loadTokens, buildWeb, buildAndroid, checkAliases } = require('../../../design/build-tokens');

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

describe('design/tokens.json → web y Android', () => {
  const groups = loadTokens();

  test('colors.generated.js está al día', () => {
    expect(read('frontend/src/design-system/tokens/colors.generated.js')).toBe(buildWeb(groups));
  });

  test('ColorTokens.kt está al día', () => {
    expect(read('android/app/src/main/java/com/diplomado/erp/ui/theme/ColorTokens.kt')).toBe(buildAndroid(groups));
  });

  test('Color.kt sólo tiene alias Fai* a ColorTokens, uno por token de Android', () => {
    expect(checkAliases(groups)).toEqual([]);
  });

  test('conversión a Compose: hex opaco y rgba con alfa redondeado', () => {
    expect(toArgb('#334024')).toBe('0xFF334024');
    expect(toArgb('rgba(51, 64, 36, 0.12)')).toBe('0x1F334024');
    expect(() => toArgb('olivo')).toThrow('Color no soportado');
  });
});
