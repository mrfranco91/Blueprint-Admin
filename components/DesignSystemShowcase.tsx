import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';

// Design System Showcase - Foundation for Blueprint Pro
export default function DesignSystemShowcase() {
  const [activeTab, setActiveTab] = useState<'palette' | 'typography' | 'components' | 'layouts'>('palette');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary bp-container-compact flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">BP</span>
              </div>
              <div>
                <h1 className="bp-section-title leading-none">Blueprint Design System</h1>
                <p className="bp-caption text-muted-foreground">v1.0.0 | Technical Specification</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 mt-6 overflow-x-auto">
            {[
              { id: 'palette' as const, label: 'Color Palette' },
              { id: 'typography' as const, label: 'Typography' },
              { id: 'components' as const, label: 'Components' },
              { id: 'layouts' as const, label: 'Layouts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 bp-container-compact transition-all text-sm font-medium ${activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="mb-8 p-6 bp-container-tall bg-card border border-border relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(rgba(11,53,89,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(11,53,89,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          <div className="relative z-10">
            <h2 className="bp-section-title mb-2">Technical Blueprint Theme</h2>
            <p className="bp-body-sm text-muted-foreground max-w-3xl">
              A modern design system inspired by technical blueprints, featuring a carefully crafted color palette
              of navy, steel, sky, and frost tones. Designed for both web and mobile applications.
            </p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bp-container-compact bg-[#0B3559]"></div>
                <span className="bp-caption text-muted-foreground">#0B3559</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bp-container-compact bg-[#42708C]"></div>
                <span className="bp-caption text-muted-foreground">#42708C</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bp-container-compact bg-[#5890A6]"></div>
                <span className="bp-caption text-muted-foreground">#5890A6</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bp-container-compact bg-[#8EB1BF]"></div>
                <span className="bp-caption text-muted-foreground">#8EB1BF</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {activeTab === 'palette' && <ColorPaletteSection />}
          {activeTab === 'typography' && <TypographySection />}
          {activeTab === 'components' && <ComponentsSection />}
          {activeTab === 'layouts' && <LayoutsSection />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="bp-caption text-muted-foreground">
              Blueprint Design System • Modern Technical Aesthetics
            </p>
            <div className="flex gap-4 bp-caption text-muted-foreground">
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
  );
}

// Color Palette Section
function ColorPaletteSection() {
  return (
    <div className="space-y-6">
      <h2 className="bp-section-title">Color Palette</h2>

      {/* Primary Colors */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Primary Colors</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-24 bp-container-tall bg-primary flex items-center justify-center">
              <span className="text-primary-foreground bp-caption">primary</span>
            </div>
            <div className="space-y-1">
              <p className="bp-caption font-medium text-foreground">Primary</p>
              <p className="bp-caption text-muted-foreground">#0B3559</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-24 bp-container-tall bg-secondary flex items-center justify-center">
              <span className="text-secondary-foreground bp-caption">secondary</span>
            </div>
            <div className="space-y-1">
              <p className="bp-caption font-medium text-foreground">Secondary</p>
              <p className="bp-caption text-muted-foreground">#8EB1BF</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-24 bp-container-tall bg-accent flex items-center justify-center">
              <span className="text-accent-foreground bp-caption">accent</span>
            </div>
            <div className="space-y-1">
              <p className="bp-caption font-medium text-foreground">Accent</p>
              <p className="bp-caption text-muted-foreground">#5890A6</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-24 bp-container-tall bg-muted border border-border flex items-center justify-center">
              <span className="text-muted-foreground bp-caption">muted</span>
            </div>
            <div className="space-y-1">
              <p className="bp-caption font-medium text-foreground">Muted</p>
              <p className="bp-caption text-muted-foreground">#E8EEF2</p>
            </div>
          </div>
        </div>
      </div>

      {/* Background Colors */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Background Colors</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-24 bp-container-tall bg-background border border-border flex items-center justify-center">
              <span className="text-foreground bp-caption">background</span>
            </div>
            <div className="space-y-1">
              <p className="bp-caption font-medium text-foreground">Background</p>
              <p className="bp-caption text-muted-foreground">#F5F7F9</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-24 bp-container-tall bg-card border border-border flex items-center justify-center">
              <span className="text-card-foreground bp-caption">card</span>
            </div>
            <div className="space-y-1">
              <p className="bp-caption font-medium text-foreground">Card</p>
              <p className="bp-caption text-muted-foreground">#FFFFFF</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-24 bp-container-tall bg-foreground flex items-center justify-center">
              <span className="text-white bp-caption">foreground</span>
            </div>
            <div className="space-y-1">
              <p className="bp-caption font-medium text-foreground">Foreground</p>
              <p className="bp-caption text-muted-foreground">#0B3559</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-24 bp-container-tall border-2 border-border bg-transparent flex items-center justify-center">
              <span className="text-muted-foreground bp-caption">border</span>
            </div>
            <div className="space-y-1">
              <p className="bp-caption font-medium text-foreground">Border</p>
              <p className="bp-caption text-muted-foreground">rgba(11,53,89,0.15)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Typography Section
function TypographySection() {
  return (
    <div className="space-y-8">
      <h2 className="bp-section-title">Typography</h2>

      {/* Font Hierarchy */}
      <div className="space-y-6 p-6 bp-container-tall bg-card border border-border">
        <h3 className="bp-card-title">Font Hierarchy</h3>
        <p className="bp-body-sm text-muted-foreground">
          <strong>Headings:</strong> Comfortaa font (via --font-heading variable)<br />
          <strong>Body/UI text:</strong> Raleway font (via --font-sans variable)<br />
          <strong>Font weights:</strong> Headings max 700, Body 400-600, Buttons 700
        </p>
      </div>

      {/* Typography Classes */}
      <div className="space-y-6">
        <div className="p-6 bp-container-tall bg-card border border-border space-y-4">
          <div>
            <h1 className="bp-page-title">bp-page-title</h1>
            <p className="bp-caption text-muted-foreground mt-1">
              Comfortaa, 2rem, font-weight 700 - Large page titles
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <h2 className="bp-section-title">bp-section-title</h2>
            <p className="bp-caption text-muted-foreground mt-1">
              Comfortaa, 1.25rem, font-weight 600 - Section headers
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <h3 className="bp-card-title">bp-card-title</h3>
            <p className="bp-caption text-muted-foreground mt-1">
              Comfortaa, 1.125rem, font-weight 500 - Card titles
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="text-5xl bp-stat-value text-accent">$74,240</p>
            <p className="bp-caption text-muted-foreground mt-1">
              bp-stat-value - Comfortaa, font-weight 900 - Hero stat numbers
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="bp-overline">bp-overline - Micro label text</p>
            <p className="bp-caption text-muted-foreground mt-1">
              Raleway, 11px, semibold, uppercase, tracking-wider
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="bp-body">bp-body - Body text for paragraphs and content</p>
            <p className="bp-caption text-muted-foreground mt-1">
              Raleway, 1rem, font-weight 400, line-height 1.5
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="bp-body-sm">bp-body-sm - Smaller body text for secondary content</p>
            <p className="bp-caption text-muted-foreground mt-1">
              Raleway, 0.875rem (14px), font-weight 400
            </p>
          </div>
          <hr className="border-border" />
          <div>
            <p className="bp-caption">bp-caption - Tiny captions and metadata</p>
            <p className="bp-caption text-muted-foreground mt-1">
              Raleway, 0.625rem (10px), font-weight 500
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components Section
function ComponentsSection() {
  return (
    <div className="space-y-8">
      <h2 className="bp-section-title">Components</h2>

      {/* Cards */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Cards</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="bp-overline mb-2">Simple Card (9px radius)</p>
            <Card className="max-w-sm">
              <CardContent>
                <p className="bp-overline text-muted-foreground">Total Revenue</p>
                <p className="text-3xl bp-stat-value mt-1 text-accent">$24,500</p>
              </CardContent>
            </Card>
          </div>
          <div>
            <p className="bp-overline mb-2">Full Card with Header & Footer</p>
            <Card>
              <CardHeader>
                <CardTitle>Chart Container</CardTitle>
                <CardDescription>Monthly performance data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-24 bg-muted bp-container-tall flex items-center justify-center">
                  <span className="bp-body-sm text-muted-foreground">Chart placeholder</span>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border pt-4">
                <p className="bp-caption text-muted-foreground">Last updated: Today</p>
              </CardFooter>
            </Card>
          </div>
        </div>
        <p className="bp-caption text-muted-foreground">
          All cards use 9px border-radius. Card components provide consistent structure with Header, Title, Description, Content, and Footer slots.
        </p>
      </div>

      {/* Buttons */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Buttons</h3>
        <div className="flex gap-3 flex-wrap">
          <button className="bg-primary text-primary-foreground px-6 py-3 bp-container-compact font-medium text-sm">
            Primary Button
          </button>
          <button className="bg-secondary text-secondary-foreground px-6 py-3 bp-container-compact font-medium text-sm">
            Secondary Button
          </button>
          <button className="bg-accent text-accent-foreground px-6 py-3 bp-container-compact font-medium text-sm">
            Accent Button
          </button>
          <button className="bg-muted text-foreground border border-border px-6 py-3 bp-container-compact font-medium text-sm">
            Ghost Button
          </button>
          <button disabled className="bg-muted text-muted-foreground px-6 py-3 bp-container-compact font-medium text-sm cursor-not-allowed opacity-50">
            Disabled Button
          </button>
        </div>
        <p className="bp-caption text-muted-foreground">
          All buttons use bp-container-compact (pill shape, 9999px radius)
        </p>
      </div>

      {/* Form Inputs */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Form Inputs</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="bp-overline block mb-2">Text Input (data-ui="field")</label>
            <input
              type="text"
              placeholder="Enter text..."
              className="w-full px-4 py-3 bp-container-compact border border-border bg-card"
            />
          </div>
          <div>
            <label className="bp-overline block mb-2">Select/Dropdown (data-ui="field")</label>
            <select className="w-full px-4 py-3 bp-container-compact border border-border bg-card appearance-none">
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>
          <div>
            <label className="bp-overline block mb-2">Text Area (bp-container-tall)</label>
            <textarea
              placeholder="Multi-line text..."
              className="w-full p-4 border border-border bg-card bp-container-tall"
              rows={3}
            />
          </div>
        </div>
        <p className="bp-caption text-muted-foreground">
          All cards use 9px border-radius (bp-container-tall). No cards use pill shape.
        </p>
      </div>

      {/* Badges */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Badges / Pills</h3>
        <div className="flex gap-3 flex-wrap">
          <span className="px-3 py-1 bp-container-compact bg-green-100 text-green-800 bp-body-sm font-medium">
            Active
          </span>
          <span className="px-3 py-1 bp-container-compact bg-yellow-100 text-yellow-800 bp-body-sm font-medium">
            Draft
          </span>
          <span className="px-3 py-1 bp-container-compact bg-blue-100 text-blue-800 bp-body-sm font-medium">
            Published
          </span>
          <span className="px-3 py-1 bp-container-compact bg-red-100 text-red-800 bp-body-sm font-medium">
            Alert
          </span>
        </div>
        <p className="bp-caption text-muted-foreground">
          Status badges use bp-container-compact (pill shape)
        </p>
      </div>
    </div>
  );
}

// Layouts Section
function LayoutsSection() {
  return (
    <div className="space-y-12">
      <h2 className="bp-section-title">Layouts</h2>

      {/* Shape System Reference */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Shape System</h3>
        <p className="bp-body-sm text-muted-foreground mb-4">
          Shape decisions are centralized in index.css. Use design system classes instead of Tailwind rounded-* classes.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-6 bg-primary text-primary-foreground bp-container-compact text-center">
            <p className="font-bold text-sm">bp-container-compact</p>
            <p className="bp-caption text-primary-foreground/70 mt-1">Pill shape (9999px) — buttons, badges, inputs</p>
          </div>
          <div className="p-6 bg-card border border-border bp-container-tall text-center">
            <p className="font-bold text-sm">bp-container-tall</p>
            <p className="bp-caption text-muted-foreground mt-1">Soft corners (9px) — cards, modals, tall containers</p>
          </div>
          <div className="p-6 bg-muted border border-border bp-container-list text-center">
            <p className="font-bold text-sm">bp-container-list</p>
            <p className="bp-caption text-muted-foreground mt-1">Soft corners (9px) — list items, rows</p>
          </div>
        </div>
      </div>

      {/* Dashboard Layout */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Dashboard Layout</h3>
        <p className="bp-body-sm text-muted-foreground">Stats grid with hero card, secondary stats, and chart area.</p>
        <div className="p-4 bg-background border border-border bp-container-tall">
          <h1 className="bp-page-title mb-6">Dashboard</h1>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2 p-6 px-8 bp-container-list bg-primary text-primary-foreground border-4 border-primary shadow-lg">
              <p className="bp-overline mb-1 text-primary-foreground/70">Roadmap Pipeline</p>
              <p className="text-4xl bp-stat-value text-accent">$74,240</p>
            </div>
            <div className="bg-card p-5 px-8 bp-container-list border border-border shadow-sm">
              <p className="bp-overline mb-1">Active Plans</p>
              <p className="text-3xl bp-stat-value">12</p>
            </div>
            <div className="bg-card p-5 px-8 bp-container-list border border-border shadow-sm">
              <p className="bp-overline mb-1">Total Clients</p>
              <p className="text-3xl bp-stat-value">48</p>
            </div>
          </div>
          <div className="bg-card p-6 bp-container-tall border border-border shadow-sm">
            <h3 className="bp-section-title mb-4">Pipeline Growth</h3>
            <div className="h-32 bg-muted bp-container-tall flex items-center justify-center">
              <span className="bp-body-sm text-muted-foreground">Chart area</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Summary Layout */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Plan Summary Layout</h3>
        <p className="bp-body-sm text-muted-foreground">Client blueprint with stats, chart, and action buttons.</p>
        <div className="p-4 bg-background border border-border bp-container-tall max-w-md mx-auto">
          <div className="flex justify-between items-end border-b-2 pb-4 border mb-6">
            <div>
              <h1 className="bp-page-title leading-none mb-1">Blueprint Summary</h1>
              <p className="bp-overline">Jane Smith</p>
            </div>
            <span className="bp-overline px-4 py-1.5 bp-container-compact border-2 shadow-sm bg-accent/10 text-accent border-accent">
              PUBLISHED
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="col-span-2 p-5 bp-container-list bg-primary text-primary-foreground border-4 border-primary shadow-xl flex justify-between items-center">
              <div>
                <p className="bp-overline text-primary-foreground/70">Yearly Investment</p>
                <p className="text-3xl bp-stat-value text-accent">$4,800</p>
              </div>
              <div className="text-right">
                <p className="bp-overline text-primary-foreground/70">Tier</p>
                <p className="text-lg bp-stat-value text-accent">Gold</p>
              </div>
            </div>
            <div className="bg-card p-4 bp-container-list border-4 border shadow-sm">
              <p className="bp-overline mb-1">Avg. Visit</p>
              <p className="text-2xl bp-stat-value">$120</p>
            </div>
            <div className="bg-card p-4 bp-container-list border-4 border shadow-sm">
              <p className="bp-overline mb-1">Avg. Monthly</p>
              <p className="text-2xl bp-stat-value">$400</p>
            </div>
            <div className="col-span-2 bg-accent p-4 bp-container-list shadow-lg flex justify-between items-center">
              <span className="bp-overline text-accent-foreground">Planned Visits</span>
              <span className="text-2xl bp-stat-value text-accent-foreground">40</span>
            </div>
          </div>
          <div className="space-y-3">
            <button className="w-full py-4 bp-container-compact font-bold text-lg shadow-xl active:scale-95 transition-all border-b-4 border-black/20 bg-primary text-primary-foreground">
              PUBLISH TO CLIENT
            </button>
            <button className="w-full py-4 bp-container-compact font-bold text-lg shadow-md active:scale-95 transition-all border-b-8 bg-card text-foreground border-primary">
              Book an Upcoming Appointment
            </button>
          </div>
        </div>
      </div>

      {/* Modal Layout */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Modal Layout</h3>
        <p className="bp-body-sm text-muted-foreground">Overlay modal with header, content, and footer actions.</p>
        <div className="p-8 bg-black/10 bp-container-tall flex items-center justify-center">
          <div className="bg-card w-full max-w-sm bp-container-tall shadow-2xl overflow-hidden border-4 border-primary">
            <div className="p-6 text-center bg-primary">
              <h2 className="text-xl font-bold text-primary-foreground">Modal Title</h2>
              <p className="bp-caption text-primary-foreground/80 mt-1">Subtitle text here</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bp-container-list border-2 bg-muted border">
                <p className="bp-caption uppercase tracking-widest text-muted-foreground mb-1">Detail Label</p>
                <p className="text-lg font-bold">$400/month</p>
              </div>
              <button className="w-full font-bold py-4 bp-container-compact shadow-xl active:scale-95 transition-all border-b-8 border-black/20 bg-primary text-primary-foreground">
                Confirm Action
              </button>
              <button className="w-full text-center bp-caption uppercase tracking-widest text-muted-foreground hover:opacity-70">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Page Layout */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Settings Page Layout</h3>
        <p className="bp-body-sm text-muted-foreground">Stacked sections with toggles and form fields.</p>
        <div className="p-4 bg-background border border-border bp-container-tall max-w-md mx-auto">
          <h2 className="bp-page-title mb-6">Settings</h2>
          <div className="space-y-4">
            <div className="bg-card p-6 bp-container-tall border-4 border shadow-sm space-y-4">
              <h3 className="bp-overline flex items-center">App Settings</h3>
              <div className="flex justify-between items-center">
                <span className="bp-overline">Push Alerts</span>
                <div className="w-12 h-7 bg-accent bp-container-compact relative">
                  <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow"></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="bp-overline">Text Size</span>
                <div className="flex p-1 rounded-full bg-muted">
                  <button className="px-3 py-1 rounded-full text-xs font-bold text-muted-foreground">S</button>
                  <button className="px-3 py-1 rounded-full text-xs font-bold bg-card shadow text-foreground">M</button>
                  <button className="px-3 py-1 rounded-full text-xs font-bold text-muted-foreground">L</button>
                </div>
              </div>
            </div>
            <div className="bg-card p-6 bp-container-tall border-4 border shadow-sm space-y-4">
              <h3 className="bp-overline">Account Security</h3>
              <div>
                <label className="block bp-caption mb-1">Email</label>
                <input type="email" readOnly value="jane@example.com" className="w-full p-3 bp-container-compact border border font-medium text-sm text-foreground" />
              </div>
              <div>
                <label className="block bp-caption mb-1">Password</label>
                <button className="w-full text-left p-3 border-2 border bp-container-compact font-medium text-sm bg-muted text-foreground">
                  Change Password
                </button>
              </div>
            </div>
            <button className="w-full py-4 border-b-8 border-black/20 uppercase tracking-widest text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-3 bg-primary text-primary-foreground bp-container-compact">
              SIGN OUT
            </button>
          </div>
        </div>
      </div>

      {/* List Layout */}
      <div className="space-y-4">
        <h3 className="bp-card-title">List / Selection Layout</h3>
        <p className="bp-body-sm text-muted-foreground">Searchable list with client cards and action footer.</p>
        <div className="p-4 bg-background border border-border bp-container-tall max-w-md mx-auto">
          <h1 className="text-xl font-bold text-center mb-3">Select Client</h1>
          <div className="relative mb-4">
            <input type="text" placeholder="Search clients..." className="w-full p-3 pl-10 border border bp-container-compact bg-muted text-foreground" />
            <span className="absolute left-3 top-3.5 text-muted-foreground text-sm">🔍</span>
          </div>
          <div className="space-y-3 mb-4">
            {['Jane Smith', 'Alex Johnson', 'Maria Garcia'].map(name => (
              <button key={name} className="w-full bg-card p-3 bp-container-list shadow-sm border border flex items-center transition-all active:scale-[0.98]">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mr-3 text-sm">
                  {name[0]}
                </div>
                <div className="flex-grow text-left">
                  <p className="font-bold text-sm text-foreground">{name}</p>
                  <p className="bp-caption text-muted-foreground">Source: Square</p>
                </div>
              </button>
            ))}
          </div>
          <button className="w-full font-bold py-3 bp-container-compact bg-muted text-muted-foreground">
            Cancel
          </button>
        </div>
      </div>

      {/* Service Selection Grid */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Service Selection Grid</h3>
        <p className="bp-body-sm text-muted-foreground">Two-column grid with selectable service cards.</p>
        <div className="p-4 bg-background border border-border bp-container-tall max-w-md mx-auto">
          <input type="text" placeholder="Search menu..." className="w-full p-3 border-4 border bp-container-compact font-medium shadow-inner bg-muted text-foreground mb-4" />
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {['All', 'Color', 'Cut', 'Treatment'].map((cat, i) => (
              <button key={cat} className={`px-4 py-2 text-xs font-bold bp-container-compact whitespace-nowrap uppercase tracking-widest ${i === 0 ? 'bg-accent text-accent-foreground shadow-lg' : 'border border bg-muted text-muted-foreground'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Balayage', cost: 180, selected: true },
              { name: 'Root Touch-Up', cost: 85, selected: true },
              { name: 'Haircut', cost: 55, selected: false },
              { name: 'Deep Condition', cost: 45, selected: false },
            ].map(svc => (
              <button key={svc.name} className={`p-4 bp-container-tall shadow-sm text-left flex flex-col justify-between h-28 border-4 relative ${svc.selected ? 'bg-accent text-accent-foreground border-black/20 scale-95 shadow-inner' : 'bg-card border text-foreground'}`}>
                <span className="font-bold text-sm leading-tight">{svc.name}</span>
                <span className="text-xs font-semibold opacity-60 uppercase">${svc.cost}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border">
            <button className="w-full bg-primary text-primary-foreground font-bold py-4 bp-container-compact shadow-2xl active:scale-95 transition-all text-lg border-b-8 border-black/20">
              CONFIRM (2)
            </button>
          </div>
        </div>
      </div>

      {/* Spacing Scale */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Spacing Scale</h3>
        <div className="space-y-2">
          {[4, 8, 16, 24, 32, 48].map(px => (
            <div key={px} className="flex items-center gap-4">
              <span className="bp-caption w-16">{px}px</span>
              <div className={`h-4 bg-accent bp-container-compact ${px === 4 ? 'w-1' : px === 8 ? 'w-2' : px === 16 ? 'w-4' : px === 24 ? 'w-6' : px === 32 ? 'w-8' : 'w-12'}`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Dividers */}
      <div className="space-y-4">
        <h3 className="bp-card-title">Dividers</h3>
        <div className="space-y-4">
          <hr className="border-border" />
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border"></div>
            <span className="bp-overline text-muted-foreground">Section Divider</span>
            <div className="h-px flex-1 bg-border"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
