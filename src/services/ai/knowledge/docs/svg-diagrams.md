# SVG Diagram Patterns — Advanced Reference

Advanced patterns for creating structured diagrams, data visualizations, and illustrative SVGs in presentation slides. This builds on the SVG Drawing fundamentals.

---

## 1. Design Tokens for SVG Diagrams

### Color Ramps (7 stops per hue)

When building multi-element diagrams, use consistent color ramps for categorical data:

| Ramp | 50 | 200 | 400 | 600 | 800 |
|------|-----|------|------|------|------|
| Blue | #EFF6FF | #BFDBFE | #60A5FA | #2563EB | #1E40AF |
| Teal | #F0FDFA | #99F6E4 | #2DD4BF | #0D9488 | #115E59 |
| Coral | #FFF1F2 | #FECDD3 | #FB7185 | #E11D48 | #9F1239 |
| Purple | #FAF5FF | #E9D5FF | #C084FC | #9333EA | #6B21A8 |
| Amber | #FFFBEB | #FDE68A | #FBBF24 | #D97706 | #92400E |
| Green | #F0FDF4 | #BBF7D0 | #4ADE80 | #16A34A | #166534 |
| Gray | #F9FAFB | #E5E7EB | #9CA3AF | #4B5563 | #1F2937 |

**Rule:** Use 400-level stops for fills, 600-level for strokes, 50-level for subtle backgrounds.

### Standard SVG Setup

For landscape diagrams (most common in slides):
```svg
<svg viewBox="0 0 800 450" width="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <polygon points="0 0, 10 3.5, 0 7" fill="currentColor"/>
    </marker>
  </defs>
  <!-- Diagram content -->
</svg>
```

### Sizing Rules

- **Text:** 14px body text ≈ 8px per character width. Use this for box sizing calculations.
- **Small labels:** 11-12px ≈ 7px per char width.
- **Minimum readable text:** 10px in SVG units on a 1920x1080 slide.
- **Node minimum size:** 100x45px for single-line labels, 120x60px for two-line.
- **Spacing between nodes:** 50-60px horizontal, 40-50px vertical.
- **Connection line weight:** 1.5px for standard, 2px for emphasis, 1px for secondary.

---

## 2. Flowchart Patterns

### 2.1 Horizontal Flow (Left-to-Right)

The most common diagram type. Best for sequential processes.

```svg
<svg viewBox="0 0 700 100" width="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arr" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="8" orient="auto">
      <polygon points="0 0,10 3.5,0 7" fill="#3b82f6"/>
    </marker>
  </defs>
  <!-- Node 1 -->
  <rect x="10" y="25" width="130" height="50" rx="10" fill="rgba(59,130,246,0.12)" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="75" y="55" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="600">Collect Data</text>
  <!-- Arrow -->
  <line x1="140" y1="50" x2="190" y2="50" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arr)"/>
  <!-- Node 2 -->
  <rect x="190" y="25" width="130" height="50" rx="10" fill="rgba(59,130,246,0.12)" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="255" y="55" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="600">Process</text>
  <!-- Arrow -->
  <line x1="320" y1="50" x2="370" y2="50" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arr)"/>
  <!-- Node 3 (Decision - diamond) -->
  <rect x="370" y="25" width="130" height="50" rx="10" fill="rgba(234,179,8,0.12)" stroke="#eab308" stroke-width="1.5"/>
  <text x="435" y="55" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="600">Validate</text>
  <!-- Arrow -->
  <line x1="500" y1="50" x2="550" y2="50" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arr)"/>
  <!-- Node 4 -->
  <rect x="550" y="25" width="130" height="50" rx="10" fill="rgba(34,197,94,0.12)" stroke="#22c55e" stroke-width="1.5"/>
  <text x="615" y="55" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="600">Deploy</text>
</svg>
```

**Layout rules:**
- Max 4-5 nodes per horizontal flow (beyond that, wrap or simplify)
- Single directional flow (left-to-right or top-to-bottom)
- Consistent node sizes within a flow
- Color-code different node types (process=blue, decision=amber, end=green)

### 2.2 Vertical Flow (Top-to-Bottom)

Best for hierarchical or sequential processes with branching.

