import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check } from 'lucide-react'
import mermaid from 'mermaid'

// Initialize Mermaid with a clean premium dark layout
try {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    themeVariables: {
      background: '#0a0a0a',
      primaryColor: '#1e1b4b', // indigo-950
      primaryTextColor: '#e4e4e7',
      primaryBorderColor: '#3b82f6', // blue-500
      lineColor: '#60a5fa',
      secondaryColor: '#1c1917',
      tertiaryColor: '#0c0a09',
    }
  })
} catch (e) {
  console.error('Failed to initialize mermaid', e)
}

interface MermaidRendererProps {
  chart: string
}

function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    if (!containerRef.current) return
    
    let isMounted = true
    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
    
    const renderChart = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        if (isMounted) {
          setSvg(renderedSvg)
          setError(false)
        }
      } catch (e) {
        console.error('Mermaid render error', e)
        if (isMounted) {
          setError(true)
        }
      }
    }
    
    renderChart()
    return () => {
      isMounted = false
    }
  }, [chart])

  if (error) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-[10px] px-3 py-2 rounded-lg font-mono my-2 max-w-full overflow-x-auto">
        [Flowchart Syntax Error: Failed to render visual diagram]
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className="mermaid-svg flex justify-center py-5 px-4 bg-[#0a0a0a]/50 border border-white/[0.04] rounded-2xl overflow-x-auto my-4 shadow-inner max-w-full"
      dangerouslySetInnerHTML={{ __html: svg || '<div className="text-zinc-500 text-xs font-mono animate-pulse">Generating telemetry diagram flow...</div>' }}
    />
  )
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button 
      onClick={handleCopy}
      className="text-[10px] flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 font-medium px-2 py-0.5 rounded bg-zinc-900 border border-white/[0.04] hover:bg-zinc-800 transition-all cursor-pointer"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

// Strongly typed elements for ReactMarkdown
const TableComponent = ({ children }: any) => (
  <div className="my-5 border border-white/[0.05] rounded-xl overflow-hidden shadow-lg bg-zinc-950/20 max-w-full overflow-x-auto">
    <table className="w-full text-left border-collapse text-xs">
      {children}
    </table>
  </div>
)

const ThComponent = ({ children }: any) => (
  <th className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.05] text-zinc-300 font-bold uppercase tracking-wider text-[10px] font-mono">
    {children}
  </th>
)

const TdComponent = ({ children }: any) => (
  <td className="px-4 py-3 border-b border-white/[0.03] text-zinc-400 leading-normal">
    {children}
  </td>
)

const TrComponent = ({ children }: any) => (
  <tr className="hover:bg-white/[0.01] transition-colors border-b border-white/[0.01] last:border-0">
    {children}
  </tr>
)

const CodeComponent = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const codeContent = String(children).replace(/\n$/, '')

  if (!inline && language === 'mermaid') {
    return <MermaidRenderer chart={codeContent} />
  }

  if (!inline) {
    return (
      <div className="relative group/code my-4 rounded-xl border border-white/[0.04] bg-black/40 overflow-hidden max-w-full">
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.03] bg-white/[0.01]">
          <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-wider">
            {language || 'code'}
          </span>
          <CopyCodeButton code={codeContent} />
        </div>
        <pre className="p-4 overflow-x-auto font-mono text-xs leading-relaxed text-zinc-300 max-w-full">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    )
  }

  return (
    <code className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/50 text-orange-400 font-mono text-xs" {...props}>
      {children}
    </code>
  )
}

const Heading1Component = ({ children }: any) => (
  <h1 className="text-lg font-bold text-white tracking-tight mt-6 mb-3 first:mt-0 font-mono border-b border-white/5 pb-1">
    {children}
  </h1>
)

const Heading2Component = ({ children }: any) => (
  <h2 className="text-base font-bold text-zinc-200 mt-5 mb-2.5 font-mono">
    {children}
  </h2>
)

const Heading3Component = ({ children }: any) => (
  <h3 className="text-sm font-semibold text-zinc-300 mt-4 mb-2 font-mono">
    {children}
  </h3>
)

const ListComponent = ({ children }: any) => (
  <ul className="list-disc pl-5 my-3.5 space-y-1.5 text-zinc-400">
    {children}
  </ul>
)

const OrderedListComponent = ({ children }: any) => (
  <ol className="list-decimal pl-5 my-3.5 space-y-1.5 text-zinc-400">
    {children}
  </ol>
)

const ListItemComponent = ({ children }: any) => (
  <li className="leading-relaxed">
    {children}
  </li>
)

const ParagraphComponent = ({ children }: any) => (
  <p className="my-3.5 leading-relaxed text-zinc-300 last:mb-0">
    {children}
  </p>
)

const BlockquoteComponent = ({ children }: any) => (
  <blockquote className="border-l-2 border-blue-500/40 pl-4 py-1 my-4 text-zinc-500 italic bg-blue-500/[0.01] rounded-r-lg">
    {children}
  </blockquote>
)

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: TableComponent,
        thead: ({ children }) => <thead>{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: TrComponent,
        th: ThComponent,
        td: TdComponent,
        code: CodeComponent,
        h1: Heading1Component,
        h2: Heading2Component,
        h3: Heading3Component,
        ul: ListComponent,
        ol: OrderedListComponent,
        li: ListItemComponent,
        p: ParagraphComponent,
        blockquote: BlockquoteComponent,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
