import React, { useState, useRef, useEffect } from 'react';
import { runAuditStream, testConnection } from './services/geminiService';
import { UploadedFile, AuditStatus } from './types';
import { DEFAULT_SYSTEM_PROMPT, TARGET_MODEL_ID, DEFAULT_LOGO_URL, HARDCODED_API_KEY, AVAILABLE_MODELS } from './constants';

const MessageModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  icon: string;
  onClose: () => void;
  type?: 'error' | 'success' | 'info';
}> = ({ isOpen, title, message, icon, onClose, type = 'info' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-fade-in-up">
      <div className={`bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-4 ${type === 'error' ? 'border-red-400' : 'border-ghibli-wood'} text-center transform scale-100 transition-transform`}>
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-xl font-black text-ghibli-wood mb-2">{title}</h3>
        <p className="text-gray-600 mb-6 whitespace-pre-wrap">{message}</p>
        <button onClick={onClose} className="btn-magic px-6 py-2 w-full">知道了</button>
      </div>
    </div>
  );
};

const AdminModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  logoUrl: string;
  apiKey: string;
  currentModelId: string;
  onSave: (settings: { prompt: string; logoUrl: string; apiKey: string; modelId: string }) => void;
}> = ({ isOpen, onClose, systemPrompt, logoUrl, apiKey, currentModelId, onSave }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [localLogoUrl, setLocalLogoUrl] = useState(logoUrl);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localModelId, setLocalModelId] = useState(currentModelId);
  
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPassword('');
      setLocalPrompt(systemPrompt);
      setLocalLogoUrl(logoUrl);
      setLocalApiKey(apiKey);
      setLocalModelId(currentModelId);
      setTestStatus('idle');
      setTestMsg('');
    }
  }, [isOpen, systemPrompt, logoUrl, apiKey, currentModelId]);

  const handleUnlock = () => {
    if (password === '8888') {
      setStep(2);
    } else {
      alert("密碼錯誤 (Try 8888)");
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMsg(`驗證 ${localModelId} 中...`);
    const result = await testConnection(localModelId, localApiKey);
    if (result.success) {
      setTestStatus('success');
      setTestMsg(result.message);
    } else {
      setTestStatus('fail');
      setTestMsg(result.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl border-4 border-ghibli-wood relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><i className="fas fa-times text-xl"></i></button>
        
        {step === 1 ? (
          <div className="text-center">
            <h3 className="text-2xl font-black text-ghibli-wood mb-2">老闆專屬結界</h3>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-center text-3xl tracking-[1em] w-full border-b-2 border-ghibli-wood py-2 focus:outline-none mb-6" 
              maxLength={4} 
              placeholder="••••"
            />
            <button onClick={handleUnlock} className="btn-magic px-8 py-3 w-full text-lg">解鎖</button>
          </div>
        ) : (
          <div>
             <h3 className="text-2xl font-black text-ghibli-wood mb-6 flex items-center gap-2">
                <i className="fas fa-sliders-h text-ghibli-accent"></i> 核心設定
            </h3>
            <div className="space-y-6">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                  <label className="block text-sm font-bold text-ghibli-wood mb-2">
                    <i className="fas fa-key mr-1"></i> Gemini API Key (金鑰)
                  </label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input 
                      type="password" 
                      value={localApiKey}
                      onChange={(e) => setLocalApiKey(e.target.value)}
                      className="flex-1 input-ghibli px-4 py-3 font-mono text-sm"
                      placeholder={HARDCODED_API_KEY ? "已在程式碼中設定" : "在此貼上 AIzaSy..."}
                    />
                    <button 
                      onClick={handleTestConnection} 
                      disabled={testStatus === 'testing'}
                      className={`px-4 py-3 md:py-2 rounded-lg font-bold text-sm transition-colors ${testStatus === 'testing' ? 'bg-gray-300 text-gray-500' : 'bg-white border border-ghibli-wood text-ghibli-wood hover:bg-orange-100'}`}
                    >
                      {testStatus === 'testing' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plug"></i>} <span className="md:hidden lg:inline">驗證連線</span>
                    </button>
                  </div>
                  <p className="text-xs mt-2 font-mono text-gray-500">
                    {testMsg && <span className={`mr-2 ${testStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>{testMsg}</span>}
                  </p>
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-600 mb-2">選擇 AI 模型</label>
                   <select 
                     value={localModelId} 
                     onChange={(e) => {
                        setLocalModelId(e.target.value);
                        setTestStatus('idle');
                        setTestMsg('');
                     }}
                     className="w-full input-ghibli px-4 py-3 text-sm font-mono"
                   >
                      {AVAILABLE_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                      ))}
                   </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">品牌 Logo 圖片連結 (URL)</label>
                  <div className="flex gap-4 items-start">
                     <div className="flex-1">
                        <input 
                            type="text" 
                            value={localLogoUrl}
                            onChange={(e) => setLocalLogoUrl(e.target.value)}
                            className="w-full input-ghibli px-4 py-3 text-sm font-mono"
                            placeholder="https://example.com/logo.png"
                        />
                     </div>
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">系統指令 (System Instruction)</label>
                    <textarea 
                      value={localPrompt}
                      onChange={(e) => setLocalPrompt(e.target.value)}
                      className="w-full input-ghibli p-4 font-mono text-xs h-40" 
                      spellCheck={false}
                    ></textarea>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">取消</button>
                    <button 
                      onClick={() => { 
                        onSave({ prompt: localPrompt, logoUrl: localLogoUrl, apiKey: localApiKey, modelId: localModelId }); 
                        onClose(); 
                      }} 
                      className="flex-1 btn-magic py-3 text-lg shadow-lg"
                    >
                      儲存變更
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MagicCardsDisplay: React.FC<{ markdown: string }> = ({ markdown }) => {
  // Simple check to render something even if markdown is incomplete during streaming
  if (!markdown) return null;

  const sections = markdown.split(/(?=^## )/gm).filter(s => s.trim().length > 0);

  // Fallback if structure isn't fully formed yet
  if (sections.length === 0 && markdown.length > 0) {
      return (
        <div className="magic-card animate-pulse">
            <h2><i className="fas fa-pen-nib animate-bounce"></i> 總監思考中...</h2>
            <div className="whitespace-pre-wrap text-ghibli-wood/80">{markdown}</div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      {sections.map((section, idx) => {
        const titleMatch = section.match(/^##\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : '分析報告';
        let content = section.replace(/^##\s+.+$/m, '').trim();
        
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/^\*\s+(.+)$/gm, '<li>$1</li>');
        content = content.replace(/^- \s+(.+)$/gm, '<li>$1</li>');
        
        if (content.includes('<li>') && !content.includes('<ul>')) {
             content = content.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
        }

        content = content.split('\n\n').map(p => {
             if (!p.includes('<ul>') && !p.includes('<li>')) return `<p>${p}</p>`;
             return p;
        }).join('');

        return (
          <div key={idx} className="magic-card animate-fade-in-up" style={{ animationDelay: '0s' }}>
            <h2>{title}</h2>
            <div dangerouslySetInnerHTML={{ __html: content }} className="text-ghibli-wood/90" />
          </div>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [inputText, setInputText] = useState('');
  
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem('rb_system_prompt') || DEFAULT_SYSTEM_PROMPT);
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('rb_logo_url') || DEFAULT_LOGO_URL);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('rb_api_key') || '');
  const [currentModelId, setCurrentModelId] = useState(() => localStorage.getItem('rb_model_id') || TARGET_MODEL_ID);
  const [imgError, setImgError] = useState(false);

  const [status, setStatus] = useState<AuditStatus>('idle');
  const [result, setResult] = useState('');
  
  const [connStatus, setConnStatus] = useState<'checking' | 'connected' | 'error' | 'none'>('none');
  const [connMsg, setConnMsg] = useState('');

  const [msgModal, setMsgModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    icon: string;
    type: 'error' | 'success' | 'info';
  }>({ isOpen: false, title: '', message: '', icon: '', type: 'info' });
  const [adminOpen, setAdminOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkConn = async () => {
      if (!apiKey && !HARDCODED_API_KEY && !process.env.API_KEY) {
        setConnStatus('none');
        return;
      }
      setConnStatus('checking');
      const result = await testConnection(currentModelId, apiKey);
      if (result.success) {
        setConnStatus('connected');
        setConnMsg(result.message);
      } else {
        setConnStatus('error');
        setConnMsg(result.message);
      }
    };
    checkConn();
  }, [apiKey, currentModelId]);

  const handleSaveSettings = (settings: { prompt: string; logoUrl: string; apiKey: string; modelId: string }) => {
    setSystemPrompt(settings.prompt);
    setLogoUrl(settings.logoUrl);
    setApiKey(settings.apiKey);
    setCurrentModelId(settings.modelId);
    setImgError(false);
    
    localStorage.setItem('rb_system_prompt', settings.prompt);
    localStorage.setItem('rb_logo_url', settings.logoUrl);
    localStorage.setItem('rb_api_key', settings.apiKey);
    localStorage.setItem('rb_model_id', settings.modelId);

    setMsgModal({ isOpen: true, title: '設定已更新', message: '小煤炭球已將新的設定搬運至核心。', icon: '💾', type: 'success' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Upgraded limit to 200MB for video support
    if (selectedFile.size > 200 * 1024 * 1024) {
      setMsgModal({ isOpen: true, title: '檔案太重了', message: '請上傳小於 200MB 的檔案。', icon: '🍃', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Raw = event.target?.result as string;
      setFile({
        mimeType: selectedFile.type,
        data: base64Raw.split(',')[1],
        name: selectedFile.name
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAudit = async () => {
    if (connStatus === 'error') {
       setMsgModal({ isOpen: true, title: '連線異常', message: `API 連線失敗，請檢查金鑰。\n原因：${connMsg}`, icon: '🚫', type: 'error' });
       return;
    }

    if (!file && !inputText.trim()) {
      setMsgModal({ isOpen: true, title: '魔法書是空的', message: '請至少「上傳一個檔案」或「輸入一段咒語」。', icon: '📖', type: 'info' });
      return;
    }

    setStatus('loading');
    setResult('');
    
    // Auto scroll to result area on mobile
    if (window.innerWidth < 1024) {
      setTimeout(() => { document.getElementById('result-area')?.scrollIntoView({ behavior: 'smooth' }); }, 300);
    }

    try {
      // Use Streaming implementation
      setStatus('streaming');
      const stream = runAuditStream(inputText, file, systemPrompt, currentModelId, apiKey);
      
      let fullText = '';
      for await (const chunk of stream) {
          fullText += chunk;
          setResult(fullText);
      }
      setStatus('success');

    } catch (error: any) {
      setMsgModal({ isOpen: true, title: '召喚失敗', message: error.message || 'Unknown error', icon: '🔥', type: 'error' });
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-auto min-h-[80px] md:h-28 px-4 md:px-8 py-4 md:py-0 flex flex-wrap md:flex-nowrap items-center justify-between z-10 shrink-0 bg-transparent gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="group relative">
             <div className="absolute -inset-2 bg-ghibli-accent/20 rounded-full blur-md group-hover:blur-lg transition-all duration-500"></div>
             <div className="w-14 h-14 md:w-20 md:h-20 bg-white rounded-2xl md:rounded-3xl border-[3px] border-ghibli-wood flex items-center justify-center overflow-hidden shadow-[3px_3px_0px_rgba(93,64,55,1)] md:shadow-[4px_4px_0px_rgba(93,64,55,1)] transform group-hover:-translate-y-1 transition-all duration-300 relative z-10">
                {!imgError && logoUrl ? (
                  <img src={logoUrl} onError={() => setImgError(true)} alt="Logo" className="w-10 h-10 md:w-14 md:h-14 object-contain" />
                ) : (
                  <i className="fas fa-paw text-2xl md:text-4xl text-ghibli-wood"></i>
                )}
             </div>
          </div>
          
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl md:text-4xl font-black text-ghibli-wood tracking-wide drop-shadow-sm leading-tight">Rich Bear</h1>
            <div className="flex items-center gap-2 md:gap-3 text-ghibli-wood/80 font-bold mt-1">
               <span className="text-sm md:text-lg">審核之森</span>
               <div className="h-1 w-1 rounded-full bg-ghibli-wood/40"></div>
               <span onClick={() => setAdminOpen(true)} className="bg-white/60 px-2 md:px-3 py-0.5 rounded-full border border-ghibli-wood/20 text-xs text-ghibli-wood/60 cursor-pointer hover:bg-white hover:text-ghibli-accent transition-colors flex items-center gap-1">
                <i className="fas fa-server"></i> {currentModelId}
              </span>
            </div>
          </div>
        </div>

        <div onClick={() => setAdminOpen(true)} className={`flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3 bg-white/90 backdrop-blur rounded-xl md:rounded-2xl border-2 cursor-pointer transition-all hover:scale-105 shadow-md ml-auto md:ml-0 ${connStatus === 'connected' ? 'border-green-200 text-green-800' : connStatus === 'error' ? 'border-red-200 text-red-800' : 'border-gray-200 text-gray-600'}`}>
             <div className="relative flex h-3 w-3 md:h-4 md:w-4 shrink-0">
                {connStatus === 'checking' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>}
                {connStatus === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                {connStatus === 'error' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-full w-full ${connStatus === 'connected' ? 'bg-green-500' : connStatus === 'error' ? 'bg-red-500' : connStatus === 'checking' ? 'bg-yellow-500' : 'bg-gray-300'}`}></span>
             </div>
             <div className="flex flex-col hidden md:flex">
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">AI Status</span>
                <span className="text-sm font-black">{connStatus === 'connected' ? '連線正常' : connStatus === 'error' ? '連線失敗' : '檢查中...'}</span>
             </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-8 p-4 lg:p-8 pt-0 z-10 overflow-y-auto lg:overflow-hidden relative scroll-smooth">
        
        {/* Left Panel */}
        <div className="w-full lg:w-1/3 flex-none lg:flex-1 flex flex-col animate-fade-in-up lg:h-full shrink-0">
          <div className="ghibli-panel p-6 md:p-8 flex-1 flex flex-col z-20 h-full min-h-[400px]">
            <h2 className="text-xl md:text-2xl font-black text-ghibli-wood mb-2 flex items-center gap-3">
              <i className="fas fa-video text-ghibli-accent"></i> 素材投放
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6 font-medium">支援 圖片 (JPG/PNG) 或 影片 (MP4/MOV, Max 200MB)</p>

            <div className="relative group h-40 md:h-48 mb-6 cursor-pointer shrink-0">
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*,application/pdf,video/*" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                onChange={handleFileChange}
              />
              
              {!file ? (
                <div className="absolute inset-0 bg-white border-2 border-dashed border-ghibli-wood/30 rounded-2xl flex flex-col items-center justify-center text-ghibli-wood group-hover:border-ghibli-accent group-hover:bg-orange-50/50 transition-all duration-300">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-ghibli-bg rounded-full flex items-center justify-center mb-2 md:mb-3 shadow-sm">
                    <i className="fas fa-cloud-upload-alt text-xl md:text-2xl text-ghibli-grass"></i>
                  </div>
                  <p className="font-bold text-base md:text-lg">點擊上傳素材</p>
                </div>
              ) : (
                <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-ghibli-grass relative z-10">
                   {file.mimeType.startsWith('image/') ? (
                     <img src={`data:${file.mimeType};base64,${file.data}`} className="h-full w-full object-contain p-2" alt="Preview" />
                   ) : file.mimeType.startsWith('video/') ? (
                     <video src={`data:${file.mimeType};base64,${file.data}`} className="h-full w-full object-contain bg-black" controls playsInline />
                   ) : (
                     <div className="text-center">
                        <i className="fas fa-file-pdf text-red-500 text-5xl mb-3"></i>
                        <p className="text-sm text-ghibli-wood font-bold px-4 truncate max-w-[200px]">{file.name}</p>
                     </div>
                   )}
                   <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile(); }}
                    className="absolute top-2 right-2 bg-white text-ghibli-wood rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-100 hover:text-red-500 z-30 shadow-md border border-gray-100 transition-colors"
                   >
                     <i className="fas fa-times"></i>
                   </button>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col relative z-20 min-h-[120px]">
              <label className="block text-sm font-black text-ghibli-wood mb-2 ml-1">
                <i className="fas fa-feather-alt mr-2 text-ghibli-accent"></i> 補充資訊
              </label>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 w-full input-ghibli p-4 text-base leading-relaxed resize-none" 
                placeholder="例如：這是一支賣洗髮精的短影音..."
              ></textarea>
            </div>

            <button 
              onClick={handleAudit}
              disabled={status === 'loading' || status === 'streaming'}
              className="mt-6 btn-magic w-full py-4 text-lg md:text-xl flex items-center justify-center gap-3 relative overflow-hidden group z-20 shrink-0"
            >
              {status === 'loading' || status === 'streaming' ? (
                <>
                  <div className="magic-loader"></div>
                  <span className="ml-3">總監正在看...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-bolt group-hover:animate-pulse"></i>
                  <span>3秒生死判決</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-2/3 flex-none lg:flex-1 flex flex-col animate-fade-in-up lg:h-full shrink-0 min-h-[60vh] pb-8 lg:pb-0" style={{ animationDelay: '0.1s' }} id="result-area">
          <div className="ghibli-panel p-1 flex-1 flex flex-col relative bg-[#fff] h-full">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-200/50 to-transparent z-20 pointer-events-none"></div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10 scroll-smooth">
              
              {status === 'idle' && (
                 <div className="flex flex-col items-center justify-center h-full text-ghibli-wood/40 py-20 lg:py-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-ghibli-bg rounded-full flex items-center justify-center mb-6 border-4 border-dashed border-ghibli-wood/20">
                    <i className="fas fa-stopwatch text-5xl md:text-6xl text-ghibli-wood/30"></i>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3">等待挑戰者</h3>
                  <p className="text-base md:text-lg">上傳影片/圖片，測試你的「滑動阻斷力」</p>
                </div>
              )}

              {status === 'loading' && (
                <div className="flex flex-col items-center justify-center h-full space-y-6 animate-pulse py-20 lg:py-0">
                  <div className="text-6xl text-ghibli-accent animate-spin-slow">⏳</div>
                  <div className="text-center">
                    <p className="text-ghibli-wood font-black text-xl mb-1">正在載入 Gemini 3 Pro...</p>
                  </div>
                </div>
              )}

              {(status === 'success' || status === 'streaming') && (
                <MagicCardsDisplay markdown={result} />
              )}
              
              {status === 'error' && (
                 <div className="p-6 border-4 border-red-200 rounded-3xl bg-red-50 text-red-800 text-center animate-fade-in-up mt-10 lg:mt-0">
                    <i className="fas fa-bomb text-5xl mb-4 text-red-500"></i>
                    <h3 className="font-black text-xl mb-2">召喚失敗</h3>
                    <p className="mb-4 font-bold text-lg">請檢查 API Key 或網路狀態</p>
                    <button onClick={() => setStatus('idle')} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold">重置</button>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      <div className="soot-sprite" title="設定" onClick={() => setAdminOpen(true)}>
        <i className="fas fa-cog"></i>
      </div>

      <MessageModal 
        isOpen={msgModal.isOpen} 
        title={msgModal.title}
        message={msgModal.message}
        icon={msgModal.icon}
        type={msgModal.type}
        onClose={() => setMsgModal(prev => ({ ...prev, isOpen: false }))}
      />

      <AdminModal 
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        systemPrompt={systemPrompt}
        logoUrl={logoUrl}
        apiKey={apiKey}
        currentModelId={currentModelId}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;