```svg
<svg viewBox="0 0 400 350" width="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrDown" viewBox="0 0 10 7" refX="3.5" refY="7" markerWidth="8" markerHeight="8" orient="auto">
      <polygon points="0 0,7 0,3.5 7" fill="#3b82f6"/>
    </marker>
  </defs>
  <!-- Top node -->
  <rect x="125" y="10" width="150" height="45" rx="8" fill="rgba(59,130,246,0.12)" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="200" y="38" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="600">Start</text>
  <!-- Down arrow -->
  <line x1="200" y1="55" x2="200" y2="90" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrDown)"/>
  <!-- Middle node -->
  <rect x="125" y="90" width="150" height="45" rx="8" fill="rgba(139,92,246,0.12)" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="200" y="118" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="600">Process</text>
  <!-- Branch arrows -->
  <line x1="200" y1="135" x2="100" y2="180" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="200" y1="135" x2="300" y2="180" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arr)"/>
  <!-- Branch nodes -->
  <rect x="25" y="180" width="150" height="45" rx="8" fill="rgba(34,197,94,0.12)" stroke="#22c55e" stroke-width="1.5"/>
  <text x="100" y="208" text-anchor="middle" fill="#e2e8f0" font-size="12">Path A</text>
  <rect x="225" y="180" width="150" height="45" rx="8" fill="rgba(234,179,8,0.12)" stroke="#eab308" stroke-width="1.5"/>
  <text x="300" y="208" text-anchor="middle" fill="#e2e8f0" font-size="12">Path B</text>
</svg>
```

### 2.3 Decision Diamond

```svg
<g transform="translate(200, 100)">
  <rect x="-40" y="-25" width="80" height="50" rx="6" transform="rotate(45)"
        fill="rgba(234,179,8,0.12)" stroke="#eab308" stroke-width="1.5"/>
  <text x="0" y="5" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="600">Valid?</text>
</g>
```

---

## 3. Structural Diagrams

### 3.1 Layered Architecture

Stacked horizontal bars showing system layers:

```svg
<svg viewBox="0 0 500 280" width="100%" xmlns="http://www.w3.org/2000/svg">
  <!-- Layer 1 - top -->
  <rect x="30" y="10" width="440" height="55" rx="8" fill="rgba(59,130,246,0.10)" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="250" y="42" text-anchor="middle" fill="#e2e8f0" font-size="14" font-weight="600">Frontend (React)</text>
  <!-- Arrow down -->
  <line x1="250" y1="65" x2="250" y2="80" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4 3"/>
  <!-- Layer 2 -->
  <rect x="30" y="80" width="440" height="55" rx="8" fill="rgba(139,92,246,0.10)" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="250" y="112" text-anchor="middle" fill="#e2e8f0" font-size="14" font-weight="600">API Gateway</text>
  <!-- Arrow down -->
  <line x1="250" y1="135" x2="250" y2="150" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4 3"/>
  <!-- Layer 3 - split -->
  <rect x="30" y="150" width="210" height="55" rx="8" fill="rgba(34,197,94,0.10)" stroke="#22c55e" stroke-width="1.5"/>
  <text x="135" y="182" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="600">Service A</text>
  <rect x="260" y="150" width="210" height="55" rx="8" fill="rgba(234,179,8,0.10)" stroke="#eab308" stroke-width="1.5"/>
  <text x="365" y="182" text-anchor="middle" fill="#e2e8f0" font-size="13" font-weight="600">Service B</text>
  <!-- Arrow down -->
  <line x1="250" y1="205" x2="250" y2="220" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4 3"/>
  <!-- Layer 4 - bottom -->
  <rect x="30" y="220" width="440" height="55" rx="8" fill="rgba(239,68,68,0.10)" stroke="#ef4444" stroke-width="1.5"/>
  <text x="250" y="252" text-anchor="middle" fill="#e2e8f0" font-size="14" font-weight="600">Database Layer</text>
</svg>
```

### 3.2 Hub-Spoke / Radial

Central node with radiating connections. Best for showing relationships to a core concept.

**Layout math for N satellites evenly distributed:**
- Angle per node = 360° / N
- x = centerX + radius × cos(angle)
- y = centerY + radius × sin(angle)

For 6 satellites at radius 110 from center (200,200):
- 0°: (310, 200), 60°: (255, 295), 120°: (145, 295)
- 180°: (90, 200), 240°: (145, 105), 300°: (255, 105)

