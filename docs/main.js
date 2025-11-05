"use strict";
document.addEventListener('DOMContentLoaded', () => {
    const i18n = {
        translations: {},
        availableLanguages: ['en', 'zh-TW'],
        async loadTranslations() {
            try {
                // 使用相對於當前頁面的路徑，確保在任何部署環境下都能正常工作
                const translationsUrl = new URL('translations.json', window.location.href);
                const response = await fetch(translationsUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                this.translations = await response.json();
            }
            catch (error) {
                console.error("Could not load translations:", error);
            }
        },
        translatePage(language) {
            if (!this.translations[language]) {
                console.warn(`No translations found for language: ${language}`);
                console.log('Available languages:', Object.keys(this.translations));
                return;
            }
            document.documentElement.lang = language;
            const elements = document.querySelectorAll('[data-i18n-key]');
            elements.forEach(element => {
                const key = element.getAttribute('data-i18n-key');
                if (key && this.translations[language][key]) {
                    if (element.tagName === 'TITLE') {
                        element.textContent = this.translations[language][key];
                    }
                    else if (element.tagName === 'SPAN' && element.parentElement?.classList.contains('skill-bubble')) {
                        // Skill bubble 的 span，只更新文字
                        element.textContent = this.translations[language][key];
                    }
                    else if (element.classList.contains('sub-skills')) {
                        // Sub-skills div，只更新文字
                        element.textContent = this.translations[language][key];
                    }
                    else {
                        // 其他元素，使用 innerHTML 以支持 HTML
                        element.innerHTML = this.translations[language][key];
                    }
                }
                else if (key) {
                    console.warn(`Translation key "${key}" not found for language "${language}"`);
                }
            });
        },
        getInitialLanguage() {
            const savedLang = localStorage.getItem('language');
            if (savedLang && this.availableLanguages.includes(savedLang)) {
                return savedLang;
            }
            const browserLang = navigator.language;
            if (browserLang.startsWith('zh-Hant') || browserLang.startsWith('zh-TW')) {
                return 'zh-TW';
            }
            return 'en'; // Default language
        },
        init() {
            const languageSelector = document.getElementById('language-selector');
            if (!languageSelector) {
                console.error('Language selector not found!');
                return;
            }
            this.loadTranslations().then(() => {
                const initialLang = this.getInitialLanguage();
                languageSelector.value = initialLang;
                this.translatePage(initialLang);
                languageSelector.addEventListener('change', (e) => {
                    const newLang = e.target.value;
                    localStorage.setItem('language', newLang);
                    this.translatePage(newLang);
                    // 切換語言後自動滾動到最上方（兼容手機瀏覽器）
                    setTimeout(() => {
                        document.documentElement.scrollTop = 0;
                        document.body.scrollTop = 0;
                    }, 100);
                });
            }).catch(error => {
                console.error('Failed to initialize translations:', error);
            });
        }
    };
    i18n.init();
    // --- Existing logic from your file ---
    // Logic for the "About Me" section toggle
    const aboutMeContent = document.getElementById('aboutMeContent');
    const aboutMeToggle = aboutMeContent?.closest('.cursor-pointer');
    const aboutMeArrow = document.getElementById('about-me-arrow');
    if (aboutMeToggle && aboutMeContent && aboutMeArrow) {
        // Set initial arrow rotation if content is expanded by default
        if (aboutMeContent.classList.contains('expanded')) {
            aboutMeArrow.style.transform = 'rotate(180deg)';
        }
        aboutMeToggle.addEventListener('click', () => {
            const isExpanded = aboutMeContent.classList.toggle('expanded');
            aboutMeArrow.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }
    // Logic for the skill bubbles
    const skillsContainer = document.querySelector('.flex.flex-wrap.justify-center.gap-3');
    if (skillsContainer) {
        const skillBubbles = Array.from(skillsContainer.querySelectorAll('.skill-bubble'));
        let activeBubble = null;
        let detailsContainer = null;
        let isAnimating = false;
        const getRows = () => {
            const rows = [];
            if (skillBubbles.length === 0)
                return { rows, bubbleToRowMap: new Map() };
            const sortedBubbles = [...skillBubbles].sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                if (Math.abs(rectA.top - rectB.top) > 10)
                    return rectA.top - rectB.top;
                return rectA.left - rectB.left;
            });
            const bubbleToRowMap = new Map();
            if (sortedBubbles.length > 0) {
                let currentRow = [sortedBubbles[0]];
                rows.push(currentRow);
                bubbleToRowMap.set(sortedBubbles[0], currentRow);
                for (let i = 1; i < sortedBubbles.length; i++) {
                    const bubble = sortedBubbles[i];
                    const prevBubble = sortedBubbles[i - 1];
                    if (Math.abs(bubble.getBoundingClientRect().top - prevBubble.getBoundingClientRect().top) < 10) {
                        currentRow.push(bubble);
                    }
                    else {
                        currentRow = [bubble];
                        rows.push(currentRow);
                    }
                    bubbleToRowMap.set(bubble, currentRow);
                }
            }
            return { rows, bubbleToRowMap };
        };
        const openDetails = (bubble) => {
            activeBubble = bubble;
            bubble.classList.add('active');
            detailsContainer = document.createElement('div');
            detailsContainer.className = 'skill-details-container';
            const subSkillsText = bubble.querySelector('.sub-skills')?.textContent || '';
            const subSkillsItems = subSkillsText.split(/, | • /).map(item => item.trim()).filter(Boolean);
            detailsContainer.innerHTML = `<div class="skill-details-inner">${subSkillsItems.map(item => `<span class="sub-skill-item">${item}</span>`).join('')}</div>`;
            const { bubbleToRowMap } = getRows();
            const clickedRow = bubbleToRowMap.get(bubble);
            if (clickedRow) {
                const lastElementInRow = clickedRow[clickedRow.length - 1];
                lastElementInRow.after(detailsContainer);
            }
            requestAnimationFrame(() => {
                if (detailsContainer) {
                    const containerToOpen = detailsContainer;
                    const onEnd = () => {
                        containerToOpen.removeEventListener('transitionend', onEnd);
                        clearTimeout(timeoutId);
                        isAnimating = false;
                    };
                    containerToOpen.addEventListener('transitionend', onEnd);
                    const timeoutId = setTimeout(onEnd, 500); // Failsafe timeout (animation is 400ms)
                    containerToOpen.classList.add('expanded');
                }
            });
        };
        skillBubbles.forEach(bubble => {
            bubble.addEventListener('click', async (event) => {
                event.stopPropagation();
                if (isAnimating)
                    return;
                const isCurrentlyActive = bubble === activeBubble;
                isAnimating = true;
                if (detailsContainer) {
                    const containerToClose = detailsContainer;
                    const transitionPromise = new Promise(resolve => {
                        const onEnd = () => {
                            containerToClose.removeEventListener('transitionend', onEnd);
                            clearTimeout(timeoutId);
                            resolve();
                        };
                        containerToClose.addEventListener('transitionend', onEnd);
                        const timeoutId = setTimeout(onEnd, 500); // Failsafe timeout
                    });
                    containerToClose.classList.remove('expanded');
                    skillBubbles.forEach(b => b.classList.remove('active'));
                    activeBubble = null;
                    await transitionPromise;
                    containerToClose.remove();
                    detailsContainer = null;
                }
                if (!isCurrentlyActive) {
                    openDetails(bubble);
                }
                else {
                    isAnimating = false;
                }
            });
        });
        document.addEventListener('click', (event) => {
            if (isAnimating || !detailsContainer)
                return;
            const target = event.target;
            if (!target.closest('.skill-bubble') && !target.closest('.skill-details-container')) {
                isAnimating = true;
                const containerToClose = detailsContainer;
                containerToClose.classList.remove('expanded');
                skillBubbles.forEach(b => b.classList.remove('active'));
                activeBubble = null;
                const onEnd = () => {
                    containerToClose.removeEventListener('transitionend', onEnd);
                    clearTimeout(timeoutId);
                    containerToClose.remove();
                    detailsContainer = null;
                    isAnimating = false;
                };
                containerToClose.addEventListener('transitionend', onEnd);
                const timeoutId = setTimeout(onEnd, 500);
            }
        });
        window.addEventListener('resize', () => {
            if (isAnimating || !activeBubble || !detailsContainer)
                return;
            const { bubbleToRowMap } = getRows();
            const currentRow = bubbleToRowMap.get(activeBubble);
            if (currentRow) {
                const lastElementInRow = currentRow[currentRow.length - 1];
                lastElementInRow.after(detailsContainer);
            }
        });
    }
    // --- Booking Modal Logic ---
    const API_BASE_URL = window.location.hostname.includes('github.io')
        ? 'https://booking-server-110187416117.asia-east1.run.app'
        : 'http://localhost:3000';
    // Booking configuration
    const BOOKING_DAYS_AHEAD = 30; // Number of days ahead that users can book
    // State
    let currentDisplayDate = new Date();
    let busySlots = [];
    let availableDays = new Set();
    let selectedDate = null;
    let selectedSlot = null;
    const openModal = () => {
        const bookingModal = document.getElementById('booking-modal');
        if (bookingModal) {
            bookingModal.classList.remove('hidden');
            bookingModal.classList.add('flex');
        }
        document.body.style.overflow = 'hidden';
        resetModalToInitialState();
        initBookingSystem();
    };
    const closeModal = () => {
        const bookingModal = document.getElementById('booking-modal');
        if (bookingModal) {
            bookingModal.classList.add('hidden');
            bookingModal.classList.remove('flex');
        }
        document.body.style.overflow = '';
    };
    const resetModalToInitialState = () => {
        selectedDate = null;
        selectedSlot = null;
        currentDisplayDate = new Date();
        document.getElementById('booking-loader')?.classList.remove('hidden');
        document.getElementById('booking-view')?.classList.remove('hidden');
        document.getElementById('booking-success-view')?.classList.add('hidden');
        document.getElementById('booking-error-view')?.classList.add('hidden');
        document.getElementById('booking-footer')?.classList.add('hidden');
        const timeSlotsContainer = document.getElementById('time-slots-container');
        if (timeSlotsContainer)
            timeSlotsContainer.innerHTML = '';
        const timeSlotsHeader = document.getElementById('time-slots-header');
        if (timeSlotsHeader)
            timeSlotsHeader.textContent = '選擇時間';
        // Setup month navigation buttons
        setupMonthButtons();
    };
    const setupMonthButtons = () => {
        const prevMonthBtn = document.getElementById('prev-month-btn');
        const nextMonthBtn = document.getElementById('next-month-btn');
        if (prevMonthBtn && nextMonthBtn) {
            // Remove existing listeners by cloning
            const newPrevBtn = prevMonthBtn.cloneNode(true);
            const newNextBtn = nextMonthBtn.cloneNode(true);
            prevMonthBtn.replaceWith(newPrevBtn);
            nextMonthBtn.replaceWith(newNextBtn);
            // Add new listeners
            newPrevBtn.addEventListener('click', () => {
                currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
                renderCalendar();
            });
            newNextBtn.addEventListener('click', () => {
                currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
                renderCalendar();
            });
        }
    };
    async function initBookingSystem() {
        try {
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endDate = new Date();
            endDate.setDate(today.getDate() + BOOKING_DAYS_AHEAD);
            const response = await fetch(`${API_BASE_URL}/freebusy?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
            if (!response.ok)
                throw new Error(`API request failed`);
            const busySlotsISO = await response.json();
            busySlots = busySlotsISO.map((slot) => ({ start: new Date(slot.start), end: new Date(slot.end) }));
            findAvailableDays(startDate, endDate);
            renderCalendar();
            document.getElementById('booking-loader')?.classList.add('hidden');
        }
        catch (error) {
            console.error("Error fetching available slots:", error);
            showErrorState('無法載入可預約時段，請稍後再試。');
        }
    }
    function findAvailableDays(startDate, endDate) {
        availableDays.clear();
        for (let day = new Date(startDate); day <= endDate; day.setDate(day.getDate() + 1)) {
            const dayOfWeek = day.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6)
                continue;
            for (let hour = 9; hour < 17; hour++) {
                if (isSlotAvailable(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour))) {
                    availableDays.add(day.toDateString());
                    break;
                }
            }
        }
    }
    function isSlotAvailable(slotStart) {
        if (slotStart < new Date())
            return false;
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
        return !busySlots.some(busy => slotStart < busy.end && slotEnd > busy.start);
    }
    function renderCalendar() {
        const year = currentDisplayDate.getFullYear();
        const month = currentDisplayDate.getMonth();
        const monthYearLabel = document.getElementById('month-year-label');
        if (monthYearLabel)
            monthYearLabel.textContent = `${year}年 ${month + 1}月`;
        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid)
            return;
        calendarGrid.innerHTML = '';
        ['日', '一', '二', '三', '四', '五', '六'].forEach(day => {
            calendarGrid.innerHTML += `<div class="calendar-day-name">${day}</div>`;
        });
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.innerHTML += `<div></div>`;
        }
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + BOOKING_DAYS_AHEAD);
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dayOfWeek = date.getDay();
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            dayCell.textContent = i.toString();
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            if (date < startOfToday || date > maxDate || dayOfWeek === 0 || dayOfWeek === 6 || !availableDays.has(date.toDateString())) {
                dayCell.classList.add('disabled');
            }
            else {
                dayCell.classList.add('available');
                dayCell.addEventListener('click', () => {
                    selectedDate = date;
                    document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
                    dayCell.classList.add('selected');
                    renderTimeSlotsForDate(date);
                });
            }
            if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
                dayCell.classList.add('selected');
            }
            calendarGrid.appendChild(dayCell);
        }
        updateMonthButtons();
    }
    function updateMonthButtons() {
        const prevMonthBtn = document.getElementById('prev-month-btn');
        const nextMonthBtn = document.getElementById('next-month-btn');
        if (!prevMonthBtn || !nextMonthBtn)
            return;
        const today = new Date();
        prevMonthBtn.disabled = currentDisplayDate.getFullYear() === today.getFullYear() && currentDisplayDate.getMonth() === today.getMonth();
        const maxDate = new Date();
        maxDate.setDate(today.getDate() + BOOKING_DAYS_AHEAD);
        nextMonthBtn.disabled = currentDisplayDate.getFullYear() === maxDate.getFullYear() && currentDisplayDate.getMonth() === maxDate.getMonth();
    }
    function renderTimeSlotsForDate(date) {
        const timeSlotsContainer = document.getElementById('time-slots-container');
        const timeSlotsHeader = document.getElementById('time-slots-header');
        if (!timeSlotsContainer || !timeSlotsHeader)
            return;
        timeSlotsContainer.innerHTML = '';
        timeSlotsHeader.textContent = `${date.getMonth() + 1}月 ${date.getDate()}日 可預約時間`;
        let slotsFound = false;
        for (let hour = 9; hour < 17; hour++) {
            const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour);
            if (isSlotAvailable(slotStart)) {
                slotsFound = true;
                const slotButton = document.createElement('button');
                slotButton.className = 'time-slot available';
                slotButton.textContent = slotStart.toLocaleTimeString(i18n.getInitialLanguage(), { hour: '2-digit', minute: '2-digit', hour12: false });
                slotButton.addEventListener('click', () => {
                    selectedSlot = { start: slotStart, end: new Date(slotStart.getTime() + 60 * 60 * 1000) };
                    document.querySelectorAll('.time-slot.selected').forEach(b => b.classList.remove('selected'));
                    slotButton.classList.add('selected');
                    const bookingConfirmationText = document.getElementById('booking-confirmation-text');
                    if (bookingConfirmationText)
                        bookingConfirmationText.textContent = `您選擇了 ${date.toLocaleDateString(i18n.getInitialLanguage(), { month: 'long', day: 'numeric' })} ${slotButton.textContent} 的時段。`;
                    document.getElementById('booking-footer')?.classList.remove('hidden');
                });
                timeSlotsContainer.appendChild(slotButton);
            }
        }
        if (!slotsFound) {
            timeSlotsContainer.innerHTML = `<p class="text-subtle-light dark:text-subtle-dark col-span-full text-center mt-4">本日無可預約時段</p>`;
        }
    }
    async function handleBookingConfirmation() {
        if (!selectedSlot)
            return;
        const confirmBookingButton = document.getElementById('confirm-booking-button');
        if (confirmBookingButton) {
            confirmBookingButton.disabled = true;
            confirmBookingButton.textContent = '預約中...';
        }
        try {
            const response = await fetch(`${API_BASE_URL}/create-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start: selectedSlot.start.toISOString(),
                    end: selectedSlot.end.toISOString(),
                    summary: '線上諮詢預約',
                    description: '由個人履歷網站發出的預約。'
                }),
            });
            if (!response.ok)
                throw new Error('建立預約失敗');
            const event = await response.json();
            showSuccessState(event.htmlLink);
        }
        catch (error) {
            console.error('Error creating event:', error);
            showErrorState('抱歉，預約失敗，請稍後再試或直接與我聯繫。');
        }
        finally {
            if (confirmBookingButton) {
                confirmBookingButton.disabled = false;
                confirmBookingButton.textContent = '確認預約';
            }
        }
    }
    function showSuccessState(eventLink) {
        document.getElementById('booking-view')?.classList.add('hidden');
        document.getElementById('booking-footer')?.classList.add('hidden');
        document.getElementById('booking-error-view')?.classList.add('hidden');
        document.getElementById('booking-success-view')?.classList.remove('hidden');
        const successLink = document.getElementById('success-event-link');
        if (successLink)
            successLink.href = eventLink;
        document.getElementById('booking-done-btn')?.addEventListener('click', closeModal, { once: true });
    }
    function showErrorState(message) {
        document.getElementById('booking-view')?.classList.add('hidden');
        document.getElementById('booking-footer')?.classList.add('hidden');
        document.getElementById('booking-success-view')?.classList.add('hidden');
        document.getElementById('booking-error-view')?.classList.remove('hidden');
        const errorMessageText = document.getElementById('error-message-text');
        if (errorMessageText)
            errorMessageText.textContent = message;
        document.getElementById('booking-retry-btn')?.addEventListener('click', () => {
            resetModalToInitialState();
            initBookingSystem();
        }, { once: true });
    }
    // Set up initial event listeners
    document.querySelectorAll('#booking-button, #booking-button-footer').forEach(btn => btn?.addEventListener('click', openModal));
    document.getElementById('booking-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('booking-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'booking-modal')
            closeModal();
    });
    document.getElementById('confirm-booking-button')?.addEventListener('click', handleBookingConfirmation);
});
