const button = document.getElementById("analyzeBtn");
const playerCard = document.getElementById("playerCard");
const playerSearch = document.getElementById("playerSearch");
const suggestions = document.getElementById("suggestions");
const topLocks = document.getElementById("topLocks");
const recentSearchesBox = document.getElementById("recentSearches");
const myLocksBox = document.getElementById("myLocks");
let myLocks = [];
const bannedNinjas = document.getElementById("bannedNinjas");
const playerCount = document.getElementById("playerCount");

let players = {};
let aliases = {};
let recentSearches = [];

async function loadPlayersFromJSON() {
    try {
        const response = await fetch("data/players.json");
        const playerArray = await response.json();

        playerArray.forEach(function (player) {
            player.lockScore = calculateLockScore(player);

            players[player.key] = player;

            player.aliases.forEach(function (alias) {
                aliases[alias] = player.key;
            });
        });

        playerCount.textContent = `${playerArray.length} Players Loaded`;

        loadTopLocks();
        loadBannedNinjas();
        renderRecentSearches();
        loadSavedLocks();
        console.log("Players loaded from JSON:", players);
    } catch (error) {
        console.error("Error loading players.json:", error);
        playerCard.innerHTML = `
            <h3>Data Error</h3>
            <p>Could not load players.json. Make sure Live Server is running.</p>
        `;
    }
}

function calculateLockScore(player) {
    const hitRateScore = getHitRateScore(player.hitRate);
    const last5Score = getLast5Score(player);
    const matchupScore = getMatchupScore(player.matchupGrade);

    const finalScore = Math.round(
        hitRateScore * 0.50 +
        matchupScore * 0.30 +
        last5Score * 0.20
    );

    return finalScore;
}

function getHitRateScore(hitRate) {
    const parts = hitRate.split("/");
    const hits = Number(parts[0]);
    const total = Number(parts[1]);

    return Math.round((hits / total) * 100);
}

function getLast5Score(player) {
    const propLine = getPropLine(player.prop);

    if (!propLine) {
        return player.lockScore || 75;
    }

    const average = player.last5.reduce((total, value) => total + value, 0) / player.last5.length;
    const difference = average - propLine;

    let score = 70 + difference * 8;

    if (score > 100) score = 100;
    if (score < 40) score = 40;

    return Math.round(score);
}

function getPropLine(prop) {
    const match = prop.match(/\d+(\.\d+)?/);

    if (match) {
        return Number(match[0]);
    }

    return null;
}

function getMatchupScore(matchupGrade) {
    if (matchupGrade.includes("Great")) return 90;
    if (matchupGrade.includes("Neutral")) return 75;
    if (matchupGrade.includes("Tough")) return 55;

    return 70;
}

function getScoreColor(score) {
    if (score >= 85) return "green";
    if (score >= 70) return "yellow";
    return "red";
}

function getOnnatStatus(score) {
    if (score >= 95) return "🔥 SUPER ONNAT";
    if (score >= 85) return "✅ ONNAT";
    if (score >= 70) return "🤔 IFFY";
    return "❌ NOT ONNAT";
}

function getOnnatBlocks(score) {
    const filledBlocks = Math.round(score / 10);
    const emptyBlocks = 10 - filledBlocks;

    let block = "🟩";

    if (score < 70) {
        block = "🟥";
    } else if (score < 85) {
        block = "🟨";
    }

    return block.repeat(filledBlocks) + "⬜".repeat(emptyBlocks);
}

function findPlayer(searchValue) {
    const cleanedSearch = searchValue.toLowerCase().trim();

    if (players[cleanedSearch]) {
        return players[cleanedSearch];
    }

    if (aliases[cleanedSearch]) {
        return players[aliases[cleanedSearch]];
    }

    return null;
}

function addRecentSearch(player) {
    recentSearches = recentSearches.filter(name => name !== player.name);
    recentSearches.unshift(player.name);
    recentSearches = recentSearches.slice(0, 5);

    renderRecentSearches();
}

function renderRecentSearches() {
    if (recentSearches.length === 0) {
        recentSearchesBox.innerHTML = `<p>No recent searches yet.</p>`;
        return;
    }

    recentSearchesBox.innerHTML = "";

    recentSearches.forEach(function (name) {
        const player = Object.values(players).find(p => p.name === name);

        if (!player) return;

        const scoreColor = getScoreColor(player.lockScore);

        const item = document.createElement("div");
        item.classList.add("recent-item");

        item.innerHTML = `
            <span>${player.name}</span>
            <span class="${scoreColor}">${player.lockScore}/100</span>
        `;

        item.addEventListener("click", function () {
            playerSearch.value = player.name;
            displayPlayer(player);
            suggestions.innerHTML = "";
            window.scrollTo({
                top: playerCard.offsetTop - 80,
                behavior: "smooth"
            });
        });

        recentSearchesBox.appendChild(item);
    });
}

