import fs from 'node:fs';
import postcss from 'postcss';

// Guard the active stylesheet, not the unbundled Design System prototype.
// Browser tests additionally validate actual computed colors in components.
const errors = [];
const theme = 'styles/theme.css';
const css = postcss.parse(fs.readFileSync('index.css', 'utf8'), { from: 'index.css' });
const imports = [];
css.walkAtRules('import', rule => imports.push(rule.params));
if (imports.filter(value => value.includes(theme)).length !== 1) errors.push('index.css must import the color authority exactly once');
css.walkDecls(decl => {
  if (/^--(?!surface-)/.test(decl.prop) && decl.prop !== '--foreground') {
    errors.push(`${decl.source.start.line}: token definitions belong in ${theme}: ${decl.prop}`);
  }
  if (/#[\da-f]{3,8}\b|\b(?:oklch|oklab|hsl|hsla|lab|lch|color)\(|\brgba?\((?!var\()/i.test(decl.value)) {
    errors.push(`${decl.source.start.line}: literal colors belong in ${theme}: ${decl.prop}`);
  }
  if (/\b(?:white|black|navy|red|blue|green|gray|grey)\b/.test(decl.value)) {
    errors.push(`${decl.source.start.line}: named palette colors belong in ${theme}`);
  }
  if (decl.prop === '--foreground' && !/^var\(--(?:card|popover)-foreground\)$/.test(decl.value)) {
    errors.push(`${decl.source.start.line}: surface foreground must alias its semantic pair`);
  }
});
for (const selector of ['.bp-bottomnav', '.bp-bottomnav button', '.bp-stat-value']) {
  let count = 0;
  css.walkRules(selector, () => count++);
  if (count !== 1) errors.push(`${selector} must have one authoritative rule, found ${count}`);
}
for (const file of ['components/AdminDashboardV2.tsx', 'components/BottomNav.tsx', 'components/ThemeToggle.tsx']) {
  const source = fs.readFileSync(file, 'utf8');
  const literal = /\b(?:bg|text|border|ring|fill|stroke)-(?:white|black|slate|gray|blue|red|green|amber|emerald|yellow|sky|zinc|neutral|orange|teal|cyan|indigo|violet|purple|pink|rose)(?:-\d+)?(?:\/\d+)?\b/g;
  for (const match of source.matchAll(literal)) {
    errors.push(`${file}: use a semantic role instead of ${match[0]}`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Color authority passed: one palette, paired surfaces, one navigation rule.');
