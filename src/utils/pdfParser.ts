import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractTextFromPDF(
  file: File,
  useOcr: boolean = false,
  usePhysicalPage: boolean = false,
  onProgress?: (msg: string) => void
): Promise<Record<string, string[]>> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageMap: Record<string, string[]> = {};

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Processing page ${i} of ${pdf.numPages}...`);
    const page = await pdf.getPage(i);
    let lines: string[] = [];

    if (useOcr) {
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport } as any).promise;
      
      const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
      lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    } else {
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];
      
      // Sort items by Y (descending) and X (ascending)
      items.sort((a, b) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        if (Math.abs(yA - yB) > 5) {
          return yB - yA;
        }
        return a.transform[4] - b.transform[4];
      });

      let currentLineStr = '';
      let lastY: number | null = null;
      let lastX: number | null = null;
      let lastWidth: number | null = null;

      for (const item of items) {
        const y = item.transform[5];
        const x = item.transform[4];
        const width = item.width;
        
        if (lastY === null || Math.abs(lastY - y) > 5) {
          if (currentLineStr.trim() !== '') {
            lines.push(currentLineStr.trim());
          }
          currentLineStr = item.str;
          lastY = y;
          lastX = x;
          lastWidth = width;
        } else {
          const gap = x - (lastX! + lastWidth!);
          if (gap > 2) {
            currentLineStr += ' ' + item.str;
          } else {
            currentLineStr += item.str;
          }
          lastX = x;
          lastWidth = width;
        }
      }
      if (currentLineStr.trim() !== '') {
        lines.push(currentLineStr.trim());
      }

      // Filter empty lines
      lines = lines.filter(l => l.trim() !== '');
    }

    if (usePhysicalPage) {
      pageMap[i.toString()] = lines;
    } else {
      // Identify printed page number
      let printedPageNum: string | null = null;
      if (lines.length > 0) {
        const firstLine = lines[0].trim();
        const lastLine = lines[lines.length - 1].trim();
        
        const isPageNum = (str: string) => {
          const match = str.match(/^(?:page\s*|p\.?\s*|[\[(|-]\s*)?(\d+)(?:\s*[\])|-])?$/i);
          if (match) {
            return match[1];
          }
          return null;
        };

        const firstMatch = isPageNum(firstLine);
        const lastMatch = isPageNum(lastLine);

        if (firstMatch) {
          printedPageNum = firstMatch;
          lines.shift(); // remove it
        } else if (lastMatch) {
          printedPageNum = lastMatch;
          lines.pop(); // remove it
        }
      }

      if (printedPageNum !== null) {
        pageMap[printedPageNum] = lines;
      } else {
        // Fallback to physical if detection fails
        pageMap[i.toString()] = lines; 
      }
    }
  }
  return pageMap;
}

export function decipherCoordinate(pageMap: Record<string, string[]>, p: number, l: number, w: number) {
  const lines = pageMap[p.toString()];
  if (!lines) {
    return { letter: '?', word: 'Page not found', error: true };
  }
  if (l < 1 || l > lines.length) {
    return { letter: '?', word: `Line ${l} not found (max ${lines.length})`, error: true };
  }
  const line = lines[l - 1];
  
  // Split line into words
  const tokens = line.split(/\s+/);
  
  // Filter tokens: must contain at least one letter
  const words = tokens.filter(token => /[a-zA-Z]/.test(token));
  
  if (w < 1 || w > words.length) {
    return { letter: '?', word: `Word ${w} not found (max ${words.length})`, error: true };
  }
  
  const targetWord = words[w - 1];
  // Find first letter
  const match = targetWord.match(/[a-zA-Z]/);
  const letter = match ? match[0].toUpperCase() : '?';
  
  return { letter, word: targetWord, lineText: line, error: false };
}
