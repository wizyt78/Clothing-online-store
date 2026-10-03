const cartKey = 'stylehub-cart';
let products = [];
let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');

const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('en-NG', {
  style: 'currency', currency: 'NGN', maximumFractionDigits: 0
}).format(n);

async function start() {
  try {
    const response = await fetch('data.json', { cache: 'no-store' });
    const data = await response.json();
    products = data.products || [];
    draw(products, 'products');
    draw(products.slice(5), 'new');
    update();
  } catch (error) {
    console.error('STYLEHUB product load error:', error);
  }
}

function draw(list, id) {
  const target = $(id);
  if (!target) return;

  target.innerHTML = list.map(p => `
    <article class="card">
      <div class="photo">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">
        <span class="badge">${p.badge || 'New'}</span>
        <button class="heart" type="button" aria-label="Save ${escapeHtml(p.name)}">♡</button>
      </div>
      <h3>${escapeHtml(p.name)}</h3>
      <div class="meta">${escapeHtml(p.category)} · ${escapeHtml(p.sizes[0])}</div>
      <div class="price">${money(p.price)} <span class="old">${money(p.original)}</span></div>
      <div class="sizes" aria-label="Choose size">
        ${p.sizes.slice(0, 5).map(s => `<button type="button" class="size" data-id="${p.id}" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
      </div>
      <button type="button" class="add" data-id="${p.id}">Add to Cart</button>
    </article>
  `).join('');

  target.querySelectorAll('.add').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = products.find(item => item.id === btn.dataset.id);
      add(p.id, p.sizes[0]);
    });
  });

  target.querySelectorAll('.size').forEach(btn => {
    btn.addEventListener('click', () => {
      target.querySelectorAll(`.size[data-id="${CSS.escape(btn.dataset.id)}"]`).forEach(x => x.classList.remove('selected'));
      btn.classList.add('selected');
      add(btn.dataset.id, btn.dataset.size);
    });
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
}

function add(id, size) {
  const existing = cart.find(item => item.id === id && item.size === size);
  if (existing) existing.qty += 1;
  else cart.push({ id, size, qty: 1 });
  save();
  openCart();
}

function save() {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  update();
}

function update() {
  const count = $('count');
  const cartEl = $('cart');
  const subtotal = $('subtotal');
  if (!count || !cartEl || !subtotal) return;

  count.textContent = cart.reduce((sum, item) => sum + item.qty, 0);

  let total = 0;
  if (!cart.length) {
    cartEl.innerHTML = '<div class="empty-cart"><strong>Your cart is empty.</strong><span>Add something you love and it will appear here.</span></div>';
  } else {
    cartEl.innerHTML = cart.map((item, index) => {
      const p = products.find(product => product.id === item.id);
      if (!p) return '';
      total += p.price * item.qty;
      return `
        <div class="row">
          <img src="${p.image}" alt="${escapeHtml(p.name)}">
          <div class="row-info">
            <h4>${escapeHtml(p.name)}</h4>
            <small>${escapeHtml(item.size)} · ${money(p.price)}</small>
            <div class="qty">
              <button type="button" data-action="minus" data-index="${index}" aria-label="Decrease quantity">−</button>
              <span>${item.qty}</span>
              <button type="button" data-action="plus" data-index="${index}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div class="row-right">
            <b>${money(p.price * item.qty)}</b>
            <button type="button" class="remove-item" data-action="remove" data-index="${index}">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    cartEl.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.index);
        const action = button.dataset.action;
        if (action === 'minus') changeQuantity(index, -1);
        if (action === 'plus') changeQuantity(index, 1);
        if (action === 'remove') removeItem(index);
      });
    });
  }
  subtotal.textContent = money(total);
}

function changeQuantity(index, delta) {
  if (!cart[index]) return;
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  save();
}

function removeItem(index) {
  if (!cart[index]) return;
  cart.splice(index, 1);
  save();
}

function openCart() {
  $('drawer')?.classList.add('open');
  $('overlay')?.classList.add('show');
  document.body.classList.add('cart-open');
}

function closeCart() {
  $('drawer')?.classList.remove('open');
  $('overlay')?.classList.remove('show');
  document.body.classList.remove('cart-open');
}

document.addEventListener('DOMContentLoaded', () => {
  const cartBtn = $('cartBtn');
  const closeBtn = $('close');
  const overlay = $('overlay');
  const checkoutBtn = $('checkout');
  const search = $('search');
  const newsletter = $('newsletter');

  cartBtn?.addEventListener('click', openCart);
  closeBtn?.addEventListener('click', closeCart);
  overlay?.addEventListener('click', closeCart);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeCart();
  });

  checkoutBtn?.addEventListener('click', () => {
    if (!cart.length) {
      alert('Your cart is empty.');
      return;
    }
    window.location.href = 'checkout.html';
  });

  search?.addEventListener('input', event => {
    const q = event.target.value.toLowerCase().trim();
    draw(products.filter(p => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q)), 'products');
  });

  document.querySelectorAll('.cats a').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const category = link.dataset.cat;
      draw(products.filter(p => p.category === category || (category === 'Accessories' && p.category === 'Accessories')), 'products');
      $('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  newsletter?.addEventListener('submit', event => {
    event.preventDefault();
    alert('Thanks — you are subscribed.');
    event.target.reset();
  });

  start();
});
