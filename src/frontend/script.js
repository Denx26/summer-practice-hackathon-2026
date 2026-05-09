const API = 'http://127.0.0.1:8001';

let currentUser = null;

function showToast(msg, color = '#22c55e') {
    const t = document.getElementById('toast');

    if (!t) {
        alert(msg);
        return;
    }

    t.textContent = msg;
    t.style.borderColor = color;
    t.style.color = color;

    t.classList.add('show');

    setTimeout(() => {
        t.classList.remove('show');
    }, 3000);
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    document.getElementById(id).classList.add('active');
}

const selectedSports = new Set();

document.querySelectorAll('.sport-chip').forEach(chip => {
    chip.addEventListener('click', () => {

        const sport = chip.dataset.sport;

        if (selectedSports.has(sport)) {
            selectedSports.delete(sport);
            chip.classList.remove('selected');
        } else {
            selectedSports.add(sport);
            chip.classList.add('selected');
        }
    });
});

let bioTimer;

document.getElementById('reg-desc').addEventListener('input', (e) => {

    clearTimeout(bioTimer);

    const val = e.target.value.trim();

    if (val.length < 15) return;

    bioTimer = setTimeout(async () => {

        const scanning = document.getElementById('ai-scanning');

        if (scanning) scanning.style.display = 'flex';

        try {

            const res = await fetch(
                `${API}/ai/extract-sports?description=${encodeURIComponent(val)}`,
                { method: 'POST' }
            );

            const data = await res.json();

            if (data.sports && data.sports !== 'none') {

                const found = data.sports
                    .split(',')
                    .map(s => s.trim().toLowerCase());

                document.querySelectorAll('.sport-chip').forEach(chip => {

                    const s = chip.dataset.sport;

                    if (found.some(f => f.includes(s) || s.includes(f))) {
                        chip.classList.add('selected');
                        selectedSports.add(s);
                    }
                });

                showToast(`🤖 AI detected: ${data.sports}`);
            }

        } catch (e) {
            console.log(e);
        }

        if (scanning) scanning.style.display = 'none';

    }, 1200);
});

