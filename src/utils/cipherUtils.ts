/**
 * Utility functions for various cipher methods
 */

// --- Substitution Ciphers ---

export function caesarShift(text: string, shift: number): string {
  return text.split('').map(char => {
    if (char.match(/[a-z]/i)) {
      const code = char.charCodeAt(0);
      const base = code >= 65 && code <= 90 ? 65 : 97;
      return String.fromCharCode(((code - base + shift + 26) % 26) + base);
    }
    return char;
  }).join('');
}

export function vigenereCipher(text: string, key: string, decrypt: boolean = false): string {
  if (!key) return text;
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (k.length === 0) return text;

  let keyIndex = 0;
  return text.split('').map(char => {
    if (char.match(/[a-z]/i)) {
      const isUpper = char === char.toUpperCase();
      const p = char.toUpperCase().charCodeAt(0) - 65;
      const shift = k.charCodeAt(keyIndex % k.length) - 65;
      
      let resultIdx;
      if (decrypt) {
        resultIdx = (p - shift + 26) % 26;
      } else {
        resultIdx = (p + shift) % 26;
      }
      
      keyIndex++;
      const resultChar = String.fromCharCode(resultIdx + 65);
      return isUpper ? resultChar : resultChar.toLowerCase();
    }
    return char;
  }).join('');
}

// --- Transposition Ciphers ---

export function transpositionCipher(text: string, keyPattern: string): string {
  // Pattern example: "1, 4, 2, 3" -> means 1st char goes to 1st, 2nd to 4th, etc.
  const pattern = keyPattern.split(/[\s,]+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  if (pattern.length < 2) return text;

  const blockSize = pattern.length;
  let result = '';

  for (let i = 0; i < text.length; i += blockSize) {
    const block = text.slice(i, i + blockSize).split('');
    const newBlock = new Array(blockSize).fill(' ');
    
    // Fill the new block based on the pattern
    // If pattern is [2, 1, 4, 3], then block[0] goes to position pattern[0]-1
    for (let j = 0; j < block.length; j++) {
      const newPos = pattern[j] - 1;
      if (newPos >= 0 && newPos < blockSize) {
        newBlock[newPos] = block[j];
      } else {
        // Fallback if key is invalid for this position
        newBlock[j] = block[j];
      }
    }
    result += newBlock.join('');
  }
  return result;
}

// --- XOR Cipher ---

export function xorCipher(text: string, key: string): { binary: string, text: string, hex: string } {
  if (!key) return { binary: '', text: '', hex: '' };
  
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(key);
  
  const resultBytes = new Uint8Array(textBytes.length);
  let binaryResult = '';
  let hexResult = '';

  for (let i = 0; i < textBytes.length; i++) {
    const xored = textBytes[i] ^ keyBytes[i % keyBytes.length];
    resultBytes[i] = xored;
    binaryResult += xored.toString(2).padStart(8, '0') + ' ';
    hexResult += xored.toString(16).padStart(2, '0').toUpperCase() + ' ';
  }

  return {
    binary: binaryResult.trim(),
    text: new TextDecoder().decode(resultBytes),
    hex: hexResult.trim()
  };
}
