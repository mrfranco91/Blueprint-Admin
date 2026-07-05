export function TypographyShowcase() {
  return (
    <div className="space-y-8">
      {/* Headings */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Headings</h3>
        <div className="space-y-4 glass-card rounded-lg p-6 depth-1">
          <div>
            <h1>Heading 1 - Technical Specification</h1>
            <code className="text-xs text-muted-foreground font-mono">h1 • 2xl • medium • Raleway</code>
          </div>
          <div>
            <h2>Heading 2 - System Architecture</h2>
            <code className="text-xs text-muted-foreground font-mono">h2 • xl • medium • Raleway</code>
          </div>
          <div>
            <h3>Heading 3 - Component Overview</h3>
            <code className="text-xs text-muted-foreground font-mono">h3 • lg • medium • Raleway</code>
          </div>
          <div>
            <h4>Heading 4 - Detail Section</h4>
            <code className="text-xs text-muted-foreground font-mono">h4 • base • medium • Raleway</code>
          </div>
        </div>
      </div>

      {/* Body Text */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Body Text</h3>
        <div className="glass-card rounded-lg p-6 space-y-4 depth-1">
          <div>
            <p className="mb-2">
              <strong>Regular Paragraph:</strong> This design system is crafted for modern web and mobile applications,
              drawing inspiration from technical blueprints and engineering documentation. The color palette features
              deep navy blues transitioning to lighter frost tones, creating a professional and technical aesthetic.
            </p>
            <code className="text-xs text-muted-foreground font-mono">p • base • normal • Comfortaa</code>
          </div>
          <div>
            <p className="text-muted-foreground">
              <strong>Muted Text:</strong> Secondary information and supporting details use muted foreground colors
              to establish clear visual hierarchy while maintaining readability across both light and dark modes.
            </p>
            <code className="text-xs text-muted-foreground font-mono">text-muted-foreground • Comfortaa</code>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              <strong>Small Text:</strong> Fine print, captions, and metadata are rendered at a smaller size
              for compact information display.
            </p>
            <code className="text-xs text-muted-foreground font-mono">text-sm • Comfortaa</code>
          </div>
        </div>
      </div>

      {/* Technical Text */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Technical Elements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card rounded-lg p-6 depth-1">
            <h4 className="mb-3">Code & Monospace</h4>
            <div className="space-y-2">
              <code className="block bg-muted px-3 py-2 rounded-lg text-sm font-mono depth-1">
                const theme = "blueprint"
              </code>
              <code className="block bg-muted px-3 py-2 rounded-lg text-sm font-mono depth-1">
                #0B3559 → rgb(11, 53, 89)
              </code>
              <code className="block bg-muted px-3 py-2 rounded-lg text-sm font-mono depth-1">
                var(--primary)
              </code>
            </div>
          </div>

          <div className="glass-card rounded-lg p-6 depth-1">
            <h4 className="mb-3">Labels & UI Text</h4>
            <div className="space-y-3">
              <label className="block">Form Label (Raleway)</label>
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-full depth-2 shine-effect">
                Button Text (Raleway)
              </button>
              <div className="text-xs text-muted-foreground font-mono">
                METADATA • VERSION 1.0.0
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Typography Scale */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Type Scale</h3>
        <div className="bg-card border border-border rounded p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {[
              { size: '2xl', example: 'The quick brown fox jumps' },
              { size: 'xl', example: 'The quick brown fox jumps over' },
              { size: 'lg', example: 'The quick brown fox jumps over the lazy dog' },
              { size: 'base', example: 'The quick brown fox jumps over the lazy dog' },
              { size: 'sm', example: 'The quick brown fox jumps over the lazy dog' },
              { size: 'xs', example: 'The quick brown fox jumps over the lazy dog' },
            ].map((item) => (
              <div key={item.size} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-4 border-b border-border last:border-0">
                <code className="text-xs text-muted-foreground font-mono w-16 shrink-0">
                  {item.size}
                </code>
                <p className={`text-${item.size} flex-1`}>{item.example}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Text Colors */}
      <div>
        <h3 className="mb-4 pb-2 border-b border-border">Text Color Variants</h3>
        <div className="bg-card border border-border rounded p-6 space-y-3">
          <p className="text-foreground">Foreground - Primary text color</p>
          <p className="text-muted-foreground">Muted Foreground - Secondary text</p>
          <p className="text-primary">Primary - Brand color text</p>
          <p className="text-accent-foreground">Accent Foreground - Accent text</p>
          <p className="text-destructive">Destructive - Error or warning text</p>
        </div>
      </div>
    </div>
  );
}