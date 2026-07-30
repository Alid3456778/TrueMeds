// ── CRISP LIVE CHAT ──────────────────────────────────────────────────────
window.$crisp = [];
window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
(function () {
  var d = document, s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();

// ── CART BADGE ───────────────────────────────────────────────────────────
// FIX: Removed localStorage early-return — always fetches fresh from server
document.addEventListener("DOMContentLoaded", async () => {
  const badge = document.querySelector(".cart-badge");
  if (!badge) return;
  try {
    const res = await fetch("/api/cart/count");
    const data = await res.json();
    if (data.success) {
      const count = parseInt(data.count);
      localStorage.setItem("cartCount", count);
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = "inline-flex";
      } else {
        badge.style.display = "none";
      }
    }
  } catch (err) {
    console.error("Error fetching cart count:", err);
  }
});

// ── SHARED PRODUCT DATA ──────────────────────────────────────────────────
// FIX: 5-minute TTL cache so stale data never blocks search
async function getProducts() {
  const cached = localStorage.getItem("SearchProducts");
  const cacheTime = parseInt(localStorage.getItem("SearchProductsTime") || "0");
  const FIVE_MIN = 5 * 60 * 1000;
  if (cached && (Date.now() - cacheTime) < FIVE_MIN) {
    return JSON.parse(cached);
  }
  const res = await fetch("/products");
  const products = await res.json();
  if (!products || !Array.isArray(products)) throw new Error("Invalid product data");
  localStorage.setItem("SearchProducts", JSON.stringify(products));
  localStorage.setItem("SearchProductsTime", Date.now().toString());
  return products;
}

// ── SEARCH (HEADER) ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  buildProductSearch();
});

async function buildProductSearch() {
  try {
    const products = await getProducts();
    const searchInput = document.getElementById("search-input");
    const searchButton = document.querySelector(".search-btn");
    const suggestionBox = document.getElementById("suggestions");
    if (!searchInput || !searchButton || !suggestionBox) return;

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      suggestionBox.innerHTML = "";
      if (!query) { suggestionBox.style.display = "none"; return; }

      const matches = products
        .filter(p => p.product_name && p.product_name.toLowerCase().includes(query))
        .slice(0, 8);

      if (matches.length > 0) {
        matches.forEach(product => {
          const li = document.createElement("li");
          const img = document.createElement("img");
          img.src = product.image_url || "assets/image/default.png";
          img.alt = product.product_name;
          img.style.cssText = "width:40px;height:40px;object-fit:cover;margin-right:10px;border-radius:6px;flex-shrink:0;";
          img.onerror = () => { img.style.display = "none"; };
          const span = document.createElement("span");
          span.textContent = product.product_name;
          li.appendChild(img);
          li.appendChild(span);
          li.addEventListener("click", () => {
            window.location.href = `product_overview.html?product_ID=${product.product_id}`;
          });
          suggestionBox.appendChild(li);
        });
        suggestionBox.style.display = "block";
      } else {
        const li = document.createElement("li");
        li.textContent = "No products found";
        li.style.cssText = "padding:12px 14px;font-size:13px;color:#999;cursor:default;";
        suggestionBox.appendChild(li);
        suggestionBox.style.display = "block";
      }
    });

    // Hide on outside click — .search class wrapper handles this
    document.addEventListener("click", e => {
      if (!e.target.closest(".search")) suggestionBox.style.display = "none";
    });

    function handleSearch() {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) return;
      const match = products.find(p =>
        p.productname && p.productname.toLowerCase() === query
      );
      if (match) {
        window.location.href = `product_overview.html?product_ID=${match.productid}`;
      } else {
        window.location.href = `categories.html?search=${encodeURIComponent(query)}`;
      }
    }

    searchButton.addEventListener("click", handleSearch);
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); handleSearch(); }
    });

  } catch (err) {
    console.error("Error building product search:", err);
  }
}

// ── DRAG-TO-SCROLL (.categories-grid) ───────────────────────────────────
const carousel = document.querySelector(".categories-grid");
if (carousel) {
  let isDown = false, startX, scrollLeft;
  carousel.addEventListener("mousedown", e => {
    isDown = true; carousel.classList.add("active");
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });
  carousel.addEventListener("mouseleave", () => { isDown = false; carousel.classList.remove("active"); });
  carousel.addEventListener("mouseup",    () => { isDown = false; carousel.classList.remove("active"); });
  carousel.addEventListener("mousemove",  e => {
    if (!isDown) return; e.preventDefault();
    carousel.scrollLeft = scrollLeft - (e.pageX - carousel.offsetLeft - startX);
  });
}

