document.addEventListener('DOMContentLoaded', () => {
    // --- Получение основных элементов ---
    const desktop = document.getElementById('desktop');
    const startMenu = document.getElementById('start-menu');
    const taskbarWindows = document.getElementById('taskbar-windows');
    let zIndex = 1;
    let activeWindow = null;

    // --- Логика для ярлыков на рабочем столе ---
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        // Выделение по одному клику
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
        });
        // Открытие окна по двойному клику
        icon.addEventListener('dblclick', () => openWindowFromElement(icon));
    });
    // Снятие выделения при клике на рабочий стол
    desktop.addEventListener('click', () => {
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    });
    
    // --- Логика меню "Пуск" ---
    document.getElementById('start-button').addEventListener('click', e => {
        e.stopPropagation();
        startMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => startMenu.classList.remove('show'));
    startMenu.addEventListener('click', e => e.stopPropagation());
    startMenu.querySelectorAll('li[data-content]').forEach(item => {
        item.addEventListener('click', () => openWindowFromElement(item));
    });

    // --- Логика кнопки выключения ---
    document.getElementById('shutdown-button').addEventListener('click', () => {
        document.getElementById('shutdown-sound').play();
        document.getElementById('shutdown-screen').classList.add('show');
    });

    // --- Общая функция для открытия окон ---
    function openWindowFromElement(element) {
        const contentId = element.dataset.content;
        const title = element.querySelector('span')?.innerText || element.innerText;
        
        const existingWindow = document.querySelector(`.window[data-id="${contentId}"]`);
        if (existingWindow) {
            setFocus(existingWindow);
            return;
        }
        createWindow(contentId, title);
        startMenu.classList.remove('show');
    }

    // --- Создание окна ---
    async function createWindow(contentId, title) {
        const windowEl = document.createElement('div');
        windowEl.className = 'window maximized'; // Окно сразу развернуто
        windowEl.dataset.id = contentId;
        windowEl.dataset.state = 'maximized';

        const response = await fetch(`content/${contentId}.html`);
        const contentHtml = await response.text();
        
        windowEl.innerHTML = `
            <div class="window-header">
                <span class="window-title">${title}</span>
                <div class="window-controls">
                    <button class="minimize-btn">0</button>
                    <button class="maximize-btn">2</button>
                    <button class="close-btn">r</button>
                </div>
            </div>
            <div class="window-content">${contentHtml}</div>
        `;

        desktop.appendChild(windowEl);
        createTaskbarButton(windowEl, title);
        setFocus(windowEl);
        makeDraggable(windowEl);

        // --- Обработчики кнопок управления окном ---
        windowEl.querySelector('.close-btn').addEventListener('click', () => closeWindow(windowEl));
        windowEl.querySelector('.minimize-btn').addEventListener('click', () => minimizeWindow(windowEl));
        windowEl.querySelector('.maximize-btn').addEventListener('click', () => toggleMaximize(windowEl));
        windowEl.querySelector('.window-header').addEventListener('dblclick', () => toggleMaximize(windowEl));
        windowEl.addEventListener('mousedown', () => setFocus(windowEl));
    }

    // --- Функции управления состоянием окна ---
    function closeWindow(windowEl) {
        const taskbarBtn = document.querySelector(`.taskbar-button[data-id="${windowEl.dataset.id}"]`);
        if (taskbarBtn) taskbarBtn.remove();
        windowEl.remove();
        activeWindow = null;
    }

    function minimizeWindow(windowEl) {
        windowEl.classList.add('minimized');
        const taskbarBtn = document.querySelector(`.taskbar-button[data-id="${windowEl.dataset.id}"]`);
        if(taskbarBtn) taskbarBtn.classList.remove('active');
        activeWindow = null;
    }

    function toggleMaximize(windowEl) {
        const maximizeBtn = windowEl.querySelector('.maximize-btn');
        if (windowEl.dataset.state === 'maximized') {
            // Восстановить в нормальный размер
            windowEl.classList.remove('maximized');
            windowEl.style.top = windowEl.dataset.oldTop || '10%';
            windowEl.style.left = windowEl.dataset.oldLeft || '10%';
            windowEl.style.width = windowEl.dataset.oldWidth || '600px';
            windowEl.style.height = windowEl.dataset.oldHeight || '400px';
            windowEl.dataset.state = 'normal';
            maximizeBtn.textContent = '1'; // Иконка "развернуть"
        } else {
            // Развернуть на весь экран
            const rect = windowEl.getBoundingClientRect();
            windowEl.dataset.oldTop = `${rect.top}px`;
            windowEl.dataset.oldLeft = `${rect.left}px`;
            windowEl.dataset.oldWidth = `${rect.width}px`;
            windowEl.dataset.oldHeight = `${rect.height}px`;
            windowEl.classList.add('maximized');
            windowEl.dataset.state = 'maximized';
            maximizeBtn.textContent = '2'; // Иконка "восстановить"
        }
    }
    
    function setFocus(windowEl) {
        if (activeWindow === windowEl && !windowEl.classList.contains('minimized')) return;
        
        document.querySelectorAll('.taskbar-button').forEach(btn => btn.classList.remove('active'));
        if (activeWindow) activeWindow.classList.remove('active');
        
        windowEl.style.zIndex = ++zIndex;
        const taskbarBtn = document.querySelector(`.taskbar-button[data-id="${windowEl.dataset.id}"]`);
        if (taskbarBtn) taskbarBtn.classList.add('active');
        activeWindow = windowEl;

        windowEl.classList.remove('minimized');
    }

    function createTaskbarButton(windowEl, title) {
        const button = document.createElement('button');
        button.className = 'taskbar-button';
        button.dataset.id = windowEl.dataset.id;
        button.textContent = title;
        button.addEventListener('click', () => {
            if (windowEl.classList.contains('minimized')) {
                setFocus(windowEl);
            } else if (activeWindow === windowEl) {
                minimizeWindow(windowEl);
            } else {
                setFocus(windowEl);
            }
        });
        taskbarWindows.appendChild(button);
    }
    
    function makeDraggable(element) {
        const header = element.querySelector('.window-header');
        let offsetX, offsetY;
        header.addEventListener('mousedown', (e) => {
            if (element.dataset.state === 'maximized' || e.target.tagName === 'BUTTON' || e.target.parentElement.classList.contains('window-controls')) return;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            const desktopRect = desktop.getBoundingClientRect();
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            newX = Math.max(0, Math.min(newX, desktopRect.width - element.offsetWidth));
            newY = Math.max(0, Math.min(newY, desktopRect.height - element.offsetHeight));
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        }
        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    // Обновление часов
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }, 1000);
});
