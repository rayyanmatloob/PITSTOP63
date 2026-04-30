"use strict";

const engineToggle = document.getElementById("engineToggle");
const engineHint = document.getElementById("engineHint");
const menuSection = document.getElementById("menu");
const menuShell = document.querySelector(".menu-shell");
const orderModeDetails = document.getElementById("orderModeDetails");
const orderModeCards = Array.from(document.querySelectorAll("[data-order-mode]"));
const menuSearch = document.getElementById("menuSearch");
const menuSearchClear = document.getElementById("menuSearchClear");
const menuSearchStatus = document.getElementById("menuSearchStatus");
const menuSelectionStatus = document.getElementById("menuSelectionStatus");
const cartSummary = document.querySelector(".cart-summary");
const cartSummaryCount = document.getElementById("cartSummaryCount");
const cartSummaryTitle = document.getElementById("cartSummaryTitle");
const cartSummaryTotal = document.getElementById("cartSummaryTotal");
const cartToggle = document.getElementById("cartToggle");
const cartToggleTotal = document.getElementById("cartToggleTotal");
const floatingCartButton = document.getElementById("floatingCartButton");
const floatingCartTotal = document.getElementById("floatingCartTotal");
const cartItemsList = document.getElementById("cartItems");
const cartEmpty = document.getElementById("cartEmpty");
const cartClose = document.getElementById("cartClose");
const orderForm = document.getElementById("orderForm");
const orderCustomerName = document.getElementById("orderCustomerName");
const orderCustomerPhone = document.getElementById("orderCustomerPhone");
const orderAddress = document.getElementById("orderAddress");
const orderLandmark = document.getElementById("orderLandmark");
const pickupBranchCard = document.getElementById("pickupBranchCard");
const orderNotes = document.getElementById("orderNotes");
const orderConfirmation = document.getElementById("orderConfirmation");
const menuItems = Array.from(menuSection?.querySelectorAll(".menu-list li") ?? []);
const menuCategories = Array.from(menuSection?.querySelectorAll(".menu-category") ?? []);
const reviewTrack = document.getElementById("reviewTrack");
const reviewSlides = Array.from(reviewTrack?.querySelectorAll(".review-slide") ?? []);
const reviewDots = Array.from(document.querySelectorAll(".review-dots span"));
const reviewIntervalMs = 4000;

let lastScrolledMatch = null;
let reviewIndex = 0;
let reviewTimer = null;
let selectedOrderMode = "";
let addedToastTimer = null;
let activeVariantItem = null;
let activeAddOn = null;
let pendingOrder = null;
let orderCountdownTimer = null;
const itemQuantities = new Map();
const cartEntries = new Map();
const cartEntryOrder = [];
const addedToast = document.createElement("div");
const variantPicker = document.createElement("div");
const addOnPicker = document.createElement("div");

addedToast.className = "cart-toast";
addedToast.setAttribute("role", "status");
addedToast.setAttribute("aria-live", "polite");
addedToast.innerHTML = `
  <span class="cart-toast-icon" aria-hidden="true"></span>
  <span class="cart-toast-copy">
    <strong></strong>
    <small>Added to cart</small>
  </span>
`;
document.body.append(addedToast);

variantPicker.className = "variant-picker";
variantPicker.setAttribute("aria-hidden", "true");
variantPicker.innerHTML = `
  <div class="variant-picker-panel" role="dialog" aria-modal="false" aria-labelledby="variantPickerTitle">
    <button class="variant-picker-close" type="button" aria-label="Close drink options"></button>
    <span class="variant-picker-kicker">Choose your coffee</span>
    <strong id="variantPickerTitle"></strong>
    <div class="variant-picker-options"></div>
  </div>
`;
document.body.append(variantPicker);

addOnPicker.className = "variant-picker add-on-picker";
addOnPicker.setAttribute("aria-hidden", "true");
addOnPicker.innerHTML = `
  <div class="variant-picker-panel" role="dialog" aria-modal="false" aria-labelledby="addOnPickerTitle">
    <button class="variant-picker-close" type="button" aria-label="Close add-on options"></button>
    <span class="variant-picker-kicker">Choose item for add-on</span>
    <strong id="addOnPickerTitle"></strong>
    <div class="variant-picker-options add-on-picker-options"></div>
  </div>
`;
document.body.append(addOnPicker);

