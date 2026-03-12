import React, { useState } from 'react';
import { extractTextFromPDF, decipherCoordinate } from '../utils/pdfParser';
import * as ciphers from '../utils/cipherUtils';
import { Upload, FileText, ChevronRight, AlertCircle, Info, Settings, HelpCircle, Repeat, Hash, Binary, RefreshCcw } from 'lucide-react';

export default function BookDecipher() {
  // Common State
  const [activeTab, setActiveTab] = useState<'pdf' | 'substitution' | 'transposition' | 'xor'>('pdf');

  // PDF Tool State
  const [file, setFile] = useState<File | null>(null);
  const [pageMap, setPageMap] = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [useOcr, setUseOcr] = useState(false);
  const [showOcrHelp, setShowOcrHelp] = useState(false);
  const [usePhysicalPage, setUsePhysicalPage] = useState(false);
  const [pdfInput, setPdfInput] = useState('');
  const [pdfResults, setPdfResults] = useState<any[]>([]);

  // Substitution State
  const [subInput, setSubInput] = useState('');
  const [caesarShift, setCaesarShift] = useState(3);
  const [vigenereKey, setVigenereKey] = useState('ITALY');
  const [vigenereDecrypt, setVigenereDecrypt] = useState(false);

  // Transposition State
  const [transInput, setTransInput] = useState('');
  const [transKey, setTransKey] = useState('1, 4, 2, 8, 3, 5, 7, 6');

  // XOR State
  const [xorInput, setXorInput] = useState('');
  const [xorKey, setXorKey] = useState('V');

  // PDF Logic
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

  const handlePdfDecipher = () => {
    if (!pageMap) return;
    const lines = pdfInput.split('\n');
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
    setPdfResults(newResults);
  };

  const renderPdfDecipheredText = () => {
    let currentWord = '';
    const words: string[] = [];
    pdfResults.forEach(r => {
      if (r.type === 'text') {
        if (currentWord) { words.push(currentWord); currentWord = ''; }
      } else if (r.type === 'coordinate' && !r.error) {
        currentWord += r.letter;
      }
    });
    if (currentWord) words.push(currentWord);
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
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-stone-800">Cipher Studio</h1>
          <p className="text-sm md:text-base text-stone-500">A professional suite for coordinate decoding and classical ciphers.</p>
        </header>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 p-1 bg-stone-200/50 rounded-2xl">
          {[
            { id: 'pdf', label: 'PDF Decoder', icon: FileText },
            { id: 'substitution', label: 'Substitution', icon: Repeat },
            { id: 'transposition', label: 'Transposition', icon: Hash },
            { id: 'xor', label: 'XOR Cipher', icon: Binary },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- PDF DECODER TAB --- */}
        {activeTab === 'pdf' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">1. Document Setup</h2>
                <div className="bg-blue-50 text-blue-800 p-3 md:p-4 rounded-xl text-sm flex gap-3 items-start">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p><strong>Mode:</strong> {usePhysicalPage ? 'Physical PDF page count' : 'Printed page numbers'}. Numbers are automatically skipped when counting words.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-xs md:text-sm text-stone-700 cursor-pointer select-none">
                      <input type="checkbox" checked={useOcr} onChange={(e) => setUseOcr(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                      OCR Mode (Scanned Docs)
                      <button onClick={() => setShowOcrHelp(!showOcrHelp)} className="p-1 hover:bg-stone-200 rounded-full"><HelpCircle className="w-4 h-4 text-stone-400" /></button>
                    </label>
                    {showOcrHelp && (
                      <div className="text-[10px] md:text-xs text-stone-500 bg-white p-2 rounded-lg border border-stone-100 shadow-sm">
                        OCR extracts text from images/scans. It is slower than normal mode.
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs md:text-sm text-stone-700 cursor-pointer select-none">
                    <input type="checkbox" checked={usePhysicalPage} onChange={(e) => setUsePhysicalPage(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    Use Physical Page Index
                  </label>
                </div>

                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-stone-300 border-dashed rounded-xl cursor-pointer bg-stone-50 hover:bg-stone-100 transition-colors">
                    <Upload className="w-8 h-8 mb-2 text-stone-400" />
                    <p className="text-sm font-semibold text-stone-500">Tap to upload PDF</p>
                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                  </label>
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-indigo-600 animate-pulse">
                    <RefreshCcw className="w-4 h-4 animate-spin" /> {progressMsg || 'Processing...'}
                  </div>
                )}
                {file && !loading && <p className="text-sm text-emerald-600 font-medium truncate">✓ {file.name} loaded.</p>}
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">2. Coordinates</h2>
                <textarea
                  className="w-full h-40 p-4 border border-stone-200 rounded-xl font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="P10, L27, W2"
                  value={pdfInput}
                  onChange={(e) => setPdfInput(e.target.value)}
                />
                <button
                  onClick={handlePdfDecipher}
                  disabled={!pageMap || !pdfInput.trim()}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-stone-300 text-white rounded-xl font-semibold shadow-sm"
                >
                  Decipher Coordinates
                </button>
              </div>
            </div>

            {pdfResults.length > 0 && (
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
                <h2 className="text-lg font-semibold">Decoded Output</h2>
                <div className="space-y-3 font-mono text-sm">
                  {pdfResults.map((res, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-2 rounded hover:bg-stone-50 border-b border-stone-50 last:border-0">
                      {res.type === 'text' ? <span className="font-bold text-stone-800">{res.original}</span> : (
                        <>
                          <span className="text-stone-500 min-w-[100px]">{res.original}</span>
                          <span className="text-emerald-600 font-bold text-xl">{res.letter}</span>
                          <span className="text-stone-400 text-xs truncate">from "{res.word}"</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 md:p-6 bg-stone-100 rounded-2xl border border-stone-200">
                  <p className="text-2xl md:text-3xl font-bold text-stone-800 tracking-widest break-words leading-relaxed">{renderPdfDecipheredText()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- SUBSTITUTION TAB --- */}
        {activeTab === 'substitution' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2 text-stone-700">Monoalphabetic (Caesar)</h3>
                  <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <span className="text-xs font-bold text-stone-500 uppercase">Shift:</span>
                    <input type="number" value={caesarShift} onChange={(e) => setCaesarShift(parseInt(e.target.value, 10) || 0)} className="w-16 p-1 border rounded text-center font-mono" />
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed italic">Example (Shift 3): M becomes P, O becomes R. MOM → PRP.</p>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2 text-stone-700">Polyalphabetic (Vigenère)</h3>
                  <div className="flex flex-col gap-2">
                    <input type="text" placeholder="Keyword (e.g. ITALY)" value={vigenereKey} onChange={(e) => setVigenereKey(e.target.value.toUpperCase())} className="w-full p-2 border rounded font-mono text-sm" />
                    <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                      <input type="checkbox" checked={vigenereDecrypt} onChange={(e) => setVigenereDecrypt(e.target.checked)} />
                      Decrypt Mode
                    </label>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed italic">Uses a repeated keyword to select different alphabet shifts for each letter.</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-stone-100">
                <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">Input Text</h2>
                <textarea
                  className="w-full h-32 p-4 border border-stone-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter message to encrypt or decrypt..."
                  value={subInput}
                  onChange={(e) => setSubInput(e.target.value)}
                />
              </div>

              {subInput && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <h4 className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Caesar Result</h4>
                    <p className="text-lg font-bold text-emerald-900 break-all font-mono">{ciphers.caesarShift(subInput, caesarShift)}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <h4 className="text-[10px] font-bold text-indigo-700 uppercase mb-1">Vigenère Result</h4>
                    <p className="text-lg font-bold text-indigo-900 break-all font-mono">{ciphers.vigenereCipher(subInput, vigenereKey, vigenereDecrypt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TRANSPOSITION TAB --- */}
        {activeTab === 'transposition' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-stone-700">Permutation Key</h3>
                <div className="bg-stone-50 p-4 rounded-xl text-sm border border-stone-100 space-y-2">
                  <p className="text-stone-600 italic leading-relaxed">Arranges positions within blocks. Example: "2, 1, 4, 3" swaps every two letters.</p>
                  <input type="text" value={transKey} onChange={(e) => setTransKey(e.target.value)} className="w-full p-2 border rounded font-mono text-sm" placeholder="e.g. 1, 4, 2, 8, 3, 5, 7, 6" />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">Input Text</h2>
                <textarea
                  className="w-full h-32 p-4 border border-stone-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter text to scramble..."
                  value={transInput}
                  onChange={(e) => setTransInput(e.target.value)}
                />
              </div>
              {transInput && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <h4 className="text-[10px] font-bold text-amber-700 uppercase mb-1">Transposed Result</h4>
                  <p className="text-lg font-bold text-amber-900 break-all font-mono whitespace-pre">{ciphers.transpositionCipher(transInput, transKey)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- XOR TAB --- */}
        {activeTab === 'xor' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-stone-200 space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-stone-700">XOR Parameters</h3>
                <div className="bg-stone-50 p-4 rounded-xl text-sm border border-stone-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-stone-500 uppercase shrink-0">Key (String):</span>
                    <input type="text" value={xorKey} onChange={(e) => setXorKey(e.target.value)} className="w-full p-2 border rounded font-mono text-sm" />
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed italic">Compares bits: 1 if different, 0 if same. XORing twice with the same key recovers original text.</p>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">Input Text</h2>
                <textarea
                  className="w-full h-32 p-4 border border-stone-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter message..."
                  value={xorInput}
                  onChange={(e) => setXorInput(e.target.value)}
                />
              </div>
              {xorInput && (
                <div className="space-y-4">
                  <div className="p-4 bg-stone-900 text-stone-100 rounded-xl border border-stone-800 shadow-xl overflow-hidden">
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase mb-2">Binary Bitstream</h4>
                    <p className="text-xs font-mono break-all leading-relaxed opacity-80">{ciphers.xorCipher(xorInput, xorKey).binary}</p>
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase mt-4 mb-2">Hexadecimal View</h4>
                    <p className="text-xs font-mono break-all leading-relaxed opacity-80">{ciphers.xorCipher(xorInput, xorKey).hex}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <h4 className="text-[10px] font-bold text-emerald-700 uppercase mb-1">XOR Result (Text/ASCII)</h4>
                    <p className="text-lg font-bold text-emerald-900 break-all font-mono italic">
                      {ciphers.xorCipher(xorInput, xorKey).text || <span className="text-stone-400 font-normal text-sm">(Non-printable result)</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

