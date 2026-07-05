import { useState } from 'react';
import { Sun, Moon, Grid3x3, Layout, Palette, Type, Square } from 'lucide-react';
import { ColorPalette } from './components/ColorPalette';
import { ComponentShowcase } from './components/ComponentShowcase';
import { TypographyShowcase } from './components/TypographyShowcase';
import { LayoutExamples } from './components/LayoutExamples';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState<'palette' | 'typography' | 'components' | 'layouts'>('palette');

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Header */}
        <header className="border-b border-border backdrop-blur-sm bg-card/50 sticky top-0 z-50 depth-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative glow-primary">
                  <Grid3x3 className="w-8 h-8 text-primary" />
                  <div className="absolute inset-0 bg-primary/10 blur-xl"></div>
                </div>
                <div>
                  <h1 className="text-xl tracking-tight">Blueprint Design System</h1>
                  <p className="text-xs text-muted-foreground font-mono">v1.0.0 | Technical Specification</p>
                </div>
              </div>

              <button
                onClick={toggleTheme}
                className="relative p-2.5 rounded-full bg-muted hover:bg-accent transition-all group depth-1 hover:depth-2 shine-effect"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-accent-foreground" />
                ) : (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="absolute -bottom-8 right-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {isDark ? 'Light' : 'Dark'} Mode
                </span>
              </button>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-2 mt-6 overflow-x-auto">
              {[
                { id: 'palette' as const, label: 'Color Palette', icon: Palette },
                { id: 'typography' as const, label: 'Typography', icon: Type },
                { id: 'components' as const, label: 'Components', icon: Square },
                { id: 'layouts' as const, label: 'Layouts', icon: Layout },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shine-effect ${activeTab === tab.id
                      ? 'bg-primary text-primary-foreground depth-2 glow-primary'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground depth-1'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="whitespace-nowrap text-sm">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Introduction */}
          <div className="mb-8 p-6 glass-card rounded-lg relative overflow-hidden blueprint-corners gradient-overlay">
            <div className="absolute inset-0 blueprint-grid opacity-30 pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="mb-2">Technical Blueprint Theme</h2>
              <p className="text-muted-foreground max-w-3xl">
                A modern design system inspired by technical blueprints, featuring a carefully crafted color palette
                of navy, steel, sky, and frost tones. Designed for both web and mobile applications with full
                light and dark mode support.
              </p>
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#0B3559] depth-1"></div>
                  <span className="text-muted-foreground font-mono">#0B3559</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#42708C] depth-1"></div>
                  <span className="text-muted-foreground font-mono">#42708C</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#5890A6] depth-1"></div>
                  <span className="text-muted-foreground font-mono">#5890A6</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#8EB1BF] depth-1"></div>
                  <span className="text-muted-foreground font-mono">#8EB1BF</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {activeTab === 'palette' && <ColorPalette />}
            {activeTab === 'typography' && <TypographyShowcase />}
            {activeTab === 'components' && <ComponentShowcase />}
            {activeTab === 'layouts' && <LayoutExamples />}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-16 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Blueprint Design System • Modern Technical Aesthetics
              </p>
              <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                <span>Light Mode</span>
                <span>•</span>
                <span>Dark Mode</span>
                <span>•</span>
                <span>Responsive</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}