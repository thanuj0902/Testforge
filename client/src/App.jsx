import { useState, useEffect, useCallback, useRef } from 'react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import typescript from 'highlight.js/lib/languages/typescript'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('go', go)
hljs.registerLanguage('typescript', typescript)

const DEFAULT_CODE = [
  'function calculateTotal(items) {',
  '  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);',
  '}',
  '',
  'function validateEmail(email) {',
  "  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;",
  '  return regex.test(email);',
  '}',
  '',
  'async function fetchUserData(userId) {',
  "  const response = await fetch(`https://api.example.com/users/${userId}`);",
  "  if (!response.ok) throw new Error('User not found');",
  '  return response.json();',
  '}',
].join('\n')

const LANGS = {
  javascript: { name: 'JavaScript', framework: 'Jest', icon: '⚡', color: 'from-yellow-500 to-orange-500', hljs: 'javascript' },
  typescript: { name: 'TypeScript', framework: 'Jest', icon: '🔷', color: 'from-blue-500 to-cyan-500', hljs: 'typescript' },
  python: { name: 'Python', framework: 'pytest', icon: '🐍', color: 'from-green-500 to-emerald-600', hljs: 'python' },
  java: { name: 'Java', framework: 'JUnit 5', icon: '☕', color: 'from-red-500 to-orange-600', hljs: 'java' },
  go: { name: 'Go', framework: 'testing', icon: '🔷', color: 'from-cyan-500 to-teal-500', hljs: 'go' },
}

const EXT_MAP = { javascript: 'js', typescript: 'ts', python: 'py', java: 'java', go: 'go' }

