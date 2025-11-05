
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
  const skillBubbles = document.querySelectorAll('.skill-bubble');
  
  // 函數：檢查兩個矩形是否重疊
  function rectanglesOverlap(rect1: DOMRect, rect2: DOMRect, padding: number = 10): boolean {
    return !(
      rect1.right + padding < rect2.left ||
      rect1.left - padding > rect2.right ||
      rect1.bottom + padding < rect2.top ||
      rect1.top - padding > rect2.bottom
    );
  }

  // 函數：調整彈出框位置，確保不會超出視窗邊界且不被其他 bubble 擋到
  function adjustSubSkillsPosition(bubble: Element) {
    const subSkills = bubble.querySelector('.sub-skills') as HTMLElement;
    if (!subSkills) return;

    // 確保彈出框已顯示才能獲取正確尺寸
    if (subSkills.style.display === 'none' || getComputedStyle(subSkills).display === 'none') {
      subSkills.style.visibility = 'hidden';
      subSkills.style.display = 'block';
    }

    // 使用 requestAnimationFrame 確保 DOM 已更新
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const bubbleRect = bubble.getBoundingClientRect();
        const subSkillsRect = subSkills.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 16; // 視窗邊緣的留白
        const verticalOffset = 12; // 向上偏移
        const bubbleSpacing = 40; // 與其他 bubble 的間距（增加以確保不重疊）

        // 獲取所有其他 skill bubbles 的位置
        const otherBubbles: DOMRect[] = [];
        skillBubbles.forEach(otherBubble => {
          if (otherBubble !== bubble) {
            otherBubbles.push(otherBubble.getBoundingClientRect());
          }
        });

        // 獲取彈出框的實際寬度和高度
        const popupWidth = subSkillsRect.width;
        const popupHeight = subSkillsRect.height;

        // 計算理想的左側位置（氣泡中心對齊）
        let left = bubbleRect.left + (bubbleRect.width / 2);
        
        // 檢查並調整左側位置，確保不超出視窗
        if (left - popupWidth / 2 < padding) {
          // 左側會超出，調整到左側留白位置
          left = padding + popupWidth / 2;
        } else if (left + popupWidth / 2 > viewportWidth - padding) {
          // 右側會超出，調整到右側留白位置
          left = viewportWidth - padding - popupWidth / 2;
        }

        // 計算垂直位置（優先顯示在氣泡上方）
        let top = bubbleRect.top - popupHeight - padding - verticalOffset;
        let showBelow = false;
        
        // 如果上方空間不夠，改為顯示在下方
        if (top < padding) {
          top = bubbleRect.bottom + padding + verticalOffset;
          showBelow = true;
        }

        // 創建彈出框的矩形表示
        const getPopupRect = (l: number, t: number): DOMRect => {
          return new DOMRect(l, t, popupWidth, popupHeight);
        };

        // 檢查是否與任何 bubble 重疊
        const hasAnyOverlap = (rect: DOMRect): boolean => {
          for (const otherBubbleRect of otherBubbles) {
            if (rectanglesOverlap(rect, otherBubbleRect, bubbleSpacing)) {
              return true;
            }
          }
          return false;
        };

        // 初始位置
        let popupLeft = left - popupWidth / 2;
        let popupTop = top;
        let popupRect = getPopupRect(popupLeft, popupTop);
        let hasOverlap = hasAnyOverlap(popupRect);
        const maxIterations = 10; // 防止無限循環
        let iterations = 0;

        // 如果上方有重疊，先嘗試移到下方
        if (hasOverlap && !showBelow) {
          popupTop = bubbleRect.bottom + padding + verticalOffset;
          popupRect = getPopupRect(popupLeft, popupTop);
          hasOverlap = hasAnyOverlap(popupRect);
          if (!hasOverlap) {
            showBelow = true;
          }
        }

        // 更積極的重疊檢測和調整：嘗試所有可能的位置組合
        let bestPosition: { left: number; top: number; score: number } | null = null;
        
        // 生成候選位置：上方、下方、左側、右側，以及各種組合
        const generateCandidatePositions = () => {
          const candidates: Array<{ left: number; top: number }> = [];
          
          // 上方位置（優先）
          const topY = bubbleRect.top - popupHeight - padding - verticalOffset;
          if (topY >= padding) {
            candidates.push({ left: bubbleRect.left + bubbleRect.width / 2, top: topY });
          }
          
          // 下方位置
          const bottomY = bubbleRect.bottom + padding + verticalOffset;
          if (bottomY + popupHeight <= viewportHeight - padding) {
            candidates.push({ left: bubbleRect.left + bubbleRect.width / 2, top: bottomY });
          }
          
          // 左側位置
          const leftX = bubbleRect.left - popupWidth - padding;
          if (leftX >= padding) {
            candidates.push({ left: leftX + popupWidth / 2, top: bubbleRect.top + bubbleRect.height / 2 - popupHeight / 2 });
          }
          
          // 右側位置
          const rightX = bubbleRect.right + padding + popupWidth;
          if (rightX <= viewportWidth - padding) {
            candidates.push({ left: rightX - popupWidth / 2, top: bubbleRect.top + bubbleRect.height / 2 - popupHeight / 2 });
          }
          
          // 對角線位置
          if (topY >= padding) {
            // 左上
            if (bubbleRect.left - popupWidth >= padding) {
              candidates.push({ left: bubbleRect.left - popupWidth / 2 - padding, top: topY });
            }
            // 右上
            if (bubbleRect.right + popupWidth <= viewportWidth - padding) {
              candidates.push({ left: bubbleRect.right + popupWidth / 2 + padding, top: topY });
            }
          }
          
          if (bottomY + popupHeight <= viewportHeight - padding) {
            // 左下
            if (bubbleRect.left - popupWidth >= padding) {
              candidates.push({ left: bubbleRect.left - popupWidth / 2 - padding, top: bottomY });
            }
            // 右下
            if (bubbleRect.right + popupWidth <= viewportWidth - padding) {
              candidates.push({ left: bubbleRect.right + popupWidth / 2 + padding, top: bottomY });
            }
          }
          
          return candidates;
        };
        
        const candidates = generateCandidatePositions();
        
        // 評分每個候選位置（優先選擇沒有重疊的位置，距離氣泡越近越好）
        for (const candidate of candidates) {
          // 確保在視窗範圍內
          const candidateLeft = Math.max(padding + popupWidth / 2, Math.min(viewportWidth - padding - popupWidth / 2, candidate.left));
          const candidateTop = Math.max(padding, Math.min(viewportHeight - padding - popupHeight, candidate.top));
          
          const candidateRect = getPopupRect(candidateLeft - popupWidth / 2, candidateTop);
          const overlaps = hasAnyOverlap(candidateRect);
          
          if (!overlaps) {
            // 計算距離原氣泡的距離（作為評分，距離越近分數越高）
            const distance = Math.sqrt(
              Math.pow(candidateLeft - (bubbleRect.left + bubbleRect.width / 2), 2) +
              Math.pow(candidateTop + popupHeight / 2 - (bubbleRect.top + bubbleRect.height / 2), 2)
            );
            const score = 1000 - distance; // 沒有重疊的位置得分很高
            
            if (!bestPosition || score > bestPosition.score) {
              bestPosition = { left: candidateLeft, top: candidateTop, score };
            }
          }
        }
        
        // 如果找到最佳位置，使用它
        if (bestPosition) {
          left = bestPosition.left;
          top = bestPosition.top;
          popupLeft = left - popupWidth / 2;
          popupTop = top;
          hasOverlap = false;
        } else {
          // 如果所有候選位置都有重疊，使用初始位置並嘗試迭代調整
          popupLeft = left - popupWidth / 2;
          popupTop = top;
          popupRect = getPopupRect(popupLeft, popupTop);
          hasOverlap = hasAnyOverlap(popupRect);
          
          // 如果上方有重疊，先嘗試移到下方
          if (hasOverlap && !showBelow) {
            popupTop = bubbleRect.bottom + padding + verticalOffset;
            popupRect = getPopupRect(popupLeft, popupTop);
            hasOverlap = hasAnyOverlap(popupRect);
            if (!hasOverlap) {
              showBelow = true;
            }
          }
          
          let iterations = 0;
          while (hasOverlap && iterations < maxIterations) {
            iterations++;
            let foundSolution = false;

            // 策略1: 逐步向上移動（如果在下方的話）
            if (showBelow) {
              const testTop = popupTop - bubbleSpacing;
              if (testTop >= padding) {
                const testRect = getPopupRect(popupLeft, testTop);
                if (!hasAnyOverlap(testRect)) {
                  popupTop = testTop;
                  popupRect = testRect;
                  hasOverlap = false;
                  foundSolution = true;
                  break;
                }
              }
            }

            // 策略2: 逐步向右移動
            if (!foundSolution) {
              const testLeft = left + bubbleSpacing;
              if (testLeft + popupWidth / 2 <= viewportWidth - padding) {
                const testCenterX = testLeft;
                const testLeftPos = testCenterX - popupWidth / 2;
                const testRect = getPopupRect(testLeftPos, popupTop);
                if (!hasAnyOverlap(testRect)) {
                  left = testCenterX;
                  popupLeft = testLeftPos;
                  popupRect = testRect;
                  hasOverlap = false;
                  foundSolution = true;
                  break;
                }
              }
            }

            // 策略3: 逐步向左移動
            if (!foundSolution) {
              const testLeft = left - bubbleSpacing;
              if (testLeft - popupWidth / 2 >= padding) {
                const testCenterX = testLeft;
                const testLeftPos = testCenterX - popupWidth / 2;
                const testRect = getPopupRect(testLeftPos, popupTop);
                if (!hasAnyOverlap(testRect)) {
                  left = testCenterX;
                  popupLeft = testLeftPos;
                  popupRect = testRect;
                  hasOverlap = false;
                  foundSolution = true;
                  break;
                }
              }
            }

            // 策略4: 移到視窗邊緣
            if (!foundSolution) {
              // 嘗試移到最右邊
              const rightX = viewportWidth - padding - popupWidth / 2;
              const testRect = getPopupRect(rightX - popupWidth / 2, popupTop);
              if (!hasAnyOverlap(testRect)) {
                left = rightX;
                popupLeft = left - popupWidth / 2;
                popupRect = testRect;
                hasOverlap = false;
                break;
              }
              
              // 嘗試移到最左邊
              const leftX = padding + popupWidth / 2;
              const testRect2 = getPopupRect(leftX - popupWidth / 2, popupTop);
              if (!hasAnyOverlap(testRect2)) {
                left = leftX;
                popupLeft = left - popupWidth / 2;
                popupRect = testRect2;
                hasOverlap = false;
                break;
              }
            }
            
            if (!foundSolution) {
              break; // 無法找到更好的位置
            }
          }
        }
        
        // 更新最終位置
        top = popupTop;
        if (!bestPosition) {
          // 如果使用迭代調整，確保 popupTop 已更新
          popupTop = top;
        }

        // 最後確保不會超出視窗邊界
        if (left - popupWidth / 2 < padding) {
          left = padding + popupWidth / 2;
        } else if (left + popupWidth / 2 > viewportWidth - padding) {
          left = viewportWidth - padding - popupWidth / 2;
        }

        if (top < padding) {
          top = padding;
        } else if (top + popupHeight > viewportHeight - padding) {
          top = viewportHeight - padding - popupHeight;
        }

        // 應用位置（使用 fixed 定位，直接設置 left 和 top）
        subSkills.style.left = `${left}px`;
        subSkills.style.top = `${top}px`;
        subSkills.style.transform = 'translate(-50%, 0)';
        subSkills.style.visibility = 'visible';
      });
    });
  }

  skillBubbles.forEach(bubble => {
    bubble.addEventListener('click', () => {
      // Deactivate other active bubbles
      skillBubbles.forEach(otherBubble => {
        if (otherBubble !== bubble) {
          otherBubble.classList.remove('active');
          const otherSubSkills = otherBubble.querySelector('.sub-skills') as HTMLElement;
          if (otherSubSkills) {
            otherSubSkills.style.left = '';
            otherSubSkills.style.top = '';
            otherSubSkills.style.transform = '';
            otherSubSkills.style.visibility = '';
          }
        }
      });
      // Toggle the current bubble
      bubble.classList.toggle('active');
      
      // 如果彈出框顯示，調整位置
      if (bubble.classList.contains('active')) {
        adjustSubSkillsPosition(bubble);
      } else {
        const subSkills = bubble.querySelector('.sub-skills') as HTMLElement;
        if (subSkills) {
          subSkills.style.left = '';
          subSkills.style.top = '';
          subSkills.style.transform = '';
          subSkills.style.visibility = '';
        }
      }
    });
    bubble.removeAttribute('onclick');
  });

  // 視窗大小改變時重新調整位置
  window.addEventListener('resize', () => {
    skillBubbles.forEach(bubble => {
      if (bubble.classList.contains('active')) {
        adjustSubSkillsPosition(bubble);
      }
    });
  });

  // --- Booking Modal Logic ---
  const isProduction = window.location.hostname.includes('github.io');
  // TODO: Replace with your deployed backend URL in production
  const API_BASE_URL = isProduction ? 'https://your-backend-url.com' : 'http://localhost:3000';
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
