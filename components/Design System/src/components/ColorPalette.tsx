export function ColorPalette() {
  const colorGroups = [
    {
      title: 'Core Palette',
      colors: [
        { name: 'Blueprint Navy', var: '--blueprint-navy', hex: '#0B3559', class: 'bg-[#0B3559]' },
        { name: 'Blueprint Steel', var: '--blueprint-steel', hex: '#42708C', class: 'bg-[#42708C]' },
        { name: 'Blueprint Sky', var: '--blueprint-sky', hex: '#5890A6', class: 'bg-[#5890A6]' },
        { name: 'Blueprint Frost', var: '--blueprint-frost', hex: '#8EB1BF', class: 'bg-[#8EB1BF]' },
      ],
    },
    {
      title: 'Semantic Colors',
      colors: [
        { name: 'Primary', var: '--primary', class: 'bg-primary' },
        { name: 'Secondary', var: '--secondary', class: 'bg-secondary' },
        { name: 'Accent', var: '--accent', class: 'bg-accent' },
        { name: 'Muted', var: '--muted', class: 'bg-muted' },
        { name: 'Destructive', var: '--destructive', class: 'bg-destructive' },
      ],
    },
    {
      title: 'Surface Colors',
      colors: [
        { name: 'Background', var: '--background', class: 'bg-background border border-border' },
        { name: 'Card', var: '--card', class: 'bg-card border border-border' },
        { name: 'Popover', var: '--popover', class: 'bg-popover border border-border' },
      ],
    },
    {
      title: 'Text Colors',
      colors: [
        { name: 'Foreground', var: '--foreground', class: 'bg-foreground' },
        { name: 'Muted Foreground', var: '--muted-foreground', class: 'bg-muted-foreground' },
        { name: 'Primary Foreground', var: '--primary-foreground', class: 'bg-primary-foreground' },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {colorGroups.map((group) => (
        <div key={group.title}>
          <h3 className="mb-4 pb-2 border-b border-border">{group.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {group.colors.map((color) => (
              <div
                key={color.name}
                className="glass-card rounded-lg overflow-hidden elevated-card depth-1"
              >
                <div className={`h-32 ${color.class} relative group`}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white text-xs font-mono bg-black/50 px-3 py-1.5 rounded-full">
                      {color.hex || 'Dynamic'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="text-sm mb-1">{color.name}</h4>
                  <code className="text-xs text-muted-foreground font-mono block">
                    var({color.var})
                  </code>
                  {color.hex && (
                    <code className="text-xs text-muted-foreground font-mono block mt-1">
                      {color.hex}
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Color Usage Examples */}
      <div className="mt-12">
        <h3 className="mb-4 pb-2 border-b border-border">Color Usage Examples</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Example 1: Alert Cards */}
          <div className="space-y-4">
            <h4 className="text-sm text-muted-foreground">Alert Variants</h4>
            <div className="glass-card rounded-lg p-4 border-l-4 border-l-primary depth-2">
              <h4 className="text-primary mb-1">Primary Alert</h4>
              <p className="text-sm text-muted-foreground">Using primary color for important information</p>
            </div>
            <div className="glass-card rounded-lg p-4 border-l-4 border-l-accent depth-2">
              <h4 className="text-accent mb-1">Accent Alert</h4>
              <p className="text-sm text-muted-foreground">Using accent color for highlighted content</p>
            </div>
            <div className="glass-card rounded-lg p-4 border-l-4 border-l-destructive depth-2">
              <h4 className="text-destructive mb-1">Destructive Alert</h4>
              <p className="text-sm text-muted-foreground">Using destructive color for warnings</p>
            </div>
          </div>

          {/* Example 2: Grid Pattern */}
          <div className="space-y-4">
            <h4 className="text-sm text-muted-foreground">Blueprint Grid Patterns</h4>
            <div className="glass-card rounded-lg p-8 blueprint-grid relative depth-1">
              <div className="relative z-10 bg-background/90 backdrop-blur-sm p-4 rounded-lg border border-border depth-2">
                <p className="text-sm">Small Grid Pattern</p>
                <code className="text-xs text-muted-foreground font-mono">.blueprint-grid</code>
              </div>
            </div>
            <div className="glass-card rounded-lg p-8 blueprint-grid-large relative depth-1">
              <div className="relative z-10 bg-background/90 backdrop-blur-sm p-4 rounded-lg border border-border depth-2">
                <p className="text-sm">Large Grid Pattern</p>
                <code className="text-xs text-muted-foreground font-mono">.blueprint-grid-large</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}