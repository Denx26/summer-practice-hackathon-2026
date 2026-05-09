const API = "http://127.0.0.1:8001";
AOS.init({ duration: 800, once: true });

// Toggle Chat
const chatBtn = document.getElementById('chatBtn');
const chatPopup = document.getElementById('chatPopup');
const closeChat = document.getElementById('closeChat');
chatBtn.onclick = () => chatPopup.classList.toggle('hidden');
closeChat.onclick = () => chatPopup.classList.add('hidden');

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

async function registerUser() {
    const name = document.getElementById("name").value;
    const description = document.getElementById("description").value;
    const sports = document.getElementById("sports").value.split(",").map(s => s.trim());

    const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, sports, skill_level: "intermediate", available: 0 })
    });
    const data = await res.json();
    showToast("Registered! ID: " + data.id);
    document.getElementById("userId").value = data.id;
}

async function setAvailability(available) {
    const userId = document.getElementById("userId").value;
    if (!userId) return showToast("Please enter ID first!");
    await fetch(`${API}/availability/${userId}?available=${available ? 1 : 0}`, { method: "POST" });
    showToast(available ? "You're in for today!" : "Status updated!");
}

async function findMatch() {
    const sport = document.getElementById("sportSearch").value;
    const res = await fetch(`${API}/match/${sport}`, { method: "POST" });
    const users = await res.json();
    const div = document.getElementById("results");

    if (users.length === 0) {
        div.innerHTML = `<div class="col-span-full text-center p-10 glass rounded-2xl text-slate-500 italic">No players found for ${sport} yet.</div>`;
        return;
    }

    div.innerHTML = users.map(u => `
                <div class="glass p-5 rounded-2xl hover:border-green-500 transition-all group" data-aos="zoom-in">
                    <div class="flex justify-between items-start mb-2">
                        <div class="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                            <i class="fa-solid fa-user text-slate-500"></i>
                        </div>
                        <span class="text-[10px] bg-slate-800 px-2 py-1 rounded-full text-slate-400 font-bold uppercase">MATCH 95%</span>
                    </div>
                    <h3 class="font-black text-lg text-slate-100">${u.name}</h3>
                    <p class="text-xs text-slate-400 mb-3 line-clamp-2">${u.description || 'No description provided.'}</p>
                    <div class="flex flex-wrap gap-2">
                        ${u.sports.split(',').map(s => `<span class="text-[9px] bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-md font-bold uppercase">${s}</span>`).join('')}
                    </div>
                </div>
            `).join("");
}

async function sendChat() {
    const input = document.getElementById("userInput");
    const box = document.getElementById("chatDisplay");
    const message = input.value;
    if (!message) return;

    box.innerHTML += `<div class="bg-green-500 text-slate-900 p-3 rounded-2xl rounded-tr-none self-end ml-10 text-right font-bold">${message}</div>`;
    input.value = "";
    box.scrollTop = box.scrollHeight;

    const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message })
    });
    const data = await res.json();

    box.innerHTML += `<div class="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-700 text-slate-300 self-start mr-10">${data.reply}</div>`;
    box.scrollTop = box.scrollHeight;
}

async function magicAI() {
    const desc = document.getElementById("description").value;
    if (!desc) return showToast("Write a description first!");
    showToast("AI analyzing description...");

    const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Extrage doar numele sporturilor (separate prin virgulă) din acest text: "${desc}". Răspunde doar cu lista de sporturi, nimic altceva.` })
    });
    const data = await res.json();
    document.getElementById("sports").value = data.reply.replace(/\./g, '');
    showToast("Magic! Sports updated.");
}

document.getElementById("userInput").addEventListener("keypress", (e) => { if (e.key === "Enter") sendChat(); });
