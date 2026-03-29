# Standalone HTML Slide — Extended Patterns Reference

> **Purpose:** Supplementary patterns for `reference/standalone-slide-knowledge.md`.
> Adds additional slide layouts, CSS animations, component recipes, and SVG illustrations
> to cover the full range of PowerPoint slide types.
>
> **When to include:** Paste this alongside the main knowledge base when the agent
> needs to produce slides beyond the basic set (title, content, metrics, comparison,
> timeline, quote). Also useful when you want more variety in animations and components.

---

## Table of Contents

8. [Extended Layout Patterns](#part-8-extended-layout-patterns)
9. [Extended CSS Animation Library](#part-9-extended-css-animation-library)
10. [Extended Component Recipes](#part-10-extended-component-recipes)
11. [Extended SVG Illustration Recipes](#part-11-extended-svg-illustration-recipes)
12. [Dark Mode & Alternate Themes](#part-12-dark-mode--alternate-themes)

---

## Part 8: Extended Layout Patterns

### Pattern: Section Divider / Interstitial

A bold, breathing slide between sections with minimal content.

```
┌──────────────────────────────────────────┐
│                                          │
│                                          │
│            SECTION NUMBER                │ ← small eyebrow "01"
│         SECTION TITLE                    │ ← large, bold, accent-colored
│         a brief subtitle line            │ ← muted, italic
│                                          │
│         ━━━━━━━━━━━ (accent line)        │
│                                          │
│                                          │
└──────────────────────────────────────────┘
```

```html
<div class="content" style="position:relative; z-index:10; width:100%; height:100%;
     display:flex; flex-direction:column; align-items:center; justify-content:center;
     padding:3% 4%; gap:clamp(8px,1.2vh,16px);">
  <div style="font-size:clamp(40px,6vw,80px); font-weight:200; color:rgba(0,144,184,0.2);
       font-family:'Barlow Condensed',sans-serif; line-height:1;">01</div>
  <div style="font-family:'Barlow Condensed',sans-serif;
       font-size:clamp(28px,4.5vw,64px); font-weight:900;
       text-transform:uppercase; color:#041828; letter-spacing:2px; line-height:0.95;">
    Market Analysis
  </div>
  <div style="font-size:clamp(11px,1.1vw,15px); color:#4A7888;
       font-style:italic; letter-spacing:1px;">
    Understanding the competitive landscape
  </div>
  <div style="width:clamp(40px,5vw,80px); height:3px; border-radius:2px;
       background:linear-gradient(90deg, #0090B8, #00C8A0); margin-top:clamp(4px,0.8vh,10px);"></div>
</div>
```

### Pattern: Agenda / Table of Contents

```
┌──────────────────────────────────────────┐
│          AGENDA                          │
│                                          │
│   01  Introduction & Context         5m  │
│   ─────────────────────────────────      │
│   02  Market Analysis               10m  │
│   ─────────────────────────────────      │
│   03  Strategic Recommendations      8m  │
│   ─────────────────────────────────      │
│   04  Financial Projections          7m  │
│   ─────────────────────────────────      │
│   05  Next Steps & Q&A              5m   │
│                                          │
└──────────────────────────────────────────┘
```

```html
<div style="width:clamp(400px,55vw,700px); margin:0 auto;">
  <div style="display:flex; align-items:baseline; padding:clamp(8px,1vh,14px) 0;
       border-bottom:1px solid rgba(0,150,180,0.15); gap:clamp(10px,1.5vw,20px);">
    <div style="font-family:'Barlow Condensed',sans-serif;
         font-size:clamp(20px,2.5vw,36px); font-weight:700;
         color:rgba(0,144,184,0.3); min-width:clamp(30px,4vw,50px);">01</div>
    <div style="flex:1; font-size:clamp(13px,1.3vw,18px); font-weight:600; color:#1A3848;">
      Introduction &amp; Context</div>
    <div style="font-size:clamp(9px,0.8vw,12px); color:#8AAAB8; font-weight:400;">5 min</div>
  </div>
  <!-- Repeat for each agenda item, incrementing the number -->
</div>
```

### Pattern: Process / Flow (Horizontal Steps with Connectors)

```
┌──────────────────────────────────────────┐
│           OUR PROCESS                    │
│                                          │
│   ┌─────┐  →  ┌─────┐  →  ┌─────┐      │
│   │  📋 │     │  🔧 │     │  🚀 │      │
│   │Plan │     │Build│     │Ship │      │
│   └─────┘     └─────┘     └─────┘      │
│   Research    Develop      Deploy        │
│   & Design   & Test       & Monitor      │
│                                          │
└──────────────────────────────────────────┘
```

```html
<div style="display:flex; align-items:flex-start; justify-content:center;
            gap:0; width:90%; margin:0 auto;">
  <!-- Step 1 -->
  <div style="flex:1; text-align:center; position:relative;">
    <div style="width:clamp(48px,5vw,72px); height:clamp(48px,5vw,72px);
         border-radius:16px; background:rgba(0,144,184,0.1);
         border:2px solid rgba(0,144,184,0.3);
         display:flex; align-items:center; justify-content:center;
         margin:0 auto clamp(6px,0.8vh,12px);
         font-size:clamp(20px,2.5vw,36px);">📋</div>
    <div style="font-size:clamp(12px,1.2vw,16px); font-weight:700; color:#1A3848;">Plan</div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#6A9AA8; margin-top:2px;">
      Research &amp; Design</div>
  </div>
  <!-- Arrow connector -->
  <div style="flex:0 0 clamp(30px,4vw,60px); display:flex; align-items:center;
       justify-content:center; padding-top:clamp(20px,2.5vw,36px);">
    <svg width="100%" viewBox="0 0 40 20" preserveAspectRatio="xMidYMid meet">
      <path d="M0,10 L28,10 M22,4 L30,10 L22,16" fill="none"
            stroke="#0098B8" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    </svg>
  </div>
  <!-- Step 2 -->
  <div style="flex:1; text-align:center;">
    <div style="width:clamp(48px,5vw,72px); height:clamp(48px,5vw,72px);
         border-radius:16px; background:rgba(0,168,104,0.1);
         border:2px solid rgba(0,168,104,0.3);
         display:flex; align-items:center; justify-content:center;
         margin:0 auto clamp(6px,0.8vh,12px);
         font-size:clamp(20px,2.5vw,36px);">🔧</div>
    <div style="font-size:clamp(12px,1.2vw,16px); font-weight:700; color:#1A3848;">Build</div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#6A9AA8; margin-top:2px;">
      Develop &amp; Test</div>
  </div>
  <!-- Arrow connector -->
  <div style="flex:0 0 clamp(30px,4vw,60px); display:flex; align-items:center;
       justify-content:center; padding-top:clamp(20px,2.5vw,36px);">
    <svg width="100%" viewBox="0 0 40 20" preserveAspectRatio="xMidYMid meet">
      <path d="M0,10 L28,10 M22,4 L30,10 L22,16" fill="none"
            stroke="#00A868" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
    </svg>
  </div>
  <!-- Step 3 -->
  <div style="flex:1; text-align:center;">
    <div style="width:clamp(48px,5vw,72px); height:clamp(48px,5vw,72px);
         border-radius:16px; background:rgba(0,200,160,0.1);
         border:2px solid rgba(0,200,160,0.3);
         display:flex; align-items:center; justify-content:center;
         margin:0 auto clamp(6px,0.8vh,12px);
         font-size:clamp(20px,2.5vw,36px);">🚀</div>
    <div style="font-size:clamp(12px,1.2vw,16px); font-weight:700; color:#1A3848;">Ship</div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#6A9AA8; margin-top:2px;">
      Deploy &amp; Monitor</div>
  </div>
</div>
```

### Pattern: SWOT / 2×2 Quadrant Matrix

```
┌──────────────────────────────────────────┐
│           STRATEGIC ANALYSIS             │
│                                          │
│   ┌─────────────┬─────────────┐          │
│   │  Strengths  │ Weaknesses  │          │
│   │  ● Point    │  ● Point    │          │
│   │  ● Point    │  ● Point    │          │
│   ├─────────────┼─────────────┤          │
│   │Opportunities│   Threats   │          │
│   │  ● Point    │  ● Point    │          │
│   │  ● Point    │  ● Point    │          │
│   └─────────────┴─────────────┘          │
│                                          │
└──────────────────────────────────────────┘
```

```html
<div style="display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr;
            gap:clamp(4px,0.5vw,8px); width:clamp(400px,60vw,760px);
            height:clamp(250px,38vh,420px); margin:0 auto;">
  <!-- Strengths -->
  <div style="background:rgba(0,168,104,0.08); border:1.5px solid rgba(0,168,104,0.25);
       border-radius:12px; padding:clamp(10px,1.2vw,18px); display:flex; flex-direction:column;">
    <div style="font-size:clamp(10px,1vw,13px); font-weight:700; color:#008858;
         text-transform:uppercase; letter-spacing:2px; margin-bottom:clamp(4px,0.6vh,8px);">
      Strengths</div>
    <ul style="list-style:none; padding:0; margin:0; font-size:clamp(9px,0.9vw,12px);
         color:#2A5848; line-height:1.8;">
      <li>● Market leader in sector</li>
      <li>● Strong technology IP</li>
    </ul>
  </div>
  <!-- Weaknesses -->
  <div style="background:rgba(239,68,68,0.06); border:1.5px solid rgba(239,68,68,0.2);
       border-radius:12px; padding:clamp(10px,1.2vw,18px); display:flex; flex-direction:column;">
    <div style="font-size:clamp(10px,1vw,13px); font-weight:700; color:#C04040;
         text-transform:uppercase; letter-spacing:2px; margin-bottom:clamp(4px,0.6vh,8px);">
      Weaknesses</div>
    <ul style="list-style:none; padding:0; margin:0; font-size:clamp(9px,0.9vw,12px);
         color:#6A3838; line-height:1.8;">
      <li>● Limited brand awareness</li>
      <li>● High customer acquisition cost</li>
    </ul>
  </div>
  <!-- Opportunities -->
  <div style="background:rgba(0,144,184,0.08); border:1.5px solid rgba(0,144,184,0.25);
       border-radius:12px; padding:clamp(10px,1.2vw,18px); display:flex; flex-direction:column;">
    <div style="font-size:clamp(10px,1vw,13px); font-weight:700; color:#0070A0;
         text-transform:uppercase; letter-spacing:2px; margin-bottom:clamp(4px,0.6vh,8px);">
      Opportunities</div>
    <ul style="list-style:none; padding:0; margin:0; font-size:clamp(9px,0.9vw,12px);
         color:#2A5878; line-height:1.8;">
      <li>● Emerging African markets</li>
      <li>● Government infrastructure spend</li>
    </ul>
  </div>
  <!-- Threats -->
  <div style="background:rgba(245,158,11,0.08); border:1.5px solid rgba(245,158,11,0.2);
       border-radius:12px; padding:clamp(10px,1.2vw,18px); display:flex; flex-direction:column;">
    <div style="font-size:clamp(10px,1vw,13px); font-weight:700; color:#B07808;
         text-transform:uppercase; letter-spacing:2px; margin-bottom:clamp(4px,0.6vh,8px);">
      Threats</div>
    <ul style="list-style:none; padding:0; margin:0; font-size:clamp(9px,0.9vw,12px);
         color:#6A5028; line-height:1.8;">
      <li>● Regulatory uncertainty</li>
      <li>● Currency volatility</li>
    </ul>
  </div>
</div>
```

### Pattern: Big Number / Stat Hero

A single overwhelming statistic as the visual anchor.

```
┌──────────────────────────────────────────┐
│                                          │
│                                          │
│              $2.4B                        │ ← massive, accent-colored
│       Total Addressable Market           │ ← subtitle
│                                          │
│  ─── Growing at 24% CAGR since 2019 ──  │ ← context divider
│                                          │
│     Source: Industry Report 2026         │ ← footnote
│                                          │
└──────────────────────────────────────────┘
```

```html
<div class="content" style="position:relative; z-index:10; width:100%; height:100%;
     display:flex; flex-direction:column; align-items:center; justify-content:center;
     padding:3% 4%; gap:clamp(6px,1vh,14px);">
  <div style="font-family:'Barlow Condensed',sans-serif;
       font-size:clamp(60px,10vw,140px); font-weight:900; line-height:1;
       color:#0090B8; letter-spacing:-2px;">$2.4B</div>
  <div style="font-size:clamp(16px,2vw,28px); font-weight:600;
       color:#1A3848; letter-spacing:1px; text-transform:uppercase;">
    Total Addressable Market</div>
  <div style="display:flex; align-items:center; gap:clamp(10px,1.2vw,18px); width:60%;
       margin-top:clamp(6px,1vh,12px);">
    <div style="flex:1; height:1px;
         background:linear-gradient(to right, transparent, #0098B8, transparent); opacity:0.3;"></div>
    <div style="font-size:clamp(10px,1vw,14px); color:#4A8898; white-space:nowrap;">
      Growing at 24% CAGR since 2019</div>
    <div style="flex:1; height:1px;
         background:linear-gradient(to right, transparent, #0098B8, transparent); opacity:0.3;"></div>
  </div>
  <div style="font-size:clamp(8px,0.7vw,10px); color:#8AAAB8;
       margin-top:clamp(8px,1.5vh,16px); letter-spacing:1px;">
    Source: Industry Report 2026</div>
</div>
```

### Pattern: Icon Feature Grid (3×2 or 2×3)

```
┌──────────────────────────────────────────┐
│         WHY CHOOSE US                    │
│                                          │
│   ⚡ Speed      🔒 Security   📊 Analytics│
│   Sub-ms        Enterprise    Real-time   │
│   latency       grade         dashboards  │
│                                          │
│   🌍 Global    🔄 Reliable   🤝 Support  │
│   40 regions    99.99%        24/7        │
│                 uptime        dedicated   │
│                                          │
└──────────────────────────────────────────┘
```

```html
<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(12px,1.5vw,24px);
            width:clamp(400px,65vw,780px); margin:0 auto;">
  <div style="text-align:center; padding:clamp(10px,1.2vh,18px);">
    <div style="font-size:clamp(24px,3vw,42px); margin-bottom:4px;">⚡</div>
    <div style="font-size:clamp(12px,1.2vw,16px); font-weight:700; color:#1A3848;">Speed</div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#6A9AA8; margin-top:2px;">
      Sub-millisecond latency</div>
  </div>
  <div style="text-align:center; padding:clamp(10px,1.2vh,18px);">
    <div style="font-size:clamp(24px,3vw,42px); margin-bottom:4px;">🔒</div>
    <div style="font-size:clamp(12px,1.2vw,16px); font-weight:700; color:#1A3848;">Security</div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#6A9AA8; margin-top:2px;">
      Enterprise-grade protection</div>
  </div>
  <div style="text-align:center; padding:clamp(10px,1.2vh,18px);">
    <div style="font-size:clamp(24px,3vw,42px); margin-bottom:4px;">📊</div>
    <div style="font-size:clamp(12px,1.2vw,16px); font-weight:700; color:#1A3848;">Analytics</div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#6A9AA8; margin-top:2px;">
      Real-time dashboards</div>
  </div>
  <!-- Row 2 -->
  <div style="text-align:center; padding:clamp(10px,1.2vh,18px);">
    <div style="font-size:clamp(24px,3vw,42px); margin-bottom:4px;">🌍</div>
    <div style="font-size:clamp(12px,1.2vw,16px); font-weight:700; color:#1A3848;">Global</div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#6A9AA8; margin-top:2px;">
      40 regions worldwide</div>
  </div>
  <div style="text-align:center; padding:clamp(10px,1.2vh,18px);">
    <div style="font-size:clamp(24px,3vw,42px); margin-bottom:4px;">🔄</div>
    <div style="font-size:clamp(12px,1.2vw,16px); font-weight:700; color:#1A3848;">Reliable</div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#6A9AA8; margin-top:2px;">
      99.99% uptime SLA</div>
  </div>
  <div style="text-align:center; padding:clamp(10px,1.2vh,18px);">
    <div style="font-size:clamp(24px,3vw,42px); margin-bottom:4px;">🤝</div>
    <div style="font-size:clamp(12px,1.2vw,16px); font-weight:700; color:#1A3848;">Support</div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#6A9AA8; margin-top:2px;">
      24/7 dedicated team</div>
  </div>
</div>
```

### Pattern: Pricing / Tier Table

```
┌──────────────────────────────────────────┐
│           PRICING                        │
│                                          │
│  ┌────────┐  ┌════════════┐  ┌────────┐ │
│  │ Starter│  ║    Pro     ║  │Enterprise│ │
│  │  $29/m │  ║   $79/m    ║  │ Custom  │ │
│  │ 5 users│  ║  25 users  ║  │Unlimited│ │
│  │ 10 GB  │  ║  100 GB    ║  │  ∞ GB   │ │
│  │[Start] │  ║ [Popular]  ║  │[Contact]│ │
│  └────────┘  └════════════┘  └────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

```html
<div style="display:flex; gap:clamp(8px,1vw,16px); justify-content:center;
            align-items:stretch; width:90%; margin:0 auto;">
  <!-- Starter -->
  <div style="flex:1; max-width:clamp(160px,18vw,240px);
       background:rgba(0,0,0,0.02); border:1.5px solid rgba(0,150,180,0.15);
       border-radius:16px; padding:clamp(14px,1.8vh,24px) clamp(12px,1.2vw,18px);
       display:flex; flex-direction:column; align-items:center; text-align:center;
       gap:clamp(6px,0.8vh,10px);">
    <div style="font-size:clamp(10px,1vw,13px); font-weight:700; color:#4A8898;
         text-transform:uppercase; letter-spacing:2px;">Starter</div>
    <div style="font-family:'Barlow Condensed',sans-serif;
         font-size:clamp(28px,3.5vw,48px); font-weight:900; color:#1A3848;">$29</div>
    <div style="font-size:clamp(9px,0.8vw,11px); color:#8AA8B8;">/month</div>
    <div style="width:100%; height:1px; background:rgba(0,150,180,0.15);"></div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#4A7888; line-height:2;">
      5 team members<br>10 GB storage<br>Email support</div>
    <div style="margin-top:auto; padding:clamp(5px,0.6vh,8px) clamp(14px,1.5vw,22px);
         border-radius:20px; border:1.5px solid rgba(0,144,184,0.4);
         font-size:clamp(9px,0.85vw,12px); font-weight:700; color:#0070A0;
         cursor:pointer;">Get Started</div>
  </div>
  <!-- Pro (highlighted) -->
  <div style="flex:1; max-width:clamp(170px,19vw,250px);
       background:linear-gradient(180deg, rgba(0,144,184,0.08) 0%, rgba(0,200,160,0.06) 100%);
       border:2px solid rgba(0,144,184,0.4); border-radius:16px;
       padding:clamp(14px,1.8vh,24px) clamp(12px,1.2vw,18px);
       display:flex; flex-direction:column; align-items:center; text-align:center;
       gap:clamp(6px,0.8vh,10px); position:relative;
       box-shadow:0 4px 20px rgba(0,144,184,0.12);">
    <div style="position:absolute; top:clamp(-10px,-1.2vh,-14px);
         padding:2px clamp(10px,1vw,14px); border-radius:10px;
         background:#0090B8; color:white;
         font-size:clamp(7px,0.6vw,9px); font-weight:700;
         letter-spacing:1px; text-transform:uppercase;">Most Popular</div>
    <div style="font-size:clamp(10px,1vw,13px); font-weight:700; color:#0070A0;
         text-transform:uppercase; letter-spacing:2px;">Pro</div>
    <div style="font-family:'Barlow Condensed',sans-serif;
         font-size:clamp(28px,3.5vw,48px); font-weight:900; color:#0090B8;">$79</div>
    <div style="font-size:clamp(9px,0.8vw,11px); color:#4A8898;">/month</div>
    <div style="width:100%; height:1px; background:rgba(0,150,180,0.2);"></div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#2A6878; line-height:2;">
      25 team members<br>100 GB storage<br>Priority support</div>
    <div style="margin-top:auto; padding:clamp(5px,0.6vh,8px) clamp(14px,1.5vw,22px);
         border-radius:20px; background:#0090B8; color:white;
         font-size:clamp(9px,0.85vw,12px); font-weight:700;
         cursor:pointer;">Choose Pro</div>
  </div>
  <!-- Enterprise -->
  <div style="flex:1; max-width:clamp(160px,18vw,240px);
       background:rgba(0,0,0,0.02); border:1.5px solid rgba(0,150,180,0.15);
       border-radius:16px; padding:clamp(14px,1.8vh,24px) clamp(12px,1.2vw,18px);
       display:flex; flex-direction:column; align-items:center; text-align:center;
       gap:clamp(6px,0.8vh,10px);">
    <div style="font-size:clamp(10px,1vw,13px); font-weight:700; color:#4A8898;
         text-transform:uppercase; letter-spacing:2px;">Enterprise</div>
    <div style="font-family:'Barlow Condensed',sans-serif;
         font-size:clamp(22px,2.8vw,38px); font-weight:700; color:#1A3848;">Custom</div>
    <div style="font-size:clamp(9px,0.8vw,11px); color:#8AA8B8;">contact us</div>
    <div style="width:100%; height:1px; background:rgba(0,150,180,0.15);"></div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#4A7888; line-height:2;">
      Unlimited members<br>Unlimited storage<br>Dedicated CSM</div>
    <div style="margin-top:auto; padding:clamp(5px,0.6vh,8px) clamp(14px,1.5vw,22px);
         border-radius:20px; border:1.5px solid rgba(0,144,184,0.4);
         font-size:clamp(9px,0.85vw,12px); font-weight:700; color:#0070A0;
         cursor:pointer;">Contact Sales</div>
  </div>
</div>
```

### Pattern: Team / People Grid

```
┌──────────────────────────────────────────┐
│            OUR TEAM                      │
│                                          │
│    ┌──┐     ┌──┐     ┌──┐     ┌──┐      │
│    │JD│     │AS│     │MK│     │LR│      │
│    └──┘     └──┘     └──┘     └──┘      │
│   Jane D.  Alex S.  Maria K. Liam R.    │
│    CEO      CTO      CFO     COO        │
│                                          │
└──────────────────────────────────────────┘
```

```html
<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:clamp(12px,1.5vw,24px);
            width:clamp(400px,60vw,700px); margin:0 auto;">
  <div style="text-align:center;">
    <div style="width:clamp(48px,6vw,80px); height:clamp(48px,6vw,80px);
         border-radius:50%; margin:0 auto clamp(6px,0.8vh,10px);
         background:linear-gradient(135deg, #0090B8, #00C8A0);
         display:flex; align-items:center; justify-content:center;
         font-size:clamp(16px,2vw,26px); font-weight:700; color:white;">JD</div>
    <div style="font-size:clamp(11px,1.1vw,15px); font-weight:700; color:#1A3848;">Jane Doe</div>
    <div style="font-size:clamp(9px,0.85vw,12px); color:#6A9AA8;">Chief Executive Officer</div>
  </div>
  <!-- Repeat for each team member -->
</div>
```

### Pattern: Image Placeholder + Text (Split)

For slides that reference images without external files:

```html
<div style="display:grid; grid-template-columns:1fr 1fr; gap:clamp(16px,2vw,32px);
            align-items:center; width:90%; margin:0 auto;">
  <!-- Image placeholder -->
  <div style="aspect-ratio:4/3; border-radius:12px;
       background:linear-gradient(135deg, rgba(0,144,184,0.08), rgba(0,200,160,0.08));
       border:2px dashed rgba(0,150,180,0.25);
       display:flex; align-items:center; justify-content:center;
       flex-direction:column; gap:8px;">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
         stroke="#8AAAB8" stroke-width="1.5" stroke-linecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
    </svg>
    <div style="font-size:clamp(9px,0.8vw,11px); color:#8AAAB8;">Image Placeholder</div>
  </div>
  <!-- Text content -->
  <div style="text-align:left;">
    <div style="font-family:'Barlow Condensed',sans-serif;
         font-size:clamp(20px,2.8vw,38px); font-weight:700;
         color:#1A3848; line-height:1.1; margin-bottom:clamp(6px,1vh,12px);">
      Feature Headline</div>
    <div style="font-size:clamp(11px,1.1vw,15px); color:#4A7888; line-height:1.6;">
      Describe the feature shown in the image. Keep to 2-3 sentences
      to maintain visual balance with the image panel.</div>
  </div>
</div>
```

### Pattern: Logo / Partner Grid

```html
<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:clamp(16px,2vw,32px);
            align-items:center; justify-items:center;
            width:clamp(400px,55vw,680px); margin:0 auto;">
  <div style="width:clamp(60px,8vw,100px); height:clamp(36px,4.5vh,56px);
       border-radius:8px; background:rgba(0,0,0,0.03);
       border:1px solid rgba(0,0,0,0.06);
       display:flex; align-items:center; justify-content:center;
       font-size:clamp(10px,1vw,14px); font-weight:700; color:#8AA8B8;">Logo 1</div>
  <!-- Repeat for each logo -->
</div>
```

### Pattern: Data Table

```html
<div style="width:clamp(420px,60vw,740px); margin:0 auto; overflow:hidden; border-radius:12px;
            border:1.5px solid rgba(0,150,180,0.15);">
  <table style="width:100%; border-collapse:collapse; font-size:clamp(9px,0.9vw,12px);">
    <thead>
      <tr style="background:rgba(0,144,184,0.08);">
        <th style="padding:clamp(8px,1vh,12px) clamp(10px,1vw,16px);
             text-align:left; font-weight:700; color:#0070A0;
             font-size:clamp(9px,0.85vw,11px); text-transform:uppercase;
             letter-spacing:1px;">Region</th>
        <th style="padding:clamp(8px,1vh,12px); text-align:right; font-weight:700;
             color:#0070A0; font-size:clamp(9px,0.85vw,11px);
             text-transform:uppercase; letter-spacing:1px;">Revenue</th>
        <th style="padding:clamp(8px,1vh,12px); text-align:right; font-weight:700;
             color:#0070A0; font-size:clamp(9px,0.85vw,11px);
             text-transform:uppercase; letter-spacing:1px;">Growth</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-top:1px solid rgba(0,150,180,0.1);">
        <td style="padding:clamp(6px,0.8vh,10px) clamp(10px,1vw,16px);
             color:#1A3848; font-weight:600;">North Africa</td>
        <td style="padding:clamp(6px,0.8vh,10px); text-align:right; color:#4A7888;">$842M</td>
        <td style="padding:clamp(6px,0.8vh,10px); text-align:right; color:#00A868;
             font-weight:600;">+24%</td>
      </tr>
      <tr style="border-top:1px solid rgba(0,150,180,0.1); background:rgba(0,0,0,0.015);">
        <td style="padding:clamp(6px,0.8vh,10px) clamp(10px,1vw,16px);
             color:#1A3848; font-weight:600;">East Africa</td>
        <td style="padding:clamp(6px,0.8vh,10px); text-align:right; color:#4A7888;">$618M</td>
        <td style="padding:clamp(6px,0.8vh,10px); text-align:right; color:#00A868;
             font-weight:600;">+31%</td>
      </tr>
      <tr style="border-top:1px solid rgba(0,150,180,0.1);">
        <td style="padding:clamp(6px,0.8vh,10px) clamp(10px,1vw,16px);
             color:#1A3848; font-weight:600;">West Africa</td>
        <td style="padding:clamp(6px,0.8vh,10px); text-align:right; color:#4A7888;">$956M</td>
        <td style="padding:clamp(6px,0.8vh,10px); text-align:right; color:#00A868;
             font-weight:600;">+18%</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Part 9: Extended CSS Animation Library

Additional `@keyframes` definitions beyond the core cookbook in Parts 1-7.

### Text Animations

```css
/* Shimmer / shine sweep across text — apply to headings */
@keyframes textShimmer {
  0%   { background-position:-200% center; }
  100% { background-position: 200% center; }
}
/* Usage: Apply to text element with these styles */
/* background: linear-gradient(90deg, #1A3848 0%, #0090B8 40%, #00C8A0 50%, #0090B8 60%, #1A3848 100%);
   background-size: 200% auto;
   -webkit-background-clip: text; -webkit-text-fill-color: transparent;
   animation: textShimmer 4s linear infinite; */

/* Typewriter cursor — apply after a fixed-width text block */
@keyframes cursorBlink {
  0%, 100% { border-right-color:transparent; }
  50%      { border-right-color:#0090B8; }
}
/* Usage: border-right:2px solid #0090B8; animation: cursorBlink 1s step-end infinite; */

/* Text glow pulse — for emphasis on key words */
@keyframes textGlow {
  0%, 100% { text-shadow:0 0 4px rgba(0,144,184,0.3); }
  50%      { text-shadow:0 0 16px rgba(0,144,184,0.6), 0 0 32px rgba(0,144,184,0.2); }
}

/* Letter spacing breathe — subtle emphasis for labels */
@keyframes spacingBreathe {
  0%, 100% { letter-spacing:3px; }
  50%      { letter-spacing:5px; }
}
```

### Elastic / Spring Animations

```css
/* Elastic entrance — overshoots then settles */
@keyframes elasticIn {
  0%   { transform:scale(0); opacity:0; }
  55%  { transform:scale(1.08); opacity:1; }
  70%  { transform:scale(0.96); }
  85%  { transform:scale(1.02); }
  100% { transform:scale(1); }
}

/* Bounce drop — falls in from above with bounce */
@keyframes bounceDrop {
  0%   { transform:translateY(-60px); opacity:0; }
  50%  { transform:translateY(8px); opacity:1; }
  70%  { transform:translateY(-4px); }
  100% { transform:translateY(0); }
}

/* Rubber band — attention-seeking stretch */
@keyframes rubberBand {
  0%   { transform:scaleX(1) scaleY(1); }
  30%  { transform:scaleX(1.15) scaleY(0.85); }
  40%  { transform:scaleX(0.9) scaleY(1.1); }
  50%  { transform:scaleX(1.05) scaleY(0.95); }
  65%  { transform:scaleX(0.98) scaleY(1.02); }
  75%  { transform:scaleX(1.01) scaleY(0.99); }
  100% { transform:scaleX(1) scaleY(1); }
}
```

### Draw-on / Path Reveal Animations

```css
/* Stroke draw — reveal SVG paths by animating dashoffset */
@keyframes strokeDraw {
  from { stroke-dashoffset:var(--path-length, 1000); }
  to   { stroke-dashoffset:0; }
}
/* Usage on SVG path:
   stroke-dasharray: var(--path-length, 1000);
   stroke-dashoffset: var(--path-length, 1000);
   animation: strokeDraw 2s ease-out forwards;
   Set --path-length to the actual path length (use getTotalLength() or estimate). */

/* Circle draw — for donut/gauge reveals */
@keyframes circleDraw {
  from { stroke-dashoffset:var(--circumference, 283); }
  to   { stroke-dashoffset:var(--fill-offset, 70); }
}
/* circumference = 2 * π * r ≈ 283 for r=45
   fill-offset = circumference * (1 - percentage/100) */
```

### Background Animations

```css
/* Gradient shift — slow-moving background gradient */
@keyframes gradientShift {
  0%   { background-position:0% 50%; }
  50%  { background-position:100% 50%; }
  100% { background-position:0% 50%; }
}
/* Usage: background-size:200% 200%; animation: gradientShift 8s ease infinite; */

/* Radial pulse — expanding glow from center */
@keyframes radialPulse {
  0%, 100% { background:radial-gradient(circle at center, rgba(0,144,184,0.08) 0%, transparent 60%); }
  50%      { background:radial-gradient(circle at center, rgba(0,144,184,0.15) 0%, transparent 70%); }
}

/* Noise grain overlay — subtle texture */
@keyframes noiseShift {
  0%   { transform:translate(0, 0); }
  10%  { transform:translate(-2%, -2%); }
  20%  { transform:translate(1%, 3%); }
  30%  { transform:translate(-3%, 1%); }
  40%  { transform:translate(3%, -1%); }
  50%  { transform:translate(-1%, 2%); }
  60%  { transform:translate(2%, -3%); }
  70%  { transform:translate(-2%, 1%); }
  80%  { transform:translate(1%, -2%); }
  90%  { transform:translate(3%, 2%); }
  100% { transform:translate(0, 0); }
}
```

### Counter / Progress Animations

```css
/* Width expand — for progress bars filling on load */
@keyframes fillWidth {
  from { width:0%; }
  to   { width:var(--target-width, 75%); }
}
/* Usage: width:0%; animation: fillWidth 1.5s ease-out forwards 0.5s; */

/* Count fade-in — number appears with a scale bump */
@keyframes countReveal {
  0%   { transform:scale(0.6); opacity:0; }
  60%  { transform:scale(1.05); }
  100% { transform:scale(1); opacity:1; }
}
```

### Orbit / Circular Path

```css
/* Orbiting element — circles around a center point */
@keyframes orbit {
  from { transform:rotate(0deg)   translateX(var(--orbit-radius, 40px)) rotate(0deg); }
  to   { transform:rotate(360deg) translateX(var(--orbit-radius, 40px)) rotate(-360deg); }
}
/* The double rotation keeps the orbiting element upright */

/* Pendulum swing */
@keyframes pendulum {
  0%, 100% { transform:rotate(-12deg); }
  50%      { transform:rotate(12deg); }
}
```

### Stagger / Cascade Variants

```css
/* Cascade from left — each child slides in from left with offset */
@keyframes cascadeLeft {
  from { transform:translateX(-30px); opacity:0; }
  to   { transform:translateX(0);     opacity:1; }
}

/* Pop-in chain — scale pop with stagger */
@keyframes popIn {
  0%   { transform:scale(0); opacity:0; }
  70%  { transform:scale(1.1); }
  100% { transform:scale(1); opacity:1; }
}
/* Apply with: animation: popIn 0.4s ease-out forwards;
   animation-delay: calc(var(--i, 0) * 0.12s);
   where --i is 0, 1, 2, 3... per child */
```

### Morphing / Shape-shifting

```css
/* Blob morph — organic shape warping */
@keyframes blobMorph {
  0%, 100% { border-radius:60% 40% 30% 70% / 60% 30% 70% 40%; }
  25%      { border-radius:30% 60% 70% 40% / 50% 60% 30% 60%; }
  50%      { border-radius:50% 60% 30% 60% / 40% 70% 60% 30%; }
  75%      { border-radius:60% 30% 60% 40% / 70% 40% 50% 60%; }
}
/* Usage: width:150px; height:150px; background:...; animation: blobMorph 8s ease-in-out infinite; */
```

### Animation Composition Reference

| Slide Type | Recommended Animations |
|------------|----------------------|
| Title | `breathe` on brand tag, `bob` on vis-strip icons, `streamFlow` on pipelines, `rippleOut` on nexus, `blinkLED` on server LEDs, `waveFlow` on background |
| Section Divider | `elasticIn` on heading, `breathe` on number, `fillWidth` on accent bar |
| Content / Bullets | `cascadeLeft` or `fadeInUp` on bullets (staggered), `bob` on side icon |
| Metrics | `countReveal` on numbers, `fillWidth` on progress bars, `popIn` on cards, `dotPulse` on indicators |
| Comparison | `cascadeLeft` on left col, reverse on right col, `fadeInUp` on header |
| Process Steps | `popIn` chain (stagger 0.2s), `strokeDraw` on connector arrows |
| SWOT | `popIn` on quadrants (stagger 0.15s per quadrant), `bob` on corner icons |
| Timeline | `strokeDraw` on rail line, `popIn` on nodes (stagger 0.3s), `rippleOut` on active node |
| Quote | `elasticIn` on quotation mark, `fadeInUp` on text, `breathe` on attribution |
| Pricing | `bounceDrop` on highlighted tier, `fadeInUp` on others, `dotPulse` on "Popular" badge |
| Team | `popIn` on avatars (stagger 0.15s), `fadeInUp` on names |
| Data Table | `cascadeLeft` on rows (stagger 0.1s), `fillWidth` on any inline bars |
| Big Number | `countReveal` on stat, `textShimmer` on stat, `fadeInUp` on subtitle |
| Icon Grid | `popIn` on each cell (stagger 0.1s) |
| CTA / Closing | `elasticIn` on heading, `radialPulse` on background, `breathe` on button |

---

## Part 10: Extended Component Recipes

### Donut / Gauge Chart (SVG)

```html
<svg width="clamp(100px,14vw,160px)" height="clamp(100px,14vw,160px)"
     viewBox="0 0 100 100" style="display:block; margin:0 auto;">
  <!-- Background ring -->
  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,150,180,0.12)" stroke-width="8"/>
  <!-- Filled arc — 73% -->
  <circle cx="50" cy="50" r="42" fill="none" stroke="#0090B8" stroke-width="8"
          stroke-dasharray="264" stroke-dashoffset="71"
          stroke-linecap="round" transform="rotate(-90 50 50)"
          style="animation:circleDraw 1.5s ease-out forwards;
                 --circumference:264; --fill-offset:71;"/>
  <!-- Center label -->
  <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
        font-family="'Barlow Condensed',sans-serif"
        font-size="22" font-weight="900" fill="#1A3848">73%</text>
  <text x="50" y="64" text-anchor="middle"
        font-size="7" fill="#6A9AA8">Completion</text>
</svg>
```

**Calculating stroke-dashoffset for any percentage:**
```
circumference = 2 × π × r = 2 × 3.14159 × 42 ≈ 264
dashoffset = circumference × (1 - percentage / 100)
73% → 264 × 0.27 ≈ 71
```

### Sparkline (SVG)

A tiny inline trend line:

```html
<svg width="clamp(60px,8vw,100px)" height="clamp(20px,3vh,32px)"
     viewBox="0 0 100 30" preserveAspectRatio="none">
  <polyline points="0,25 15,20 30,22 45,12 60,15 75,5 100,8"
            fill="none" stroke="#0090B8" stroke-width="2" stroke-linecap="round"/>
  <!-- Optional area fill -->
  <polyline points="0,25 15,20 30,22 45,12 60,15 75,5 100,8 100,30 0,30"
            fill="rgba(0,144,184,0.1)" stroke="none"/>
</svg>
```

### Metric Card with Sparkline

```html
<div style="background:rgba(0,0,0,0.03); border:1.5px solid rgba(0,150,180,0.15);
            border-radius:12px; padding:clamp(10px,1.2vh,16px) clamp(12px,1.2vw,18px);
            text-align:left; min-width:clamp(120px,15vw,200px);">
  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
    <div>
      <div style="font-size:clamp(9px,0.8vw,11px); color:#6A9AA8;
           text-transform:uppercase; letter-spacing:1px;">Revenue</div>
      <div style="font-family:'Barlow Condensed',sans-serif;
           font-size:clamp(22px,3vw,40px); font-weight:900;
           color:#0090B8; line-height:1.1;">$4.2M</div>
      <div style="font-size:clamp(8px,0.7vw,10px); color:#00A868; font-weight:600;">↑ 18%</div>
    </div>
    <svg width="60" height="28" viewBox="0 0 100 30" preserveAspectRatio="none"
         style="margin-top:clamp(4px,0.5vh,8px);">
      <polyline points="0,25 15,20 30,22 45,12 60,15 75,5 100,8"
                fill="none" stroke="#0090B8" stroke-width="2.5" stroke-linecap="round"/>
      <polyline points="0,25 15,20 30,22 45,12 60,15 75,5 100,8 100,30 0,30"
                fill="rgba(0,144,184,0.1)" stroke="none"/>
    </svg>
  </div>
</div>
```

### Callout / Alert Box

```html
<!-- Info callout -->
<div style="display:flex; gap:clamp(8px,1vw,14px); align-items:flex-start;
            padding:clamp(10px,1.2vh,16px) clamp(12px,1.3vw,18px);
            border-radius:10px; background:rgba(0,144,184,0.06);
            border-left:4px solid #0090B8; width:clamp(360px,50vw,600px); margin:0 auto;">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
       stroke="#0090B8" stroke-width="2" stroke-linecap="round" style="flex-shrink:0; margin-top:2px;">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
  <div>
    <div style="font-size:clamp(11px,1.1vw,14px); font-weight:700; color:#0070A0;">Key Insight</div>
    <div style="font-size:clamp(9px,0.9vw,12px); color:#2A6878; line-height:1.5; margin-top:2px;">
      Water demand in sub-Saharan Africa is projected to grow 400% by 2040,
      creating an unprecedented investment opportunity.</div>
  </div>
</div>

<!-- Warning callout — change colors -->
<!-- background:rgba(245,158,11,0.06); border-left:4px solid #F59E0B;
     stroke:#F59E0B; color:#B07808; -->

<!-- Success callout -->
<!-- background:rgba(0,168,104,0.06); border-left:4px solid #00A868;
     stroke:#00A868; color:#006848; -->
```

### Numbered Process Steps with Connector Line

```html
<div style="position:relative; width:clamp(400px,55vw,680px); margin:0 auto;">
  <!-- Vertical connector -->
  <div style="position:absolute; left:clamp(18px,2.2vw,28px); top:0; bottom:0;
       width:2px; background:linear-gradient(to bottom, #0090B8, #00C8A0); opacity:0.2;"></div>

  <!-- Step 1 -->
  <div style="display:flex; gap:clamp(12px,1.5vw,20px); align-items:flex-start;
       padding-bottom:clamp(14px,2vh,24px); position:relative;">
    <div style="flex-shrink:0; width:clamp(36px,4.4vw,56px); height:clamp(36px,4.4vw,56px);
         border-radius:50%; background:#0090B8; color:white;
         display:flex; align-items:center; justify-content:center;
         font-family:'Barlow Condensed',sans-serif;
         font-size:clamp(14px,1.6vw,22px); font-weight:700; position:relative; z-index:1;">1</div>
    <div style="padding-top:clamp(4px,0.5vh,8px);">
      <div style="font-size:clamp(13px,1.3vw,18px); font-weight:700; color:#1A3848;">
        Discovery &amp; Assessment</div>
      <div style="font-size:clamp(9px,0.9vw,12px); color:#6A9AA8; line-height:1.5; margin-top:2px;">
        Map existing infrastructure and identify critical gaps.</div>
    </div>
  </div>

  <!-- Step 2 -->
  <div style="display:flex; gap:clamp(12px,1.5vw,20px); align-items:flex-start;
       padding-bottom:clamp(14px,2vh,24px); position:relative;">
    <div style="flex-shrink:0; width:clamp(36px,4.4vw,56px); height:clamp(36px,4.4vw,56px);
         border-radius:50%; background:#00A868; color:white;
         display:flex; align-items:center; justify-content:center;
         font-family:'Barlow Condensed',sans-serif;
         font-size:clamp(14px,1.6vw,22px); font-weight:700; position:relative; z-index:1;">2</div>
    <div style="padding-top:clamp(4px,0.5vh,8px);">
      <div style="font-size:clamp(13px,1.3vw,18px); font-weight:700; color:#1A3848;">
        Strategy &amp; Design</div>
      <div style="font-size:clamp(9px,0.9vw,12px); color:#6A9AA8; line-height:1.5; margin-top:2px;">
        Develop the investment thesis and technical blueprint.</div>
    </div>
  </div>

  <!-- Step 3 -->
  <div style="display:flex; gap:clamp(12px,1.5vw,20px); align-items:flex-start; position:relative;">
    <div style="flex-shrink:0; width:clamp(36px,4.4vw,56px); height:clamp(36px,4.4vw,56px);
         border-radius:50%; background:#00C8A0; color:white;
         display:flex; align-items:center; justify-content:center;
         font-family:'Barlow Condensed',sans-serif;
         font-size:clamp(14px,1.6vw,22px); font-weight:700; position:relative; z-index:1;">3</div>
    <div style="padding-top:clamp(4px,0.5vh,8px);">
      <div style="font-size:clamp(13px,1.3vw,18px); font-weight:700; color:#1A3848;">
        Execution &amp; Monitoring</div>
      <div style="font-size:clamp(9px,0.9vw,12px); color:#6A9AA8; line-height:1.5; margin-top:2px;">
        Deploy capital, oversee construction, and track KPIs.</div>
    </div>
  </div>
</div>
```

### Horizontal Bar Chart (SVG)

```html
<div style="width:clamp(360px,50vw,600px); margin:0 auto;
            display:flex; flex-direction:column; gap:clamp(8px,1vh,14px);">
  <!-- Bar row -->
  <div style="display:flex; align-items:center; gap:clamp(8px,1vw,14px);">
    <div style="width:clamp(60px,8vw,100px); font-size:clamp(9px,0.9vw,12px);
         color:#4A7888; text-align:right; flex-shrink:0;">North Africa</div>
    <div style="flex:1; height:clamp(16px,2vh,24px); background:rgba(0,0,0,0.04);
         border-radius:4px; overflow:hidden; position:relative;">
      <div style="width:84%; height:100%; border-radius:4px;
           background:linear-gradient(90deg, #0090B8, #00B8D0);
           animation:fillWidth 1.2s ease-out forwards;"></div>
    </div>
    <div style="width:clamp(40px,4vw,60px); font-size:clamp(10px,1vw,13px);
         font-weight:700; color:#0090B8; flex-shrink:0;">$842M</div>
  </div>
  <!-- Repeat for each row, adjusting width percentage and value -->
  <div style="display:flex; align-items:center; gap:clamp(8px,1vw,14px);">
    <div style="width:clamp(60px,8vw,100px); font-size:clamp(9px,0.9vw,12px);
         color:#4A7888; text-align:right; flex-shrink:0;">East Africa</div>
    <div style="flex:1; height:clamp(16px,2vh,24px); background:rgba(0,0,0,0.04);
         border-radius:4px; overflow:hidden;">
      <div style="width:62%; height:100%; border-radius:4px;
           background:linear-gradient(90deg, #00A868, #00C8A0);
           animation:fillWidth 1.2s ease-out forwards 0.2s;"></div>
    </div>
    <div style="width:clamp(40px,4vw,60px); font-size:clamp(10px,1vw,13px);
         font-weight:700; color:#00A868; flex-shrink:0;">$618M</div>
  </div>
  <div style="display:flex; align-items:center; gap:clamp(8px,1vw,14px);">
    <div style="width:clamp(60px,8vw,100px); font-size:clamp(9px,0.9vw,12px);
         color:#4A7888; text-align:right; flex-shrink:0;">West Africa</div>
    <div style="flex:1; height:clamp(16px,2vh,24px); background:rgba(0,0,0,0.04);
         border-radius:4px; overflow:hidden;">
      <div style="width:95%; height:100%; border-radius:4px;
           background:linear-gradient(90deg, #0090B8, #00C8A0);
           animation:fillWidth 1.2s ease-out forwards 0.4s;"></div>
    </div>
    <div style="width:clamp(40px,4vw,60px); font-size:clamp(10px,1vw,13px);
         font-weight:700; color:#0090B8; flex-shrink:0;">$956M</div>
  </div>
</div>
```

### Code Block (Standalone — no Prism/Highlight.js)

```html
<div style="width:clamp(380px,52vw,640px); margin:0 auto;
            border-radius:10px; overflow:hidden;
            border:1.5px solid rgba(0,150,180,0.15); text-align:left;">
  <!-- File header bar -->
  <div style="display:flex; align-items:center; gap:6px;
       padding:clamp(6px,0.7vh,10px) clamp(10px,1vw,16px);
       background:rgba(0,20,40,0.06);
       font-size:clamp(8px,0.75vw,10px); color:#6A9AA8;">
    <span style="width:8px; height:8px; border-radius:50%; background:#EF6B6B;"></span>
    <span style="width:8px; height:8px; border-radius:50%; background:#F5C542;"></span>
    <span style="width:8px; height:8px; border-radius:50%; background:#5EC66A;"></span>
    <span style="margin-left:auto; font-family:'JetBrains Mono',monospace;">config.py</span>
  </div>
  <pre style="margin:0; padding:clamp(10px,1.2vh,16px) clamp(12px,1.2vw,18px);
       font-family:'JetBrains Mono','Fira Code',monospace;
       font-size:clamp(9px,0.85vw,12px); line-height:1.7;
       color:#1A3848; background:rgba(0,20,40,0.025); overflow-x:auto;">
<span style="color:#0070A0;">CACHE_TTL</span>   = <span style="color:#B07808;">3600</span>
<span style="color:#0070A0;">API_VERSION</span> = <span style="color:#008858;">"v2"</span>
<span style="color:#8AA8B8;"># Enable real-time data streaming</span>
<span style="color:#0070A0;">STREAM_ENABLED</span> = <span style="color:#0070A0;">True</span></pre>
</div>
```

### Stacked Bar / Segmented Progress

```html
<div style="width:clamp(360px,50vw,600px); margin:0 auto;">
  <div style="font-size:clamp(11px,1.1vw,14px); font-weight:700; color:#1A3848;
       margin-bottom:clamp(6px,0.8vh,10px);">Budget Allocation</div>
  <div style="display:flex; height:clamp(24px,3vh,36px); border-radius:6px; overflow:hidden;">
    <div style="width:40%; background:#0090B8;
         display:flex; align-items:center; justify-content:center;
         font-size:clamp(8px,0.7vw,10px); color:white; font-weight:700;">R&D 40%</div>
    <div style="width:30%; background:#00A868;
         display:flex; align-items:center; justify-content:center;
         font-size:clamp(8px,0.7vw,10px); color:white; font-weight:700;">Ops 30%</div>
    <div style="width:20%; background:#00C8A0;
         display:flex; align-items:center; justify-content:center;
         font-size:clamp(8px,0.7vw,10px); color:white; font-weight:700;">Sales 20%</div>
    <div style="width:10%; background:#C0DCE8;
         display:flex; align-items:center; justify-content:center;
         font-size:clamp(7px,0.6vw,9px); color:#4A7888; font-weight:700;">G&A</div>
  </div>
</div>
```

### Before / After (Side by Side with Label)

```html
<div style="display:grid; grid-template-columns:1fr auto 1fr; gap:0;
            width:clamp(420px,60vw,720px); margin:0 auto; align-items:stretch;">
  <!-- Before -->
  <div style="background:rgba(239,68,68,0.04); border:1.5px solid rgba(239,68,68,0.15);
       border-radius:12px 0 0 12px; padding:clamp(12px,1.5vh,20px) clamp(12px,1.3vw,18px);">
    <div style="font-size:clamp(10px,1vw,13px); font-weight:700; color:#C04040;
         text-transform:uppercase; letter-spacing:2px; margin-bottom:clamp(6px,0.8vh,10px);">Before</div>
    <ul style="list-style:none; padding:0; margin:0;
         font-size:clamp(9px,0.9vw,12px); color:#6A4848; line-height:2.2;">
      <li>✗ Manual water testing — 72h turnaround</li>
      <li>✗ Paper-based reporting</li>
      <li>✗ Reactive maintenance</li>
    </ul>
  </div>
  <!-- Center divider -->
  <div style="width:clamp(30px,3vw,48px); display:flex; align-items:center; justify-content:center;
       background:rgba(0,150,180,0.05);">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="#0098B8" stroke-width="2" stroke-linecap="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  </div>
  <!-- After -->
  <div style="background:rgba(0,168,104,0.04); border:1.5px solid rgba(0,168,104,0.15);
       border-radius:0 12px 12px 0; padding:clamp(12px,1.5vh,20px) clamp(12px,1.3vw,18px);">
    <div style="font-size:clamp(10px,1vw,13px); font-weight:700; color:#008858;
         text-transform:uppercase; letter-spacing:2px; margin-bottom:clamp(6px,0.8vh,10px);">After</div>
    <ul style="list-style:none; padding:0; margin:0;
         font-size:clamp(9px,0.9vw,12px); color:#2A5848; line-height:2.2;">
      <li>✓ IoT sensors — real-time monitoring</li>
      <li>✓ Automated digital dashboards</li>
      <li>✓ Predictive maintenance AI</li>
    </ul>
  </div>
</div>
```

---

## Part 11: Extended SVG Illustration Recipes

Additional building blocks for the agent to compose custom visuals.

### Pie / Donut Segment (Multi-color)

```xml
<svg viewBox="0 0 100 100" width="clamp(100px,14vw,160px)" style="display:block; margin:0 auto;">
  <!-- Segment 1: 45% — starts at 12 o'clock -->
  <circle cx="50" cy="50" r="38" fill="none" stroke="#0090B8" stroke-width="10"
          stroke-dasharray="107 132" stroke-dashoffset="0"
          transform="rotate(-90 50 50)"/>
  <!-- Segment 2: 30% -->
  <circle cx="50" cy="50" r="38" fill="none" stroke="#00A868" stroke-width="10"
          stroke-dasharray="72 167" stroke-dashoffset="-107"
          transform="rotate(-90 50 50)"/>
  <!-- Segment 3: 25% -->
  <circle cx="50" cy="50" r="38" fill="none" stroke="#C0DCE8" stroke-width="10"
          stroke-dasharray="60 179" stroke-dashoffset="-179"
          transform="rotate(-90 50 50)"/>
  <!-- Center hole -->
  <circle cx="50" cy="50" r="28" fill="white"/>
</svg>
```

**Calculating segments:** `circumference = 2×π×38 ≈ 239`. For X%: `dasharray = (X/100 × 239), (239 - X/100 × 239)`. Offset each segment by negative cumulative length.

### Funnel Diagram

```xml
<svg viewBox="0 0 400 200" width="100%" preserveAspectRatio="xMidYMid meet" style="max-width:500px; margin:0 auto; display:block;">
  <!-- Stage 1: widest -->
  <polygon points="40,10 360,10 320,55 80,55" fill="#0090B8" opacity="0.2"/>
  <polygon points="40,10 360,10 320,55 80,55" fill="none" stroke="#0090B8" stroke-width="1.5"/>
  <text x="200" y="38" text-anchor="middle" font-size="11" fill="#0070A0" font-weight="600">10,000 Leads</text>

  <!-- Stage 2 -->
  <polygon points="80,60 320,60 280,105 120,105" fill="#00A868" opacity="0.15"/>
  <polygon points="80,60 320,60 280,105 120,105" fill="none" stroke="#00A868" stroke-width="1.5"/>
  <text x="200" y="88" text-anchor="middle" font-size="11" fill="#008858" font-weight="600">2,400 Qualified</text>

  <!-- Stage 3 -->
  <polygon points="120,110 280,110 250,155 150,155" fill="#00C8A0" opacity="0.12"/>
  <polygon points="120,110 280,110 250,155 150,155" fill="none" stroke="#00C8A0" stroke-width="1.5"/>
  <text x="200" y="138" text-anchor="middle" font-size="11" fill="#008878" font-weight="600">860 Proposals</text>

  <!-- Stage 4: narrowest -->
  <polygon points="150,160 250,160 230,195 170,195" fill="#008858" opacity="0.2"/>
  <polygon points="150,160 250,160 230,195 170,195" fill="none" stroke="#008858" stroke-width="1.5"/>
  <text x="200" y="183" text-anchor="middle" font-size="11" fill="#006040" font-weight="700">320 Closed</text>
</svg>
```

### Pyramid / Triangle Hierarchy

```xml
<svg viewBox="0 0 400 250" width="100%" preserveAspectRatio="xMidYMid meet" style="max-width:480px; margin:0 auto; display:block;">
  <!-- Top tier -->
  <polygon points="200,10 240,75 160,75" fill="#0090B8" opacity="0.25"/>
  <polygon points="200,10 240,75 160,75" fill="none" stroke="#0090B8" stroke-width="1.5"/>
  <text x="200" y="55" text-anchor="middle" font-size="10" fill="#0070A0" font-weight="700">Strategy</text>

  <!-- Middle tier -->
  <polygon points="160,80 240,80 290,155 110,155" fill="#00A868" opacity="0.18"/>
  <polygon points="160,80 240,80 290,155 110,155" fill="none" stroke="#00A868" stroke-width="1.5"/>
  <text x="200" y="125" text-anchor="middle" font-size="10" fill="#008858" font-weight="700">Planning &amp; Design</text>

  <!-- Bottom tier -->
  <polygon points="110,160 290,160 340,240 60,240" fill="#00C8A0" opacity="0.12"/>
  <polygon points="110,160 290,160 340,240 60,240" fill="none" stroke="#00C8A0" stroke-width="1.5"/>
  <text x="200" y="208" text-anchor="middle" font-size="10" fill="#006850" font-weight="700">Execution &amp; Operations</text>
</svg>
```

### Flow Diagram (Box → Arrow → Box)

```xml
<svg viewBox="0 0 800 120" width="100%" preserveAspectRatio="xMidYMid meet" style="max-width:700px; margin:0 auto; display:block;">
  <!-- Box 1 -->
  <rect x="10" y="30" width="150" height="60" rx="8" fill="rgba(0,144,184,0.08)"
        stroke="#0090B8" stroke-width="1.5"/>
  <text x="85" y="65" text-anchor="middle" font-size="12" fill="#0070A0" font-weight="700">Ingest Data</text>

  <!-- Arrow 1 -->
  <line x1="165" y1="60" x2="225" y2="60" stroke="#0098B8" stroke-width="2" stroke-linecap="round"/>
  <polygon points="220,54 232,60 220,66" fill="#0098B8"/>

  <!-- Box 2 -->
  <rect x="235" y="30" width="150" height="60" rx="8" fill="rgba(0,168,104,0.08)"
        stroke="#00A868" stroke-width="1.5"/>
  <text x="310" y="65" text-anchor="middle" font-size="12" fill="#008858" font-weight="700">Process</text>

  <!-- Arrow 2 -->
  <line x1="390" y1="60" x2="450" y2="60" stroke="#00A868" stroke-width="2" stroke-linecap="round"/>
  <polygon points="445,54 457,60 445,66" fill="#00A868"/>

  <!-- Box 3 -->
  <rect x="460" y="30" width="150" height="60" rx="8" fill="rgba(0,200,160,0.08)"
        stroke="#00C8A0" stroke-width="1.5"/>
  <text x="535" y="65" text-anchor="middle" font-size="12" fill="#008878" font-weight="700">Deliver</text>

  <!-- Arrow 3 -->
  <line x1="615" y1="60" x2="675" y2="60" stroke="#00C8A0" stroke-width="2" stroke-linecap="round"/>
  <polygon points="670,54 682,60 670,66" fill="#00C8A0"/>

  <!-- Box 4 -->
  <rect x="685" y="30" width="105" height="60" rx="8" fill="rgba(0,136,88,0.1)"
        stroke="#008858" stroke-width="1.5"/>
  <text x="737" y="65" text-anchor="middle" font-size="12" fill="#006040" font-weight="700">Monitor</text>
</svg>
```

### Circular / Radial Layout (Hub and Spokes)

```xml
<svg viewBox="0 0 300 300" width="clamp(200px,25vw,320px)" style="display:block; margin:0 auto;">
  <!-- Center hub -->
  <circle cx="150" cy="150" r="35" fill="rgba(0,144,184,0.1)" stroke="#0090B8" stroke-width="2"/>
  <text x="150" y="154" text-anchor="middle" font-size="11" fill="#0070A0" font-weight="700">Core</text>

  <!-- Spoke lines -->
  <line x1="150" y1="115" x2="150" y2="50" stroke="#C0DCE8" stroke-width="1.5" stroke-dasharray="4 3"/>
  <line x1="185" y1="150" x2="250" y2="150" stroke="#C0DCE8" stroke-width="1.5" stroke-dasharray="4 3"/>
  <line x1="150" y1="185" x2="150" y2="250" stroke="#C0DCE8" stroke-width="1.5" stroke-dasharray="4 3"/>
  <line x1="115" y1="150" x2="50" y2="150" stroke="#C0DCE8" stroke-width="1.5" stroke-dasharray="4 3"/>

  <!-- Outer nodes -->
  <circle cx="150" cy="38" r="22" fill="rgba(0,168,104,0.1)" stroke="#00A868" stroke-width="1.5"/>
  <text x="150" y="42" text-anchor="middle" font-size="8" fill="#008858" font-weight="600">Water</text>

  <circle cx="262" cy="150" r="22" fill="rgba(0,200,160,0.1)" stroke="#00C8A0" stroke-width="1.5"/>
  <text x="262" y="154" text-anchor="middle" font-size="8" fill="#008878" font-weight="600">Data</text>

  <circle cx="150" cy="262" r="22" fill="rgba(0,144,184,0.1)" stroke="#0090B8" stroke-width="1.5"/>
  <text x="150" y="266" text-anchor="middle" font-size="8" fill="#0070A0" font-weight="600">Energy</text>

  <circle cx="38" cy="150" r="22" fill="rgba(245,158,11,0.1)" stroke="#F59E0B" stroke-width="1.5"/>
  <text x="38" y="154" text-anchor="middle" font-size="8" fill="#B07808" font-weight="600">Finance</text>
</svg>
```

### Additional SVG Icon Paths

| Icon | Path (100×100 space) |
|------|---------------------|
| Chart Line Up | `M10,80 L30,55 L50,65 L70,30 L90,20` (polyline, no fill) |
| Building / Office | `M20,85 L20,25 L50,10 L80,25 L80,85 Z` + window rects at (30,35), (45,35), (60,35), (30,55), (45,55), (60,55) |
| Handshake | `M15,55 Q25,40 40,50 L60,50 Q75,40 85,55` + `M40,50 L40,70` + `M60,50 L60,70` |
| Magnifying Glass | `<circle cx="42" cy="42" r="25"/>` + `<line x1="60" y1="60" x2="85" y2="85"/>` |
| Padlock | `M30,45 L30,35 Q30,15 50,15 Q70,15 70,35 L70,45` + `<rect x="25" y="45" width="50" height="40" rx="5"/>` |
| Wifi | Three arcs at cx=50: `M35,55 Q50,40 65,55`, `M25,45 Q50,25 75,45`, `M15,35 Q50,10 85,35` |
| Upload / Cloud Up | Cloud path (see main knowledge base) + `M50,80 L50,55 M40,65 L50,55 L60,65` |
| Heart | `M50,85 Q10,55 25,30 Q35,15 50,30 Q65,15 75,30 Q90,55 50,85 Z` |
| Trophy | `M30,20 L70,20 L65,50 Q65,60 55,65 L55,75 L70,80 L70,85 L30,85 L30,80 L45,75 L45,65 Q35,60 35,50 Z` |
| Calendar | `<rect x="15" y="20" width="70" height="65" rx="5"/>` + `<line x1="15" y1="38" x2="85" y2="38"/>` + `<line x1="35" y1="10" x2="35" y2="28"/>` + `<line x1="65" y1="10" x2="65" y2="28"/>` |

---

## Part 12: Dark Mode & Alternate Themes

### Dark Theme Color Map

Replace light-mode roles with these dark equivalents:

| Role | Light Mode | Dark Mode |
|------|-----------|-----------|
| Page background | `#C0DCE8` | `#0A0A1A` |
| Slide background | `#EAF6FA` | `#0F1628` |
| Panel left | `#D8EEF8` | `#0D1A2A` |
| Panel right | `#D4F0E8` | `#0D2A1A` |
| Text primary | `#041828` | `#E8F0F4` |
| Text secondary | `#2A6878` | `rgba(255,255,255,0.6)` |
| Accent 1 | `#0090B8` | `#00C8E8` (brighter) |
| Accent 2 | `#008858` | `#00D898` (brighter) |
| Borders | `rgba(0,150,180,0.15)` | `rgba(255,255,255,0.08)` |
| Card bg | `rgba(0,0,0,0.03)` | `rgba(255,255,255,0.04)` |

### Dark Mode Skeleton

```css
html, body { background:#050510; }
.slide { background:#0F1628; color:#E8F0F4; }
.bg-left  { background:linear-gradient(135deg, #0D1A2A 0%, #101830 60%, #0D2030 100%); }
.bg-right { background:linear-gradient(225deg, #0D2A1A 0%, #102820 60%, #0D2A20 100%); }
```

### High-Contrast / Accessible Theme

- Minimum contrast ratio 4.5:1 for all body text
- 3:1 for large text (>18px bold or >24px normal)
- Avoid conveying information through color alone — pair with icons or labels
- Use `prefers-reduced-motion` media query:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration:0.001ms !important;
    animation-iteration-count:1 !important;
  }
}
```

### Warm / Earth Theme Example

| Role | Value |
|------|-------|
| Page background | `#F5EDE4` |
| Slide background | `#FAF5F0` |
| Text primary | `#2A1810` |
| Accent 1 | `#C07030` (copper) |
| Accent 2 | `#607848` (olive) |
| Panel gradients | `#F0E8D8 → #E8DCC8` / `#E8F0E0 → #DCE8D0` |

### Neon / Cyberpunk Theme Example

| Role | Value |
|------|-------|
| Page background | `#0A0010` |
| Slide background | `#0D0018` |
| Text primary | `#F0E8FF` |
| Accent 1 | `#FF00FF` (magenta) |
| Accent 2 | `#00FFFF` (cyan) |
| Glow effect | `text-shadow: 0 0 8px #FF00FF, 0 0 20px rgba(255,0,255,0.4)` |
| Border style | `border: 1px solid rgba(255,0,255,0.3); box-shadow: 0 0 10px rgba(255,0,255,0.15)` |

---

## How to Use This Document

### Include alongside the main knowledge base

This file is **Part 8-12**, extending the core **Parts 1-7** in `reference/standalone-slide-knowledge.md`.

| What You're Building | Parts Needed |
|---------------------|-------------|
| Title slide | 1-7 (main file only) |
| Content / bullet slide | 1-3, 6-7 (main) |
| Metrics / dashboard | 1-3, 7 (main) + Part 10 (this file) |
| SWOT / quadrant | 1-3 (main) + Part 8, 9 (this file) |
| Process / flow diagram | 1-3 (main) + Part 8, 10, 11 (this file) |
| Pricing table | 1-3 (main) + Part 8 (this file) |
| Team / people slide | 1-3 (main) + Part 8 (this file) |
| Data table | 1-3 (main) + Part 8, 10 (this file) |
| Big number hero | 1-3 (main) + Part 8, 9 (this file) |
| Dark mode / any theme | 1-7 (main) + Part 12 (this file) |
| SVG diagrams (funnels, flows, radial) | 1-3, 4 (main) + Part 11 (this file) |
| Fancy animations (elastic, shimmer, draw) | 1-3 (main) + Part 9 (this file) |
