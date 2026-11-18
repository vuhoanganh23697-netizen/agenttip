// ═══════════════════════════════════════════════════════
// AgentTip.ai — Reputation Layer for AI Agents
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

// ── Mock Data (demo before contract is deployed) ────────
const MOCK_AGENTS = [
  { name: 'CryptoSage', id: 'cryptosage.ai', domain: 'Trading Analysis', tips: 128, volume: '3.42', supporters: 45, emoji: 'CS', tier: 'gold' },
  { name: 'DeFi Oracle', id: 'defioracle.ai', domain: 'DeFi Strategy', tips: 96, volume: '2.18', supporters: 38, emoji: 'DO', tier: 'gold' },
  { name: 'Chain Scout', id: 'chainscout.ai', domain: 'On-chain Intel', tips: 74, volume: '1.65', supporters: 29, emoji: 'CH', tier: 'silver' },
  { name: 'Alpha Bot', id: 'alphabot.ai', domain: 'Signal Provider', tips: 61, volume: '1.20', supporters: 24, emoji: 'AB', tier: 'silver' },
  { name: 'NFT Curator', id: 'nftcurator.ai', domain: 'NFT Research', tips: 43, volume: '0.85', supporters: 18, emoji: 'NC', tier: 'bronze' },
  { name: 'Yield Farmer', id: 'yieldfarmer.ai', domain: 'Yield Optimization', tips: 37, volume: '0.72', supporters: 15, emoji: 'YF', tier: 'bronze' },
  { name: 'Gas Tracker', id: 'gastracker.ai', domain: 'Network Analytics', tips: 29, volume: '0.55', supporters: 12, emoji: 'GT', tier: 'bronze' },
  { name: 'News Agent', id: 'newsagent.ai', domain: 'Crypto News', tips: 22, volume: '0.38', supporters: 10, emoji: 'NA', tier: 'bronze' },
];

const MOCK_STREAM = [
  { from: '0xA1b2...3c4d', to: 'cryptosage.ai', amount: '0.05', msg: 'Great BTC analysis today!', time: '2m ago' },
  { from: '0xB2c3...4d5e', to: 'defioracle.ai', amount: '0.02', msg: 'The yield strategy worked perfectly', time: '8m ago' },
  { from: '0xC3d4...5e6f', to: 'chainscout.ai', amount: '0.01', msg: 'Found the whale wallet, nice!', time: '15m ago' },
  { from: '0xD4e5...6f7g', to: 'alphabot.ai', amount: '0.005', msg: 'Signal on point', time: '22m ago' },
  { from: '0xE5f6...7g8h', to: 'cryptosage.ai', amount: '0.1', msg: 'Best TA agent in the space', time: '45m ago' },
  { from: '0xF6g7...8h9i', to: 'nftcurator.ai', amount: '0.01', msg: '', time: '1h ago' },
  { from: '0xA7b8...9c0d', to: 'yieldfarmer.ai', amount: '0.008', msg: 'Saved me gas fees, thanks', time: '2h ago' },
];

// ── State ───────────────────────────────────────────────
let provider = null;
let signer = null;
let userAddress = null;
let tipContract = null;
let resolvedAddress = null;
let currentView = 'universe';

// ── DOM ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupTipFlow();
  renderAgentGrid();
  renderStream();
  loadPublicData();
  setupPassportModal();

  if (window.ethereum?.selectedAddress) handleConnect();
});

// ═══ Navigation ═════════════════════════════════════════
function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      switchView(view);
    });
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

