async function fetchPlayers() {
  const res = await fetch('/api/players');
  return res.json();
}

async function fetchMatches() {
  const res = await fetch('/api/matches');
  return res.json();
}

async function createMatch() {
  const date = document.getElementById('matchDate').value;
  if (!date) return alert("Pick a date");

  await fetch('/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date })
  });

  loadMatches();
}

async function loadMatches() {
  const matches = await fetchMatches();
  const selector = document.getElementById('matchSelector');
  selector.innerHTML = matches.map(m => `<option value="${m.id}">${m.date}</option>`).join('');
  loadAttendance();
}

async function loadAttendance() {
  const matchId = document.getElementById('matchSelector').value;
  if (!matchId) return;

  const res = await fetch(`/api/attendance/${matchId}`);
  const data = await res.json();

  const tableBody = document.querySelector('#attendanceTable tbody');
  tableBody.innerHTML = '';
  data.forEach(p => {
    const row = document.createElement('tr');
    row.className = p.paid ? 'paid' : 'unpaid';
    row.innerHTML = `
      <td>${p.name}</td>
      <td>
        <input type="checkbox" ${p.paid ? 'checked' : ''} onclick="togglePaid(${matchId}, ${p.player_id}, this.checked)">
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function togglePaid(matchId, playerId, paid) {
  await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ match_id: matchId, player_id: playerId, paid })
  });
  loadAttendance();
}

async function loadPlayers() {
  const players = await fetchPlayers();
  const list = document.getElementById('playerList');
  list.innerHTML = players.map(p => `<li>${p.name}</li>`).join('');
}

window.onload = () => {
  loadPlayers();
  loadMatches();
};
