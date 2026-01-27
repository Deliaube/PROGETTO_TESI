// Timer Manager
class TimerManager {
  constructor() {
    this.duration = 0; // in minutes
    this.startTime = null;
    this.timerInterval = null;
    this.isActive = false;
    
    this.loadFromCache();
    this.initializeWidget();
  }

  // Load timer data from localStorage
  loadFromCache() {
    const cached = localStorage.getItem('timerData');
    if (cached) {
      const data = JSON.parse(cached);
      this.duration = data.duration;
      this.startTime = data.startTime;
      this.isActive = data.isActive;
      
      // Check if timer has expired
      if (this.isActive) {
        const now = new Date().getTime();
        const elapsed = (now - this.startTime) / 1000 / 60; // in minutes
        if (elapsed >= this.duration) {
          this.expireTimer();
        }
      }
    }
  }

  // Save timer data to localStorage
  saveToCache() {
    const data = {
      duration: this.duration,
      startTime: this.startTime,
      isActive: this.isActive
    };
    localStorage.setItem('timerData', JSON.stringify(data));
  }

  // Initialize the widget on page load
  initializeWidget() {
    if (this.isActive && this.duration > 0) {
      this.createAndShowWidget();
      this.startUpdatingWidget();
    }
  }

  // Create the timer widget HTML
  createAndShowWidget() {
    // Remove existing widget if present
    const existing = document.getElementById('timerWidget');
    if (existing) existing.remove();

    const widget = document.createElement('div');
    widget.id = 'timerWidget';
    widget.className = 'timer-widget';
    widget.innerHTML = `
      <div class="timer-label">TIME LEFT</div>
      <div class="timer-display" id="timerDisplay">--:--</div>
      <div class="timer-bar">
        <div class="timer-progress" id="timerProgress"></div>
      </div>
    `;
    
    document.body.insertBefore(widget, document.body.firstChild);
    this.updateWidgetDisplay();
  }

  // Start the interval to update the timer display
  startUpdatingWidget() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      this.updateWidgetDisplay();
    }, 100); // Update every 100ms for smooth progress bar
  }

  // Update the timer display
  updateWidgetDisplay() {
    if (!this.isActive || this.duration === 0) return;

    const now = new Date().getTime();
    const elapsed = (now - this.startTime) / 1000 / 60; // in minutes
    const remaining = this.duration - elapsed;

    const display = document.getElementById('timerDisplay');
    const progress = document.getElementById('timerProgress');

    if (remaining <= 0) {
      this.expireTimer();
      return;
    }

    // Format time as MM:SS
    const totalSeconds = Math.ceil(remaining * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    if (display) display.textContent = timeStr;

    // Update progress bar
    const progressPercent = (elapsed / this.duration) * 100;
    if (progress) progress.style.width = Math.min(progressPercent, 100) + '%';
  }

  // Set the duration and start the timer
  setDuration(minutes) {
    this.duration = minutes;
    this.startTime = new Date().getTime();
    this.isActive = true;
    this.saveToCache();
    this.createAndShowWidget();
    this.startUpdatingWidget();
  }

  // Reset the timer
  resetTimer() {
    this.duration = 0;
    this.startTime = null;
    this.isActive = false;
    this.saveToCache();
    
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    const widget = document.getElementById('timerWidget');
    if (widget) widget.remove();
  }

  // Timer has expired
  expireTimer() {
    this.isActive = false;
    this.saveToCache();
    
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    const widget = document.getElementById('timerWidget');
    if (widget) {
      const display = widget.querySelector('#timerDisplay');
      if (display) display.textContent = '00:00';
      const progress = widget.querySelector('#timerProgress');
      if (progress) progress.style.width = '100%';
    }
    
    // Show the expired overlay
    this.showExpiredOverlay();
  }

  // Show expired overlay and block navigation
  showExpiredOverlay() {
    // Remove existing overlay if present
    const existing = document.getElementById('timerExpiredOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'timerExpiredOverlay';
    overlay.className = 'timer-expired-overlay';
    overlay.innerHTML = `
      <div class="timer-expired-message">
        <h2>⏰ TIME'S UP</h2>
        <p>Your browsing time has expired.</p>
        <p>Your virtual identity needs a break.</p>
        <button class="expired-home-btn" onclick="window.location.href='index.html'">RETURN TO HOME</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Block all navigation
    this.blockNavigation();
  }

  // Block navigation when timer expires
  blockNavigation() {
    const self = this;
    
    // Prevent all link clicks
    document.addEventListener('click', function(e) {
      if (!self.isActive && (e.target.tagName === 'A' || e.target.closest('a'))) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Block all button clicks except the "RETURN TO HOME" button
      if (!self.isActive && (e.target.tagName === 'BUTTON' || e.target.closest('button'))) {
        const button = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
        if (!button.classList.contains('expired-home-btn')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    }, true);

    // Prevent form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        if (!self.isActive) {
          e.preventDefault();
          return false;
        }
      });
    });

    // Prevent navigation via history
    window.addEventListener('beforeunload', (e) => {
      if (!self.isActive) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }
}

// Create global timer manager instance
let timerManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  if (!timerManager) {
    timerManager = new TimerManager();
  }
});

// Create duration selection section for IDENTITY_QUEST page
function createDurationSelectionSection() {
  return `
    <section class="durata-selection">
      <div class="Alerts">
        <p>How long is your stay supposed to be?</p>
        
        <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
          <input 
            type="range" 
            id="durationSlider" 
            class="duration-slider" 
            min="1" 
            max="60" 
            value="13"
            oninput="updateSliderValue(this.value)"
          >
          <div class="slider-labels">
            <span>1 min</span>
            <span>60 min</span>
          </div>
          <div class="slider-value" id="sliderValue">13 minutes</div>
          <button class="confirm-btn" onclick="confirmAndStartTimer()">CONFIRM</button>
        </div>
      </div>
    </section>
  `;
}

// Update slider display value
function updateSliderValue(value) {
  const text = value === '1' ? '1 minute' : value + ' minutes';
  const display = document.getElementById('sliderValue');
  if (display) display.textContent = text;
}

// Apply custom duration from slider
function applyCustomDuration() {
  const slider = document.getElementById('durationSlider');
  if (slider) {
    timerManager.setDuration(parseInt(slider.value));
  }
}

// Confirm and start timer, then redirect
function confirmAndStartTimer() {
  const slider = document.getElementById('durationSlider');
  if (slider) {
    const duration = parseInt(slider.value);
    timerManager.setDuration(duration);
    // Redirect to the main page
    setTimeout(() => {
      window.location.href = 'new_index_CHANGES REVISED.html';
    }, 300);
  }
}
