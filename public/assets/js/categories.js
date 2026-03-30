// ── CRISP LIVE CHAT ──────────────────────────────────────────────────────
window.$crisp = [];
window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
(function () {
  var d = document, s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();

// ═══════════════════════════════════════════════════════════════
//  CATEGORY CONFIG — keys match your DB categoryid column (1–10)
// ═══════════════════════════════════════════════════════════════
const CATEGORIES = {
  1:  { title: "USA Premium",     icon: "🇺🇸", subcategories: ["Supplements","Vitamins","Protein Powders","Omega 3","Multivitamins","Pre-Workout","Post-Workout","Creatine","Weight Management","Immunity Boosters"] },
  2:  { title: "General Health",  icon: "❤️",  subcategories: ["Fever & Cold","Digestive Health","Vitamins & Minerals","Immunity Boosters","Energy & Stamina","Antacids","Cough Syrups","Eye Care","Ear Care","Wound Care"] },
  3:  { title: "Pain Relief",     icon: "⚡",  subcategories: ["Headache Relief","Muscle Pain","Joint Pain","Back Pain","Sprains & Strains","Patches & Gels","Anti-inflammatory","Nerve Pain","Period Pain","Analgesics"] },
  4:  { title: "Cardiac Care",    icon: "🫀",  subcategories: ["Blood Pressure","Cholesterol","Blood Thinners","Heart Supplements","Omega 3","BP Monitors","Antiarrhythmics","Diuretics","Vasodilators","Cardiac Devices"] },
  5:  { title: "Mental Health",   icon: "🧠",  subcategories: ["Anti-Anxiety","Sleep Aids","Antidepressants","Stress Relief","Mood Stabilizers","Cognitive Health","Meditation Aids","ADHD Support","Nootropics","Adaptogens"] },
  6:  { title: "Sexual Wellness", icon: "💜",  subcategories: ["Men's Performance","Women's Wellness","Fertility Support","Contraceptives","Lubrication","Hormonal Balance","STI Prevention","Libido Support","Intimate Care","Pregnancy Tests"] },
  7:  { title: "Skincare",        icon: "✨",  subcategories: ["Face Wash","Moisturisers","Sunscreen","Serums","Face Masks","Acne Care","Anti-Ageing","Body Lotion","Toners","Eye Cream"] },
  8:  { title: "Steroids",        icon: "💪",  subcategories: ["Anabolic Steroids","Corticosteroids","Topical Steroids","Nasal Steroids","Inhaled Steroids","Oral Steroids","Injectable","PCT Support","Anti-Estrogen","Growth Hormone"] },
  9:  { title: "Women's Health",  icon: "🌸",  subcategories: ["Menstrual Care","PCOS / PCOD","Menopause","Pregnancy Care","Prenatal Vitamins","Breast Health","Bone Health","Iron Supplements","Hormonal Health","Intimate Hygiene"] },
  10: { title: "Men's Health",    icon: "🏃",  subcategories: ["Testosterone Support","Prostate Health","Hair Loss","Sexual Performance","Muscle Building","Stamina & Energy","Beard Care","Protein Supplements","Zinc & Magnesium","Liver Health"] },
};

const PRODUCTS_PER_PAGE = 12;

// ── STATE ────────────────────────────────────────────────────────────────
let allProducts  = [];
let filteredList = [];
let currentPage  = 1;
let activeCatID  = null;
let searchQuery  = "";
let activeSubcats = new Set();
let quantities   = {};

// ── URL PARAMS ───────────────────────────────────────────────────────────
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    catID:  parseInt(p.get("catogeriesID")) || 1,
    search: (p.get("search") || "").trim(),
  };
}

// ── BOOT ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const { catID, search } = getParams();
  activeCatID = catID;
  searchQuery = search.toLowerCase();

  setPageMeta(catID);
  buildSidebar(catID);
  showSkeletons();

  await fetchCartCount();
  await loadProducts(catID);
  await buildSearchSuggestions();
});

