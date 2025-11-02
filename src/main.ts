
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
        const bubbleSpacing = 20; // 與其他 bubble 的間距

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

        // 嘗試多種位置調整策略
        while (hasOverlap && iterations < maxIterations) {
          iterations++;
          let foundSolution = false;

          // 策略1: 向上移動（如果在下方的話）
          if (showBelow) {
            const testTop = popupTop - popupHeight - bubbleSpacing;
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

          // 策略2: 向右移動
          if (!foundSolution) {
            const centerX = left + bubbleSpacing + popupWidth / 2;
            if (centerX + popupWidth / 2 <= viewportWidth - padding) {
              const testLeft = centerX - popupWidth / 2;
              const testRect = getPopupRect(testLeft, popupTop);
              if (!hasAnyOverlap(testRect)) {
                popupLeft = testLeft;
                left = centerX;
                popupRect = testRect;
                hasOverlap = false;
                foundSolution = true;
                break;
              }
            }
          }

          // 策略3: 向左移動
          if (!foundSolution) {
            const centerX = left - bubbleSpacing - popupWidth / 2;
            if (centerX - popupWidth / 2 >= padding) {
              const testLeft = centerX - popupWidth / 2;
              const testRect = getPopupRect(testLeft, popupTop);
              if (!hasAnyOverlap(testRect)) {
                popupLeft = testLeft;
                left = centerX;
                popupRect = testRect;
                hasOverlap = false;
                foundSolution = true;
                break;
              }
            }
          }

          // 策略4: 向上移動更多（如果在下方）
          if (!foundSolution && showBelow) {
            popupTop = bubbleRect.top - popupHeight - padding - verticalOffset - bubbleSpacing;
            if (popupTop >= padding) {
              popupRect = getPopupRect(popupLeft, popupTop);
              if (!hasAnyOverlap(popupRect)) {
                showBelow = false;
                hasOverlap = false;
                foundSolution = true;
                break;
              }
            }
          }

          // 策略5: 移動到右側較遠的位置
          if (!foundSolution) {
            const rightBound = viewportWidth - padding - popupWidth / 2;
            if (rightBound > left) {
              left = rightBound;
              popupLeft = left - popupWidth / 2;
              popupRect = getPopupRect(popupLeft, popupTop);
              hasOverlap = hasAnyOverlap(popupRect);
              if (!hasOverlap) {
                foundSolution = true;
                break;
              }
            }
          }

          // 策略6: 移動到左側較遠的位置
          if (!foundSolution) {
            const leftBound = padding + popupWidth / 2;
            if (leftBound < left) {
              left = leftBound;
              popupLeft = left - popupWidth / 2;
              popupRect = getPopupRect(popupLeft, popupTop);
              hasOverlap = hasAnyOverlap(popupRect);
              if (!hasOverlap) {
                foundSolution = true;
                break;
              }
            }
          }

          // 如果所有策略都失敗，跳出循環（至少嘗試過避免重疊）
          if (!foundSolution) {
            break;
          }
        }
        
        // 更新最終位置
        top = popupTop;

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
});
