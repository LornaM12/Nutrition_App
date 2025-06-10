document.addEventListener('DOMContentLoaded', () => {
    const fbsLevelInput = document.getElementById('fbsLevel');
    const rbsLevelInput = document.getElementById('rbsLevel');
    const mealTypeSelect = document.getElementById('mealType');
    const numAlternativesInput = document.getElementById('numAlternatives');
    const getRecommendationBtn = document.getElementById('getRecommendationBtn');
    const recommendationsList = document.getElementById('recommendationsList');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const noRecommendationsMessage = document.getElementById('noRecommendationsMessage');

    getRecommendationBtn.addEventListener('click', async () => {
        // Clear previous messages and results
        recommendationsList.innerHTML = '';
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'none';
        noRecommendationsMessage.style.display = 'none';

        const fbsLevel = fbsLevelInput.value ? parseFloat(fbsLevelInput.value) : null;
        const rbsLevel = rbsLevelInput.value ? parseFloat(rbsLevelInput.value) : null;
        const mealType = mealTypeSelect.value;
        const numAlternativesPerSlot = parseInt(numAlternativesInput.value);

        if (fbsLevel === null && rbsLevel === null) {
            errorMessage.textContent = "Please enter at least one blood sugar level (FBS or RBS).";
            errorMessage.style.display = 'block';
            return;
        }

        loadingMessage.style.display = 'block'; // Show loading message

        try {
            // Construct query parameters
            let queryParams = [];
            if (fbsLevel !== null) queryParams.push(`fbs_level=${fbsLevel}`);
            if (rbsLevel !== null) queryParams.push(`rbs_level=${rbsLevel}`);
            queryParams.push(`meal_type=${mealType}`);
            queryParams.push(`num_alternatives_per_slot=${numAlternativesPerSlot}`);

            //const apiUrl = `http://127.0.0.1:8000/recommend_meal?${queryParams.join('&')}`;
            const API_BASE_URL = "https://nutriapp-backend-mnnq.onrender.com"; // Your Render API URL
            const apiUrl = `${API_BASE_URL}/recommend_meal?${queryParams.join('&')}`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                // Handle HTTP errors (e.g., 400 Bad Request, 500 Internal Server Error)
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            loadingMessage.style.display = 'none'; // Hide loading message

            if (data && data.length > 0) {
                data.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    recommendationsList.appendChild(li);
                });
            } else {
                noRecommendationsMessage.style.display = 'block';
            }

        } catch (error) {
            loadingMessage.style.display = 'none'; // Hide loading message
            errorMessage.textContent = `Error: ${error.message}. Please try again or check server logs.`;
            errorMessage.style.display = 'block';
            console.error('Fetch error:', error);
        }
    });
});