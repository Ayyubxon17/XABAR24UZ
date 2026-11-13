const client = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

const $ = id => document.getElementById(id);

let allNews = [];

const fields = [
  "title_uz",
  "content_uz",
  "title_ru",
  "content_ru",
  "title_en",
  "content_en",
  "source",
  "image_url"
];

$("signIn").addEventListener("click", signIn);
$("signOut").addEventListener("click", signOut);
$("newsForm").addEventListener("submit", saveDraft);
$("publishNow").addEventListener("click", publishFromForm);
$("cancelEdit").addEventListener("click", resetForm);
$("refreshNews").addEventListener("click", loadNews);
$("searchNews").addEventListener("input", renderNews);
$("statusFilter").addEventListener("change", renderNews);

async function signIn() {
  $("msg").textContent = "Tekshirilmoqda...";

  try {
    const { error } = await client.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });

    if (error) throw error;

    await showDashboard();
  } catch (error) {
    $("msg").textContent = "Kirish xatosi: " + error.message;
  }
}

async function signOut() {
  const { error } = await client.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  $("desk").classList.add("hidden");
  $("login").classList.remove("hidden");
}

async function showDashboard() {
  $("login").classList.add("hidden");
  $("desk").classList.remove("hidden");
  await loadNews();
}

async function loadNews() {
  $("newsList").textContent = "Yangiliklar yuklanmoqda...";

  try {
    const { data, error } = await client
      .from("news")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    allNews = data || [];
    updateStats();
    renderNews();
  } catch (error) {
    $("newsList").textContent =
      "Xatolik: " + error.message;
  }
}

function updateStats() {
  $("totalNews").textContent = allNews.length;
  $("publishedNews").textContent =
    allNews.filter(n => n.status === "published").length;
  $("draftNews").textContent =
    allNews.filter(n => n.status === "draft").length;
}

function renderNews() {
  const list = $("newsList");
  list.replaceChildren();

  const search = $("searchNews").value.toLowerCase().trim();
  const filter = $("statusFilter").value;

  const items = allNews.filter(item => {
    const matchesStatus =
      filter === "all" || item.status === filter;

    const matchesSearch =
      (item.title_uz || "").toLowerCase().includes(search) ||
      (item.title_ru || "").toLowerCase().includes(search) ||
      (item.title_en || "").toLowerCase().includes(search);

    return matchesStatus && matchesSearch;
  });

  if (!items.length) {
    list.textContent = "Bu bo‘limda yangilik topilmadi.";
    return;
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "news-item";

    const badge = document.createElement("span");
    badge.className =
      "status " + (item.status === "published" ? "published" : "draft");
    badge.textContent =
      item.status === "published" ? "E’LON QILINGAN" : "QORALAMA";

    const title = document.createElement("h3");
    title.textContent = item.title_uz || "Sarlavhasiz";

    const meta = document.createElement("div");
    meta.className = "news-meta";
    meta.textContent =
      "Manba: " + (item.source || "Ko‘rsatilmagan") +
      " | Sana: " + new Date(item.created_at).toLocaleDateString("uz-UZ");

    const actions = document.createElement("div");
    actions.className = "news-actions";

    const edit = makeButton("Tahrirlash", "light", () => editNews(item));
    actions.append(edit);

    if (item.status === "draft") {
      actions.append(
        makeButton("E’lon qilish", "red", () => changeStatus(item, "published"))
      );
    } else {
      actions.append(
        makeButton("Qoralamaga qaytarish", "dark",
          () => changeStatus(item, "draft"))
      );
    }

    actions.append(
      makeButton("O‘chirish", "light", () => deleteNews(item))
    );

    card.append(badge, title, meta, actions);
    list.append(card);
  });
}

function makeButton(label, style, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn " + style;
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function getFormData() {
  const data = {};

  fields.forEach(field => {
    data[field] = $(field).value.trim();
  });

  return data;
}

async function saveDraft(event) {
  event.preventDefault();
  await saveNews("draft");
}

async function publishFromForm() {
  if (!confirm("Ushbu yangilikni e’lon qilmoqchimisiz?")) {
    return;
  }

  await saveNews("published");
}

async function saveNews(status) {
  const title = $("title_uz").value.trim();

  if (!title) {
    $("formMsg").textContent = "O‘zbekcha sarlavhani kiriting.";
    return;
  }

  const id = $("newsId").value;
  const data = {
    ...getFormData(),
    status,
    published_at: status === "published"
      ? new Date().toISOString()
      : null
  };

  $("formMsg").textContent = "Saqlanmoqda...";

  try {
    let result;

    if (id) {
      result = await client
        .from("news")
        .update(data)
        .eq("id", id);
    } else {
      result = await client
        .from("news")
        .insert(data);
    }

    if (result.error) throw result.error;

    $("formMsg").textContent =
      status === "published"
        ? "Yangilik e’lon qilindi!"
        : "Qoralama saqlandi!";

    resetForm();
    await loadNews();
  } catch (error) {
    $("formMsg").textContent = "Saqlash xatosi: " + error.message;
  }
}

function editNews(item) {
  $("newsId").value = item.id;

  fields.forEach(field => {
    $(field).value = item[field] || "";
  });

  $("editorTitle").textContent = "Yangilikni tahrirlash";
  $("cancelEdit").classList.remove("hidden");

  document.getElementById("editor").scrollIntoView({
    behavior: "smooth"
  });
}

function resetForm() {
  $("newsForm").reset();
  $("newsId").value = "";
  $("editorTitle").textContent = "Yangi yangilik yaratish";
  $("cancelEdit").classList.add("hidden");
}

async function changeStatus(item, status) {
  const question = status === "published"
    ? "Yangilikni e’lon qilasizmi?"
    : "Yangilikni qoralamaga qaytarasizmi?";

  if (!confirm(question)) return;

  const { error } = await client
    .from("news")
    .update({
      status,
      published_at: status === "published"
        ? new Date().toISOString()
        : null
    })
    .eq("id", item.id);

  if (error) {
    alert("Xatolik: " + error.message);
    return;
  }

  await loadNews();
}

async function deleteNews(item) {
  if (!confirm("Bu yangilik butunlay o‘chirilsinmi?")) return;

  const { error } = await client
    .from("news")
    .delete()
    .eq("id", item.id);

  if (error) {
    alert("O‘chirish xatosi: " + error.message);
    return;
  }

  await loadNews();
}

async function checkSession() {
  try {
    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    if (data.session) {
      await showDashboard();
    } else {
      $("login").classList.remove("hidden");
      $("desk").classList.add("hidden");
    }
  } catch (error) {
    $("msg").textContent = "Sessiya xatosi: " + error.message;
  }
}

checkSession();
        