// ── PAGE META ────────────────────────────────────────────────────────────
function setPageMeta(catID) {
  const cat = CATEGORIES[catID] || CATEGORIES[1];
  document.title = `${cat.title} – TrueMeds Pharma`;

  const titleEl = document.getElementById("categoryTitle");
  if (titleEl) titleEl.innerHTML = `<span>${cat.icon}</span> ${cat.title}`;

  const crumb = document.getElementById("breadcrumbCurrent");
  if (crumb) crumb.textContent = cat.title;

  // Highlight active category nav
  document.querySelectorAll(".cat-nav-item").forEach(a => {
    a.classList.toggle("active", parseInt(a.dataset.id) === catID);
  });

  const now = new Date();
  const lu = document.getElementById("lastUpdated");
  if (lu) lu.textContent = `Last updated: ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
}

// ── FETCH PRODUCTS FROM SERVER ───────────────────────────────────────────
// Server returns lowercase fields: productid, productname, imageurl, offerprice, categoryid, rating, tradenames
async function loadProducts(catID) {
  try {
    let products = [];

    // Primary: /products?categoryID=X (uses LEFT JOIN after your server.js fix)
    try {
      const res = await fetch(`/products?categoryID=${catID}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) products = data;
      }
    } catch (_) {}

    // Fallback: GET /products all + filter client-side
    if (products.length === 0) {
      const res = await fetch("/products");
      if (res.ok) {
        const all = await res.json();
        if (Array.isArray(all)) {
          products = all.filter(p => String(p.categoryid) === String(catID));
        }
      }
    }

    allProducts = products;
    applyFiltersAndRender();

  } catch (err) {
    console.error("Error loading products:", err);
    const grid = document.getElementById("productsGrid");
    if (grid) grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load products. Please refresh the page.</p>
      </div>`;
  }
}

// ── APPLY SEARCH + SORT + RENDER ─────────────────────────────────────────
function applyFiltersAndRender() {
  let list = [...allProducts];

  // Live search filter
  if (searchQuery) {
    list = list.filter(p =>
      p.productname && p.productname.toLowerCase().includes(searchQuery)
    );
  }

  // Sort
  const sortEl = document.getElementById("sortSelect");
  const sort   = sortEl ? sortEl.value : "relevance";
  if (sort === "price-low")  list.sort((a, b) => (parseFloat(a.offerprice)||0) - (parseFloat(b.offerprice)||0));
  if (sort === "price-high") list.sort((a, b) => (parseFloat(b.offerprice)||0) - (parseFloat(a.offerprice)||0));
  if (sort === "rating")     list.sort((a, b) => (parseFloat(b.rating)||0)     - (parseFloat(a.rating)||0));
  if (sort === "name")       list.sort((a, b) => (a.productname||"").localeCompare(b.productname||""));

  filteredList = list;

  const countEl = document.getElementById("categoryCount");
  if (countEl) countEl.textContent = `${filteredList.length} product${filteredList.length !== 1 ? "s" : ""} found`;

  currentPage = 1;
  renderPage();
}

// ── RENDER CURRENT PAGE ──────────────────────────────────────────────────
function renderPage() {
  const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
  renderCards(filteredList.slice(start, start + PRODUCTS_PER_PAGE));
  renderPagination();
}

// ── RENDER PRODUCT CARDS ─────────────────────────────────────────────────
// Uses server field names: productid, productname, imageurl, offerprice, tradenames, rating, categoryid
function renderCards(products) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>No products found. Try adjusting your filters.</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    // ── normalise field names — server returns lowercase no-underscore ──
    const id       = p.productid   || p.product_id   || p.id;
    const name     = p.productname || p.product_name || "Product";
    const imgUrl   = p.imageurl    || p.image_url    || "";
    const price    = parseFloat(p.offerprice  || p.offer_price || p.price || 0);
    const rating   = Math.min(5, Math.max(0, parseFloat(p.rating || 0)));
    const catid    = p.categoryid  || p.category_id  || activeCatID;
    const pack     = p.tradenames  || p.trade_names  || "";
    const inStock  = p.stocks === undefined || p.stocks === null || p.stocks > 0;

    const starsHtml = renderStars(rating);
    const safeName  = name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
    const safeImg   = imgUrl.replace(/'/g, "\\'");
    const imgContent = imgUrl
      ? `<img src="${imgUrl}" alt="${name}" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='block'" />
         <span class="product-img-placeholder" style="display:none">💊</span>`
      : `<span class="product-img-placeholder">💊</span>`;

    return `
      <div class="product-card" data-id="${id}"
           onclick="window.location.href='product_overview.html?product_ID=${id}'">
        ${price > 0 ? `<span class="product-badge">${catid == 1 ? "🇺🇸 USA" : "In Stock"}</span>` : ""}
        <button class="product-wishlist"
                onclick="event.stopPropagation(); toggleWishlist(this)"
                title="Add to wishlist">
          <i class="far fa-heart"></i>
        </button>
        <div class="product-img-wrap">
          ${!inStock ? `<div style="position:absolute;inset:0;background:rgba(255,255,255,0.7);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#999;z-index:2;">OUT OF STOCK</div>` : ""}
          ${imgContent}
        </div>
        <div class="product-body">
          <div class="product-name">${name}</div>
          ${pack ? `<div class="product-pack">${pack.split(",")[0].trim()}</div>` : ""}
          ${catid == 1 ? `<div class="product-pack" style="color:var(--primary);font-weight:600;">🚚 4–5 Day Delivery</div>` : ""}
          ${rating > 0 ? `
            <div class="product-rating">
              <div class="stars">${starsHtml}</div>
              <span class="rating-value">${rating.toFixed(1)}</span>
            </div>` : ""}
          
         
          <div class="qty-stepper" id="stepper-${id}">
            <button class="qty-btn" onclick="event.stopPropagation(); changeQty('${id}', -1)">−</button>
            <span class="qty-value" id="qty-${id}">1</span>
            <button class="qty-btn" onclick="event.stopPropagation(); changeQty('${id}', 1)">+</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

// ── STAR RENDERER ────────────────────────────────────────────────────────
function renderStars(rating) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    if (rating >= i)           html += `<i class="fas fa-star"></i>`;
    else if (rating >= i - 0.5) html += `<i class="fas fa-star-half-alt"></i>`;
    else                       html += `<i class="far fa-star empty"></i>`;
  }
  return html;
}

