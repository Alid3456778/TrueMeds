// ── Crisp Chat ────────────────────────────────────────────────────────────
window.$crisp = [];
window.CRISP_WEBSITE_ID = "68987257-808e-403d-a06c-35b3ec18c3ef";
(function () {
  var d = document, s = d.createElement("script");
  s.src = "https://client.crisp.chat/l.js";
  s.async = 1;
  d.getElementsByTagName("head")[0].appendChild(s);
})();

// ── STATE ─────────────────────────────────────────────────────────────────
let currentProduct  = null;
let currentVariants = [];
let selectedVariant = 0;
let quantity        = 1;
let reviewStarVal   = 0;
let name_dabba      = "";
let imgg            = "";
let categoryId      = 0;

// ── BOOT ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  fetchCartCount();
  fetchProductDetails();
  setupCarousel();
});

// ── CART COUNT  →  GET /api/cart/count ───────────────────────────────────
async function fetchCartCount() {
  const cartCountSpan = document.getElementById("cart-count");
  if (!cartCountSpan) return;
  try {
    const result = await fetch("/api/cart/count").then(r => r.json());
    if (result.success) {
      const count = parseInt(result.count) || 0;
      localStorage.setItem("cartCount", count);
      cartCountSpan.textContent   = count;
      cartCountSpan.style.display = count > 0 ? "inline-flex" : "none";
    }
  } catch (e) { console.error("Cart count error:", e); }
}

// ── FETCH PRODUCT ─────────────────────────────────────────────────────────
async function fetchProductDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const productID = urlParams.get("product_ID") || urlParams.get("id");

  if (!productID) { showError("Product ID not found in URL"); return; }

  const nameEl = document.getElementById("nameing_of_product");
  if (nameEl) nameEl.innerHTML = "Loading...";

  try {
    let product  = null;
    let variants = [];

    // Strategy 1: POST /api/products/search { id: Number }
    const r1 = await fetch("/api/products/search", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ id: Number(productID) })
    });
    if (r1.ok) {
      const d1 = await r1.json();
      if (d1 && d1.data) {
        product = d1.data;
        console.log("✅ Product loaded:", product.product_name);
      }
    }

    // Strategy 2 fallback: GET /products filter client-side
    if (!product) {
      const r2  = await fetch("/products");
      const all = r2.ok ? await r2.json() : [];
      product   = all.find(p =>
        String(p.product_id || p.productid) === String(productID)
      ) || null;
      if (product) console.log("✅ Product via fallback:", product.product_name || product.productname);
    }

    if (!product) { showError("Product not found."); return; }

    // Variants: GET /api/variants/:productId
    // Returns: [{variation_id, product_id, unit_type, unit_value, qty,
    //            price_per_pill, price_per_box, delivery_time}]
    const rv = await fetch(`/api/variants/${productID}`);
    if (rv.ok) {
      const dv = await rv.json();
      variants = Array.isArray(dv) ? dv : [];
      console.log("✅ Variants loaded:", variants.length);
    }

    currentProduct  = product;
    currentVariants = variants;
    name_dabba      = product.product_name  || "";
    imgg            = product.image_url     || "";
    categoryId      = product.category_id   || 0;

    updateProductUI(product, variants);
    updateMetaTags(product);
    buildProductSearch();
    loadReviews(product.product_id);
    loadRelatedProducts(product.category_id, product.product_id);

  } catch (err) {
    console.error("Error fetching product:", err);
    showError("Failed to load product. Please try again.");
  }
}

