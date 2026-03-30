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
    const verified = data.reviews.filter(r => r.verified);
    if (!verified.length) {
      container.innerHTML = "<p>No verified customer reviews yet.</p>"; return;
    }
    container.innerHTML = verified.slice(0, 6).map(r => `
      <div class="testimonial">
        <div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
        <p class="testimonial-text">"${r.review_text}"</p>
        <p class="testimonial-author">${r.name}</p>
        <div class="verified-purchase">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Verified Purchase
        </div>
      </div>`).join("");
  } catch (err) {
    console.error("Error fetching reviews:", err);
    container.innerHTML = "<p>Failed to load reviews.</p>";
  }
});

// ── TRENDING PRODUCTS (GET /products?categoryID=1) ───────────────────────
// FIX: Grid starts empty in HTML — this fully replaces innerHTML
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  try {
    const res = await fetch("/products?categoryID=1");
    const products = await res.json();
    if (!products || !Array.isArray(products) || products.length === 0) {
      grid.innerHTML = `<p style="color:#999;font-size:14px;grid-column:1/-1;padding:20px 0;">No products available right now.</p>`;
      return;
    }
    // console.log(products);
    grid.innerHTML = products.slice(0, 5).map(p => {
      const price  = parseFloat(p.offerprice) || 0;
      const rating = Math.min(5, Math.max(0, Math.round(parseFloat(p.rating) || 0)));
      const stars  = "★".repeat(rating) + "☆".repeat(5 - rating);
      const imgHtml = p.image_url
        ? `<img src="${p.image_url}" alt="${p.product_name}" onerror="this.style.display='none'" />`
        : `<span class="product-img-placeholder">💊</span>`;
      const safeName = (p.product_name || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
      const safeImg  = (p.image_url   || "").replace(/'/g, "\\'");
      return `
        <div class="product-card"
          onclick="window.location.href='product_overview.html?product_ID=${p.product_id}'">
          <div class="product-img">${imgHtml}</div>
          <div class="product-body">
            <div class="product-name">${p.product_name || "Product"}</div>
            ${rating > 0 ? `<div style="color:#f59e0b;font-size:12px;margin-bottom:6px;">${stars}</div>` : ""}
            
            
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    console.error("Error loading trending products:", err);
    grid.innerHTML = `<p style="color:#c00;font-size:13px;grid-column:1/-1;padding:20px 0;">⚠️ Could not load products. Please refresh.</p>`;
  }
});

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