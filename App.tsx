import React, { useState, useRef, useEffect } from 'react';
import { runAudit, testConnection } from './services/geminiService';
import { UploadedFile, AuditStatus } from './types';
import { DEFAULT_SYSTEM_PROMPT, TARGET_MODEL_ID, DEFAULT_LOGO_URL, HARDCODED_API_KEY, AVAILABLE_MODELS } from './constants';

// Sub-components defined in the same file for simplicity

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
  
  // Test Connection State
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
      <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl border-4 border-ghibli-wood relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
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
                {/* API Key Input */}
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                  <label className="block text-sm font-bold text-ghibli-wood mb-2">
                    <i className="fas fa-key mr-1"></i> Gemini API Key (金鑰)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      value={localApiKey}
                      onChange={(e) => setLocalApiKey(e.target.value)}
                      className="flex-1 input-ghibli px-4 py-3 font-mono text-sm"
                      placeholder={HARDCODED_API_KEY ? "已在程式碼中設定 (可留白)" : "在此貼上 AIzaSy..."}
                    />
                    <button 
                      onClick={handleTestConnection} 
                      disabled={testStatus === 'testing'}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${testStatus === 'testing' ? 'bg-gray-300 text-gray-500' : 'bg-white border border-ghibli-wood text-ghibli-wood hover:bg-orange-100'}`}
                    >
                      {testStatus === 'testing' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plug"></i>} 驗證連線
                    </button>
                  </div>
                  <p className="text-xs mt-2 font-mono">
                    {testMsg ? (
                        <span className={`block p-2 rounded ${testStatus === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-600 border border-red-300'}`}>
                            {testMsg}
                        </span>
                    ) : (
                        <span className="text-gray-500">
                          {HARDCODED_API_KEY ? "ℹ️ 檢測到 constants.ts 中已有 Key，您可在此覆蓋。" : "系統將依序讀取：輸入框 > 程式碼(constants.ts) > 環境變數"}
                        </span>
                    )}
                  </p>
                </div>

                {/* Model Selection */}
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
                   <p className="text-xs text-gray-400 mt-1 ml-1">若 3 Pro 連接失敗 (紅燈)，請切換至 Flash。</p>
                </div>

                {/* Logo Setting */}
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
                     <div className="w-12 h-12 border border-gray-200 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                        {localLogoUrl ? <img src={localLogoUrl} className="w-full h-full object-contain" alt="Preview" /> : <span className="text-xs">預覽</span>}
                     </div>
                  </div>
                </div>

                {/* System Prompt */}
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
  const sections = markdown.split(/(?=^## )/gm).filter(s => s.trim().length > 0);

  return (
    <div className="space-y-6">
      {sections.map((section, idx) => {
        const titleMatch = section.match(/^##\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : '總結';
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
          <div key={idx} className="magic-card animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
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
  
  // State initialization
  const [systemPrompt, setSystemPrompt] = useState(() => 
    localStorage.getItem('rb_system_prompt') || DEFAULT_SYSTEM_PROMPT
  );
  const [logoUrl, setLogoUrl] = useState(() => 
    localStorage.getItem('rb_logo_url') || DEFAULT_LOGO_URL
  );
  // Restore API Key State
  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem('rb_api_key') || ''
  );
  const [currentModelId, setCurrentModelId] = useState(() => 
    localStorage.getItem('rb_model_id') || TARGET_MODEL_ID
  );

  const [status, setStatus] = useState<AuditStatus>('idle');
  const [result, setResult] = useState('');
  
  // Connection Status (Traffic Light)
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

  // Auto-check connection on mount and when key changes
  useEffect(() => {
    const checkConn = async () => {
      // 檢查是否有任何一種 Key (Local, Hardcoded, Env)
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
    
    localStorage.setItem('rb_system_prompt', settings.prompt);
    localStorage.setItem('rb_logo_url', settings.logoUrl);
    localStorage.setItem('rb_api_key', settings.apiKey);
    localStorage.setItem('rb_model_id', settings.modelId);

    setMsgModal({
      isOpen: true,
      title: '設定已更新',
      message: '小煤炭球已將新的設定（包含金鑰與模型）搬運至核心。',
      icon: '💾',
      type: 'success'
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      setMsgModal({
        isOpen: true,
        title: '檔案太重了',
        message: '請上傳小於 10MB 的檔案，精靈搬不動。',
        icon: '🍃',
        type: 'error'
      });
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
       setMsgModal({
        isOpen: true,
        title: '連線異常',
        message: `API 連線失敗，無法召喚總監。\n原因：${connMsg}\n\n💡 請點擊右上方紅燈，檢查 Key 是否正確，或嘗試切換模型 (例如 Gemini 2.0 Flash)。`,
        icon: '🚫',
        type: 'error'
      });
      return;
    }

    if (!file && !inputText.trim()) {
      setMsgModal({
        isOpen: true,
        title: '魔法書是空的',
        message: '請至少「上傳一個檔案」或「輸入一段咒語(文案)」。',
        icon: '📖',
        type: 'info'
      });
      return;
    }

    setStatus('loading');
    try {
      const response = await runAudit(inputText, file, systemPrompt, currentModelId, apiKey);
      setResult(response);
      setStatus('success');
    } catch (error: any) {
      setMsgModal({
        isOpen: true,
        title: '召喚失敗',
        message: error.message || 'Unknown error',
        icon: '🔥',
        type: 'error'
      });
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-28 px-8 flex items-center justify-between z-10 shrink-0 bg-transparent">
        <div className="flex items-center gap-6">
          {/* Redesigned Logo Container with Glow */}
          <div className="group relative">
             <div className="absolute -inset-2 bg-ghibli-accent/20 rounded-full blur-md group-hover:blur-lg transition-all duration-500"></div>
             <div className="w-20 h-20 bg-white rounded-3xl border-[3px] border-ghibli-wood flex items-center justify-center overflow-hidden shadow-[4px_4px_0px_rgba(93,64,55,1)] transform group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0px_rgba(93,64,55,1)] transition-all duration-300 relative z-10">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
                ) : (
                  <i className="fas fa-bear text-3xl text-ghibli-wood"></i>
                )}
             </div>
          </div>
          
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-black text-ghibli-wood tracking-wide drop-shadow-sm leading-tight">Rich Bear</h1>
            <div className="flex items-center gap-3 text-ghibli-wood/80 font-bold mt-1">
               <span className="text-lg">審核之森</span>
               <div className="h-1 w-1 rounded-full bg-ghibli-wood/40"></div>
               <span 
                className="bg-white/60 px-3 py-0.5 rounded-full border border-ghibli-wood/20 text-xs text-ghibli-wood/60 cursor-pointer hover:bg-white hover:text-ghibli-accent transition-colors flex items-center gap-1"
                onClick={() => setAdminOpen(true)}
              >
                <i className="fas fa-server"></i> {currentModelId}
              </span>
            </div>
          </div>
        </div>

        {/* Traffic Light Status Indicator */}
        <div 
          onClick={() => setAdminOpen(true)}
          className={`hidden md:flex items-center gap-3 px-5 py-3 bg-white/90 backdrop-blur rounded-2xl border-2 cursor-pointer transition-all hover:scale-105 shadow-md ${
            connStatus === 'connected' ? 'border-green-200 text-green-800' :
            connStatus === 'error' ? 'border-red-200 text-red-800' :
            'border-gray-200 text-gray-600'
          }`}
        >
             <div className="relative flex h-4 w-4">
                {connStatus === 'checking' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>}
                {connStatus === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                {connStatus === 'error' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                
                <span className={`relative inline-flex rounded-full h-4 w-4 ${
                    connStatus === 'connected' ? 'bg-green-500' :
                    connStatus === 'error' ? 'bg-red-500' :
                    connStatus === 'checking' ? 'bg-yellow-500' : 'bg-gray-300'
                }`}></span>
             </div>
             
             <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                    {currentModelId === TARGET_MODEL_ID ? 'Gemini 3 Pro' : 'AI Model'}
                </span>
                <span className="text-sm font-black">
                    {connStatus === 'connected' ? '連線正常' :
                     connStatus === 'error' ? '連線失敗' :
                     connStatus === 'checking' ? '檢查中...' : '尚未設定'}
                </span>
             </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex gap-8 p-8 pt-4 z-10 overflow-hidden relative">
        
        {/* Left Panel: Input */}
        <div className="w-full md:w-1/3 flex flex-col h-full animate-fade-in-up">
          <div className="ghibli-panel p-8 flex-1 flex flex-col z-20">
            <h2 className="text-2xl font-black text-ghibli-wood mb-2 flex items-center gap-3">
              <i className="fas fa-envelope-open-text text-ghibli-accent"></i> 投遞素材
            </h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">請將您的銷售頁 (PDF/圖片) 放入信箱。</p>

            {/* File Drop Zone */}
            <div className="relative group h-48 mb-6 cursor-pointer">
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*,application/pdf" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                onChange={handleFileChange}
              />
              
              {!file ? (
                <div className="absolute inset-0 bg-white border-2 border-dashed border-ghibli-wood/30 rounded-2xl flex flex-col items-center justify-center text-ghibli-wood group-hover:border-ghibli-accent group-hover:bg-orange-50/50 transition-all duration-300">
                  <div className="w-16 h-16 bg-ghibli-bg rounded-full flex items-center justify-center mb-3 shadow-sm">
                    <i className="fas fa-leaf text-2xl text-ghibli-grass"></i>
                  </div>
                  <p className="font-bold text-lg">拖曳檔案至此</p>
                  <p className="text-xs text-gray-400 mt-1">支援 圖片 (JPG/PNG) 或 PDF</p>
                </div>
              ) : (
                <div className="absolute inset-0 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-ghibli-grass relative z-10">
                   {file.mimeType.startsWith('image/') ? (
                     <img src={`data:${file.mimeType};base64,${file.data}`} className="h-full w-full object-contain p-2" alt="Preview" />
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

            {/* Text Input */}
            <div className="flex-1 flex flex-col relative z-20">
              <label className="block text-sm font-black text-ghibli-wood mb-2 ml-1">
                <i className="fas fa-feather-alt mr-2 text-ghibli-accent"></i>補充咒語 (文案/備註)
              </label>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 w-full input-ghibli p-4 text-base leading-relaxed resize-none" 
                placeholder="在此寫下產品文案..."
              ></textarea>
            </div>

            <button 
              onClick={handleAudit}
              disabled={status === 'loading'}
              className="mt-6 btn-magic w-full py-4 text-xl flex items-center justify-center gap-3 relative overflow-hidden group z-20"
            >
              {status === 'loading' ? (
                <>
                  <div className="magic-loader"></div>
                  <span className="ml-3">地獄總監連線中...</span>
                </>
              ) : (
                <>
                  <span className="absolute w-64 h-64 mt-12 group-hover:-rotate-45 group-hover:-mt-24 transition-all duration-1000 ease-out -rotate-45 -translate-x-24 bg-white opacity-10"></span>
                  <i className="fas fa-fire-alt group-hover:animate-pulse"></i>
                  <span>召喚地獄總監</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Output */}
        <div className="w-full md:w-2/3 flex flex-col h-full animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="ghibli-panel p-1 flex-1 flex flex-col relative bg-[#fff]">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-200/50 to-transparent z-20 pointer-events-none"></div>
            <div className="flex-1 overflow-y-auto p-10 relative z-10 scroll-smooth" id="result-area">
              
              {status === 'idle' && (
                 <div className="flex flex-col items-center justify-center h-full text-ghibli-wood/40">
                  <div className="w-40 h-40 bg-ghibli-bg rounded-full flex items-center justify-center mb-6 border-4 border-dashed border-ghibli-wood/20">
                    <i className="fas fa-book-reader text-6xl text-ghibli-wood/30"></i>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">魔法書準備就緒</h3>
                  <p className="text-lg">等待素材注入...</p>
                </div>
              )}

              {status === 'loading' && (
                <div className="flex flex-col items-center justify-center h-full space-y-6 animate-pulse">
                  <div className="text-6xl text-ghibli-accent animate-bounce">🔥</div>
                  <div className="text-center">
                    <p className="text-ghibli-wood font-black text-xl mb-1">正在燃燒經費召喚總監...</p>
                    <p className="text-sm text-gray-500">正在執行商業邏輯運算 ({currentModelId})</p>
                  </div>
                </div>
              )}

              {status === 'success' && (
                <MagicCardsDisplay markdown={result} />
              )}
              
              {status === 'error' && (
                 <div className="p-6 border-4 border-red-200 rounded-3xl bg-red-50 text-red-800 text-center animate-fade-in-up">
                    <i className="fas fa-bomb text-5xl mb-4 text-red-500"></i>
                    <h3 className="font-black text-xl mb-2">召喚失敗</h3>
                    <p className="mb-4 font-bold text-lg">系統遭遇不可抗力之錯誤</p>
                    <button onClick={() => setStatus('idle')} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold">重置</button>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      {/* Admin Button */}
      <div className="soot-sprite" title="老闆專用通道" onClick={() => setAdminOpen(true)}>
        <i className="fas fa-cog"></i>
      </div>

      {/* Modals */}
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