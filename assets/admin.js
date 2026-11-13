const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const login = document.getElementById("login");
const desk = document.getElementById("desk");
const msg = document.getElementById("msg");
const drafts = document.getElementById("drafts");

document.getElementById("signIn").addEventListener("click", signIn);
document.getElementById("signOut").addEventListener("click", signOut);

async function signIn() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  msg.textContent = "Tekshirilmoqda...";

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (!data.session) {
      throw new Error("Kirish sessiyasi yaratilmadi.");
    }

    msg.textContent = "Kirish muvaffaqiyatli!";
    await showDashboard();

  } catch (error) {
    msg.textContent = "Xatolik: " + error.message;
  }
}

async function signOut() {
  await client.auth.signOut();
  desk.classList.add("hidden");
  login.classList.remove("hidden");
  msg.textContent = "";
}

async function showDashboard() {
  login.classList.add("hidden");
  desk.classList.remove("hidden");
  await loadNews();
}

async function loadNews() {
  drafts.textContent = "Yangiliklar yuklanmoqda...";

  try {
    const { data, error } = await client
      .from("news")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    drafts.replaceChildren();

    if (!data || data.length === 0) {
      drafts.textContent = "Hozircha yangiliklar yo‘q.";
      return;
    }

    data.forEach(item => {
      const card = document.createElement("div");
      card.className = "panel";

      const title = document.createElement("h2");
      title.textContent = item.title_uz || "Sarlavhasiz";

      const status = document.createElement("p");
      status.textContent =
        item.status === "published" ? "E’lon qilingan" : "Qoralama";

      const content = document.createElement("p");
      content.textContent = item.content_uz || "";

      card.append(title, status, content);

      if (item.status === "draft") {
        const publish = document.createElement("button");
        publish.textContent = "E’lon qilish";
        publish.addEventListener("click", () => publishNews(item.id));
        card.append(publish);
      }

      drafts.append(card);
    });

  } catch (error) {
    drafts.textContent = "Yangiliklarni yuklashda xato: " + error.message;
  }
}

async function publishNews(id) {
  if (!confirm("Ushbu yangilikni e’lon qilmoqchimisiz?")) return;

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

async function checkSession() {
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;

    if (data.session) {
      await showDashboard();
    }
  } catch (error) {
    msg.textContent = "Sessiya xatosi: " + error.message;
  }
}

checkSession();
  
