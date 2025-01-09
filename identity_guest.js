let width = 0; // Initial progress value
let intervalId = null; // Store interval ID for progress

// Start the progress bar increment
function startProgress() {
  if (!intervalId) { // Avoid starting multiple intervals
    intervalId = setInterval(() => {
      if (width < 100) {
        width++;
        updateProgressBar();
      } else {
        stopProgress(); // Stop when reaching 100%
      }
    }, 50); // Speed of increment (lower for smoother updates)
  }
}

// Stop the progress bar increment
function stopProgress() {
  clearInterval(intervalId);
  intervalId = null; // Reset interval ID
}

// Update the progress bar visually
function updateProgressBar() {
  const elem = document.getElementById("myBar");
  elem.style.width = width + "%";
  elem.innerHTML = width + "%";
}

// Attach event listeners to the button
const button = document.getElementById("progressButton");
button.addEventListener("mousedown", startProgress); // Start on hold
button.addEventListener("mouseup", stopProgress);    // Stop on release
button.addEventListener("mouseleave", stopProgress); // Stop if cursor leaves the button