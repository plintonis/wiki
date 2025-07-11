document.addEventListener('DOMContentLoaded', () => {
    const desktop = document.getElementById('desktop');
    const startButton = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');
    const clock = document.getElementById('clock');
    let zIndex = 1;

    // --- Часы ---
    function updateClock() {
        const now = new Date();
        const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        clock.textContent = time;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // --- Меню "Пуск" ---
    startButton.addEventListener('click', (e) => {
        e.stopPropagation();
        startMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => startMenu.classList.remove('show'));
    startMenu.addEventListener('click', (e) => e.stopPropagation());

    // --- Обработка кликов по меню ---
    startMenu.querySelectorAll('li[data-content]').forEach(item => {
        item.addEventListener('click', () => {
            const contentFile = item.getAttribute('data-content');
            const iconSrc = item.querySelector('img').src;
            const title = item.innerText;
            createWindow(contentFile, iconSrc, title);
            startMenu.classList.remove('show');
        });
    });

    document.getElementById('theme-switcher').addEventListener('click', () => {
        alert("Смена темы в этой версии Windows не поддерживается :)");
        startMenu.classList.remove('show');
    });
    
    // --- Создание окна ---
    async function createWindow(contentId, iconSrc, title) {
        if (document.querySelector(`.window[data-id="${contentId}"]`)) return;

        const windowEl = document.createElement('div');
        windowEl.className = 'window';
        windowEl.dataset.id = contentId;
        windowEl.style.zIndex = ++zIndex;
        windowEl.style.top = `${30 + (Object.keys(desktop.children).length * 25) % 200}px`;
        windowEl.style.left = `${50 + (Object.keys(desktop.children).length * 25) % 300}px`;

        const response = await fetch(`content/${contentId}.html`);
        const contentHtml = await response.text();
        
        windowEl.innerHTML = `
            <div class="window-header">
                <span class="window-title">
                    <img src="${iconSrc}" class="window-title-icon" alt="">
                    ${title}
                </span>
                <div class="window-controls">
                    <button class="minimize">0</button>
                    <button class="maximize">1</button>
                    <button class="close">r</button>
                </div>
            </div>
            <div class="window-content">${contentHtml}</div>
        `;

        desktop.appendChild(windowEl);
        makeDraggable(windowEl);
        
        if (contentId === 'copy') { /* ... логика для окна копирования ... */ }

        windowEl.querySelector('.close').addEventListener('click', () => windowEl.remove());
        windowEl.addEventListener('mousedown', () => {
            windowEl.style.zIndex = ++zIndex;
        });
    }

    function makeDraggable(element) {
        const header = element.querySelector('.window-header');
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.parentElement.classList.contains('window-controls')) return;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            // --- НОВАЯ ЛОГИКА ОГРАНИЧЕНИЯ ПЕРЕТАСКИВАНИЯ ---
            const desktopRect = desktop.getBoundingClientRect();
            
            // Вычисляем новые координаты
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            // Ограничиваем по горизонтали (левая и правая границы)
            newX = Math.max(0, newX); // не уходить левее 0
            newX = Math.min(newX, desktopRect.width - element.offsetWidth); // не уходить правее

            // Ограничиваем по вертикали (верхняя и нижняя границы)
            newY = Math.max(0, newY); // не уходить выше 0
            newY = Math.min(newY, desktopRect.height - element.offsetHeight); // не уходить ниже

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }
});
