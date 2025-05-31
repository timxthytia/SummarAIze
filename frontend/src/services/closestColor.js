// src/utils/closestHighlightColor.js

// Docx supported highlight colors and their RGB values
const docxHighlights = {
    default:  [255, 255, 255], // treat default as white
    black:    [0, 0, 0],
    blue:     [0, 0, 255],
    cyan:     [0, 255, 255],
    green:    [0, 255, 0],
    magenta:  [255, 0, 255],
    red:      [255, 0, 0],
    yellow:   [255, 255, 0],
    white:    [255, 255, 255],
    darkBlue:     [0, 0, 139],
    darkCyan:     [0, 139, 139],
    darkGreen:    [0, 100, 0],
    darkMagenta:  [139, 0, 139],
    darkRed:      [139, 0, 0],
    darkYellow:   [204, 204, 0],
    lightGray:    [211, 211, 211],
    darkGray:     [169, 169, 169],
  };
  
  // Converts hex string to RGB array
  function hexToRgb(hex) {
    if (!hex) return null;
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(h => h + h).join('');
    }
    if (hex.length !== 6) return null;
    const bigint = parseInt(hex, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
  
  // Converts CSS rgb/rgba string to RGB array
  function rgbStringToRgb(rgbStr) {
    const match = rgbStr.match(/\d+/g);
    if (!match || match.length < 3) return null;
    return match.slice(0,3).map(Number);
  }
  
  // Euclidean distance between two RGB arrays
  function colorDistance(c1, c2) {
    return Math.sqrt(
      (c1[0] - c2[0]) ** 2 +
      (c1[1] - c2[1]) ** 2 +
      (c1[2] - c2[2]) ** 2
    );
  }
  
  // Main function: maps any CSS color string to closest docx highlight color
  export function mapToClosestDocxHighlight(cssColor) {
    if (!cssColor) return null;
  
    cssColor = cssColor.trim().toLowerCase();
  
    let inputRgb = null;
  
    if (cssColor.startsWith('rgb')) {
      inputRgb = rgbStringToRgb(cssColor);
    } else if (cssColor.startsWith('#')) {
      inputRgb = hexToRgb(cssColor);
    } else {
      // Named colors fallback (basic)
      const namedColors = {
        red: '#ff0000',
        green: '#00ff00',
        blue: '#0000ff',
        yellow: '#ffff00',
        cyan: '#00ffff',
        magenta: '#ff00ff',
        black: '#000000',
        white: '#ffffff',
        gray: '#808080',
        grey: '#808080',
        orange: '#ffa500',
        purple: '#800080',
        pink: '#ffc0cb',
        brown: '#a52a2a',
      };
      if (namedColors[cssColor]) {
        inputRgb = hexToRgb(namedColors[cssColor]);
      }
    }
  
    if (!inputRgb) return null;
  
    let closestColor = null;
    let minDist = Infinity;
  
    for (const [name, rgb] of Object.entries(docxHighlights)) {
      const dist = colorDistance(inputRgb, rgb);
      if (dist < minDist) {
        minDist = dist;
        closestColor = name;
      }
    }
  
    return closestColor;
  }