/* =============================================
   BUDGET TECH FINDS — MAIN JAVASCRIPT
   ============================================= */

const AFFILIATE_ID = 'budgettec0710-21';
const BLOG_URL = 'https://budgettechfindsguide.blogspot.com/';

// Auto-detect environment: use Render backend in production, localhost in dev
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const RENDER_BACKEND = 'https://budget-tech-api.onrender.com'; // ← Render.com backend
const API_BASE = IS_LOCAL ? '/api' : `${RENDER_BACKEND}/api`;

// ===== NAVBAR SCROLL EFFECT =====
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ===== FILL EXAMPLE CHIPS =====
function fillExample(laptop1Name, laptop2Name) {
  document.getElementById('laptop1-input').value = laptop1Name;
  document.getElementById('laptop2-input').value = laptop2Name;
  document.getElementById('laptop1-input').focus();
}

// ===== ENTER KEY SUPPORT =====
document.addEventListener('DOMContentLoaded', () => {
  ['laptop1-input', 'laptop2-input'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startComparison();
    });
  });
});

// ===== BUILD AMAZON AFFILIATE URL =====
function buildAmazonURL(searchQuery) {
  const encoded = encodeURIComponent(searchQuery.trim());
  return `https://www.amazon.in/s?k=${encoded}&tag=${AFFILIATE_ID}`;
}

// ===== SET LOADING STATE =====
function setLoading(isLoading) {
  const btn = document.getElementById('compare-btn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');

  if (isLoading) {
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    btn.disabled = true;
  } else {
    btnText.style.display = 'flex';
    btnLoading.style.display = 'none';
    btn.disabled = false;
  }
}

// ===== SHOW ERROR =====
function showError(message) {
  const errorEl = document.getElementById('error-message');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 8000);
}

function hideError() {
  document.getElementById('error-message').style.display = 'none';
}

// ===== RESET COMPARISON =====
function resetComparison() {
  document.getElementById('results-section').style.display = 'none';
  document.getElementById('laptop1-input').value = '';
  document.getElementById('laptop2-input').value = '';
  document.getElementById('compare-form-card').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => document.getElementById('laptop1-input').focus(), 600);
}

// ===== ANIMATE SCORE RING =====
function animateScoreRing(fillId, scoreValue) {
  const scoreNum = parseFloat(scoreValue) || 0;
  const clampedScore = Math.min(Math.max(scoreNum, 0), 10);
  const circumference = 2 * Math.PI * 40; // r=40
  const percentage = clampedScore / 10;
  const dashOffset = circumference * (1 - percentage);

  const fillEl = document.getElementById(fillId);
  if (fillEl) {
    setTimeout(() => {
      fillEl.style.strokeDashoffset = dashOffset.toString();
    }, 300);
  }
}

