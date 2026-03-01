const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
        WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak } = require('docx');

// Colors (no # prefix)
const GREEN = "2D6A4F";
const GREEN_LIGHT = "40916C";
const GOLD = "E9A820";
const WHITE = "FFFFFF";
const DARK = "1A1A2E";
const GRAY = "6C757D";
const LIGHT_BG = "F0F7F4";
const GREEN_BG = "E8F5E9";
const GOLD_BG = "FFF8E1";

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const greenBottomBorder = { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 3, color: GREEN }, left: noBorder, right: noBorder };

// Helpers
function heading1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function heading2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...opts.paraOpts,
    children: [new TextRun({ text, size: 22, font: "Arial", ...opts.runOpts })]
  });
}
function boldBody(label, value) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, font: "Arial", color: DARK }),
      new TextRun({ text: value, size: 22, font: "Arial", color: GRAY })
    ]
  });
}
function bullet(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: "Arial" })]
  });
}
function bulletBold(label, value, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, font: "Arial" }),
      new TextRun({ text: value, size: 22, font: "Arial" })
    ]
  });
}
function spacer(pts = 200) {
  return new Paragraph({ spacing: { after: pts }, children: [] });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
function divider() {
  return new Table({
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD }, left: noBorder, right: noBorder },
        width: { size: 9360, type: WidthType.DXA },
        children: [new Paragraph({ spacing: { after: 0 }, children: [] })]
      })]
    })]
  });
}

// Table helper
function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders: cellBorders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: GREEN, type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text: h, bold: true, size: 20, font: "Arial", color: WHITE })]
      })]
    }))
  });
  const dataRows = rows.map(row => new TableRow({
    children: row.map((cell, i) => new TableCell({
      borders: cellBorders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: WHITE, type: ShadingType.CLEAR },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        spacing: { before: 40, after: 40 },
        children: typeof cell === 'string'
          ? [new TextRun({ text: cell, size: 20, font: "Arial" })]
          : cell
      })]
    }))
  }));
  return new Table({ columnWidths: colWidths, rows: [headerRow, ...dataRows] });
}

// Highlight box
function highlightBox(text, bgColor = GREEN_BG) {
  return new Table({
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: { top: { style: BorderStyle.SINGLE, size: 2, color: GREEN }, bottom: { style: BorderStyle.SINGLE, size: 2, color: GREEN }, left: { style: BorderStyle.SINGLE, size: 8, color: GREEN }, right: { style: BorderStyle.SINGLE, size: 2, color: GREEN } },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: bgColor, type: ShadingType.CLEAR },
        children: [new Paragraph({
          spacing: { before: 120, after: 120 },
          indent: { left: 200 },
          children: [new TextRun({ text, size: 22, font: "Arial", color: DARK })]
        })]
      })]
    })]
  });
}

// Stat box row
function statBoxRow(stats) {
  const colW = Math.floor(9360 / stats.length);
  return new Table({
    columnWidths: stats.map(() => colW),
    rows: [new TableRow({
      children: stats.map(s => new TableCell({
        borders: { top: { style: BorderStyle.SINGLE, size: 4, color: GREEN }, bottom: thinBorder, left: thinBorder, right: thinBorder },
        width: { size: colW, type: WidthType.DXA },
        shading: { fill: WHITE, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 0 },
            children: [new TextRun({ text: s.value, bold: true, size: 36, font: "Arial", color: GREEN })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 100 },
            children: [new TextRun({ text: s.label, size: 18, font: "Arial", color: GRAY })]
          })
        ]
      }))
    })]
  });
}

