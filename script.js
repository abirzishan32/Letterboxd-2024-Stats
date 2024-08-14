// ==UserScript==
// @name         Letterboxd 2024 Stats
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fetch and display enhanced stats from Letterboxd diary entries with a modern design.
// @author       Your Name
// @match        https://letterboxd.com/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/chart.js
// ==/UserScript==

(async function() {
    'use strict';

    function getUsernameFromURL() {
        const path = window.location.pathname;
        const match = path.match(/^\/([^/]+)\/?/);
        return match ? match[1] : null;
    }

    async function getLetterboxdData(username) {
        if (!username) {
            console.error('Username not found in URL.');
            return null;
        }

        let films = [];
        let page = 1;

        while (true) {
            const url = `https://letterboxd.com/${username}/films/diary/page/${page}/`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch page, status code: ${response.status}`);
            }

            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const diaryEntries = [...doc.querySelectorAll('a.edit-review-button')];

            if (diaryEntries.length === 0) {
                break;
            }

            for (const film of diaryEntries) {
                const viewingDateStr = film.getAttribute('data-viewing-date-str');
                if (viewingDateStr && viewingDateStr.includes("2024")) {
                    const title = film.getAttribute('data-film-name') || 'Unknown Title';
                    const dateLogged = viewingDateStr;
                    const filmYear = film.getAttribute('data-film-year') || 'Unknown Year';
                    const rating = parseInt(film.getAttribute('data-rating'), 10) || null;
                    const liked = film.getAttribute('data-liked') === 'true';
                    const rewatch = film.getAttribute('data-rewatch') === 'true';
                    films.push({ title, dateLogged, filmYear, rating, liked, rewatch });
                }
            }

            page += 1;
        }

        return processData(films);
    }

    function processData(films) {
        const totalMovies = films.length;
        const months = new Array(12).fill(0);
        const daysOfWeek = new Array(7).fill(0);
        const decades = {};
        const ratings = new Array(11).fill(0); 
        const monthlyRatings = new Array(12).fill(0); 
        const monthlyCounts = new Array(12).fill(0); 
        let totalRating = 0;
        let ratingCount = 0;
        let likedCount = 0;
        let rewatchedCount = 0;

        films.forEach(film => {
            const date = new Date(film.dateLogged);
            const month = date.getMonth();
            const dayOfWeek = date.getDay();
            const year = parseInt(film.filmYear);

            months[month] += 1;
            daysOfWeek[dayOfWeek] += 1;

            if (!isNaN(year)) {
                const decade = Math.floor(year / 10) * 10;
                decades[decade] = (decades[decade] || 0) + 1;
            }

            if (film.rating !== null) {
                totalRating += film.rating;
                ratingCount += 1;
                ratings[film.rating] += 1;
                monthlyRatings[month] += film.rating;
                monthlyCounts[month] += 1;
            }

            if (film.liked) {
                likedCount += 1;
            }

            if (film.rewatch) {
                rewatchedCount += 1;
            }
        });

        const averageRating = ratingCount ? (totalRating / ratingCount) / 2 : 0; 
        const averageRatingsPerMonth = monthlyCounts.map((count, i) => count ? (monthlyRatings[i] / count) / 2 : 0);

        return { totalMovies, months, daysOfWeek, decades, averageRating, ratings, likedCount, rewatchedCount, averageRatingsPerMonth };
    }

    function displayStats(stats) {
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.padding = '20px';
        container.style.borderRadius = '10px';
        container.style.marginTop = '20px';
        container.style.color = 'white';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.maxWidth = '1000px';
        container.style.margin = 'auto';
        container.style.textAlign = 'center';
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s';

        const style = document.createElement('style');
        style.textContent = `
            .charts-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px auto;
                max-width: 1000px;
            }
            .chart-container, .pie-chart-container {
                max-width: 100%;
                margin: auto;
                transition: transform 0.3s, opacity 0.3s;
            }
            .chart-container:hover, .pie-chart-container:hover {
                transform: scale(1.05);
                opacity: 0.9;
            }
            .stats-box {
                display: inline-block;
                min-width: 100px;
                margin: 10px;
                padding: 20px;
                background-color: #444;
                border-radius: 5px;
                transition: transform 0.2s, background-color 0.2s;
                color: white;
                font-size: 18px;
                font-weight: bold;
            }
            .stats-box:hover {
                transform: scale(1.1);
                background-color: #555;
            }
            .stats-text {
                display: inline-block;
                color: #ffd700;
                font-weight: bold;
                font-size: 24px;
                animation: fade-in 1s forwards;
            }
            @keyframes fade-in {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);

        container.innerHTML = `
            <h2 style="color: #ffd700; text-shadow: 2px 2px #000;">Letterboxd Stats 2024</h2>
            <div class="stats-box">
                <p class="stats-text">Total Movies: <span style="font-weight: bold; color: #ff4500;">${stats.totalMovies}</span></p>
            </div>
            <div class="stats-box">
                <p class="stats-text">Average Rating: <span style="font-weight: bold; color: #ff4500;">${stats.averageRating.toFixed(1)}</span></p>
            </div>
            <div class="stats-box">
                <p class="stats-text">Liked Films: <span style="font-weight: bold; color: #ff4500;">${stats.likedCount}</span></p>
            </div>
            <div class="stats-box">
                <p class="stats-text">Rewatched Films: <span style="font-weight: bold; color: #ff4500;">${stats.rewatchedCount}</span></p>
            </div>
            <div class="charts-grid">
                <div class="chart-container">
                    <canvas id="moviesPerMonthChart"></canvas>
                </div>
                <div class="pie-chart-container">
                    <canvas id="moviesPerDayOfWeekChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="moviesPerDecadeChart"></canvas>
                </div>
                <div class="pie-chart-container">
                    <canvas id="moviesPerRatingChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="averageRatingPerMonthChart"></canvas>
                </div>
            </div>
        `;

        const profileSection = document.querySelector('.profile-info');
        if (profileSection) {
            profileSection.appendChild(container);
        } else {
            document.body.appendChild(container);
        }

        setTimeout(() => {
            container.style.opacity = '1';
        }, 100);

        const ctx1 = document.getElementById('moviesPerMonthChart').getContext('2d');
        const ctx2 = document.getElementById('moviesPerDayOfWeekChart').getContext('2d');
        const ctx3 = document.getElementById('moviesPerDecadeChart').getContext('2d');
        const ctx4 = document.getElementById('moviesPerRatingChart').getContext('2d');
        const ctx5 = document.getElementById('averageRatingPerMonthChart').getContext('2d');

        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Movies Watched Per Month',
                    data: stats.months,
                    backgroundColor: '#ff4500',
                    borderColor: '#ff4500',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{
                    label: 'Movies Watched Per Day of Week',
                    data: stats.daysOfWeek,
                    backgroundColor: ['#ff9999', '#66b3ff', '#99ff99', '#ffcc99', '#c2c2f0', '#ffb3e6', '#c2f0c2'],
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });

        new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.decades),
                datasets: [{
                    label: 'Movies Watched Per Decade',
                    data: Object.values(stats.decades),
                    backgroundColor: '#ff4500',
                    borderColor: '#ff4500',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        new Chart(ctx4, {
            type: 'pie',
            data: {
                labels: ['0 Stars', '0.5 Stars', '1 Star', '1.5 Stars', '2 Stars', '2.5 Stars', '3 Stars', '3.5 Stars', '4 Stars', '4.5 Stars', '5 Stars'],
                datasets: [{
                    label: 'Ratings Distribution',
                    data: stats.ratings,
                    backgroundColor: ['#ff9999', '#66b3ff', '#99ff99', '#ffcc99', '#c2c2f0', '#ffb3e6', '#c2f0c2', '#ff9999', '#66b3ff', '#99ff99', '#ffcc99'],
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });

        new Chart(ctx5, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Average Rating Per Month',
                    data: stats.averageRatingsPerMonth,
                    backgroundColor: '#ff4500',
                    borderColor: '#ff4500',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    const username = getUsernameFromURL();
    try {
        const stats = await getLetterboxdData(username);
        if (stats) {
            displayStats(stats);
        }
    } catch (error) {
        console.error('Error fetching or processing data:', error);
    }
})();