function displayPlayer(player) {
    const scoreColor = getScoreColor(player.lockScore);
    const onnatStatus = getOnnatStatus(player.lockScore);
    const onnatBlocks = getOnnatBlocks(player.lockScore);

    addRecentSearch(player);

    let playerImage = "";

    if (player.image) {
        playerImage = `<img src="${player.image}" alt="${player.name}" class="player-img">`;
    }

    playerCard.innerHTML = `
        ${playerImage}

        <h3>${player.name}</h3>

        <p><strong>Points Avg:</strong> ${player.points}</p>
        <p><strong>Rebounds Avg:</strong> ${player.rebounds}</p>
        <p><strong>Assists Avg:</strong> ${player.assists}</p>

        <div class="prop-box">
            <h4>Suggested Prop</h4>
            <p><strong>${player.prop}</strong> ✅</p>
            <p><strong>Why:</strong> ${player.reason}</p>
        </div>
        <button class="save-lock-btn" onclick="saveLock('${player.key}')">
    ⭐ Save Lock
</button>

        <div class="info-box">
            <h4>Last 5 Games (${player.last5Label})</h4>
            <p class="last-five">${player.last5.join(" | ")}</p>
        </div>

        <div class="info-box">
            <h4>Hit Rate</h4>
            <p class="${scoreColor}">${player.hitRate} ✅</p>
        </div>

        <div class="info-box">
            <h4>Tonight's Matchup</h4>
            <p>vs ${player.opponent}</p>
            <p>${player.matchupGrade}</p>
        </div>

        <div class="onnat-box">
            <p class="${scoreColor}">
                <strong>Lock Score:</strong> ${player.lockScore}/100
            </p>
            <p class="onnat-status">${onnatStatus}</p>
            <p class="onnat-blocks">${onnatBlocks}</p>
            <p><small>Score based on Hit Rate, Last 5 Games, and Tonight's Matchup.</small></p>
        </div>
    `;
}

function analyzeSearch() {
    const player = findPlayer(playerSearch.value);

    if (player) {
        displayPlayer(player);
        suggestions.innerHTML = "";
    } else {
        playerCard.innerHTML = `
            <h3>Player Not Found</h3>
            <p>Try: Brunson, SGA, Luka, Jokic, Giannis, Wemby, Bron, Steph, Tatum, KD, Booker, Ant, Kyrie, Ja, or Trae.</p>
        `;
    }
}

function showSuggestions() {
    const searchValue = playerSearch.value.toLowerCase().trim();
    suggestions.innerHTML = "";

    if (searchValue.length === 0) {
        return;
    }

    const matches = Object.keys(players).filter(function (playerName) {
        return playerName.includes(searchValue) ||
               players[playerName].name.toLowerCase().includes(searchValue);
    }).slice(0, 5);

    matches.forEach(function (playerName) {
        const item = document.createElement("div");
        item.classList.add("suggestion-item");
        item.textContent = players[playerName].name;

        item.addEventListener("click", function () {
            playerSearch.value = players[playerName].name;
            displayPlayer(players[playerName]);
            suggestions.innerHTML = "";
        });

        suggestions.appendChild(item);
    });
}

function loadTopLocks() {
    const sortedPlayers = Object.values(players)
        .sort((a, b) => b.lockScore - a.lockScore)
        .slice(0, 5);

    topLocks.innerHTML = "";

    sortedPlayers.forEach(function (player, index) {
        const scoreColor = getScoreColor(player.lockScore);

        const lockItem = document.createElement("div");
        lockItem.classList.add("lock-item");

        lockItem.innerHTML = `
            <span>${index + 1}. ${player.name}</span>
            <span class="${scoreColor}">${player.lockScore}/100</span>
        `;

        lockItem.addEventListener("click", function () {
            playerSearch.value = player.name;
            displayPlayer(player);
            suggestions.innerHTML = "";
            window.scrollTo({
                top: playerCard.offsetTop - 80,
                behavior: "smooth"
            });
        });

        topLocks.appendChild(lockItem);
    });
}

function loadBannedNinjas() {
    const worstPlayers = Object.values(players)
        .sort((a, b) => a.lockScore - b.lockScore)
        .slice(0, 3);

    bannedNinjas.innerHTML = "";

    worstPlayers.forEach(function (player, index) {
        const item = document.createElement("div");
        item.classList.add("lock-item");

        item.innerHTML = `
            <span>${index + 1}. ${player.name}</span>
            <span class="red">${player.lockScore}/100</span>
        `;

        item.addEventListener("click", function () {
            playerSearch.value = player.name;
            displayPlayer(player);
            suggestions.innerHTML = "";
            window.scrollTo({
                top: playerCard.offsetTop - 80,
                behavior: "smooth"
            });
        });

        bannedNinjas.appendChild(item);
    });
}

button.addEventListener("click", analyzeSearch);

playerSearch.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        analyzeSearch();
    }
});



playerSearch.addEventListener("input", showSuggestions);

function loadSavedLocks() {
    const savedLocks = localStorage.getItem("myLocks");

    if (savedLocks) {
        myLocks = JSON.parse(savedLocks);
        renderMyLocks();
    }
}
function saveLock(playerKey) {
    const player = players[playerKey];

    if (!player) return;

    const alreadySaved = myLocks.some(lock => lock.key === player.key);

    if (!alreadySaved) {
        myLocks.push(player);
    }

    renderMyLocks();
    localStorage.setItem("myLocks", JSON.stringify(myLocks));
}

function removeLock(playerKey) {
    myLocks = myLocks.filter(lock => lock.key !== playerKey);

    localStorage.setItem("myLocks", JSON.stringify(myLocks));

    renderMyLocks();
}
function renderMyLocks() {
    if (myLocks.length === 0) {
        myLocksBox.innerHTML = `<p>No saved locks yet.</p>`;
        return;
    }

    myLocksBox.innerHTML = "";

    myLocks.forEach(function (player) {
        const scoreColor = getScoreColor(player.lockScore);

        const item = document.createElement("div");
        item.classList.add("recent-item");

        item.innerHTML = `
    <span>${player.name} — ${player.prop}</span>
    <span class="${scoreColor}">${player.lockScore}/100</span>
    <button class="remove-lock-btn" onclick="removeLock('${player.key}')">❌</button>
`;

        item.addEventListener("click", function () {
            playerSearch.value = player.name;
            displayPlayer(player);
        });

        myLocksBox.appendChild(item);
    });
}

loadPlayersFromJSON();