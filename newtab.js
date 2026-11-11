// --- 0. IMMEDIATE SYNCHRONOUS LOAD ---
const defaultSettings = {
    theme: 'dark',
    wallpaperType: 'night',
    darken: 40,
    blur: 0,
    userName: "",
    fontFamily: "'Syncopate', sans-serif",
    dateFontFamily: "system-ui, sans-serif",
    clockFontSize: "6rem",
    dockFontSize: "0.85rem",
    greetingFontSize: "2rem",
    dockScale: 1,
    format24h: true,
    showSeconds: false,
    showTodo: true,
    showDockNames: true,
    city: "",
    dockX: null,
    dockY: null,
    shortcuts: [
        { name: "Gmail", url: "https://mail.google.com" },
        { name: "YouTube", url: "https://youtube.com" },
        { name: "GitHub", url: "https://github.com" }
    ]
};

let currentSettings = { ...defaultSettings };
try {
    const stored = localStorage.getItem('glassSettingsSync');
    if (stored) {
        currentSettings = { ...currentSettings, ...JSON.parse(stored) };
    }
} catch(e) {}

// Apply immediate visual settings
const root = document.documentElement;
document.body.classList.remove('dark-theme', 'light-theme');
if (currentSettings.theme !== 'auto') {
    document.body.classList.add(`${currentSettings.theme}-theme`);
}

const type = currentSettings.wallpaperType;
if (type !== 'custom') {
    if(type === 'sea') document.body.style.background = 'linear-gradient(to bottom right, #4389A2, #5C258D)';
    else if(type === 'night') document.body.style.background = '#141E30';
    else if(type === 'sunrise') document.body.style.background = 'linear-gradient(to right, #ff9966, #ff5e62)';
    else if(type === 'aurora') document.body.style.background = 'linear-gradient(45deg, #00c6ff, #0072ff)';
    else if(type === 'flow') document.body.style.background = 'linear-gradient(45deg, #ff9a9e, #fecfef)';
}

root.style.setProperty('--font-family', currentSettings.fontFamily);
root.style.setProperty('--date-font-family', currentSettings.dateFontFamily);
root.style.setProperty('--clock-size', currentSettings.clockFontSize);
root.style.setProperty('--dock-font-size', currentSettings.dockFontSize);
root.style.setProperty('--greeting-size', currentSettings.greetingFontSize);
root.style.setProperty('--dock-scale', currentSettings.dockScale);

const overlay = document.getElementById('background-overlay');
overlay.style.background = `rgba(0, 0, 0, ${currentSettings.darken / 100})`;
overlay.style.backdropFilter = `blur(${currentSettings.blur}px)`;
overlay.style.webkitBackdropFilter = `blur(${currentSettings.blur}px)`;

const dock = document.getElementById('dock');
if (currentSettings.dockX !== null && currentSettings.dockY !== null) {
    dock.style.position = 'absolute';
    dock.style.left = currentSettings.dockX + 'px';
    dock.style.top = currentSettings.dockY + 'px';
}

if (currentSettings.wallpaperType === 'custom') {
    chrome.storage.local.get(['customWallpaperData', 'customWallpaperIsVideo'], (res) => {
        if (res.customWallpaperData) {
            if (res.customWallpaperIsVideo) {
                const bgVideo = document.getElementById('bg-video');
                bgVideo.src = res.customWallpaperData;
                bgVideo.style.display = 'block';
            } else {
                document.body.style.backgroundImage = `url(${res.customWallpaperData})`;
            }
        }
    });
}

