"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
document.addEventListener('DOMContentLoaded', () => {
    const i18n = {
        translations: {},
        availableLanguages: ['en', 'zh-TW'],
        loadTranslations() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    // 使用相對於當前頁面的路徑，確保在任何部署環境下都能正常工作
                    const translationsUrl = new URL('translations.json', window.location.href);
                    const response = yield fetch(translationsUrl);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    this.translations = yield response.json();
                }
                catch (error) {
                    console.error("Could not load translations:", error);
                }
            });
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
                var _a;
                const key = element.getAttribute('data-i18n-key');
                if (key && this.translations[language][key]) {
                    if (element.tagName === 'TITLE') {
                        element.textContent = this.translations[language][key];
                    }
                    else if (element.tagName === 'SPAN' && ((_a = element.parentElement) === null || _a === void 0 ? void 0 : _a.classList.contains('skill-bubble'))) {
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
    const aboutMeToggle = aboutMeContent === null || aboutMeContent === void 0 ? void 0 : aboutMeContent.closest('.cursor-pointer');
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
