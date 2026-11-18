// ═══════════════════════════════════════════════════════
// AgentTip.ai — Reputation Layer for AI Agents
// All data from on-chain — zero mock/fake data
// ═══════════════════════════════════════════════════════

const CONFIG = {
  chainId: '0x38',
  chainName: 'BNB Smart Chain',
  rpcUrl: 'https://bsc-dataseed.binance.org/',
  explorer: 'https://bscscan.com',
  currency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  agentIdAddress: '0x60b9262456de011f7d15a54cdd8c48baaa8b022f',
  contractAddress: '0xaAFffe2b1126A74708AC4C4382e86832b8E00D4A',
  spaceIdResolve: 'https://api.prd.space.id/v1/getAddress',
};

const AGENT_ID_ABI = ['function balanceOf(address owner) view returns (uint256)'];
const TIP_ABI = [
  'function tip(address _receiver, string _message) payable',
  'function getStats() view returns (uint256, uint256, uint256, uint256)',
  'function getRecentTips(uint256 _count) view returns (tuple(address sender, address receiver, uint256 amount, string message, uint256 timestamp)[])',
  'function hasAgentID(address _addr) view returns (bool)',
];

// ── Featured agents for discovery (no fake stats) ──────
const FEATURED_AGENTS = [
  { name: 'CryptoSage',   id: 'cryptosage.ai',   domain: 'Trading Analysis',    emoji: 'CS' },
  { name: 'DeFi Oracle',  id: 'defioracle.ai',    domain: 'DeFi Strategy',       emoji: 'DO' },
  { name: 'Chain Scout',  id: 'chainscout.ai',    domain: 'On-chain Intel',      emoji: 'CH' },
  { name: 'Alpha Bot',    id: 'alphabot.ai',      domain: 'Signal Provider',     emoji: 'AB' },
  { name: 'NFT Curator',  id: 'nftcurator.ai',    domain: 'NFT Research',        emoji: 'NC' },
  { name: 'Yield Farmer', id: 'yieldfarmer.ai',   domain: 'Yield Optimization',  emoji: 'YF' },
  { name: 'Gas Tracker',  id: 'gastracker.ai',    domain: 'Network Analytics',   emoji: 'GT' },
  { name: 'News Agent',   id: 'newsagent.ai',     domain: 'Crypto News',         emoji: 'NA' },
];

// ── State ───────────────────────────────────────────────
let provider = null;
let signer = null;
let userAddress = null;
let tipContract = null;
let resolvedAddress = null;
let currentView = 'universe';
let onChainTips = [];       // Real tips from contract
let discoveredAgents = [];  // Agents found from on-chain data

// ── DOM ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupTipFlow();
  initConstellation();
  setup3DCards();
  renderAgentGrid();
  renderStream();
  loadPublicData();
  setupPassportModal();

  if (window.ethereum?.selectedAddress) handleConnect();
});