// ── PRICE PARSER ──────────────────────────────────────────────────────────
// Handles strings like "$0.57PER PILL", "$28.50", "28.50" → float
function parseVariantPrice(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

// ── UPDATE UI ─────────────────────────────────────────────────────────────
// Confirmed DB columns: product_id, product_name, product_description,
// image_url, addtional_img1–6, category_id, manufacturer, trade_names,
// ingredients, usage_instructions, side_effects, safety, drug_interaction,
// storage, packaging, withdrawal_symptoms, drug_abuse, stocks
function updateProductUI(product, variants) {
  // Name
  const nameEl = document.getElementById("nameing_of_product");
  if (nameEl) nameEl.textContent = product.product_name || "Product";
  document.title = `${product.product_name || "Product"} – MCland Pharma`;

  // Brand
  const brandEl = document.getElementById("product-brand");
  if (brandEl) brandEl.textContent = product.manufacturer || "";

  // Description
  const descEl = document.getElementById("description");
  if (descEl) descEl.innerHTML = (product.product_description || "No description available.")
    .split("\n").filter(Boolean)
    .map(l => `<p style="margin-bottom:10px;line-height:1.75;color:#555;font-size:14px">${l}</p>`).join("");

  // Benefits / ingredients / drug info
  const benEl = document.getElementById("benefits");
  if (benEl) benEl.innerHTML = [
    product.side_effects       ? `<li style="display:flex;gap:8px;margin-bottom:8px;font-size:13px;color:#555"><span style="color:#059669;flex-shrink:0">✔</span><span><strong>Key Info:</strong> ${product.side_effects}</span></li>` : "",
    product.ingredients        ? `<li style="display:flex;gap:8px;margin-bottom:8px;font-size:13px;color:#555"><span style="color:#059669;flex-shrink:0">✔</span><span><strong>Ingredients:</strong> ${product.ingredients}</span></li>` : "",
    product.packaging          ? `<li style="display:flex;gap:8px;margin-bottom:8px;font-size:13px;color:#555"><span style="color:#059669;flex-shrink:0">✔</span><span><strong>Packaging:</strong> ${product.packaging}</span></li>` : "",
    product.drug_interaction   ? `<li style="display:flex;gap:8px;margin-bottom:8px;font-size:13px;color:#555"><span style="color:#059669;flex-shrink:0">✔</span><span><strong>Drug Interaction:</strong> ${product.drug_interaction}</span></li>` : "",
    product.storage            ? `<li style="display:flex;gap:8px;margin-bottom:8px;font-size:13px;color:#555"><span style="color:#059669;flex-shrink:0">✔</span><span><strong>Storage:</strong> ${product.storage}</span></li>` : "",
    product.withdrawal_symptoms? `<li style="display:flex;gap:8px;margin-bottom:8px;font-size:13px;color:#555"><span style="color:#059669;flex-shrink:0">✔</span><span><strong>Withdrawal:</strong> ${product.withdrawal_symptoms}</span></li>` : "",
    product.drug_abuse         ? `<li style="display:flex;gap:8px;margin-bottom:8px;font-size:13px;color:#555"><span style="color:#059669;flex-shrink:0">✔</span><span><strong>Drug Abuse:</strong> ${product.drug_abuse}</span></li>` : "",
  ].join("") || `<li style="color:#999;font-size:13px">No information available.</li>`;

  // Ingredients tab
  const ingEl = document.getElementById("ingredients");
  if (ingEl) ingEl.textContent = product.ingredients || "Ingredient information not available.";

  // How to Use
  const usageEl = document.getElementById("usage");
  if (usageEl) {
    const steps = (product.usage_instructions || "")
      .split(/[.\n]+/).map(s => s.trim()).filter(s => s.length > 4);
    usageEl.innerHTML = steps.length
      ? steps.map((s, i) => `
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
            <span style="min-width:22px;height:22px;border-radius:50%;background:#028c7e;color:#fff;
                         font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${i + 1}
            </span>
            <span style="font-size:13px;color:#555;line-height:1.65">${s}</span>
          </div>`).join("")
      : `<p style="color:#999;font-size:13px">Follow the instructions on the packaging or as directed by your physician.</p>`;
  }

  // Safety
  const safetyEl = document.getElementById("safety");
  if (safetyEl) {
    const lines = (product.safety || "")
      .split(/[.\n]+/).map(s => s.trim()).filter(s => s.length > 4);
    safetyEl.innerHTML = lines.length
      ? lines.map(l => `<p style="font-size:13px;color:#555;margin-bottom:8px;line-height:1.6">⚠️ ${l}</p>`).join("")
      : `<p style="font-size:13px;color:#555">⚠️ Store in a cool, dry place. Keep out of reach of children.</p>`;
  }

  // Product info table
  const tableEl = document.getElementById("product-info-table");
  if (tableEl) {
    const rows = [
      ["Product Name",     product.product_name],
      ["Trade Names",      product.trade_names],
      ["Manufacturer",     product.manufacturer],
      ["Packaging",        product.packaging],
      ["Storage",          product.storage],
      ["Drug Interaction", product.drug_interaction],
      ["Withdrawal",       product.withdrawal_symptoms],
      ["Drug Abuse",       product.drug_abuse],
      ["In Stock",         product.stocks],
    ].filter(([, v]) => v);
    tableEl.innerHTML = rows.length
      ? rows.map(([k, v]) => `
          <tr style="border-bottom:1px solid #f0f0f0">
            <td style="padding:10px 14px;font-size:13px;color:#999;font-weight:500;
                       background:#f8f9fa;width:38%;vertical-align:top">${k}</td>
            <td style="padding:10px 14px;font-size:13px;color:#212121;font-weight:500">${v}</td>
          </tr>`).join("")
      : `<tr><td colspan="2" style="padding:16px;color:#999;font-size:13px">No product info available.</td></tr>`;
  }

  // Images
  const imgFields = ["image_url","addtional_img1","addtional_img2","addtional_img3",
                     "addtional_img4","addtional_img5","addtional_img6"];
  const imgs = imgFields.map(f => product[f]).filter(v => v && String(v).trim());
  const carousel = document.querySelector(".carousel__slide");
  if (carousel) {
    if (imgs.length) {
      const ph = document.getElementById("galleryPlaceholder");
      if (ph) ph.style.display = "none";
      carousel.innerHTML = imgs.map(src =>
        `<img src="${src}" alt="${product.product_name || "product"}"
              style="max-width:100%;max-height:100%;object-fit:contain;"
              onerror="this.style.display='none'" />`
      ).join("");
    } else {
      carousel.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#ccc;font-size:80px;width:100%;height:100%">
        💊<p style="font-size:13px;color:#aaa">No image available</p></div>`;
    }
  }

  // Breadcrumb
  const bc = document.getElementById("breadcrumb-product-name");
  if (bc) bc.textContent = product.product_name || "Product";
  const bcCat = document.getElementById("breadcrumb-cat");
  if (bcCat) bcCat.href = `categories.html?catogeriesID=${product.category_id || ""}`;

  // View all link
  const va = document.getElementById("viewAllLink");
  if (va) va.href = `categories.html?catogeriesID=${product.category_id || 1}`;

  // Category nav highlight
  document.querySelectorAll(".cat-item[data-id]").forEach(a =>
    a.classList.toggle("active", String(a.dataset.id) === String(product.category_id))
  );

  // Variants
  if (!variants.length) {
    const diffEl = document.getElementById("differ");
    if (diffEl) diffEl.innerHTML = `<p style="color:#aaa;font-size:13px">No variants available.</p>`;
    const priceEl = document.getElementById("product-price");
    if (priceEl) priceEl.innerHTML = `<span style="font-size:18px;color:#aaa">Price on request</span>`;
    return;
  }
  setupProductVariants(variants);
}

// ── VARIANTS / PACK SELECTOR ──────────────────────────────────────────────
// Confirmed variant fields: variation_id, product_id, unit_type, unit_value,
//                           qty, price_per_pill, price_per_box, delivery_time
function setupProductVariants(variants) {
  selectedVariant = 0;
  const differEl = document.getElementById("differ");
  const threeBox = document.getElementById("three-box-section");

  if (differEl) {
    differEl.innerHTML = `
      <div style="margin-bottom:12px;font-size:13px;font-weight:600;color:#333">
        Select Pack
        <span style="font-weight:400;color:#999;margin-left:6px">
          ${variants.length} option${variants.length > 1 ? "s" : ""}
        </span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px" id="variantBtns">
        ${variants.map((v, i) => {
          const qty      = v.unit_value  || "";
          const unit     = v.unit_type   || "";
          const pills    = v.qty         || "";
          const boxPrice = parseVariantPrice(v.price_per_box);
          const label    = qty && unit ? `${qty}${unit}` : `Option ${i + 1}`;

          return `
            <button onclick="selectVariant(${i})" id="vbtn-${i}"
              style="padding:10px 14px;border:2px solid ${i === 0 ? "#028c7e" : "#ddd"};
                     border-radius:10px;background:${i === 0 ? "#e8f5f4" : "#fff"};
                     color:${i === 0 ? "#028c7e" : "#333"};cursor:pointer;
                     font-size:13px;font-weight:700;transition:all .2s;
                     text-align:center;min-width:80px;line-height:1.4">
              <div>${label}</div>
              ${pills ? `<div style="font-size:11px;color:#888;font-weight:400;margin-top:2px">${pills} pills</div>` : ""}
              ${boxPrice > 0 ? `<div style="font-size:12px;color:#028c7e;font-weight:700;margin-top:3px">$${boxPrice.toFixed(2)}</div>` : ""}
            </button>`;
        }).join("")}
      </div>`;
  }

  renderVariantPrice(variants[0]);

  if (threeBox) {
    threeBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px">
        <div style="display:flex;align-items:center;border:1.5px solid #ddd;border-radius:8px;overflow:hidden">
          <button onclick="changeQty(-1)"
            style="width:40px;height:44px;background:#f8f9fa;border:none;font-size:20px;font-weight:600;cursor:pointer;color:#333">−</button>
          <input type="number" id="qtyInput" value="1" min="1" max="99" readonly
            style="width:48px;height:44px;border:none;border-left:1px solid #ddd;border-right:1px solid #ddd;
                   text-align:center;font-size:15px;font-weight:600;outline:none;background:#fff" />
          <button onclick="changeQty(1)"
            style="width:40px;height:44px;background:#f8f9fa;border:none;font-size:20px;font-weight:600;cursor:pointer;color:#333">+</button>
        </div>
        <button id="addCartBtn" onclick="addToCart()"
          style="flex:1;min-width:140px;height:44px;background:#028c7e;color:#fff;border:none;
                 border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;
                 display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s">
          🛒 Add to Cart
        </button>
        <button onclick="buyNow()"
          style="flex:1;min-width:140px;height:44px;background:#fff;color:#028c7e;
                 border:2px solid #028c7e;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">
          ⚡ Buy Now
        </button>
      </div>`;
  }
}

function selectVariant(i) {
  selectedVariant = i;
  currentVariants.forEach((_, idx) => {
    const btn = document.getElementById(`vbtn-${idx}`);
    if (!btn) return;
    const active = idx === i;
    btn.style.borderColor = active ? "#028c7e" : "#ddd";
    btn.style.background  = active ? "#e8f5f4" : "#fff";
    btn.style.color       = active ? "#028c7e" : "#333";
  });
  renderVariantPrice(currentVariants[i]);
}

function renderVariantPrice(v) {
  if (!v) return;

  // Confirmed fields: price_per_pill = "$0.57PER PILL", price_per_box = "$28.50"
  const perPill  = parseVariantPrice(v.price_per_pill);
  const perBox   = parseVariantPrice(v.price_per_box);
  const qty      = v.unit_value   || "";
  const unit     = v.unit_type    || "";
  const pills    = v.qty          || "";
  const delivery = v.delivery_time || "";

  const priceEl = document.getElementById("product-price");
  if (!priceEl) return;

  priceEl.innerHTML = `
    <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px">
      <span style="font-size:34px;font-weight:800;color:#212121;line-height:1">
        ${perBox > 0 ? `$${perBox.toFixed(2)}` : perPill > 0 ? `$${perPill.toFixed(2)}` : "Price on request"}
      </span>
    </div>

    ${perPill > 0 ? `
      <div style="display:inline-flex;align-items:center;gap:6px;background:#e8f5f4;
                  padding:5px 14px;border-radius:20px;margin-bottom:10px">
        <span style="font-size:14px;font-weight:700;color:#028c7e">$${perPill.toFixed(2)}</span>
        <span style="font-size:12px;color:#555;font-weight:500">per pill</span>
      </div>` : ""}

    ${qty || pills ? `
      <div style="font-size:13px;color:#666;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        ${qty && unit ? `<span style="background:#f0f0f0;padding:3px 10px;border-radius:5px;font-weight:600;color:#333;font-size:13px">${qty}${unit}</span>` : ""}
        ${pills       ? `<span style="background:#f0f0f0;padding:3px 10px;border-radius:5px;font-weight:600;color:#333;font-size:13px">${pills} pills</span>` : ""}
      </div>` : ""}

    <div style="font-size:12px;color:#aaa;margin-bottom:4px">Inclusive of all taxes</div>

    ${delivery ? `
      <div style="font-size:12px;color:#666;margin-top:8px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-truck" style="color:#028c7e"></i>
        <span>${delivery}</span>
      </div>` : ""}`;
}

function changeQty(delta) {
  quantity = Math.max(1, Math.min(99, quantity + delta));
  const el = document.getElementById("qtyInput");
  if (el) el.value = quantity;
}

// ── ADD TO CART  →  POST /add-to-cart ────────────────────────────────────
async function addToCart() {
  if (!currentProduct) return;
  const v     = currentVariants[selectedVariant];
  const price = v ? parseVariantPrice(v.price_per_box || v.price_per_pill || "") : 0;
  const btn   = document.getElementById("addCartBtn");

  if (btn) { btn.innerHTML = "⏳ Adding…"; btn.disabled = true; }

  try {
    const r = await fetch("/add-to-cart", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({
        productId  : currentProduct.product_id,
        categoryId : currentProduct.category_id,
        name       : currentProduct.product_name,
        quantity,
        mg         : v ? `${v.unit_value || ""}${v.unit_type || ""}` : null,
        price,
        imageurl   : currentProduct.image_url || ""
      })
    });
    const d = await r.json();
    if (d.success) {
      if (btn) { btn.innerHTML = "✅ Added to Cart!"; btn.style.background = "#059669"; }
      await fetchCartCount();
      setTimeout(() => {
        if (btn) { btn.innerHTML = "🛒 Add to Cart"; btn.style.background = "#028c7e"; btn.disabled = false; }
      }, 2500);
    } else {
      if (btn) { btn.innerHTML = "🛒 Add to Cart"; btn.disabled = false; }
    }
  } catch (e) {
    console.error("Add to cart error:", e);
    if (btn) { btn.innerHTML = "🛒 Add to Cart"; btn.disabled = false; }
  }
}

function buyNow() {
  addToCart().then(() => { window.location.href = "cart.html"; });
}

async function addRelatedToCart(productId, catId, name, price, imageurl) {
  try {
    const r = await fetch("/add-to-cart", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ productId, categoryId: catId, name, quantity: 1, mg: null, price, imageurl })
    });
    const d = await r.json();
    if (d.success) fetchCartCount();
  } catch (e) { console.warn("Related cart error:", e); }
}

