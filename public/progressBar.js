const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

let isDragging = false;

// Get mouse position relative to progress bar container
function getProgress(event) {
  const rect = progressContainer.getBoundingClientRect();
  const offsetX = event.clientX - rect.left; // Mouse position relative to container
  const width = rect.width; // Total width of container
  let progress = (offsetX / width) * 100;

  // Clamp the progress value between 0 and 100
  progress = Math.min(Math.max(progress, 0), 100);
  return progress;
}

// Update the progress bar and text
function updateProgress(progress) {
  progressBar.style.width = `${progress}%`;
  progressText.textContent = `Progress: ${Math.round(progress)}%`;
}

// Event listeners for click and drag functionality
progressContainer.addEventListener('mousedown', (event) => {
  isDragging = true;
  const progress = getProgress(event);
  updateProgress(progress);
});

document.addEventListener('mousemove', (event) => {
  if (isDragging) {
    const progress = getProgress(event);
    updateProgress(progress);
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

progressContainer.addEventListener('click', (event) => {
  const progress = getProgress(event);
  updateProgress(progress);
});