// ═══ Agent Universe ═════════════════════════════════════
function renderAgentGrid() {
  const grid = $('agentGrid');
  grid.innerHTML = MOCK_AGENTS.map((a, i) => `
    <div class="agent-card" data-idx="${i}">
      <div class="agent-card-top">
        <div class="agent-avatar tier-${a.tier}">${a.emoji}</div>
        <div class="agent-info">
          <div class="agent-name">${a.name}</div>
          <div class="agent-id-label">${a.id}</div>
        </div>
      </div>
      <div class="agent-domain">${a.domain}</div>
      <div class="agent-card-stats">
        <div class="acs"><span class="acs-val">${a.tips}</span><span class="acs-label">Tips</span></div>
        <div class="acs"><span class="acs-val">${a.volume}</span><span class="acs-label">BNB</span></div>
        <div class="acs"><span class="acs-val">${a.supporters}</span><span class="acs-label">Fans</span></div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.agent-card').forEach(card => {
    card.addEventListener('click', () => openPassport(MOCK_AGENTS[card.dataset.idx]));
  });
}

// ═══ Agent Passport ═════════════════════════════════════
function setupPassportModal() {
  $('modalClose').addEventListener('click', closePassport);
  $('passportModal').addEventListener('click', e => {
    if (e.target === $('passportModal')) closePassport();
  });
  $('passportTipBtn').addEventListener('click', () => {
    closePassport();
    switchView('tip');
  });
}

function openPassport(agent) {
  $('passportAvatar').textContent = agent.emoji;
  $('passportName').textContent = agent.name;
  $('passportId').textContent = agent.id;
  $('passportDomain').textContent = agent.domain;
  $('psTips').textContent = agent.tips;
  $('psVolume').textContent = agent.volume;
  $('psSupporters').textContent = agent.supporters;

  // Reputation score (mock based on tips)
  const score = Math.min(100, Math.round(agent.tips * 0.6 + agent.supporters * 0.8));
  $('repScore').textContent = score;
  setTimeout(() => $('repBarFill').style.width = score + '%', 100);

  // Recent tips for this agent
  const tips = MOCK_STREAM.filter(s => s.to === agent.id);
  $('passportTips').innerHTML = tips.length > 0 ? tips.map(t => `
    <div class="pt-item">
      <span class="pt-from">${t.from}</span>
      <span class="pt-msg">${t.msg || '—'}</span>
      <span class="pt-amount">${t.amount} BNB</span>
    </div>
  `).join('') : '<div class="empty-state">No tips yet</div>';

  $('passportModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePassport() {
  $('passportModal').classList.remove('open');
  document.body.style.overflow = '';
  $('repBarFill').style.width = '0%';
}

// ═══ Tip Stream ═════════════════════════════════════════
function renderStream() {
  const list = $('streamList');
  list.innerHTML = MOCK_STREAM.map(s => `
    <div class="stream-item">
      <div class="stream-avatar">${s.from.slice(2, 4)}</div>
      <div class="stream-body">
        <div class="stream-action">${s.from} tipped <strong>${s.to}</strong></div>
        ${s.msg ? `<div class="stream-msg">"${esc(s.msg)}"</div>` : ''}
      </div>
      <div class="stream-right">
        <div class="stream-amount">${s.amount} BNB</div>
        <div class="stream-time">${s.time}</div>
      </div>
    </div>
  `).join('');
}

// ═══ Tip Flow ═══════════════════════════════════════════
function setupTipFlow() {
  // Amount chips
  document.querySelectorAll('.amount-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      $('amountInput').value = chip.dataset.amount;
    });
  });

  // Message char count
  $('messageInput')?.addEventListener('input', () => {
    $('charCount').textContent = $('messageInput').value.length;
  });

  // Auto .ai
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
    $('connectBtn').innerHTML = '<span class="btn-dot"></span> Connecting...';
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAddress = accounts[0];

    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== CONFIG.chainId) await switchToBSC();

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    if (CONFIG.contractAddress !== 'DEPLOY_ME') {
      tipContract = new ethers.Contract(CONFIG.contractAddress, TIP_ABI, signer);
    }

    $('connectBtn').innerHTML = `<span class="btn-dot"></span> ${short(userAddress)}`;
    $('connectBtn').classList.add('connected');

    await checkAgentID(userAddress);
    updateTipButton();

    window.ethereum.on('accountsChanged', accs => {
      if (accs.length === 0) disconnectUI();
      else { userAddress = accs[0]; $('connectBtn').innerHTML = `<span class="btn-dot"></span> ${short(userAddress)}`; checkAgentID(userAddress); }
    });
    window.ethereum.on('chainChanged', () => window.location.reload());
  } catch (err) {
    console.error('Connect:', err);
    toast('Failed to connect', 'error');
    $('connectBtn').innerHTML = '<span class="btn-dot"></span> Connect Wallet';
  }
}

async function switchToBSC() {
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CONFIG.chainId }] });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: CONFIG.chainId, chainName: CONFIG.chainName, nativeCurrency: CONFIG.currency, rpcUrls: [CONFIG.rpcUrl], blockExplorerUrls: [CONFIG.explorer] }] });
    } else throw err;
  }
}

function disconnectUI() {
  userAddress = null; signer = null; tipContract = null;
  $('connectBtn').innerHTML = '<span class="btn-dot"></span> Connect Wallet';
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
      showResolve(`&#10003; ${name} → <span class="addr">${short(addr)}</span>`, 'success');

      // Show resolved agent + move to step 2
      const mockAgent = MOCK_AGENTS.find(a => a.id === name);
      $('resolvedAvatar').textContent = mockAgent ? mockAgent.emoji : name[0].toUpperCase();
      $('resolvedName').textContent = mockAgent ? mockAgent.name : name;
      $('resolvedAddr').textContent = short(addr);
      $('resolvedAgent').style.display = 'flex';

      setTipStep(2);
      updateTipButton();
    } else {
      showResolve(`"${name}" not found`, 'error');
    }
  } catch (err) {
    console.error('Resolve:', err);
    showResolve('Resolution failed', 'error');
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

  try {
    const url = `${CONFIG.spaceIdResolve}?tld=ai&domain=${encodeURIComponent(domain)}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      if (data.code === 0 && data.address) return data.address;
    }
  } catch (_) {}

  try {
    const url = `https://api.prd.space.id/v2/resolve/name?name=${encodeURIComponent(domain)}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      if (data.data?.resolvedAddress || data.data?.address) return data.data.resolvedAddress || data.data.address;
    }
  } catch (_) {}

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
  if (CONFIG.contractAddress === 'DEPLOY_ME') { toast('Contract not deployed yet', 'error'); return; }

  const message = $('messageInput').value.trim() || '';
  $('tipBtn').disabled = true;
  $('tipBtnText').textContent = 'Sending...';
  setTipStep(3);

  try {
    const value = ethers.parseEther(amount);
    const tx = await tipContract.tip(resolvedAddress, message, { value });
    $('tipBtnText').textContent = 'Confirming...';
    toast('Transaction submitted...', 'success');
    await tx.wait();

    toast(`Tip sent! ${short(tx.hash)}`, 'success');
    $('recipientInput').value = '';
    $('amountInput').value = '';
    $('messageInput').value = '';
    $('charCount').textContent = '0';
    resolvedAddress = null;
    $('resolvedAgent').style.display = 'none';
    $('resolveResult').textContent = '';
    document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('selected'));
    setTipStep(1);
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