// ── SKELETON LOADERS ─────────────────────────────────────────────────────
function showSkeletons() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  grid.innerHTML = Array(8).fill(0).map(() => `
    <div class="skel-card">
      <div class="skel-img skeleton"></div>
      <div class="skel-body">
        <div class="skel-line skeleton" style="width:80%"></div>
        <div class="skel-line skeleton" style="width:55%"></div>
        <div class="skel-line skeleton" style="width:40%;height:18px"></div>
        <div class="skel-line skeleton" style="width:100%;height:34px;margin-top:8px"></div>
      </div>
    </div>`).join("");
}

// ── PAGINATION ───────────────────────────────────────────────────────────
function renderPagination() {
  const totalPages = Math.ceil(filteredList.length / PRODUCTS_PER_PAGE);
  const container  = document.getElementById("pagination");
  if (!container) return;
  if (totalPages <= 1) { container.innerHTML = ""; return; }

  let html = `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>
    <i class="fas fa-chevron-left"></i> Prev</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>
    Next <i class="fas fa-chevron-right"></i></button>`;
  container.innerHTML = html;
}

function goToPage(page) {
  const total = Math.ceil(filteredList.length / PRODUCTS_PER_PAGE);
  if (page < 1 || page > total) return;
  currentPage = page;
  renderPage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── ADD TO CART — POST /add-to-cart ──────────────────────────────────────
async function handleAdd(btn, productId, categoryId, name, price, imageurl) {
  const orig = btn.textContent.trim();
  btn.textContent = "Adding...";
  btn.disabled = true;

  try {
    const res = await fetch("/add-to-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, categoryId, name, quantity: 1, price, imageurl }),
    });
    const data = await res.json();

    if (data.success) {
      btn.classList.add("added");
      btn.textContent = "✓ Added";
      quantities[productId] = (quantities[productId] || 0) + 1;

      // Switch to qty stepper
      btn.style.display = "none";
      const stepper = document.getElementById(`stepper-${productId}`);
      if (stepper) {
        stepper.classList.add("visible");
        const qEl = document.getElementById(`qty-${productId}`);
        if (qEl) qEl.textContent = quantities[productId];
      }

      await fetchCartCount(); // always re-fetch from server

      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove("added");
        btn.disabled = false;
      }, 2000);
    } else {
      btn.textContent = orig;
      btn.disabled = false;
    }
  } catch (err) {
    console.error("Add to cart error:", err);
    btn.textContent = orig;
    btn.disabled = false;
  }
}

// ── QUANTITY STEPPER ─────────────────────────────────────────────────────
function changeQty(id, delta) {
  quantities[id] = (quantities[id] || 1) + delta;
  if (quantities[id] <= 0) {
    quantities[id] = 0;
    const stepper = document.getElementById(`stepper-${id}`);
    if (stepper) stepper.classList.remove("visible");
    const btn = document.getElementById(`btn-${id}`);
    if (btn) { btn.style.display = ""; btn.textContent = "ADD TO CART"; }
    return;
  }
  const qEl = document.getElementById(`qty-${id}`);
  if (qEl) qEl.textContent = quantities[id];
}