// ═══ Constellation Canvas ══════════════════════════════
function initConstellation() {
  const canvas = $('constellation');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const particles = [];
  const COUNT = 60;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(240,185,11,${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240,185,11,${0.3 + p.r * 0.2})`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    }

    requestAnimationFrame(draw);
  }
  draw();
}

// ═══ 3D Card Tilt ══════════════════════════════════════
function setup3DCards() {
  document.addEventListener('mousemove', e => {
    document.querySelectorAll('.agent-card').forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        card.style.transform = '';
        return;
      }
      const rotX = ((y / rect.height) - 0.5) * -8;
      const rotY = ((x / rect.width) - 0.5) * 8;
      card.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
    });
  });
  document.addEventListener('mouseleave', () => {
    document.querySelectorAll('.agent-card').forEach(c => c.style.transform = '');
  }, true);
}

// ═══ Navigation ═════════════════════════════════════════
function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });
  $('connectBtn').addEventListener('click', handleConnect);
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const viewMap = { universe: 'viewUniverse', tip: 'viewTip', stream: 'viewStream' };
  $(viewMap[view])?.classList.add('active');
}

// ═══ Agent Universe (from on-chain data) ════════════════
function renderAgentGrid() {
  const grid = $('agentGrid');

  // If we have on-chain discovered agents, show those
  // Otherwise show featured agents as discovery list (no fake stats)
  const agents = discoveredAgents.length > 0 ? discoveredAgents : FEATURED_AGENTS;
  const isDiscovered = discoveredAgents.length > 0;

  if (agents.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="empty-icon">🌌</span>
        <div class="empty-title">The Universe Awaits</div>
        <p>No agents discovered yet. Be the first to tip an agent and put them on the map!</p>
        <a class="empty-cta" href="#" onclick="switchView('tip');return false;">
          Send First Tip →
        </a>
      </div>`;
    return;
  }

  grid.innerHTML = `
    <div class="section-label" style="grid-column:1/-1">
      <span class="dot"></span>
      ${isDiscovered ? 'Discovered from on-chain tips' : 'Featured Agents — tip them to build their reputation'}
    </div>
  ` + agents.map((a, i) => `
    <div class="agent-card" data-idx="${i}">
      <div class="agent-card-top">
        <div class="agent-avatar">${a.emoji || a.name[0].toUpperCase()}</div>
        <div class="agent-info">
          <div class="agent-name">${esc(a.name)}</div>
          <div class="agent-id-label">${esc(a.id)}</div>
        </div>
      </div>
      <div class="agent-domain">${esc(a.domain || 'AI Agent')}</div>
      ${a.tips !== undefined ? `
        <div class="agent-card-stats">
          <div class="acs"><span class="acs-val">${a.tips}</span><span class="acs-label">Tips</span></div>
          <div class="acs"><span class="acs-val">${a.volume || '0'}</span><span class="acs-label">BNB</span></div>
          <div class="acs"><span class="acs-val">${a.supporters || '0'}</span><span class="acs-label">Fans</span></div>
        </div>
      ` : ''}
    </div>
  `).join('');

  grid.querySelectorAll('.agent-card').forEach(card => {
    card.addEventListener('click', () => openPassport(agents[card.dataset.idx]));
  });
}

// ═══ Agent Passport ═════════════════════════════════════
function setupPassportModal() {
  $('modalClose').addEventListener('click', closePassport);
  $('passportModal').addEventListener('click', e => {
    if (e.target === $('passportModal')) closePassport();
  });
  $('passportTipBtn').addEventListener('click', () => {
    const name = $('passportId')?.textContent;
    closePassport();
    switchView('tip');
    if (name) $('recipientInput').value = name;
  });
}