// ===== BUILD SPEC ITEMS =====
function buildSpecItems(laptop, cardEl) {
  const specsConfig = [
    { key: 'processor', label: 'Processor', scoreKey: 'processorScore' },
    { key: 'ram', label: 'RAM', scoreKey: 'ramScore' },
    { key: 'storage', label: 'Storage', scoreKey: 'storageScore' },
    { key: 'display', label: 'Display', scoreKey: 'displayScore' },
    { key: 'graphics', label: 'Graphics', scoreKey: 'graphicsScore' },
    { key: 'battery', label: 'Battery', scoreKey: 'batteryScore' },
    { key: 'weight', label: 'Weight', scoreKey: 'weightScore' },
    { key: 'buildQuality', label: 'Build Quality', scoreKey: 'buildScore' },
  ];

  const html = specsConfig.map(spec => {
    const score = parseFloat(laptop[spec.scoreKey]) || 0;
    const pct = Math.min(Math.max(score / 10 * 100, 0), 100);
    return `
      <div class="spec-item">
        <span class="spec-name">${spec.label}</span>
        <div class="spec-val-wrap">
          <span class="spec-value">${laptop[spec.key] || 'N/A'}</span>
          <div class="spec-score-bar-wrap">
            <div class="spec-score-bar">
              <div class="spec-score-fill" style="width: ${pct}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  cardEl.innerHTML = html;
}

// ===== BUILD SPEC TABLE =====
function buildSpecTable(laptop1, laptop2) {
  const specs = [
    { label: 'Processor', key: 'processor', scoreKey1: 'processorScore', scoreKey2: 'processorScore' },
    { label: 'RAM', key: 'ram', scoreKey1: 'ramScore', scoreKey2: 'ramScore' },
    { label: 'Storage', key: 'storage', scoreKey1: 'storageScore', scoreKey2: 'storageScore' },
    { label: 'Display', key: 'display', scoreKey1: 'displayScore', scoreKey2: 'displayScore' },
    { label: 'Graphics', key: 'graphics', scoreKey1: 'graphicsScore', scoreKey2: 'graphicsScore' },
    { label: 'Battery', key: 'battery', scoreKey1: 'batteryScore', scoreKey2: 'batteryScore' },
    { label: 'Weight', key: 'weight', scoreKey1: 'weightScore', scoreKey2: 'weightScore' },
    { label: 'Build Quality', key: 'buildQuality', scoreKey1: 'buildScore', scoreKey2: 'buildScore' },
    { label: 'Price Range', key: 'priceRange' },
    { label: 'Overall Score', key: 'overallScore' },
  ];

  const rows = specs.map(spec => {
    const val1 = laptop1[spec.key] || 'N/A';
    const val2 = laptop2[spec.key] || 'N/A';

    let class1 = 'td-val-1';
    let class2 = 'td-val-2';

    // Highlight winner per spec row (for scored specs)
    if (spec.scoreKey1) {
      const s1 = parseFloat(laptop1[spec.scoreKey1]) || 0;
      const s2 = parseFloat(laptop2[spec.scoreKey1]) || 0;
      if (s1 > s2) { class1 = 'td-winner-1'; }
      else if (s2 > s1) { class2 = 'td-winner-2'; }
    }

    return `
      <tr>
        <td class="td-spec-name">${spec.label}</td>
        <td class="${class1}">${val1}</td>
        <td class="${class2}">${val2}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('spec-table-body').innerHTML = rows;
}

// ===== POPULATE PROS CONS =====
function buildProsCons(items, listId, type) {
  const el = document.getElementById(listId);
  if (!el || !Array.isArray(items)) return;
  el.innerHTML = items.map(item => `<li>${item}</li>`).join('');
}

// ===== RENDER RESULTS =====
function renderResults(data) {
  const { laptop1, laptop2, verdict } = data.comparison;

  // === Laptop 1 Card ===
  document.getElementById('card1-brand').textContent = laptop1.brand || '';
  document.getElementById('card1-name').textContent = laptop1.name || 'Laptop 1';
  document.getElementById('card1-price').textContent = laptop1.priceRange || '';
  document.getElementById('score-val-1').textContent = laptop1.overallScore || '—';
  document.getElementById('card1-bestfor').textContent = laptop1.bestFor || '';
  buildSpecItems(laptop1, document.getElementById('card1-specs'));
  buildProsCons(laptop1.pros, 'card1-pros', 'pros');
  buildProsCons(laptop1.cons, 'card1-cons', 'cons');

  // Amazon Affiliate Link — Laptop 1
  const amazonURL1 = buildAmazonURL(laptop1.amazonSearchQuery || laptop1.name);
  document.getElementById('card1-amazon').href = amazonURL1;

  // === Laptop 2 Card ===
  document.getElementById('card2-brand').textContent = laptop2.brand || '';
  document.getElementById('card2-name').textContent = laptop2.name || 'Laptop 2';
  document.getElementById('card2-price').textContent = laptop2.priceRange || '';
  document.getElementById('score-val-2').textContent = laptop2.overallScore || '—';
  document.getElementById('card2-bestfor').textContent = laptop2.bestFor || '';
  buildSpecItems(laptop2, document.getElementById('card2-specs'));
  buildProsCons(laptop2.pros, 'card2-pros', 'pros');
  buildProsCons(laptop2.cons, 'card2-cons', 'cons');

  // Amazon Affiliate Link — Laptop 2
  const amazonURL2 = buildAmazonURL(laptop2.amazonSearchQuery || laptop2.name);
  document.getElementById('card2-amazon').href = amazonURL2;

  // === Verdict ===
  document.getElementById('verdict-winner').textContent =
    `Winner: ${verdict.winner || 'Tie'}`;
  document.getElementById('verdict-reason').textContent =
    verdict.winnerReason || '';

  // === Spec Table ===
  document.getElementById('table-laptop1-name').textContent = laptop1.name || 'Laptop 1';
  document.getElementById('table-laptop2-name').textContent = laptop2.name || 'Laptop 2';
  buildSpecTable(laptop1, laptop2);

  // === Recommendation ===
  document.getElementById('rec-text').textContent = verdict.recommendation || '';
  document.getElementById('value-badge').textContent = verdict.valueForMoney
    ? `💰 ${verdict.valueForMoney}`
    : '';
  document.getElementById('rec-summary-1').textContent = verdict.laptop1Summary || '';
  document.getElementById('rec-summary-2').textContent = verdict.laptop2Summary || '';

  // === Show Results ===
  const resultsSection = document.getElementById('results-section');
  resultsSection.style.display = 'block';

  // Animate Score Rings after a short delay
  setTimeout(() => {
    animateScoreRing('score-fill-1', laptop1.overallScore);
    animateScoreRing('score-fill-2', laptop2.overallScore);
  }, 400);

  // Scroll to results smoothly
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

// ===== MAIN COMPARISON FUNCTION =====
async function startComparison() {
  const laptop1 = document.getElementById('laptop1-input').value.trim();
  const laptop2 = document.getElementById('laptop2-input').value.trim();

  // Validation
  if (!laptop1) {
    showError('Please enter the name of the first laptop.');
    document.getElementById('laptop1-input').focus();
    return;
  }
  if (!laptop2) {
    showError('Please enter the name of the second laptop.');
    document.getElementById('laptop2-input').focus();
    return;
  }
  if (laptop1.toLowerCase() === laptop2.toLowerCase()) {
    showError('Please enter two different laptops to compare.');
    return;
  }

  hideError();
  setLoading(true);

  // Hide previous results
  document.getElementById('results-section').style.display = 'none';

  try {
    const response = await fetch(`${API_BASE}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ laptop1, laptop2 }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMsg = data.error || 'Failed to get comparison. Please try again.';
      const details = data.details ? ` (${data.details})` : '';
      showError(`${errorMsg}${details}`);
      setLoading(false);
      return;
    }

    renderResults(data);

  } catch (err) {
    console.error('Comparison error:', err);
    if (err.message && err.message.includes('fetch')) {
      showError('Cannot connect to server. Make sure the server is running on port 3000.');
    } else {
      showError('An unexpected error occurred. Please try again.');
    }
  } finally {
    setLoading(false);
  }
}

// ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
  const animatables = document.querySelectorAll('.step-card, .feature-card');
  animatables.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`;
    observer.observe(el);
  });
});
