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
            // Handle placeholder translations
            const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
            placeholderElements.forEach(element => {
                const key = element.getAttribute('data-i18n-placeholder');
                if (key && this.translations[language][key]) {
                    element.placeholder = this.translations[language][key];
                }
            });
            // Update time-slots-container empty state text
            const timeSlotsContainer = document.getElementById('time-slots-container');
            if (timeSlotsContainer) {
                const selectDateFirstText = this.translations[language]?.['bookingSelectDateFirst'] || '請先從上方日曆選擇一個可預約的日期';
                timeSlotsContainer.setAttribute('data-empty-text', selectDateFirstText);
            }
            // Re-render calendar if modal is open to update month/year and weekday names
            const bookingModal = document.getElementById('booking-modal');
            if (bookingModal && !bookingModal.classList.contains('hidden')) {
                // Check if renderCalendar function exists (it's defined after DOMContentLoaded)
                if (typeof window.renderCalendarForLanguageSwitch === 'function') {
                    window.renderCalendarForLanguageSwitch();
                }
            }
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
        const currentLang = i18n.getInitialLanguage();
        if (timeSlotsHeader)
            timeSlotsHeader.textContent = i18n.translations[currentLang]?.['bookingSelectTime'] || '選擇時間';
        // Reset form
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm)
            bookingForm.reset();
        // Hide form errors
        hideFormErrors();
        // Clear error states
        document.getElementById('booking-name')?.classList.remove('border-red-500');
        document.getElementById('booking-email')?.classList.remove('border-red-500');
        document.getElementById('booking-phone')?.classList.remove('border-red-500');
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
        const currentLang = i18n.getInitialLanguage();
        const monthYearLabel = document.getElementById('month-year-label');
        if (monthYearLabel) {
            if (currentLang === 'en') {
                // Format: December 2025
                monthYearLabel.textContent = currentDisplayDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            }
            else {
                // Format: 2025年 12月
                monthYearLabel.textContent = `${year}年 ${month + 1}月`;
            }
        }
        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid)
            return;
        calendarGrid.innerHTML = '';
        // Week day names based on language
        const weekDays = currentLang === 'en'
            ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            : ['日', '一', '二', '三', '四', '五', '六'];
        weekDays.forEach(day => {
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
                    selectedSlot = null; // Reset selected slot when changing date
                    document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
                    dayCell.classList.add('selected');
                    // Hide footer with form when switching dates
                    const footer = document.getElementById('booking-footer');
                    if (footer && !footer.classList.contains('hidden')) {
                        footer.classList.add('hidden');
                    }
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
        const currentLang = i18n.getInitialLanguage();
        // Set empty state text
        const selectDateFirstText = i18n.translations[currentLang]?.['bookingSelectDateFirst'] || '請先從上方日曆選擇一個可預約的日期';
        timeSlotsContainer.setAttribute('data-empty-text', selectDateFirstText);
        const availableSlotsText = i18n.translations[currentLang]?.['bookingAvailableSlots'] || '可預約時間';
        const dateStr = currentLang === 'en'
            ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
            : `${date.getMonth() + 1}月 ${date.getDate()}日`;
        timeSlotsHeader.textContent = `${dateStr} ${availableSlotsText}`;
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
                    const currentLang = i18n.getInitialLanguage();
                    const selectedText = i18n.translations[currentLang]?.['bookingSelectedSlot'] || '您選擇了';
                    const dateStr = date.toLocaleDateString(currentLang, { month: 'long', day: 'numeric' });
                    if (bookingConfirmationText)
                        bookingConfirmationText.textContent = `${selectedText} ${dateStr} ${slotButton.textContent}`;
                    document.getElementById('booking-footer')?.classList.remove('hidden');
                });
                timeSlotsContainer.appendChild(slotButton);
            }
        }
        if (!slotsFound) {
            const currentLang = i18n.getInitialLanguage();
            const noSlotsText = i18n.translations[currentLang]?.['bookingNoSlots'] || '本日無可預約時段';
            timeSlotsContainer.innerHTML = `<p class="text-subtle-light dark:text-subtle-dark col-span-full text-center mt-4">${noSlotsText}</p>`;
        }
    }
    function showFormErrors(errors) {
        const errorMessage = document.getElementById('form-error-message');
        const errorList = document.getElementById('form-error-list');
        if (errorMessage && errorList) {
            errorList.innerHTML = errors.map(error => `<li>${error}</li>`).join('');
            errorMessage.classList.remove('hidden');
            // Scroll to error message
            errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            // Auto hide after 5 seconds
            setTimeout(() => {
                errorMessage.classList.add('hidden');
            }, 5000);
        }
    }
    function hideFormErrors() {
        const errorMessage = document.getElementById('form-error-message');
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }
    }
    function validateBookingForm() {
        const form = document.getElementById('booking-form');
        const nameInput = document.getElementById('booking-name');
        const emailInput = document.getElementById('booking-email');
        const phoneInput = document.getElementById('booking-phone');
        const topicInput = document.getElementById('booking-topic');
        const errors = [];
        const currentLang = i18n.getInitialLanguage();
        // Clear all previous error states
        nameInput?.classList.remove('border-red-500');
        emailInput?.classList.remove('border-red-500');
        phoneInput?.classList.remove('border-red-500');
        // Validate name
        const name = nameInput?.value.trim();
        if (!name) {
            errors.push(i18n.translations[currentLang]?.['bookingValidationNameRequired'] || '請輸入您的姓名');
            nameInput?.classList.add('border-red-500');
        }
        // Validate email
        const email = emailInput?.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            errors.push(i18n.translations[currentLang]?.['bookingValidationEmailRequired'] || '請輸入您的 Email');
            emailInput?.classList.add('border-red-500');
        }
        else if (!emailRegex.test(email)) {
            errors.push(i18n.translations[currentLang]?.['bookingValidationEmailInvalid'] || '請輸入有效的 Email 格式');
            emailInput?.classList.add('border-red-500');
        }
        // Validate phone (optional, but if filled must be valid)
        const phone = phoneInput?.value.trim();
        if (phone) {
            // Taiwan phone number format: 09XX-XXX-XXX or 09XXXXXXXX
            // Also accept international format: +886-9XX-XXX-XXX
            const phoneRegex = /^(\+886[-\s]?)?0?9\d{2}[-\s]?\d{3}[-\s]?\d{3}$/;
            if (!phoneRegex.test(phone)) {
                errors.push(i18n.translations[currentLang]?.['bookingValidationPhoneInvalid'] || '請輸入有效的電話號碼格式');
                phoneInput?.classList.add('border-red-500');
            }
        }
        if (errors.length > 0) {
            return { isValid: false, errors };
        }
        return {
            isValid: true,
            data: {
                name,
                email,
                phone: phone || '',
                topic: topicInput?.value.trim() || ''
            }
        };
    }
    async function handleBookingConfirmation() {
        if (!selectedSlot)
            return;
        // Validate form
        const validation = validateBookingForm();
        if (!validation.isValid) {
            showFormErrors(validation.errors || []);
            return;
        }
        // Hide any previous errors
        hideFormErrors();
        const { name, email, phone, topic } = validation.data;
        const confirmBookingButton = document.getElementById('confirm-booking-button');
        const currentLang = i18n.getInitialLanguage();
        if (confirmBookingButton) {
            confirmBookingButton.disabled = true;
            confirmBookingButton.textContent = i18n.translations[currentLang]?.['bookingSubmitting'] || '預約中...';
        }
        try {
            // Build event description with contact info
            const dateTimeStr = selectedSlot.start.toLocaleString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            let description = `📅 預約時間：${dateTimeStr}\n\n`;
            description += `👤 預約人：${name}\n`;
            description += `📧 Email：${email}\n`;
            if (phone)
                description += `📱 電話：${phone}\n`;
            if (topic)
                description += `\n💬 諮詢主題：\n${topic}\n`;
            description += `\n---\n由個人履歷網站預約系統發出`;
            const summary = `線上諮詢 - ${name}`;
            const response = await fetch(`${API_BASE_URL}/create-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start: selectedSlot.start.toISOString(),
                    end: selectedSlot.end.toISOString(),
                    summary: summary,
                    description: description,
                    attendees: [email]
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
                confirmBookingButton.textContent = i18n.translations[currentLang]?.['confirmBookingButton'] || '確認預約';
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
        const currentLang = i18n.getInitialLanguage();
        const errorMessageText = document.getElementById('error-message-text');
        if (errorMessageText)
            errorMessageText.textContent = message || i18n.translations[currentLang]?.['bookingErrorMessage'] || '發生錯誤，請稍後再試。';
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
    // Expose renderCalendar to window for language switch
    window.renderCalendarForLanguageSwitch = renderCalendar;
});