### 3.3 Containment / Nesting

```svg
<svg viewBox="0 0 500 300" width="100%" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer container -->
  <rect x="10" y="10" width="480" height="280" rx="12" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6 3"/>
  <text x="30" y="32" fill="#3b82f6" font-size="11" font-weight="600" letter-spacing="1">VPC</text>
  <!-- Inner region A -->
  <rect x="25" y="45" width="220" height="230" rx="8" fill="rgba(34,197,94,0.05)" stroke="#22c55e" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="40" y="63" fill="#22c55e" font-size="10" font-weight="600">Public Subnet</text>
  <!-- Nodes inside A -->
  <rect x="45" y="80" width="180" height="38" rx="6" fill="rgba(34,197,94,0.10)" stroke="#22c55e" stroke-width="1"/>
  <text x="135" y="104" text-anchor="middle" fill="#e2e8f0" font-size="12">Load Balancer</text>
  <!-- Inner region B -->
  <rect x="255" y="45" width="220" height="230" rx="8" fill="rgba(234,179,8,0.05)" stroke="#eab308" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="270" y="63" fill="#eab308" font-size="10" font-weight="600">Private Subnet</text>
  <!-- Nodes inside B -->
  <rect x="275" y="80" width="180" height="38" rx="6" fill="rgba(234,179,8,0.10)" stroke="#eab308" stroke-width="1"/>
  <text x="365" y="104" text-anchor="middle" fill="#e2e8f0" font-size="12">App Server</text>
  <rect x="275" y="130" width="180" height="38" rx="6" fill="rgba(234,179,8,0.10)" stroke="#eab308" stroke-width="1"/>
  <text x="365" y="154" text-anchor="middle" fill="#e2e8f0" font-size="12">Database</text>
</svg>
```

**Rules:**
- Max 2-3 nesting levels for readability
- Each level uses a different color ramp
- Dashed borders for containers, solid for leaf nodes
- Labels in top-left corner of each container

---

## 4. Data Visualization Patterns

### 4.1 SVG Line Chart with Gradient Fill

```svg
<svg viewBox="0 0 400 200" width="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Grid lines -->
  <line x1="40" y1="20" x2="40" y2="170" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <line x1="40" y1="170" x2="380" y2="170" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <line x1="40" y1="95" x2="380" y2="95" stroke="rgba(255,255,255,0.04)" stroke-width="1" stroke-dasharray="4 4"/>
  <!-- Area fill -->
  <path d="M40,140 L100,120 L160,90 L220,100 L280,60 L340,40 L380,50 L380,170 L40,170 Z" fill="url(#areaGrad)"/>
  <!-- Line -->
  <polyline points="40,140 100,120 160,90 220,100 280,60 340,40 380,50" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Data points -->
  <circle cx="280" cy="60" r="4" fill="#3b82f6"/>
  <circle cx="340" cy="40" r="4" fill="#3b82f6"/>
  <circle cx="380" cy="50" r="4" fill="#3b82f6"/>
  <!-- Y-axis labels -->
  <text x="35" y="173" text-anchor="end" fill="rgba(255,255,255,0.4)" font-size="10">0</text>
  <text x="35" y="98" text-anchor="end" fill="rgba(255,255,255,0.4)" font-size="10">50</text>
  <text x="35" y="23" text-anchor="end" fill="rgba(255,255,255,0.4)" font-size="10">100</text>
</svg>
```

### 4.2 Horizontal Bar Chart with Labels