const orderModeContent = {
  pickup: {
    label: "Pickup",
    detail: "<strong>Pickup selected.</strong> Collect from Pitstop63, DHA Phase 6, Lahore.",
    hint: "Pickup selected. Press the engine start button to view the menu."
  },
  delivery: {
    label: "Delivery",
    detail: "<strong>Delivery selected.</strong> Add your complete address and nearest landmark at checkout.",
    hint: "Delivery selected. Press the engine start button to view the menu."
  }
};

function normalizeSearchValue(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function setSearchStatus(message) {
  if (menuSearchStatus) {
    menuSearchStatus.textContent = message;
  }
}

function setSelectionStatus(message, hasSelection = false) {
  if (!menuSelectionStatus) {
    return;
  }

  menuSelectionStatus.textContent = message;
  menuSelectionStatus.classList.toggle("has-selection", hasSelection);
}

function getTotalSelectedQuantity() {
  return Array.from(itemQuantities.values()).reduce((total, quantity) => total + quantity, 0);
}

function parseMenuPrice(value) {
  const parsed = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCartEntryKey(label, price) {
  return `${label.toLowerCase()}|${price}`;
}

function getItemQuantityFromCart(item) {
  return Array.from(cartEntries.values())
    .filter((entry) => entry.item === item)
    .reduce((total, entry) => total + entry.quantity, 0);
}

function getCartEntries() {
  return Array.from(cartEntries.values());
}

function getCartEntryPairs() {
  return Array.from(cartEntries.entries());
}

function getEntryAddOnsTotal(entry) {
  return Array.from(entry.addOns?.values() ?? []).reduce(
    (sum, addOn) => sum + addOn.price * addOn.quantity,
    0
  );
}

function getCartTotal() {
  return getCartEntries().reduce(
    (total, entry) => total + entry.quantity * entry.price + getEntryAddOnsTotal(entry),
    0
  );
}

function renderCartSummary() {
  const entries = getCartEntries();
  const totalQuantity = entries.reduce((total, entry) => total + entry.quantity, 0);
  const totalPrice = getCartTotal();
  const itemLabel = totalQuantity === 1 ? "item" : "items";
  const formattedTotal = `PKR ${totalPrice.toLocaleString("en-PK")}`;
  const hasItems = totalQuantity > 0;
  const hasConfirmation = Boolean(cartSummary?.classList.contains("has-order-confirmation"));

  cartSummary?.classList.toggle("has-items", hasItems);

  if (!hasItems && !hasConfirmation) {
    closeCartSummary();
  }

  if (cartToggle) {
    cartToggle.hidden = !hasItems;
  }

  if (cartToggleTotal) {
    cartToggleTotal.textContent = formattedTotal;
  }

  if (floatingCartButton) {
    floatingCartButton.hidden = !hasItems;
  }

  if (floatingCartTotal) {
    floatingCartTotal.textContent = formattedTotal;
  }

  if (cartSummaryCount) {
    cartSummaryCount.textContent = `${totalQuantity} ${itemLabel}`;
  }

  if (cartSummaryTotal) {
    cartSummaryTotal.textContent = formattedTotal;
  }

  if (cartEmpty) {
    cartEmpty.hidden = totalQuantity > 0 || hasConfirmation;
  }

  if (orderForm) {
    orderForm.hidden = !hasItems;
  }

  if (!cartItemsList) {
    return;
  }

  cartItemsList.replaceChildren();

  getCartEntryPairs().forEach(([key, entry]) => {
    const cartItem = document.createElement("li");
    const addOns = Array.from(entry.addOns?.values() ?? []);
    const addOnsTotal = addOns.reduce((total, addOn) => total + addOn.price * addOn.quantity, 0);
    const lineTotal = entry.price * entry.quantity + addOnsTotal;
    const addOnsMarkup = addOns
      .map(
        (addOn) => `
          <em>
            <span>+ ${addOn.label}</span>
            <small>PKR ${addOn.price.toLocaleString("en-PK")} x ${addOn.quantity}</small>
          </em>
        `
      )
      .join("");

    cartItem.innerHTML = `
      <span>
        <strong>${entry.label}</strong>
        <small>PKR ${entry.price.toLocaleString("en-PK")} x ${entry.quantity}</small>
        ${addOnsMarkup ? `<span class="cart-add-ons">${addOnsMarkup}</span>` : ""}
      </span>
      <div class="cart-line-meta">
        <b>PKR ${lineTotal.toLocaleString("en-PK")}</b>
        <div class="cart-line-actions" aria-label="Edit ${entry.label}">
          <button type="button" data-cart-action="decrease" data-entry-key="${key}" aria-label="Reduce ${entry.label}">-</button>
          <span>Qty ${entry.quantity}</span>
          <button type="button" data-cart-action="increase" data-entry-key="${key}" aria-label="Add one more ${entry.label}">+</button>
          <button class="cart-line-remove" type="button" data-cart-action="remove" data-entry-key="${key}" aria-label="Remove ${entry.label}">Remove</button>
        </div>
      </div>
    `;
    cartItemsList.append(cartItem);
  });
}

function openCartSummary() {
  const hasConfirmation = Boolean(cartSummary?.classList.contains("has-order-confirmation"));

  if (!cartSummary || (getTotalSelectedQuantity() === 0 && !hasConfirmation)) {
    return;
  }

  cartSummary.hidden = false;
  cartSummary.classList.add("is-open");
  document.body.classList.add("cart-screen-open");
  cartToggle?.setAttribute("aria-expanded", "true");
}

function closeCartSummary() {
  if (!cartSummary) {
    return;
  }

  cartSummary.hidden = true;
  cartSummary.classList.remove("is-open");
  document.body.classList.remove("cart-screen-open");
  cartToggle?.setAttribute("aria-expanded", "false");
}

function toggleCartSummary() {
  if (cartSummary?.hidden) {
    openCartSummary();
    return;
  }

  closeCartSummary();
}

function updateOrderFieldRequirements() {
  const needsDeliveryDetails = selectedOrderMode === "delivery";

  document.querySelectorAll(".delivery-only-field").forEach((field) => {
    field.hidden = !needsDeliveryDetails;
  });

  if (pickupBranchCard) {
    pickupBranchCard.hidden = needsDeliveryDetails;
  }

  if (orderAddress) {
    orderAddress.required = needsDeliveryDetails;
    orderAddress.placeholder = needsDeliveryDetails
      ? "House, street, block, phase, city"
      : "Optional for pickup";
  }

  if (orderLandmark) {
    orderLandmark.required = needsDeliveryDetails;
    orderLandmark.placeholder = needsDeliveryDetails
      ? "Near mosque, school, mall, etc."
      : "Optional for pickup";
  }
}

function clearOrderConfirmation() {
  window.clearInterval(orderCountdownTimer);
  orderCountdownTimer = null;
  pendingOrder = null;
  cartSummary?.classList.remove("has-order-confirmation");
  orderConfirmation?.classList.remove("is-pending", "is-confirmed", "is-canceled");

  if (cartSummaryTitle) {
    cartSummaryTitle.textContent = "Review Your Order";
  }

  if (orderConfirmation) {
    orderConfirmation.hidden = true;
    orderConfirmation.replaceChildren();
  }
}

function clearCartData() {
  cartEntries.clear();
  cartEntryOrder.splice(0);
  itemQuantities.clear();

  menuItems.forEach((item) => {
    updateMenuItemQuantity(item, 0);
  });
}

function createOrderSnapshot() {
  return getCartEntries().map((entry) => ({
    label: entry.label,
    price: entry.price,
    quantity: entry.quantity,
    addOns: Array.from(entry.addOns?.values() ?? []).map((addOn) => ({ ...addOn }))
  }));
}

function buildOrderItemsMarkup(items) {
  return items
    .map((item) => {
      const addOnsMarkup = item.addOns
        .map((addOn) => `<li>+ ${addOn.label} x ${addOn.quantity}</li>`)
        .join("");

      return `
        <li>
          <strong>${item.label} x ${item.quantity}</strong>
          ${addOnsMarkup ? `<ul>${addOnsMarkup}</ul>` : ""}
        </li>
      `;
    })
    .join("");
}

function buildOrderDetailsMarkup(order) {
  return `
    <dl>
      <div><dt>Mode</dt><dd>${order.orderModeLabel}</dd></div>
      <div><dt>Phone</dt><dd>${order.customerPhone}</dd></div>
      ${order.mode === "pickup" ? `<div><dt>Branch</dt><dd>182 CCA, 1 C Block Sector C, DHA Phase 6, Lahore</dd></div>` : ""}
      ${order.customerAddress ? `<div><dt>Address</dt><dd>${order.customerAddress}</dd></div>` : ""}
      ${order.customerLandmark ? `<div><dt>Landmark</dt><dd>${order.customerLandmark}</dd></div>` : ""}
      <div><dt>Total</dt><dd>PKR ${order.total.toLocaleString("en-PK")}</dd></div>
      ${order.notes ? `<div><dt>Notes</dt><dd>${order.notes}</dd></div>` : ""}
    </dl>
    <ul>${buildOrderItemsMarkup(order.items)}</ul>
  `;
}

function renderPendingOrder(order) {
  if (!orderConfirmation) {
    return;
  }

  orderConfirmation.classList.remove("is-confirmed", "is-canceled");
  orderConfirmation.classList.add("is-pending");
  orderConfirmation.innerHTML = `
    <span>Confirm Your Order</span>
    <h4>${order.orderNumber}</h4>
    <div class="order-countdown" aria-label="Order confirmation countdown">
      <strong id="orderCountdown">30</strong>
      <small>Seconds</small>
    </div>
    <p>Thanks, ${order.customerName}. Please confirm this order before the timer ends. If you do not confirm, it will be automatically canceled.</p>
    ${buildOrderDetailsMarkup(order)}
    <div class="order-confirm-actions">
      <button class="confirm-order-button" type="button" data-order-action="confirm">Confirm Order</button>
      <button class="cancel-order-button" type="button" data-order-action="cancel">Cancel Order</button>
    </div>
  `;
  orderConfirmation.hidden = false;
}

function startOrderCountdown() {
  let remainingSeconds = 30;
  const countdown = () => {
    const countdownNode = document.getElementById("orderCountdown");

    if (countdownNode) {
      countdownNode.textContent = String(remainingSeconds);
    }

    if (remainingSeconds <= 0) {
      cancelPendingOrder(true);
      return;
    }

    remainingSeconds -= 1;
  };

  window.clearInterval(orderCountdownTimer);
  countdown();
  orderCountdownTimer = window.setInterval(countdown, 1000);
}

function confirmPendingOrder() {
  if (!pendingOrder || !orderConfirmation) {
    return;
  }

  window.clearInterval(orderCountdownTimer);
  orderCountdownTimer = null;

  const order = pendingOrder;
  pendingOrder = null;
  const thankYouMessage =
    order.mode === "pickup"
      ? "Thank you for choosing Pitstop63. Your order has been confirmed and will be ready for pickup from our DHA Phase 6 branch."
      : "Thank you for choosing Pitstop63. Your order has been confirmed and our team will prepare it for delivery shortly.";

  orderConfirmation.classList.remove("is-pending", "is-canceled");
  orderConfirmation.classList.add("is-confirmed");
  orderConfirmation.innerHTML = `
    <span>Order Confirmed</span>
    <h4>${order.orderNumber}</h4>
    <p class="order-thank-you">${thankYouMessage}</p>
    ${buildOrderDetailsMarkup(order)}
  `;

  if (cartSummaryTitle) {
    cartSummaryTitle.textContent = "Order Confirmed";
  }

  orderForm?.reset();
  clearCartData();
  renderCartSummary();
  showAddedToast("Order confirmed", "success", "Confirmed");
  setSelectionStatus("Order confirmed. Cart cleared.", true);
}

function cancelPendingOrder(wasAutomatic = false) {
  if (!pendingOrder || !orderConfirmation) {
    return;
  }

  window.clearInterval(orderCountdownTimer);
  orderCountdownTimer = null;

  const order = pendingOrder;
  pendingOrder = null;

  orderConfirmation.classList.remove("is-pending", "is-confirmed");
  orderConfirmation.classList.add("is-canceled");
  orderConfirmation.innerHTML = `
    <span>Order Canceled</span>
    <h4>${order.orderNumber}</h4>
    <p>${wasAutomatic ? "The 30-second confirmation time ended, so this order was automatically canceled." : "This order has been canceled."} Your cart is still saved if you want to edit and try again.</p>
    ${buildOrderDetailsMarkup(order)}
  `;

  if (cartSummaryTitle) {
    cartSummaryTitle.textContent = "Order Canceled";
  }

  showAddedToast("Order canceled", "error", "Canceled");
  setSelectionStatus("Order canceled. Cart is still saved.", true);
}

function placeDemoOrder() {
  const items = createOrderSnapshot();
  const total = getCartTotal();

  if (items.length === 0 || !orderConfirmation) {
    return;
  }

  const customerName = orderCustomerName?.value.trim() || "Guest";
  const customerPhone = orderCustomerPhone?.value.trim() || "Not provided";
  const customerAddress = orderAddress?.value.trim();
  const customerLandmark = orderLandmark?.value.trim();
  const notes = orderNotes?.value.trim();
  const orderNumber = `PS63-${Date.now().toString().slice(-6)}`;
  const orderModeLabel = selectedOrderMode ? selectedOrderMode[0].toUpperCase() + selectedOrderMode.slice(1) : "Order";

  pendingOrder = {
    items,
    total,
    customerName,
    customerPhone,
    customerAddress,
    customerLandmark,
    notes,
    orderNumber,
    orderModeLabel,
    mode: selectedOrderMode
  };

  renderPendingOrder(pendingOrder);
  cartSummary?.classList.add("has-order-confirmation");

  if (cartSummaryTitle) {
    cartSummaryTitle.textContent = "Confirm Order";
  }

  renderCartSummary();
  openCartSummary();
  startOrderCountdown();
  setSelectionStatus("Confirm your order within 30 seconds.", true);
}

function selectOrderMode(mode) {
  const modeContent = orderModeContent[mode];

  if (!modeContent) {
    return;
  }

  selectedOrderMode = mode;

  orderModeCards.forEach((card) => {
    const isSelected = card.dataset.orderMode === mode;
    card.classList.toggle("is-selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });

  if (orderModeDetails) {
    orderModeDetails.innerHTML = modeContent.detail;
  }

  if (engineHint) {
    engineHint.textContent = modeContent.hint;
  }

  if (engineToggle) {
    engineToggle.disabled = false;
    engineToggle.setAttribute("aria-label", `Engine start button for ${modeContent.label}`);
  }

  updateOrderFieldRequirements();
}

function clearSearchHighlights() {
  menuItems.forEach((item) => {
    item.classList.remove("is-match");
  });

  menuCategories.forEach((category) => {
    category.classList.remove("is-match-context");
  });

  menuShell?.classList.remove("has-search-results", "has-no-search-results");
  lastScrolledMatch = null;
}

function resetMenuSearch() {
  if (menuSearch) {
    menuSearch.value = "";
  }

  if (menuSearchClear) {
    menuSearchClear.hidden = true;
  }

  clearSearchHighlights();
  setSearchStatus("Search any drink, dessert, or category.");
}

function updateMenuItemQuantity(item, quantity) {
  const safeQuantity = Math.max(0, quantity);
  const quantityValue = item.querySelector(".quantity-value");
  const decreaseButton = item.querySelector(".quantity-button-minus");

  if (safeQuantity > 0) {
    itemQuantities.set(item, safeQuantity);
  } else {
    itemQuantities.delete(item);
  }

  item.classList.toggle("has-quantity", safeQuantity > 0);
  item.setAttribute("data-quantity", String(safeQuantity));

  if (quantityValue) {
    quantityValue.textContent = String(safeQuantity);
  }

  if (decreaseButton) {
    decreaseButton.disabled = safeQuantity === 0;
  }

  const totalQuantity = getTotalSelectedQuantity();
  const itemLabel = totalQuantity === 1 ? "item" : "items";

  if (totalQuantity > 0) {
    setSelectionStatus(`${totalQuantity} ${itemLabel} added.`, true);
    return;
  }

  setSelectionStatus("Tap + next to any item to add it.");
}

function syncMenuItemQuantity(item) {
  updateMenuItemQuantity(item, getItemQuantityFromCart(item));
  renderCartSummary();
}

function addCartEntry(item, label, price) {
  clearOrderConfirmation();

  const key = getCartEntryKey(label, price);
  const currentEntry = cartEntries.get(key);

  if (currentEntry) {
    currentEntry.quantity += 1;
  } else {
    cartEntries.set(key, {
      item,
      label,
      price,
      quantity: 1,
      addOns: new Map()
    });
  }

  cartEntryOrder.push(key);
  syncMenuItemQuantity(item);
}

function addAddOnToCartEntry(targetKey, addOnLabel, addOnPrice) {
  clearOrderConfirmation();

  const targetEntry = cartEntries.get(targetKey);

  if (!targetEntry) {
    return;
  }

  if (!targetEntry.addOns) {
    targetEntry.addOns = new Map();
  }

  const addOnKey = getCartEntryKey(addOnLabel, addOnPrice);
  const existingAddOn = targetEntry.addOns.get(addOnKey);

  if (existingAddOn) {
    existingAddOn.quantity += 1;
  } else {
    targetEntry.addOns.set(addOnKey, {
      label: addOnLabel,
      price: addOnPrice,
      quantity: 1
    });
  }

  renderCartSummary();
  showAddedToast(`${addOnLabel} added to ${targetEntry.label}`);
}

function removeCartOrderKey(key, removeAll = false) {
  if (removeAll) {
    for (let index = cartEntryOrder.length - 1; index >= 0; index -= 1) {
      if (cartEntryOrder[index] === key) {
        cartEntryOrder.splice(index, 1);
      }
    }

    return;
  }

  const orderIndex = cartEntryOrder.lastIndexOf(key);

  if (orderIndex !== -1) {
    cartEntryOrder.splice(orderIndex, 1);
  }
}

function increaseCartEntry(key) {
  const entry = cartEntries.get(key);

  if (!entry) {
    return;
  }

  clearOrderConfirmation();
  entry.quantity += 1;
  cartEntryOrder.push(key);
  syncMenuItemQuantity(entry.item);
  showAddedToast(entry.label);
}

function decreaseCartEntry(key) {
  const entry = cartEntries.get(key);

  if (!entry) {
    return;
  }

  clearOrderConfirmation();
  removeCartOrderKey(key);
  entry.quantity -= 1;

  if (entry.quantity <= 0) {
    cartEntries.delete(key);
    removeCartOrderKey(key, true);
    showAddedToast(entry.label, "error", "Removed from cart");
  }

  syncMenuItemQuantity(entry.item);
}

function removeCartEntry(key) {
  const entry = cartEntries.get(key);

  if (!entry) {
    return;
  }

  clearOrderConfirmation();
  cartEntries.delete(key);
  removeCartOrderKey(key, true);
  syncMenuItemQuantity(entry.item);
  showAddedToast(entry.label, "error", "Removed from cart");
}

function removeCartEntryForItem(item) {
  const orderIndex = cartEntryOrder.findLastIndex((key) => cartEntries.get(key)?.item === item);

  if (orderIndex === -1) {
    return;
  }

  const key = cartEntryOrder[orderIndex];
  const entry = cartEntries.get(key);

  cartEntryOrder.splice(orderIndex, 1);

  if (!entry) {
    return;
  }

  entry.quantity -= 1;

  if (entry.quantity <= 0) {
    cartEntries.delete(key);
  }

  syncMenuItemQuantity(item);
}

function showAddedToast(itemName, tone = "success", statusText = "Added to cart") {
  const toastTitle = addedToast.querySelector("strong");
  const toastStatus = addedToast.querySelector("small");

  if (toastTitle) {
    toastTitle.textContent = itemName;
  }

  if (toastStatus) {
    toastStatus.textContent = statusText;
  }

  window.clearTimeout(addedToastTimer);
  addedToast.classList.remove("is-visible");
  addedToast.classList.toggle("is-error", tone === "error");

  window.requestAnimationFrame(() => {
    addedToast.classList.add("is-visible");
  });

  addedToastTimer = window.setTimeout(() => {
    addedToast.classList.remove("is-visible");
  }, 1900);
}

function hideVariantPicker() {
  activeVariantItem = null;
  variantPicker.classList.remove("is-visible");
  variantPicker.setAttribute("aria-hidden", "true");
}

function hideAddOnPicker() {
  activeAddOn = null;
  addOnPicker.classList.remove("is-visible");
  addOnPicker.setAttribute("aria-hidden", "true");
}

function showVariantPicker(item, itemName) {
  const pickerTitle = variantPicker.querySelector("#variantPickerTitle");
  const pickerOptions = variantPicker.querySelector(".variant-picker-options");
  const prices = Array.from(item.querySelectorAll(":scope > span:not(:first-child)")).map((priceSpan) =>
    priceSpan.textContent.trim()
  );
  const variants = [
    { label: "Hot", size: "8oz", price: prices[0] },
    { label: "Iced", size: "14oz", price: prices[1] }
  ];

  activeVariantItem = item;

  if (pickerTitle) {
    pickerTitle.textContent = itemName;
  }

  if (pickerOptions) {
    pickerOptions.replaceChildren();

    variants.forEach((variant) => {
      const button = document.createElement("button");
      const isAvailable = variant.price && variant.price !== "-";

      button.className = "variant-choice";
      button.type = "button";
      button.disabled = !isAvailable;
      button.innerHTML = `
        <span>
          <strong>${variant.label}</strong>
          <small>${variant.size}</small>
        </span>
        <b>${isAvailable ? variant.price : "Unavailable"}</b>
      `;

      if (isAvailable) {
        button.addEventListener("click", () => {
          addCartEntry(item, `${variant.label} ${itemName}`, parseMenuPrice(variant.price));
          showAddedToast(`${variant.label} ${itemName}`);
          hideVariantPicker();
        });
      }

      pickerOptions.append(button);
    });
  }

  variantPicker.classList.add("is-visible");
  variantPicker.setAttribute("aria-hidden", "false");
}

function showAddOnPicker(itemName, itemPrice) {
  const addOnTitle = addOnPicker.querySelector("#addOnPickerTitle");
  const addOnOptions = addOnPicker.querySelector(".add-on-picker-options");
  const entries = Array.from(cartEntries.entries());

  if (entries.length === 0) {
    setSelectionStatus("Add a menu item before choosing an add-on.", true);
    return;
  }

  activeAddOn = {
    label: itemName,
    price: itemPrice
  };

  if (addOnTitle) {
    addOnTitle.textContent = itemName;
  }

  if (addOnOptions) {
    addOnOptions.replaceChildren();

    entries.forEach(([key, entry]) => {
      const button = document.createElement("button");
      button.className = "variant-choice add-on-target-choice";
      button.type = "button";
      button.innerHTML = `
        <span>
          <strong>${entry.label}</strong>
          <small>${entry.quantity} in cart</small>
        </span>
        <b>Add here</b>
      `;
      button.addEventListener("click", () => {
        addAddOnToCartEntry(key, itemName, itemPrice);
        hideAddOnPicker();
      });
      addOnOptions.append(button);
    });
  }

  addOnPicker.classList.add("is-visible");
  addOnPicker.setAttribute("aria-hidden", "false");
}

function resetMenuSelection() {
  hideVariantPicker();
  hideAddOnPicker();
  clearOrderConfirmation();

  clearCartData();
  renderCartSummary();
  setSelectionStatus("Tap + next to any item to add it.");
}

function updateMenuSearch() {
  if (!menuSearch) {
    return;
  }

  const rawValue = menuSearch.value;
  const query = normalizeSearchValue(rawValue);

  if (menuSearchClear) {
    menuSearchClear.hidden = query.length === 0;
  }

  if (!query) {
    clearSearchHighlights();
    setSearchStatus("Search any drink, dessert, or category.");
    return;
  }

  let matchCount = 0;
  let firstMatch = null;

  menuItems.forEach((item) => {
    const searchText = item.dataset.searchText ?? "";
    const isMatch = searchText.includes(query);

    item.classList.toggle("is-match", isMatch);

    if (isMatch) {
      matchCount += 1;

      if (!firstMatch) {
        firstMatch = item;
      }
    }
  });

  menuCategories.forEach((category) => {
    const hasMatch = Boolean(category.querySelector(".menu-list li.is-match"));
    category.classList.toggle("is-match-context", hasMatch);
  });

  const hasResults = matchCount > 0;
  menuShell?.classList.toggle("has-search-results", hasResults);
  menuShell?.classList.toggle("has-no-search-results", !hasResults);

  if (hasResults) {
    const matchLabel = matchCount === 1 ? "match" : "matches";
    setSearchStatus(`${matchCount} ${matchLabel} highlighted.`);

    if (firstMatch && firstMatch !== lastScrolledMatch) {
      lastScrolledMatch = firstMatch;
      firstMatch.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    return;
  }

  setSearchStatus(`No menu item found for "${rawValue.trim()}".`);
  lastScrolledMatch = null;
}

menuItems.forEach((item) => {
  const itemName = item.querySelector("span:first-child")?.textContent ?? "";
  const categoryName = item.closest(".menu-category")?.querySelector("h4")?.textContent ?? "";
  const isDualPriceItem = Boolean(item.closest(".menu-list-dual"));
  const isAddOnItem = categoryName === "Add Ons";
  const itemPrice = parseMenuPrice(item.querySelector(":scope > span:not(:first-child)")?.textContent ?? "");
  item.dataset.searchText = normalizeSearchValue(`${itemName} ${categoryName}`);
  item.setAttribute("data-quantity", "0");

  const quantityControl = document.createElement("div");
  quantityControl.className = "menu-quantity-control";
  quantityControl.innerHTML = `
    <button class="quantity-button quantity-button-minus" type="button" aria-label="Remove ${itemName}" disabled>-</button>
    <span class="quantity-value" aria-label="${itemName} quantity">0</span>
    <button class="quantity-button quantity-button-plus" type="button" aria-label="Add ${itemName}">+</button>
  `;

  quantityControl.querySelector(".quantity-button-minus")?.addEventListener("click", () => {
    removeCartEntryForItem(item);
  });

  quantityControl.querySelector(".quantity-button-plus")?.addEventListener("click", () => {
    if (isAddOnItem) {
      showAddOnPicker(itemName, itemPrice);
      return;
    }

    if (isDualPriceItem) {
      showVariantPicker(item, itemName);
      return;
    }

    addCartEntry(item, itemName, itemPrice);
    showAddedToast(itemName);
  });

  item.append(quantityControl);
});

variantPicker.querySelector(".variant-picker-close")?.addEventListener("click", hideVariantPicker);
addOnPicker.querySelector(".variant-picker-close")?.addEventListener("click", hideAddOnPicker);

variantPicker.addEventListener("click", (event) => {
  if (event.target === variantPicker) {
    hideVariantPicker();
  }
});

addOnPicker.addEventListener("click", (event) => {
  if (event.target === addOnPicker) {
    hideAddOnPicker();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeVariantItem) {
    hideVariantPicker();
  }

  if (event.key === "Escape" && activeAddOn) {
    hideAddOnPicker();
  }

  if (event.key === "Escape" && cartSummary?.classList.contains("is-open")) {
    closeCartSummary();
  }
});

cartToggle?.addEventListener("click", toggleCartSummary);
floatingCartButton?.addEventListener("click", openCartSummary);
cartClose?.addEventListener("click", closeCartSummary);
orderForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  placeDemoOrder();
});

cartItemsList?.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-cart-action]");

  if (!actionButton) {
    return;
  }

  const key = actionButton.dataset.entryKey;

  if (!key) {
    return;
  }

  if (actionButton.dataset.cartAction === "increase") {
    increaseCartEntry(key);
    return;
  }

  if (actionButton.dataset.cartAction === "decrease") {
    decreaseCartEntry(key);
    return;
  }

  if (actionButton.dataset.cartAction === "remove") {
    removeCartEntry(key);
  }
});

orderConfirmation?.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-order-action]");

  if (!actionButton) {
    return;
  }

  if (actionButton.dataset.orderAction === "confirm") {
    confirmPendingOrder();
    return;
  }

  if (actionButton.dataset.orderAction === "cancel") {
    cancelPendingOrder(false);
  }
});