function openPassport(agent) {
  $('passportAvatar').textContent = agent.emoji || agent.name[0].toUpperCase();
  $('passportName').textContent = agent.name;
  $('passportId').textContent = agent.id;
  $('passportDomain').textContent = agent.domain || 'AI Agent';

  // Stats from on-chain data or zero
  const tips = agent.tips || 0;
  const volume = agent.volume || '0';
  const supporters = agent.supporters || 0;
  $('psTips').textContent = tips;
  $('psVolume').textContent = volume;
  $('psSupporters').textContent = supporters;

  // Reputation score (based on real tips)
  const score = Math.min(100, Math.round(tips * 2 + supporters * 3));
  $('repScore').textContent = score;
  setTimeout(() => $('repBarFill').style.width = score + '%', 100);

  // Real tips for this agent from on-chain data
  const agentAddr = agent.address?.toLowerCase();
  const relatedTips = agentAddr
    ? onChainTips.filter(t => t.receiver.toLowerCase() === agentAddr)
    : [];

  if (relatedTips.length > 0) {
    $('passportTips').innerHTML = relatedTips.slice(0, 5).map(t => `
      <div class="pt-item">
        <span class="pt-from">${short(t.sender)}</span>
        <span class="pt-msg">${t.message ? esc(t.message) : '—'}</span>
        <span class="pt-amount">${parseFloat(ethers.formatEther(t.amount)).toFixed(4)} BNB</span>
      </div>
    `).join('');
  } else {
    $('passportTips').innerHTML = `
      <div class="empty-state" style="padding:16px;font-size:13px;">
        No tips received yet. Be the first supporter!
      </div>`;
  }

  $('passportModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePassport() {
  $('passportModal').classList.remove('open');
  document.body.style.overflow = '';
  $('repBarFill').style.width = '0%';
}

// ═══ Tip Stream (from on-chain) ═════════════════════════
function renderStream() {
  const list = $('streamList');

  if (onChainTips.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📡</span>
        <div class="empty-title">No Tips Yet</div>
        <p>The stream is waiting for its first on-chain tip.<br>
        Connect your wallet and send a tip to light up the feed!</p>
        <a class="empty-cta" href="#" onclick="switchView('tip');return false;">
          Send First Tip →
        </a>
      </div>`;
    return;
  }

  list.innerHTML = onChainTips.map(t => {
    const amount = parseFloat(ethers.formatEther(t.amount)).toFixed(4);
    const timeAgo = getTimeAgo(Number(t.timestamp) * 1000);
    return `
      <div class="stream-item">
        <div class="stream-avatar">${t.sender.slice(2, 4).toUpperCase()}</div>
        <div class="stream-body">
          <div class="stream-action">${short(t.sender)} tipped <strong>${short(t.receiver)}</strong></div>
          ${t.message ? `<div class="stream-msg">"${esc(t.message)}"</div>` : ''}
        </div>
        <div class="stream-right">
          <div class="stream-amount">${amount} BNB</div>
          <div class="stream-time">${timeAgo}</div>
        </div>
      </div>`;
  }).join('');
}

// ═══ Tip Flow ═══════════════════════════════════════════
function setupTipFlow() {
  document.querySelectorAll('.amount-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      $('amountInput').value = chip.dataset.amount;
    });
  });

  $('messageInput')?.addEventListener('input', () => {
    $('charCount').textContent = $('messageInput').value.length;
  });

  $('recipientInput').addEventListener('blur', () => {
    const v = $('recipientInput').value.trim();
    if (v && !v.endsWith('.ai') && !v.startsWith('0x')) {
      $('recipientInput').value = v + '.ai';
    }
  });

  $('resolveBtn').addEventListener('click', handleResolve);
  $('tipBtn').addEventListener('click', handleTip);
}

function setTipStep(step) {
  document.querySelectorAll('.tip-step').forEach(s => {
    const n = parseInt(s.dataset.step);
    s.classList.toggle('active', n === step);
    s.classList.toggle('done', n < step);
  });
  $('tipStep1').classList.toggle('active', step <= 1);
  $('tipStep2').classList.toggle('active', step >= 2);
}

// ═══ Wallet Connection ══════════════════════════════════
async function handleConnect() {
  if (!window.ethereum) {
    toast('Please install MetaMask or Binance Wallet', 'error');
    return;
  }
  try {
    $('connectLabel').textContent = 'Connecting...';
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAddress = accounts[0];

    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== CONFIG.chainId) await switchToBSC();

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    tipContract = new ethers.Contract(CONFIG.contractAddress, TIP_ABI, signer);

    $('connectLabel').textContent = short(userAddress);
    $('connectBtn').classList.add('connected');

    await checkAgentID(userAddress);
    updateTipButton();

    window.ethereum.on('accountsChanged', accs => {
      if (accs.length === 0) disconnectUI();
      else {
        userAddress = accs[0];
        $('connectLabel').textContent = short(userAddress);
        checkAgentID(userAddress);
      }
    });
    window.ethereum.on('chainChanged', () => window.location.reload());
  } catch (err) {
    console.error('Connect:', err);
    toast('Failed to connect', 'error');
    $('connectLabel').textContent = 'Connect Wallet';
  }
}

async function switchToBSC() {
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CONFIG.chainId }] });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: CONFIG.chainId, chainName: CONFIG.chainName, nativeCurrency: CONFIG.currency, rpcUrls: [CONFIG.rpcUrl], blockExplorerUrls: [CONFIG.explorer] }]
      });
    } else throw err;
  }
}

function disconnectUI() {
  userAddress = null; signer = null; tipContract = null;
  $('connectLabel').textContent = 'Connect Wallet';
  $('connectBtn').classList.remove('connected');
  $('senderStatus').style.display = 'none';
  updateTipButton();
}

// ═══ Agent ID Check ═════════════════════════════════════
async function checkAgentID(address) {
  $('senderStatus').style.display = 'block';
  try {
    const rp = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const ac = new ethers.Contract(CONFIG.agentIdAddress, AGENT_ID_ABI, rp);
    const bal = await ac.balanceOf(address);
    if (bal > 0n) {
      $('agentBadge').className = 'agent-badge has-id';
      $('agentBadge').innerHTML = '&#10003; Agent ID verified';
    } else {
      $('agentBadge').className = 'agent-badge no-id';
      $('agentBadge').innerHTML = '&#10007; No Agent ID — <a href="https://id.binance.com" target="_blank" style="color:var(--gold)">Claim one</a>';
    }
  } catch (err) {
    console.error('AgentID check:', err);
    $('agentBadge').className = 'agent-badge no-id';
    $('agentBadge').textContent = 'Could not verify';
  }
}

// ═══ SPACE ID Resolution ════════════════════════════════
async function handleResolve() {
  const name = $('recipientInput').value.trim();
  if (!name) { showResolve('Enter an Agent ID name', 'error'); return; }

  resolvedAddress = null;
  showResolve('Resolving...', '');
  $('resolveBtn').disabled = true;

  try {
    const addr = await resolveAgentName(name);
    if (addr && addr !== ethers.ZeroAddress) {
      resolvedAddress = addr;
      showResolve(`&#10003; ${esc(name)} → <span class="addr">${short(addr)}</span>`, 'success');

      // Show resolved agent + move to step 2
      $('resolvedAvatar').textContent = name[0].toUpperCase();
      $('resolvedName').textContent = name;
      $('resolvedAddr').textContent = short(addr);
      $('resolvedAgent').style.display = 'flex';

      setTipStep(2);
      updateTipButton();
    } else {
      showResolve(`"${esc(name)}" not found — check the name or paste an address`, 'error');
    }
  } catch (err) {
    console.error('Resolve:', err);
    showResolve('Resolution failed — try again', 'error');
  } finally {
    $('resolveBtn').disabled = false;
  }
}