async function main() {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal",
          run: { size: 56, bold: true, color: GREEN, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, color: GREEN, font: "Arial" },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, color: GREEN_LIGHT, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
      ]
    },
    numbering: {
      config: [
        { reference: "bullets",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "bullets2",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "numbered1",
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "numbered2",
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ]
    },
    sections: [
      // ===== COVER PAGE =====
      {
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
        },
        children: [
          spacer(2000),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: "SAFI OIL TRACKER", bold: true, size: 60, font: "Arial", color: GREEN })]
          }),
          // Gold divider
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501", size: 28, color: GOLD })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: "AI-Powered Cooking Oil Tracking", size: 32, font: "Arial", color: GREEN_LIGHT })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: "Scan. Snap. Know.", size: 28, font: "Arial", color: GOLD, bold: true })]
          }),
          spacer(800),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: "Client Summary Document", size: 24, font: "Arial", color: GRAY })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: "Prepared by: Ahmed  |  February 27, 2026", size: 22, font: "Arial", color: GRAY })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: "Status: Ready for Implementation", size: 22, font: "Arial", color: GREEN, bold: true })]
          }),
        ]
      },
      // ===== MAIN CONTENT =====
      {
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: "Safi Oil Tracker", italics: true, size: 18, font: "Arial", color: GREEN }),
                new TextRun({ text: "  |  Client Summary", italics: true, size: 18, font: "Arial", color: GRAY }),
              ]
            })]
          })
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Page ", size: 18, font: "Arial", color: GRAY }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: GRAY }),
                new TextRun({ text: "  |  Confidential", size: 18, font: "Arial", color: GRAY }),
              ]
            })]
          })
        },
        children: [
          // THE PROBLEM
          heading1("The Problem"),
          highlightBox("Home cooking oil consumers have no practical way to track how much oil they've consumed from a bottle."),
          spacer(100),
          bullet("Visual estimation is unreliable"),
          bullet("Measuring before every use is disruptive"),
          bullet("No existing product bridges the gap between physical cooking and dietary tracking"),
          bullet("Health-conscious users want calorie/fat awareness without manual effort"),

          pageBreak(),

          // THE SOLUTION
          heading1("Our Solution"),
          body("Safi Oil Tracker is a Progressive Web App (PWA) that uses AI vision to estimate cooking oil bottle fill levels from a single phone photo."),
          spacer(100),

          // Flow diagram as table
          new Table({
            columnWidths: [2100, 400, 2100, 400, 2100, 400, 1460],
            rows: [new TableRow({
              children: [
                { text: "QR Code\non Bottle", bg: GREEN },
                { text: "\u2192", bg: WHITE },
                { text: "Phone\nCamera", bg: GREEN_LIGHT },
                { text: "\u2192", bg: WHITE },
                { text: "AI\nAnalysis", bg: GREEN },
                { text: "\u2192", bg: WHITE },
                { text: "Instant\nResults", bg: GOLD },
              ].map((c, i) => new TableCell({
                borders: noBorders,
                width: { size: [2100, 400, 2100, 400, 2100, 400, 1460][i], type: WidthType.DXA },
                shading: { fill: c.bg, type: ShadingType.CLEAR },
                verticalAlign: VerticalAlign.CENTER,
                children: c.text.split('\n').map(line => new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 40 },
                  children: [new TextRun({
                    text: line,
                    bold: c.text !== "\u2192",
                    size: c.text === "\u2192" ? 28 : 20,
                    font: "Arial",
                    color: (c.bg === WHITE) ? GREEN : WHITE
                  })]
                }))
              }))
            })]
          }),
          spacer(200),

          heading2("What Makes It Special"),
          makeTable(
            ["Differentiator", "Description"],
            [
              ["Zero Friction", "QR code on bottle \u2192 instant access. No app download, no account, no onboarding"],
              ["Hybrid AI + Math", "AI estimates fill %; precise volume calculated from known bottle geometry"],
              ["Self-Improving", "Every scan is a labeled training example. The product IS the data engine"],
              ["Zero Cost", "$0/month infrastructure on Cloudflare + Gemini free tiers"],
            ],
            [2800, 6560]
          ),

          pageBreak(),

          // HOW IT WORKS
          heading1("How It Works"),
          heading2("User Journey (Under 8 Seconds)"),

          // Steps as numbered items
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "Scan QR Code ", bold: true, size: 22, font: "Arial", color: GREEN }),
              new TextRun({ text: "on bottle \u2014 pre-loads bottle context", size: 22, font: "Arial" })
            ]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "Take Photo ", bold: true, size: 22, font: "Arial", color: GREEN }),
              new TextRun({ text: "with alignment guide overlay", size: 22, font: "Arial" })
            ]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "AI Analyzes ", bold: true, size: 22, font: "Arial", color: GREEN }),
              new TextRun({ text: "using Gemini 2.5 Flash (3-5 seconds)", size: 22, font: "Arial" })
            ]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "View Results ", bold: true, size: 22, font: "Arial", color: GREEN }),
              new TextRun({ text: "\u2014 fill %, volumes (ml/tbsp/cups), nutrition facts", size: 22, font: "Arial" })
            ]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "Give Feedback ", bold: true, size: 22, font: "Arial", color: GREEN }),
              new TextRun({ text: "\u2014 training data for continuous improvement", size: 22, font: "Arial" })
            ]
          }),

          spacer(100),

          heading2("Data Flow"),
          body("User's phone captures and compresses photo (800px JPEG, ~70KB), sends to Cloudflare Worker edge proxy. The worker validates origin, checks rate limits, then routes to Gemini 2.5 Flash (with Groq online-only auto-fallback). AI returns fill percentage and confidence. Client-side calculates precise volumes from known bottle geometry and USDA nutrition data. Note: In POC, R2 storage is deferred (credit card required) — images are processed but not persisted."),

          pageBreak(),

          // SYSTEM ARCHITECTURE
          heading1("System Architecture"),
          body("Pattern: Thin-Client PWA + Serverless Edge Proxy + Object Storage. All domain logic (volume calculation, unit conversion, nutrition lookup) runs in the PWA client. The Cloudflare Worker is a security proxy with data persistence responsibilities. No application server. No database server."),
          spacer(100),

          heading2("Architecture Layers"),
          makeTable(
            ["Layer", "Technology", "Responsibility"],
            [
              ["① User Device — PWA", "React 19 + TypeScript + Vite 7", "QR scan → camera → compress to 800px JPEG (~70KB) → POST to Worker. All volume/nutrition logic runs locally."],
              ["② Edge Proxy", "Cloudflare Worker + Hono.js", "Origin validation · Rate limiting (10 req/min/IP) · Payload guard (<4MB) · LLM routing (Gemini → Groq) · R2 storage binding"],
              ["③ AI Vision (Primary)", "Gemini 2.5 Flash", "Receives base64 JPEG + SKU context. Returns JSON: { fill_percentage, confidence }. Free: 500 req/day."],
              ["④ AI Vision (Fallback)", "Groq + Llama 4 Scout", "Online-only fallback. OpenAI-compatible API. Auto-failover if Gemini fails. Post-POC: replace with fine-tuned Qwen2.5-VL 7B (offline-capable)."],
              ["⑤ Object Storage", "Cloudflare R2", "images/{scanId}.jpg + metadata/{scanId}.json. 10 GB free (~140K scans). $0 egress. ⚠ Requires credit card activation — deferred to post-POC."],
              ["⑥ Hosting", "Cloudflare Pages", "Unlimited bandwidth. Custom domains. PR preview deployments. CDN-distributed globally."],
              ["⑦ Rate Limiting", "Cloudflare KV", "Sliding window: 10 requests/min/IP. Stored in KV store (zero latency at edge)."],
              ["⑧ CI/CD", "GitHub Actions", "Auto-deploy on push to main. Runs 34 unit tests. Uses wrangler-action@v3 for Worker deploys."],
            ],
            [1800, 2400, 5160]
          ),

          spacer(200),
          heading2("Request Flow — Happy Path"),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: "User scans QR → Browser opens: https://safi-oil-tracker.pages.dev/?sku=filippo-berio-500ml", size: 21, font: "Arial" })]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: "PWA loads bottle geometry from local bottleRegistry.js", size: 21, font: "Arial" })]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: "User captures photo → canvas → JPEG @ 800px, quality 0.78 (~70KB)", size: 21, font: "Arial" })]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: "POST /analyze { image: base64, sku: \"filippo-berio-500ml\" }", size: 21, font: "Arial" })]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: "Worker validates origin, rate limit, payload → stores image to R2 (deferred in POC)", size: 21, font: "Arial" })]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: "Gemini 2.5 Flash returns: { fill_percentage: 42, confidence: \"high\" }", size: 21, font: "Arial" })]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: "Worker stores metadata → returns { scanId, fillPercentage: 42, confidence, provider }", size: 21, font: "Arial" })]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: "PWA calculates: 500ml × 42% = 210ml remaining, 290ml consumed → 14.2 tbsp, 0.89 cups", size: 21, font: "Arial" })]
          }),
          new Paragraph({
            numbering: { reference: "numbered1", level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: "User gives feedback → POST /feedback → Worker validates → updates metadata/{scanId}.json", size: 21, font: "Arial" })]
          }),

          spacer(200),
          heading2("Why This Architecture"),
          makeTable(
            ["Principle", "Implementation", "Benefit"],
            [
              ["Zero cold starts", "Cloudflare Workers run on V8 isolates, not containers", "< 50ms startup globally"],
              ["API keys never in browser", "Gemini/Groq keys in Worker env vars only", "No key leakage via DevTools"],
              ["No database server", "Flat files in R2 (images + JSON)", "Zero infra to manage"],
              ["Client-side domain logic", "volumeCalculator.js + nutritionCalculator.js in PWA", "No server round-trips for math"],
              ["Same platform native bindings", "Worker has direct R2 binding", "Faster than HTTP API calls"],
            ],
            [2200, 3500, 3660]
          ),

          spacer(200),
          highlightBox("All serverless. All free tier. Zero cold starts. Zero egress fees. No database server. No application server."),

          pageBreak(),

          // SUPPORTED BOTTLES
          heading1("Supported Bottles (POC)"),
          makeTable(
            ["SKU", "Bottle", "Volume", "Shape"],
            [
              ["filippo-berio-500ml", "Filippo Berio Extra Virgin", "500ml", "Cylinder (65mm \u00d7 220mm)"],
              ["bertolli-750ml", "Bertolli Classico", "750ml", "Frustum (70/85mm \u00d7 280mm)"],
              ["safi-sunflower-1l", "Safi Sunflower Oil", "1000ml", "Cylinder (80mm \u00d7 275mm)"],
            ],
            [2600, 2800, 1400, 2560]
          ),

          pageBreak(),

          // UX DESIGN
          heading1("User Experience Design"),

          heading2("Design System"),
          // Color palette as table
          new Table({
            columnWidths: [1872, 1872, 1872, 1872, 1872],
            rows: [
              new TableRow({
                children: [
                  { color: GREEN, label: "Primary\nDeep Olive" },
                  { color: GREEN_LIGHT, label: "Hover\nState" },
                  { color: WHITE, label: "Surface\nCards" },
                  { color: GOLD, label: "Warning\nMedium Conf." },
                  { color: "D64045", label: "Danger\nLow Conf." },
                ].map((c, i) => new TableCell({
                  borders: cellBorders,
                  width: { size: 1872, type: WidthType.DXA },
                  shading: { fill: c.color, type: ShadingType.CLEAR },
                  verticalAlign: VerticalAlign.CENTER,
                  children: c.label.split('\n').map(line => new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 60, after: 60 },
                    children: [new TextRun({
                      text: line,
                      size: 18,
                      font: "Arial",
                      bold: true,
                      color: (c.color === WHITE || c.color === GOLD) ? DARK : WHITE
                    })]
                  }))
                }))
              })
            ]
          }),

          spacer(100),
          heading2("Screen Flow"),
          body("9 screens designed: QR Landing \u2192 Camera Viewfinder \u2192 Photo Preview \u2192 Analyzing State \u2192 Result Display \u2192 Feedback \u2192 Confirmation \u2192 Error States \u2192 iOS Warning"),
          spacer(50),
          bullet("Mobile-first design (375-430px viewport)", "bullets2"),
          bullet("WCAG 2.1 AA accessible", "bullets2"),
          bullet("Fill gauge with animated bottle visualization", "bullets2"),
          bullet("Single-page linear flow (no navigation complexity)", "bullets2"),

          pageBreak(),

          // PWA vs NATIVE
          heading1("PWA vs Native App"),
          body("Safi Oil Tracker uses a Progressive Web App (PWA) approach for both POC and Full Launch. A native mobile app is a Phase 4 option after 1,000+ scans validate the concept."),
          spacer(100),

          makeTable(
            ["Factor", "PWA (Our Choice)", "Native App (Phase 4)"],
            [
              ["Distribution", "No App Store submission needed", "App Store review required"],
              ["Codebase", "Single codebase (iOS + Android)", "Separate iOS + Android codebases"],
              ["Camera Access", "Browser Camera API (sufficient)", "Full hardware access"],
              ["Offline", "App shell via Service Worker", "Full offline capability"],
              ["Dev Cost", "Low (web technologies)", "High (platform-specific)"],
              ["iOS Caveat", "Must use Safari browser mode (WebKit camera bug in standalone PWA)", "No browser limitations"],
            ],
            [1800, 3780, 3780]
          ),

          spacer(100),
          highlightBox("Decision: PWA for POC + Full Launch. Native only after 1,000+ scans prove market fit and justify the higher development cost.", GREEN_BG),

          pageBreak(),

          // AI & TRAINING
          heading1("AI & Continuous Improvement"),
          body("Every scan automatically becomes a labeled training example. User feedback is validated through 4 sanity checks before being accepted as training data."),
          spacer(100),

          heading2("Feedback Validation"),
          makeTable(
            ["Flag", "Rule", "Example"],
            [
              ["too_fast", "Response < 3 seconds", "User tapped randomly"],
              ["boundary_value", "Estimate is 0% or 100%", "Suspicious edge value"],
              ["contradictory", "\"Too low\" but estimate < AI's", "Logically inconsistent"],
              ["extreme_delta", "Difference > 30% from AI", "Signal quality concern"],
            ],
            [2200, 3800, 3360]
          ),

          spacer(200),
          heading2("Model Evolution Roadmap"),
          makeTable(
            ["Milestone", "Action", "Cost"],
            [
              ["50+ Scans", "Prompt refinement based on error patterns", "$0"],
              ["100+ Scans", "Few-shot examples from best labeled pairs", "$0"],
              ["500+ Scans", "Fine-tune open source model (Qwen2.5 VL 7B)", "~$50/run"],
              ["1000+ Scans", "Fine-tune Gemini Flash via Google AI Studio", "~$100/run"],
            ],
            [2200, 5000, 2160]
          ),

          pageBreak(),

          // SECURITY
          heading1("Security & Privacy"),
          makeTable(
            ["Layer", "Protection"],
            [
              ["Origin Validation", "CORS whitelist: only safi-oil-tracker.pages.dev + localhost"],
              ["Rate Limiting", "10 requests/minute per IP (KV-backed sliding window)"],
              ["Payload Guard", "Reject requests > 4MB"],
              ["API Key Protection", "Secrets in Cloudflare Worker only (never in client/git)"],
              ["Data Privacy", "No PII collected. No accounts, no names, no emails. R2 bucket not publicly accessible."],
              ["Transport Security", "All traffic over HTTPS (Cloudflare enforced)"],
            ],
            [2800, 6560]
          ),

          pageBreak(),

          // SUCCESS CRITERIA
          heading1("Success Criteria"),

          heading2("POC v1 Targets (Current)"),
          makeTable(
            ["Metric", "POC Target"],
            [
              ["Scan-to-Result Time", "< 8 seconds"],
              ["Real Scans (Month 1)", "\u2265 50 with usable training data"],
              ["AI Fill-Level MAE", "\u2264 15% vs user ground truth"],
              ["Feedback Submission Rate", "\u2265 30% of scans"],
              ["Monthly Cost", "$0 (all free tiers)"],
              ["Tests + CI/CD", "34 tests passing \u00b7 auto-deploy on every push"],
            ],
            [4680, 4680]
          ),

          spacer(200),
          heading2("Full Launch Targets"),
          makeTable(
            ["Metric", "Launch Target"],
            [
              ["Scan-to-Result Time", "< 5 seconds (optimized prompts + fine-tuned model)"],
              ["Monthly Active Scans", "10,000+"],
              ["AI Fill-Level MAE", "\u2264 8% (after fine-tuning on 1,000+ labeled images)"],
              ["Scan Completion Rate", "\u2265 80% of initiated scans reach result"],
              ["Monthly Cost", "$3\u201330 (10K\u2013100K scans, Gemini Flash)"],
            ],
            [4680, 4680]
          ),

          pageBreak(),

          // PRODUCT ROADMAP
          heading1("Product Roadmap"),

          // Phase boxes
          ...[
            { phase: "Phase 1 (NOW)", title: "POC v1", items: ["QR \u2192 Scan \u2192 Result flow", "3 bottle SKUs", "AI vision analysis", "User feedback collection", "Training data pipeline", "CI/CD auto-deploy"], color: GREEN },
            { phase: "Phase 2 (After 50+ scans)", title: "Post-POC Validation", items: ["Activate Cloudflare R2 (requires credit card)", "User accounts (D1 + KV)", "Scan history per user", "Custom starting level", "Push notifications", "More bottle SKUs"], color: GREEN_LIGHT },
            { phase: "Phase 3", title: "Model Intelligence", items: ["Prompt refinement", "Few-shot learning", "Model fine-tuning", "Admin dashboard"], color: GREEN_LIGHT },
            { phase: "Phase 4", title: "Platform Scale", items: ["Native mobile app", "Barcode scanning", "Multi-brand registry", "Multi-language support"], color: GOLD },
            { phase: "Phase 5", title: "Business Intel", items: ["Analytics dashboard", "Regional consumption patterns", "Size-based insights", "Loyalty program integration"], color: GOLD },
          ].flatMap(p => [
            new Table({
              columnWidths: [9360],
              rows: [new TableRow({
                children: [new TableCell({
                  borders: { top: { style: BorderStyle.SINGLE, size: 4, color: p.color }, bottom: thinBorder, left: thinBorder, right: thinBorder },
                  width: { size: 9360, type: WidthType.DXA },
                  shading: { fill: WHITE, type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      spacing: { before: 100, after: 60 },
                      children: [
                        new TextRun({ text: p.phase + " \u2014 ", bold: true, size: 22, font: "Arial", color: p.color }),
                        new TextRun({ text: p.title, bold: true, size: 22, font: "Arial", color: DARK }),
                      ]
                    }),
                    ...p.items.map(item => new Paragraph({
                      numbering: { reference: "bullets", level: 0 },
                      spacing: { after: 40 },
                      children: [new TextRun({ text: item, size: 20, font: "Arial" })]
                    })),
                    new Paragraph({ spacing: { after: 60 }, children: [] })
                  ]
                })]
              })]
            }),
            spacer(80),
          ]),

          pageBreak(),

          // COST ANALYSIS
          heading1("Infrastructure Cost"),

          // POC cost box
          new Table({
            columnWidths: [9360],
            rows: [new TableRow({
              children: [new TableCell({
                borders: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, bottom: thinBorder, left: thinBorder, right: thinBorder },
                width: { size: 9360, type: WidthType.DXA },
                shading: { fill: "1E4D3D", type: ShadingType.CLEAR },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 150, after: 60 },
                    children: [new TextRun({ text: "POC v1  —  $0 / month", bold: true, size: 52, font: "Arial", color: GOLD })]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 150 },
                    children: [new TextRun({ text: "Entire stack on free tiers  ·  Valid for up to ~15,000 scans/month", size: 22, font: "Arial", color: "A8D5BA" })]
                  }),
                ]
              })]
            })]
          }),

          spacer(150),

          makeTable(
            ["Service", "POC Tier", "Free Capacity"],
            [
              ["Cloudflare Pages", "FREE", "Unlimited bandwidth, custom domains, PR previews"],
              ["Cloudflare Worker", "FREE", "100,000 req/day · Zero cold starts"],
              ["Cloudflare R2", "FREE (deferred)", "10 GB storage · ~140K scans · $0 egress · Requires credit card activation"],
              ["Gemini 2.5 Flash", "FREE", "500 req/day (15,000/mo) · JSON mode vision"],
              ["Groq + Llama 4 Scout", "FREE", "Online-only auto-failover · Fast inference"],
              ["GitHub Actions CI/CD", "FREE", "Auto-deploy on push"],
            ],
            [2600, 1400, 5360]
          ),

          spacer(300),
          heading2("Full Launch Cost Estimate"),
          body("Once volume exceeds free tier limits, costs scale linearly and remain very low. At 10,000–100,000 scans/month:"),
          spacer(80),

          body("~1,550 tokens/scan (1,500 input + 50 output) using Gemini 2.5 Flash:"),
          spacer(50),
          makeTable(
            ["Volume", "AI Token Cost", "R2 Storage", "Total / month"],
            [
              ["10,000 scans", "$2.55", "$0 (700MB)", "~$3 / mo"],
              ["50,000 scans", "$12.75", "$0 (3.5GB)", "~$13 / mo"],
              ["100,000 scans", "$25.50", "~$3.50", "~$30 / mo"],
            ],
            [2340, 2340, 2340, 2340]
          ),

          spacer(200),
          heading2("Gemini API Token Pricing (Paid Tier)"),

          makeTable(
            ["Model", "Input (per 1M tokens)", "Output (per 1M tokens)", "Free Tier Limit"],
            [
              ["Gemini 2.5 Flash", "$0.15", "$0.60", "500 req/day · 100K tokens/min"],
              ["Gemini 2.5 Pro", "$1.25", "$10.00", "50 req/day · 32K tokens/min"],
            ],
            [2600, 2000, 2000, 2760]
          ),

          spacer(100),
          new Table({
            columnWidths: [9360],
            rows: [new TableRow({
              children: [new TableCell({
                borders: { top: thinBorder, bottom: thinBorder, left: { style: BorderStyle.SINGLE, size: 8, color: GOLD }, right: thinBorder },
                width: { size: 9360, type: WidthType.DXA },
                shading: { fill: GOLD_BG, type: ShadingType.CLEAR },
                children: [
                  new Paragraph({
                    spacing: { before: 100, after: 40 },
                    indent: { left: 200 },
                    children: [new TextRun({ text: "Cost Per Scan (Gemini 2.5 Flash — Paid Tier)", bold: true, size: 22, font: "Arial", color: DARK })]
                  }),
                  new Paragraph({
                    spacing: { before: 0, after: 40 },
                    indent: { left: 200 },
                    children: [new TextRun({ text: "~1,500 input tokens + ~50 output tokens per scan", size: 20, font: "Arial", color: GRAY })]
                  }),
                  new Paragraph({
                    spacing: { before: 0, after: 40 },
                    indent: { left: 200 },
                    children: [new TextRun({ text: "= (1,500 × $0.15/M) + (50 × $0.60/M) = $0.000225 + $0.00003 ≈ ", size: 20, font: "Arial", color: GRAY }),
                               new TextRun({ text: "$0.00026 per scan", bold: true, size: 20, font: "Arial", color: GREEN })]
                  }),
                  new Paragraph({
                    spacing: { before: 0, after: 100 },
                    indent: { left: 200 },
                    children: [new TextRun({ text: "At 100,000 scans: ~$26 in AI token costs alone. Storage + compute add ~$10–20.", size: 20, font: "Arial", color: GRAY })]
                  }),
                ]
              })]
            })]
          }),

          pageBreak(),

          // COMPETITIVE
          heading1("Competitive Advantage"),
          body("No direct competitor exists for AI oil tracking via QR + camera."),
          spacer(100),

          makeTable(
            ["Competitor", "Approach", "Limitation"],
            [
              ["MyFitnessPal", "Manual logging", "High friction, user must type every entry"],
              ["Smart Scales", "Hardware weighing", "Requires purchase, not portable"],
              ["Receipt Scanning", "Label/barcode scan", "Scans labels, not actual content levels"],
            ],
            [2400, 2800, 4160]
          ),

          spacer(200),
          highlightBox("Safi Oil Tracker = Zero friction + Zero hardware + Self-improving AI. An uncontested niche.", GREEN_BG),

          pageBreak(),

          // IMPLEMENTATION STATUS
          heading1("Implementation Status"),

          statBoxRow([
            { value: "38", label: "User Stories" },
            { value: "5", label: "Epics" },
            { value: "34", label: "Unit Tests" },
            { value: "100%", label: "Complete" },
          ]),

          spacer(200),

          heading2("Key Deliverables"),
          makeTable(
            ["Deliverable", "Status"],
            [
              ["Product Requirements Document (PRD)", "Complete (39 FRs, 30 NFRs)"],
              ["Architecture Decision Document", "Complete (14 sections)"],
              ["UX Design Specification", "Complete (9 screens, full design system)"],
              ["Epics & User Stories", "Complete (38 stories across 5 epics)"],
              ["API Specification", "Complete (2 endpoints, full contracts)"],
              ["Data Schemas", "Complete (TypeScript interfaces)"],
              ["LLM Prompt Engineering", "Complete (3 providers)"],
              ["Deployment Guide", "Complete (local + production + CI/CD)"],
              ["Source Code (Frontend)", "Complete (11 components, 3 hooks, 4 utils)"],
              ["Source Code (Backend)", "Complete (Cloudflare Worker, 2 AI providers)"],
              ["Unit Tests", "Complete (34 tests passing)"],
              ["CI/CD Pipeline", "Complete (GitHub Actions)"],
            ],
            [4680, 4680]
          ),

          spacer(200),
          highlightBox("READY FOR IMPLEMENTATION \u2714 \u2014 All planning artifacts complete and verified.", GREEN_BG),

          pageBreak(),

          // RISK MITIGATION
          heading1("Risk Mitigation"),
          makeTable(
            ["Risk", "Severity", "Mitigation"],
            [
              ["iOS camera bug in standalone PWA", "High", "Browser mode enforced; \"Open in Safari\" fallback"],
              ["AI inaccuracy on dark bottles", "High", "POC scoped to clear glass; \u00b115% framing"],
              ["API latency > 8s", "Medium", "Disabled AI thinking; 800px compression; Groq fallback"],
              ["Gemini rate limits", "Medium", "Auto-fallback to Groq; per-IP rate limiting"],
              ["Unreliable user feedback", "Medium", "Layer 1 validation flags contradictions/speed/boundaries"],
            ],
            [2800, 1400, 5160]
          ),

          pageBreak(),

          // NEXT STEPS
          heading1("Next Steps"),

          new Paragraph({
            numbering: { reference: "numbered2", level: 0 },
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Test AI with Client-Provided Photos ", bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: "\u2014 Client sends bottle images directly (no QR step needed). Split into training set + held-out test set to measure baseline AI accuracy.", size: 22, font: "Arial" })
            ]
          }),
          new Paragraph({
            numbering: { reference: "numbered2", level: 0 },
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Refine Prompts Using Feedback Loop ", bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: "\u2014 Iteratively improve Gemini prompts using test results. Basic prompt-refinement loop works with sample data, no R2 or credit card needed.", size: 22, font: "Arial" })
            ]
          }),
          new Paragraph({
            numbering: { reference: "numbered2", level: 0 },
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Deploy + Validate QR Code Scan Flow ", bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: "\u2014 Push to Cloudflare Pages + Worker. Print QR codes for 3 SKUs. Verify end-to-end flow (standard functionality, no innovation risk).", size: 22, font: "Arial" })
            ]
          }),
          new Paragraph({
            numbering: { reference: "numbered2", level: 0 },
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Collect 50+ Real-World Scans ", bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: "\u2014 Live scan collection with feedback. Each scan produces a labeled training pair (image + user-corrected fill level).", size: 22, font: "Arial" })
            ]
          }),
          new Paragraph({
            numbering: { reference: "numbered2", level: 0 },
            spacing: { after: 100 },
            children: [
              new TextRun({ text: "Go / No-Go Decision: Scale Beyond POC ", bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: "\u2014 If AI accuracy hits \u226415% MAE and feedback rate \u226530%: greenlight Phase 2 (activate R2, add user accounts, scan history, notifications, more SKUs; $0\u20135/mo added). If not: iterate prompts or pivot.", size: 22, font: "Arial" })
            ]
          }),

          spacer(400),
          divider(),
          spacer(200),

          // CLOSING
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: "Safi Oil Tracker", bold: true, size: 32, font: "Arial", color: GREEN })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: "Scan. Snap. Know.", size: 24, font: "Arial", color: GOLD, bold: true })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: "Ahmed  |  February 2026", size: 20, font: "Arial", color: GRAY })]
          }),
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve("D:/AI/Self/Safi-Image-Analysis/_bmad-output/planning-artifacts/Safi-Oil-Tracker-Client-Summary.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("DOCX created:", outPath, "(" + Math.round(buffer.length / 1024) + " KB)");
}

main().catch(err => { console.error(err); process.exit(1); });
