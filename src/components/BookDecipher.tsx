import React, { useState, useEffect } from 'react';
import { extractTextFromPDF, decipherCoordinate } from '../utils/pdfParser';
import * as ciphers from '../utils/cipherUtils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, FileText, ChevronRight, AlertCircle, Info, Settings, 
  HelpCircle, Repeat, Hash, Binary, RefreshCcw, X, Copy, Check, ShieldAlert
} from 'lucide-react';

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy}
      className="p-2 hover:bg-stone-200/50 rounded-lg transition-all active:scale-90 flex items-center gap-2 text-stone-500"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
      {copied && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Copied</span>}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, icon: Icon, children }: { isOpen: boolean, onClose: () => void, title: string, icon: any, children: React.ReactNode }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
          >
            <div className="flex items-center justify-between p-6 border-b border-stone-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-100 rounded-xl">
                  <Icon className="w-5 h-5 text-stone-600" />
                </div>
                <h3 className="font-bold text-xl text-stone-800 tracking-tight">{title}</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors active:scale-90">
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto text-stone-600 leading-relaxed text-base">
              {children}
            </div>
            <div className="p-6 bg-stone-50/50 border-t border-stone-50 flex justify-end">
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg active:scale-95"
              >
                Understood
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function BookDecipher() {
  // Common State
  const [activeTab, setActiveTab] = useState<'pdf' | 'substitution' | 'transposition' | 'xor'>('pdf');
  const [activeModal, setActiveModal] = useState<string | null>(null);

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
  const [inputErrors, setInputErrors] = useState<string[]>([]);

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

  const [inputErrors, setInputErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!pdfInput.trim()) {
      setInputErrors([]);
      return;
    }
    const lines = pdfInput.split('\n');
    const errors: string[] = [];
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/P(\d+)\s*,\s*L(\d+)\s*,\s*W(\d+)/i);
      if (!match) {
        errors.push(`Line ${idx + 1}: Format must be P[page], L[line], W[word]`);
      }
    });
    setInputErrors(errors);
  }, [pdfInput]);

  const handlePdfDecipher = () => {
    if (!pageMap || inputErrors.length > 0) return;
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
    <div className="min-h-screen bg-[#F9F8F6] text-stone-900 p-4 md:p-12 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* MODALS */}
      <Modal isOpen={activeModal === 'pdf'} onClose={() => setActiveModal(null)} title="Coordinate Decoding" icon={FileText}>
        <p className="mb-6 text-lg">Master the art of manual book deciphering:</p>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 font-bold text-stone-500">1</div>
            <div>
              <h5 className="font-bold text-stone-800">Identify the Page</h5>
              <p className="text-sm">Find the number physically printed on the page corner.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 font-bold text-stone-500">2</div>
            <div>
              <h5 className="font-bold text-stone-800">Locate the Line</h5>
              <p className="text-sm">Count lines from top to bottom, skipping empty gaps or headers.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0 font-bold text-stone-500">3</div>
            <div>
              <h5 className="font-bold text-stone-800">Pinpoint the Word</h5>
              <p className="text-sm">Count words from left to right. <strong>Note:</strong> Pure numbers (like "2024") are skipped in most systems.</p>
            </div>
          </div>
        </div>
        <div className="mt-8 p-5 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50 text-indigo-700 font-medium italic text-sm">
          Formula: P[Page], L[Line], W[Word] → Extracted Letter
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'sub'} onClose={() => setActiveModal(null)} title="Substitution Logic" icon={Repeat}>
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full w-fit text-[10px] font-bold uppercase tracking-wider">Simple</div>
            <h4 className="font-bold text-stone-800 text-lg">Caesar Cipher</h4>
            <p className="text-sm">Every character shifts forward in the alphabet by a fixed offset. It's the foundation of modern cryptography concepts.</p>
          </section>
          <section className="space-y-3 border-t border-stone-50 pt-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full w-fit text-[10px] font-bold uppercase tracking-wider">Advanced</div>
            <h4 className="font-bold text-stone-800 text-lg">Vigenère Cipher</h4>
            <p className="text-sm">Uses a keyword to change the shift for every single letter, making it much harder to break than a simple Caesar shift.</p>
          </section>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'trans'} onClose={() => setActiveModal(null)} title="Transposition Guide" icon={Hash}>
        <p className="mb-6">Think of this as a "scrambler" rather than a "replacer". It changes the <strong>position</strong> of letters but keeps the letters themselves.</p>
        <div className="p-6 bg-stone-50 rounded-[2rem] font-mono text-sm border border-stone-100 shadow-inner">
          <div className="text-stone-400 mb-2">// Block Size: 4, Key: [2, 4, 1, 3]</div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-2"><span>Plain:</span> <span className="text-stone-800 font-bold">H E L P</span></div>
            <div className="flex gap-2"><span>Scrambled:</span> <span className="text-amber-600 font-bold tracking-widest">L H P E</span></div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'xor'} onClose={() => setActiveModal(null)} title="Bitwise XOR Method" icon={Binary}>
        <p className="mb-6">The ultimate simple digital lock. It works at the binary level (0s and 1s).</p>
        <ul className="space-y-4 text-sm">
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-2 shrink-0" />
            <span>Different bits (0 vs 1) result in <strong>1</strong>.</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-2 shrink-0" />
            <span>Identical bits (0 vs 0) result in <strong>0</strong>.</span>
          </li>
          <li className="flex items-start gap-3 font-bold text-stone-800">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
            <span>Feature: XORing the result with the same key again perfectly unlocks the original text.</span>
          </li>
        </ul>
      </Modal>

      <div className="max-w-5xl mx-auto space-y-8 md:space-y-12">
        <header className="space-y-6">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center shadow-xl shadow-stone-200">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-stone-900 uppercase">Cipher Studio</h1>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em]">Manual & Automated Decryption Suite</p>
              </div>
            </div>
            
            <div className="bg-amber-100/50 border border-amber-200/50 px-5 py-3 rounded-2xl flex items-center gap-3 text-amber-900 text-xs font-bold shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Cheating is not tolerated. Use at your own risk.</span>
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 p-2 bg-stone-200/30 rounded-[2rem] border border-stone-200/20 shadow-inner">
            {[
              { id: 'pdf', label: 'PDF Decoder', icon: FileText },
              { id: 'substitution', label: 'Substitution', icon: Repeat },
              { id: 'transposition', label: 'Transposition', icon: Hash },
              { id: 'xor', label: 'XOR Bitwise', icon: Binary },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-[1.5rem] text-sm font-bold transition-all duration-300 ${
                  activeTab === tab.id 
                  ? 'bg-white text-stone-900 shadow-xl shadow-stone-200/50 scale-[1.02]' 
                  : 'text-stone-400 hover:text-stone-600 hover:bg-white/50'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-500' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-12 space-y-8">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* --- PDF DECODER TAB --- */}
              {activeTab === 'pdf' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <button 
                      onClick={() => setActiveModal('pdf')}
                      className="group w-full p-6 bg-stone-900 text-white rounded-[2.5rem] flex items-center justify-between hover:bg-stone-800 transition-all shadow-2xl shadow-stone-300 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-xl group-hover:bg-indigo-500 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg">How to decode?</span>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-30 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 space-y-8">
                      <div className="space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-stone-400">1. Setup Source</h2>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <label className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100 cursor-pointer hover:border-indigo-200 transition-all">
                            <input type="checkbox" checked={useOcr} onChange={(e) => setUseOcr(e.target.checked)} className="w-5 h-5 rounded-lg text-indigo-600 border-stone-300 focus:ring-indigo-500" />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-stone-700">OCR Mode</span>
                              <span className="text-[10px] text-stone-400 uppercase font-bold tracking-tighter">Scanned Images & Photos</span>
                            </div>
                            <button onClick={(e) => {e.preventDefault(); setShowOcrHelp(!showOcrHelp)}} className="ml-auto p-1.5 hover:bg-stone-200 rounded-full"><HelpCircle className="w-4 h-4 text-stone-400" /></button>
                          </label>
                          {showOcrHelp && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="text-[11px] text-stone-500 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                              OCR allows the app to "see" text in pictures of books. It takes longer but works where normal mode fails.
                            </motion.div>
                          )}
                          <label className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100 cursor-pointer hover:border-indigo-200 transition-all">
                            <input type="checkbox" checked={usePhysicalPage} onChange={(e) => setUsePhysicalPage(e.target.checked)} className="w-5 h-5 rounded-lg text-indigo-600 border-stone-300 focus:ring-indigo-500" />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-stone-700">Physical Indexing</span>
                              <span className="text-[10px] text-stone-400 uppercase font-bold tracking-tighter">Literal PDF Count (1, 2, 3...)</span>
                            </div>
                          </label>
                        </div>

                        <div className="relative group">
                          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-stone-200 border-dashed rounded-[2.5rem] cursor-pointer bg-stone-50/50 hover:bg-stone-50 hover:border-indigo-300 transition-all group-active:scale-[0.99]">
                            <div className="p-4 bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                              <Upload className="w-6 h-6 text-indigo-500" />
                            </div>
                            <p className="text-sm font-bold text-stone-600">Drop PDF here or <span className="text-indigo-600">Browse</span></p>
                            <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                          </label>
                        </div>
                        
                        {loading && (
                          <div className="flex items-center justify-center gap-3 p-4 bg-indigo-50 text-indigo-600 rounded-2xl text-sm font-bold animate-pulse">
                            <RefreshCcw className="w-4 h-4 animate-spin" /> {progressMsg || 'Processing content...'}
                          </div>
                        )}
                        {file && !loading && (
                          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-200">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-black text-emerald-800 uppercase tracking-tighter">Ready</span>
                              <span className="text-sm font-bold text-emerald-900 truncate">{file.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-black uppercase tracking-widest text-stone-400">2. Coordinate Input</h2>
                          {inputErrors.length > 0 && (
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter bg-red-50 px-2 py-1 rounded-lg border border-red-100 animate-pulse">
                              {inputErrors.length} Formatting Errors
                            </span>
                          )}
                        </div>
                        <textarea
                          className={`w-full h-48 p-6 bg-stone-50 border rounded-[2rem] font-mono text-sm focus:ring-4 outline-none transition-all placeholder:text-stone-300 ${
                            inputErrors.length > 0 
                            ? 'border-red-200 focus:ring-red-500/10 focus:border-red-400' 
                            : 'border-stone-100 focus:ring-indigo-500/10 focus:border-indigo-500'
                          }`}
                          placeholder="P10, L27, W2&#10;P6, L22, W1"
                          value={pdfInput}
                          onChange={(e) => setPdfInput(e.target.value)}
                        />
                        {inputErrors.length > 0 && (
                          <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 space-y-1">
                            {inputErrors.slice(0, 3).map((err, i) => (
                              <p key={i} className="text-[11px] text-red-600 font-bold flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" /> {err}
                              </p>
                            ))}
                            {inputErrors.length > 3 && <p className="text-[10px] text-red-400 italic">...and {inputErrors.length - 3} more errors</p>}
                          </div>
                        )}
                        <button
                          onClick={handlePdfDecipher}
                          disabled={!pageMap || !pdfInput.trim() || inputErrors.length > 0}
                          className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all"
                        >
                          Decipher Message
                        </button>
                      </div>
                    </div>

                    {pdfResults.length > 0 && (
                      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-black uppercase tracking-widest text-stone-400">Results</h2>
                          <CopyButton text={renderPdfDecipheredText()} />
                        </div>
                        <div className="space-y-3 font-mono text-sm max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {pdfResults.map((res, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                              {res.type === 'text' ? <span className="font-bold text-stone-400 italic">"{res.original}"</span> : (
                                <>
                                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest min-w-[80px]">{res.original}</span>
                                  <div className="flex items-center gap-3 ml-auto">
                                    <span className="text-2xl font-black text-indigo-600">{res.letter}</span>
                                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-tighter bg-white px-2 py-1 rounded-lg border border-stone-100">from "{res.word}"</span>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="p-8 bg-stone-900 rounded-[2rem] shadow-2xl shadow-stone-300 overflow-hidden relative group">
                          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Decoded Output</span>
                          </div>
                          <p className="text-3xl md:text-4xl font-black text-white tracking-[0.2em] break-words leading-relaxed drop-shadow-sm">{renderPdfDecipheredText() || "---"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- SUBSTITUTION TAB --- */}
              {activeTab === 'substitution' && (
                <div className="space-y-8">
                  <button 
                    onClick={() => setActiveModal('sub')}
                    className="group w-full p-6 bg-stone-900 text-white rounded-[2.5rem] flex items-center justify-between hover:bg-stone-800 transition-all shadow-2xl shadow-stone-300 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white/10 p-2 rounded-xl group-hover:bg-indigo-500 transition-colors">
                        <Repeat className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-lg">Substitution logic explained</span>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-30 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                          <h3 className="font-black uppercase tracking-widest text-stone-400 text-xs">Mono: Caesar Shift</h3>
                        </div>
                        <div className="flex items-center gap-4 bg-stone-50 p-5 rounded-[1.5rem] border border-stone-100 shadow-inner">
                          <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Shift Amount</span>
                          <input type="number" value={caesarShift} onChange={(e) => setCaesarShift(parseInt(e.target.value, 10) || 0)} className="w-20 p-3 bg-white border border-stone-200 rounded-xl text-center font-black text-lg focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                        </div>
                        <p className="text-xs font-bold text-stone-400 italic bg-stone-50/50 p-3 rounded-xl border border-stone-100/50 uppercase tracking-tighter">Shift {caesarShift}: MOM → {ciphers.caesarShift('MOM', caesarShift)}</p>
                      </div>
                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                          <h3 className="font-black uppercase tracking-widest text-stone-400 text-xs">Poly: Vigenère</h3>
                        </div>
                        <div className="flex flex-col gap-4">
                          <div className="relative">
                            <input type="text" placeholder="SECRET KEY" value={vigenereKey} onChange={(e) => setVigenereKey(e.target.value.toUpperCase())} className="w-full p-4 pl-12 bg-stone-50 border border-stone-100 rounded-[1.5rem] font-black text-sm uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                            <Settings className="absolute left-4 top-4 w-5 h-5 text-stone-300" />
                          </div>
                          <label className="flex items-center gap-3 px-2 cursor-pointer group">
                            <input type="checkbox" checked={vigenereDecrypt} onChange={(e) => setVigenereDecrypt(e.target.checked)} className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-xs font-black text-stone-500 uppercase tracking-widest group-hover:text-stone-800 transition-colors">Reverse Mode (Decrypt)</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-8 border-t border-stone-50">
                      <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">Message to Process</h2>
                      <textarea
                        className="w-full h-40 p-6 bg-stone-50 border border-stone-100 rounded-[2rem] font-mono text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-stone-300"
                        placeholder="Type your plaintext or ciphertext here..."
                        value={subInput}
                        onChange={(e) => setSubInput(e.target.value)}
                      />
                    </div>

                    {subInput && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 relative group">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">Caesar Result</h4>
                            <CopyButton text={ciphers.caesarShift(subInput, caesarShift)} />
                          </div>
                          <p className="text-xl font-black text-emerald-900 break-all font-mono leading-relaxed tracking-widest">{ciphers.caesarShift(subInput, caesarShift)}</p>
                        </div>
                        <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 relative group">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em]">Vigenère Result</h4>
                            <CopyButton text={ciphers.vigenereCipher(subInput, vigenereKey, vigenereDecrypt)} />
                          </div>
                          <p className="text-xl font-black text-indigo-900 break-all font-mono leading-relaxed tracking-widest">{ciphers.vigenereCipher(subInput, vigenereKey, vigenereDecrypt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- TRANSPOSITION TAB --- */}
              {activeTab === 'transposition' && (
                <div className="space-y-8">
                  <button 
                    onClick={() => setActiveModal('trans')}
                    className="group w-full p-6 bg-stone-900 text-white rounded-[2.5rem] flex items-center justify-between hover:bg-stone-800 transition-all shadow-2xl shadow-stone-300 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white/10 p-2 rounded-xl group-hover:bg-indigo-500 transition-colors">
                        <Hash className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-lg">Position-based scrambling</span>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-30 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                        <h3 className="font-black uppercase tracking-widest text-stone-400 text-xs">Permutation Pattern</h3>
                      </div>
                      <div className="relative">
                        <input type="text" value={transKey} onChange={(e) => setTransKey(e.target.value)} className="w-full p-5 pl-12 bg-stone-50 border border-stone-100 rounded-[1.5rem] font-mono text-lg font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="e.g. 1, 4, 2, 3" />
                        <Settings className="absolute left-4 top-5 w-6 h-6 text-stone-300" />
                      </div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2">Example: "2, 1, 4, 3" swaps every pair of letters.</p>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-stone-50">
                      <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">Source Text</h2>
                      <textarea
                        className="w-full h-40 p-6 bg-stone-50 border border-stone-100 rounded-[2rem] font-mono text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-stone-300"
                        placeholder="Enter text to scramble..."
                        value={transInput}
                        onChange={(e) => setTransInput(e.target.value)}
                      />
                    </div>

                    {transInput && (
                      <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-100 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-full -mr-12 -mt-12 blur-2xl" />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-[0.3em]">Transposed Result</h4>
                          <CopyButton text={ciphers.transpositionCipher(transInput, transKey)} />
                        </div>
                        <p className="text-2xl font-black text-amber-900 break-all font-mono whitespace-pre relative z-10 leading-loose tracking-widest">
                          {ciphers.transpositionCipher(transInput, transKey)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- XOR TAB --- */}
              {activeTab === 'xor' && (
                <div className="space-y-8">
                  <button 
                    onClick={() => setActiveModal('xor')}
                    className="group w-full p-6 bg-stone-900 text-white rounded-[2.5rem] flex items-center justify-between hover:bg-stone-800 transition-all shadow-2xl shadow-stone-300 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white/10 p-2 rounded-xl group-hover:bg-indigo-500 transition-colors">
                        <Binary className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-lg">Bitwise logic explained</span>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-30 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 space-y-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-stone-900 rounded-full" />
                        <h3 className="font-black uppercase tracking-widest text-stone-400 text-xs">Binary Parameters</h3>
                      </div>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                          <input type="text" value={xorKey} onChange={(e) => setXorKey(e.target.value)} className="w-full p-5 pl-14 bg-stone-50 border border-stone-100 rounded-[1.5rem] font-bold text-lg focus:ring-4 focus:ring-indigo-500/10 outline-none" placeholder="Secret Key (String)" />
                          <ShieldAlert className="absolute left-5 top-5 w-6 h-6 text-stone-300" />
                        </div>
                        <div className="bg-stone-50 px-6 py-5 rounded-[1.5rem] border border-stone-100 flex items-center justify-center">
                          <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Type: UTF-8 String</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-stone-50">
                      <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">Source Bitstream</h2>
                      <textarea
                        className="w-full h-40 p-6 bg-stone-50 border border-stone-100 rounded-[2rem] font-mono text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-stone-300"
                        placeholder="Enter message to XOR..."
                        value={xorInput}
                        onChange={(e) => setXorInput(e.target.value)}
                      />
                    </div>

                    {xorInput && (
                      <div className="space-y-6">
                        <div className="p-8 bg-stone-900 text-stone-100 rounded-[2.5rem] shadow-2xl border border-stone-800 relative overflow-hidden group">
                          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                          <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="space-y-1">
                              <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em]">Raw Binary Bitstream</h4>
                              <div className="h-0.5 w-12 bg-indigo-500 rounded-full" />
                            </div>
                            <CopyButton text={ciphers.xorCipher(xorInput, xorKey).binary} />
                          </div>
                          <p className="text-[11px] font-mono break-all leading-loose opacity-70 selection:bg-white selection:text-black relative z-10 tracking-widest">{ciphers.xorCipher(xorInput, xorKey).binary}</p>
                          
                          <div className="mt-10 space-y-1 relative z-10">
                            <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em]">Hexadecimal Map</h4>
                            <p className="text-xs font-mono break-all leading-relaxed opacity-70 tracking-[0.2em]">{ciphers.xorCipher(xorInput, xorKey).hex}</p>
                          </div>
                        </div>

                        <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 shadow-sm relative group">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.3em]">XOR Result (ASCII)</h4>
                            <CopyButton text={ciphers.xorCipher(xorInput, xorKey).text} />
                          </div>
                          <p className="text-2xl font-black text-emerald-900 break-all font-mono italic tracking-widest">
                            {ciphers.xorCipher(xorInput, xorKey).text || <span className="text-stone-300 font-normal text-sm tracking-normal">(Non-printable result)</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}