function showResolve(html, cls) {
  const el = $('resolveResult');
  el.innerHTML = html;
  el.className = `resolve-result ${cls}`;
}

async function resolveAgentName(name) {
  const domain = name.endsWith('.ai') ? name : name + '.ai';

  // Tier 1: SPACE ID REST v1
  try {
    const url = `${CONFIG.spaceIdResolve}?tld=ai&domain=${encodeURIComponent(domain)}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      if (data.code === 0 && data.address) return data.address;
    }
  } catch (_) {}

  // Tier 2: SPACE ID REST v2
  try {
    const url = `https://api.prd.space.id/v2/resolve/name?name=${encodeURIComponent(domain)}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      if (data.data?.resolvedAddress || data.data?.address) return data.data.resolvedAddress || data.data.address;
    }
  } catch (_) {}

  // Tier 3: On-chain resolver
  try {
    const rp = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const RESOLVER_ABI = ['function addr(bytes32 node) view returns (address)'];
    const resolver = new ethers.Contract('0x2D64eb25B05168f3cDB199c8e7392543D3e6B01f', RESOLVER_ABI, rp);
    const addr = await resolver.addr(ethers.namehash(domain));
    if (addr && addr !== ethers.ZeroAddress) return addr;
  } catch (_) {}

  return null;
}

