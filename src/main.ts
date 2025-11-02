
document.addEventListener('DOMContentLoaded', () => {
  // Logic for the "About Me" section toggle
  const aboutMeContent = document.getElementById('aboutMeContent');
  // Find the parent div with cursor-pointer class that contains the About Me section
  const aboutMeToggle = aboutMeContent?.closest('.cursor-pointer');

  if (aboutMeToggle && aboutMeContent) {
    aboutMeToggle.addEventListener('click', () => {
      aboutMeContent.classList.toggle('expanded');
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
    // Remove the inline onclick attribute
    bubble.removeAttribute('onclick');
  });
});
