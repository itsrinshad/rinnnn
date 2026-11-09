import { Component, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import './index.css'
class Boundary extends Component<{ children: ReactNode }, { e: string | null }> {
  state = { e: null as string | null }
  static getDerivedStateFromError(e: unknown) { return { e: String((e as Error)?.message ?? e) } }
  render() { return this.state.e ? <pre style={{ color: '#fbbf24', padding: 16, whiteSpace: 'pre-wrap' }}>SYMBIOTES error:{'\n'}{this.state.e}</pre> : this.props.children }
}
ReactDOM.createRoot(document.getElementById('root')!).render(<Boundary><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></Boundary>)
