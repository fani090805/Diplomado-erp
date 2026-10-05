'use strict';

const { randomInt } = require('crypto');

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

function generateJoinCode(excludedCode) {
  let code;
  do {
    let suffix = '';
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      suffix += ALPHABET[randomInt(ALPHABET.length)];
    }
    code = `FAI-${suffix}`;
  } while (code === excludedCode);

  return code;
}

module.exports = generateJoinCode;
