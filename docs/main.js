"use strict";
document.addEventListener('DOMContentLoaded', () => {
    // Logic for the "About Me" section toggle
    const aboutMeToggle = document.querySelector('[onclick*="aboutMeContent"]');
    const aboutMeContent = document.getElementById('aboutMeContent');
    if (aboutMeToggle && aboutMeContent) {
        aboutMeToggle.addEventListener('click', () => {
            aboutMeContent.classList.toggle('expanded');
        });
        // Remove the inline onclick attribute to keep HTML clean
        aboutMeToggle.removeAttribute('onclick');
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
        // Remove the inline onclick attribute
        bubble.removeAttribute('onclick');
    });
});