// -----------------------------------------------------
// Init logic after DOM load
// -----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    function saveSettings() {
        localStorage.setItem('glassSettingsSync', JSON.stringify(currentSettings));
        updateInputsToMatchState();
        renderSettingsShortcutsList();
    }

    // --- Quotes (15 quotes) ---
    const quotes = [
        "The only way to do great work is to love what you do. - Steve Jobs",
        "Simplicity is the ultimate sophistication. - Leonardo da Vinci",
        "Less is more. - Ludwig Mies van der Rohe",
        "Make it simple, but significant. - Don Draper",
        "The details are not the details. They make the design. - Charles Eames",
        "To travel is to live. - Hans Christian Andersen",
        "Focus on the signal, not the noise.",
        "Every day is a new beginning.",
        "Stay hungry, stay foolish. - Steve Jobs",
        "Your time is limited, don't waste it living someone else's life.",
        "Strive not to be a success, but rather to be of value. - Albert Einstein",
        "Innovation distinguishes between a leader and a follower.",
        "Have the courage to follow your heart and intuition.",
        "Stay curious.",
        "Design is intelligence made visible. - Alina Wheeler"
    ];
    document.getElementById('quote-display').textContent = quotes[Math.floor(Math.random() * quotes.length)];

    // --- Weather Logic (Open-Meteo API) ---
    async function fetchWeather() {
        const widget = document.getElementById('weather-widget');
        if (!currentSettings.city) {
            widget.classList.add('hidden');
            return;
        }
        widget.classList.remove('hidden');
        
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(currentSettings.city)}&count=1`);
            const geoData = await geoRes.json();
            if (!geoData.results || geoData.results.length === 0) {
                widget.innerHTML = '<span>City not found</span>';
                return;
            }
            const { latitude, longitude, name } = geoData.results[0];

            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
            const weatherData = await weatherRes.json();
            const temp = Math.round(weatherData.current.temperature_2m);
            const code = weatherData.current.weather_code;

            let icon = '☀️';
            if (code >= 1 && code <= 3) icon = '⛅';
            else if (code >= 45 && code <= 48) icon = '🌫️';
            else if (code >= 51 && code <= 67) icon = '🌧️';
            else if (code >= 71 && code <= 77) icon = '❄️';
            else if (code >= 80 && code <= 82) icon = '🌦️';
            else if (code >= 95) icon = '⛈️';

            widget.innerHTML = `<span style="font-size:1.4rem">${icon}</span> <span>${name} &bull; ${temp}°C</span>`;
        } catch(e) {
            widget.innerHTML = '<span>Weather error</span>';
        }
    }
    fetchWeather();

    // --- Clock, Greeting & Date ---
    const clockEl = document.getElementById('clock');
    const greetingEl = document.getElementById('greeting-display');
    const dateEl = document.getElementById('date-display');
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    function updateClock() {
        const now = new Date();
        let h = now.getHours();
        let m = now.getMinutes();
        let s = now.getSeconds();

        let greeting = 'Good evening';
        if (h >= 5 && h < 12) greeting = 'Good morning';
        else if (h >= 12 && h < 17) greeting = 'Good afternoon';
        
        const nameStr = currentSettings.userName ? `, ${currentSettings.userName}` : '';
        greetingEl.textContent = `${greeting}${nameStr}`;

        if (!currentSettings.format24h) h = h % 12 || 12;
        h = String(h).padStart(2, '0');
        m = String(m).padStart(2, '0');
        s = String(s).padStart(2, '0');

        clockEl.textContent = currentSettings.showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
        dateEl.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- Dock Rendering (Clean fresh look, no add button on dock) ---
    const itemsContainer = document.getElementById('dock-items');
    function renderDock() {
        itemsContainer.innerHTML = '';
        currentSettings.shortcuts.forEach((sc, index) => {
            const a = document.createElement('a');
            a.href = sc.url;
            a.className = 'dock-item';
            
            const img = document.createElement('img');
            try {
                img.src = `https://www.google.com/s2/favicons?domain=${new URL(sc.url).hostname}&sz=64`;
            } catch(e) {
                img.src = 'https://www.google.com/s2/favicons?domain=google.com&sz=64';
            }
            img.onerror = () => { img.src = 'https://www.google.com/s2/favicons?domain=google.com&sz=64'; };
            
            const span = document.createElement('span');
            span.className = 'app-name';
            span.textContent = sc.name;

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-shortcut';
            delBtn.innerHTML = '✕';
            delBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                currentSettings.shortcuts.splice(index, 1);
                saveSettings();
                renderDock();
            };

            a.appendChild(img);
            a.appendChild(span);
            a.appendChild(delBtn);
            itemsContainer.appendChild(a);
        });
        
        dock.classList.toggle('hide-names', !currentSettings.showDockNames);
    }
    renderDock();

    // --- Settings Shortcuts Manager List ---
    const settingsShortcutsList = document.getElementById('settings-shortcuts-list');
    function renderSettingsShortcutsList() {
        if (!settingsShortcutsList) return;
        settingsShortcutsList.innerHTML = '';
        currentSettings.shortcuts.forEach((sc, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px; font-size: 0.85rem;';
            
            const span = document.createElement('span');
            span.textContent = sc.name;
            span.style.overflow = 'hidden';
            span.style.textOverflow = 'ellipsis';
            span.style.whiteSpace = 'nowrap';
            span.style.maxWidth = '200px';

            const del = document.createElement('button');
            del.textContent = '✕';
            del.style.cssText = 'background: none; border: none; color: #ff5e62; cursor: pointer; font-weight: bold; padding: 2px 6px;';
            del.onclick = () => {
                currentSettings.shortcuts.splice(index, 1);
                saveSettings();
                renderDock();
            };

            item.appendChild(span);
            item.appendChild(del);
            settingsShortcutsList.appendChild(item);
        });
    }
    renderSettingsShortcutsList();

    // --- Add Shortcut Modal Triggers ---
    document.getElementById('open-add-shortcut-modal').onclick = () => {
        document.getElementById('shortcut-name').value = '';
        document.getElementById('shortcut-url').value = '';
        document.getElementById('add-shortcut-modal').classList.remove('hidden');
        document.getElementById('modal-overlay').classList.remove('hidden');
    };
    document.getElementById('cancel-shortcut').onclick = () => {
        document.getElementById('add-shortcut-modal').classList.add('hidden');
        document.getElementById('modal-overlay').classList.add('hidden');
    };
    document.getElementById('save-shortcut').onclick = () => {
        let name = document.getElementById('shortcut-name').value.trim();
        let urlStr = document.getElementById('shortcut-url').value.trim();
        if (name && urlStr) {
            if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
                urlStr = 'https://' + urlStr;
            }
            currentSettings.shortcuts.push({ name, url: urlStr });
            saveSettings();
            renderDock();
            document.getElementById('cancel-shortcut').click();
        }
    };

    // --- Draggable Dock with Snapping & Full Alignments ---
    const dragHandle = document.getElementById('dock-drag-handle');
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;

    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        dock.classList.add('dragging');
        if (dock.style.position !== 'absolute') {
            dock.style.position = 'absolute';
            dock.style.left = dock.offsetLeft + 'px';
            dock.style.top = dock.offsetTop + 'px';
        }
        dragOffsetX = e.clientX - dock.offsetLeft;
        dragOffsetY = e.clientY - dock.offsetTop;
        dock.style.transition = 'none'; 
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        let newX = e.clientX - dragOffsetX;
        let newY = e.clientY - dragOffsetY;

        const dockW = dock.offsetWidth;
        const dockH = dock.offsetHeight;
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        
        const snapZone = 50; // generous snap zone for effortless alignment

        // Horizontal alignments: Left End, Center, Right End
        const leftEnd = 20;
        const centerX = (winW - dockW) / 2;
        const rightEnd = winW - dockW - 20;

        if (Math.abs(newX - centerX) < snapZone) newX = centerX;
        else if (Math.abs(newX - leftEnd) < snapZone) newX = leftEnd;
        else if (Math.abs(newX - rightEnd) < snapZone) newX = rightEnd;

        // Vertical alignments: Top End, Center, Bottom End
        const topEnd = 20;
        const centerY = (winH - dockH) / 2;
        const bottomEnd = winH - dockH - 20;

        if (Math.abs(newY - centerY) < snapZone) newY = centerY;
        else if (Math.abs(newY - topEnd) < snapZone) newY = topEnd;
        else if (Math.abs(newY - bottomEnd) < snapZone) newY = bottomEnd;

        dock.style.left = newX + 'px';
        dock.style.top = newY + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            dock.classList.remove('dragging');
            dock.style.transition = 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease';
            currentSettings.dockX = dock.offsetLeft;
            currentSettings.dockY = dock.offsetTop;
            saveSettings();
        }
    });

    document.getElementById('reset-dock-btn').addEventListener('click', () => {
        dock.style.position = 'relative';
        dock.style.left = 'auto';
        dock.style.top = 'auto';
        currentSettings.dockX = null;
        currentSettings.dockY = null;
        saveSettings();
    });

    // --- Settings UI Inputs ---
    function updateInputsToMatchState() {
        document.querySelectorAll('.theme-selector button').forEach(b => b.classList.remove('active'));
        const activeThemeBtn = document.querySelector(`.theme-selector button[data-theme="${currentSettings.theme}"]`);
        if(activeThemeBtn) activeThemeBtn.classList.add('active');

        document.getElementById('name-input').value = currentSettings.userName;
        document.getElementById('darken-slider').value = currentSettings.darken;
        document.getElementById('blur-slider').value = currentSettings.blur;
        document.getElementById('font-select').value = currentSettings.fontFamily;
        document.getElementById('date-font-select').value = currentSettings.dateFontFamily;
        document.getElementById('font-size-slider').value = parseFloat(currentSettings.clockFontSize);
        document.getElementById('dock-font-slider').value = parseFloat(currentSettings.dockFontSize);
        document.getElementById('greeting-font-slider').value = parseFloat(currentSettings.greetingFontSize);
        document.getElementById('dock-scale-slider').value = currentSettings.dockScale;
        
        document.getElementById('format-24h').checked = currentSettings.format24h;
        document.getElementById('show-seconds').checked = currentSettings.showSeconds;
        document.getElementById('toggle-todo').checked = currentSettings.showTodo;
        document.getElementById('todo-widget').style.display = currentSettings.showTodo ? 'flex' : 'none';
        document.getElementById('toggle-dock-names').checked = currentSettings.showDockNames;
        dock.classList.toggle('hide-names', !currentSettings.showDockNames);
        document.getElementById('city-input').value = currentSettings.city;
    }
    updateInputsToMatchState();

    // Listeners for UI changes
    document.getElementById('name-input').addEventListener('input', (e) => {
        currentSettings.userName = e.target.value.trim();
        saveSettings();
        updateClock();
    });

    document.querySelectorAll('.theme-selector button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentSettings.theme = e.target.dataset.theme;
            document.body.className = currentSettings.theme !== 'auto' ? `${currentSettings.theme}-theme` : '';
            saveSettings();
        });
    });

    const bgVideo = document.getElementById('bg-video');
    document.querySelectorAll('.wp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.wp;
            currentSettings.wallpaperType = type;
            bgVideo.style.display = 'none';
            bgVideo.src = '';
            document.body.style.backgroundImage = 'none';
            if(type === 'sea') document.body.style.background = 'linear-gradient(to bottom right, #4389A2, #5C258D)';
            else if(type === 'night') document.body.style.background = '#141E30';
            else if(type === 'sunrise') document.body.style.background = 'linear-gradient(to right, #ff9966, #ff5e62)';
            else if(type === 'aurora') document.body.style.background = 'linear-gradient(45deg, #00c6ff, #0072ff)';
            else if(type === 'flow') document.body.style.background = 'linear-gradient(45deg, #ff9a9e, #fecfef)';
            saveSettings();
        });
    });

    document.getElementById('darken-slider').addEventListener('input', (e) => {
        overlay.style.background = `rgba(0, 0, 0, ${e.target.value / 100})`;
        currentSettings.darken = e.target.value;
        saveSettings();
    });

    document.getElementById('blur-slider').addEventListener('input', (e) => {
        overlay.style.backdropFilter = `blur(${e.target.value}px)`;
        overlay.style.webkitBackdropFilter = `blur(${e.target.value}px)`;
        currentSettings.blur = e.target.value;
        saveSettings();
    });

    document.getElementById('custom-wp-btn').addEventListener('click', () => {
        document.getElementById('custom-wp-upload').click();
    });
    
    document.getElementById('custom-wp-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const isVideo = file.type.startsWith('video/');
        const reader = new FileReader();
        reader.onload = function(event) {
            currentSettings.wallpaperType = 'custom';
            saveSettings(); 
            
            chrome.storage.local.set({ 
                customWallpaperData: event.target.result,
                customWallpaperIsVideo: isVideo
            }, () => {
                bgVideo.style.display = 'none';
                bgVideo.src = '';
                document.body.style.backgroundImage = 'none';
                document.body.style.background = '#000';
                if (isVideo) {
                    bgVideo.src = event.target.result;
                    bgVideo.style.display = 'block';
                } else {
                    document.body.style.backgroundImage = `url(${event.target.result})`;
                }
            });
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('font-select').addEventListener('change', (e) => {
        root.style.setProperty('--font-family', e.target.value);
        currentSettings.fontFamily = e.target.value;
        saveSettings();
    });

    document.getElementById('date-font-select').addEventListener('change', (e) => {
        root.style.setProperty('--date-font-family', e.target.value);
        currentSettings.dateFontFamily = e.target.value;
        saveSettings();
    });
    
    document.getElementById('font-size-slider').addEventListener('input', (e) => {
        root.style.setProperty('--clock-size', `${e.target.value}rem`);
        currentSettings.clockFontSize = `${e.target.value}rem`;
        saveSettings();
    });

    document.getElementById('dock-font-slider').addEventListener('input', (e) => {
        root.style.setProperty('--dock-font-size', `${e.target.value}rem`);
        currentSettings.dockFontSize = `${e.target.value}rem`;
        saveSettings();
    });

    document.getElementById('greeting-font-slider').addEventListener('input', (e) => {
        root.style.setProperty('--greeting-size', `${e.target.value}rem`);
        currentSettings.greetingFontSize = `${e.target.value}rem`;
        saveSettings();
    });

    document.getElementById('dock-scale-slider').addEventListener('input', (e) => {
        root.style.setProperty('--dock-scale', e.target.value);
        currentSettings.dockScale = parseFloat(e.target.value);
        saveSettings();
    });

    document.getElementById('format-24h').addEventListener('change', (e) => {
        currentSettings.format24h = e.target.checked;
        saveSettings();
        updateClock();
    });
    
    document.getElementById('show-seconds').addEventListener('change', (e) => {
        currentSettings.showSeconds = e.target.checked;
        saveSettings();
        updateClock();
    });
    
    document.getElementById('toggle-todo').addEventListener('change', (e) => {
        currentSettings.showTodo = e.target.checked;
        document.getElementById('todo-widget').style.display = e.target.checked ? 'flex' : 'none';
        saveSettings();
    });
    
    document.getElementById('toggle-dock-names').addEventListener('change', (e) => {
        currentSettings.showDockNames = e.target.checked;
        dock.classList.toggle('hide-names', !e.target.checked);
        saveSettings();
    });
    
    let cityTimeout;
    document.getElementById('city-input').addEventListener('input', (e) => {
        clearTimeout(cityTimeout);
        cityTimeout = setTimeout(() => {
            currentSettings.city = e.target.value;
            saveSettings();
            fetchWeather();
        }, 800);
    });

    // --- To-Do List Logic ---
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const todoEmpty = document.getElementById('todo-empty');
    
    let todos = [];
    try {
        const st = localStorage.getItem('glassTodosSync');
        if(st) todos = JSON.parse(st);
    } catch(e){}

    function renderTodos() {
        todoList.innerHTML = '';
        if (todos.length === 0) {
            todoEmpty.style.display = 'block';
        } else {
            todoEmpty.style.display = 'none';
            todos.forEach((task, index) => {
                const li = document.createElement('li');
                if(task.completed) li.classList.add('completed');
                
                const textSpan = document.createElement('span');
                textSpan.textContent = task.text;
                textSpan.style.cursor = 'pointer';
                textSpan.onclick = () => { todos[index].completed = !todos[index].completed; saveTodos(); };

                const delBtn = document.createElement('button');
                delBtn.textContent = '✕';
                delBtn.onclick = () => { todos.splice(index, 1); saveTodos(); };

                li.appendChild(textSpan); li.appendChild(delBtn);
                todoList.appendChild(li);
            });
        }
    }
    
    function saveTodos() { 
        localStorage.setItem('glassTodosSync', JSON.stringify(todos));
        renderTodos(); 
    }

    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && todoInput.value.trim() !== '') {
            todos.push({ text: todoInput.value.trim(), completed: false });
            todoInput.value = ''; 
            saveTodos();
        }
    });
    renderTodos();

    // --- Drawer Toggles ---
    const drawer = document.getElementById('settings-drawer');
    document.getElementById('settings-trigger').addEventListener('click', () => drawer.classList.add('open'));
    document.getElementById('close-settings').addEventListener('click', () => drawer.classList.remove('open'));
});
