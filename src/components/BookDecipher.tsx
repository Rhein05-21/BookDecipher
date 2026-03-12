import React, { useState } from 'react';
import { extractTextFromPDF, decipherCoordinate } from '../utils/pdfParser';
import { Upload, FileText, ChevronRight, AlertCircle, Info, Settings, HelpCircle } from 'lucide-react';

export default function BookDecipher() {
  const [file, setFile] = useState<File | null>(null);
  const [pageMap, setPageMap] = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [useOcr, setUseOcr] = useState(false);
  const [showOcrHelp, setShowOcrHelp] = useState(false);
  const [usePhysicalPage, setUsePhysicalPage] = useState(false);
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);
    setProgressMsg('Initializing...');
    try {
      const map = await extractTextFromPDF(selectedFile, useOcr, usePhysicalPage, (msg) => {
        setProgressMsg(msg);
      });
      setPageMap(map);
    } catch (error) {
      console.error(error);
      alert('Error extracting text from PDF');
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const handleDecipher = () => {
    if (!pageMap) return;
    
    const lines = inputText.split('\n');
    const newResults = lines.map(line => {
      const match = line.match(/P(\d+)\s*,\s*L(\d+)\s*,\s*W(\d+)/i);
      if (match) {
        const p = parseInt(match[1], 10);
        const l = parseInt(match[2], 10);
        const w = parseInt(match[3], 10);
        const res = decipherCoordinate(pageMap, p, l, w);
        return { type: 'coordinate', original: line, p, l, w, ...res };
      }
      return { type: 'text', original: line };
    });
    setResults(newResults);
  };

  // Group results by text blocks to show words
  const renderDecipheredText = () => {
    let currentWord = '';
    const words: string[] = [];
    
    results.forEach(r => {
      if (r.type === 'text') {
        if (currentWord) {
          words.push(currentWord);
          currentWord = '';
        }
      } else if (r.type === 'coordinate' && !r.error) {
        currentWord += r.letter;
      }
    });
    if (currentWord) {
      words.push(currentWord);
    }
    
    return words.join(' ');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        <header className="text-center space-y-2">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 flex items-center justify-center gap-2 text-amber-800 text-xs md:text-sm font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Cheating is not tolerated rather use this at your own risk for faster deciphering</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-800">Book Decipher</h1>
          <p className="text-sm md:text-base text-stone-500">Upload a module and enter coordinates to decipher hidden messages.</p>
        </header>

        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              1. Upload Document
            </h2>
            <div className="bg-blue-50 text-blue-800 p-3 md:p-4 rounded-xl text-sm flex gap-3 items-start">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>
                  <strong>Page Counting:</strong> {usePhysicalPage ? 'Using literal PDF page count (1, 2, 3...)' : 'Using printed page numbers found on the document.'}
                </p>
                <p>
                  Numbers (like "1990") are skipped when counting words to ensure accuracy.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs md:text-sm text-stone-700 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={useOcr} 
                    onChange={(e) => setUseOcr(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-stone-300 focus:ring-indigo-500"
                  />
                  Use OCR for scanned docs
                  <button 
                    onClick={() => setShowOcrHelp(!showOcrHelp)}
                    className="p-1 hover:bg-stone-200 rounded-full transition-colors"
                    title="What is OCR?"
                  >
                    <HelpCircle className="w-4 h-4 text-stone-400" />
                  </button>
                </label>
                {showOcrHelp && (
                  <div className="text-[10px] md:text-xs text-stone-500 bg-white p-2 rounded-lg border border-stone-100 shadow-sm animate-in fade-in slide-in-from-top-1">
                    <strong>OCR (Optical Character Recognition)</strong> converts images of text into actual machine-readable text. Use this if your PDF is a <strong>scan or photo</strong> of a book where you cannot highlight the text normally. It is slower than normal mode.
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs md:text-sm text-stone-700 cursor-pointer select-none h-fit self-start">
                <input 
                  type="checkbox" 
                  checked={usePhysicalPage} 
                  onChange={(e) => setUsePhysicalPage(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-stone-300 focus:ring-indigo-500"
                />
                Use literal PDF page count
              </label>
            </div>

            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-stone-300 border-dashed rounded-xl cursor-pointer bg-stone-50 hover:bg-stone-100 transition-colors">
                <div className="flex flex-col items-center justify-center px-4 py-5 text-center">
                  <Upload className="w-8 h-8 mb-2 text-stone-400" />
                  <p className="mb-1 text-sm text-stone-500">
                    <span className="font-semibold">Tap to upload</span>
                  </p>
                  <p className="text-xs text-stone-400">PDF documents only</p>
                </div>
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
              </label>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-indigo-600 animate-pulse">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                {progressMsg || 'Extracting text...'}
              </div>
            )}
            {file && !loading && <p className="text-sm text-emerald-600 font-medium break-all">✓ {file.name} loaded.</p>}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-indigo-500" />
              2. Enter Coordinates
            </h2>
            <p className="text-xs md:text-sm text-stone-500">
              Format: <code>P10, L27, W2</code> (one per line)
            </p>
            <textarea
              className="w-full h-40 md:h-48 p-4 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm resize-none"
              placeholder="P10, L27, W2&#10;P6, L22, W1"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              onClick={handleDecipher}
              disabled={!pageMap || !inputText.trim()}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors shadow-sm"
            >
              Decipher Message
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
            <h2 className="text-lg font-semibold">Results</h2>
            <div className="space-y-3 font-mono text-sm">
              {results.map((res, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-2 rounded hover:bg-stone-50 border-b border-stone-50 sm:border-none pb-3 sm:pb-2">
                  {res.type === 'text' ? (
                    <span className="font-bold text-stone-800">{res.original}</span>
                  ) : (
                    <>
                      <span className="text-stone-500 min-w-[100px] shrink-0">{res.original}</span>
                      <span className="hidden sm:inline text-stone-300">→</span>
                      {res.error ? (
                        <span className="text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" /> {res.word}
                        </span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-600 font-bold text-xl">{res.letter}</span>
                          <span className="text-stone-400 text-xs truncate max-w-[150px]">from "{res.word}"</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 md:p-6 bg-stone-100 rounded-2xl border border-stone-200">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Deciphered Text</h3>
              <p className="text-2xl md:text-3xl font-bold text-stone-800 tracking-widest break-words leading-relaxed">
                {renderDecipheredText()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>

  );
}