// ── CART BADGE — GET /api/cart/count ─────────────────────────────────────
// FIX: No localStorage short-circuit — always fetches fresh from server
async function fetchCartCount() {
  try {
    const res  = await fetch("/api/cart/count");
    const data = await res.json();
    if (data.success) {
      const count = parseInt(data.count);
      // Support both id="cartBadge" (new design) and id="cart-count" (old design)
      ["cartBadge", "cart-count"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = count;
        el.style.display = count > 0 ? "inline-flex" : "none";
        if (count > 0) {
          el.style.transform = "scale(1.4)";
          setTimeout(() => { el.style.transform = "scale(1)"; }, 200);
        }
      });
      localStorage.setItem("cartCount", count);
    }
  } catch (err) {
    console.error("Cart count error:", err);
  }
}

// ── WISHLIST TOGGLE ──────────────────────────────────────────────────────
function toggleWishlist(btn) {
  btn.classList.toggle("wishlisted");
  const icon = btn.querySelector("i");
  icon.classList.toggle("far");
  icon.classList.toggle("fas");
}

// ── SORT ─────────────────────────────────────────────────────────────────
const sortEl = document.getElementById("sortSelect");
if (sortEl) sortEl.addEventListener("change", () => { currentPage = 1; applyFiltersAndRender(); });

// ── SIDEBAR SUBCATEGORY FILTERS ──────────────────────────────────────────
function buildSidebar(catID) {
  const cat  = CATEGORIES[catID] || CATEGORIES[1];
  const list = document.getElementById("subcategoryList");
  if (!list) return;

  list.innerHTML = cat.subcategories.map((sub, i) => `
    <li class="subcat-item" data-name="${sub}">
      <input type="checkbox" id="sub${i}" data-name="${sub}" />
      <label for="sub${i}" style="cursor:pointer;flex:1">${sub}</label>
    </li>`).join("");

  list.querySelectorAll(".subcat-item").forEach(li => {
    li.addEventListener("click", e => {
      if (e.target.tagName === "INPUT") return;
      const cb = li.querySelector("input");
      cb.checked = !cb.checked;
      toggleSubcat(li.dataset.name, cb.checked, li);
    });
    li.querySelector("input").addEventListener("change", e => {
      toggleSubcat(li.dataset.name, e.target.checked, li);
    });
  });
}

function toggleSubcat(name, checked, el) {
  if (checked) { activeSubcats.add(name); el.classList.add("active"); }
  else         { activeSubcats.delete(name); el.classList.remove("active"); }
  updateChips();
}

function updateChips() {
  const container = document.getElementById("activeFilters");
  if (!container) return;
  container.innerHTML = [...activeSubcats].map(name => `
    <div class="filter-chip" onclick="removeSubcat('${name.replace(/'/g,"\\'")}')">
      ${name} <i class="fas fa-times"></i>
    </div>`).join("");
}

function removeSubcat(name) {
  activeSubcats.delete(name);
  document.querySelectorAll(".subcat-item").forEach(li => {
    if (li.dataset.name === name) {
      li.classList.remove("active");
      li.querySelector("input").checked = false;
    }
  });
  updateChips();
}

const clearBtn = document.getElementById("clearFilters");
if (clearBtn) clearBtn.addEventListener("click", () => {
  activeSubcats.clear();
  document.querySelectorAll(".subcat-item").forEach(li => {
    li.classList.remove("active");
    li.querySelector("input").checked = false;
  });
  updateChips();
});

// Sidebar show-all toggle
let sidebarExpanded = false;
const showAllBtn = document.getElementById("sidebarShowAll");
if (showAllBtn) showAllBtn.addEventListener("click", () => {
  const list = document.getElementById("subcategoryList");
  sidebarExpanded = !sidebarExpanded;
  list.style.maxHeight = sidebarExpanded ? "none" : "420px";
  showAllBtn.innerHTML = sidebarExpanded
    ? `<i class="fas fa-chevron-up"></i> Show less`
    : `<i class="fas fa-chevron-down"></i> Show all`;
});

