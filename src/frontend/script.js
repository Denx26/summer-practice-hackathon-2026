const API = 'http://127.0.0.1:8001';
let currentUser = null;

function showToast(msg, color = '#00ff6a') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.style.borderColor = color;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

const selectedSports = new Set();
document.querySelectorAll('.sport-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const s = chip.dataset.sport;
        if (selectedSports.has(s)) { selectedSports.delete(s); chip.classList.remove('selected'); }
        else { selectedSports.add(s); chip.classList.add('selected'); }
    });
});

let bioTimer;
document.getElementById('reg-desc').addEventListener('input', (e) => {
    clearTimeout(bioTimer);
    const val = e.target.value.trim();
    if (val.length < 15) return;
    
    bioTimer = setTimeout(async () => {
        document.getElementById('ai-scanning').style.display = 'flex';
        try {
            const res = await fetch(`${API}/ai/extract-sports?description=${encodeURIComponent(val)}`, { method: 'POST' });
            const data = await res.json();
            if (data.sports && data.sports !== 'none') {
                const found = data.sports.split(',').map(s => s.trim().toLowerCase());
                document.querySelectorAll('.sport-chip').forEach(chip => {
                    const s = chip.dataset.sport;
                    if (found.some(f => f.includes(s) || s.includes(f))) {
                        chip.classList.add('selected'); selectedSports.add(s);
                    }
                });
                showToast(`🤖 AI added: ${data.sports}`);
            }
        } catch (e) {}
        document.getElementById('ai-scanning').style.display = 'none';
    }, 1000);
});

document.getElementById('btn-register').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value.trim();
    const desc = document.getElementById('reg-desc').value.trim();
    if (!name || selectedSports.size === 0) return showToast('❌ Name and 1 Sport required!', '#ff4444');

    const btn = document.getElementById('btn-register');
    btn.disabled = true; btn.textContent = 'CREATING...';

    try {
        const res = await fetch(`${API}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: desc || 'Ready to play', sports: Array.from(selectedSports), skill_level: "intermediate", available: 1 })
        });
        const data = await res.json();
        currentUser = { id: data.id, name, desc };
        localStorage.setItem('showup_user', JSON.stringify(currentUser));
        enterDashboard();
    } catch (e) {
        showToast('❌ Backend Offline!', '#ff4444');
    } finally { btn.disabled = false; btn.textContent = 'START MATCHING NOW →'; }
});

function enterDashboard() {
    document.getElementById('nav-username').textContent = '👤 ' + currentUser.name;
    showPage('page-dashboard');
}

document.getElementById('btn-yes').addEventListener('click', () => updateAvail(true));
document.getElementById('btn-no').addEventListener('click', () => updateAvail(false));

async function updateAvail(val) {
    const box = document.getElementById('avail-status-box');
    const btns = document.getElementById('showup-btns');
    if (currentUser?.id) await fetch(`${API}/availability/${currentUser.id}?available=${val ? 1 : 0}`, { method: 'POST' });
    box.textContent = val ? "✅ You're available today!" : "😴 Not today.";
    box.className = 'avail-status ' + (val ? 'active' : 'inactive');
    box.style.display = 'block'; btns.style.display = 'none';
}

document.getElementById('btn-search').addEventListener('click', doSearch);

async function doSearch() {
    const sport = document.getElementById('sport-search').value.trim().toLowerCase();
    if (!sport) return;
    const container = document.getElementById('match-results');
    
    try {
        const res = await fetch(`${API}/match/${sport}`, { method: 'POST' });
        const players = await res.json();
        if (!players.length) { container.innerHTML = `<p class="empty-state">No players found.</p>`; return; }

        container.innerHTML = players.map(p => `
            <div class="player-card">
              <div class="player-info">
                <div class="player-name">${p.name} <span class="event-badge">AVAILABLE</span></div>
                <div class="player-sports">${p.sports}</div>
                <button onclick="checkCompat('${p.name}', 'Player ready for ${p.sports}', this)" class="btn-green" style="font-size:0.7rem; padding:0.5rem; margin-top:0.5rem;">AI PREDICT MATCH</button>
                <div class="compat-text" style="color:var(--green); font-size:0.75rem; margin-top:0.5rem;"></div>
              </div>
            </div>
        `).join('');
    } catch (e) { container.innerHTML = `<p class="empty-state" style="color:red">Backend Error</p>`; }
}

async function checkCompat(targetName, targetDesc, btn) {
    const infoDiv = btn.nextElementSibling;
    btn.textContent = "ANALYZING...";
    try {
        const res = await fetch(`${API}/ai/compatibility`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, target_name: targetName, target_desc: targetDesc })
        });
        const data = await res.json();
        infoDiv.textContent = data.analysis;
        btn.style.display = 'none'; 
    } catch (e) { infoDiv.textContent = "Error calculating."; }
}

document.getElementById('chat-fab').addEventListener('click', () => document.getElementById('chat-panel').classList.toggle('open'));
document.getElementById('chat-close').addEventListener('click', () => document.getElementById('chat-panel').classList.remove('open'));
document.getElementById('chat-send').addEventListener('click', sendChat);

async function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    const msgs = document.getElementById('chat-messages');
    msgs.innerHTML += `<div class="msg user">${msg}</div>`;
    
    const res = await fetch(`${API}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    msgs.innerHTML += `<div class="msg ai">${data.reply}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
}

// On Load
window.addEventListener('load', () => {
    const saved = localStorage.getItem('showup_user');
    if (saved) { currentUser = JSON.parse(saved); enterDashboard(); }
});
document.getElementById('btn-logout').addEventListener('click', () => { localStorage.clear(); location.reload(); });