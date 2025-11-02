
// Define types for our translation objects for type safety
type LanguageTranslations = { [key: string]: string };
type AllTranslations = { [language: string]: LanguageTranslations };

document.addEventListener('DOMContentLoaded', () => {
  const i18n = {
    translations: {} as AllTranslations,
    availableLanguages: ['en', 'zh-TW'],

    async loadTranslations() {
      try {
        const response = await fetch('translations.json');
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
        return;
      }

      document.documentElement.lang = language;

      const elements = document.querySelectorAll('[data-i18n-key]');
      elements.forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        if (key && this.translations[language][key]) {
          if (element.tagName === 'TITLE') {
            element.textContent = this.translations[language][key];
          } else {
            (element as HTMLElement).innerHTML = this.translations[language][key];
          }
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
      if (!languageSelector) return;

      this.loadTranslations().then(() => {
        const initialLang = this.getInitialLanguage();
        languageSelector.value = initialLang;
        this.translatePage(initialLang);

        languageSelector.addEventListener('change', (e) => {
          const newLang = (e.target as HTMLSelectElement).value;
          localStorage.setItem('language', newLang);
          this.translatePage(newLang);
        });
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
  skillBubbles.forEach(bubble => {
    bubble.addEventListener('click', () => {
      // Deactivate other active bubbles
      skillBubbles.forEach(otherBubble => {
        if (otherBubble !== bubble) {
          otherBubble.classList.remove('active');
        }
      });
      // Toggle the current bubble
      bubble.classList.toggle('active');
    });
    bubble.removeAttribute('onclick');
  });
});