```svg
<svg viewBox="0 0 400 180" width="100%" xmlns="http://www.w3.org/2000/svg">
  <!-- Item 1 -->
  <text x="5" y="28" fill="#e2e8f0" font-size="12" font-weight="500">Revenue</text>
  <rect x="90" y="15" width="280" height="22" rx="4" fill="#3b82f6"/>
  <text x="378" y="30" text-anchor="end" fill="#fff" font-size="11" font-weight="600">$4.2M</text>
  <!-- Item 2 -->
  <text x="5" y="68" fill="#e2e8f0" font-size="12" font-weight="500">Costs</text>
  <rect x="90" y="55" width="180" height="22" rx="4" fill="#8b5cf6"/>
  <text x="278" y="70" text-anchor="end" fill="#fff" font-size="11" font-weight="600">$2.7M</text>
  <!-- Item 3 -->
  <text x="5" y="108" fill="#e2e8f0" font-size="12" font-weight="500">Profit</text>
  <rect x="90" y="95" width="100" height="22" rx="4" fill="#22c55e"/>
  <text x="198" y="110" text-anchor="end" fill="#fff" font-size="11" font-weight="600">$1.5M</text>
  <!-- Item 4 -->
  <text x="5" y="148" fill="#e2e8f0" font-size="12" font-weight="500">Growth</text>
  <rect x="90" y="135" width="220" height="22" rx="4" fill="#eab308"/>
  <text x="318" y="150" text-anchor="end" fill="#fff" font-size="11" font-weight="600">24%</text>
</svg>
```

### 4.3 Donut Chart with Legend

```svg
<svg viewBox="0 0 300 160" width="280" xmlns="http://www.w3.org/2000/svg">
  <!-- Donut -->
  <circle cx="80" cy="80" r="55" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="20"/>
  <circle cx="80" cy="80" r="55" fill="none" stroke="#3b82f6" stroke-width="20" stroke-dasharray="207 345.6" stroke-dashoffset="86.4" stroke-linecap="round"/>
  <circle cx="80" cy="80" r="55" fill="none" stroke="#22c55e" stroke-width="20" stroke-dasharray="104 345.6" stroke-dashoffset="-120.6" stroke-linecap="round"/>
  <circle cx="80" cy="80" r="55" fill="none" stroke="#eab308" stroke-width="20" stroke-dasharray="35 345.6" stroke-dashoffset="-224.6" stroke-linecap="round"/>
  <text x="80" y="76" text-anchor="middle" fill="#fff" font-size="18" font-weight="700">72%</text>
  <text x="80" y="92" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="9">COMPLETION</text>
  <!-- Legend -->
  <rect x="170" y="40" width="10" height="10" rx="2" fill="#3b82f6"/>
  <text x="186" y="49" fill="#e2e8f0" font-size="11">Product (60%)</text>
  <rect x="170" y="62" width="10" height="10" rx="2" fill="#22c55e"/>
  <text x="186" y="71" fill="#e2e8f0" font-size="11">Services (30%)</text>
  <rect x="170" y="84" width="10" height="10" rx="2" fill="#eab308"/>
  <text x="186" y="93" fill="#e2e8f0" font-size="11">Other (10%)</text>
</svg>
```

### 4.4 SVG Sparkline (inline with metrics)

Compact line chart for embedding inside metric cards:
```svg
<svg width="100" height="30" viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg">
  <polyline points="0,25 12,20 24,22 36,15 48,18 60,8 72,12 84,5 100,10"
            fill="none" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"/>
</svg>
```

### 4.5 Heatmap / Grid Matrix

```svg
<svg viewBox="0 0 250 200" width="200" xmlns="http://www.w3.org/2000/svg">
  <!-- Column headers -->
  <text x="70" y="15" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="9">Q1</text>
  <text x="110" y="15" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="9">Q2</text>
  <text x="150" y="15" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="9">Q3</text>
  <text x="190" y="15" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="9">Q4</text>
  <!-- Row 1 -->
  <text x="45" y="42" text-anchor="end" fill="#e2e8f0" font-size="10">Sales</text>
  <rect x="50" y="25" width="35" height="25" rx="3" fill="#22c55e" opacity="0.8"/>
  <rect x="90" y="25" width="35" height="25" rx="3" fill="#22c55e" opacity="0.5"/>
  <rect x="130" y="25" width="35" height="25" rx="3" fill="#eab308" opacity="0.6"/>
  <rect x="170" y="25" width="35" height="25" rx="3" fill="#22c55e" opacity="0.9"/>
</svg>
```

---

## 5. Illustrative Diagrams

### 5.1 When to Use Illustrative SVGs

Illustrative diagrams go beyond boxes-and-arrows to visually depict a mechanism or concept:
- **Physical things:** Show cross-sections, exploded views, or simplified schematics
- **Abstract concepts:** Use spatial metaphors (layers, flows, orbits, funnels)
- **Processes:** Animate the mechanism in action, not just label the steps

### 5.2 Funnel Diagram