function countTests(testCode) {
  if (!testCode) return null
  const describes = (testCode.match(/describe\(/g) || []).length
  const its = (testCode.match(/\bit\(/g) || []).length
  return { describes, its }
}

function highlightCode(code, lang) {
  const langId = LANGS[lang]?.hljs || 'javascript'
  try {
    const result = hljs.highlight(code, { language: langId })
    return result.value
  } catch {
    return code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [language, setLanguage] = useState('javascript')
  const [testCode, setTestCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('')
  const [languages, setLanguages] = useState([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [useAI, setUseAI] = useState(false)
  const [aiStatus, setAiStatus] = useState(null)
  const [aiProvider, setAiProvider] = useState('auto')
  const [dragOver, setDragOver] = useState(false)
  const [showSource, setShowSource] = useState(true)
  const fileInputRef = useRef(null)
  const testCodeRef = useRef(null)

  useEffect(() => {
    fetch('/api/languages')
      .then(res => res.json())
      .then(data => setLanguages(data.languages))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/ai/status')
      .then(res => res.json())
      .then(data => {
        const normalized = {
          available: data.available || data.providers?.length > 0,
          providers: data.providers || (data.available ? [{ id: 'ollama', name: 'Ollama', models: data.models || [] }] : []),
        }
        setAiStatus(normalized)
      })
      .catch(() => setAiStatus({ available: false, providers: [] }))
  }, [])

  const generateTests = useCallback(async (useAIFlag) => {
    setLoading(true)
    setError('')
    setTestCode('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          useAI: useAIFlag,
          aiProvider: useAIFlag ? aiProvider : undefined,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setTestCode(data.testCode)
        setMode(data.mode)
      }
    } catch {
      setError('Server not running. Start the server first.')
    } finally {
      setLoading(false)
    }
  }, [code, language, aiProvider])

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const newCode = code.substring(0, start) + '  ' + code.substring(end)
      setCode(newCode)
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2
      })
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(testCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const ext = EXT_MAP[language] || 'txt'
    const blob = new Blob([testCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${language}_tests.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result
      setCode(content)
      const ext = file.name.split('.').pop().toLowerCase()
      const langMap = { js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript', py: 'python', java: 'java', go: 'go' }
      if (langMap[ext]) setLanguage(langMap[ext])
    }
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const langInfo = LANGS[language] || LANGS.javascript
  const codeSize = new TextEncoder().encode(code).length
  const codeLimit = 50000
  const stats = countTests(testCode)
  const hasAIProviders = aiStatus?.providers?.length > 0

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <header className="border-b border-gray-800 bg-[#0d0d14]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
              T
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">TestForge</h1>
              <p className="text-[10px] text-gray-500 leading-tight">AI-Powered Test Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
              <span>Paste code → Get tests</span>
            </div>
            <a href="https://github.com/thanuj0902/Testforge" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest">Source Code</h2>
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  {languages.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 bg-gray-800/60 border border-gray-700/50 rounded-md px-2 py-1">
                  <span className="w-1 h-1 rounded-full bg-cyan-400" />
                  {langInfo.framework}
                </span>
              </div>
            </div>

            <div
              className={`relative group transition-all duration-200 ${dragOver ? 'ring-2 ring-violet-500' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {showSource ? (
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-[460px] bg-[#0d0d14] border border-gray-800 rounded-xl p-4 font-mono text-sm text-gray-300 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none placeholder-gray-700 leading-relaxed"
                  spellCheck={false}
                  placeholder="// Paste your source code here..."
                />
              ) : (
                <div className="w-full h-[460px] bg-[#0d0d14] border border-gray-800 rounded-xl p-4 overflow-auto">
                  <pre className="font-mono text-sm leading-relaxed">
                    <code dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }} />
                  </pre>
                </div>
              )}
              <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] text-gray-600">
                <button
                  onClick={() => setShowSource(!showSource)}
                  className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700/50 rounded px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showSource ? 'Preview' : 'Edit'}
                </button>
                <span>{code.split('\n').length} lines</span>
                <span className={`${codeSize > codeLimit * 0.9 ? 'text-red-400' : ''}`}>
                  {Math.round(codeSize / 1000)}K / {codeLimit / 1000}K
                </span>
              </div>
              <div className="absolute top-3 right-3 flex gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700/50 rounded-lg px-2.5 py-1 text-[10px] text-gray-500 hover:text-gray-300 transition-all opacity-0 group-hover:opacity-100"
                  title="Upload file"
                >
                  📁 Open
                </button>
                {code !== DEFAULT_CODE && (
                  <button
                    onClick={() => setCode(DEFAULT_CODE)}
                    className="bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700/50 rounded-lg px-2.5 py-1 text-[10px] text-gray-500 hover:text-gray-300 transition-all opacity-0 group-hover:opacity-100"
                  >
                    Reset
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".js,.ts,.jsx,.tsx,.py,.java,.go,.txt"
                className="hidden"
                onChange={e => {
                  if (e.target.files[0]) handleFileUpload(e.target.files[0])
                  e.target.value = ''
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-2">
                <button
                  onClick={() => generateTests(useAI)}
                  disabled={loading || !code.trim()}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl px-6 py-2.5 text-sm transition-all duration-200 shadow-lg shadow-violet-500/15 active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 00 0 1.4l1.6 1.6a1 1 0 00 1.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
                      Generate Tests
                    </span>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 bg-gray-800/40 border border-gray-700/50 rounded-xl px-3 py-1.5">
                <span className="text-[10px] text-gray-500 font-medium">AI</span>
                <button
                  onClick={() => {
                    if (!useAI && hasAIProviders) {
                      setUseAI(true)
                    } else if (useAI) {
                      setUseAI(false)
                    }
                  }}
                  disabled={!hasAIProviders}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${useAI ? 'bg-violet-600' : 'bg-gray-700'} ${!hasAIProviders ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useAI ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </button>
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasAIProviders ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                  {useAI && hasAIProviders && (
                    <select
                      value={aiProvider}
                      onChange={e => setAiProvider(e.target.value)}
                      className="bg-transparent text-[10px] text-gray-500 border-0 p-0 focus:outline-none cursor-pointer"
                    >
                      <option value="auto">Auto</option>
                      {aiStatus?.providers?.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest">Generated Tests</h2>
              <div className="flex items-center gap-2">
                {mode && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${mode === 'ai' ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'}`}>
                    <span className={`w-1 h-1 rounded-full inline-block mr-1 ${mode === 'ai' ? 'bg-violet-400' : 'bg-cyan-400'}`} />
                    {mode === 'ai' ? 'AI Enhanced' : 'Smart Engine'}
                  </span>
                )}
              </div>
            </div>

            <div className="relative group">
              {testCode ? (
                <>
                  {stats && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/30 border border-gray-800 rounded-t-xl border-b-0 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        {stats.describes} test suites
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        {stats.its} test cases
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        {testCode.split('\n').length} lines
                      </span>
                    </div>
                  )}
                  <pre
                    ref={testCodeRef}
                    className="w-full h-[460px] bg-[#0d0d14] border border-gray-800 rounded-xl p-4 font-mono text-sm text-gray-300 overflow-auto whitespace-pre-wrap leading-relaxed"
                  >
                    <code dangerouslySetInnerHTML={{
                      __html: highlightCode(testCode, language)
                    }} />
                  </pre>
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={handleDownload}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                      title="Download test file"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                    <button
                      onClick={handleCopy}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-[460px] bg-[#0d0d14] border border-gray-800 rounded-xl flex items-center justify-center">
                  <div className="text-center px-6">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-gray-800/50 flex items-center justify-center mb-4">
                      <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Waiting for tests...</p>
                    <p className="text-xs text-gray-700">Paste code and click Generate</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2.5 animate-in">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800/60 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(LANGS).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setLanguage(key)}
                className={`p-3 rounded-xl border text-center transition-all duration-200 ${language === key ? 'border-violet-500/40 bg-violet-500/8 shadow-lg shadow-violet-500/5' : 'border-gray-800/60 bg-gray-800/20 hover:border-gray-700 hover:bg-gray-800/40'}`}
              >
                <span className={`text-lg font-bold bg-gradient-to-r ${info.color} bg-clip-text text-transparent`}>
                  {info.icon}
                </span>
                <div className={`text-xs font-medium mt-1 ${language === key ? 'text-gray-200' : 'text-gray-400'}`}>{info.name}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">{info.framework}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-gray-700/60">
          TestForge v1.0 · {codeLimit / 1000}K char limit · Made with React + Express
        </div>
      </main>
    </div>
  )
}