if (menuSearch) {
  menuSearch.addEventListener("input", updateMenuSearch);
}

if (menuSearchClear) {
  menuSearchClear.addEventListener("click", () => {
    resetMenuSearch();
    menuSearch?.focus();
  });
}

orderModeCards.forEach((card) => {
  card.setAttribute("aria-pressed", "false");
  card.addEventListener("click", () => {
    selectOrderMode(card.dataset.orderMode ?? "");
  });
});

function setActiveReview(index) {
  if (!reviewTrack || reviewSlides.length === 0) {
    return;
  }

  reviewIndex = (index + reviewSlides.length) % reviewSlides.length;
  const targetSlide = reviewSlides[reviewIndex];
  const targetLeft = targetSlide.offsetLeft - reviewTrack.offsetLeft;

  reviewTrack.scrollTo({
    left: targetLeft,
    behavior: "smooth"
  });

  reviewDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === reviewIndex);
  });
}

function startReviewCarousel() {
  if (reviewSlides.length <= 1 || reviewTimer) {
    return;
  }

  reviewTimer = window.setInterval(() => {
    setActiveReview(reviewIndex + 1);
  }, reviewIntervalMs);
}

function stopReviewCarousel() {
  if (!reviewTimer) {
    return;
  }

  window.clearInterval(reviewTimer);
  reviewTimer = null;
}