// ── REVIEWS  →  GET /api/reviews/:productId ───────────────────────────────
async function loadReviews(productId) {
  if (!productId) return;
  try {
    const r = await fetch(`/api/reviews/${productId}`);
    const d = await r.json();
    renderReviews(d.success ? (d.reviews || []) : [], productId);
  } catch (e) {
    console.warn("Reviews error:", e);
    renderReviews([], productId);
  }
}

function renderReviews(reviews, productId) {
  const el = document.getElementById("reviews-section");
  if (!el) return;

  const total = reviews.length;
  const avg   = total
    ? (reviews.reduce((s, r) => s + parseFloat(r.rating || 0), 0) / total).toFixed(1)
    : null;

  el.innerHTML = `
    ${avg ? `
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:24px;
                  padding-bottom:20px;border-bottom:1px solid #f0f0f0;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-size:52px;font-weight:800;color:#212121;line-height:1">${avg}</div>
          <div style="color:#f59e0b;font-size:20px;margin:4px 0">${starsHtml(parseFloat(avg))}</div>
          <div style="font-size:12px;color:#aaa">${total} review${total !== 1 ? "s" : ""}</div>
        </div>
        <div style="flex:1;min-width:180px">
          ${[5,4,3,2,1].map(star => {
            const count = reviews.filter(r => Math.round(r.rating) === star).length;
            const pct   = total ? Math.round(count / total * 100) : 0;
            return `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="font-size:12px;color:#555;width:10px;text-align:right">${star}</span>
                <span style="font-size:10px;color:#f59e0b">★</span>
                <div style="flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden">
                  <div style="height:100%;background:#f59e0b;border-radius:3px;width:${pct}%;transition:width .6s"></div>
                </div>
                <span style="font-size:12px;color:#aaa;width:20px">${count}</span>
              </div>`;
          }).join("")}
        </div>
      </div>` : `<p style="color:#aaa;font-size:13px;margin-bottom:20px">No reviews yet — be the first!</p>`}

    ${reviews.map(r => `
      <div style="padding:16px 0;border-bottom:1px solid #f5f5f5">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div style="width:36px;height:36px;border-radius:50%;background:#e8f5f4;color:#028c7e;
                      display:flex;align-items:center;justify-content:center;
                      font-weight:700;font-size:15px;flex-shrink:0">
            ${(r.name || "A").charAt(0).toUpperCase()}
          </div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:14px;color:#212121">${r.name || "Anonymous"}</div>
            ${r.verified ? `<div style="font-size:11px;color:#059669;font-weight:500">✔ Verified Buyer</div>` : ""}
          </div>
          <span style="font-size:12px;color:#aaa">
            ${r.createdat ? new Date(r.createdat).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : ""}
          </span>
        </div>
        <div style="color:#f59e0b;font-size:14px;margin-bottom:6px">${starsHtml(parseFloat(r.rating || 0))}</div>
        <p style="font-size:13px;color:#555;line-height:1.65;margin:0">${r.reviewtext || ""}</p>
      </div>`).join("")}

    <div style="margin-top:28px;padding:22px;background:#f8f9fa;border-radius:12px;border:1px solid #eee">
      <div style="font-size:16px;font-weight:700;color:#212121;margin-bottom:16px">Write a Review</div>
      <label style="font-size:13px;font-weight:600;color:#333;display:block;margin-bottom:8px">Your Rating</label>
      <div id="starPicker" style="display:flex;gap:8px;font-size:30px;cursor:pointer;margin-bottom:14px">
        ${[1,2,3,4,5].map(n => `<span onclick="setReviewStar(${n})"
          style="color:#d1d5db;transition:color .15s;user-select:none">★</span>`).join("")}
      </div>
      <input id="reviewName" type="text" placeholder="Your name"
        style="width:100%;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:8px;
               font-size:13px;margin-bottom:10px;outline:none;box-sizing:border-box;font-family:inherit"
        onfocus="this.style.borderColor='#028c7e'" onblur="this.style.borderColor='#e0e0e0'" />
      <input id="reviewEmail" type="email" placeholder="Your email (to verify purchase)"
        style="width:100%;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:8px;
               font-size:13px;margin-bottom:10px;outline:none;box-sizing:border-box;font-family:inherit"
        onfocus="this.style.borderColor='#028c7e'" onblur="this.style.borderColor='#e0e0e0'" />
      <textarea id="reviewText" rows="3" placeholder="Share your experience with this product…"
        style="width:100%;padding:10px 12px;border:1.5px solid #e0e0e0;border-radius:8px;
               font-size:13px;margin-bottom:12px;outline:none;box-sizing:border-box;
               font-family:inherit;resize:vertical"
        onfocus="this.style.borderColor='#028c7e'" onblur="this.style.borderColor='#e0e0e0'"></textarea>
      <button onclick="submitReview(${productId})"
        style="padding:11px 28px;background:#028c7e;color:#fff;border:none;border-radius:8px;
               font-size:14px;font-weight:700;cursor:pointer;transition:background .2s"
        onmouseover="this.style.background='#016d62'" onmouseout="this.style.background='#028c7e'">
        Submit Review
      </button>
      <p id="reviewMsg" style="font-size:13px;margin-top:10px;display:none;font-weight:500"></p>
    </div>`;
}

