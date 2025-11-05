/*
 * Disclaimer Page JavaScript
 * -------------------------------------------------------------
 * Handles disclaimer acceptance checkbox and navigation
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Disclaimer script running');

  // Enable accept button only when checkbox is checked
  const checkbox = document.getElementById('acknowledge-checkbox');
  const acceptBtn = document.getElementById('accept-btn');
  const declineBtn = document.getElementById('decline-btn');

  console.log('Elements found:', {
    checkbox: !!checkbox,
    acceptBtn: !!acceptBtn,
    declineBtn: !!declineBtn
  });

  if (checkbox && acceptBtn) {
    // Log initial state
    console.log('Initial button state - disabled:', acceptBtn.disabled);

    checkbox.addEventListener('change', function() {
      const isChecked = checkbox.checked;
      acceptBtn.disabled = !isChecked;
      console.log('Checkbox changed:', isChecked, 'Button disabled:', acceptBtn.disabled);

      // Force update styling
      if (!isChecked) {
        acceptBtn.style.cursor = 'not-allowed';
      } else {
        acceptBtn.style.cursor = 'pointer';
      }
    });
  } else {
    console.error('Could not find checkbox or accept button!');
  }

  // Handle accept button
  if (acceptBtn) {
    acceptBtn.addEventListener('click', function(e) {
      console.log('Accept button clicked, disabled:', acceptBtn.disabled);

      if (acceptBtn.disabled) {
        console.log('Button is disabled, ignoring click');
        e.preventDefault();
        return;
      }

      console.log('Processing acceptance...');
      // Set disclaimer acceptance in sessionStorage and localStorage
      sessionStorage.setItem('disclaimerAccepted', 'true');
      localStorage.setItem('disclaimerAccepted', 'true');
      localStorage.setItem('disclaimerAcceptedTime', new Date().toISOString());

      console.log('Redirecting to main page...');
      // Redirect to main application page
      window.location.href = '/';
    });
  } else {
    console.error('Accept button not found!');
  }

  // Handle decline button
  if (declineBtn) {
    declineBtn.addEventListener('click', function() {
      console.log('Decline button clicked');
      // Clear any existing acceptance
      sessionStorage.removeItem('disclaimerAccepted');
      localStorage.removeItem('disclaimerAccepted');

      // Show message and redirect away
      alert('You have declined to use this academic demonstration system. You will be redirected away from this site.');

      // Redirect to a blank page or close
      window.location.href = 'about:blank';
    });
  } else {
    console.error('Decline button not found!');
  }
});
