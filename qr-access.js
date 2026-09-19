// FinPocket - QR ile yeni cihaz erişimi
// QR finans verisi taşımaz. Her cihaz kendi localStorage verisini kullanır.

const QR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAST0JcpIsIt0LAO1tKCfC8IGzsQpDCzqE",
  authDomain: "finpocket-1bb98.firebaseapp.com",
  projectId: "finpocket-1bb98",
  storageBucket: "finpocket-1bb98.firebasestorage.app",
  databaseURL: "https://finpocket-1bb98-default-rtdb.europe-west1.firebasedatabase.app",
  messagingSenderId: "929372485925",
  appId: "1:929372485925:web:214198c36fc06be7f802cc"
};

const QR_FB_BASE = 'https://www.gstatic.com/firebasejs/12.17.1';
const QR_HASH_ITERATIONS = 120000;
const QR_SESSION_LIFETIME = 365 * 24 * 60 * 60 * 1000;

let qrFirebasePromise = null;

const QR_STAFF_KEY = 'fp_qr_staff_mode';
const QR_MANAGER_KEY = 'fp_manager_device';

function isQrStaffDevice() {
  return sessionStorage.getItem(QR_STAFF_KEY) === '1';
}

function isManagerDevice() {
  return !isQrStaffDevice() && localStorage.getItem(QR_MANAGER_KEY) === '1';
}

function markManagerDevice() {
  if (!isQrStaffDevice()) {
    localStorage.setItem(QR_MANAGER_KEY, '1');
  }
}

function markQrStaffDevice() {
  sessionStorage.setItem(QR_STAFF_KEY, '1');
  localStorage.removeItem(QR_MANAGER_KEY);
}

function applyQrRoleUI() {
  const button = document.querySelector('[data-manager-only="true"]');
  if (!button) return;

  button.hidden = !isManagerDevice();
}

function qrEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function randomToken(bytes = 18) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map(x => x.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  try {
    const aa = base64ToBytes(a);
    const bb = base64ToBytes(b);
    if (aa.length !== bb.length) return false;

    let diff = 0;
    for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
    return diff === 0;
  } catch {
    return false;
  }
}

async function derivePasswordHash(password, saltB64, iterations = QR_HASH_ITERATIONS) {
  const salt = base64ToBytes(saltB64);
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: Number(iterations) || QR_HASH_ITERATIONS,
      hash: 'SHA-256'
    },
    material,
    256
  );

  return bytesToBase64(new Uint8Array(bits));
}

async function getQrFirebase() {
  if (!qrFirebasePromise) {
    qrFirebasePromise = (async () => {
      const [
        { initializeApp, getApps, getApp },
        { getAuth, signInAnonymously },
        { getDatabase, ref, get, set }
      ] = await Promise.all([
        import(`${QR_FB_BASE}/firebase-app.js`),
        import(`${QR_FB_BASE}/firebase-auth.js`),
        import(`${QR_FB_BASE}/firebase-database.js`)
      ]);

      const app = getApps().length ? getApp() : initializeApp(QR_FIREBASE_CONFIG);
      const auth = getAuth(app);
      const database = getDatabase(app);
      const userCredential = auth.currentUser
        ? { user: auth.currentUser }
        : await signInAnonymously(auth);

      return { database, user: userCredential.user, ref, get, set };
    })();
  }

  return qrFirebasePromise;
}