function setReviewStar(val) {
  reviewStarVal = val;
  document.querySelectorAll("#starPicker span").forEach((s, i) => {
    s.style.color = i < val ? "#f59e0b" : "#d1d5db";
  });
}

// ── SUBMIT REVIEW  →  POST /api/reviews ──────────────────────────────────
async function submitReview(productId) {
  const name  = document.getElementById("reviewName")?.value.trim();
  const email = document.getElementById("reviewEmail")?.value.trim();
  const text  = document.getElementById("reviewText")?.value.trim();
  const msg   = document.getElementById("reviewMsg");

  if (!name || !email || !text || !reviewStarVal) {
    msg.style.color = "#e00";
    msg.textContent = "Please fill all fields and select a star rating.";
    msg.style.display = "block"; return;
  }
  try {
    const r = await fetch("/api/reviews", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({
        productid : productId,
        name, email,
        rating    : reviewStarVal,
        reviewtext: text
      })
    });
    const d = await r.json();
    msg.style.color   = "#059669";
    msg.textContent   = d.verified ? "✓ Review submitted and verified!" : "✓ Review submitted!";
    msg.style.display = "block";
    await loadReviews(productId);
  } catch (_) {
    msg.style.color = "#e00";
    msg.textContent = "Failed to submit. Please try again.";
    msg.style.display = "block";
  }
}

