const STORAGE_KEY = "mirrorchat.chats.v1";

const chatListEl = document.getElementById("chat-list");
const newChatBtn = document.getElementById("new-chat-btn");
const searchInput = document.getElementById("search-input");
const titleInput = document.getElementById("chat-title");
const messageListEl = document.getElementById("message-list");
const messageForm = document.getElementById("message-form");
const speakerSelect = document.getElementById("speaker-select");
const messageInput = document.getElementById("message-input");
const messageTemplate = document.getElementById("message-template");

let chats = loadChats();
let activeChatId = chats[0]?.id ?? null;

if (!activeChatId) {
  createChat();
} else {
  render();
}

newChatBtn.addEventListener("click", () => createChat());
searchInput.addEventListener("input", renderChatList);

titleInput.addEventListener("input", () => {
  const chat = getActiveChat();
  if (!chat) return;
  chat.title = titleInput.value.trim() || "Untitled Chat";
  saveChats();
  renderChatList();
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  const chat = getActiveChat();
  if (!chat) return;

  const selectedRole = normalizeRole(speakerSelect.value);

  chat.messages.push({
    id: crypto.randomUUID(),
    role: selectedRole,
    content: text,
  });

  messageInput.value = "";
  saveChats();
  renderMessages();
  setSpeakerForChat(chat);
});

function loadChats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    parsed.forEach((chat) => {
      if (!Array.isArray(chat.messages)) return;
      chat.messages.forEach((message) => {
        message.role = normalizeRole(message.role);
      });
    });
    return parsed;
  } catch {
    return [];
  }
}

function saveChats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function createChat() {
  const chat = {
    id: crypto.randomUUID(),
    title: "Untitled Chat",
    messages: [],
  };

  chats.unshift(chat);
  activeChatId = chat.id;
  saveChats();
  render();
}

function normalizeRole(role) {
  return role === "you" ? "you" : "mirror";
}

function getNextRole(chat) {
  const lastRole = normalizeRole(chat?.messages?.at(-1)?.role);
  return lastRole === "you" ? "mirror" : "you";
}

function setSpeakerForChat(chat) {
  speakerSelect.value = chat ? getNextRole(chat) : "you";
}

function deleteChat(chatId) {
  const chatToDelete = chats.find((chat) => chat.id === chatId);
  if (!chatToDelete) return;

  const shouldDelete = window.confirm(
    `Delete "${chatToDelete.title || "Untitled Chat"}"? This cannot be undone.`
  );
  if (!shouldDelete) return;

  chats = chats.filter((chat) => chat.id !== chatId);

  if (activeChatId === chatId) {
    activeChatId = chats[0]?.id ?? null;
  }

  if (!activeChatId) {
    createChat();
    return;
  }

  saveChats();
  render();
}

function getActiveChat() {
  return chats.find((chat) => chat.id === activeChatId) || null;
}

function render() {
  renderChatList();
  renderMessages();
  const chat = getActiveChat();
  titleInput.value = chat?.title || "Untitled Chat";
  setSpeakerForChat(chat);
}

function renderChatList() {
  const query = searchInput.value.trim().toLowerCase();
  chatListEl.innerHTML = "";

  chats
    .filter((chat) => {
      if (!query) return true;

      const titleMatches = chat.title.toLowerCase().includes(query);
      const messageMatches = chat.messages.some((message) =>
        message.content.toLowerCase().includes(query)
      );

      return titleMatches || messageMatches;
    })
    .forEach((chat) => {
      const li = document.createElement("li");
      li.className = "chat-list-item";

      const itemBtn = document.createElement("button");
      itemBtn.type = "button";
      itemBtn.className = `chat-item sidebar-btn${chat.id === activeChatId ? " active" : ""}`;
      itemBtn.textContent = chat.title || "Untitled Chat";
      itemBtn.addEventListener("click", () => {
        activeChatId = chat.id;
        render();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "chat-delete-btn";
      deleteBtn.setAttribute("aria-label", `Delete ${chat.title || "Untitled Chat"}`);
      deleteBtn.textContent = "🗑";
      deleteBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteChat(chat.id);
      });

      li.append(itemBtn);
      li.append(deleteBtn);
      chatListEl.append(li);
    });
}

function renderMessages() {
  messageListEl.innerHTML = "";
  const chat = getActiveChat();
  titleInput.value = chat?.title || "Untitled Chat";

  if (!chat || chat.messages.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-state";
    p.textContent =
      "No messages yet. Add both sides of your conversation to think through your next decision.";
    messageListEl.append(p);
    return;
  }

  chat.messages.forEach((message) => {
    const normalizedRole = normalizeRole(message.role);
    const node = messageTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(normalizedRole);
    node.querySelector(".speaker").textContent = normalizedRole === "you" ? "You" : "Mirror";
    node.querySelector(".content").textContent = message.content;
    messageListEl.append(node);
  });

  messageListEl.scrollTop = messageListEl.scrollHeight;
}
