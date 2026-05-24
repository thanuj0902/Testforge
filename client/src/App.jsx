import { useState, useEffect, useCallback } from 'react'

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
  javascript: { name: 'JavaScript', framework: 'Jest', icon: '⚡', color: 'from-yellow-500 to-orange-500' },

  python: { name: 'Python', framework: 'pytest', icon: '🐍', color: 'from-green-500 to-emerald-600' },
  java: { name: 'Java', framework: 'JUnit 5', icon: '☕', color: 'from-red-500 to-orange-600' },
  go: { name: 'Go', framework: 'testing', icon: '🔷', color: 'from-cyan-500 to-teal-500' },
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

  useEffect(() => {
    fetch('/api/languages')
      .then(res => res.json())
      .then(data => setLanguages(data.languages))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/ai/status')
      .then(res => res.json())
      .then(data => setAiStatus(data.available ? 'available' : 'unavailable'))
      .catch(() => setAiStatus('unavailable'))
  }, [])

  const generateTests = useCallback(async (useAIFlag) => {
    setLoading(true)
    setError('')
    setTestCode('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, useAI: useAIFlag })
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setTestCode(data.testCode)
        setMode(data.mode)
      }
    } catch (err) {
      setError('Server not running. Start the server first.')
    } finally {
      setLoading(false)
    }
  }, [code, language])

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
    const ext = { javascript: 'js', python: 'py', java: 'java', go: 'go' }[language] || 'txt'
    const blob = new Blob([testCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${language}_tests.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const langInfo = LANGS[language] || LANGS.javascript
  const codeSize = new TextEncoder().encode(code).length
  const codeLimit = 50000

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <header className="border-b border-gray-800 bg-[#0d0d14] sticky top-0 z-10">
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

            <div className="relative group">
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-[460px] bg-[#0d0d14] border border-gray-800 rounded-xl p-4 font-mono text-sm text-gray-300 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none placeholder-gray-700 leading-relaxed"
                spellCheck={false}
                placeholder="// Paste your source code here..."
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] text-gray-600">
                <span>{code.split('\n').length} lines</span>
                <span className={`${codeSize > codeLimit * 0.9 ? 'text-red-400' : ''}`}>
                  {Math.round(codeSize / 1000)}K / {codeLimit / 1000}K
                </span>
              </div>
              {code !== DEFAULT_CODE && (
                <button
                  onClick={() => setCode(DEFAULT_CODE)}
                  className="absolute top-3 right-3 bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700/50 rounded-lg px-2.5 py-1 text-[10px] text-gray-500 hover:text-gray-300 transition-all opacity-0 group-hover:opacity-100"
                >
                  Reset
                </button>
              )}
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
                  ) : 'Generate Tests'}
                </button>
              </div>
              <div className="flex items-center gap-2 bg-gray-800/40 border border-gray-700/50 rounded-xl px-3 py-1.5">
                <span className="text-[10px] text-gray-500 font-medium">AI</span>
                <button
                  onClick={() => setUseAI(!useAI)}
                  disabled={aiStatus !== 'available'}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${useAI ? 'bg-violet-600' : 'bg-gray-700'} ${aiStatus !== 'available' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useAI ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </button>
                <span className={`w-1.5 h-1.5 rounded-full ${aiStatus === 'available' ? 'bg-emerald-500' : aiStatus === 'unavailable' ? 'bg-red-500' : 'bg-gray-600'}`} />
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
                  <pre className="w-full h-[460px] bg-[#0d0d14] border border-gray-800 rounded-xl p-4 font-mono text-sm text-gray-300 overflow-auto whitespace-pre-wrap leading-relaxed">
                    <code>{testCode}</code>
                  </pre>
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={handleDownload}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                    <button
                      onClick={handleCopy}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {copied ? 'Copied!' : 'Copy'}
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
              <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800/60 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(LANGS).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setLanguage(key)}
                className={`p-3 rounded-xl border text-center transition-all duration-200 ${language === key ? 'border-violet-500/40 bg-violet-500/8' : 'border-gray-800/60 bg-gray-800/20 hover:border-gray-700 hover:bg-gray-800/40'}`}
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
          Server v1.0 · {codeLimit / 1000}K char limit · Made with React + Vite
        </div>
      </main>
    </div>
  )
}
