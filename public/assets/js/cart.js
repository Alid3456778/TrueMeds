
// ─────────────────────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────────────────────
let cartItems      = [];      // full array from server
let couponDiscount = 0;
let couponCode     = "";
const FREE_DELIVERY_THRESHOLD = 50;
const SHIPPING_COST           = 10;

// ─────────────────────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  loadCart();
  await initSearch();
  initMobileMenu();
  initScrollTop();
});

// ─────────────────────────────────────────────────────────────────────────
//  LOAD CART  →  GET /api/cart
//  Returns: { success, data: [{id, sessionid, productid, name,
//             quantity, mg, price, imageurl, categoryid}] }
// ─────────────────────────────────────────────────────────────────────────
async function loadCart() {
  try {
    const r = await fetch("/api/cart");
    const d = await r.json();
    if (d.success) {
      cartItems = d.data || [];
      renderCart();
      updateCartBadge(cartItems.length);
    }
  } catch (e) { console.error("Load cart error:", e); }
}

// ─────────────────────────────────────────────────────────────────────────
//  RENDER CART
// ─────────────────────────────────────────────────────────────────────────
function getCurrencySymbol(categoryId) {
  return parseInt(categoryId) === 11 ? "€" : "$";
}

function formatCurrency(amount, categoryId) {
  return `${getCurrencySymbol(categoryId)}${amount.toFixed(2)}`;
}

function getSummaryCurrencySymbol(selectedItems) {
  if (!selectedItems || !selectedItems.length) return "$";
  return selectedItems.some(item => getCurrencySymbol(item.category_id ?? item.categoryid) === "€") ? "€" : "$";
}