// ═══ Public Data ════════════════════════════════════════
async function loadPublicData() {
  if (CONFIG.contractAddress === 'DEPLOY_ME') {
    // Show mock stats
    animateNumber('statTips', 490);
    animateNumber('statVolume', 12.8);
    animateNumber('statAgents', 191);
    return;
  }
  try {
    const rp = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const contract = new ethers.Contract(CONFIG.contractAddress, TIP_ABI, rp);
    const [tips, volume, tippers, receivers] = await contract.getStats();
    $('statTips').textContent = tips.toString();
    $('statVolume').textContent = parseFloat(ethers.formatEther(volume)).toFixed(2);
    $('statAgents').textContent = (Number(tippers) + Number(receivers)).toString();
  } catch (err) {
    console.error('Stats:', err);
  }
}

function animateNumber(id, target) {
  const el = $(id);
  const isFloat = target % 1 !== 0;
  let current = 0;
  const step = target / 30;
  const interval = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(interval); }
    el.textContent = isFloat ? current.toFixed(1) : Math.round(current);
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
  } else if (CONFIG.contractAddress === 'DEPLOY_ME') {
    $('tipBtn').disabled = true;
    $('tipBtnText').textContent = 'Contract not deployed';
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

function toast(msg, type = '') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  setTimeout(() => el.classList.remove('show'), 4000);
}