// ── RELATED PRODUCTS  →  GET /products ───────────────────────────────────
async function loadRelatedProducts(catId, currentId) {
  const grid = document.getElementById("related-grid");
  if (!grid) return;
  try {
    const r   = await fetch("/products");
    const all = r.ok ? await r.json() : [];
    const rel = all.filter(p => {
      const pCat = p.category_id || p.categoryid;
      const pId  = p.product_id  || p.productid;
      return String(pCat) === String(catId) && String(pId) !== String(currentId);
    }).slice(0, 5);

    if (!rel.length) { grid.innerHTML = ""; return; }

    grid.innerHTML = rel.map(p => {
      const pId   = p.product_id  || p.productid;
      const pCat  = p.category_id || p.categoryid;
      const pName = p.product_name || p.productname || "Product";
      const pImg  = p.image_url   || p.imageurl     || "";
      const price = parseVariantPrice(p.offerprice   || "");
      return `
        <div onclick="window.location.href='product_overview.html?product_ID=${pId}'"
          style="background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden;
                 cursor:pointer;transition:box-shadow .2s,transform .2s"
          onmouseover="this.style.boxShadow='0 4px 20px rgba(0,0,0,.1)';this.style.transform='translateY(-3px)'"
          onmouseout="this.style.boxShadow='none';this.style.transform='translateY(0)'">
          <div style="height:130px;background:#f8f9fa;display:flex;align-items:center;justify-content:center;overflow:hidden">
            ${pImg
              ? `<img src="${pImg}" alt="${pName}" style="width:100%;height:100%;object-fit:cover"
                      onerror="this.style.display='none'" />`
              : `<span style="font-size:48px">💊</span>`}
          </div>
          <div style="padding:10px 12px">
            <div style="font-size:13px;font-weight:600;color:#212121;line-height:1.4;margin-bottom:4px;
                        overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
              ${pName}
            </div>
            <div style="font-size:14px;font-weight:700;color:#212121;margin-bottom:8px">
              ${price > 0 ? `$${price.toFixed(2)}` : "—"}
            </div>
            <button onclick="event.stopPropagation();addRelatedToCart('${pId}','${pCat}','${pName.replace(/'/g,"\\'")}','${price}','${pImg.replace(/'/g,"\\'")}')"
              style="width:100%;padding:7px;border:1.5px solid #028c7e;border-radius:6px;
                     background:transparent;color:#028c7e;font-size:12px;font-weight:600;
                     cursor:pointer;transition:background .2s,color .2s"
              onmouseover="this.style.background='#028c7e';this.style.color='#fff'"
              onmouseout="this.style.background='transparent';this.style.color='#028c7e'">
              ADD
            </button>
          </div>
        </div>`;
    }).join("");
  } catch (e) { console.warn("Related products error:", e); }
}