document.getElementById('btn-register').addEventListener('click', async () => {

    const name = document.getElementById('reg-name').value.trim();

    const desc = document.getElementById('reg-desc').value.trim();

    if (!name) {
        return showToast('❌ Please enter your name', '#ff4444');
    }

    if (selectedSports.size === 0) {
        return showToast('❌ Select at least one sport', '#ff4444');
    }

    const btn = document.getElementById('btn-register');

    btn.disabled = true;

    btn.textContent = 'CREATING...';

    try {

        const res = await fetch(`${API}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                description: desc || 'Ready to play',
                sports: Array.from(selectedSports),
                skill_level: 'intermediate',
                available: 1
            })
        });

        const data = await res.json();

        currentUser = {
            id: data.id,
            name: name
        };

        localStorage.setItem(
            'showup_user',
            JSON.stringify(currentUser)
        );

        enterDashboard();

        showToast('🎉 Profile created successfully!');

    } catch (e) {

        console.log(e);

        showToast('❌ Backend offline!', '#ff4444');

    } finally {

        btn.disabled = false;

        btn.textContent = 'START MATCHING NOW →';
    }
});

function enterDashboard() {

    document.getElementById('nav-username').textContent =
        '👤 ' + currentUser.name;

    showPage('page-dashboard');
}

document.getElementById('btn-yes')
    .addEventListener('click', () => updateAvailability(1));

document.getElementById('btn-no')
    .addEventListener('click', () => updateAvailability(0));

async function updateAvailability(val) {

    const box = document.getElementById('avail-status-box');

    const btns = document.getElementById('showup-btns');

    try {

        if (currentUser?.id) {

            await fetch(
                `${API}/availability/${currentUser.id}?available=${val}`,
                { method: 'POST' }
            );
        }

    } catch (e) {
        console.log(e);
    }

    box.textContent = val
        ? '✅ You are IN today! Ready for matches.'
        : '😴 Not today. Resting mode enabled.';

    box.style.display = 'block';

    btns.style.display = 'none';
}

document.getElementById('btn-search')
    .addEventListener('click', doSearch);

document.getElementById('sport-search')
    .addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
    });

async function doSearch() {

    const sport = document
        .getElementById('sport-search')
        .value
        .trim()
        .toLowerCase();

    if (!sport) return;

    const container = document.getElementById('match-results');

    container.innerHTML = `
        <div class="flex flex-col items-center py-10 text-slate-400">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-green-500 mb-4"></i>
            <p class="font-bold tracking-wide">Searching players...</p>
        </div>
    `;

    try {

        const res = await fetch(
            `${API}/match/${sport}`,
            { method: 'POST' }
        );

        let players = await res.json();

        players = players.filter(
            p => p.name !== currentUser?.name
        );

        if (!players.length) {

            container.innerHTML = `
                <div class="text-center p-12 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                    <div class="text-5xl mb-4 opacity-50">😕</div>
                    <div class="text-slate-300 font-bold mb-2">
                        No players found
                    </div>
                    <div class="text-slate-500 text-sm">
                        Nobody is available for ${sport} right now.
                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML = players.map(p => `

            <div class="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl mb-4 hover:border-green-500 hover:shadow-[0_0_25px_rgba(34,197,94,0.2)] hover:-translate-y-1 transition-all duration-300">

                <div class="flex justify-between items-center mb-2">

                    <div class="font-bold text-lg text-white">
                        ${p.name}
                    </div>

                    <div class="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold uppercase">
                        AVAILABLE
                    </div>
                </div>

                <div class="text-xs text-green-400 mb-3 uppercase font-bold">
                    ${p.sports}
                </div>

                <div class="text-sm text-slate-400 mb-4">
                    ${p.description || 'No description'}
                </div>

                <button
                    onclick="checkCompat('${p.name}', '${p.description || ''}', this)"
                    class="w-full bg-slate-800 text-white font-bold py-2 rounded-lg text-xs hover:bg-green-500 hover:text-black transition">

                    <i class="fa-solid fa-wand-sparkles mr-1"></i>
                    AI PREDICT MATCH
                </button>

                <div class="compat-text mt-3 text-xs text-green-300 italic hidden"></div>

            </div>

        `).join('');

    } catch (e) {

        console.log(e);

        container.innerHTML = `
            <p class="text-red-500 text-center">
                Backend connection failed.
            </p>
        `;
    }
}

async function checkCompat(targetName, targetDesc, btn) {

    if (!currentUser?.id) {
        return showToast('Register first!', '#ff4444');
    }

    const infoDiv = btn.nextElementSibling;

    btn.textContent = 'ANALYZING...';

    try {

        const res = await fetch(`${API}/ai/compatibility`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                target_name: targetName,
                target_desc: targetDesc
            })
        });

        const data = await res.json();

        infoDiv.textContent = data.analysis;

        infoDiv.classList.remove('hidden');

        btn.style.display = 'none';

    } catch (e) {

        infoDiv.textContent = 'AI analysis unavailable.';

        infoDiv.classList.remove('hidden');
    }
}

document.getElementById('chat-fab')
    .addEventListener('click', () => {
        document.getElementById('chat-panel')
            .classList.toggle('open');
    });

document.getElementById('chat-close')
    .addEventListener('click', () => {
        document.getElementById('chat-panel')
            .classList.remove('open');
    });

document.getElementById('chat-send')
    .addEventListener('click', sendChat);

document.getElementById('chat-input')
    .addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChat();
    });

async function sendChat() {

    const input = document.getElementById('chat-input');

    const msg = input.value.trim();

    if (!msg) return;

    input.value = '';

    const msgs = document.getElementById('chat-messages');

    msgs.innerHTML += `<div class="msg user">${msg}</div>`;

    msgs.scrollTop = msgs.scrollHeight;

    try {

        const res = await fetch(`${API}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: msg
            })
        });

        const data = await res.json();

        msgs.innerHTML += `
            <div class="msg ai">
                ${data.reply}
            </div>
        `;

    } catch (e) {

        msgs.innerHTML += `
            <div class="msg ai">
                AI assistant offline right now.
            </div>
        `;
    }

    msgs.scrollTop = msgs.scrollHeight;
}

window.addEventListener('load', () => {

    const saved = localStorage.getItem('showup_user');

    if (saved) {

        try {

            currentUser = JSON.parse(saved);

            enterDashboard();

        } catch (e) {

            localStorage.removeItem('showup_user');
        }
    }
});

document.getElementById('btn-logout')
    .addEventListener('click', () => {

        localStorage.removeItem('showup_user');

        location.reload();
    });

document.addEventListener('keydown', async (e) => {

    if (e.ctrlKey && e.key === 'r') {

        e.preventDefault();

        const res = await fetch(
            `${API}/debug/reset`,
            { method: 'POST' }
        );

        if (res.ok) {

            localStorage.clear();

            alert('Database seeded');

            location.reload();
        }
    }
});