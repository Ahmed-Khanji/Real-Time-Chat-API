// client.js
const socket = io();

const nameEl = document.getElementById("name");
const roomEl = document.getElementById("room");
const joinBtn = document.getElementById("join");
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const userList = document.getElementById("userList");

// restore previous values
nameEl.value = localStorage.getItem("name") || "";
roomEl.value = localStorage.getItem("room") || "global";

joinBtn.addEventListener("click", () => {
  const name = nameEl.value.trim() || "Anonymous";
  const room = roomEl.value.trim() || "global";
  localStorage.setItem("name", name);
  localStorage.setItem("room", room);
  socket.emit("join", { name, room });
});

socket.on("init", ({ recent }) => {
  messages.innerHTML = "";
  recent.forEach(addMessage);
  scrollToBottom();
});

form.addEventListener("submit", e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  socket.emit("chat:message", text);
  input.value = "";
});

let typingTimeout;
input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("typing", false), 800);
});

socket.on("chat:message", addMessage);

socket.on("user:joined", ({ users }) => renderUsers(users));
socket.on("user:left",   ({ users }) => renderUsers(users));

socket.on("user:typing", ({ name, typing: isTyping }) => {
  typing.textContent = isTyping ? `${name} is typing...` : "";
});

function addMessage(msg) {
  const li = document.createElement("li");
  const time = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  li.innerHTML = `<span class="meta">${escapeHtml(msg.user)} • ${time}</span><p>${escapeHtml(msg.text)}</p>`;
  messages.appendChild(li);
  scrollToBottom();
}

function renderUsers(names) {
  userList.innerHTML = "";
  names.forEach(n => {
    const li = document.createElement("li");
    li.textContent = n;
    userList.appendChild(li);
  });
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[m]);
}