// ── NAV DROPDOWN TOGGLE ──────────────────────────────────────────────────
const navButtons = document.querySelectorAll(".nav__btn");
document.addEventListener("click", e => {
  const btn = e.target.closest(".nav__btn");
  if (btn) {
    const key = btn.dataset.menu;
    const menu = document.getElementById(`menu-${key}`);
    navButtons.forEach(b => {
      const other = document.getElementById(`menu-${b.dataset.menu}`);
      if (b !== btn) { b.classList.remove("active"); if (other) other.style.display = "none"; }
    });
    if (menu) {
      const isOpen = btn.classList.toggle("active");
      menu.style.display = isOpen ? "block" : "none";
    }
    return;
  }
  navButtons.forEach(b => {
    const m = document.getElementById(`menu-${b.dataset.menu}`);
    b.classList.remove("active");
    if (m) m.style.display = "none";
  });
});

// ── TESTIMONIALS (/api/reviews) ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("testimonials-grid");
  if (!container) return;
  try {
    const res = await fetch("/api/reviews");
    const data = await res.json();
    if (!data.success || !data.reviews?.length) {
      container.innerHTML = "<p>No customer reviews yet.</p>"; return;
    }
    const verified = data.reviews;
    if (!verified.length) {
      container.innerHTML = "<p>No verified customer reviews yet.</p>"; return;
    }
    container.innerHTML = verified.slice(0, 6).map(r => `
      <div class="testimonial">
        <div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
        <p class="testimonial-text">"${r.review_text}"</p>
        <p class="testimonial-author">${r.name}</p>
         ${
            r.verified
              ? '  <div class="verified-purchase"> <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"> <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg> Verified Purchase  </div>'
              : ' <div class="unverified-purchase"></div>'
          }
      </div>`).join("");
  } catch (err) {
    console.error("Error fetching reviews:", err);
    container.innerHTML = "<p>Failed to load reviews.</p>";
  }
});

// ── TRENDING PRODUCTS (GET /products?categoryID=1) ───────────────────────
// FIX: Grid starts empty in HTML — this fully replaces innerHTML


// ── ADD TO CART (POST /add-to-cart) ──────────────────────────────────────
// FIX: Always re-fetches badge from /api/cart/count after success
async function handleAddToCart(btn, productId, categoryId, name, price, imageurl) {
  const orig = btn.textContent;
  btn.textContent = "Adding...";
  btn.disabled = true;
  try {
    const res = await fetch("/add-to-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, categoryId, name, quantity: 1, price, imageurl })
    });
    const data = await res.json();
    if (data.success) {
      btn.classList.add("added");
      btn.textContent = "✓ Added";
      // Re-fetch badge count from server — never trust localStorage for this
      const countRes  = await fetch("/api/cart/count");
      const countData = await countRes.json();
      if (countData.success) {
        const badge = document.querySelector(".cart-badge");
        const count = parseInt(countData.count);
        if (badge) {
          badge.textContent = count;
          badge.style.display = count > 0 ? "inline-flex" : "none";
          badge.style.transform = "scale(1.5)";
          setTimeout(() => { badge.style.transform = "scale(1)"; }, 250);
        }
        localStorage.setItem("cartCount", count);
      }
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


      /* ── Service card click animation ── */
      function animateClick(el) {
        el.style.transform = "scale(0.95)";
        setTimeout(() => {
          el.style.transform = "";
        }, 150);
      }

      /* ── Scroll to top ── */
      const scrollTopBtn = document.getElementById("scrollTop");
      window.addEventListener("scroll", () => {
        scrollTopBtn.classList.toggle("visible", window.scrollY > 400);
      });
      scrollTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      /* ── Mobile menu ── */
      const mobileMenu = document.getElementById("mobileMenu");
      document.getElementById("menuToggle").addEventListener("click", () => {
        mobileMenu.classList.add("open");
        document.body.style.overflow = "hidden";
      });
      function closeMobileMenu() {  
        mobileMenu.classList.remove("open");
        document.body.style.overflow = "";
      }
      document
        .getElementById("mobileClose")
        .addEventListener("click", closeMobileMenu);
      document
        .getElementById("mobileOverlay")
        .addEventListener("click", closeMobileMenu);

      /* ── Category nav active state ── */
      document.querySelectorAll(".cat-item").forEach((item) => {
        item.addEventListener("click", () => {
          document
            .querySelectorAll(".cat-item")
            .forEach((i) => i.classList.remove("active"));
          item.classList.add("active");
        });
      });

      /* ── Sticky header shadow on scroll ── */
      window.addEventListener("scroll", () => {
        document.querySelector("header").style.boxShadow =
          window.scrollY > 10
            ? "0 2px 12px rgba(0,0,0,0.12)"
            : "0 1px 4px rgba(0,0,0,0.1)";
      });

      /* ── Search placeholder rotation ──
       Targets id="search-input" — same element used by index.js buildProductSearch() */
      const placeholders = [
        "Search for medicines...",
        "Search for pain relief...",
        "Search for skincare products...",
        "Search for cardiac care...",
        "Search for USA premium brands...",
      ];
      let phIdx = 0;
      setInterval(() => {
        phIdx = (phIdx + 1) % placeholders.length;
        const el = document.getElementById("search-input");
        if (el) el.setAttribute("placeholder", placeholders[phIdx]);
      }, 3000);

      /* ── Scroll reveal ── */
      const revealObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.style.opacity = "1";
              e.target.style.transform = "translateY(0)";
            }
          });
        },
        { threshold: 0.08 },
      );
      document
        .querySelectorAll(
          ".section, .trust-section, .offer-banner-section, .hero, .testimonials",
        )
        .forEach((el) => {
          el.style.opacity = "0";
          el.style.transform = "translateY(20px)";
          el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
          revealObs.observe(el);
        });
    
        
      
