// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
        window.location.href = 'index.html';
        return;
    }

    // Display welcome message
    const username = sessionStorage.getItem('username');
    document.getElementById('welcomeMessage').textContent = `Welcome, ${username}!`;

    // Handle logout
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Initialize racing times
    loadRacingTimes();

    // Handle add time form
    document.getElementById('addTimeForm').addEventListener('submit', handleAddTime);

    // Handle edit form
    document.getElementById('editTimeForm').addEventListener('submit', handleEditTime);

    // Modal functionality
    const modal = document.getElementById('editModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
});

function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

function handleAddTime(e) {
    e.preventDefault();

    const racerName = document.getElementById('racerName').value;
    const track = document.getElementById('track').value;
    const lapTime = parseFloat(document.getElementById('lapTime').value);
    const date = document.getElementById('date').value;

    const newTime = {
        racerName,
        track,
        lapTime,
        date,
        timestamp: new Date().getTime()
    };

    // Get existing times
    let racingTimes = getRacingTimes();
    racingTimes.push(newTime);
    
    // Save to localStorage
    localStorage.setItem('racingTimes', JSON.stringify(racingTimes));

    // Reload the table
    loadRacingTimes();

    // Reset form
    e.target.reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

function getRacingTimes() {
    const times = localStorage.getItem('racingTimes');
    return times ? JSON.parse(times) : [];
}

function loadRacingTimes() {
    const racingTimes = getRacingTimes();
    const tableBody = document.getElementById('timesTableBody');
    const noTimesMessage = document.getElementById('noTimesMessage');

    if (racingTimes.length === 0) {
        tableBody.innerHTML = '';
        noTimesMessage.style.display = 'block';
        return;
    }

    noTimesMessage.style.display = 'none';

    // Sort by date (newest first)
    racingTimes.sort((a, b) => new Date(b.date) - new Date(a.date));

    tableBody.innerHTML = racingTimes.map((time) => `
        <tr>
            <td>${escapeHtml(time.racerName)}</td>
            <td>${escapeHtml(time.track)}</td>
            <td>${time.lapTime.toFixed(3)}</td>
            <td>${formatDate(time.date)}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editTime(${time.timestamp})">Edit</button>
                <button class="action-btn delete-btn" onclick="deleteTime(${time.timestamp})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function editTime(timestamp) {
    const racingTimes = getRacingTimes();
    const time = racingTimes.find(t => t.timestamp === timestamp);
    
    if (!time) return;

    // Populate edit form
    document.getElementById('editIndex').value = timestamp;
    document.getElementById('editRacerName').value = time.racerName;
    document.getElementById('editTrack').value = time.track;
    document.getElementById('editLapTime').value = time.lapTime;
    document.getElementById('editDate').value = time.date;

    // Show modal
    document.getElementById('editModal').style.display = 'block';
}

function handleEditTime(e) {
    e.preventDefault();

    const timestamp = parseInt(document.getElementById('editIndex').value);
    const racingTimes = getRacingTimes();
    
    // Find and update the time by timestamp
    const index = racingTimes.findIndex(t => t.timestamp === timestamp);
    
    if (index !== -1) {
        racingTimes[index] = {
            racerName: document.getElementById('editRacerName').value,
            track: document.getElementById('editTrack').value,
            lapTime: parseFloat(document.getElementById('editLapTime').value),
            date: document.getElementById('editDate').value,
            timestamp: timestamp
        };

        // Save back to localStorage
        localStorage.setItem('racingTimes', JSON.stringify(racingTimes));
    }

    // Close modal and reload
    document.getElementById('editModal').style.display = 'none';
    loadRacingTimes();
}

function deleteTime(timestamp) {
    if (confirm('Are you sure you want to delete this racing time?')) {
        const racingTimes = getRacingTimes();
        
        // Remove the time by timestamp
        const filteredTimes = racingTimes.filter(t => t.timestamp !== timestamp);
        
        // Save back to localStorage
        localStorage.setItem('racingTimes', JSON.stringify(filteredTimes));
        
        // Reload the table
        loadRacingTimes();
    }
}