// ═══ Tip Transaction ════════════════════════════════════
async function handleTip() {
  if (!signer || !resolvedAddress) return;

  const amount = $('amountInput').value.trim();
  if (!amount || parseFloat(amount) <= 0) { toast('Enter a valid amount', 'error'); return; }

  const message = $('messageInput').value.trim() || '';
  $('tipBtn').disabled = true;
  $('tipBtnText').textContent = 'Sending...';
  setTipStep(3);

  try {
    const value = ethers.parseEther(amount);
    const tx = await tipContract.tip(resolvedAddress, message, { value });
    $('tipBtnText').textContent = 'Confirming...';
    toast('Transaction submitted — waiting for confirmation...', 'success');
    await tx.wait();

    toast(`Tip sent! ${short(tx.hash)}`, 'success');
    // Reset form
    $('recipientInput').value = '';
    $('amountInput').value = '';
    $('messageInput').value = '';
    $('charCount').textContent = '0';
    resolvedAddress = null;
    $('resolvedAgent').style.display = 'none';
    $('resolveResult').textContent = '';
    document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('selected'));
    setTipStep(1);

    // Reload on-chain data
    loadPublicData();
  } catch (err) {
    console.error('Tip:', err);
    if (err.reason) toast(`Failed: ${err.reason}`, 'error');
    else if (err.code === 'ACTION_REJECTED') toast('Rejected by user', 'error');
    else toast('Transaction failed', 'error');
  } finally {
    updateTipButton();
  }
}

// ═══ Public Data (all from on-chain) ════════════════════
async function loadPublicData() {
  try {
    const rp = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const contract = new ethers.Contract(CONFIG.contractAddress, TIP_ABI, rp);

    // Load stats
    const [tips, volume, tippers, receivers] = await contract.getStats();
    const totalTips = Number(tips);
    const totalVolume = parseFloat(ethers.formatEther(volume));
    const totalAgents = Number(tippers) + Number(receivers);

    animateNumber('statTips', totalTips);
    animateNumber('statVolume', totalVolume);
    animateNumber('statAgents', totalAgents);

    // Load recent tips
    const count = Math.min(totalTips, 50);
    if (count > 0) {
      const recentTips = await contract.getRecentTips(count);
      onChainTips = [...recentTips].reverse(); // newest first

      // Build discovered agents from tip data
      buildDiscoveredAgents(onChainTips);
    } else {
      onChainTips = [];
      discoveredAgents = [];
    }

    // Re-render views with real data
    renderStream();
    renderAgentGrid();

  } catch (err) {
    console.error('Load public data:', err);
    // Show dashes for stats on error
    $('statTips').textContent = '—';
    $('statVolume').textContent = '—';
    $('statAgents').textContent = '—';
    renderStream();
    renderAgentGrid();
  }
}

// Build agent list from on-chain tip data
function buildDiscoveredAgents(tips) {
  const agentMap = {};

  for (const t of tips) {
    const addr = t.receiver.toLowerCase();
    if (!agentMap[addr]) {
      agentMap[addr] = {
        address: t.receiver,
        name: short(t.receiver),
        id: short(t.receiver),
        domain: 'AI Agent',
        emoji: t.receiver.slice(2, 4).toUpperCase(),
        tips: 0,
        totalAmount: 0n,
        supporters: new Set(),
      };
    }
    agentMap[addr].tips++;
    agentMap[addr].totalAmount += t.amount;
    agentMap[addr].supporters.add(t.sender.toLowerCase());
  }

  discoveredAgents = Object.values(agentMap)
    .map(a => ({
      ...a,
      volume: parseFloat(ethers.formatEther(a.totalAmount)).toFixed(4),
      supporters: a.supporters.size,
    }))
    .sort((a, b) => b.tips - a.tips);
}

function animateNumber(id, target) {
  const el = $(id);
  if (target === 0) { el.textContent = '0'; return; }

  const isFloat = target % 1 !== 0;
  let current = 0;
  const step = target / 25;
  const interval = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(interval); }
    el.textContent = isFloat ? current.toFixed(2) : Math.round(current);
  }, 30);
}

// ═══ UI Helpers ═════════════════════════════════════════
function updateTipButton() {
  if (!userAddress) {
    $('tipBtn').disabled = true;
    $('tipBtnText').textContent = 'Connect wallet to start';
  } else if (!resolvedAddress) {
    $('tipBtn').disabled = true;
    $('tipBtnText').textContent = 'Resolve a recipient first';
  } else {
    $('tipBtn').disabled = false;
    $('tipBtnText').textContent = 'Send Tip';
  }
}

function short(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function toast(msg, type = '') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  setTimeout(() => el.classList.remove('show'), 4000);
}