function renderCart() {
  const container = document.getElementById("cartItemsContainer");
  document.getElementById("itemCountBadge").textContent = cartItems.length;

  if (!cartItems.length) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-icon">🛒</div>
        <div class="empty-title">Your cart is empty</div>
        <div class="empty-sub">Looks like you haven't added anything yet.</div>
        <a href="index.html" class="btn-shop"><i class="fas fa-pills"></i> Continue Shopping</a>
      </div>`;
    document.getElementById("checkoutBtn").disabled = true;
    updateSummary();
    updateFreeBar();
    return;
  }

  container.innerHTML = cartItems.map(item => {
    const price      = parseFloat(item.price) || 0;
    const qty        = parseInt(item.quantity) || 1;
    const subtotal   = price * qty;
    const categoryId = item.category_id ?? item.categoryid;

    return `
      <div class="cart-item" id="cart-item-${item.id}">
        <div class="item-check">
          <input type="checkbox" class="item-select" data-id="${item.id}" checked
            onchange="updateSummary()" />
        </div>
        <div class="item-img" onclick="goToProduct('${item.product_id}','${item.category_id}')">
          ${item.image_url
            ? `<img src="${item.image_url}" alt="${item.name||'Product'}"
                    onerror="this.style.display='none'" />`
            : `<span style="font-size:36px">💊</span>`}
        </div>
        <div class="item-body">
          <div class="item-name" onclick="goToProduct('${item.product_id}','${item.category_id}')">
            ${item.name || "Product"}
          </div>
          ${item.mg ? `<div class="item-mg"><i class="fas fa-pills" style="margin-right:4px;color:var(--primary)"></i>${item.mg}</div>` : ""}
          <div class="item-price-row">
            <span class="item-price">${formatCurrency(price, categoryId)}</span>
            ${qty > 1 ? `<span style="font-size:12px;color:var(--text-lt)">× ${qty} = ${formatCurrency(subtotal, categoryId)}</span>` : ""}
          </div>
          <div class="item-actions">
            <div class="qty-box">
              <button class="qty-btn" onclick="changeItemQty(${item.id}, -1)">−</button>
              <input type="text" class="qty-val" value="${qty}" readonly id="qty-${item.id}" />
              <button class="qty-btn" onclick="changeItemQty(${item.id}, +1)">+</button>
            </div>
            <button class="btn-remove" onclick="removeItem(${item.id})">
              <i class="fas fa-trash-alt"></i> Remove
            </button>
          </div>
          <div class="item-delivery"></div>
        </div>
      </div>`;
  }).join("");

  document.getElementById("checkoutBtn").disabled = false;
  updateSummary();
  updateFreeBar();
}

// ─────────────────────────────────────────────────────────────────────────
//  REMOVE ITEM  →  DELETE /remove-from-cart  { id }
// ─────────────────────────────────────────────────────────────────────────
async function removeItem(cartRowId) {
  const el = document.getElementById(`cart-item-${cartRowId}`);
  if (el) { el.style.opacity = "0.4"; el.style.pointerEvents = "none"; }
  try {
    const r = await fetch("/remove-from-cart", {
      method : "DELETE",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ id: cartRowId })
    });
    const d = await r.json();
    if (d.success) {
      cartItems = cartItems.filter(i => i.id !== cartRowId);
      renderCart();
      updateCartBadge(cartItems.length);
    } else {
      if (el) { el.style.opacity = "1"; el.style.pointerEvents = "auto"; }
    }
  } catch (e) {
    console.error("Remove error:", e);
    if (el) { el.style.opacity = "1"; el.style.pointerEvents = "auto"; }
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  CHANGE QTY (client-side only — server cart stores qty at add time)
// ─────────────────────────────────────────────────────────────────────────
function changeItemQty(cartRowId, delta) {
  const item = cartItems.find(i => i.id === cartRowId);
  if (!item) return;
  const newQty = Math.max(1, Math.min(99, (parseInt(item.quantity) || 1) + delta));
  item.quantity = newQty;
  const qtyEl = document.getElementById(`qty-${cartRowId}`);
  if (qtyEl) qtyEl.value = newQty;
  // Re-render just the price line and summary
  renderCart();
}

// ─────────────────────────────────────────────────────────────────────────
//  SELECT ALL
// ─────────────────────────────────────────────────────────────────────────
function toggleSelectAll(checked) {
  document.querySelectorAll(".item-select").forEach(cb => cb.checked = checked);
  updateSummary();
}

// ─────────────────────────────────────────────────────────────────────────
//  GET SELECTED ITEMS
// ─────────────────────────────────────────────────────────────────────────
function getSelectedItems() {
  const selectedIds = new Set(
    [...document.querySelectorAll(".item-select:checked")].map(cb => parseInt(cb.dataset.id))
  );
  return cartItems.filter(i => selectedIds.has(i.id));
}

// ─────────────────────────────────────────────────────────────────────────
//  UPDATE SUMMARY
// ─────────────────────────────────────────────────────────────────────────
function updateSummary() {
  const selected = getSelectedItems();
  const mrp      = selected.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
  const discount = 0; // extend here if you have MRP vs sale price
  const subtotal = mrp - discount;
  const shipping = subtotal > FREE_DELIVERY_THRESHOLD ? 0 : (subtotal > 0 ? SHIPPING_COST : 0);
  const coupon   = Math.min(couponDiscount, subtotal);
  const total    = Math.max(0, subtotal - coupon + shipping);
  const saving   = discount + coupon;

  document.getElementById("sumMRP").textContent      = `$${mrp.toFixed(2)}`;
  document.getElementById("sumDiscount").textContent = `- $${discount.toFixed(2)}`;
  document.getElementById("sumCoupon").textContent   = `- $${coupon.toFixed(2)}`;
  document.getElementById("sumSubtotal").textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById("sumDelivery").textContent = shipping > 0 ? `$${shipping.toFixed(2)}` : "FREE 🎉";
  document.getElementById("sumTotal").textContent    = `$${total.toFixed(2)}`;

  const symbol = getSummaryCurrencySymbol(selected);
  const chip = document.getElementById("savingChip");
  if (saving > 0) {
    chip.style.display = "block";
    document.getElementById("savingAmt").textContent = `${symbol}${saving.toFixed(2)}`;
  } else {
    chip.style.display = "none";
  }

  document.getElementById("sumMRP").textContent      = `${symbol}${mrp.toFixed(2)}`;
  document.getElementById("sumDiscount").textContent = `- ${symbol}${discount.toFixed(2)}`;
  document.getElementById("sumCoupon").textContent   = `- ${symbol}${coupon.toFixed(2)}`;
  document.getElementById("sumSubtotal").textContent = `${symbol}${subtotal.toFixed(2)}`;
  document.getElementById("sumDelivery").textContent = shipping > 0 ? `${symbol}${shipping.toFixed(2)}` : "FREE 🎉";
  document.getElementById("sumTotal").textContent    = `${symbol}${total.toFixed(2)}`;

  document.getElementById("checkoutBtn").disabled = selected.length === 0;
}

// ─────────────────────────────────────────────────────────────────────────
//  FREE DELIVERY PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────
function updateFreeBar() {
  const total = cartItems.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);
  const pct = Math.min(100, (total / FREE_DELIVERY_THRESHOLD) * 100);

  const freeBar = document.getElementById("freeBar");
  if (!freeBar) return;

  const freeBarFill = freeBar.querySelector("#freeBarFill");
  const freeBarAmt = freeBar.querySelector("#freeBarAmt");
  const freeBarText = freeBar.querySelector(".free-bar-text");
  if (!freeBarFill || !freeBarAmt || !freeBarText) return;

  freeBarFill.style.width = `${pct}%`;
  if (remaining > 0) {
    freeBarAmt.textContent = `$${remaining.toFixed(2)}`;
    freeBarText.innerHTML = `Add <strong>$${remaining.toFixed(2)}</strong> more to get <strong>FREE delivery!</strong>`;
  } else {
    freeBarText.innerHTML = `🎉 <strong>You've unlocked FREE delivery!</strong>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  COUPON
// ─────────────────────────────────────────────────────────────────────────
const COUPONS = { "SAVE10": 10, "MCLAND20": 20, "FIRST15": 15 };

function applyCoupon() {
  const code = document.getElementById("couponInput").value.trim().toUpperCase();
  const msg  = document.getElementById("couponMsg");
  if (!code) { showCouponMsg("Enter a coupon code.", "red"); return; }
  if (COUPONS[code]) {
    couponDiscount = COUPONS[code];
    couponCode     = code;
    showCouponMsg(`✓ Coupon "${code}" applied! You save $${couponDiscount.toFixed(2)}.`, "green");
    document.getElementById("removeCouponBtn").style.display = "block";
    document.getElementById("couponInput").disabled = true;
    updateSummary();
  } else {
    showCouponMsg("Invalid coupon code. Try: SAVE10, MCLAND20, FIRST15", "red");
  }
}

function removeCoupon() {
  couponDiscount = 0; couponCode = "";
  document.getElementById("couponInput").value    = "";
  document.getElementById("couponInput").disabled = false;
  document.getElementById("removeCouponBtn").style.display = "none";
  showCouponMsg("", "");
  updateSummary();
}

function showCouponMsg(text, color) {
  const msg = document.getElementById("couponMsg");
  msg.textContent   = text;
  msg.style.color   = color === "green" ? "var(--green)" : "var(--red)";
  msg.style.display = text ? "block" : "none";
}

// ─────────────────────────────────────────────────────────────────────────
//  CHECKOUT MODAL
// ─────────────────────────────────────────────────────────────────────────
function openCheckout() {
  const selected = getSelectedItems();
  if (!selected.length) return;

  // Populate order review
  const subtotal = selected.reduce((s, i) => s + (parseFloat(i.price)||0)*(parseInt(i.quantity)||1), 0);
  const shipping = subtotal > FREE_DELIVERY_THRESHOLD ? 0 : SHIPPING_COST;
  const coupon   = Math.min(couponDiscount, subtotal);
  const total    = Math.max(0, subtotal - coupon + shipping);

  document.getElementById("orderReview").innerHTML = `
    <div class="order-review-title"><i class="fas fa-receipt" style="color:var(--primary);margin-right:6px"></i>Order Review</div>
    ${selected.map(i => `
      <div class="order-item-row">
        <span>${i.name || "Product"} ${i.mg ? `(${i.mg})` : ""} × ${i.quantity}</span>
        <span>$${((parseFloat(i.price)||0)*(parseInt(i.quantity)||1)).toFixed(2)}</span>
      </div>`).join("")}
    ${shipping > 0 ? `<div class="order-item-row"><span>🚚 Shipping</span><span>$${shipping.toFixed(2)}</span></div>` : `<div class="order-item-row"><span>🚚 Shipping</span><span style="color:var(--green)">FREE</span></div>`}
    ${coupon > 0   ? `<div class="order-item-row"><span>🏷️ Coupon (${couponCode})</span><span style="color:var(--green)">- $${coupon.toFixed(2)}</span></div>` : ""}
    <div class="order-total-row"><span>Total</span><span>$${total.toFixed(2)}</span></div>`;

  document.getElementById("checkoutModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCheckout() {
  document.getElementById("checkoutModal").classList.remove("open");
  document.body.style.overflow = "";
}

// ─────────────────────────────────────────────────────────────────────────
//  PLACE ORDER  →  POST /api/checkout
//  Server expects: { firstName, lastName, phone, email, companyName,
//    country, billingStreetAddress, apartment, billingCity, billingState,
//    billingZip, cartItems, shippingCost, totalCost }
//  cartItems: [{productid, name, mg, quantity, price}]
// ─────────────────────────────────────────────────────────────────────────
async function placeOrder() {
  const errEl = document.getElementById("checkoutError");
  errEl.style.display = "none";

  // Validate required fields
  const fields = {
    firstName: "First Name", lastName: "Last Name", phone: "Phone",
    email: "Email", streetAddress: "Street Address",
    city: "City", state: "State", zipCode: "ZIP Code", country: "Country"
  };
  for (const [id, label] of Object.entries(fields)) {
    if (!document.getElementById(id)?.value.trim()) {
      errEl.textContent   = `${label} is required.`;
      errEl.style.display = "block";
      document.getElementById(id)?.focus();
      return;
    }
  }

  const selected = getSelectedItems();
  if (!selected.length) { errEl.textContent = "No items selected."; errEl.style.display = "block"; return; }

  const subtotal = selected.reduce((s, i) => s + (parseFloat(i.price)||0)*(parseInt(i.quantity)||1), 0);
  const shipping = subtotal > FREE_DELIVERY_THRESHOLD ? 0 : SHIPPING_COST;
  const coupon   = Math.min(couponDiscount, subtotal);
  const total    = Math.max(0, subtotal - coupon + shipping);

  const btn = document.getElementById("placeOrderBtn");
  btn.disabled   = true;
  btn.innerHTML  = `<i class="fas fa-spinner fa-spin"></i> Placing Order…`;

  const payload = {
    firstName           : document.getElementById("firstName").value.trim(),
    lastName            : document.getElementById("lastName").value.trim(),
    phone               : document.getElementById("phone").value.trim(),
    email               : document.getElementById("email").value.trim(),
    companyName         : document.getElementById("companyName").value.trim() || null,
    country             : document.getElementById("country").value,
    billingStreetAddress: document.getElementById("streetAddress").value.trim(),
    apartment           : document.getElementById("apartment").value.trim() || null,
    billingCity         : document.getElementById("city").value.trim(),
    billingState        : document.getElementById("state").value.trim(),
    billingZip          : document.getElementById("zipCode").value.trim(),
    shippingCost        : shipping,
    totalCost           : total,
    cartItems           : selected.map(i => ({
      productid : i.productid,
      name      : i.name      || "Product",
      mg        : i.mg        || null,
      quantity  : parseInt(i.quantity) || 1,
      price     : parseFloat(i.price)  || 0
    }))
  };

  try {
    const r = await fetch("/api/checkout", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify(payload)
    });
    const d = await r.json();

    if (d.success) {
      // Clear cart items from server (already handled by checkout or clear manually)
      closeCheckout();
      document.getElementById("successOrderId").textContent = d.orderId || "—";
      document.getElementById("successModal").classList.add("open");
      // Clear local cart state
      cartItems = [];
      renderCart();
      updateCartBadge(0);
      localStorage.removeItem("cartCount");
    } else {
      errEl.textContent   = d.error || d.message || "Order failed. Please try again.";
      errEl.style.display = "block";
      btn.disabled  = false;
      btn.innerHTML = `<i class="fas fa-lock"></i> Place Order`;
    }
  } catch (e) {
    console.error("Checkout error:", e);
    errEl.textContent   = "Network error. Please try again.";
    errEl.style.display = "block";
    btn.disabled  = false;
    btn.innerHTML = `<i class="fas fa-lock"></i> Place Order`;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────
function goToProduct(productId, categoryId) {
  if (productId) window.location.href = `product_overview.html?product_ID=${productId}`;
}

function updateCartBadge(count) {
  const badge = document.getElementById("cart-count");
  if (!badge) return;
  badge.textContent   = count;
  badge.style.display = count > 0 ? "inline-flex" : "none";
  localStorage.setItem("cartCount", count);
}
//search bar
async function initSearch() {
  const inp = document.getElementById('mainSearch');
  const btn = document.getElementById('searchBtn');
  if (!inp || !btn) return;
  try {
    const cached = localStorage.getItem('SearchProducts');
    const cacheTime = parseInt(localStorage.getItem('SearchProductsTime') || '0');
    let products = [];
    if (cached && (Date.now() - cacheTime < 5 * 60 * 1000)) {
      products = JSON.parse(cached);
    } else {
      const res = await fetch('/products');
      if (res.ok) products = await res.json();
      console.log('Products sample:', products[0]);
      localStorage.setItem('SearchProducts', JSON.stringify(products));
      localStorage.setItem('SearchProductsTime', Date.now().toString());
    }
    const sugBox = document.getElementById('suggestions');
    if (!sugBox) return;
    inp.addEventListener('input', () => {
      const q = inp.value.trim().toLowerCase();
      sugBox.innerHTML = '';
      if (!q) { sugBox.style.display = 'none'; return; }
      const matches = products.filter(p => p.product_name?.toLowerCase().includes(q)).slice(0, 8);
      if (matches.length) {
        matches.forEach(p => {
          const li = document.createElement('li');
          const img = document.createElement('img');
          img.src = p.image_url || 'assets/image/default.png';
          img.style.cssText = 'width:40px;height:40px;object-fit:cover;margin-right:10px;border-radius:6px;flex-shrink:0';
          img.onerror = () => img.style.display = 'none';
          const span = document.createElement('span');
          span.textContent = p.product_name;
          li.appendChild(img); li.appendChild(span);
          li.addEventListener('click', () => {
            window.location.href = `productoverview.html?productID=${p.product_id}`;
          });
          sugBox.appendChild(li);
        });
        sugBox.style.display = 'block';
      } else {
        const li = document.createElement('li');
        li.textContent = 'No products found';
        li.style.cssText = 'padding:12px 14px;color:#999;cursor:default';
        sugBox.appendChild(li);
        sugBox.style.display = 'block';
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-bar')) sugBox.style.display = 'none';
    });
    function doSearch() {
      const q = inp.value.trim().toLowerCase();
      if (!q) return;
      const exact = products.find(p => p.product_name?.toLowerCase() === q);
      if (exact) {
        window.location.href = `productoverview.html?productID=${exact.productid}`;
      } else {
        window.location.href = `categories.html?search=${encodeURIComponent(q)}`;
      }
      sugBox.style.display = 'none';
    }
    btn.addEventListener('click', doSearch);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
  } catch (err) {
    console.error('Search init error:', err);
  }
}
function initMobileMenu() {
  document.getElementById("menuToggle")?.addEventListener("click", () => {
    document.getElementById("mobileMenu").classList.add("open");
    document.body.style.overflow = "hidden";
  });
  document.getElementById("mobClose")?.addEventListener("click", () => {
    document.getElementById("mobileMenu").classList.remove("open");
    document.body.style.overflow = "";
  });
  document.getElementById("mobOverlay")?.addEventListener("click", () => {
    document.getElementById("mobileMenu").classList.remove("open");
    document.body.style.overflow = "";
  });
}

function initScrollTop() {
  const btn = document.getElementById("scrollTop");
  window.addEventListener("scroll", () => btn?.classList.toggle("visible", window.scrollY > 400));
  btn?.addEventListener("click", () => window.scrollTo({ top:0, behavior:"smooth" }));
}

// Close checkout modal on overlay click
document.getElementById("checkoutModal")?.addEventListener("click", e => {
  if (e.target.id === "checkoutModal") closeCheckout();
});
