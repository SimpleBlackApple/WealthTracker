import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { LoginButton } from '@/features/auth/components/LoginButton'
import { Button } from '@/components/ui/button'
import logo from '@/assets/logo.png'
import {
  Wallet,
  PieChart,
  ArrowUpRight,
  Activity,
  ArrowRight,
} from 'lucide-react'

// Helper for the 3D tilt effect
const useTilt = (active: boolean) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !active) return

    const element = ref.current

    // Config
    const maxRotate = 15 // degrees
    const perspective = 1000

    const handleMouseMove = (e: MouseEvent) => {
      const { left, top, width, height } = element.getBoundingClientRect()
      const centerX = left + width / 2
      const centerY = top + height / 2

      const mouseX = e.clientX
      const mouseY = e.clientY

      // Calculate rotation based on cursor position relative to card center
      // RotateY depends on X position (left/right)
      // RotateX depends on Y position (up/down) - inverted
      const rotateX = ((mouseY - centerY) / (height / 2)) * -maxRotate
      const rotateY = ((mouseX - centerX) / (width / 2)) * maxRotate

      element.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`
    }

    const handleMouseLeave = () => {
      element.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`
    }

    // Attach to window for a more global feel, or element for local
    // Whalet seems to be global or section-based. Let's try element-based for now but with a larger area hit if needed.
    // Actually Whalet's is physically responsive to the specific card hover.
    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [active])

  return ref
}

function TiltCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useTilt(true)

  return (
    <div
      ref={ref}
      className={`
        relative overflow-hidden rounded-2xl 
        bg-white/[0.03] backdrop-blur-xl 
        border border-white/10 shadow-2xl
        transition-all duration-200 ease-out
        hover:z-10 hover:shadow-primary/20
        ${className}
      `}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Glare effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      {children}
    </div>
  )
}

export function LoginPage() {
  const { loginAsDemo } = useAuthStore()
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const navigate = useNavigate()

  const handleDemoLogin = async () => {
    setIsDemoLoading(true)
    try {
      await loginAsDemo()
      navigate('/')
    } catch (error) {
      console.error('Demo login failed:', error)
    } finally {
      setIsDemoLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0f111a] text-white selection:bg-purple-500/30">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] right-[-10%] h-[800px] w-[800px] rounded-full bg-purple-600/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] h-[800px] w-[800px] rounded-full bg-blue-600/10 blur-[120px]" />

      <nav className="relative z-50 flex items-center justify-between px-6 py-6 lg:px-12">
        <div className="flex items-center gap-3">
          <img src={logo} alt="WealthTracker Logo" className="h-8 w-auto" />
          <span className="text-xl font-bold tracking-tight">
            WealthTracker
          </span>
        </div>
        <div className="flex gap-4">
          <LoginButton className="w-auto bg-transparent border border-[#6161FF] text-[#6161FF] hover:bg-[#6161FF]/10 rounded-full px-6 py-2 transition-all duration-300 font-medium text-sm shadow-none">
            Log in
          </LoginButton>
        </div>
      </nav>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl flex-col items-center justify-center px-4 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-8">
        {/* Left Column: Text */}
        <div className="col-span-12 flex flex-col items-center text-center lg:col-span-5 lg:items-start lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-purple-300 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            v1.0 Now Live
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Smart{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Wealth Tracking
            </span>{' '}
            for Day Traders.
          </h1>

          <p className="mb-10 max-w-lg text-lg text-white/60 leading-relaxed">
            A powerful, clean terminal for scanning market momentum and
            simulating trades. Experience real-time data with zero latency.
          </p>

          <div className="flex items-center gap-4">
            <LoginButton className="h-11 px-8 bg-[#6161FF] hover:bg-[#5050FF] text-white rounded-full transition-all duration-300 font-medium flex items-center gap-2 group shadow-[0_4px_14px_0_rgba(97,97,255,0.39)] hover:shadow-[0_6px_20px_rgba(97,97,255,0.23)] hover:-translate-y-[1px]">
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </LoginButton>
            <Button
              onClick={handleDemoLogin}
              disabled={isDemoLoading}
              variant="outline"
              className="h-11 px-8 bg-transparent border-[#6161FF] text-[#6161FF] hover:bg-[#6161FF]/10 rounded-full transition-all duration-300 font-medium flex items-center gap-2"
            >
              {isDemoLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#6161FF]/20 border-t-[#6161FF]" />
                  Loading...
                </>
              ) : (
                'Demo Account'
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Floating Cards */}
        <div className="col-span-12 mt-16 h-[500px] w-full lg:col-span-7 lg:mt-0 lg:h-[600px] relative">
          {/* Card 1: Portfolio Management (Top Left) */}
          <div className="absolute top-[5%] left-[5%] md:left-[10%] z-20">
            <TiltCard className="w-64 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-white/50">
                  Portfolio Management
                </span>
                <Wallet className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold mb-1">$124,350.80</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  +2.4%
                </span>
                <span className="text-white/30">vs last month</span>
              </div>
            </TiltCard>
          </div>

          {/* Card 2: Instant Paper Trading (Top Right) */}
          <div className="absolute top-[15%] right-[5%] md:right-[5%] z-10">
            <TiltCard className="w-56 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <PieChart className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-bold">Instant Paper Trading</div>
                  <div className="text-[10px] text-white/50">
                    Simulate Real Markets
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">US Stocks</span>
                  <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-blue-500 rounded-full" />
                  </div>
                  <span>85%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Options</span>
                  <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[15%] bg-purple-500 rounded-full" />
                  </div>
                  <span>15%</span>
                </div>
              </div>
            </TiltCard>
          </div>

          {/* Card 3: Lifetime Growth (Bottom Left) */}
          <div className="absolute bottom-[10%] left-[0%] md:left-[5%] z-30">
            <TiltCard className="w-60 p-5 bg-gradient-to-br from-purple-900/40 to-blue-900/40">
              <div className="absolute top-0 right-0 p-4">
                <Activity className="h-5 w-5 text-white/20" />
              </div>
              <div className="mb-8">
                <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                  Lifetime Growth
                </span>
                <div className="text-3xl font-bold mt-1">+142.5%</div>
              </div>
              {/* Decorative chart line */}
              <div className="h-12 w-full flex items-end gap-1">
                {[40, 50, 45, 60, 55, 75, 70, 85, 95, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-purple-500/50 to-purple-400 rounded-t-sm"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </TiltCard>
          </div>

          {/* Card 4: Real-time Stock Scanners (Bottom Right) */}
          <div className="absolute bottom-[20%] right-[0%] md:right-[15%] z-20">
            <TiltCard className="w-56 p-0">
              <div className="p-4 border-b border-white/5 bg-white/5">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">
                  Real-time Scanners
                </div>
              </div>
              <div className="p-2 space-y-1">
                {[
                  { s: 'NVDA', p: '124.50', c: '+3.2%', up: true },
                  { s: 'TSLA', p: '245.80', c: '+1.8%', up: true },
                  { s: 'AAPL', p: '192.30', c: '-0.5%', up: false },
                ].map(stock => (
                  <div
                    key={stock.s}
                    className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${stock.up ? 'bg-emerald-500' : 'bg-red-500'}`}
                      />
                      <span className="font-semibold text-sm">{stock.s}</span>
                    </div>
                    <div className="text-xs text-right">
                      <div className="text-white/90">${stock.p}</div>
                      <div
                        className={`${stock.up ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {stock.c}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TiltCard>
          </div>
        </div>
      </main>
    </div>
  )
}
