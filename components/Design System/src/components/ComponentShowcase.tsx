import {
  Bell,
  Search,
  Settings,
  User,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useState } from 'react';

export function ComponentShowcase() {
  const [isChecked, setIsChecked] = useState(false);
  const [selectedOption, setSelectedOption] = useState('option1');
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="space-y-8">
      {/* Buttons */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Buttons</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-lg p-6 depth-1">
            <h4 className="mb-4 text-sm text-muted-foreground">Primary Variants</h4>
            <div className="flex flex-wrap gap-3">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-all depth-2 hover:depth-3 shine-effect">
                Primary
              </button>
              <button className="px-6 py-2 bg-secondary text-secondary-foreground rounded-full hover:opacity-90 transition-all depth-2 hover:depth-3 shine-effect">
                Secondary
              </button>
              <button className="px-6 py-2 bg-accent text-accent-foreground rounded-full hover:opacity-90 transition-all depth-2 hover:depth-3 shine-effect">
                Accent
              </button>
              <button className="px-6 py-2 bg-destructive text-destructive-foreground rounded-full hover:opacity-90 transition-all depth-2 hover:depth-3 shine-effect">
                Destructive
              </button>
            </div>
          </div>

          <div className="glass-card rounded-lg p-6 depth-1">
            <h4 className="mb-4 text-sm text-muted-foreground">Outline Variants</h4>
            <div className="flex flex-wrap gap-3">
              <button className="px-6 py-2 border-2 border-primary text-primary rounded-full hover:bg-primary/10 transition-all depth-1 hover:depth-2">
                Outline
              </button>
              <button className="px-6 py-2 border-2 border-border text-foreground rounded-full hover:bg-muted transition-all depth-1 hover:depth-2">
                Ghost
              </button>
              <button className="px-6 py-2 text-primary hover:underline rounded-full hover:bg-primary/5 transition-all">
                Link
              </button>
            </div>
          </div>

          <div className="glass-card rounded-lg p-6 depth-1">
            <h4 className="mb-4 text-sm text-muted-foreground">Icon Buttons</h4>
            <div className="flex flex-wrap gap-3">
              <button className="p-3 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-all depth-2 hover:depth-3 shine-effect">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-3 bg-secondary text-secondary-foreground rounded-full hover:opacity-90 transition-all depth-2 hover:depth-3 shine-effect">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-3 bg-accent text-accent-foreground rounded-full hover:opacity-90 transition-all depth-2 hover:depth-3 shine-effect">
                <User className="w-5 h-5" />
              </button>
              <button className="p-3 border-2 border-border text-foreground rounded-full hover:bg-muted transition-all depth-1 hover:depth-2">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="glass-card rounded-lg p-6 depth-1">
            <h4 className="mb-4 text-sm text-muted-foreground">Button Sizes</h4>
            <div className="flex flex-wrap items-center gap-3">
              <button className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-all depth-2 hover:depth-3 shine-effect">
                Small
              </button>
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-all depth-2 hover:depth-3 shine-effect">
                Medium
              </button>
              <button className="px-8 py-3 text-lg bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-all depth-2 hover:depth-3 shine-effect">
                Large
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Controls */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Form Controls</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-lg p-6 depth-1">
            <h4 className="mb-4 text-sm text-muted-foreground">Text Inputs</h4>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm">Default Input</label>
                <input
                  type="text"
                  placeholder="Enter text..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-full focus:outline-none focus:ring-2 focus:ring-ring transition-all depth-1"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm">Search Input</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-11 pr-4 py-2.5 bg-input-background border border-input rounded-full focus:outline-none focus:ring-2 focus:ring-ring transition-all depth-1"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm">Disabled Input</label>
                <input
                  type="text"
                  placeholder="Disabled"
                  disabled
                  className="w-full px-4 py-2.5 bg-muted border border-input rounded-full opacity-50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-lg p-6 depth-1">
            <h4 className="mb-4 text-sm text-muted-foreground">Select & Checkbox</h4>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm">Select Menu</label>
                <div className="relative">
                  <select
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="w-full px-4 py-2.5 bg-input-background border border-input rounded-full appearance-none focus:outline-none focus:ring-2 focus:ring-ring transition-all depth-1"
                  >
                    <option value="option1">Option 1</option>
                    <option value="option2">Option 2</option>
                    <option value="option3">Option 3</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => setIsChecked(e.target.checked)}
                      className="w-5 h-5 appearance-none border-2 border-input rounded bg-input-background checked:bg-primary checked:border-primary focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer transition-all depth-1"
                    />
                    {isChecked && (
                      <Check className="absolute inset-0 w-5 h-5 text-primary-foreground pointer-events-none" />
                    )}
                  </div>
                  <span className="text-sm">Accept terms and conditions</span>
                </label>
              </div>
              <div>
                <label className="block mb-2 text-sm">Textarea</label>
                <textarea
                  placeholder="Enter description..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all depth-1"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="glass-card rounded-lg p-6 elevated-card depth-1">
            <h4 className="mb-2">Basic Card</h4>
            <p className="text-sm text-muted-foreground">
              Simple card component with glassmorphism effect.
            </p>
          </div>

          <div className="glass-card rounded-lg overflow-hidden elevated-card depth-1">
            <div className="h-32 bg-gradient-to-br from-primary to-accent flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 texture-dots opacity-20"></div>
              <Settings className="w-8 h-8 text-white relative z-10" />
            </div>
            <div className="p-6">
              <h4 className="mb-2">Gradient Header</h4>
              <p className="text-sm text-muted-foreground">
                Card with gradient and textured header.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-lg p-6 relative overflow-hidden blueprint-corners elevated-card depth-1">
            <div className="absolute inset-0 blueprint-grid opacity-20 pointer-events-none"></div>
            <div className="relative z-10">
              <h4 className="mb-2">Blueprint Card</h4>
              <p className="text-sm text-muted-foreground">
                Card with blueprint grid and corner decorations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Alerts & Notifications</h3>
        <div className="space-y-4">
          <div className="glass-card rounded-lg p-4 flex items-start gap-3 border-l-4 border-l-primary depth-2">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="mb-1 text-primary">Information</h4>
              <p className="text-sm text-muted-foreground">
                This is an informational message using the primary color scheme.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-lg p-4 flex items-start gap-3 border-l-4 border-l-accent depth-2">
            <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="mb-1 text-accent">Success</h4>
              <p className="text-sm text-muted-foreground">
                Operation completed successfully using the accent color.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-lg p-4 flex items-start gap-3 border-l-4 border-l-destructive depth-2">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="mb-1 text-destructive">Error</h4>
              <p className="text-sm text-muted-foreground">
                An error occurred. Please try again later.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-lg p-4 flex items-start gap-3 border-l-4 border-l-muted-foreground depth-2">
            <XCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h4 className="mb-1">Warning</h4>
              <p className="text-sm text-muted-foreground">
                Please review this information before proceeding.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Badges & Tags</h3>
        <div className="glass-card rounded-lg p-6 depth-1">
          <div className="flex flex-wrap gap-2">
            <span className="px-4 py-1.5 bg-primary text-primary-foreground text-sm rounded-full depth-1 shine-effect">
              Primary
            </span>
            <span className="px-4 py-1.5 bg-secondary text-secondary-foreground text-sm rounded-full depth-1 shine-effect">
              Secondary
            </span>
            <span className="px-4 py-1.5 bg-accent text-accent-foreground text-sm rounded-full depth-1 shine-effect">
              Accent
            </span>
            <span className="px-4 py-1.5 bg-muted text-muted-foreground text-sm rounded-full depth-1">
              Muted
            </span>
            <span className="px-4 py-1.5 border-2 border-primary text-primary text-sm rounded-full depth-1">
              Outline
            </span>
            <span className="px-4 py-1.5 bg-destructive text-destructive-foreground text-sm rounded-full flex items-center gap-1 depth-1 shine-effect">
              Error
              <X className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}