
// Define types for our translation objects for type safety
type LanguageTranslations = { [key: string]: string };
type AllTranslations = { [language: string]: LanguageTranslations };

document.addEventListener('DOMContentLoaded', () => {
  const i18n = {
    translations: {} as AllTranslations,
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
      } catch (error) {
        console.error("Could not load translations:", error);
      }
    },

    translatePage(language: string) {
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
          } else if (element.tagName === 'SPAN' && element.parentElement?.classList.contains('skill-bubble')) {
            // Skill bubble 的 span，只更新文字
            element.textContent = this.translations[language][key];
          } else if (element.classList.contains('sub-skills')) {
            // Sub-skills div，只更新文字
            element.textContent = this.translations[language][key];
          } else {
            // 其他元素，使用 innerHTML 以支持 HTML
            (element as HTMLElement).innerHTML = this.translations[language][key];
          }
        } else if (key) {
          console.warn(`Translation key "${key}" not found for language "${language}"`);
        }
      });
    },

    getInitialLanguage(): string {
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
      const languageSelector = document.getElementById('language-selector') as HTMLSelectElement;
      if (!languageSelector) {
        console.error('Language selector not found!');
        return;
      }

      this.loadTranslations().then(() => {
        const initialLang = this.getInitialLanguage();
        languageSelector.value = initialLang;
        this.translatePage(initialLang);
        
        languageSelector.addEventListener('change', (e) => {
          const newLang = (e.target as HTMLSelectElement).value;
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
  const aboutMeArrow = document.getElementById('about-me-arrow') as HTMLElement;

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
    let activeBubble: Element | null = null;
    let detailsContainer: HTMLElement | null = null;
    let isAnimating = false;

    const getRows = () => {
        const rows: Element[][] = [];
        if (skillBubbles.length === 0) return { rows, bubbleToRowMap: new Map() };
        const sortedBubbles = [...skillBubbles].sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            if (Math.abs(rectA.top - rectB.top) > 10) return rectA.top - rectB.top;
            return rectA.left - rectB.left;
        });
        const bubbleToRowMap = new Map<Element, Element[]>();
        if (sortedBubbles.length > 0) {
            let currentRow = [sortedBubbles[0]];
            rows.push(currentRow);
            bubbleToRowMap.set(sortedBubbles[0], currentRow);
            for (let i = 1; i < sortedBubbles.length; i++) {
                const bubble = sortedBubbles[i];
                const prevBubble = sortedBubbles[i-1];
                if (Math.abs(bubble.getBoundingClientRect().top - prevBubble.getBoundingClientRect().top) < 10) {
                    currentRow.push(bubble);
                } else {
                    currentRow = [bubble];
                    rows.push(currentRow);
                }
                bubbleToRowMap.set(bubble, currentRow);
            }
        }
        return { rows, bubbleToRowMap };
    };

    const openDetails = (bubble: Element) => {
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
            if (isAnimating) return;

            const isCurrentlyActive = bubble === activeBubble;
            isAnimating = true;

            if (detailsContainer) {
                const containerToClose = detailsContainer;
                const transitionPromise = new Promise<void>(resolve => {
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
            } else {
                isAnimating = false;
            }
        });
    });

    document.addEventListener('click', (event) => {
        if (isAnimating || !detailsContainer) return;
        const target = event.target as HTMLElement;
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
        if (isAnimating || !activeBubble || !detailsContainer) return;
        const { bubbleToRowMap } = getRows();
        const currentRow = bubbleToRowMap.get(activeBubble);
        if (currentRow) {
            const lastElementInRow = currentRow[currentRow.length - 1];
            lastElementInRow.after(detailsContainer);
        }
    });
  }

  // --- Booking Modal Logic ---
  const isProduction = window.location.hostname.includes('github.io');
  // TODO: Replace with your deployed backend URL in production
  const API_BASE_URL = isProduction ? 'https://booking-server-110187416117.asia-east1.run.app' : 'http://localhost:3000';
  const bookingModal = document.getElementById('booking-modal') as HTMLElement;
  const bookingButton = document.getElementById('booking-button') as HTMLElement;
  const bookingButtonFooter = document.getElementById('booking-button-footer') as HTMLElement;
  const closeModalButton = document.getElementById('booking-modal-close') as HTMLElement;
  const bookingLoader = document.getElementById('booking-loader') as HTMLElement;
  const bookingContent = document.getElementById('booking-content') as HTMLElement;
  const timeSlotsContainer = document.getElementById('time-slots-container') as HTMLElement;
  const bookingFooter = document.getElementById('booking-footer') as HTMLElement;
  const bookingConfirmationText = document.getElementById('booking-confirmation-text') as HTMLElement;
  const confirmBookingButton = document.getElementById('confirm-booking-button') as HTMLButtonElement;

  let selectedSlot: { start: Date, end: Date } | null = null;

  const openModal = () => {
    bookingModal.classList.remove('hidden');
    bookingModal.classList.add('flex');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    fetchAndDisplayAvailableSlots();
  };

  const closeModal = () => {
    bookingModal.classList.add('hidden');
    bookingModal.classList.remove('flex');
    document.body.style.overflow = '';
    // Reset modal state
    timeSlotsContainer.innerHTML = '';
    bookingLoader.style.display = 'block';
    bookingContent.classList.add('hidden');
    bookingFooter.classList.add('hidden');
    selectedSlot = null;
  };

  bookingButton.addEventListener('click', openModal);
  bookingButtonFooter.addEventListener('click', openModal);
  closeModalButton.addEventListener('click', closeModal);
  // Close modal if clicking on the background overlay
  bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) {
      closeModal();
    }
  });

  async function fetchAndDisplayAvailableSlots() {
    bookingLoader.style.display = 'block';
    bookingContent.classList.add('hidden');
    timeSlotsContainer.innerHTML = ''; // Clear previous slots

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14); // 14 days from now

    const apiURL = `${API_BASE_URL}/freebusy?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;

    try {
      const response = await fetch(apiURL);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const busySlots: { start: string, end: string }[] = await response.json();
      renderTimeSlots(startDate, endDate, busySlots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      timeSlotsContainer.innerHTML = `<p class="text-red-500 col-span-full text-center">無法載入可預約時段，請稍後再試。</p>`;
    } finally {
      bookingLoader.style.display = 'none';
      bookingContent.classList.remove('hidden');
    }
  }

  function renderTimeSlots(startDate: Date, endDate: Date, busySlots: { start: string, end: string }[]) {
    timeSlotsContainer.innerHTML = ''; // Clear again before rendering
    const busyIntervals = busySlots.map(slot => ({ start: new Date(slot.start), end: new Date(slot.end) }));

    const slotDurationMinutes = 60;
    let availableSlotsFound = false;

    for (let day = new Date(startDate); day < endDate; day.setDate(day.getDate() + 1)) {
      // Define business hours (e.g., 9 AM to 5 PM in local time)
      const businessHoursStart = 9;
      const businessHoursEnd = 17;
      const dayOfWeek = day.getDay(); // Sunday = 0, Saturday = 6

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      const dayContainer = document.createElement('div');
      dayContainer.className = 'col-span-full';
      
      const dayHeader = document.createElement('h3');
      dayHeader.className = 'text-lg font-semibold text-text-light dark:text-text-dark mt-4 mb-2 border-b pb-2';
      dayHeader.textContent = day.toLocaleDateString(i18n.getInitialLanguage(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      dayContainer.appendChild(dayHeader);
      timeSlotsContainer.appendChild(dayContainer);

      for (let hour = businessHoursStart; hour < businessHoursEnd; hour++) {
        const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000);

        // Check if the slot is in the past
        if (slotStart < new Date()) {
          continue;
        }

        // Check for overlap with busy intervals
        const isBusy = busyIntervals.some(busy => 
          (slotStart < busy.end && slotEnd > busy.start)
        );

        if (!isBusy) {
          availableSlotsFound = true;
          const slotButton = document.createElement('button');
          slotButton.className = 'time-slot available';
          slotButton.textContent = slotStart.toLocaleTimeString(i18n.getInitialLanguage(), { hour: '2-digit', minute: '2-digit', hour12: false });
          slotButton.dataset.slotStart = slotStart.toISOString();
          slotButton.dataset.slotEnd = slotEnd.toISOString();

          slotButton.addEventListener('click', () => {
            // Remove selected class from any previously selected slot
            const currentlySelected = timeSlotsContainer.querySelector('.time-slot.selected');
            if (currentlySelected) {
              currentlySelected.classList.remove('selected');
            }

            // Add selected class to the clicked slot
            slotButton.classList.add('selected');
            selectedSlot = { start: slotStart, end: slotEnd };

            // Show footer with confirmation
            bookingConfirmationText.textContent = `您選擇了 ${day.toLocaleDateString(i18n.getInitialLanguage(), { month: 'long', day: 'numeric' })} ${slotButton.textContent} 的時段。`;
            bookingFooter.classList.remove('hidden');
          });

          timeSlotsContainer.appendChild(slotButton);
        }
      }
    }

    if (!availableSlotsFound) {
        timeSlotsContainer.innerHTML = `<p class="text-gray-500 col-span-full text-center">抱歉，未來兩週內沒有可預約的時段。</p>`;
    }
  }

  confirmBookingButton.addEventListener('click', async () => {
    if (selectedSlot) {
      confirmBookingButton.disabled = true;
      confirmBookingButton.textContent = '預約中...';

      try {
        const response = await fetch(`${API_BASE_URL}/create-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start: selectedSlot.start.toISOString(),
            end: selectedSlot.end.toISOString(),
            summary: '線上諮詢預約',
            description: '由個人履歷網站發出的預約。'
          }),
        });

        if (!response.ok) {
          throw new Error('建立預約失敗');
        }

        const event = await response.json();
        alert(`預約成功！\n活動已建立在您的 Google 日曆中。\n活動連結：${event.htmlLink}`);
        closeModal();

      } catch (error) {
        console.error('Error creating event:', error);
        alert('抱歉，預約失敗，請稍後再試。');
      } finally {
        confirmBookingButton.disabled = false;
        confirmBookingButton.textContent = '確認預約';
      }

    } else {
        alert("請先選擇一個時段。");
    }
  });

});