function showQrOverlay({ title = 'FinPocket', body = '', content = '', close = true } = {}) {
  document.getElementById('fpQrOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'fpQrOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:100000;background:rgba(7,12,24,.96);
    display:flex;align-items:center;justify-content:center;padding:20px;
    box-sizing:border-box;font-family:Arial,sans-serif;color:#fff;overflow:auto;`;

  overlay.innerHTML = `
    <div style="width:min(460px,100%);background:#111c31;border-radius:22px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.5);box-sizing:border-box">
      <div style="text-align:center;font-size:42px">🔐</div>
      <h2 style="text-align:center;margin:8px 0 10px">${qrEscape(title)}</h2>
      ${body ? `<p style="color:#cbd5e1;line-height:1.55;text-align:center">${qrEscape(body)}</p>` : ''}
      <div id="fpQrContent">${content}</div>
      ${close ? '<button id="fpQrClose" style="margin-top:12px;width:100%;padding:13px;border:0;border-radius:12px;background:#334155;color:#fff;font-size:16px">Kapat</button>' : ''}
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#fpQrClose')?.addEventListener('click', () => overlay.remove());
  return overlay;
}

function getAppBaseUrl() {
  if (location.protocol === 'file:') {
    return 'https://marigoldminibar.github.io/FinPocket-v8/';
  }

  return `${location.origin}${location.pathname}`;
}

async function createQrAccess() {
     if (!isManagerDevice()) {
    applyQrRoleUI();
    alert('Bu cihazda Yönetici QR oluşturma yetkisi bulunmuyor.');
    return;
  }

  const passwordOverlay = showQrOverlay({
    title: 'Yönetici QR Oluştur',
    body: 'Bu QR için ayrı bir erişim şifresi belirle. Şifre QR kodunun içine yazılmaz.',
    content: `
      <label style="display:block;margin:14px 0 6px;color:#e2e8f0">QR Şifresi</label>
      <input id="fpQrPassword" type="password" autocomplete="new-password" placeholder="En az 6 karakter"
        style="width:100%;box-sizing:border-box;padding:14px;border:1px solid #475569;border-radius:12px;background:#0b1220;color:#fff;font-size:16px">
      <label style="display:block;margin:14px 0 6px;color:#e2e8f0">Şifre Tekrar</label>
      <input id="fpQrPassword2" type="password" autocomplete="new-password" placeholder="Şifreyi tekrar gir"
        style="width:100%;box-sizing:border-box;padding:14px;border:1px solid #475569;border-radius:12px;background:#0b1220;color:#fff;font-size:16px">
      <button id="fpQrCreate" style="margin-top:18px;width:100%;padding:15px;border:0;border-radius:12px;background:#f59e0b;color:#111827;font-size:17px;font-weight:700">🔳 QR Oluştur</button>`
  });

  const createBtn = passwordOverlay.querySelector('#fpQrCreate');

  createBtn.addEventListener('click', async () => {
    const password = passwordOverlay.querySelector('#fpQrPassword').value;
    const password2 = passwordOverlay.querySelector('#fpQrPassword2').value;

    if (password.length < 6) {
      alert('QR şifresi en az 6 karakter olmalı.');
      return;
    }

    if (password !== password2) {
      alert('İki şifre aynı değil.');
      return;
    }

    createBtn.disabled = true;
    createBtn.textContent = 'Oluşturuluyor...';

    try {
      const { database, user, ref, set } = await getQrFirebase();
      const token = randomToken();
      const saltBytes = new Uint8Array(16);
      crypto.getRandomValues(saltBytes);
      const salt = bytesToBase64(saltBytes);
      const passwordHash = await derivePasswordHash(password, salt);
      const createdAt = Date.now();

      await set(ref(database, `qr_sessions/${token}`), {
        type: 'password_gate_v1',
        status: 'available',
        expiresAt: createdAt + QR_SESSION_LIFETIME,
        passwordHash,
        salt,
        iterations: QR_HASH_ITERATIONS,
        createdAt,
        createdBy: user.uid
      });

      const qrUrl = `${getAppBaseUrl()}?qr=${encodeURIComponent(token)}`;
      passwordOverlay.remove();

      const qrOverlay = showQrOverlay({
        title: 'QR Hazır',
        body: 'Bu QR yeni cihazda FinPocket’ı boş bir cihaz olarak açar. Finans verilerin bu QR ile paylaşılmaz.',
        content: `
          <div style="background:#fff;border-radius:16px;padding:16px;text-align:center;min-height:280px;display:flex;align-items:center;justify-content:center">
            <img id="fpQrImage" alt="FinPocket QR" width="280" height="280" style="width:280px;height:280px;max-width:100%;image-rendering:pixelated;display:block">
          </div>
          <div style="margin-top:14px;padding:12px;border-radius:12px;background:#0b1220;color:#cbd5e1;font-size:13px;word-break:break-all">${qrEscape(qrUrl)}</div>
          <button id="fpQrCopy" style="margin-top:12px;width:100%;padding:13px;border:0;border-radius:12px;background:#334155;color:#fff;font-size:15px">🔗 QR Adresini Kopyala</button>`
      });

      const qrImage = qrOverlay.querySelector('#fpQrImage');
      const qrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=' + encodeURIComponent(qrUrl);

      await new Promise((resolve, reject) => {
        qrImage.onload = resolve;
        qrImage.onerror = () => reject(new Error('QR görseli yüklenemedi.'));
        qrImage.src = qrImageUrl;
      });

      qrOverlay.querySelector('#fpQrCopy').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(qrUrl);
          alert('QR adresi kopyalandı.');
        } catch {
          alert('Kopyalama başarısız. QR kodunu kullanabilirsin.');
        }
      });
    } catch (error) {
      console.error('QR oluşturma hatası:', error);
      alert('QR oluşturulamadı. Firebase bağlantısını kontrol et.');
      createBtn.disabled = false;
      createBtn.textContent = '🔳 QR Oluştur';
    }
  });
}

async function requireQrAccess(token) {
  if (!token || !/^[a-f0-9]{36}$/i.test(token)) {
    throw new Error('Geçersiz QR.');
  }

  if (sessionStorage.getItem(`fp_qr_access_${token}`) === '1') {
    return true;
  }

  const overlay = showQrOverlay({
    title: 'FinPocket Erişimi',
    body: 'Bu QR için belirlenen şifreyi gir.',
    close: false,
    content: `
      <input id="fpQrAccessPassword" type="password" autocomplete="current-password" placeholder="QR şifresi"
        style="width:100%;box-sizing:border-box;padding:14px;border:1px solid #475569;border-radius:12px;background:#0b1220;color:#fff;font-size:16px">
      <button id="fpQrAccessBtn" style="margin-top:14px;width:100%;padding:15px;border:0;border-radius:12px;background:#f59e0b;color:#111827;font-size:17px;font-weight:700">🔓 Giriş Yap</button>
      <div id="fpQrAccessError" style="min-height:22px;margin-top:10px;color:#fca5a5;text-align:center"></div>`
  });

  const input = overlay.querySelector('#fpQrAccessPassword');
  const button = overlay.querySelector('#fpQrAccessBtn');
  const errorBox = overlay.querySelector('#fpQrAccessError');

  const verify = async () => {
    const password = input.value;

    if (!password) {
      errorBox.textContent = 'Şifreyi gir.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Kontrol ediliyor...';
    errorBox.textContent = '';

    try {
      const { database, ref, get } = await getQrFirebase();
      const snapshot = await get(ref(database, `qr_sessions/${token}`));
      const data = snapshot.val();

      if (!data || data.type !== 'password_gate_v1') {
        throw new Error('QR bulunamadı.');
      }

      if (Number(data.expiresAt || 0) < Date.now()) {
        throw new Error('QR süresi dolmuş.');
      }

      const hash = await derivePasswordHash(password, data.salt, data.iterations);
      if (!constantTimeEqual(hash, data.passwordHash)) {
        throw new Error('Şifre yanlış.');
      }

      // QR yalnızca erişim yetkisini doğrular. Finans verisi okunmaz veya taşınmaz.
      // storage.js / app.js yeni cihazın kendi DEVICE_ID'sini kullanmaya devam eder.
      sessionStorage.setItem(`fp_qr_access_${token}`, '1');
      markQrStaffDevice();

      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('qr');
      history.replaceState(null, '', cleanUrl.href);

      overlay.remove();
      window.dispatchEvent(new CustomEvent('finpocket:qr-authorized', {
        detail: { token }
      }));
    } catch (error) {
      console.error('QR doğrulama hatası:', error);
      errorBox.textContent = error.message === 'Şifre yanlış.'
        ? '❌ Şifre yanlış.'
        : error.message === 'QR süresi dolmuş.'
          ? '❌ QR süresi dolmuş.'
          : '❌ QR doğrulanamadı. İnternet bağlantısını kontrol et.';
      button.disabled = false;
      button.textContent = '🔓 Giriş Yap';
    }
  };

  button.addEventListener('click', verify);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') verify();
  });

  input.focus();
  return false;
}

function initQrRole() {
  if (isQrStaffDevice()) {
    applyQrRoleUI();
    return;
  }

  markManagerDevice();
  applyQrRoleUI();
}

initQrRole();

window.FinPocketQR = {
  create: createQrAccess,
  require: requireQrAccess
};

(async () => {
  try {
    const token = new URLSearchParams(location.search).get('qr');
    if (token) await requireQrAccess(token);
  } catch (error) {
    console.error('QR erişim başlatılamadı:', error);
  }
})();

document.addEventListener('click', event => {
  const button = event.target.closest?.('#qrBtn');
  if (!button) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (!isManagerDevice()) {
    applyQrRoleUI();
    alert('Bu cihazda Yönetici QR oluşturma yetkisi bulunmuyor.');
    return;
  }

  createQrAccess();
}, true);