// ── META TAGS ─────────────────────────────────────────────────────────────
function updateMetaTags(product) {
  if (!product?.product_name) return;
  document.title = `${product.product_name} | Order Online – MCland Pharma`;
  let desc = document.querySelector('meta[name="description"]');
  if (!desc) { desc = document.createElement("meta"); desc.name = "description"; document.head.appendChild(desc); }
  desc.content = `Buy ${product.product_name} from MCland Pharma. ${(product.product_description || "").substring(0, 120)} Secure delivery.`;
}

// ── SEARCH ────────────────────────────────────────────────────────────────
async function buildProductSearch() {
  // const inp = document.getElementById("mainSearch");
  // const btn = document.getElementById("searchBtn");
  // if (!inp || !btn) return;
  // const go = () => {
  //   const q = inp.value.trim();
  //   if (q) window.location.href = `categories.html?catogeriesID=1&search=${encodeURIComponent(q)}`;
  // };
  // btn.addEventListener("click", go);
  // inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } });
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
    // if (searchQuery) input.value = searchQuery;

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

// ── HELPERS ───────────────────────────────────────────────────────────────
function starsHtml(r) {
  let h = "";
  for (let i = 1; i <= 5; i++) {
    if      (r >= i)      h += `<span style="color:#f59e0b">★</span>`;
    else if (r >= i - .5) h += `<span style="color:#f59e0b;opacity:.5">★</span>`;
    else                  h += `<span style="color:#d1d5db">★</span>`;
  }
  return h;
}

function showError(msg) {
  const el = document.getElementById("nameing_of_product");
  if (el) el.textContent = msg;
  console.error("❌", msg);
}

// ── CAROUSEL ──────────────────────────────────────────────────────────────
function setupCarousel() {
  const carousel = document.querySelector(".carousel__slide");
  if (!carousel) return;
  const prev = document.getElementById("prevSlide");
  const next = document.getElementById("nextSlide");
  let current = 0;

  function showSlide(i) {
    const slides = carousel.querySelectorAll(".zoom-container");
    if (!slides.length) return;
    slides.forEach((s, idx) => s.style.display = idx === i ? "flex" : "none");
  }

  function openZoom(src) {
    const overlay = document.getElementById("zoomOverlay");
    const zImg    = document.getElementById("zoomedImage");
    if (!overlay || !zImg) return;
    zImg.src = src;
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeZoom() {
    const overlay = document.getElementById("zoomOverlay");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "auto";
  }

  function initCarousel() {
    const images = carousel.querySelectorAll("img");
    if (!images.length) return;
    carousel.innerHTML = "";
    images.forEach((img, i) => {
      const zc = document.createElement("div");
      zc.className    = "zoom-container";
      zc.style.cssText = `display:${i === 0 ? "flex" : "none"};align-items:center;justify-content:center;width:100%;height:100%`;
      const ni = img.cloneNode(true);
      ni.style.cssText = "max-width:100%;max-height:100%;object-fit:contain;cursor:zoom-in;transition:transform .3s";
      ni.addEventListener("click",       () => openZoom(ni.src));
      ni.addEventListener("mouseenter",  () => { if (window.innerWidth > 768) ni.style.transform = "scale(1.05)"; });
      ni.addEventListener("mouseleave",  () => ni.style.transform = "scale(1)");
      zc.appendChild(ni);
      carousel.appendChild(zc);
    });

    showSlide(current);

    prev?.addEventListener("click", () => {
      const slides = carousel.querySelectorAll(".zoom-container");
      current = (current - 1 + slides.length) % slides.length;
      showSlide(current);
    });
    next?.addEventListener("click", () => {
      const slides = carousel.querySelectorAll(".zoom-container");
      current = (current + 1) % slides.length;
      showSlide(current);
    });
    document.getElementById("zoomClose")?.addEventListener("click", closeZoom);
    document.getElementById("zoomOverlay")?.addEventListener("click", e => {
      if (e.target.id === "zoomOverlay") closeZoom();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeZoom();
      const slides = carousel.querySelectorAll(".zoom-container");
      if (e.key === "ArrowLeft")  { current = (current - 1 + slides.length) % slides.length; showSlide(current); }
      if (e.key === "ArrowRight") { current = (current + 1) % slides.length; showSlide(current); }
    });
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.type === "childList" && carousel.querySelectorAll("img").length > 0) {
        initCarousel();
        observer.disconnect();
      }
    });
  });
  observer.observe(carousel, { childList: true });
}