```svg
<svg viewBox="0 0 300 250" width="250" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 20 L250 20 L210 80 L90 80 Z" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="1"/>
  <text x="150" y="55" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">Awareness (1000)</text>
  <path d="M90 85 L210 85 L185 140 L115 140 Z" fill="rgba(59,130,246,0.35)" stroke="#3b82f6" stroke-width="1"/>
  <text x="150" y="118" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">Interest (400)</text>
  <path d="M115 145 L185 145 L165 200 L135 200 Z" fill="rgba(59,130,246,0.5)" stroke="#3b82f6" stroke-width="1"/>
  <text x="150" y="178" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600">Decision (150)</text>
  <path d="M135 205 L165 205 L155 240 L145 240 Z" fill="#3b82f6" stroke="#3b82f6" stroke-width="1"/>
  <text x="150" y="228" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">Sale (50)</text>
</svg>
```

### 5.3 Circular Process / Cycle

```svg
<svg viewBox="0 0 300 300" width="250" xmlns="http://www.w3.org/2000/svg">
  <!-- Circular arc segments -->
  <path d="M150 30 A120 120 0 0 1 270 150" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
  <path d="M270 150 A120 120 0 0 1 150 270" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/>
  <path d="M150 270 A120 120 0 0 1 30 150" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>
  <path d="M30 150 A120 120 0 0 1 150 30" fill="none" stroke="#eab308" stroke-width="3" stroke-linecap="round"/>
  <!-- Labels at cardinal points -->
  <text x="150" y="18" text-anchor="middle" fill="#3b82f6" font-size="11" font-weight="600">Plan</text>
  <text x="285" y="155" text-anchor="start" fill="#8b5cf6" font-size="11" font-weight="600">Build</text>
  <text x="150" y="295" text-anchor="middle" fill="#22c55e" font-size="11" font-weight="600">Test</text>
  <text x="15" y="155" text-anchor="start" fill="#eab308" font-size="11" font-weight="600">Deploy</text>
  <!-- Center label -->
  <text x="150" y="148" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">CI/CD</text>
  <text x="150" y="165" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="10">Pipeline</text>
</svg>
```

### 5.4 Animated Scene Pattern

For landscape/environmental scenes on slides:

```svg
<svg viewBox="0 0 1920 1080" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;" xmlns="http://www.w3.org/2000/svg">
  <style>
    @keyframes cloudDrift { 0% { transform:translateX(0); } 100% { transform:translateX(40px); } }
    @keyframes waveBob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
  </style>
  <!-- Sky gradient -->
  <rect width="1920" height="600" fill="url(#skyGrad)"/>
  <!-- Clouds (animated) -->
  <g style="animation:cloudDrift 12s ease-in-out infinite alternate;">
    <ellipse cx="300" cy="200" rx="80" ry="25" fill="rgba(255,255,255,0.06)"/>
    <ellipse cx="280" cy="195" rx="50" ry="18" fill="rgba(255,255,255,0.04)"/>
  </g>
  <!-- Terrain -->
  <path d="M0 600 Q200 500 400 580 Q600 520 800 560 Q1000 500 1200 540 Q1400 580 1600 520 Q1800 560 1920 540 V1080 H0 Z" fill="rgba(34,197,94,0.1)"/>
  <!-- Water (animated) -->
  <g style="animation:waveBob 4s ease-in-out infinite;">
    <path d="M0 700 Q100 690 200 700 Q300 710 400 700 Q500 690 600 700..." fill="rgba(59,130,246,0.08)"/>
  </g>
</svg>
```

---

## 6. Composition Rules

| Rule | Value |
|------|-------|
| Max nodes per diagram | 6-8 (beyond this, split into multiple diagrams) |
| Min text size | 10px in SVG units |
| Standard text size | 12-14px |
| Connection line weight | 1-2px |
| Node min dimensions | 100x40px (landscape), 80x80px (square) |
| Spacing between nodes | 50-60px |
| Max nesting depth | 2-3 levels |
| Always include | `<title>` for accessibility |
| Color coding | Max 5 categories per diagram |
| Arrow markers | Define once in `<defs>`, reference with `url(#id)` |
| Background elements | Keep below 0.1 opacity on dark, 0.05 on light |
| Animation limit | 3-4 animated elements max per SVG |
