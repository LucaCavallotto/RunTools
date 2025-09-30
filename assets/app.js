function validateTime(timeStr) {
    const parts = timeStr.split(':');
    if (parts.length !== 2 && parts.length !== 3) return false;
    
    try {
        if (parts.length === 2) {
            const [mm, ss] = parts.map(Number);
            return !isNaN(mm) && !isNaN(ss) && ss < 60;
        } else {
            const [hh, mm, ss] = parts.map(Number);
            return !isNaN(hh) && !isNaN(mm) && !isNaN(ss) && ss < 60 && mm < 60;
        }
    } catch {
        return false;
    }
}

function timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
}

function secondsToPace(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function calculateThresholdPace(time10k) {
    return timeToSeconds(time10k) / 10;
}

function calculateZones(thresholdPace) {
    const zoneDefinitions = [
        ["Z1 – Recovery", 1.40, 1.25, "Recovery and active rest"],
        ["Z2 – Slow Bottom", 1.25, 1.12, "Aerobic endurance"],
        ["Z3 – Medium Cross-Country", 1.12, 1.02, "Aerobic capacity"],
        ["Z4 – Threshold", 1.02, 0.95, "Lactate tolerance, race pace improvement"],
        ["Z5 – VO2 Max", 0.95, 0.88, "Speed development, oxygen efficiency"],
        ["Z6 – Anaerobic Capacity", 0.88, 0.80, "Power and anaerobic endurance"],
        ["Z7 – Sprint", 0.80, 0.70, "Maximum speed and pure speed improvement"]
    ];
    
    return zoneDefinitions.map(([name, upper, lower, desc]) => ({
        name,
        lower: secondsToPace(thresholdPace * upper),
        upper: secondsToPace(thresholdPace * lower),
        description: desc
    }));
}

function estimateRacePace(thresholdPace, distance) {
    let multiplier;
    if (distance <= 5) multiplier = 0.92;
    else if (distance <= 10) multiplier = 0.97;
    else if (distance <= 21.1) multiplier = 1.03;
    else multiplier = 1.08;
    
    const pace = secondsToPace(thresholdPace * multiplier);
    const totalMin = (thresholdPace * multiplier * distance) / 60;
    return { pace, totalMin };
}

let currentResults = null;

function calculate() {
    const timeInput = document.getElementById('time10k').value.trim();
    const errorDiv = document.getElementById('error');
    const successMsg = document.getElementById('successMsg');
    
    successMsg.style.display = 'none';
    
    if (!validateTime(timeInput)) {
        errorDiv.style.display = 'block';
        document.getElementById('results').style.display = 'none';
        document.getElementById('copyBtn').disabled = true;
        return;
    }
    
    errorDiv.style.display = 'none';
    
    const thresholdPace = calculateThresholdPace(timeInput);
    const zones = calculateZones(thresholdPace);
    const races = [
        [5, "5K"],
        [10, "10K"],
        [21.1, "Half Marathon"],
        [42.2, "Marathon"]
    ].map(([dist, name]) => ({
        name,
        ...estimateRacePace(thresholdPace, dist)
    }));
    
    currentResults = { timeInput, thresholdPace, zones, races };
    
    // Display reference
    document.getElementById('refTime').textContent = timeInput;
    document.getElementById('refPace').textContent = secondsToPace(thresholdPace) + '/km';
    
    // Display zones
    const zonesHtml = zones.map(z => `
        <div class="zone-item">
            <div class="zone-header">
                <div class="zone-name">${z.name}</div>
                <div class="zone-pace">${z.lower} – ${z.upper}</div>
            </div>
            <div class="zone-desc">${z.description}</div>
        </div>
    `).join('');
    document.getElementById('zones').innerHTML = zonesHtml;
    
    // Display races
    const racesHtml = races.map(r => {
        const mins = Math.floor(r.totalMin);
        const secs = Math.round((r.totalMin % 1) * 60);
        return `
            <div class="race-item">
                <div class="race-name">${r.name}</div>
                <div class="race-details">
                    <div class="race-pace">${r.pace}/km</div>
                    <div class="race-time">${mins}:${String(secs).padStart(2, '0')}</div>
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('races').innerHTML = racesHtml;
    
    document.getElementById('results').style.display = 'block';
    document.getElementById('copyBtn').disabled = false;
}

function reset() {
    document.getElementById('time10k').value = '';
    document.getElementById('error').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('successMsg').style.display = 'none';
    currentResults = null;
}

function copyResults() {
    if (!currentResults) return;
    
    const { timeInput, thresholdPace, zones, races } = currentResults;
    
    let text = `RUNNING ZONE CALCULATOR\n`;
    text += `========================\n\n`;
    text += `10K Time: ${timeInput}\n`;
    text += `Threshold Pace: ${secondsToPace(thresholdPace)}/km\n\n`;
    
    text += `TRAINING ZONES:\n`;
    zones.forEach(z => {
        text += `${z.name}: ${z.lower} – ${z.upper} min/km - ${z.description}\n\n`;
    });
    
    text += `RACE PREDICTIONS:\n`;
    races.forEach(r => {
        const mins = Math.floor(r.totalMin);
        const secs = Math.round((r.totalMin % 1) * 60);
        text += `${r.name}: ${r.pace}/km (${mins}:${String(secs).padStart(2, '0')})\n`;
    });
    
    navigator.clipboard.writeText(text).then(() => {
        const successMsg = document.getElementById('successMsg');
        successMsg.style.display = 'block';
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 2500);
    }).catch(err => {
        alert('Failed to copy to clipboard');
});
}

document.getElementById('time10k').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') calculate();
});