// ── HEADER SEARCH SUGGESTIONS ────────────────────────────────────────────
async function buildSearchSuggestions() {
  try {
    const cached    = localStorage.getItem("SearchProducts");
    const cacheTime = parseInt(localStorage.getItem("SearchProductsTime") || "0");
    let products    = [];

    if (cached && (Date.now() - cacheTime) < 5 * 60 * 1000) {
      products = JSON.parse(cached);
    } else {
      const res = await fetch("/products");
      if (res.ok) {
        products = await res.json();
        localStorage.setItem("SearchProducts", JSON.stringify(products));
        localStorage.setItem("SearchProductsTime", Date.now().toString());
      }
    }

    const input  = document.getElementById("mainSearch");
    const btn    = document.getElementById("searchBtn");
    const sugBox = document.getElementById("suggestions");
    if (!input || !sugBox) return;

    // Pre-fill if URL has ?search=
    if (searchQuery) input.value = searchQuery;

    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      sugBox.innerHTML = "";
      if (!q) { sugBox.style.display = "none"; return; }

      const matches = products.filter(p =>
        p.product_name && p.product_name.toLowerCase().includes(q)
      ).slice(0, 8);

      if (matches.length) {
        matches.forEach(p => {
          const li  = document.createElement("li");
          const img = document.createElement("img");
          img.src   = p.image_url || "assets/image/default.png";
          img.style.cssText = "width:40px;height:40px;object-fit:cover;margin-right:10px;border-radius:6px;flex-shrink:0;";
          img.onerror = () => { img.style.display = "none"; };
          const span = document.createElement("span");
          span.textContent = p.product_name;
          li.appendChild(img); li.appendChild(span);
          li.addEventListener("click", () => {
            window.location.href = `product_overview.html?product_ID=${p.product_id}`;
          });
          sugBox.appendChild(li);
        });
        sugBox.style.display = "block";
      } else {
        const li = document.createElement("li");
        li.textContent = "No products found";
        li.style.cssText = "padding:12px 14px;color:#999;cursor:default;";
        sugBox.appendChild(li);
        sugBox.style.display = "block";
      }
    });

    document.addEventListener("click", e => {
      if (!e.target.closest(".search-bar")) sugBox.style.display = "none";
    });

    function doSearch() {
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      const exact = products.find(p =>
        p.productname && p.productname.toLowerCase() === q
      );
      if (exact) {
        window.location.href = `product_overview.html?product_ID=${exact.productid}`;
      } else {
        // Filter current category page by search term
        searchQuery = q;
        applyFiltersAndRender();
        sugBox.style.display = "none";
      }
    }

    if (btn) btn.addEventListener("click", doSearch);
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } });

  } catch (err) {
    console.error("Search suggestions error:", err);
  }
}

// ── MOBILE SIDEBAR ───────────────────────────────────────────────────────
const sidebar        = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const mobileFilterBtn = document.getElementById("mobileFilterBtn");

if (mobileFilterBtn) mobileFilterBtn.addEventListener("click", () => {
  sidebar.classList.add("mobile-open");
  if (sidebarOverlay) sidebarOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
});
if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);
function closeSidebar() {
  if (sidebar) sidebar.classList.remove("mobile-open");
  if (sidebarOverlay) sidebarOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

// ── MOBILE NAV DRAWER ────────────────────────────────────────────────────
const menuToggle  = document.getElementById("menuToggle");
const mobileMenu  = document.getElementById("mobileMenu");
const mobileClose = document.getElementById("mobileClose");
const mobileOverlay = document.getElementById("mobileOverlay");

if (menuToggle)    menuToggle.addEventListener("click",    () => { mobileMenu.classList.add("open"); document.body.style.overflow = "hidden"; });
if (mobileClose)   mobileClose.addEventListener("click",  () => { mobileMenu.classList.remove("open"); document.body.style.overflow = ""; });
if (mobileOverlay) mobileOverlay.addEventListener("click", () => { mobileMenu.classList.remove("open"); document.body.style.overflow = ""; });

// ── SCROLL TO TOP + STICKY HEADER SHADOW ────────────────────────────────
const scrollTopBtn = document.getElementById("scrollTop");
window.addEventListener("scroll", () => {
  if (scrollTopBtn) scrollTopBtn.classList.toggle("visible", window.scrollY > 400);
  const header = document.querySelector("header");
  if (header) header.style.boxShadow = window.scrollY > 10
    ? "0 2px 12px rgba(0,0,0,0.12)"
    : "0 1px 4px rgba(0,0,0,0.1)";
});
if (scrollTopBtn) scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// ── SEARCH PLACEHOLDER ROTATION ──────────────────────────────────────────
const phs = ["Search for medicines...","Search for skincare...","Search for supplements...","Search for pain relief...","Search for cardiac care..."];
let phi = 0;
setInterval(() => {
  phi = (phi + 1) % phs.length;
  const el = document.getElementById("mainSearch");
  if (el && document.activeElement !== el) el.setAttribute("placeholder", phs[phi]);
}, 3000);