/* =========================================================
   1. UTILITIES: ESCAPE HTML, TOAST, CLIPBOARD, CURRENCY
========================================================= */
function escapeHTML(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const CURRENCIES = {
    DZD: { symbol: 'د.ج', rate: 240 },
    SAR: { symbol: 'ر.س', rate: 3.75 },
    USD: { symbol: '$', rate: 1 }
};

let currentCurrency = 'DZD';
let activeCategory = 'all';
let activeHubTab = 'pass';
let appliedPromoCode = null;
let notifOpen = false;
let activeServiceId = null;
let activePackageId = null;

function formatPrice(usdAmount) {
    const c = CURRENCIES[currentCurrency] || CURRENCIES.DZD;
    const val = Number(usdAmount || 0) * c.rate;
    if (currentCurrency === 'USD') return `$${val.toFixed(2)}`;
    return `${Math.round(val).toLocaleString('en-US')} ${c.symbol}`;
}

let toastTimer = null;
function showToast(message, type = 'success') {
    const box = document.getElementById('toast-box');
    const text = document.getElementById('toast-text');
    const icon = document.getElementById('toast-icon');
    if (!box || !text || !icon) return;
    text.textContent = message;
    icon.className = type === 'error'
        ? 'fa-solid fa-circle-exclamation text-rose-400'
        : 'fa-solid fa-circle-check text-electricCyan';
    box.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.add('hidden'), 3400);
}

function copyToClipboard(text, label = 'النص') {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showToast(`تم نسخ ${label} بنجاح 📋`);
    } catch (e) {
        showToast(`القيمة: ${text}`, 'error');
    }
    document.body.removeChild(ta);
}

/* =========================================================
   2. CUSTOMER STOREFRONT STATE (NO ADMIN OR OTHER USERS DATA)
========================================================= */
const CART_STORAGE_KEY = 'mada_customer_cart_v1';

function getInitialStoreState() {
    return {
        currentUser: null, // يُملأ فقط من السيرفر عند تسجيل دخول العميل
        services: [
            {
                id: 'pubg',
                name: 'شحن ببجي موبايل',
                subtitle: 'PUBG Mobile UC',
                category: 'games',
                badge: 'الأسرع ⚡',
                icon: 'fa-solid fa-crosshairs',
                accent: 'text-amber-300 bg-amber-500/15 border-amber-400/40',
                inputType: 'pubg',
                inputLabel: 'معرّف اللاعب (Player ID):',
                inputPlaceholder: 'مثال: 5194827310',
                verifyPreview: null,
                inStock: true,
                packages: [
                    { id: 'uc-60', label: '60 شدة UC', priceUSD: 0.99 },
                    { id: 'uc-325', label: '325 شدة UC', priceUSD: 4.85, popular: true },
                    { id: 'uc-660', label: '660 شدة UC', priceUSD: 9.50 },
                    { id: 'uc-1800', label: '1800 شدة UC', priceUSD: 23.99 }
                ]
            },
            {
                id: 'freefire',
                name: 'شحن فري فاير',
                subtitle: 'Free Fire Diamonds',
                category: 'games',
                badge: 'شحن مباشر',
                icon: 'fa-solid fa-gem',
                accent: 'text-electricCyan bg-sky-500/15 border-electricCyan/40',
                inputType: 'freefire',
                inputLabel: 'معرّف اللاعب في فري فاير (ID):',
                inputPlaceholder: 'مثال: 284910384',
                verifyPreview: null,
                inStock: true,
                packages: [
                    { id: 'ff-100', label: '100 جوهرة 💎', priceUSD: 1.10 },
                    { id: 'ff-310', label: '310 جوهرة 💎', priceUSD: 3.10, popular: true },
                    { id: 'ff-520', label: '520 جوهرة 💎', priceUSD: 5.10 },
                    { id: 'ff-1060', label: '1060 جوهرة 💎', priceUSD: 9.99 }
                ]
            },
            {
                id: 'snapchat',
                name: 'توثيق سناب بلس',
                subtitle: 'Snapchat+',
                category: 'verify',
                badge: 'نجمة التوثيق ★',
                icon: 'fa-brands fa-snapchat',
                accent: 'text-yellow-300 bg-yellow-400/15 border-yellow-400/40',
                inputType: 'snap',
                inputLabel: 'يوزر سناب شات (@Username):',
                inputPlaceholder: '@mada_vip',
                verifyPreview: { symbol: '★', style: 'bg-black text-white border-yellow-300', desc: 'معاينة شارة النجمة السوداء الرسمية' },
                inStock: true,
                packages: [
                    { id: 'snap-1m', label: 'اشتراك شهر واحد', priceUSD: 6.50, popular: true },
                    { id: 'snap-3m', label: 'اشتراك 3 أشهر', priceUSD: 17.50 },
                    { id: 'snap-1y', label: 'اشتراك سنة كاملة', priceUSD: 58.00 }
                ]
            },
            {
                id: 'instagram',
                name: 'توثيق إنستقرام',
                subtitle: 'Meta Verified',
                category: 'verify',
                badge: 'الشارة الزرقاء',
                icon: 'fa-brands fa-instagram',
                accent: 'text-pink-400 bg-pink-500/15 border-pink-400/40',
                inputType: 'insta',
                inputLabel: 'يوزر إنستقرام (@Username):',
                inputPlaceholder: '@mada.official',
                verifyPreview: { symbol: '✓', style: 'bg-sky-500 text-white border-sky-200', desc: 'معاينة الشارة الزرقاء الرسمية (Meta)' },
                inStock: true,
                packages: [
                    { id: 'ig-1m', label: 'توثيق شهر واحد', priceUSD: 14.00, popular: true },
                    { id: 'ig-3m', label: 'توثيق 3 أشهر', priceUSD: 39.00 },
                    { id: 'ig-1y', label: 'توثيق سنة كاملة', priceUSD: 135.00 }
                ]
            },
            {
                id: 'x-whatsapp',
                name: 'توثيق إكس وواتساب',
                subtitle: 'X & WhatsApp',
                category: 'verify',
                badge: 'توثيق رسمي',
                icon: 'fa-brands fa-x-twitter',
                accent: 'text-sky-300 bg-sapphire/20 border-sky-400/40',
                inputType: 'xwa',
                inputLabel: 'يوزر X أو رقم واتساب الأعمال:',
                inputPlaceholder: '@username أو +2135...',
                verifyPreview: { symbol: '✓', style: 'bg-blue-500 text-white border-sky-200', desc: 'معاينة الشارة الزرقاء الرسمية' },
                inStock: true,
                packages: [
                    { id: 'x-1m', label: 'توثيق إكس (شهر)', priceUSD: 9.50, popular: true },
                    { id: 'wa-1m', label: 'توثيق واتساب (شهر)', priceUSD: 18.00 },
                    { id: 'xwa-1y', label: 'باقة سنوية متكاملة', priceUSD: 98.00 }
                ]
            },
            {
                id: 'tiktok',
                name: 'شحن تيك توك',
                subtitle: 'TikTok Coins',
                category: 'apps',
                badge: 'عملات فورية',
                icon: 'fa-brands fa-tiktok',
                accent: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40',
                inputType: 'tiktok',
                inputLabel: 'يوزر حساب تيك توك (@Username):',
                inputPlaceholder: '@mada_live',
                verifyPreview: null,
                inStock: true,
                packages: [
                    { id: 'tt-350', label: '350 عملة تيك توك', priceUSD: 4.20 },
                    { id: 'tt-700', label: '700 عملة تيك توك', priceUSD: 8.10, popular: true },
                    { id: 'tt-1400', label: '1400 عملة تيك توك', priceUSD: 15.90 },
                    { id: 'tt-3500', label: '3500 عملة تيك توك', priceUSD: 38.50 }
                ]
            },
            {
                id: 'yalla-likee',
                name: 'يلا لودو ولايكي',
                subtitle: 'Yalla Ludo & Likee',
                category: 'apps',
                badge: 'شحن آلي',
                icon: 'fa-solid fa-dice',
                accent: 'text-indigo-300 bg-indigo-500/15 border-indigo-400/40',
                inputType: 'apps',
                inputLabel: 'معرّف الحساب (ID):',
                inputPlaceholder: 'مثال: 9948271',
                verifyPreview: null,
                inStock: true,
                packages: [
                    { id: 'yl-1', label: 'ألماس يلا لودو (باقة متوسطة)', priceUSD: 5.50, popular: true },
                    { id: 'lk-1', label: 'فاصوليا لايكي (باقة متوسطة)', priceUSD: 6.20 },
                    { id: 'yl-vip', label: 'باقة الملكي الشهرية', priceUSD: 13.50 }
                ]
            },
            {
                id: 'ai-suite',
                name: 'اشتراكات الذكاء الاصطناعي',
                subtitle: 'ChatGPT / Claude / Midjourney',
                category: 'ai',
                badge: 'الأكثر مبيعاً ✨',
                icon: 'fa-solid fa-brain',
                accent: 'text-violet-300 bg-royalViolet/20 border-violet-400/45',
                inputType: 'email',
                inputLabel: 'البريد الإلكتروني للتفعيل:',
                inputPlaceholder: 'name@example.com',
                verifyPreview: null,
                inStock: true,
                packages: [
                    { id: 'ai-gpt', label: 'ChatGPT Plus (شهر)', priceUSD: 16.00, popular: true },
                    { id: 'ai-claude', label: 'Claude Pro (شهر)', priceUSD: 17.00 },
                    { id: 'ai-mj', label: 'Midjourney (شهر)', priceUSD: 15.50 },
                    { id: 'ai-1y', label: 'باقة الذكاء السنوية', priceUSD: 145.00 }
                ]
            }
        ],
        orders: [],
        cart: []
    };
}

