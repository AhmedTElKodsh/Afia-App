const sharp = require('sharp');
const path = require('path');
const dir = path.join(__dirname, 'slides');

async function createAssets() {
  // Dark green gradient background for title/hero slides
  const darkGradient = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="810">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1A3C34"/>
      <stop offset="100%" style="stop-color:#2D6A4F"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  await sharp(Buffer.from(darkGradient)).png().toFile(path.join(dir, 'bg-dark.png'));

  // Light gradient for content slides
  const lightGradient = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="810">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#F8F9FA"/>
      <stop offset="100%" style="stop-color:#E8F5E9"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  await sharp(Buffer.from(lightGradient)).png().toFile(path.join(dir, 'bg-light.png'));

  // Green accent bar (left sidebar)
  const accentBar = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="810">
    <rect width="12" height="810" fill="#2D6A4F"/>
  </svg>`;
  await sharp(Buffer.from(accentBar)).png().toFile(path.join(dir, 'accent-bar.png'));

  // Bottom green stripe
  const bottomStripe = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="8">
    <rect width="1440" height="8" fill="#2D6A4F"/>
  </svg>`;
  await sharp(Buffer.from(bottomStripe)).png().toFile(path.join(dir, 'bottom-stripe.png'));

  // Circle icon shapes for numbered steps
  for (let i = 1; i <= 5; i++) {
    const circle = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <circle cx="60" cy="60" r="56" fill="#2D6A4F"/>
      <text x="60" y="72" font-family="Arial" font-size="48" font-weight="bold" fill="white" text-anchor="middle">${i}</text>
    </svg>`;
    await sharp(Buffer.from(circle)).png().toFile(path.join(dir, `num-${i}.png`));
  }

  // Checkmark icon
  const check = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <circle cx="60" cy="60" r="56" fill="#2D6A4F"/>
    <polyline points="35,62 52,78 85,45" fill="none" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  await sharp(Buffer.from(check)).png().toFile(path.join(dir, 'check.png'));

  // Shield icon for security
  const shield = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <path d="M60,10 L100,30 L100,65 C100,85 80,105 60,115 C40,105 20,85 20,65 L20,30 Z" fill="#2D6A4F"/>
    <polyline points="42,62 55,75 80,48" fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  await sharp(Buffer.from(shield)).png().toFile(path.join(dir, 'shield.png'));

  // Dollar sign icon
  const dollar = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <circle cx="60" cy="60" r="56" fill="#2D6A4F"/>
    <text x="60" y="78" font-family="Arial" font-size="60" font-weight="bold" fill="white" text-anchor="middle">$</text>
  </svg>`;
  await sharp(Buffer.from(dollar)).png().toFile(path.join(dir, 'dollar.png'));

  // Brain/AI icon
  const brain = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <circle cx="60" cy="60" r="56" fill="#2D6A4F"/>
    <circle cx="60" cy="50" r="22" fill="none" stroke="white" stroke-width="5"/>
    <line x1="60" y1="72" x2="60" y2="95" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="45" y1="85" x2="75" y2="85" stroke="white" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
  await sharp(Buffer.from(brain)).png().toFile(path.join(dir, 'brain.png'));

  // Rocket icon for roadmap
  const rocket = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <circle cx="60" cy="60" r="56" fill="#2D6A4F"/>
    <path d="M60,25 C50,45 48,65 50,80 L60,75 L70,80 C72,65 70,45 60,25Z" fill="white"/>
    <circle cx="60" cy="55" r="5" fill="#2D6A4F"/>
  </svg>`;
  await sharp(Buffer.from(rocket)).png().toFile(path.join(dir, 'rocket.png'));

  // Trophy icon
  const trophy = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <circle cx="60" cy="60" r="56" fill="#E9A820"/>
    <path d="M40,35 L40,55 C40,70 50,78 60,78 C70,78 80,70 80,55 L80,35Z" fill="white"/>
    <rect x="55" y="78" width="10" height="12" fill="white"/>
    <rect x="45" y="90" width="30" height="6" rx="2" fill="white"/>
  </svg>`;
  await sharp(Buffer.from(trophy)).png().toFile(path.join(dir, 'trophy.png'));

  // Bottle illustration
  const bottle = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400">
    <rect x="75" y="10" width="50" height="30" rx="5" fill="#40916C"/>
    <rect x="80" y="40" width="40" height="20" fill="#40916C"/>
    <rect x="50" y="60" width="100" height="300" rx="15" fill="#40916C" opacity="0.3" stroke="#40916C" stroke-width="3"/>
    <rect x="53" y="190" width="94" height="167" rx="12" fill="#40916C" opacity="0.7"/>
    <text x="100" y="150" font-family="Arial" font-size="36" font-weight="bold" fill="#2D6A4F" text-anchor="middle">42%</text>
  </svg>`;
  await sharp(Buffer.from(bottle)).png().toFile(path.join(dir, 'bottle.png'));

  // Architecture diagram
  const archDiag = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
    <!-- User Phone -->
    <rect x="20" y="140" width="180" height="120" rx="12" fill="#2D6A4F"/>
    <text x="110" y="185" font-family="Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle">React PWA</text>
    <text x="110" y="210" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Camera + UI</text>
    <text x="110" y="230" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Volume Math</text>

    <!-- Arrow -->
    <line x1="200" y1="200" x2="270" y2="200" stroke="#40916C" stroke-width="3" marker-end="url(#arrow)"/>
    <defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#40916C"/></marker></defs>

    <!-- Worker -->
    <rect x="280" y="120" width="200" height="160" rx="12" fill="#40916C"/>
    <text x="380" y="160" font-family="Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle">Cloudflare Worker</text>
    <text x="380" y="185" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Rate Limiting</text>
    <text x="380" y="205" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Origin Validation</text>
    <text x="380" y="225" font-family="Arial" font-size="12" fill="white" text-anchor="middle">LLM Routing</text>
    <text x="380" y="245" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Data Storage</text>

    <!-- Arrow to AI -->
    <line x1="480" y1="170" x2="560" y2="120" stroke="#40916C" stroke-width="3" marker-end="url(#arrow)"/>
    <!-- Arrow to Storage -->
    <line x1="480" y1="230" x2="560" y2="300" stroke="#40916C" stroke-width="3" marker-end="url(#arrow)"/>

    <!-- AI Providers -->
    <rect x="570" y="50" width="200" height="120" rx="12" fill="#E9A820"/>
    <text x="670" y="90" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">AI Vision</text>
    <text x="670" y="115" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Gemini 2.5 Flash</text>
    <text x="670" y="140" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Groq Llama (fallback)</text>

    <!-- Storage -->
    <rect x="570" y="240" width="200" height="120" rx="12" fill="#1A3C34"/>
    <text x="670" y="280" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">Cloudflare R2</text>
    <text x="670" y="305" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Images + Metadata</text>
    <text x="670" y="330" font-family="Arial" font-size="12" fill="white" text-anchor="middle">Training Data</text>
  </svg>`;
  await sharp(Buffer.from(archDiag)).png().toFile(path.join(dir, 'architecture.png'));

  // Competitive position diagram
  const compDiag = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="500">
    <!-- Axes -->
    <line x1="80" y1="420" x2="560" y2="420" stroke="#999" stroke-width="2"/>
    <line x1="80" y1="420" x2="80" y2="40" stroke="#999" stroke-width="2"/>

    <!-- Labels -->
    <text x="320" y="470" font-family="Arial" font-size="14" fill="#333" text-anchor="middle">LOW FRICTION</text>
    <text x="80" y="480" font-family="Arial" font-size="14" fill="#333" text-anchor="middle">HIGH</text>
    <text x="560" y="480" font-family="Arial" font-size="14" fill="#333" text-anchor="end">LOW</text>

    <text x="30" y="230" font-family="Arial" font-size="14" fill="#333" text-anchor="middle" transform="rotate(-90,30,230)">PRECISION</text>

    <!-- Competitors -->
    <circle cx="150" cy="120" r="40" fill="#D64045" opacity="0.7"/>
    <text x="150" y="125" font-family="Arial" font-size="11" fill="white" text-anchor="middle">Smart</text>
    <text x="150" y="140" font-family="Arial" font-size="11" fill="white" text-anchor="middle">Scales</text>

    <circle cx="180" cy="320" r="40" fill="#6C757D" opacity="0.7"/>
    <text x="180" y="315" font-family="Arial" font-size="11" fill="white" text-anchor="middle">MyFitness</text>
    <text x="180" y="330" font-family="Arial" font-size="11" fill="white" text-anchor="middle">Pal</text>

    <!-- Safi -->
    <circle cx="440" cy="240" r="55" fill="#2D6A4F" opacity="0.9"/>
    <text x="440" y="235" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">SAFI</text>
    <text x="440" y="255" font-family="Arial" font-size="12" fill="white" text-anchor="middle">OIL TRACKER</text>

    <circle cx="350" cy="370" r="35" fill="#6C757D" opacity="0.5"/>
    <text x="350" y="370" font-family="Arial" font-size="10" fill="white" text-anchor="middle">Receipt</text>
    <text x="350" y="385" font-family="Arial" font-size="10" fill="white" text-anchor="middle">Scanners</text>
  </svg>`;
  await sharp(Buffer.from(compDiag)).png().toFile(path.join(dir, 'competitive.png'));

  // Roadmap timeline
  const timeline = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="200">
    <!-- Line -->
    <line x1="40" y1="100" x2="860" y2="100" stroke="#40916C" stroke-width="4"/>

    <!-- Phase dots and labels -->
    <circle cx="100" cy="100" r="25" fill="#2D6A4F" stroke="white" stroke-width="4"/>
    <text x="100" y="106" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">1</text>
    <text x="100" y="60" font-family="Arial" font-size="12" font-weight="bold" fill="#2D6A4F" text-anchor="middle">POC</text>
    <text x="100" y="145" font-family="Arial" font-size="10" fill="#666" text-anchor="middle">NOW</text>

    <circle cx="290" cy="100" r="25" fill="#40916C"/>
    <text x="290" y="106" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">2</text>
    <text x="290" y="60" font-family="Arial" font-size="12" font-weight="bold" fill="#40916C" text-anchor="middle">Engagement</text>
    <text x="290" y="145" font-family="Arial" font-size="10" fill="#666" text-anchor="middle">Post-POC</text>

    <circle cx="480" cy="100" r="25" fill="#40916C" opacity="0.8"/>
    <text x="480" y="106" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">3</text>
    <text x="480" y="60" font-family="Arial" font-size="12" font-weight="bold" fill="#40916C" text-anchor="middle">Intelligence</text>
    <text x="480" y="145" font-family="Arial" font-size="10" fill="#666" text-anchor="middle">100+ Scans</text>

    <circle cx="670" cy="100" r="25" fill="#40916C" opacity="0.6"/>
    <text x="670" y="106" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">4</text>
    <text x="670" y="60" font-family="Arial" font-size="12" font-weight="bold" fill="#40916C" text-anchor="middle">Scale</text>
    <text x="670" y="145" font-family="Arial" font-size="10" fill="#666" text-anchor="middle">Native App</text>

    <circle cx="820" cy="100" r="25" fill="#E9A820"/>
    <text x="820" y="106" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">5</text>
    <text x="820" y="60" font-family="Arial" font-size="12" font-weight="bold" fill="#E9A820" text-anchor="middle">Business Intel</text>
    <text x="820" y="145" font-family="Arial" font-size="10" fill="#666" text-anchor="middle">Analytics</text>
  </svg>`;
  await sharp(Buffer.from(timeline)).png().toFile(path.join(dir, 'timeline.png'));

  // Training pipeline diagram
  const pipeline = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300">
    <!-- Step boxes -->
    <rect x="20" y="80" width="160" height="140" rx="10" fill="#2D6A4F"/>
    <text x="100" y="120" font-family="Arial" font-size="13" font-weight="bold" fill="white" text-anchor="middle">SCAN</text>
    <text x="100" y="145" font-family="Arial" font-size="11" fill="white" text-anchor="middle">Image + AI</text>
    <text x="100" y="165" font-family="Arial" font-size="11" fill="white" text-anchor="middle">Prediction</text>
    <text x="100" y="195" font-family="Arial" font-size="10" fill="#A8D5BA" text-anchor="middle">Every scan stored</text>

    <polygon points="190,150 215,135 215,165" fill="#40916C"/>

    <rect x="225" y="80" width="160" height="140" rx="10" fill="#40916C"/>
    <text x="305" y="120" font-family="Arial" font-size="13" font-weight="bold" fill="white" text-anchor="middle">FEEDBACK</text>
    <text x="305" y="145" font-family="Arial" font-size="11" fill="white" text-anchor="middle">User correction</text>
    <text x="305" y="165" font-family="Arial" font-size="11" fill="white" text-anchor="middle">4 accuracy levels</text>
    <text x="305" y="195" font-family="Arial" font-size="10" fill="#C8E6C9" text-anchor="middle">Slider for estimate</text>

    <polygon points="395,150 420,135 420,165" fill="#40916C"/>

    <rect x="430" y="80" width="160" height="140" rx="10" fill="#E9A820"/>
    <text x="510" y="120" font-family="Arial" font-size="13" font-weight="bold" fill="white" text-anchor="middle">VALIDATE</text>
    <text x="510" y="145" font-family="Arial" font-size="11" fill="white" text-anchor="middle">4 sanity checks</text>
    <text x="510" y="165" font-family="Arial" font-size="11" fill="white" text-anchor="middle">Flag suspicious</text>
    <text x="510" y="195" font-family="Arial" font-size="10" fill="white" text-anchor="middle">Quality assurance</text>

    <polygon points="600,150 625,135 625,165" fill="#40916C"/>

    <rect x="635" y="80" width="150" height="140" rx="10" fill="#1A3C34"/>
    <text x="710" y="120" font-family="Arial" font-size="13" font-weight="bold" fill="white" text-anchor="middle">TRAINING</text>
    <text x="710" y="145" font-family="Arial" font-size="11" fill="white" text-anchor="middle">Labeled dataset</text>
    <text x="710" y="165" font-family="Arial" font-size="11" fill="white" text-anchor="middle">Fine-tuning ready</text>
    <text x="710" y="195" font-family="Arial" font-size="10" fill="#A8D5BA" text-anchor="middle">Self-improving AI</text>
  </svg>`;
  await sharp(Buffer.from(pipeline)).png().toFile(path.join(dir, 'pipeline.png'));

  // User flow diagram
  const userFlow = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="200">
    <!-- Step 1 -->
    <rect x="10" y="30" width="150" height="140" rx="10" fill="#2D6A4F"/>
    <text x="85" y="70" font-family="Arial" font-size="28" font-weight="bold" fill="white" text-anchor="middle">1</text>
    <text x="85" y="100" font-family="Arial" font-size="13" font-weight="bold" fill="white" text-anchor="middle">Scan QR</text>
    <text x="85" y="120" font-family="Arial" font-size="11" fill="#A8D5BA" text-anchor="middle">On bottle</text>
    <text x="85" y="140" font-family="Arial" font-size="11" fill="#A8D5BA" text-anchor="middle">0 seconds</text>

    <polygon points="170,100 190,88 190,112" fill="#40916C"/>

    <!-- Step 2 -->
    <rect x="200" y="30" width="150" height="140" rx="10" fill="#40916C"/>
    <text x="275" y="70" font-family="Arial" font-size="28" font-weight="bold" fill="white" text-anchor="middle">2</text>
    <text x="275" y="100" font-family="Arial" font-size="13" font-weight="bold" fill="white" text-anchor="middle">Take Photo</text>
    <text x="275" y="120" font-family="Arial" font-size="11" fill="#C8E6C9" text-anchor="middle">With guide</text>
    <text x="275" y="140" font-family="Arial" font-size="11" fill="#C8E6C9" text-anchor="middle">1 tap</text>

    <polygon points="360,100 380,88 380,112" fill="#40916C"/>

    <!-- Step 3 -->
    <rect x="390" y="30" width="150" height="140" rx="10" fill="#E9A820"/>
    <text x="465" y="70" font-family="Arial" font-size="28" font-weight="bold" fill="white" text-anchor="middle">3</text>
    <text x="465" y="100" font-family="Arial" font-size="13" font-weight="bold" fill="white" text-anchor="middle">AI Analyzes</text>
    <text x="465" y="120" font-family="Arial" font-size="11" fill="white" text-anchor="middle">Gemini Flash</text>
    <text x="465" y="140" font-family="Arial" font-size="11" fill="white" text-anchor="middle">3-5 seconds</text>

    <polygon points="550,100 570,88 570,112" fill="#40916C"/>

    <!-- Step 4 -->
    <rect x="580" y="30" width="150" height="140" rx="10" fill="#2D6A4F"/>
    <text x="655" y="70" font-family="Arial" font-size="28" font-weight="bold" fill="white" text-anchor="middle">4</text>
    <text x="655" y="100" font-family="Arial" font-size="13" font-weight="bold" fill="white" text-anchor="middle">View Results</text>
    <text x="655" y="120" font-family="Arial" font-size="11" fill="#A8D5BA" text-anchor="middle">Volume + Nutrition</text>
    <text x="655" y="140" font-family="Arial" font-size="11" fill="#A8D5BA" text-anchor="middle">Instant</text>

    <polygon points="740,100 760,88 760,112" fill="#40916C"/>

    <!-- Step 5 -->
    <rect x="770" y="30" width="120" height="140" rx="10" fill="#40916C"/>
    <text x="830" y="70" font-family="Arial" font-size="28" font-weight="bold" fill="white" text-anchor="middle">5</text>
    <text x="830" y="100" font-family="Arial" font-size="13" font-weight="bold" fill="white" text-anchor="middle">Feedback</text>
    <text x="830" y="120" font-family="Arial" font-size="11" fill="#C8E6C9" text-anchor="middle">1-2 taps</text>
    <text x="830" y="140" font-family="Arial" font-size="11" fill="#C8E6C9" text-anchor="middle">Training data</text>
  </svg>`;
  await sharp(Buffer.from(userFlow)).png().toFile(path.join(dir, 'userflow.png'));

  console.log('All assets created successfully!');
}

createAssets().catch(console.error);
