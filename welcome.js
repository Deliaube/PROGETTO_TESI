// Function to manage user counter
function initializeUserCounter() {
  // Get current user number from localStorage
  let userNumber = localStorage.getItem('userNumber');
  
  if (!userNumber) {
    userNumber = 1;
  } else {
    userNumber = parseInt(userNumber) + 1;
  }
  
  // Save the updated user number
  localStorage.setItem('userNumber', userNumber);
  
  // Display the user number
  document.getElementById('userNumber').textContent = userNumber;
}

// Run when page loads
document.addEventListener('DOMContentLoaded', function() {
  initializeUserCounter();
  // Initialize AOS animation after content is loaded
  AOS.init();
});
