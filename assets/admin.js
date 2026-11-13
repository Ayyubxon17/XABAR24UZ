
const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const login = document.getElementById("login");
const desk = document.getElementById("desk");
const msg = document.getElementById("msg");
const drafts = document.getElementById("drafts");

// PAROLNI TIKLASH
client.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    setTimeout(async () => {
      const newPassword = prompt(
        "Yangi parolni kiriting (kamida 8 belgi):"
      );

      if (!newPassword || newPassword.length < 8) {
        alert("Parol kamida 8 belgidan iborat bo‘lishi kerak.");
        return;
      }

      const { error } = await client.auth.updateUser({
        password: newPassword
      });

      if (error) {
        alert("Xatolik: " + error.message);
        return;
      }

      alert("Parol muvaffaqiyatli yangilandi!");

      await client.auth.signOut();

      desk.classList.add("hidden");
      login.classList.remove("hidden");
    }, 100);
  }
});

// TUGMALAR
document.getElementById("signIn")
  .addEventListener("click", signIn);

document.getElementById("signOut")
  .addEventListener("click", signOut);

// ADMIN KIRISHI
async function signIn() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  msg.textContent = "Tekshirilmoqda...";

  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    msg.textContent = "Xatolik: " + error.message;
    return;
  }

  await showDashboard();
}

// CHIQISH
async function signOut() {
  await client.auth.signOut();

  desk.classList.add("hidden");
  login.classList.remove("hidden");
  msg.textContent = "";
}

// ADMIN PANEL
async function showDashboard() {
  login.classList.add("hidden");
  desk.classList.remove("hidden");

  await loadNews();
}

// YANGILIKLARNI YUKLASH
async function loadNews() {
  drafts.textContent = "Yangiliklar yuklanmoqda...";

  const { data, error } = await client
    .from("news")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    drafts.textContent = "Xatolik: " + error.message;
    return;
  }

  drafts.replaceChildren();

  if (!data.length) {
    drafts.textContent = "Hozircha yangiliklar yo‘q.";
    return;
  }

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "panel";

    const title = document.createElement("h2");
    title.textContent = item.title_uz;

    const status = document.createElement("p");
    status.textContent =
      item.status === "published"
        ? "E’lon qilingan"
        : "Qoralama";

    const content = document.createElement("p");
    content.textContent = item.content_uz || "";

    card.append(title, status, content);

    if (item.status === "draft") {
      const publish = document.createElement("button");
      publish.textContent = "E’lon qilish";

      publish.addEventListener("click", () => {
        publishNews(item.id);
      });

      card.append(publish);
    }

    drafts.append(card);
  });
}

// YANGILIKNI E’LON QILISH
async function publishNews(id) {
  if (!confirm("Ushbu yangilikni e’lon qilmoqchimisiz?")) {
    return;
  }

  const { error } = await client
    .from("news")
    .update({
      status: "published",
      published_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    alert("Xatolik: " + error.message);
    return;
  }

  alert("Yangilik e’lon qilindi!");

  await loadNews();
}

// OLDINDAN KIRILGAN ADMINNI TEKSHIRISH
async function checkSession() {
  const { data } = await client.auth.getSession();

  if (data.session) {
    await showDashboard();
  }
}

checkSession();
    
