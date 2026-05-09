 const API = "http://127.0.0.1:8001";
        AOS.init({ duration: 1000, once: true });

        function goToDashboard() {
            document.getElementById('landingView').style.display = 'none';
            document.getElementById('dashboardView').style.display = 'block';
            window.scrollTo(0,0);
            AOS.refresh();
        }

        const chatBtn = document.getElementById('chatBtn');
        const chatPopup = document.getElementById('chatPopup');
        chatBtn.onclick = () => chatPopup.classList.toggle('hidden');
        document.getElementById('closeChat').onclick = () => chatPopup.classList.add('hidden');

        function showToast(msg) {
            const t = document.getElementById('toast');
            t.innerText = msg; t.classList.remove('hidden');
            setTimeout(() => t.classList.add('hidden'), 3000);
        }

        // JS LOGIC FOR API (MATCHING YOUR main.py)
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
            showToast("PROFILE CREATED! ID: " + data.id);
            document.getElementById("userId").value = data.id;
        }

        async function setAvailability(available) {
            const userId = document.getElementById("userId").value;
            await fetch(`${API}/availability/${userId}?available=${available}`, { method: "POST" });
            showToast(available ? "YOU ARE IN! 🔥" : "MAYBE NEXT TIME...");
        }

        async function findMatch() {
            const sport = document.getElementById("sportSearch").value;
            const res = await fetch(`${API}/match/${sport}`, { method: "POST" });
            const users = await res.json();
            const div = document.getElementById("results");
            div.innerHTML = users.length ? users.map(u => `
                <div class="glass p-6 rounded-3xl hover:border-green-500 transition-all group">
                    <div class="flex justify-between items-start mb-4">
                        <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center font-black text-black">${u.name[0]}</div>
                        <span class="bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded font-bold">AVAILABLE NOW</span>
                    </div>
                    <h3 class="text-xl font-bold mb-1">${u.name}</h3>
                    <p class="text-slate-400 text-sm mb-4 line-clamp-2">${u.sports}</p>
                    <button class="w-full bg-slate-800 text-white py-2 rounded-xl text-xs font-bold hover:bg-white hover:text-black transition">SEND INVITE</button>
                </div>
            `).join("") : `<div class="col-span-full text-center p-20 opacity-30 italic">No one is ready for ${sport} yet.</div>`;
        }

        async function sendChat() {
            const input = document.getElementById("userInput");
            const box = document.getElementById("chatDisplay");
            const msg = input.value;
            if(!msg) return;
            box.innerHTML += `<div class="text-right"><span class="bg-blue-600 text-white p-2 rounded-2xl rounded-tr-none inline-block">${msg}</span></div>`;
            input.value = "";
            
            const res = await fetch(`${API}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg })
            });
            const data = await res.json();
            box.innerHTML += `<div class="text-left"><span class="bg-slate-800 text-slate-300 p-2 rounded-2xl rounded-tl-none inline-block">${data.reply}</span></div>`;
            box.scrollTop = box.scrollHeight;
        }

        async function magicAI() {
            const desc = document.getElementById("description").value;
            if(!desc) return showToast("Add a description first!");
            showToast("AI EXTRACTING SPORTS...");
            const res = await fetch(`${API}/ai/extract-sports?description=${encodeURIComponent(desc)}`, { method: "POST" });
            const data = await res.json();
            document.getElementById("sports").value = data.sports;
            showToast("SPORTS EXTRACTED! ✨");
        }