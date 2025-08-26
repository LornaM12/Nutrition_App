document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - script.js is running.');

    // --- Recommendation Form Elements ---
    const fbsLevelInput = document.getElementById('fbs_level');
    const rbsLevelInput = document.getElementById('rbs_level');
    const mealTypeSelect = document.getElementById('meal_type');
    const numAlternativesInput = document.getElementById('num_alternatives');
    const recommendationForm = document.getElementById('recommendationForm');
    const recommendationsOutput = document.getElementById('recommendationsOutput');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const noRecommendationsMessage = document.getElementById('noRecommendationsMessage');

    // --- Feedback Form Elements ---
    const feedbackForm = document.getElementById('feedbackForm');
    const ratingStarsContainer = document.getElementById('ratingStars');
    const ratingInput = document.getElementById('rating'); // Hidden input for rating
    const feedbackTextInput = document.getElementById('feedback_text');
    const contactEmailInput = document.getElementById('contact_email');
    const feedbackMessage = document.getElementById('feedbackMessage'); // Success message
    const feedbackErrorMessage = document.getElementById('feedbackErrorMessage'); // Error message

    // --- Feedback Modal Elements ---
    // Now correctly targeting the single unified feedbackTrigger ID
    const feedbackTrigger = document.getElementById('feedbackTrigger'); // This is the correct ID from recommendations.html
    const feedbackModal = document.getElementById('feedbackModal');
    const closeFeedbackModal = document.getElementById('closeFeedbackModal');

    // --- Diagnostic Logs for Feedback Elements ---
    console.log('Feedback Trigger Element:', feedbackTrigger); // Updated log
    console.log('Feedback Modal Element:', feedbackModal);
    console.log('Close Feedback Modal Element:', closeFeedbackModal);


    // --- Event Listener for Recommendation Form ---
    recommendationForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent default form submission
        console.log('Recommendation form submitted.');

        // Clear previous messages and results
        recommendationsOutput.innerHTML = '';
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'none';
        noRecommendationsMessage.style.display = 'none';

        const fbsLevel = fbsLevelInput.value ? parseFloat(fbsLevelInput.value) : null;
        const rbsLevel = rbsLevelInput.value ? parseFloat(rbsLevelInput.value) : null;
        const mealType = mealTypeSelect.value;
        const numAlternativesPerSlot = parseInt(numAlternativesInput.value);

        // Construct query parameters
        const queryParams = [];
        if (fbsLevel !== null) {
            queryParams.push(`fbs_level=${fbsLevel}`);
        }
        if (rbsLevel !== null) {
            queryParams.push(`rbs_level=${rbsLevel}`);
        }
        queryParams.push(`meal_type=${mealType}`);
        queryParams.push(`num_alternatives_per_slot=${numAlternativesPerSlot}`);


        if (fbsLevel === null && rbsLevel === null) {
            errorMessage.textContent = "Please enter at least one blood sugar level (FBS or RBS).";
            errorMessage.style.display = 'block';
            return;
        }

        loadingMessage.style.display = 'block'; // Show loading message

        try {
            // API_BASE_URL: Change between local testing and live deployment
            // For local testing:
            //const API_BASE_URL = "http://127.0.0.1:8000";
            // For live deployment:
            const API_BASE_URL = "https://nutriapp-backend-mnnq.onrender.com";

            const apiUrl = `${API_BASE_URL}/recommend_meal?${queryParams.join('&')}`;
            console.log('Fetching recommendations from:', apiUrl);

            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Recommendations received:', data);

            loadingMessage.style.display = 'none'; // Hide loading message

            if (data && data.length > 0) {
                const ul = document.createElement('ul');
                data.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    ul.appendChild(li);
                });
                recommendationsOutput.appendChild(ul);
            } else {
                noRecommendationsMessage.style.display = 'block';
            }

        } catch (error) {
            loadingMessage.style.display = 'none';
            errorMessage.textContent = `Error: ${error.message}. Please try again or check server logs.`;
            errorMessage.style.display = 'block';
            console.error('Fetch error:', error);
        }
    });

    // --- Star Rating Logic for Feedback Form ---
    let currentRating = 0;

    if (ratingStarsContainer) {
        const stars = Array.from(ratingStarsContainer.children);
        console.log('Star rating container found. Number of stars:', stars.length);

        function fillStars(ratingValue) {
            stars.forEach(star => {
                const starVal = parseInt(star.dataset.value);
                if (starVal <= ratingValue) {
                    star.classList.remove('far');
                    star.classList.add('fas');
                } else {
                    star.classList.remove('fas');
                    star.classList.add('far');
                }
            });
        }

        ratingStarsContainer.addEventListener('mouseover', (event) => {
            const hoveredStar = event.target.closest('.fa-star');
            if (hoveredStar) {
                const hoverValue = parseInt(hoveredStar.dataset.value);
                fillStars(hoverValue);
            }
        });

        ratingStarsContainer.addEventListener('mouseout', () => {
            fillStars(currentRating);
        });

        ratingStarsContainer.addEventListener('click', (event) => {
            const clickedStar = event.target.closest('.fa-star');
            if (clickedStar) {
                currentRating = parseInt(clickedStar.dataset.value);
                ratingInput.value = currentRating;
                fillStars(currentRating);
                console.log('Rating selected:', currentRating);
            }
        });
    }

    // --- Event Listener for Feedback Form Submission ---
    if (feedbackForm) {
        console.log('Feedback form found.');
        feedbackForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log('Feedback form submitted.');

            // Clear previous messages
            feedbackMessage.style.display = 'none';
            feedbackErrorMessage.style.display = 'none';
            feedbackMessage.textContent = '';
            feedbackErrorMessage.textContent = '';

            const rating = parseInt(ratingInput.value);
            const feedbackText = feedbackTextInput.value.trim();
            const contactEmail = contactEmailInput.value.trim();

            if (rating === 0) {
                feedbackErrorMessage.textContent = "Please provide a star rating.";
                feedbackErrorMessage.style.display = 'block';
                return;
            }

            try {
                // API_BASE_URL: Change between local testing and live deployment
                // For local testing:
                const API_BASE_URL = "http://127.0.0.1:8000";
                // For live deployment:
                //const API_BASE_URL = "https://nutriapp-backend-mnnq.onrender.com";

                const apiUrl = `${API_BASE_URL}/submit_feedback`;
                console.log('Submitting feedback to:', apiUrl);

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        rating: rating,
                        feedback_text: feedbackText || null,
                        contact_email: contactEmail || null
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                feedbackMessage.textContent = result.message;
                feedbackMessage.style.display = 'block';
                console.log('Feedback submission successful:', result.message);

                // Clear the form on successful submission
                currentRating = 0;
                ratingInput.value = 0;
                fillStars(0); // Clear star visuals
                feedbackTextInput.value = '';
                contactEmailInput.value = '';

            } catch (error) {
                feedbackErrorMessage.textContent = `Failed to submit feedback: ${error.message}`;
                feedbackErrorMessage.style.display = 'block';
                console.error('Feedback submission error:', error);
            }
        });
    }

    // --- Feedback Modal Show/Hide Logic ---
    if (feedbackModal && closeFeedbackModal) {
        console.log('Feedback modal elements found. Attaching listeners.');

        // Function to show the modal
        const showFeedbackModal = () => {
            console.log('Showing feedback modal!');
            feedbackModal.classList.add('show-modal');
        };

        // Attach listener to the unified feedback trigger
        if (feedbackTrigger) { // Use the single feedbackTrigger element
            feedbackTrigger.addEventListener('click', showFeedbackModal);
            console.log('Attached click listener to unified feedback trigger.');
        } else {
            console.warn('Unified feedback trigger element not found.');
        }

        // Hide modal when close button is clicked
        closeFeedbackModal.addEventListener('click', () => {
            console.log('Close modal button clicked.');
            feedbackModal.classList.remove('show-modal');
        });

        // Hide modal when clicking outside of the modal content
        window.addEventListener('click', (event) => {
            if (event.target == feedbackModal) {
                console.log('Clicked outside modal. Hiding modal.');
                feedbackModal.classList.remove('show-modal');
            }
        });
    } else {
        console.warn('One or more feedback modal elements not found (modal or close button):', { feedbackModal, closeFeedbackModal });
    }

    
});