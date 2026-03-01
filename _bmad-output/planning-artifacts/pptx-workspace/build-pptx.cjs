const pptxgen = require('pptxgenjs');
const path = require('path');
const html2pptx = require('C:/Users/Ahmed/.claude/skills/pptx/scripts/html2pptx.js');

const slidesDir = path.join(__dirname, 'slides');
const outputPath = path.join(__dirname, '..', 'Safi-Oil-Tracker-Client-Presentation-v3.pptx');

async function build() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'Ahmed';
  pptx.title = 'Safi Oil Tracker - Client Presentation';
  pptx.subject = 'AI-Powered Cooking Oil Tracking';

  const slides = [
    'slide01-title.html',         // 1. Title
    'slide02-problem.html',       // 2. The Problem
    'slide03-solution.html',      // 3. Our Solution
    'slide04-howitworks.html',    // 4. How It Works (large phone + 4 screens, proper arrows)
    'slide05-architecture.html',  // 5. System Architecture (POC vs Launch, R2 note)
    'slide06-techstack.html',     // 6. Technology Stack (split POC / Launch columns)
    'slide07-pwa-vs-native.html', // 7. PWA vs Native App (NEW)
    'slide08-ux.html',            // 8. UX Design (large phone mockup, 4 screens)
    'slide08-ai.html',            // 9. AI & Training (original slide08)
    'slide09-security.html',      // 10. Security
    'slide10-metrics.html',       // 11. Success Criteria
    'slide11-roadmap.html',       // 12. Roadmap
    'slide12-cost.html',          // 13. Cost (POC vs Launch)
    'slide13-competitive.html',   // 14. Competitive
    'slide14-status.html',        // 15. Status
    'slide15-nextsteps.html',     // 16. Next Steps
    'slide16-thankyou.html',      // 17. Thank You
  ];

  for (let i = 0; i < slides.length; i++) {
    const htmlFile = path.join(slidesDir, slides[i]);
    console.log(`Processing slide ${i + 1}: ${slides[i]}`);
    try {
      await html2pptx(htmlFile, pptx);
    } catch (err) {
      console.error(`Error on ${slides[i]}:`, err.message);
      throw err;
    }
  }

  await pptx.writeFile({ fileName: outputPath });
  console.log(`\nPresentation saved to: ${outputPath}`);
}

build().catch(err => { console.error('Build failed:', err.message); process.exit(1); });
