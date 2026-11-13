
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

// Tugmalar va maydonlarni ulash
$("signIn").addEventListener("click", signIn);
$("signOut").addEventListener("click", signOut);
$("newsForm").addEventListener("submit", saveDraft);
$("publishNow").addEventListener("click", publishFromForm);
$("cancelEdit").addEventListener("click", resetForm);
$("refreshNews").addEventListener("click", loadNews);
$("searchNews").addEventListener("input", renderNews);
$("statusFilter").addEventListener("change", renderNews);

// Xabar ko‘rsatish
function showMessage(id, message) {
  $(id).textContent = message;
}

// LOGIN
async function signIn() {
  const button = $("signIn");

  button.disabled = true;
  showMessage("msg", "Tekshirilmoqda...");

  try {
    const { error } = await client.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });

    if (error) throw error;

    $("password").value = "";
    await showDashboard();

  } catch (error) {
    showMessage("msg", "Kirish xatosi: " + error.message);
  } finally {
    button.disabled = false;
  }
}

// LOGOUT
async function signOut() {
  if (!confirm("Admin tizimidan chiqmoqchimisiz?")) return;

  const { error } = await client.auth.signOut();

  if (error) {
    alert("Chiqish xatosi: " + error.message);
    return;
  }

  $("desk").classList.add("hidden");
  $("login").classList.remove("hidden");
  showMessage("msg", "Tizimdan chiqildi.");
}

// DASHBOARD
async function showDashboard() {
  $("login").classList.add("hidden");
  $("desk").classList.remove("hidden");

  await loadNews();
}

// YANGILIKLARNI YUKLASH
async function loadNews() {
  $("newsList").textContent = "Yangiliklar yuklanmoqda...";

  $("refreshNews").disabled = true;

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
      "Ma’lumot yuklash xatosi: " + error.message;
  } finally {
    $("refreshNews").disabled = false;
  }
}

// STATISTIKA
function updateStats() {
  $("totalNews").textContent = allNews.length;

  $("publishedNews").textContent =
    allNews.filter(item => item.status === "published").length;

  $("draftNews").textContent =
    allNews.filter(item => item.status === "draft").length;
}

// YANGILIKLAR RO‘YXATI
function renderNews() {
  const list = $("newsList");
  list.replaceChildren();

  const search = $("searchNews").value
    .toLowerCase()
    .trim();

  const filter = $("statusFilter").value;

  const items = allNews.filter(item => {
    const matchesStatus =
      filter === "all" || item.status === filter;

    const text = [
      item.title_uz,
      item.title_ru,
      item.title_en,
      item.source
    ].join(" ").toLowerCase();

    return matchesStatus && text.includes(search);
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
      "status " +
      (item.status === "published" ? "published" : "draft");

    badge.textContent =
      item.status === "published"
        ? "E’LON QILINGAN"
        : "QORALAMA";

    const title = document.createElement("h3");
    title.textContent = item.title_uz || "Sarlavhasiz";

    const meta = document.createElement("div");
    meta.className = "news-meta";

    const date = item.created_at
      ? new Date(item.created_at).toLocaleDateString("uz-UZ")
      : "Noma’lum";

    meta.textContent =
      "Manba: " + (item.source || "Ko‘rsatilmagan") +
      " | Sana: " + date;

    const actions = document.createElement("div");
    actions.className = "news-actions";

    actions.append(
      makeButton("Tahrirlash", "light", () => editNews(item))
    );

    if (item.status === "draft") {
      actions.append(
        makeButton(
          "E’lon qilish",
          "red",
          () => changeStatus(item, "published")
        )
      );
    } else {
      actions.append(
        makeButton(
          "Qoralamaga qaytarish",
          "dark",
          () => changeStatus(item, "draft")
        )
      );
    }

    actions.append(
      makeButton("O‘chirish", "light", () => deleteNews(item))
    );

    card.append(badge, title, meta, actions);
    list.append(card);
  });
}

// TUGMA YASASH
function makeButton(label, style, action) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "btn " + style;
  button.textContent = label;
  button.addEventListener("click", action);

  return button;
}

// FORM MA’LUMOTLARI
function getFormData() {
  const data = {};

  fields.forEach(field => {
    data[field] = $(field).value.trim();
  });

  return data;
}

// QORALAMA SAQLASH
async function saveDraft(event) {
  event.preventDefault();
  await saveNews("draft");
}

// E’LON QILISH
async function publishFromForm() {
  if (!$("newsForm").reportValidity()) return;

  if (!confirm("Ushbu yangilikni e’lon qilmoqchimisiz?")) {
    return;
  }

  await saveNews("published");
}

// YANGILIKNI SAQLASH
async function saveNews(status) {
  if (!$("newsForm").reportValidity()) return;

  const id = $("newsId").value;

  const data = {
    ...getFormData(),
    status,
    published_at: status === "published"
      ? new Date().toISOString()
      : null
  };

  const saveButton = status === "draft"
    ? $("saveDraft")
    : $("publishNow");

  saveButton.disabled = true;
  showMessage("formMsg", "Saqlanmoqda...");

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

    showMessage(
      "formMsg",
      status === "published"
        ? "Yangilik e’lon qilindi!"
        : "Qoralama saqlandi!"
    );

    resetForm();
    await loadNews();

  } catch (error) {
    showMessage("formMsg", "Saqlash xatosi: " + error.message);
  } finally {
    saveButton.disabled = false;
  }
}

// MAQOLANI TAHRIRLASH
function editNews(item) {
  $("newsId").value = item.id;

  fields.forEach(field => {
    $(field).value = item[field] || "";
  });

  $("editorTitle").textContent = "Yangilikni tahrirlash";
  $("cancelEdit").classList.remove("hidden");

  $("editor").scrollIntoView({
    behavior: "smooth"
  });

  showMessage("formMsg", "Maqola tahrirlash uchun ochildi.");
}

// FORMNI TOZALASH
function resetForm() {
  $("newsForm").reset();
  $("newsId").value = "";

  $("editorTitle").textContent = "Yangi maqola yaratish";

  $("cancelEdit").classList.add("hidden");
}

// STATUSNI O‘ZGARTIRISH
async function changeStatus(item, status) {
  const question = status === "published"
    ? "Yangilikni e’lon qilasizmi?"
    : "Yangilikni qoralamaga qaytarasizmi?";

  if (!confirm(question)) return;

  try {
    const { error } = await client
      .from("news")
      .update({
        status,
        published_at: status === "published"
          ? new Date().toISOString()
          : null
      })
      .eq("id", item.id);

    if (error) throw error;

    await loadNews();

  } catch (error) {
    alert("Xatolik: " + error.message);
  }
}

// YANGILIKNI O‘CHIRISH
async function deleteNews(item) {
  if (!confirm("Bu yangilik butunlay o‘chirilsinmi?")) {
    return;
  }

  try {
    const { error } = await client
      .from("news")
      .delete()
      .eq("id", item.id);

    if (error) throw error;

    await loadNews();

  } catch (error) {
    alert("O‘chirish xatosi: " + error.message);
  }
}

// AVVALGI LOGIN HOLATINI TEKSHIRISH
async function checkSession() {
  try {
    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    if (data.session) {
      await showDashboard();
    } else {
      $("desk").classList.add("hidden");
      $("login").classList.remove("hidden");
    }

  } catch (error) {
    showMessage("msg", "Sessiya xatosi: " + error.message);
  }
}

// ISHGA TUSHIRISH
checkSession();
  