if (reviewTrack && reviewSlides.length > 0) {
  reviewTrack.addEventListener("scroll", () => {
    const nextIndex = reviewSlides.reduce((closestIndex, slide, slideIndex) => {
      const closestSlide = reviewSlides[closestIndex];
      const currentDistance = Math.abs(slide.offsetLeft - reviewTrack.offsetLeft - reviewTrack.scrollLeft);
      const closestDistance = Math.abs(closestSlide.offsetLeft - reviewTrack.offsetLeft - reviewTrack.scrollLeft);

      return currentDistance < closestDistance ? slideIndex : closestIndex;
    }, 0);

    if (nextIndex !== reviewIndex) {
      reviewIndex = nextIndex;
      reviewDots.forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === reviewIndex);
      });
    }
  });

  setActiveReview(0);
}

if (engineToggle && menuSection) {
  engineToggle.addEventListener("click", () => {
    if (!selectedOrderMode) {
      if (engineHint) {
        engineHint.textContent = "Select pickup or delivery first, then ignite the menu.";
      }

      return;
    }

    const isVisible = menuSection.classList.toggle("is-visible");

    engineToggle.classList.toggle("is-started", isVisible);
    engineToggle.setAttribute("aria-expanded", String(isVisible));
    menuSection.setAttribute("aria-hidden", String(!isVisible));

    if (isVisible) {
      window.setTimeout(() => {
        menuSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        setActiveReview(0);
        startReviewCarousel();
      }, 180);

      return;
    }

    stopReviewCarousel();
    setActiveReview(0);
    resetMenuSearch();
    resetMenuSelection();
  });
}