(function () {
  "use strict";

  const TSS_KEYWORD_PINS = [
    {
      keywords: ["pain", "ache", "relief", "painkiller", "ibuprofen", "nsaid", "aspirin", "paracetamol", "anti-inflammatory"],
      label: "Pain Relief — Top Picks",
      product_ids: []  
    },
    {
      keywords:["anti anzity"],
      label : "Anty Anzity",
      product_ids : [12,1]
    },
    {
      keywords: ["heart", "cardiac", "cholesterol", "blood pressure", "bp", "hypertension", "atorvastatin", "amlodipine"],
      label: "Cardiac Care — Top Picks",
      product_ids: []
    },
    {
      keywords: ["anxiety", "depression", "mental", "sleep", "insomnia", "stress", "alprazolam", "clonazepam", "melatonin"],
      label: "Mental Health — Top Picks",
      product_ids: []
    },
    {
      keywords: ["sexual", "erectile", "viagra", "libido", "sildenafil", "tadalafil", "cialis", "levitra"],
      label: "Sexual Wellness — Top Picks",
      product_ids: []
    },
    {
      keywords: ["skin", "acne", "cream", "derma", "tretinoin", "retinol"],
      label: "Skincare — Top Picks",
      product_ids: []
    },
    {
      keywords: ["steroid", "muscle", "anabolic", "stanozolol"],
      label: "Steroids — Top Picks",
      product_ids: []
    },
    {
      keywords: ["women", "female", "pregnancy", "ovary", "estrogen", "progesterone", "clomid"],
      label: "Women's Health — Top Picks",
      product_ids: []
    },
    {
      keywords: ["men", "testosterone", "prostate", "finasteride", "minoxidil"],
      label: "Men's Health — Top Picks",
      product_ids: []
    },
    {
      keywords: ["vitamin", "supplement", "antibiotic", "metformin", "diabetes", "thyroid"],
      label: "General Health — Top Picks",
      product_ids: []
    },
  ];

  /* Category fallback (used when product_ids array is empty for a keyword match) */
  const KEYWORD_CATEGORY_MAP = [
    { id: 3,  name: "Pain Relief",     words: ["pain","ache","relief","painkiller","ibuprofen","nsaid","aspirin","paracetamol","anti-inflammatory"] },
    { id: 4,  name: "Cardiac Care",    words: ["heart","cardiac","cholesterol","blood pressure","bp","hypertension","atorvastatin","amlodipine"] },
    { id: 5,  name: "Mental Health",   words: ["anxiety","depression","mental","sleep","insomnia","stress","alprazolam","clonazepam","melatonin"] },
    { id: 6,  name: "Sexual Wellness", words: ["sexual","erectile","viagra","libido","sildenafil","tadalafil","cialis","levitra"] },
    { id: 7,  name: "Skincare",        words: ["skin","acne","cream","derma","tretinoin","retinol"] },
    { id: 8,  name: "Steroids",        words: ["steroid","muscle","anabolic","stanozolol"] },
    { id: 9,  name: "Women's Health",  words: ["women","female","pregnancy","ovary","estrogen","progesterone","clomid"] },
    { id: 10, name: "Men's Health",    words: ["men","testosterone","prostate","finasteride","minoxidil"] },
    { id: 2,  name: "General Health",  words: ["vitamin","supplement","antibiotic","metformin","diabetes","thyroid"] },
    { id: 1,  name: "USA Premium",     words: ["usa","premium","branded"] },
  ];

  /* ── STATE ───────────────────────────────────────────────────── */
  let allProducts        = [];
  let selectedProduct    = null;
  let selectedVariants   = [];
  let selectedVariantIdx = 0;
  let productCache       = {};
  let lastQuery          = "";

  /* ── INJECT HTML ─────────────────────────────────────────────── */
  function injectHTML() {
    const grid = document.getElementById("productsGrid");
    if (!grid) return false;
    const section = grid.closest(".section");
    if (!section) return false;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div id="tm-smart-search">
        <p class="tss-label">🔍 Search any medicine</p>

        <div class="tss-bar">
          <span class="tss-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
                 viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input
            id="tss-input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Search medicines, brands, or conditions…"
            aria-label="Search medicines"
          />
          <button class="tss-clear" id="tss-clear" aria-label="Clear search">✕</button>
          <button class="tss-submit" id="tss-submit">Search</button>
          <div class="tss-dropdown" id="tss-dropdown" role="listbox"></div>
        </div>

        <!-- Inline result panel (variants + buy) -->
        <div class="tss-result-panel" id="tss-result-panel"></div>
      </div>
    `;

    section.insertAdjacentElement("afterend", wrapper.firstElementChild);
    return true;
  }

  /* ── PRICE PARSER ────────────────────────────────────────────── */
  function parsePrice(str) {
    if (!str) return 0;
    return parseFloat(String(str).replace(/[^0-9.]/g, "")) || 0;
  }

  /* ── LOAD ALL PRODUCTS (5-min TTL cache) ─────────────────────── */
  async function loadProducts() {
    try {
      const cached    = localStorage.getItem("SearchProducts");
      const cacheTime = parseInt(localStorage.getItem("SearchProductsTime") || "0");
      if (cached && (Date.now() - cacheTime) < 5 * 60 * 1000) {
        allProducts = JSON.parse(cached);
        return;
      }
      const res  = await fetch("/products");
      const data = await res.json();
      if (Array.isArray(data)) {
        allProducts = data;
        localStorage.setItem("SearchProducts", JSON.stringify(data));
        localStorage.setItem("SearchProductsTime", Date.now().toString());
      }
    } catch (e) {
      console.error("[SmartSearch] Failed to load products:", e);
    }
  }

  /* ── KEYWORD MATCHING ────────────────────────────────────────── */
  function getKeywordPin(query) {
    const q = query.toLowerCase();
    return TSS_KEYWORD_PINS.find(group =>
      group.keywords.some(w => q.includes(w))
    ) || null;
  }

  function getKeywordCategory(query) {
    const q = query.toLowerCase();
    return KEYWORD_CATEGORY_MAP.find(cat =>
      cat.words.some(w => q.includes(w))
    ) || null;
  }

  /* ── BUILD SUGGESTIONS ───────────────────────────────────────── */
  function buildSuggestions(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const suggestions = [];
    const shownIds    = new Set();

    // ① PINNED products by keyword (configured by you)
    const pin = getKeywordPin(q);
    if (pin && pin.product_ids && pin.product_ids.length > 0) {
      const pinned = allProducts.filter(p =>
        pin.product_ids.includes(p.product_id) ||
        pin.product_ids.includes(Number(p.product_id))
      );
      if (pinned.length > 0) {
        suggestions.push({ type: "group-label", text: pin.label });
        pinned.forEach(p => {
          shownIds.add(p.product_id);
          suggestions.push({ type: "product", product: p });
        });
      }
    } else {
      // ② CATEGORY fallback when no pinned ids
      const catMatch = getKeywordCategory(q);
      if (catMatch) {
        const catProducts = allProducts
          .filter(p => String(p.category_id) === String(catMatch.id))
          .slice(0, 4);
        if (catProducts.length > 0) {
          suggestions.push({ type: "group-label", text: `${catMatch.name}` });
          catProducts.forEach(p => {
            shownIds.add(p.product_id);
            suggestions.push({ type: "product", product: p });
          });
        }
      }
    }

    // ③ Direct name match (up to 6, excluding already shown)
    const nameMatches = allProducts
      .filter(p =>
        !shownIds.has(p.product_id) &&
        (p.product_name || "").toLowerCase().includes(q)
      )
      .slice(0, 6);

    if (nameMatches.length > 0) {
      if (suggestions.length > 0) {
        suggestions.push({ type: "group-label", text: "Products" });
      }
      nameMatches.forEach(p => suggestions.push({ type: "product", product: p }));
    }

    return suggestions;
  }

  /* ── RENDER DROPDOWN ─────────────────────────────────────────── */
  function renderDropdown(query, suggestions) {
    const dd = document.getElementById("tss-dropdown");
    if (!dd) return;

    if (!suggestions.length) {
      // Show "not found" option
      dd.innerHTML = `
        <div class="tss-no-result">
          No medicine found for "<strong>${escHtml(query)}</strong>"
        </div>
        <div class="tss-dd-item tss-request-trigger" role="option" id="tss-trigger-request">
          <div class="tss-dd-pill">📋</div>
          <div class="tss-dd-meta">
            <div class="tss-dd-name">Request this medicine</div>
            <div class="tss-dd-sub">Tell us what you need — our team will add it</div>
          </div>
          <div class="tss-dd-price" style="color:#e67e22;">Request →</div>
        </div>`;
      dd.classList.add("open");

      document.getElementById("tss-trigger-request")?.addEventListener("click", () => {
        closeDropdown();
        showRequestForm(query);
      });
      return;
    }

    dd.innerHTML = suggestions.map((s) => {
      if (s.type === "group-label") {
        return `<div class="tss-dd-group-label">${escHtml(s.text)}</div>`;
      }
      const p       = s.product;
      const imgHtml = p.image_url
        ? `<img src="${escHtml(p.image_url)}" alt="" onerror="this.style.display='none'">`
        : `<div class="tss-dd-pill">💊</div>`;
      return `
        <div class="tss-dd-item" role="option" data-product-id="${p.product_id}">
          ${imgHtml}
          <div class="tss-dd-meta">
            <div class="tss-dd-name">${escHtml(p.product_name || "Product")}</div>
            <div class="tss-dd-sub">${escHtml(p.trade_names || "")}</div>
          </div>
          <div class="tss-dd-price">View →</div>
        </div>`;
    }).join("");

    dd.classList.add("open");

    // Attach click handlers
    dd.querySelectorAll(".tss-dd-item[data-product-id]").forEach(el => {
      el.addEventListener("click", () => {
        const pid     = el.getAttribute("data-product-id");
        const product = allProducts.find(p => String(p.product_id) === String(pid));
        if (product) selectProduct(product);
      });
    });
  }

  /* ── SELECT PRODUCT → FETCH VARIANTS → RENDER PANEL ─────────── */
  async function selectProduct(product) {
    selectedProduct    = product;
    selectedVariants   = [];
    selectedVariantIdx = 0;

    const input = document.getElementById("tss-input");
    if (input) input.value = product.product_name || "";
    const clear = document.getElementById("tss-clear");
    if (clear) clear.style.display = "flex";

    closeDropdown();

    const panel = document.getElementById("tss-result-panel");
    if (!panel) return;

    panel.innerHTML = `<div class="tss-loading"><span class="tss-spinner"></span>Loading variants…</div>`;
    panel.classList.add("open");

    try {
      let product_full = product;
      let variants     = [];

      if (productCache[product.product_id]) {
        product_full = productCache[product.product_id].product;
        variants     = productCache[product.product_id].variants;
      } else {
        const [prodRes, varRes] = await Promise.all([
          fetch(`/api/product?product_ID=${product.product_id}`),
          fetch(`/api/variants/${product.product_id}`)
        ]);

        if (prodRes.ok) {
          const d = await prodRes.json();
          if (d && d.product)  product_full = d.product;
          if (d && d.variants) variants     = d.variants;
        }
        if (!variants.length && varRes.ok) {
          const vd = await varRes.json();
          if (Array.isArray(vd)) variants = vd;
        }

        productCache[product.product_id] = { product: product_full, variants };
      }

      selectedProduct    = product_full;
      selectedVariants   = variants;
      selectedVariantIdx = 0;

      if(Number(product_full.stocks === 1)){
        renderResultPanel(product_full, variants);
      }
      else{
        const panel = document.getElementById("tss-result-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="tss-prod-header">
      <div class="tss-prod-img-placeholder"> <img src="${product_full.image_url}"/></div>

      <div class="tss-prod-info">
        <div class="tss-prod-name">
          ${escHtml(product_full.product_name || "Product")}
        </div>

        <div class="tss-prod-brand" style="color:#dc2626;font-weight:600;">
          Out of Stock
        </div>

        <div class="tss-prod-desc">
          This medicine is currently unavailable. Please check back later or browse similar products.
        </div>

        <a class="tss-view-link"
           href="product_overview.html?product_ID=${product_full.product_id}">
          View Product Details →
        </a>
      </div>
    </div>

    <div class="tss-action-bar">
      

      <button class="tss-add-cart" disabled>
        🛒 Add to Cart
      </button>

      <button class="tss-buy-now" disabled>
        ⚡ Buy Now
      </button>
    </div>
  `;

  panel.classList.add("open");
      }
    } catch (err) {
      console.error("[SmartSearch] fetchVariants error:", err);
      if (panel) {
        panel.innerHTML = `<div class="tss-no-variants">⚠️ Failed to load. <a href="product_overview.html?product_ID=${product.product_id}" style="color:#028c7e">View product page →</a></div>`;
      }
    }
  }

  /* ── RENDER RESULT PANEL ─────────────────────────────────────── */
  
  function renderResultPanel(product, variants) {
    const panel = document.getElementById("tss-result-panel");
    if (!panel) return;

    const imgHtml = product.image_url
      ? `<img class="tss-prod-img" src="${escHtml(product.image_url)}" alt="" onerror="this.style.display='none'">`
      : `<div class="tss-prod-img-placeholder">💊</div>`;

    const variantsHtml = variants.length
      ? `<div class="tss-variants-section">
           <div class="tss-variants-title">Select Pack</div>
           <div class="tss-variants-grid">
             ${variants.map((v, i) => {
               const qty   = v.unit_value || "";
               const unit  = v.unit_type  || "";
               const pills = v.qty        || "";
               const price = parsePrice(v.offer_price || v.price_per_box || v.price_per_pill || "");
               const label = qty && unit ? `${qty}${unit}` : `Option ${i + 1}`;
               return `
                 <button class="tss-variant-btn${i === 0 ? " tss-selected" : ""}"
                         data-vidx="${i}"
                         onclick="window.__tssSelectVariant(${i})">
                   <div class="tss-vb-pack">${escHtml(label)}</div>
                   ${pills ? `<div class="tss-vb-pills">${escHtml(String(pills))} pills</div>` : ""}
                   ${price > 0 ? `<div class="tss-vb-price">$${price.toFixed(2)}</div>` : ""}
                 </button>`;
             }).join("")}
           </div>
         </div>`
      : `<div class="tss-no-variants">No variants available. <a href="product_overview.html?product_ID=${product.product_id}" style="color:#028c7e">View product page →</a></div>`;

    const v0        = variants[0] || {};
    const initPrice = parsePrice(v0.offer_price || v0.price_per_box || v0.price_per_pill || "");
    const initPer   = v0.price_per_pill ? `$${parsePrice(v0.price_per_pill).toFixed(2)} per pill` : "";

    panel.innerHTML = `
      <div class="tss-prod-header">
        ${imgHtml}
        <div class="tss-prod-info">
          <div class="tss-prod-name">${escHtml(product.product_name || "Product")}</div>
          ${product.manufacturer ? `<div class="tss-prod-brand">by ${escHtml(product.manufacturer)}</div>` : ""}
          ${product.product_description
            ? `<div class="tss-prod-desc">${escHtml(product.product_description)}</div>` : ""}
          <a class="tss-view-link" href="product_overview.html?product_ID=${product.product_id}">Full details →</a>
        </div>
      </div>

      ${variantsHtml}

      ${variants.length ? `
      <div class="tss-action-bar" id="tss-action-bar">
        <div class="tss-price-display">
          <div class="tss-price-main" id="tss-price-main">
            ${initPrice > 0 ? `$${initPrice.toFixed(2)}` : "Price on request"}
          </div>
          <div class="tss-price-per" id="tss-price-per">${initPer}</div>
        </div>
        <button class="tss-add-cart" id="tss-add-cart-btn" onclick="window.__tssAddToCart()">
          🛒 Add to Cart
        </button>
        <button class="tss-buy-now" id="tss-buy-now-btn" onclick="window.__tssBuyNow()">
          ⚡ Buy Now
        </button>
      </div>` : ""}
    `;

    panel.classList.add("open");
  }

  /* ── VARIANT SELECT ──────────────────────────────────────────── */
  window.__tssSelectVariant = function (idx) {
    selectedVariantIdx = idx;
    document.querySelectorAll("#tm-smart-search .tss-variant-btn").forEach((btn, i) => {
      btn.classList.toggle("tss-selected", i === idx);
    });
    const v = selectedVariants[idx];
    if (!v) return;
    const price   = parsePrice(v.offer_price || v.price_per_box || v.price_per_pill || "");
    const mainEl  = document.getElementById("tss-price-main");
    const perEl   = document.getElementById("tss-price-per");
    if (mainEl) mainEl.textContent = price > 0 ? `$${price.toFixed(2)}` : "Price on request";
    if (perEl)  perEl.textContent  = v.price_per_pill ? `$${parsePrice(v.price_per_pill).toFixed(2)} per pill` : "";
  };

  /* ── ADD TO CART ─────────────────────────────────────────────── */
  async function doAddToCart() {
    if (!selectedProduct || !selectedVariants.length) return false;
    const v     = selectedVariants[selectedVariantIdx] || selectedVariants[0];
    const price = parsePrice(v.offer_price || v.price_per_box || v.price_per_pill || "");
    const mg    = v.unit_value && v.unit_type ? `${v.unit_value}${v.unit_type}` : null;

    const res  = await fetch("/add-to-cart", {
      method  : "POST",
      headers : { "Content-Type": "application/json" },
      body    : JSON.stringify({
        productId  : selectedProduct.product_id,
        categoryId : selectedProduct.category_id,
        name       : selectedProduct.product_name,
        quantity   : 1,
        mg,
        price,
        image_url  : selectedProduct.image_url || ""
      })
    });
    const data = await res.json();
    return data.success === true;
  }

  window.__tssAddToCart = async function () {
    const btn = document.getElementById("tss-add-cart-btn");
    if (btn) { btn.textContent = "Adding…"; btn.disabled = true; }
    try {
      const ok = await doAddToCart();
      if (ok) {
        showToast("✅ Added to cart!");
        try {
          const cr  = await fetch("/api/cart/count");
          const cd  = await cr.json();
          if (cd.success) {
            const badge = document.querySelector(".cart-badge");
            const count = parseInt(cd.count) || 0;
            localStorage.setItem("cartCount", count);
            if (badge) {
              badge.textContent = count;
              badge.style.display = count > 0 ? "inline-flex" : "none";
              badge.style.transform = "scale(1.4)";
              setTimeout(() => { badge.style.transform = "scale(1)"; }, 280);
            }
          }
        } catch (_) {}
        if (btn) { btn.textContent = "✅ Added"; btn.style.background = "#059669"; btn.style.color = "#fff"; }
        setTimeout(() => {
          if (btn) { btn.textContent = "🛒 Add to Cart"; btn.style.background = ""; btn.style.color = ""; btn.disabled = false; }
        }, 2500);
      } else {
        if (btn) { btn.textContent = "🛒 Add to Cart"; btn.disabled = false; }
        showToast("❌ Could not add to cart. Try again.");
      }
    } catch (err) {
      console.error("[SmartSearch] addToCart error:", err);
      if (btn) { btn.textContent = "🛒 Add to Cart"; btn.disabled = false; }
      showToast("❌ Server error. Please try again.");
    }
  };

  window.__tssBuyNow = async function () {
    const btn = document.getElementById("tss-buy-now-btn");
    if (btn) { btn.textContent = "⏳ Please wait…"; btn.disabled = true; }
    try {
      const ok = await doAddToCart();
      if (ok) {
        window.location.href = "checkout1.html";
      } else {
        if (btn) { btn.textContent = "⚡ Buy Now"; btn.disabled = false; }
        showToast("❌ Could not add to cart. Try again.");
      }
    } catch (err) {
      console.error("[SmartSearch] buyNow error:", err);
      if (btn) { btn.textContent = "⚡ Buy Now"; btn.disabled = false; }
    }
  };

  /* ════════════════════════════════════════════════════════════════
     ②  MEDICINE REQUEST FORM (shown when no product found)
     ════════════════════════════════════════════════════════════════ */
  function showRequestForm(prefillName) {
    const panel = document.getElementById("tss-result-panel");
    if (!panel) return;

    panel.innerHTML = `
      <div class="tss-req-form-wrap">
        <div class="tss-req-header">
          <div class="tss-req-icon">📋</div>
          <div>
            <div class="tss-req-title">Medicine not in our catalogue?</div>
            <div class="tss-req-sub">Fill in the details below — our team will review and add it.</div>
          </div>
        </div>

        <form id="tss-req-form" class="tss-req-form" novalidate>
          <div class="tss-req-grid">
            <div class="tss-req-field tss-req-full">
              <label for="tss-req-med">Medicine Name <span class="tss-req-required">*</span></label>
              <input id="tss-req-med" type="text" value="${escHtml(prefillName || "")}"
                     placeholder="e.g. Ozempic 2mg" required />
            </div>
            <div class="tss-req-field">
              <label for="tss-req-mg">Strength / MG <span class="tss-req-required">*</span></label>
              <input id="tss-req-mg" type="text" placeholder="e.g. 10mg, 20mg" required />
            </div>
            <div class="tss-req-field">
              <label for="tss-req-qty">Quantity Needed <span class="tss-req-required">*</span></label>
              <input id="tss-req-qty" type="number" min="1" value="1" placeholder="e.g. 30" required />
            </div>
            <div class="tss-req-field">
              <label for="tss-req-name">Your Name <span class="tss-req-required">*</span></label>
              <input id="tss-req-name" type="text" placeholder="Full name" required />
            </div>
            <div class="tss-req-field">
              <label for="tss-req-phone">Phone Number <span class="tss-req-required">*</span></label>
              <input id="tss-req-phone" type="tel" placeholder="+1 555 000 0000" required />
            </div>
            <div class="tss-req-field tss-req-full">
              <label for="tss-req-email">Email Address <span class="tss-req-required">*</span></label>
              <input id="tss-req-email" type="email" placeholder="you@example.com" required />
            </div>
            
          </div>

          <div class="tss-req-footer">
            <button type="button" class="tss-req-cancel" id="tss-req-cancel-btn">Cancel</button>
            <button type="submit" class="tss-req-submit" id="tss-req-submit-btn">
              📨 Send Request
            </button>
          </div>
          <div class="tss-req-status" id="tss-req-status"></div>
        </form>
      </div>
    `;

    panel.classList.add("open");

    // Cancel → clear panel
    document.getElementById("tss-req-cancel-btn")?.addEventListener("click", () => {
      panel.classList.remove("open");
      panel.innerHTML = "";
      const input = document.getElementById("tss-input");
      if (input) { input.value = ""; input.focus(); }
      const clear = document.getElementById("tss-clear");
      if (clear) clear.style.display = "none";
    });

    // Submit
    document.getElementById("tss-req-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitMedicineRequest();
    });
  }

  async function submitMedicineRequest() {
    const statusEl = document.getElementById("tss-req-status");
    const submitBtn = document.getElementById("tss-req-submit-btn");

    // Collect + validate
    const med   = document.getElementById("tss-req-med")?.value.trim();
    const mg    = document.getElementById("tss-req-mg")?.value.trim();
    const qty   = document.getElementById("tss-req-qty")?.value.trim();
    const name  = document.getElementById("tss-req-name")?.value.trim();
    const phone = document.getElementById("tss-req-phone")?.value.trim();
    const email = document.getElementById("tss-req-email")?.value.trim();
    const note  = document.getElementById("tss-req-note")?.value.trim();

    if (!med || !mg || !qty || !name || !phone || !email) {
      if (statusEl) {
        statusEl.className = "tss-req-status tss-req-error";
        statusEl.textContent = "⚠️ Please fill in all required fields.";
      }
      return;
    }

    if (!email.includes("@")) {
      if (statusEl) {
        statusEl.className = "tss-req-status tss-req-error";
        statusEl.textContent = "⚠️ Please enter a valid email address.";
      }
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }
    if (statusEl)  { statusEl.className = "tss-req-status"; statusEl.textContent = ""; }

    try {
      const res = await fetch("/api/medicine-request", {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          type        : "medicine_request",  // ← tag so employee dashboard can filter
          medicine    : med,
          strength_mg : mg,
          quantity    : qty,
          customer_name  : name,
          customer_phone : phone,
          customer_email : email,
          notes       : note || "",
          requested_at: new Date().toISOString(),
        })
      });
      const data = await res.json();

      if (data.success) {
        if (statusEl) {
          statusEl.className = "tss-req-status tss-req-success";
          statusEl.textContent = "✅ Request sent! Our team will contact you soon.";
        }
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "✅ Sent"; }
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      console.error("[SmartSearch] medicine request error:", err);
      if (statusEl) {
        statusEl.className = "tss-req-status tss-req-error";
        statusEl.textContent = "❌ Failed to send. Please try again.";
      }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "📨 Send Request"; }
    }
  }

  /* ── UI HELPERS ──────────────────────────────────────────────── */
  function closeDropdown() {
    const dd = document.getElementById("tss-dropdown");
    if (dd) dd.classList.remove("open");
  }

  function hideResultPanel() {
    const p = document.getElementById("tss-result-panel");
    if (p) { p.classList.remove("open"); p.innerHTML = ""; }
  }

  function escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function showToast(msg) {
    let toast = document.getElementById("tss-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "tss-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
  }

  /* ── WIRE EVENTS ─────────────────────────────────────────────── */
  function wireEvents() {
    const input  = document.getElementById("tss-input");
    const clear  = document.getElementById("tss-clear");
    const submit = document.getElementById("tss-submit");
    const dd     = document.getElementById("tss-dropdown");
    if (!input) return;

    input.addEventListener("input", () => {
      const q = input.value.trim();
      lastQuery = q;
      if (clear) clear.style.display = q ? "flex" : "none";
      hideResultPanel();

      if (!q) { closeDropdown(); return; }
      const suggestions = buildSuggestions(q);
      renderDropdown(q, suggestions);
    });

    /* Keyboard navigation */
    input.addEventListener("keydown", e => {
      const items   = dd ? [...dd.querySelectorAll(".tss-dd-item")] : [];
      const focused = dd ? dd.querySelector(".tss-dd-focused") : null;
      const curIdx  = focused ? items.indexOf(focused) : -1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = items[Math.min(curIdx + 1, items.length - 1)];
        items.forEach(el => el.classList.remove("tss-focused"));
        if (next) next.classList.add("tss-focused");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = items[Math.max(curIdx - 1, 0)];
        items.forEach(el => el.classList.remove("tss-focused"));
        if (prev) prev.classList.add("tss-focused");
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focused) {
          focused.click(); return;
        }
        const q     = input.value.trim();
        const q_low = q.toLowerCase();
        const exact = allProducts.find(p => (p.product_name || "").toLowerCase() === q_low);
        const first = allProducts.find(p => (p.product_name || "").toLowerCase().includes(q_low));
        const pick  = exact || first;
        if (pick) {
          selectProduct(pick);
        } else if (q) {
          // No match at all → show request form
          closeDropdown();
          showRequestForm(q);
        }
      } else if (e.key === "Escape") {
        closeDropdown();
        hideResultPanel();
      }
    });

    if (clear) {
      clear.addEventListener("click", () => {
        input.value = "";
        clear.style.display = "none";
        closeDropdown();
        hideResultPanel();
        selectedProduct  = null;
        selectedVariants = [];
        lastQuery        = "";
        input.focus();
      });
    }

    if (submit) {
      submit.addEventListener("click", () => {
        const q     = input.value.trim();
        if (!q) return;
        const q_low = q.toLowerCase();
        const exact = allProducts.find(p => (p.product_name || "").toLowerCase() === q_low);
        const first = allProducts.find(p => (p.product_name || "").toLowerCase().includes(q_low));
        const pick  = exact || first;
        if (pick) {
          selectProduct(pick);
        } else {
          closeDropdown();
          showRequestForm(q);
        }
      });
    }

    document.addEventListener("click", e => {
      if (!e.target.closest("#tm-smart-search")) closeDropdown();
    });
  }

  /* ── INIT ────────────────────────────────────────────────────── */
  async function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
      return;
    }
    const injected = injectHTML();
    if (!injected) {
      console.warn("[SmartSearch] #productsGrid not found — retrying in 600ms");
      setTimeout(init, 600);
      return;
    }
    wireEvents();
    await loadProducts();
  }

  init();
})();
    