let state = loadState();

function loadState() {
    const base = getInitialStoreState();
    try {
        const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
        if (Array.isArray(savedCart)) base.cart = savedCart;
    } catch (e) {}
    return base;
}

function saveCartState() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
    } catch (e) {}
}

function getActiveVipUser() {
    return state.currentUser && state.currentUser.isVip ? state.currentUser : null;
}

function isVipMode() {
    return Boolean(getActiveVipUser());
}

function getEffectivePriceUSD(baseUSD) {
    return isVipMode() ? Number((baseUSD * 0.90).toFixed(2)) : Number(baseUSD);
}

/* =========================================================
   3. NAVIGATION & SESSION HELPERS
========================================================= */
function logoutSession() {
    state.currentUser = null;
    state.orders = [];
    appliedPromoCode = null;
    notifOpen = false;
    renderAll();
    showToast('تم تسجيل الخروج بنجاح');
}

function scrollToServices() {
    document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleHeroVipButton() {
    if (isVipMode()) openCustomerHub('pass');
    else openAuthModal('register');
}

function mobileNavAction(tab) {
    setMobileNavActive(tab);
    if (tab === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'categories') {
        document.getElementById('category-pills-bar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (tab === 'orders') {
        if (isVipMode()) openCustomerHub('orders');
        else openAuthModal('login');
    } else if (tab === 'account') {
        if (isVipMode()) openCustomerHub('pass');
        else openAuthModal('login');
    }
}

function setMobileNavActive(activeId) {
    ['home', 'categories', 'orders', 'cart', 'account'].forEach(id => {
        const btn = document.getElementById(`mnav-${id}`);
        if (!btn) return;
        btn.className = id === activeId
            ? 'mnav-btn relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-electricCyan bg-sapphire/25 shadow-[0_0_12px_rgba(37,99,235,0.35)] transition'
            : 'mnav-btn relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-slate-300 transition';
    });
}

/* =========================================================
   4. MASTER RENDER FUNCTIONS
========================================================= */
function renderAll() {
    renderHeaderAccountArea();
    renderHeroSecondaryBtn();
    renderCategoryPills();
    renderVipQuickReorder();
    renderServicesGrid();
    updateCartBadges();
    renderMobileAccountTab();
    const curSel = document.getElementById('header-currency-select');
    if (curSel) curSel.value = currentCurrency;
}

function renderHeaderAccountArea() {
    const area = document.getElementById('header-account-area');
    if (!area) return;

    const vipUser = getActiveVipUser();
    if (vipUser) {
        const unreadCount = (vipUser.notifications || []).filter(n => n.unread).length;
        area.innerHTML = `
            <div class="relative">
                <button onclick="toggleNotifDropdown(event)" aria-label="الإشعارات" class="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-obsidian/85 border border-sky-400/30 hover:border-electricCyan text-sky-200 flex items-center justify-center transition">
                    <i class="fa-solid fa-bell text-sm"></i>
                    ${unreadCount > 0 ? `<span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-obsidian"></span>` : ''}
                </button>
                <div id="notif-dropdown" class="${notifOpen ? '' : 'hidden'} absolute left-0 top-full mt-2 w-72 sm:w-80 glass-panel rounded-2xl p-3 border-sky-400/45 shadow-2xl z-50 space-y-2">
                    <div class="flex items-center justify-between pb-2 border-b border-white/10">
                        <span class="text-xs font-bold text-white">إشعارات مدى VIP</span>
                        <button onclick="markAllNotifsRead()" class="text-[10px] text-electricCyan hover:text-white">تحديد كمقروء</button>
                    </div>
                    <div class="space-y-2 max-h-56 overflow-y-auto">
                        ${(vipUser.notifications || []).length > 0 ? vipUser.notifications.map(n => `
                            <div class="p-2.5 rounded-xl bg-obsidian/85 border ${n.unread ? 'border-electricCyan/40' : 'border-white/5'} text-[11px] space-y-1">
                                <p class="text-slate-200 leading-relaxed">${escapeHTML(n.text)}</p>
                                <span class="block text-[10px] text-slate-400">${escapeHTML(n.time)}</span>
                            </div>
                        `).join('') : '<p class="text-xs text-slate-400 text-center py-3">لا توجد إشعارات جديدة</p>'}
                    </div>
                </div>
            </div>

            <button onclick="openCustomerHub('pass')" class="px-2.5 sm:px-3 py-2 rounded-xl bg-gradient-to-r from-sapphire/30 to-royalViolet/30 border border-electricCyan/50 shadow-[0_0_16px_rgba(56,189,248,0.22)] flex items-center gap-1.5 hover:border-white/70 transition">
                <i class="fa-solid fa-wallet text-electricCyan text-xs"></i>
                <span class="hidden sm:inline text-[11px] text-sky-200 font-bold">محفظة مدى:</span>
                <span class="text-[11px] sm:text-xs font-black text-white font-mono">${formatPrice(vipUser.walletUSD || 0)}</span>
            </button>
        `;
    } else {
        area.innerHTML = `
            <button onclick="openAuthModal('login')" class="btn-sapphire px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5">
                <i class="fa-solid fa-user"></i>
                <span>دخول / حسابي</span>
            </button>
        `;
    }
}

function toggleNotifDropdown(e) {
    e.stopPropagation();
    notifOpen = !notifOpen;
    const dd = document.getElementById('notif-dropdown');
    if (dd) dd.classList.toggle('hidden', !notifOpen);
}

function markAllNotifsRead() {
    const u = getActiveVipUser();
    if (!u) return;
    (u.notifications || []).forEach(n => n.unread = false);
    notifOpen = false;
    renderHeaderAccountArea();
    showToast('تم تحديد جميع الإشعارات كمقروءة');
}

function renderHeroSecondaryBtn() {
    const btn = document.getElementById('hero-secondary-cta');
    if (!btn) return;
    btn.innerHTML = isVipMode()
        ? `<i class="fa-solid fa-crown text-amber-300"></i><span>بطاقة VIP والخزنة الرقمية</span>`
        : `<i class="fa-solid fa-crown text-amber-300"></i><span>انضم لعملاء VIP (-10%)</span>`;
}

function renderMobileAccountTab() {
    const icon = document.getElementById('mnav-account-icon');
    const label = document.getElementById('mnav-account-label');
    if (!icon || !label) return;
    if (isVipMode()) {
        icon.className = 'fa-solid fa-crown text-amber-300 text-sm';
        label.textContent = 'حسابي VIP';
    } else {
        icon.className = 'fa-solid fa-user text-sm';
        label.textContent = 'حسابي';
    }
}

function changeCurrency(val) {
    if (!CURRENCIES[val]) return;
    currentCurrency = val;
    renderAll();
    if (!document.getElementById('cart-drawer').classList.contains('hidden')) renderCartDrawer();
    if (!document.getElementById('service-modal').classList.contains('hidden') && activeServiceId) renderServiceModal();
    if (!document.getElementById('customer-hub-modal').classList.contains('hidden')) renderCustomerHubBody();
}

/* =========================================================
   5. LIVE SEARCH & CATEGORIES & SERVICES GRID
========================================================= */
function handleLiveSearch(query, target) {
    const dd = document.getElementById(`${target}-search-dropdown`);
    if (!dd) return;
    const q = (query || '').trim().toLowerCase();
    if (!q) {
        dd.classList.add('hidden');
        return;
    }
    const matches = state.services.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.packages.some(p => p.label.toLowerCase().includes(q))
    );
    if (matches.length === 0) {
        dd.innerHTML = `<div class="p-3 text-center text-xs text-slate-400">لا توجد نتائج مطابقة لـ "${escapeHTML(q)}"</div>`;
    } else {
        dd.innerHTML = matches.map(s => {
            const minUSD = Math.min(...s.packages.map(p => p.priceUSD));
            const finalUSD = getEffectivePriceUSD(minUSD);
            return `
                <button onclick="openServiceModal('${s.id}'); closeSearchDropdowns();" class="w-full p-2.5 rounded-xl hover:bg-sapphire/25 flex items-center justify-between gap-2.5 text-right transition">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-xl border ${s.accent} flex items-center justify-center text-sm shrink-0">
                            <i class="${s.icon}"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="font-bold text-xs text-white truncate">${escapeHTML(s.name)}</div>
                            <div class="text-[10px] text-slate-400 truncate">${escapeHTML(s.subtitle)}</div>
                        </div>
                    </div>
                    <span class="text-xs font-extrabold text-electricCyan shrink-0">من ${formatPrice(finalUSD)}</span>
                </button>
            `;
        }).join('');
    }
    dd.classList.remove('hidden');
}

function closeSearchDropdowns() {
    document.getElementById('desktop-search-dropdown')?.classList.add('hidden');
    document.getElementById('mobile-search-dropdown')?.classList.add('hidden');
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('#desktop-search-input') && !e.target.closest('#desktop-search-dropdown') &&
        !e.target.closest('#mobile-search-input') && !e.target.closest('#mobile-search-dropdown')) {
        closeSearchDropdowns();
    }
    if (notifOpen && !e.target.closest('#notif-dropdown')) {
        notifOpen = false;
        document.getElementById('notif-dropdown')?.classList.add('hidden');
    }
});

function selectCategory(cat) {
    activeCategory = cat;
    renderCategoryPills();
    renderServicesGrid();
}

function renderCategoryPills() {
    document.querySelectorAll('.cat-pill').forEach(btn => {
        const isActive = btn.getAttribute('data-cat') === activeCategory;
        btn.className = isActive
            ? 'cat-pill shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold btn-sapphire text-white transition'
            : 'cat-pill shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold glass-panel text-slate-300 hover:text-white hover:border-electricCyan/40 transition';
    });
}

function renderVipQuickReorder() {
    const sec = document.getElementById('vip-quick-reorder-section');
    const grid = document.getElementById('vip-quick-reorder-grid');
    const user = getActiveVipUser();

    if (!user || !(user.savedIds || []).length) {
        sec.classList.add('hidden');
        return;
    }

    const shortcuts = [
        { serviceId: 'pubg', pkgId: 'uc-325', title: '325 شدة ببجي UC', type: 'pubg', icon: 'fa-solid fa-crosshairs text-amber-300' },
        { serviceId: 'snapchat', pkgId: 'snap-1m', title: 'تجديد توثيق سناب بلس', type: 'snap', icon: 'fa-brands fa-snapchat text-yellow-300' },
        { serviceId: 'freefire', pkgId: 'ff-310', title: '310 جوهرة فري فاير', type: 'freefire', icon: 'fa-solid fa-gem text-electricCyan' }
    ].map(sc => {
        const saved = (user.savedIds || []).find(s => s.type === sc.type);
        return saved ? { ...sc, target: saved.value } : null;
    }).filter(Boolean);

    if (shortcuts.length === 0) {
        sec.classList.add('hidden');
        return;
    }

    grid.innerHTML = shortcuts.map((item, idx) => {
        const srv = state.services.find(s => s.id === item.serviceId);
        if (!srv || !srv.inStock) return '';
        const pkg = srv.packages.find(p => p.id === item.pkgId) || srv.packages[0];
        const vipPrice = getEffectivePriceUSD(pkg.priceUSD);
        return `
            <div class="glass-card rounded-2xl p-3.5 border-electricCyan/30 flex items-center justify-between gap-2.5">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-obsidian/90 border border-sky-400/25 flex items-center justify-center text-base shrink-0">
                        <i class="${item.icon}"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="font-bold text-xs text-white truncate">${escapeHTML(item.title)}</div>
                        <div class="text-[10px] text-slate-400 font-mono truncate">المعرّف: <span class="text-electricCyan">${escapeHTML(item.target)}</span></div>
                    </div>
                </div>
                <button onclick="quickReorder('${srv.id}', '${pkg.id}', ${idx})" class="shrink-0 px-3 py-1.5 rounded-xl bg-sapphire/30 hover:bg-sapphire/50 border border-electricCyan/45 text-[11px] font-bold text-sky-100 transition">
                    شحن (${formatPrice(vipPrice)})
                </button>
            </div>
        `;
    }).join('');

    window._vipQuickTargets = shortcuts.map(x => x.target);
    sec.classList.remove('hidden');
}

function quickReorder(serviceId, pkgId, targetIdx) {
    const srv = state.services.find(s => s.id === serviceId);
    if (!srv || !srv.inStock) return;
    const pkg = srv.packages.find(p => p.id === pkgId) || srv.packages[0];
    const target = (window._vipQuickTargets && window._vipQuickTargets[targetIdx]) || '';
    addToCart(srv, pkg, target);
    showToast(`تمت إضافة ${pkg.label} إلى السلة بضغطة زر ⚡`);
    toggleCartDrawer(true);
}

function renderServicesGrid() {
    const grid = document.getElementById('services-grid');
    const countPill = document.getElementById('services-count-pill');
    const list = state.services.filter(s => activeCategory === 'all' || s.category === activeCategory);
    const vipActive = isVipMode();

    if (countPill) countPill.textContent = `${list.length} منصات`;

    if (list.length === 0) {
        grid.innerHTML = `<div class="col-span-full glass-panel rounded-2xl p-8 text-center text-xs text-slate-400">لا توجد خدمات متوفرة في هذا القسم حالياً.</div>`;
        return;
    }

    grid.innerHTML = list.map(s => {
        const minBaseUSD = Math.min(...s.packages.map(p => p.priceUSD));
        const minVipUSD = getEffectivePriceUSD(minBaseUSD);

        return `
            <div onclick="${s.inStock ? `openServiceModal('${s.id}')` : ''}" class="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between gap-3.5 ${s.inStock ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}">
                <div class="space-y-2.5">
                    <div class="flex items-start justify-between gap-1.5">
                        <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border ${s.accent} flex items-center justify-center text-xl sm:text-2xl shrink-0">
                            <i class="${s.icon}"></i>
                        </div>
                        <span class="px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold ${s.inStock ? 'bg-sapphire/25 text-sky-200 border border-electricCyan/35' : 'bg-rose-500/20 text-rose-300 border border-rose-400/35'}">
                            ${s.inStock ? escapeHTML(s.badge) : 'نفدت الكمية'}
                        </span>
                    </div>

                    <div>
                        <h3 class="font-extrabold text-sm sm:text-base text-white leading-snug">${escapeHTML(s.name)}</h3>
                        <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">${escapeHTML(s.subtitle)}</p>
                    </div>
                </div>

                <div class="pt-2.5 border-t border-white/10 flex items-end justify-between gap-1">
                    <div>
                        ${vipActive ? `
                            <span class="block text-[10px] text-slate-500 line-through">${formatPrice(minBaseUSD)}</span>
                            <span class="inline-flex items-center gap-1 font-black text-xs sm:text-sm text-amber-300">${formatPrice(minVipUSD)}</span>
                            <span class="block text-[9px] text-electricCyan font-bold">سعرك VIP (-10%)</span>
                        ` : `
                            <span class="block text-[10px] text-slate-400">يبدأ من</span>
                            <span class="font-black text-sm sm:text-base text-electricCyan">${formatPrice(minBaseUSD)}</span>
                        `}
                    </div>
                    <span class="px-2.5 py-1.5 rounded-xl ${s.inStock ? 'bg-sapphire/25 border border-electricCyan/40 text-sky-200' : 'bg-slate-800 text-slate-500'} text-[10px] sm:text-xs font-bold shrink-0">
                        ${s.inStock ? 'طلب' : 'موقوف'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

/* =========================================================
   6. SERVICE CONFIGURATOR MODAL
========================================================= */
function openServiceModal(serviceId) {
    const srv = state.services.find(s => s.id === serviceId);
    if (!srv || !srv.inStock) {
        showToast('هذه الخدمة غير متوفرة حالياً', 'error');
        return;
    }
    activeServiceId = serviceId;
    const defaultPkg = srv.packages.find(p => p.popular) || srv.packages[0];
    activePackageId = defaultPkg.id;
    renderServiceModal('');
    openModal('service-modal');
}

function renderServiceModal(prefillInput = '') {
    const srv = state.services.find(s => s.id === activeServiceId);
    if (!srv) return;

    const pkg = srv.packages.find(p => p.id === activePackageId) || srv.packages[0];
    const vipUser = getActiveVipUser();
    const vipActive = Boolean(vipUser);
    const finalUSD = getEffectivePriceUSD(pkg.priceUSD);

    const savedIds = vipUser ? (vipUser.savedIds || []) : [];
    const matchedSaved = savedIds.filter(s => s.type === srv.inputType);
    const displaySaved = matchedSaved.length > 0 ? matchedSaved : savedIds;
    window._modalSavedChips = displaySaved;

    document.getElementById('service-modal-header').innerHTML = `
        <div class="w-11 h-11 rounded-2xl border ${srv.accent} flex items-center justify-center text-xl shrink-0">
            <i class="${srv.icon}"></i>
        </div>
        <div class="min-w-0">
            <h3 class="font-extrabold text-base sm:text-lg text-white truncate">${escapeHTML(srv.name)}</h3>
            <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                ⚡ شحن/تفعيل خلال 1-5 دقائق
            </span>
        </div>
    `;

    document.getElementById('service-modal-body').innerHTML = `
        <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-200">1. اختر الباقة المناسبة:</label>
            <div class="grid grid-cols-2 gap-2">
                ${srv.packages.map(p => {
                    const selected = p.id === pkg.id;
                    const pFinal = getEffectivePriceUSD(p.priceUSD);
                    return `
                        <button type="button" onclick="selectModalPackage('${p.id}')" class="p-3 rounded-2xl text-right transition border ${selected ? 'bg-sapphire/30 border-electricCyan shadow-[0_0_16px_rgba(56,189,248,0.22)]' : 'glass-panel border-blue-400/20 hover:border-electricCyan/40'}">
                            <div class="flex items-center justify-between gap-1">
                                <span class="font-bold text-xs text-white">${escapeHTML(p.label)}</span>
                                ${p.popular ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-electricCyan/20 text-electricCyan font-bold">مختار</span>' : ''}
                            </div>
                            <div class="mt-1 flex items-center gap-1.5">
                                ${vipActive ? `<span class="text-[10px] text-slate-500 line-through">${formatPrice(p.priceUSD)}</span>` : ''}
                                <span class="font-black text-xs sm:text-sm ${vipActive ? 'text-amber-300' : 'text-electricCyan'}">${formatPrice(pFinal)}</span>
                            </div>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>

        ${srv.verifyPreview ? `
            <div class="bg-obsidian/90 border border-electricCyan/40 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-sapphire to-royalViolet flex items-center justify-center text-white font-black text-sm shrink-0">م</div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <span id="live-badge-username" class="font-bold text-xs sm:text-sm text-white font-mono truncate">${escapeHTML(prefillInput || srv.inputPlaceholder)}</span>
                            <span class="inline-flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-bold shrink-0 ${srv.verifyPreview.style}">${srv.verifyPreview.symbol}</span>
                        </div>
                        <span class="text-[10px] text-sky-300">${escapeHTML(srv.verifyPreview.desc)}</span>
                    </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 shrink-0">معاينة حية</span>
            </div>
        ` : ''}

        <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-200">2. ${escapeHTML(srv.inputLabel)}</label>

            ${displaySaved.length > 0 ? `
                <div class="space-y-1.5">
                    <span class="block text-[10px] text-electricCyan font-bold"><i class="fa-solid fa-bookmark ml-1"></i>المعرّفات المحفوظة (تعبئة بضغطة واحدة):</span>
                    <div class="flex flex-wrap gap-1.5">
                        ${displaySaved.map((chip, idx) => `
                            <button type="button" onclick="applySavedChip(${idx})" class="px-2.5 py-1 rounded-xl bg-sapphire/25 hover:bg-sapphire/45 border border-electricCyan/40 text-[11px] text-sky-100 font-semibold transition flex items-center gap-1.5">
                                <span>${escapeHTML(chip.label)}:</span>
                                <span class="font-mono text-white">${escapeHTML(chip.value)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <input
                type="text"
                id="service-target-input"
                value="${escapeHTML(prefillInput)}"
                oninput="onModalTargetInput(this.value)"
                placeholder="${escapeHTML(srv.inputPlaceholder)}"
                class="w-full bg-obsidian/90 border border-blue-400/35 focus:border-electricCyan rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
            >
            <p id="service-inline-error" class="hidden text-xs text-rose-400 font-bold">
                <i class="fa-solid fa-circle-exclamation ml-1"></i>يرجى إدخال المعرّف أو اسم المستخدم المطلوب قبل المتابعة.
            </p>
        </div>

        <div class="pt-4 border-t border-blue-500/20 space-y-3">
            <div class="flex items-center justify-between">
                <div>
                    <span class="block text-xs text-slate-400">السعر النهائي:</span>
                    ${vipActive ? '<span class="text-[10px] text-amber-300 font-bold">شامل خصم عملاء VIP (-10%)</span>' : ''}
                </div>
                <div class="text-left">
                    ${vipActive ? `<span class="block text-xs text-slate-500 line-through">${formatPrice(pkg.priceUSD)}</span>` : ''}
                    <span class="font-black text-xl text-electricCyan">${formatPrice(finalUSD)}</span>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
                <button type="button" onclick="confirmModalOrder('buy')" class="btn-sapphire py-3 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-bolt"></i>
                    <span>شراء فوري</span>
                </button>
                <button type="button" onclick="confirmModalOrder('cart')" class="glass-panel hover:border-electricCyan py-3 rounded-xl font-bold text-xs sm:text-sm text-sky-200 flex items-center justify-center gap-1.5 transition">
                    <i class="fa-solid fa-cart-plus"></i>
                    <span>أضف للسلة</span>
                </button>
            </div>
        </div>
    `;
}

function selectModalPackage(pkgId) {
    const currentVal = document.getElementById('service-target-input')?.value || '';
    activePackageId = pkgId;
    renderServiceModal(currentVal);
}

function applySavedChip(idx) {
    const chip = window._modalSavedChips && window._modalSavedChips[idx];
    if (!chip) return;
    const input = document.getElementById('service-target-input');
    if (input) {
        input.value = chip.value;
        onModalTargetInput(chip.value);
        showToast(`تمت التعبئة من المعرّفات المحفوظة: ${chip.value}`);
    }
}

function onModalTargetInput(val) {
    document.getElementById('service-inline-error')?.classList.add('hidden');
    const badgeName = document.getElementById('live-badge-username');
    const srv = state.services.find(s => s.id === activeServiceId);
    if (badgeName && srv) {
        badgeName.textContent = val.trim() || srv.inputPlaceholder;
    }
}

function confirmModalOrder(actionType) {
    const srv = state.services.find(s => s.id === activeServiceId);
    if (!srv) return;
    const pkg = srv.packages.find(p => p.id === activePackageId) || srv.packages[0];
    const inputEl = document.getElementById('service-target-input');
    const errEl = document.getElementById('service-inline-error');
    const target = (inputEl?.value || '').trim();

    if (!target) {
        errEl?.classList.remove('hidden');
        inputEl?.focus();
        return;
    }

    addToCart(srv, pkg, target);
    closeModal('service-modal');

    if (actionType === 'buy') {
        toggleCartDrawer(true);
    } else {
        showToast(`تمت إضافة "${srv.name} — ${pkg.label}" إلى السلة`);
    }
}

/* =========================================================
   7. CART DRAWER, VIP 10% BREAKDOWN, PROMO CODE & CHECKOUT
========================================================= */
function addToCart(srv, pkg, targetId) {
    const existing = state.cart.find(
        i => i.serviceId === srv.id && i.packageId === pkg.id && i.targetId === targetId
    );
    if (existing) {
        existing.qty += 1;
    } else {
        state.cart.push({
            cartId: 'c-' + Date.now() + Math.floor(Math.random() * 999),
            serviceId: srv.id,
            serviceName: srv.name,
            icon: srv.icon,
            packageId: pkg.id,
            packageLabel: pkg.label,
            targetId,
            basePriceUSD: pkg.priceUSD,
            qty: 1
        });
    }
    saveCartState();
    updateCartBadges();
}

function updateCartBadges() {
    const totalQty = state.cart.reduce((s, i) => s + i.qty, 0);
    const hBadge = document.getElementById('header-cart-badge');
    const mBadge = document.getElementById('mobile-cart-badge');
    if (hBadge) hBadge.textContent = totalQty;
    if (mBadge) mBadge.textContent = totalQty;
}

function toggleCartDrawer(show) {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    if (show) {
        renderCartDrawer();
        drawer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        drawer.classList.add('hidden');
        restoreBodyScroll();
    }
}

function updateCartQty(cartId, delta) {
    const item = state.cart.find(i => i.cartId === cartId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter(i => i.cartId !== cartId);
    saveCartState();
    updateCartBadges();
    renderCartDrawer();
}

function removeCartItem(cartId) {
    state.cart = state.cart.filter(i => i.cartId !== cartId);
    saveCartState();
    updateCartBadges();
    renderCartDrawer();
}

function applyPromoCode() {
    const input = document.getElementById('promo-code-input');
    const code = (input?.value || '').trim().toUpperCase();
    if (!code) {
        showToast('أدخل كود الخصم أولاً (جرّب MADA10)', 'error');
        return;
    }
    if (code === 'MADA10' || code === 'VIP10') {
        appliedPromoCode = { code, percent: 10 };
        renderCartDrawer();
        showToast(`تم تفعيل كود الخصم ${code} (-10%) بنجاح 🎉`);
    } else {
        showToast('كود الخصم غير صالح! جرّب الكود: MADA10', 'error');
    }
}

function removePromoCode() {
    appliedPromoCode = null;
    renderCartDrawer();
    showToast('تمت إزالة كود الخصم');
}

function renderCartDrawer() {
    const body = document.getElementById('cart-drawer-body');
    if (!body) return;

    if (state.cart.length === 0) {
        body.innerHTML = `
            <div class="py-16 text-center space-y-4">
                <div class="w-16 h-16 mx-auto rounded-2xl glass-panel flex items-center justify-center text-electricCyan text-2xl">
                    <i class="fa-solid fa-basket-shopping"></i>
                </div>
                <div class="space-y-1">
                    <h4 class="font-bold text-base text-white">سلتك فارغة حالياً</h4>
                    <p class="text-xs text-slate-400">اختر خدمة من المتجر لتظهر هنا وتكمل طلبك في ثوانٍ</p>
                </div>
                <button onclick="toggleCartDrawer(false); scrollToServices();" class="btn-sapphire px-6 py-2.5 rounded-xl text-xs font-bold text-white">تصفح الخدمات</button>
            </div>
        `;
        return;
    }

    const vipUser = getActiveVipUser();
    const vipActive = Boolean(vipUser);

    const subtotalUSD = state.cart.reduce((s, i) => s + (i.basePriceUSD * i.qty), 0);
    const vipDiscountUSD = vipActive ? Number((subtotalUSD * 0.10).toFixed(2)) : 0;
    const afterVipUSD = subtotalUSD - vipDiscountUSD;
    const promoDiscountUSD = appliedPromoCode ? Number((afterVipUSD * (appliedPromoCode.percent / 100)).toFixed(2)) : 0;
    const finalTotalUSD = Math.max(0, Number((afterVipUSD - promoDiscountUSD).toFixed(2)));
    const walletEnough = vipActive && (vipUser.walletUSD || 0) >= finalTotalUSD;

    body.innerHTML = `
        <div class="space-y-2.5">
            ${state.cart.map(item => `
                <div class="glass-panel rounded-2xl p-3 border-sky-400/20 flex items-center justify-between gap-2.5">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-sapphire/25 border border-electricCyan/35 flex items-center justify-center text-electricCyan text-sm shrink-0">
                            <i class="${item.icon}"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="font-bold text-xs text-white truncate">${escapeHTML(item.serviceName)}</div>
                            <div class="text-[11px] text-electricCyan">${escapeHTML(item.packageLabel)}</div>
                            <div class="text-[10px] text-slate-400 font-mono truncate">${escapeHTML(item.targetId)}</div>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1.5 shrink-0">
                        <span class="font-bold text-xs text-white">${formatPrice(item.basePriceUSD * item.qty)}</span>
                        <div class="flex items-center gap-1.5">
                            <button onclick="updateCartQty('${item.cartId}', -1)" class="w-6 h-6 rounded-lg bg-obsidian border border-white/15 text-xs text-slate-200">-</button>
                            <span class="text-xs font-mono font-bold w-4 text-center">${item.qty}</span>
                            <button onclick="updateCartQty('${item.cartId}', 1)" class="w-6 h-6 rounded-lg bg-obsidian border border-white/15 text-xs text-slate-200">+</button>
                            <button onclick="removeCartItem('${item.cartId}')" class="mr-1 text-rose-400 hover:text-rose-300 text-xs"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="glass-panel rounded-2xl p-3 space-y-2">
            <label class="block text-[11px] font-bold text-slate-300">كود الخصم (جرّب: <span class="font-mono text-electricCyan">MADA10</span>):</label>
            ${appliedPromoCode ? `
                <div class="flex items-center justify-between bg-emerald-500/15 border border-emerald-400/40 rounded-xl px-3 py-2 text-xs">
                    <span class="font-bold text-emerald-300"><i class="fa-solid fa-tag ml-1"></i>${appliedPromoCode.code} (-${appliedPromoCode.percent}%)</span>
                    <button onclick="removePromoCode()" class="text-rose-300 hover:text-rose-200 font-bold text-[11px]">إزالة</button>
                </div>
            ` : `
                <div class="flex gap-2">
                    <input type="text" id="promo-code-input" placeholder="أدخل كود الخصم..." class="flex-1 bg-obsidian/90 border border-blue-400/30 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-electricCyan">
                    <button type="button" onclick="applyPromoCode()" class="px-4 py-2 rounded-xl bg-sapphire/30 border border-electricCyan/40 text-xs font-bold text-sky-100 hover:bg-sapphire/50 transition">تطبيق</button>
                </div>
            `}
        </div>

        <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-200">رقم الواتساب للتواصل وإشعار التسليم:</label>
            <input
                type="tel"
                id="checkout-phone-input"
                value="${escapeHTML(vipUser ? vipUser.phone : '')}"
                dir="ltr"
                placeholder="+213550000000"
                class="w-full bg-obsidian/90 border border-blue-400/35 focus:border-electricCyan rounded-xl px-3.5 py-2.5 text-sm text-white text-right focus:outline-none"
            >
            <p id="checkout-phone-error" class="hidden text-[11px] text-rose-400 font-bold">يرجى إدخال رقم جوال صحيح قبل تأكيد الطلب.</p>
        </div>

        <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-200">وسيلة الدفع:</label>
            <div class="space-y-2 text-xs">
                ${vipActive ? `
                    <label class="block cursor-pointer">
                        <input type="radio" name="pay_method" value="محفظة مدى" ${walletEnough ? 'checked' : ''} class="peer hidden">
                        <div class="p-3 rounded-xl glass-panel border-electricCyan/35 peer-checked:border-electricCyan peer-checked:bg-sapphire/30 flex items-center justify-between transition">
                            <div class="flex items-center gap-2 font-bold text-white">
                                <i class="fa-solid fa-wallet text-electricCyan"></i>
                                <span>محفظة مدى (للـ VIP)</span>
                            </div>
                            <span class="font-mono font-bold ${walletEnough ? 'text-emerald-300' : 'text-rose-300'}">${formatPrice(vipUser.walletUSD || 0)}</span>
                        </div>
                    </label>
                ` : ''}

                <label class="block cursor-pointer">
                    <input type="radio" name="pay_method" value="بريدي موب / تحويل بنكي" ${!walletEnough ? 'checked' : ''} class="peer hidden">
                    <div class="p-3 rounded-xl glass-panel peer-checked:border-electricCyan peer-checked:bg-sapphire/25 flex items-center gap-2 font-semibold text-slate-200 transition">
                        <i class="fa-solid fa-building-columns text-amber-300"></i>
                        <span>بريدي موب / تحويل بنكي</span>
                    </div>
                </label>

                <label class="block cursor-pointer">
                    <input type="radio" name="pay_method" value="بطاقة بنكية" class="peer hidden">
                    <div class="p-3 rounded-xl glass-panel peer-checked:border-electricCyan peer-checked:bg-sapphire/25 flex items-center gap-2 font-semibold text-slate-200 transition">
                        <i class="fa-regular fa-credit-card text-sky-300"></i>
                        <span>بطاقة بنكية (Visa / Mastercard / الذهبية)</span>
                    </div>
                </label>

                <label class="block cursor-pointer">
                    <input type="radio" name="pay_method" value="USDT" class="peer hidden">
                    <div class="p-3 rounded-xl glass-panel peer-checked:border-electricCyan peer-checked:bg-sapphire/25 flex items-center gap-2 font-semibold text-slate-200 transition">
                        <i class="fa-solid fa-coins text-emerald-300"></i>
                        <span>USDT (Binance Pay / TRC20)</span>
                    </div>
                </label>
            </div>
        </div>

        <div class="glass-panel rounded-2xl p-4 space-y-2 text-xs">
            <div class="flex justify-between text-slate-300">
                <span>المجموع الفرعي:</span>
                <span>${formatPrice(subtotalUSD)}</span>
            </div>
            ${vipActive ? `
                <div class="flex justify-between text-amber-300 font-bold">
                    <span>خصم عميل مدى VIP (-10%):</span>
                    <span>- ${formatPrice(vipDiscountUSD)}</span>
                </div>
            ` : ''}
            ${appliedPromoCode ? `
                <div class="flex justify-between text-emerald-300 font-bold">
                    <span>خصم الكوبون (${appliedPromoCode.code}):</span>
                    <span>- ${formatPrice(promoDiscountUSD)}</span>
                </div>
            ` : ''}
            <div class="flex justify-between items-center pt-2 border-t border-white/10">
                <span class="font-bold text-sm text-white">الإجمالي النهائي:</span>
                <span class="font-black text-xl text-electricCyan">${formatPrice(finalTotalUSD)}</span>
            </div>
        </div>

        <button onclick="completeCheckout(${finalTotalUSD})" class="btn-sapphire w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2">
            <i class="fa-solid fa-rocket"></i>
            <span>تأكيد الطلب الآن</span>
        </button>
    `;
}

function completeCheckout(finalTotalUSD) {
    if (state.cart.length === 0) return;
    const phoneEl = document.getElementById('checkout-phone-input');
    const phoneErr = document.getElementById('checkout-phone-error');
    const phone = (phoneEl?.value || '').trim();

    if (phone.length < 7) {
        phoneErr?.classList.remove('hidden');
        phoneEl?.focus();
        return;
    }

    const payMethod = document.querySelector('input[name="pay_method"]:checked')?.value || 'بريدي موب / تحويل بنكي';
    const vipUser = getActiveVipUser();

    // سيتم ربط هذا الإرسال بالسيرفر (2-backend-server) للتحقق الفعلي من الرصيد وحفظ الطلب في قاعدة البيانات (1-database)
    const orderPayload = {
        phone,
        paymentMethod: payMethod,
        promoCode: appliedPromoCode ? appliedPromoCode.code : null,
        items: state.cart.map(i => ({
            serviceId: i.serviceId,
            packageId: i.packageId,
            targetId: i.targetId,
            qty: i.qty
        }))
    };

    const orderId = 'MADA-' + Math.floor(1000 + Math.random() * 9000);
    const createdOrder = {
        orderId,
        phone,
        items: state.cart.map(i => ({
            serviceId: i.serviceId,
            serviceName: i.serviceName,
            packageLabel: i.packageLabel,
            targetId: i.targetId,
            qty: i.qty,
            unitPriceUSD: getEffectivePriceUSD(i.basePriceUSD)
        })),
        totalUSD: Number(finalTotalUSD),
        paymentMethod: payMethod,
        status: 'processing',
        vaultCode: '',
        createdAt: 'الآن • ' + new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })
    };

    state.orders.unshift(createdOrder);
    state.cart = [];
    appliedPromoCode = null;
    saveCartState();
    toggleCartDrawer(false);
    renderAll();
    showReceiptModal(createdOrder, orderPayload);
}

function showReceiptModal(order, orderPayload) {
    window._lastReceiptOrderId = order.orderId;
    window._lastOrderPayload = orderPayload;
    document.getElementById('receipt-modal-body').innerHTML = `
        <div class="bg-obsidian/90 border border-electricCyan/40 rounded-2xl p-4 flex items-center justify-between gap-2">
            <div>
                <span class="block text-[10px] text-slate-400">رقم الطلب الرسمي</span>
                <span class="font-mono font-black text-lg text-electricCyan">#${escapeHTML(order.orderId)}</span>
            </div>
            <button onclick="copyToClipboard('#' + window._lastReceiptOrderId, 'رقم الطلب')" class="px-3.5 py-2 rounded-xl bg-sapphire/30 hover:bg-sapphire/50 border border-electricCyan/45 text-sky-100 text-xs font-bold transition">
                <i class="fa-regular fa-copy ml-1"></i>نسخ الرقم
            </button>
        </div>

        <div class="glass-panel rounded-2xl p-4 space-y-2 text-xs">
            <div class="flex justify-between text-slate-300">
                <span>الخدمات:</span>
                <span class="font-bold text-white text-left">${order.items.map(i => `${escapeHTML(i.serviceName)} (${escapeHTML(i.packageLabel)})`).join(' + ')}</span>
            </div>
            <div class="flex justify-between text-slate-300">
                <span>المعرّف:</span>
                <span class="font-mono text-electricCyan">${order.items.map(i => escapeHTML(i.targetId)).join(' ، ')}</span>
            </div>
            <div class="flex justify-between text-slate-300">
                <span>وسيلة الدفع:</span>
                <span class="text-white">${escapeHTML(order.paymentMethod)}</span>
            </div>
            <div class="flex justify-between pt-2 border-t border-white/10">
                <span class="font-bold text-white">المبلغ المدفوع:</span>
                <span class="font-black text-base text-electricCyan">${formatPrice(order.totalUSD)}</span>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
            <button onclick="closeModal('receipt-modal'); ${isVipMode() ? "openCustomerHub('orders')" : "showToast('تم حفظ طلبك رقم #' + window._lastReceiptOrderId)"};" class="btn-sapphire py-2.5 rounded-xl font-bold text-xs text-white">متابعة الطلب</button>
            <button onclick="closeModal('receipt-modal')" class="glass-panel py-2.5 rounded-xl font-bold text-xs text-slate-200 hover:border-electricCyan transition">إغلاق</button>
        </div>
    `;
    openModal('receipt-modal');
}

/* =========================================================
   8. CUSTOMER AUTH MODAL (NO ADMIN CREDENTIALS HERE)
========================================================= */
function openAuthModal(tab = 'login') {
    switchAuthTab(tab);
    clearAuthError();
    openModal('auth-modal');
}

function switchAuthTab(tab) {
    clearAuthError();
    const loginF = document.getElementById('auth-login-form');
    const regF = document.getElementById('auth-register-form');
    const lBtn = document.getElementById('auth-tab-login');
    const rBtn = document.getElementById('auth-tab-register');
    if (tab === 'login') {
        loginF.classList.remove('hidden');
        regF.classList.add('hidden');
        lBtn.className = 'py-2 rounded-lg text-xs sm:text-sm font-bold bg-sapphire text-white transition';
        rBtn.className = 'py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-300 transition';
    } else {
        loginF.classList.add('hidden');
        regF.classList.remove('hidden');
        rBtn.className = 'py-2 rounded-lg text-xs sm:text-sm font-bold bg-royalViolet text-white transition';
        lBtn.className = 'py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-300 transition';
    }
}

function showAuthError(msg) {
    const box = document.getElementById('auth-error-box');
    const txt = document.getElementById('auth-error-msg');
    if (!box || !txt) return;
    txt.textContent = msg;
    box.classList.remove('hidden', 'animate-shake');
    void box.offsetWidth;
    box.classList.add('animate-shake');
}

function clearAuthError() {
    document.getElementById('auth-error-box')?.classList.add('hidden');
}

function handleLoginSubmit(e) {
    e.preventDefault();
    clearAuthError();
    // التحقق الفعلي من الحساب سيتم عبر السيرفر (2-backend-server)
    showAuthError('بانتظار ربط السيرفر للتحقق من بيانات الدخول بأمان دون كشف أي بيانات.');
}

function handleRegisterSubmit(e) {
    e.preventDefault();
    clearAuthError();
    const username = (document.getElementById('reg-username')?.value || '').trim();
    if (username.length < 3) {
        showAuthError('يجب أن يكون اسم المستخدم 3 أحرف على الأقل.');
        return;
    }
    // إنشاء الحساب الفعلي سيتم عبر السيرفر (2-backend-server) وقاعدة البيانات (1-database)
    showAuthError('بانتظار ربط السيرفر لإنشاء الحساب وحفظه في قاعدة البيانات بأمان.');
}

/* =========================================================
   9. VIP CUSTOMER HUB (3D PASS + WALLET + SAVED IDS + VAULT + ORDERS)
========================================================= */
function openCustomerHub(tab = 'pass') {
    const user = getActiveVipUser();
    if (!user) {
        openAuthModal('login');
        return;
    }
    activeHubTab = tab;
    document.getElementById('hub-avatar').textContent = (user.displayName || user.username).charAt(0).toUpperCase();
    document.getElementById('hub-name').textContent = user.displayName || user.username;
    document.getElementById('hub-phone').textContent = user.phone || '';
    switchHubTab(tab);
    openModal('customer-hub-modal');
}

function switchHubTab(tab) {
    activeHubTab = tab;
    ['pass', 'saved', 'vault', 'orders'].forEach(t => {
        const btn = document.getElementById(`hub-tab-${t}`);
        if (!btn) return;
        btn.className = t === tab
            ? 'hub-tab-btn shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold btn-sapphire text-white transition'
            : 'hub-tab-btn shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold glass-panel text-slate-300 hover:text-white transition';
    });
    renderCustomerHubBody();
}

function getStatusLabel(st) {
    return { pending: 'قيد المراجعة', processing: 'جاري التنفيذ ⚡', completed: 'مكتمل ✅', cancelled: 'ملغي ❌' }[st] || st;
}

function getStatusBadgeClass(st) {
    return {
        pending: 'bg-amber-500/20 text-amber-300 border border-amber-400/35',
        processing: 'bg-sky-500/20 text-electricCyan border border-electricCyan/35',
        completed: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35',
        cancelled: 'bg-rose-500/20 text-rose-300 border border-rose-400/35'
    }[st] || 'bg-slate-700 text-slate-200';
}

function renderCustomerHubBody() {
    const body = document.getElementById('customer-hub-body');
    const user = getActiveVipUser();
    if (!body || !user) return;

    if (activeHubTab === 'pass') {
        const prog = user.tierProgress || 50;
        body.innerHTML = `
            <div id="vip-pass-3d-card" class="vip-pass-card rounded-3xl p-5 sm:p-6 space-y-5">
                <div class="flex items-center justify-between gap-2">
                    <div>
                        <span class="text-[10px] font-mono uppercase tracking-widest text-electricCyan">MADA METALLIC VIP PASS</span>
                        <h4 class="font-black text-lg sm:text-xl text-white mt-0.5">${escapeHTML(user.displayName || user.username)}</h4>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-obsidian shrink-0">VIP -10% ★</span>
                </div>

                <div class="space-y-1.5">
                    <div class="flex justify-between text-[11px] text-sky-200 font-bold">
                        <span>مستوى الولاء الكوني (الذهبي)</span>
                        <span>${prog}%</span>
                    </div>
                    <div class="h-2 w-full rounded-full bg-obsidian/80 border border-white/10 overflow-hidden">
                        <div class="h-full rounded-full bg-gradient-to-r from-electricCyan via-sapphire to-amber-400" style="width: ${prog}%"></div>
                    </div>
                </div>

                <div class="flex items-end justify-between gap-2 pt-1">
                    <div>
                        <span class="block text-[11px] text-slate-300">رصيد محفظة مدى</span>
                        <span class="font-black text-2xl sm:text-3xl text-cosmic-gradient">${formatPrice(user.walletUSD || 0)}</span>
                    </div>
                    <span class="font-mono text-xs text-slate-300">@${escapeHTML(user.username)}</span>
                </div>
            </div>
        `;
        bindVipPassTilt();
    } else if (activeHubTab === 'saved') {
        const list = user.savedIds || [];
        window._hubSavedIds = list;
        body.innerHTML = `
            <div class="space-y-2.5">
                <h4 class="font-bold text-sm text-white">المعرّفات المحفوظة (${list.length})</h4>
                ${list.length > 0 ? list.map((s, idx) => `
                    <div class="glass-panel rounded-2xl p-3.5 flex items-center justify-between gap-2">
                        <div>
                            <div class="font-bold text-xs sm:text-sm text-white">${escapeHTML(s.label)}</div>
                            <div class="text-xs font-mono text-electricCyan mt-0.5">${escapeHTML(s.value)}</div>
                        </div>
                        <button onclick="copySavedByIndex(${idx})" class="px-2.5 py-1.5 rounded-lg bg-sky-500/15 text-sky-300 text-xs hover:bg-sky-500/30"><i class="fa-regular fa-copy"></i></button>
                    </div>
                `).join('') : '<p class="text-xs text-slate-400 text-center py-4">لا توجد معرّفات محفوظة بعد.</p>'}
            </div>
        `;
    } else if (activeHubTab === 'vault') {
        const delivered = state.orders.filter(o => o.vaultCode && o.vaultCode.trim() !== '');
        body.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <h4 class="font-bold text-sm text-emerald-300"><i class="fa-solid fa-vault ml-1.5"></i>الخزنة الرقمية (أكواد وبيانات التفعيل المستلمة)</h4>
                    <span class="text-[11px] text-slate-400">${delivered.length} عناصر</span>
                </div>
                ${delivered.length > 0 ? delivered.map(o => `
                    <div class="glass-panel rounded-2xl p-4 border-emerald-400/35 space-y-2.5">
                        <div class="flex items-center justify-between text-xs">
                            <span class="font-mono font-bold text-electricCyan">#${escapeHTML(o.orderId)}</span>
                            <span class="text-slate-300">${escapeHTML(o.items.map(i => i.packageLabel).join(' + '))}</span>
                        </div>
                        <div class="bg-obsidian/90 border border-emerald-400/25 rounded-xl p-3 flex items-center justify-between gap-2">
                            <code class="text-xs text-emerald-200 break-all">${escapeHTML(o.vaultCode)}</code>
                            <button onclick="copyVaultByOrderId('${o.orderId}')" class="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 text-xs font-bold transition">
                                <i class="fa-regular fa-copy ml-1"></i>نسخ
                            </button>
                        </div>
                    </div>
                `).join('') : '<div class="glass-panel rounded-2xl p-6 text-center text-xs text-slate-400">ستظهر هنا الأكواد وبيانات الاشتراك فور تسليمها من الإدارة.</div>'}
            </div>
        `;
    } else if (activeHubTab === 'orders') {
        body.innerHTML = `
            <div class="space-y-3">
                <h4 class="font-bold text-sm text-white">طلباتي وحالة التنفيذ المباشرة (${state.orders.length})</h4>
                ${state.orders.length > 0 ? state.orders.map(o => {
                    const step = o.status === 'pending' ? 1 : (o.status === 'processing' ? 2 : (o.status === 'completed' ? 3 : 0));
                    return `
                        <div class="glass-panel rounded-2xl p-4 space-y-3 border-sky-400/25">
                            <div class="flex items-center justify-between gap-2">
                                <span class="font-mono font-bold text-xs text-electricCyan">#${escapeHTML(o.orderId)}</span>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadgeClass(o.status)}">${getStatusLabel(o.status)}</span>
                            </div>
                            <div class="text-xs text-white font-semibold">
                                ${o.items.map(i => `${escapeHTML(i.serviceName)} (${escapeHTML(i.packageLabel)}) — <span class="font-mono text-electricCyan">${escapeHTML(i.targetId)}</span>`).join('<br>')}
                            </div>
                            ${step > 0 ? `
                                <div class="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                                    <div class="p-1.5 rounded-lg ${step >= 1 ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40 font-bold' : 'bg-obsidian/70 text-slate-500'}">1. قيد المراجعة</div>
                                    <div class="p-1.5 rounded-lg ${step >= 2 ? 'bg-sapphire/35 text-electricCyan border border-electricCyan/45 font-bold' : 'bg-obsidian/70 text-slate-500'}">2. جاري التنفيذ ⚡</div>
                                    <div class="p-1.5 rounded-lg ${step >= 3 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/45 font-bold' : 'bg-obsidian/70 text-slate-500'}">3. مكتمل ✅</div>
                                </div>
                            ` : '<div class="p-2 rounded-lg bg-rose-500/15 text-rose-300 text-[11px] text-center font-bold">طلب ملغي</div>'}
                            <div class="flex justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/10">
                                <span>${escapeHTML(o.createdAt)} • ${escapeHTML(o.paymentMethod)}</span>
                                <span class="font-bold text-electricCyan">${formatPrice(o.totalUSD)}</span>
                            </div>
                        </div>
                    `;
                }).join('') : '<p class="text-xs text-slate-400 text-center py-6">لا توجد طلبات معروضة حالياً.</p>'}
            </div>
        `;
    }
}

function copySavedByIndex(idx) {
    const item = window._hubSavedIds && window._hubSavedIds[idx];
    if (item) copyToClipboard(item.value, item.label);
}

function copyVaultByOrderId(orderId) {
    const o = state.orders.find(x => x.orderId === orderId);
    if (o && o.vaultCode) copyToClipboard(o.vaultCode, 'بيانات التفعيل');
}

/* =========================================================
   10. MODAL HELPERS & KEYBOARD ACCESSIBILITY
========================================================= */
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('hidden');
    el.classList.remove('flex');
    restoreBodyScroll();
}

function restoreBodyScroll() {
    const ids = ['service-modal', 'auth-modal', 'customer-hub-modal', 'receipt-modal', 'cart-drawer'];
    const openExists = ids.some(i => !document.getElementById(i)?.classList.contains('hidden'));
    if (!openExists) document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ['service-modal', 'auth-modal', 'customer-hub-modal', 'receipt-modal'].forEach(closeModal);
        toggleCartDrawer(false);
        closeSearchDropdowns();
    }
});

/* =========================================================
   11. 2.5D PARALLAX TILT FOR PRISM & METALLIC VIP PASS
========================================================= */
function initPrismParallax() {
    const stage = document.getElementById('cosmic-prism-stage');
    const rig = document.getElementById('cosmic-prism-rig');
    if (!stage || !rig) return;

    let raf = null;
    let rx = 0, ry = 0;

    function update() {
        rig.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
        raf = null;
    }

    stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
        const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        ry = nx * 16;
        rx = ny * -16;
        if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true });

    stage.addEventListener('pointerleave', () => {
        rx = 0; ry = 0;
        if (!raf) raf = requestAnimationFrame(update);
    });
}

function bindVipPassTilt() {
    const card = document.getElementById('vip-pass-3d-card');
    if (!card) return;
    card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 2 - 1;
        const y = ((e.clientY - r.top) / r.height) * 2 - 1;
        card.style.transform = `perspective(800px) rotateX(${y * -6}deg) rotateY(${x * 6}deg)`;
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
        card.style.transform = '';
    });
}

/* =========================================================
   12. ULTRA-LIGHT 75-STAR CANVAS (AUTO-PAUSES ON HIDDEN)
========================================================= */
function initStarfieldCanvas() {
    const canvas = document.getElementById('starfield-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const MAX_STARS = 75;
    let stars = [];
    let width = 0, height = 0;
    let rafId = null;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (stars.length === 0) {
            const palette = ['#ffffff', '#38bdf8', '#93c5fd', '#c4b5fd'];
            for (let i = 0; i < MAX_STARS; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    r: Math.random() * 1.25 + 0.35,
                    alpha: Math.random() * 0.65 + 0.2,
                    delta: (Math.random() * 0.007 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
                    color: palette[i % palette.length]
                });
            }
        }
    }

    function renderFrame() {
        if (document.hidden) {
            rafId = null;
            return;
        }
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.alpha += s.delta;
            if (s.alpha >= 0.92 || s.alpha <= 0.14) s.delta *= -1;
            ctx.globalAlpha = Math.max(0.12, Math.min(0.92, s.alpha));
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(renderFrame);
    }

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !rafId) renderFrame();
    });

    resize();
    renderFrame();
}

/* =========================================================
   13. STARTUP ON WINDOW LOAD
========================================================= */
window.onload = function () {
    initStarfieldCanvas();
    initPrismParallax();
    renderAll();
};
