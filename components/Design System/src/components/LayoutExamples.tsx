import {
  Menu,
  X,
  Home,
  FileText,
  Settings,
  BarChart3,
  Bell,
  Search,
  User
} from 'lucide-react';
import { useState } from 'react';

export function LayoutExamples() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Dashboard Layout */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Dashboard Layout</h3>
        <div className="bg-card border border-border rounded overflow-hidden">
          {/* Desktop View */}
          <div className="hidden lg:block">
            <div className="h-[500px] flex">
              {/* Sidebar */}
              <div className="w-64 bg-sidebar border-r border-sidebar-border p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-8 pb-4 border-b border-sidebar-border">
                  <div className="w-8 h-8 bg-sidebar-primary rounded flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-sidebar-primary-foreground" />
                  </div>
                  <span className="font-medium">Dashboard</span>
                </div>

                <nav className="flex-1 space-y-1">
                  <a href="#" className="flex items-center gap-3 px-3 py-2 bg-sidebar-accent text-sidebar-accent-foreground rounded">
                    <Home className="w-4 h-4" />
                    <span className="text-sm">Home</span>
                  </a>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded transition-colors">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Documents</span>
                  </a>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded transition-colors">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-sm">Analytics</span>
                  </a>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded transition-colors">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Settings</span>
                  </a>
                </nav>

                <div className="pt-4 border-t border-sidebar-border">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">User Name</p>
                      <p className="text-xs text-muted-foreground truncate">user@email.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-background/95 backdrop-blur-sm">
                  <h2>Overview</h2>
                  <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-muted rounded transition-colors">
                      <Search className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-muted rounded transition-colors relative">
                      <Bell className="w-5 h-5" />
                      <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
                    </button>
                  </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-auto blueprint-grid">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-card border border-border rounded p-4">
                      <p className="text-sm text-muted-foreground mb-1">Total Users</p>
                      <p className="text-2xl">1,234</p>
                    </div>
                    <div className="bg-card border border-border rounded p-4">
                      <p className="text-sm text-muted-foreground mb-1">Active</p>
                      <p className="text-2xl">892</p>
                    </div>
                    <div className="bg-card border border-border rounded p-4">
                      <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                      <p className="text-2xl">$45.2K</p>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded p-6">
                    <h3 className="mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 pb-3 border-b border-border last:border-0">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm">Activity item {i}</p>
                            <p className="text-xs text-muted-foreground">2 hours ago</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile View */}
          <div className="lg:hidden p-4">
            <p className="text-sm text-muted-foreground text-center">
              View on desktop to see the full dashboard layout. Mobile version shown below.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Mobile Layout</h3>
        <div className="max-w-md mx-auto">
          <div className="bg-card border border-border rounded overflow-hidden">
            <div className="h-[600px] flex flex-col">
              {/* Mobile Header */}
              <header className="h-14 border-b border-border px-4 flex items-center justify-between bg-background shrink-0">
                <button
                  onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <h3 className="text-sm">Mobile App</h3>
                <button className="p-2 hover:bg-muted rounded-full transition-colors">
                  <User className="w-5 h-5" />
                </button>
              </header>

              {/* Mobile Sidebar Overlay */}
              {isMobileSidebarOpen && (
                <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 p-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3>Menu</h3>
                    <button
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className="p-2 hover:bg-muted rounded transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <nav className="space-y-2">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded">
                      <Home className="w-5 h-5" />
                      <span>Home</span>
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded transition-colors">
                      <FileText className="w-5 h-5" />
                      <span>Documents</span>
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-muted rounded transition-colors">
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </a>
                  </nav>
                </div>
              )}

              {/* Mobile Content */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="bg-primary text-primary-foreground rounded-lg p-6">
                  <p className="text-sm opacity-90 mb-2">Welcome back</p>
                  <h2 className="text-xl mb-4">Dashboard Overview</h2>
                  <button className="px-4 py-2 bg-primary-foreground text-primary rounded text-sm">
                    View Details
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded p-4">
                    <p className="text-xs text-muted-foreground mb-1">Tasks</p>
                    <p className="text-lg">12</p>
                  </div>
                  <div className="bg-card border border-border rounded p-4">
                    <p className="text-xs text-muted-foreground mb-1">Messages</p>
                    <p className="text-lg">5</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded p-4">
                  <h4 className="mb-3 text-sm">Recent Items</h4>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 pb-2 border-b border-border last:border-0">
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">Item {i}</p>
                          <p className="text-xs text-muted-foreground">Just now</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mobile Bottom Navigation */}
              <nav className="h-16 border-t border-border shrink-0 grid grid-cols-4 bg-background">
                <a href="#" className="flex flex-col items-center justify-center gap-1 text-primary">
                  <Home className="w-5 h-5" />
                  <span className="text-xs">Home</span>
                </a>
                <a href="#" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Search className="w-5 h-5" />
                  <span className="text-xs">Search</span>
                </a>
                <a href="#" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="text-xs">Alerts</span>
                </a>
                <a href="#" className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Settings className="w-5 h-5" />
                  <span className="text-xs">Settings</span>
                </a>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Grid System */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Responsive Grid System</h3>
        <div className="bg-card border border-border rounded p-6">
          <p className="text-sm text-muted-foreground mb-4">
            12-column responsive grid adapting from mobile to desktop
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-muted border border-border rounded p-4 text-center">
                <p className="text-sm">Grid {i}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Blueprint Themed Layout */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Blueprint Themed Panel</h3>
        <div className="bg-card border-2 border-primary/30 rounded relative overflow-hidden blueprint-corners">
          <div className="absolute inset-0 blueprint-grid-large opacity-40 pointer-events-none"></div>
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3>Technical Specification</h3>
                <p className="text-sm text-muted-foreground font-mono">SPEC-2024-001</p>
              </div>
              <div className="px-3 py-1 bg-primary/10 border border-primary rounded text-primary text-sm">
                ACTIVE
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-background/80 backdrop-blur-sm border border-border rounded p-4">
                <p className="text-xs text-muted-foreground mb-1 font-mono">PARAMETER A</p>
                <p className="text-lg">95.2%</p>
              </div>
              <div className="bg-background/80 backdrop-blur-sm border border-border rounded p-4">
                <p className="text-xs text-muted-foreground mb-1 font-mono">PARAMETER B</p>
                <p className="text-lg">1024 MB</p>
              </div>
              <div className="bg-background/80 backdrop-blur-sm border border-border rounded p-4">
                <p className="text-xs text-muted-foreground mb-1 font-mono">PARAMETER C</p>
                <p className="text-lg">NOMINAL</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity">
                Execute
              </button>
              <button className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors">
                Configure
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}