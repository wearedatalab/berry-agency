/* Berry Concept Agency · home
   Sin dependencias. Todo es mejora progresiva: la página se lee y se navega completa sin este archivo.
   Movimiento: solo transform y opacity; lo que sigue al desplazamiento o al cursor se apaga con «reducir movimiento». */
(() => {
  'use strict';
  const d = document;
  const raiz = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const fino = matchMedia('(hover: hover) and (pointer: fine)');
  const suave = () => (quieto.matches ? 'auto' : 'smooth');
  const limitar = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Motor de desplazamiento: una pasada por cuadro para todo lo que sigue al scroll ---------- */
  const tareas = new Set();
  let enCola = false;
  const cuadro = () => { enCola = false; const y = scrollY; const alto = innerHeight; tareas.forEach((f) => f(y, alto)); };
  const pedir = () => { if (!enCola) { enCola = true; requestAnimationFrame(cuadro); } };
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', pedir, { passive: true });
  addEventListener('load', pedir, { once: true });

  /* ---------- Sabor: las dos paletas del manual de marca ---------- */
  const COLOR_BARRA = { oro: '#040714', orquidea: '#000000' };
  function ponerSabor(valor, guardar) {
    raiz.dataset.sabor = valor;
    $$('[data-sabor-op]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.saborOp === valor)));
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = COLOR_BARRA[valor];
    if (guardar) { try { localStorage.setItem('berry-sabor', valor); } catch { /* sin almacenamiento */ } }
  }
  ponerSabor(raiz.dataset.sabor === 'orquidea' ? 'orquidea' : 'oro', false);
  $$('[data-sabor-op]').forEach((b) => b.addEventListener('click', () => {
    const valor = b.dataset.saborOp;
    if (valor === raiz.dataset.sabor) return;
    if (d.startViewTransition && !quieto.matches) d.startViewTransition(() => ponerSabor(valor, true));
    else ponerSabor(valor, true);
  }));

  /* ---------- Pantalla de carga: el logo se llena con el avance real (fuentes, imagen principal, página) ---------- */
  let tLista = Infinity;
  const lista = () => { if (tLista === Infinity) tLista = performance.now(); raiz.classList.add('lista'); };
  const intro = $('[data-intro]');
  if (intro && raiz.classList.contains('con-intro')) {
    const pct = $('[data-intro-pct]', intro);
    const nivel = $('[data-intro-nivel]', intro);
    const RECORRIDO = 340;                              // alto del recorte, en unidades del dibujo
    const MINIMO = quieto.matches ? 700 : 1500;          // para que la animación alcance a verse
    const TOPE = 4000;                                   // nadie espera más que esto
    const t0 = performance.now();
    let cargado = 0;
    let mostrado = 0;
    let fin = false;
    const senales = [
      d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve(),
      new Promise((r) => { const img = $('.portada__retrato img'); if (!img || img.complete) r(); else { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); } }),
      new Promise((r) => { if (d.readyState === 'complete') r(); else addEventListener('load', r, { once: true }); }),
    ];
    const sumar = () => { cargado = Math.min(1, cargado + 1 / senales.length); };
    senales.forEach((p) => p.then(sumar, sumar));
    const conEscape = (e) => { if (e.key === 'Escape') salir(); };
    const quitar = () => { if (intro.isConnected) intro.remove(); raiz.classList.remove('con-intro'); d.removeEventListener('keydown', conEscape); };
    function salir() {
      if (fin) return;
      fin = true;
      lista();
      intro.classList.add('intro--sale');
      intro.addEventListener('animationend', (e) => { if (e.target === intro) quitar(); });
      setTimeout(quitar, 800);
    }
    const completar = () => {
      if (fin || intro.classList.contains('intro--completa')) return;
      pct.textContent = '100';
      nivel.setAttribute('transform', 'translate(0 0)');
      intro.dataset.aro = '';
      intro.classList.add('intro--completa');           // las hojas caen encima
      setTimeout(salir, quieto.matches ? 250 : 720);
    };
    if (quieto.matches) nivel.setAttribute('transform', 'translate(0 0)');
    const avanzar = (t) => {
      if (fin) return;
      const dt = t - t0;
      const objetivo = dt >= TOPE ? 1 : Math.min(dt / MINIMO, 0.2 + cargado * 0.8);
      mostrado += (objetivo - mostrado) * 0.14;
      if (objetivo - mostrado < 0.005) mostrado = objetivo;
      pct.textContent = String(Math.round(mostrado * 100));
      if (!quieto.matches) nivel.setAttribute('transform', `translate(0 ${((1 - mostrado) * RECORRIDO).toFixed(1)})`);
      if (mostrado > 0.55) intro.dataset.aro = '';
      if (mostrado >= 1) { completar(); return; }
      requestAnimationFrame(avanzar);
    };
    requestAnimationFrame(avanzar);
    setTimeout(completar, TOPE + 600);                   // por si la pestaña estaba en segundo plano
    $('[data-intro-saltar]', intro).addEventListener('click', salir);
    d.addEventListener('keydown', conEscape);
  } else {
    if (intro) intro.remove();
    lista();
  }

  /* ---------- Cabecera: se esconde al bajar y vuelve al subir ---------- */
  const cab = $('[data-cab]');
  let ultimo = scrollY;
  let altoCab = cab ? cab.offsetHeight : 0;
  addEventListener('resize', () => { altoCab = cab ? cab.offsetHeight : 0; }, { passive: true });
  if (cab) {
    tareas.add((y) => {
      if (Math.abs(y - ultimo) <= 6) return;
      cab.toggleAttribute('data-oculta', y > ultimo && y > altoCab * 1.5 && !cab.contains(d.activeElement));
      ultimo = y;
    });
    cab.addEventListener('focusin', () => cab.removeAttribute('data-oculta'));
  }

  /* Sección actual en el menú */
  const enlaces = new Map($$('.cab__nav a').map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window && enlaces.size) {
    const vigia = new IntersectionObserver((entradas) => entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      enlaces.forEach((a) => a.removeAttribute('aria-current'));
      const a = enlaces.get(e.target.id);
      if (a) a.setAttribute('aria-current', 'location');
    }), { rootMargin: '-40% 0px -55% 0px' });
    $$('main > section[id]').forEach((s) => vigia.observe(s));
  }

  /* ---------- Menú (pantallas pequeñas) ---------- */
  const menu = $('[data-menu]');
  const abrirMenu = $('[data-menu-abrir]');
  if (menu && abrirMenu && menu.showModal) {
    abrirMenu.addEventListener('click', () => menu.showModal());
    $('[data-menu-cerrar]', menu).addEventListener('click', () => menu.close());
    $$('[data-menu-enlace]', menu).forEach((a) => a.addEventListener('click', () => menu.close()));
  }

  /* ---------- Compañera del scroll: las hojas del logo avanzan mientras se baja ---------- */
  const guia = $('[data-guia]');
  if (guia) {
    const movil = $('[data-guia-movil]', guia);
    const rastro = $('[data-guia-rastro]', guia);
    const boton = $('[data-guia-boton]', guia);
    const hojas = $('svg', boton);
    const num = $('[data-guia-num]', guia);
    const nombre = $('[data-guia-nombre]', guia);
    const secciones = $$('main > section[data-guia-n]');
    const vertical = matchMedia('(min-width: 92em)');
    let recorrido = 0;
    let actual = null;
    let inclina = 0;
    let impulso = 0;
    let yPrevio = scrollY;
    let girando = false;
    let relojRotulo;
    const medir = () => { recorrido = Math.max(0, vertical.matches ? guia.clientHeight - movil.offsetHeight : guia.clientWidth - movil.offsetWidth - 16); };
    // Se inclinan con la velocidad del desplazamiento y vuelven solas a su sitio
    const balancear = () => {
      inclina += (impulso - inclina) * 0.2;
      impulso *= 0.82;
      if (Math.abs(inclina) > 0.05 || Math.abs(impulso) > 0.05) { hojas.style.transform = `rotate(${inclina.toFixed(2)}deg)`; requestAnimationFrame(balancear); }
      else { girando = false; inclina = 0; hojas.style.transform = ''; }
    };
    const seguir = (y, alto) => {
      const total = d.documentElement.scrollHeight - alto;
      const p = total > 0 ? limitar(y / total, 0, 1) : 0;
      const pos = (p * recorrido).toFixed(1);
      movil.style.transform = vertical.matches ? `translate3d(0, ${pos}px, 0)` : `translate3d(${pos}px, 0, 0)`;
      rastro.style.transform = vertical.matches ? `scaleY(${p.toFixed(4)})` : `scaleX(${p.toFixed(4)})`;
      guia.toggleAttribute('data-fin', p > 0.5);
      // Sección que pasa por la línea de lectura (un poco arriba del centro)
      let s = secciones[0];
      for (const sec of secciones) { if (sec.getBoundingClientRect().top <= alto * 0.45) s = sec; else break; }
      if (s && s !== actual) {
        const primera = actual === null;
        actual = s;
        num.textContent = s.dataset.guiaN;
        nombre.textContent = s.dataset.guiaTxt;
        if (!primera) {
          guia.setAttribute('data-rotulo', '');
          clearTimeout(relojRotulo);
          relojRotulo = setTimeout(() => guia.removeAttribute('data-rotulo'), 1800);
          if (!quieto.matches && boton.animate) boton.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.2, 0, 0, 1)' });
        }
      }
      if (!quieto.matches) {
        impulso = limitar(impulso + (y - yPrevio) * 0.5, -24, 24);
        if (!girando && Math.abs(impulso) > 0.05) { girando = true; requestAnimationFrame(balancear); }
      }
      yPrevio = y;
    };
    boton.addEventListener('click', () => {
      if (!quieto.matches && hojas.animate) hojas.animate([{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-10px) rotate(-180deg)', offset: 0.5 }, { transform: 'translateY(0) rotate(-360deg)' }], { duration: 560, easing: 'cubic-bezier(.2, 0, 0, 1)' });
      scrollTo({ top: 0, behavior: suave() });
      const logo = $('.cab__logo');
      if (logo) logo.focus({ preventScroll: true });
    });
    const reubicar = () => { movil.style.transform = ''; medir(); pedir(); };
    addEventListener('resize', reubicar, { passive: true });
    addEventListener('load', reubicar, { once: true });
    if (vertical.addEventListener) vertical.addEventListener('change', reubicar);
    tareas.add(seguir);
    medir();
  }

  /* ---------- Portada: el retrato y el fondo siguen al cursor y al desplazamiento ---------- */
  const portada = $('[data-portada]');
  if (portada && !quieto.matches) {
    const img = $('.portada__retrato img', portada);
    const texto = $('.portada__texto', portada);
    const contorno = $('.contorno--portada', portada);
    let mx = 0;
    let my = 0;
    let cx = 0;
    let cy = 0;
    let avance = 0;
    let viva = false;
    let suavizando = false;
    // Espera a que termine la entrada de la portada antes de tomar el control
    const activar = () => {
      if (viva) return true;
      if (performance.now() - tLista < 1100) return false;
      viva = true;
      portada.setAttribute('data-viva', '');
      return true;
    };
    const aplicar = () => {
      const baja = innerWidth >= 1024 ? 64 : 28;
      img.style.transform = `translate3d(${(cx * -16).toFixed(1)}px, ${(avance * baja + cy * -10).toFixed(1)}px, 0) scale(${(1 + avance * 0.05).toFixed(4)})`;
      texto.style.transform = `translate3d(0, ${(avance * -36).toFixed(1)}px, 0)`;
      texto.style.opacity = String(limitar(1 - avance * 1.25, 0, 1).toFixed(3));
      if (contorno) contorno.style.translate = `${(cx * 30).toFixed(1)}px ${(cy * 20).toFixed(1)}px`;
    };
    const suavizar = () => {
      cx += (mx - cx) * 0.1;
      cy += (my - cy) * 0.1;
      aplicar();
      if (Math.abs(mx - cx) > 0.002 || Math.abs(my - cy) > 0.002) requestAnimationFrame(suavizar); else suavizando = false;
    };
    const mover = () => { if (!suavizando) { suavizando = true; requestAnimationFrame(suavizar); } };
    tareas.add((y) => {
      const alto = portada.offsetHeight || 1;
      if (y > alto * 1.2 && avance >= 1) return;
      const p = limitar(y / alto, 0, 1);
      if (p === avance) return;
      avance = p;
      if (activar()) aplicar();
    });
    if (fino.matches) {
      portada.addEventListener('pointermove', (e) => { if (!activar()) return; mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; mover(); });
      portada.addEventListener('pointerleave', () => { mx = 0; my = 0; if (viva) mover(); });
    }
  }

  /* ---------- Manifiesto: las palabras se encienden a medida que se baja ---------- */
  const manifiesto = $('[data-palabras]');
  if (manifiesto && !quieto.matches) {
    const palabras = [];
    [...manifiesto.childNodes].forEach((nodo) => {
      if (nodo.nodeType === 3) {
        const trozos = d.createDocumentFragment();
        nodo.textContent.split(/(\s+)/).forEach((trozo) => {
          if (!trozo) return;
          if (/^\s+$/.test(trozo)) { trozos.appendChild(d.createTextNode(' ')); return; }
          const s = d.createElement('span');
          s.className = 'palabra';
          s.textContent = trozo;
          trozos.appendChild(s);
          palabras.push(s);
        });
        nodo.replaceWith(trozos);
      } else if (nodo.nodeType === 1) {
        nodo.classList.add('palabra');
        palabras.push(nodo);
      }
    });
    manifiesto.classList.add('troceado');
    let encendidas = -1;
    tareas.add((y, alto) => {
      const r = manifiesto.getBoundingClientRect();
      if (r.top > alto * 1.1 && encendidas <= 0) return;
      const n = Math.round(limitar((alto * 0.88 - r.top) / (alto * 0.5), 0, 1) * palabras.length);
      if (n === encendidas) return;
      palabras.forEach((el, i) => el.classList.toggle('on', i < n));
      encendidas = n;
    });
  }

  /* ---------- Pilares: el nombre se desliza con el desplazamiento ---------- */
  const pilares = $$('[data-pilar]');
  if (pilares.length && !quieto.matches) {
    const nombres = pilares.map((p) => $('.pilar__nombre', p));
    tareas.add((y, alto) => {
      const amplitud = Math.min(70, innerWidth * 0.03);
      pilares.forEach((li, i) => {
        const r = li.getBoundingClientRect();
        if (r.bottom < -60 || r.top > alto + 60) return;
        const c = limitar((r.top + r.height / 2 - alto / 2) / alto, -0.6, 0.6);
        nombres[i].style.transform = `translate3d(${(c * (i % 2 ? -1 : 1) * amplitud).toFixed(1)}px, 0, 0)`;
      });
    });
  }

  /* ---------- Trabajo: cada foto se desplaza dentro de su marco ---------- */
  const marcos = $$('.obra__foto');
  if (marcos.length && !quieto.matches) {
    const fotos = marcos.map((m) => $('picture', m));
    tareas.add((y, alto) => marcos.forEach((m, i) => {
      const r = m.getBoundingClientRect();
      if (r.bottom < -80 || r.top > alto + 80) return;
      const c = limitar((r.top + r.height / 2 - alto / 2) / (alto / 2 + r.height / 2), -1, 1);
      fotos[i].style.transform = `translate3d(0, ${(c * -6).toFixed(2)}%, 0)`;
    }));
  }

  /* ---------- Método: la línea avanza y las etapas se encienden en orden ---------- */
  const pasos = $('[data-pasos]');
  if (pasos && !quieto.matches) {
    const etapas = $$('[data-paso]', pasos);
    pasos.classList.add('con-avance');
    let activas = -1;
    tareas.add((y, alto) => {
      const r = pasos.getBoundingClientRect();
      if (r.top > alto * 1.1 && activas <= 0) return;
      const p = limitar((alto * 0.85 - r.top) / (alto * 0.5), 0, 1);
      pasos.style.setProperty('--p', p.toFixed(3));
      const n = Math.min(etapas.length, Math.floor(p * etapas.length + 0.5));
      if (n === activas) return;
      etapas.forEach((el, i) => el.classList.toggle('activo', i < n));
      activas = n;
    });
  }

  /* ---------- Riel de piezas: flechas a los lados, arrastre con el ratón ---------- */
  $$('[data-riel]').forEach((riel) => {
    const pista = $('[data-riel-pista]', riel);
    const atras = $('[data-riel-atras]', riel);
    const adelante = $('[data-riel-adelante]', riel);
    const paso = () => {
      const p = pista.firstElementChild;
      return p ? p.getBoundingClientRect().width + (parseFloat(getComputedStyle(pista).columnGap) || 16) : 320;
    };
    const estado = () => {
      const tope = pista.scrollWidth - pista.clientWidth - 4;
      const enInicio = pista.scrollLeft <= 4;
      const enFin = pista.scrollLeft >= tope;
      // Se oculta la flecha que no tiene a dónde ir; si tenía el foco, pasa a la otra
      if (enInicio && d.activeElement === atras) { adelante.hidden = false; adelante.focus(); }
      if (enFin && d.activeElement === adelante) { atras.hidden = false; atras.focus(); }
      atras.hidden = enInicio;
      adelante.hidden = enFin;
    };
    const mover = (sentido) => {
      const cuantas = Math.max(1, Math.floor((pista.clientWidth * 0.8) / paso()));
      pista.scrollBy({ left: sentido * cuantas * paso(), behavior: suave() });
    };
    atras.addEventListener('click', () => mover(-1));
    adelante.addEventListener('click', () => mover(1));
    let tic = false;
    pista.addEventListener('scroll', () => { if (tic) return; tic = true; requestAnimationFrame(() => { estado(); tic = false; }); }, { passive: true });
    addEventListener('resize', estado, { passive: true });
    estado();

    let x0 = null;
    let s0 = 0;
    let movio = false;
    pista.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; x0 = e.clientX; s0 = pista.scrollLeft; movio = false; });
    pista.addEventListener('pointermove', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      if (!movio && Math.abs(dx) > 6) { movio = true; pista.setPointerCapture(e.pointerId); pista.dataset.arrastre = ''; }
      if (movio) pista.scrollLeft = s0 - dx;
    });
    const soltar = () => {
      if (x0 === null) return;
      x0 = null;
      if (!movio) return;
      const p = paso();
      pista.scrollTo({ left: Math.round(pista.scrollLeft / p) * p, behavior: suave() });
      setTimeout(() => { delete pista.dataset.arrastre; }, 420);
    };
    pista.addEventListener('pointerup', soltar);
    pista.addEventListener('pointercancel', soltar);
  });

  /* ---------- Racimo de plataformas: se arma al bajar, esquiva el cursor y cada fruto cuenta qué se hace ahí ---------- */
  const racimo = $('[data-racimo]');
  if (racimo) {
    const frutos = $$('[data-fruto]', racimo);
    const nombreFruto = $('[data-racimo-nombre]', racimo);
    const descFruto = $('[data-racimo-desc]', racimo);
    const detalle = $('[data-racimo-detalle]', racimo);
    const elegir = (b) => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      frutos.forEach((f) => f.setAttribute('aria-pressed', String(f === b)));
      nombreFruto.textContent = b.dataset.nombre;
      descFruto.textContent = b.dataset.desc;
      if (!quieto.matches && detalle.animate) detalle.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.05, .7, .1, 1)' });
    };
    frutos.forEach((b) => {
      b.addEventListener('click', () => elegir(b));
      b.addEventListener('focus', () => elegir(b));
      if (fino.matches) b.addEventListener('pointerenter', () => elegir(b));
    });

    if (!quieto.matches) {
      const lienzo = $('.racimo__lienzo', racimo);
      const listaFrutos = $('[data-racimo-frutos]', racimo);
      // Cada fruto llega desde un punto distinto alrededor del racimo (ángulo áureo para repartirlos)
      const estado = frutos.map((b, i) => {
        const angulo = (i * 137.5 * Math.PI) / 180;
        const lejos = 110 + (i % 4) * 45;
        return { b, ox: Math.cos(angulo) * lejos, oy: Math.sin(angulo) * lejos - 70, e: 0, rx: 0, ry: 0, cx: 0, cy: 0 };
      });
      const pintar = (s) => {
        const falta = 1 - s.e;
        s.b.style.transform = `translate3d(${(s.ox * falta + s.rx).toFixed(1)}px, ${(s.oy * falta + s.ry).toFixed(1)}px, 0) scale(${(0.5 + 0.5 * s.e).toFixed(3)})`;
        s.b.style.opacity = s.e.toFixed(3);
      };
      racimo.classList.add('racimo--vivo');
      let armado = -1;
      tareas.add((y, alto) => {
        const r = lienzo.getBoundingClientRect();
        if (r.top > alto * 1.2 && armado <= 0) return;
        const p = limitar((alto * 0.95 - r.top) / (alto * 0.6), 0, 1);
        if (p === armado) return;
        armado = p;
        estado.forEach((s, i) => { const t = limitar(p * 1.7 - i * 0.07, 0, 1); s.e = 1 - (1 - t) ** 3; pintar(s); });
        racimo.classList.toggle('racimo--armado', p >= 0.92);   // cuando ya llegó el último fruto, las hojas caen encima
      });
      if (fino.matches) {
        let px = 0;
        let py = 0;
        let dentro = false;
        let pendiente = false;
        const centros = () => estado.forEach((s) => { const li = s.b.parentElement; s.cx = li.offsetLeft + li.offsetWidth / 2; s.cy = li.offsetTop + li.offsetHeight / 2; });
        const apartar = () => {
          pendiente = false;
          const RADIO = 150;
          estado.forEach((s) => {
            let rx = 0;
            let ry = 0;
            if (dentro) {
              const dx = s.cx - px;
              const dy = s.cy - py;
              const dist = Math.hypot(dx, dy);
              if (dist < RADIO && dist > 0.1) { const fuerza = (1 - dist / RADIO) * 16 * Math.min(1, dist / 60); rx = (dx / dist) * fuerza; ry = (dy / dist) * fuerza; }
            }
            s.rx = rx; s.ry = ry;
            pintar(s);
          });
        };
        const pedirApartar = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(apartar); } };
        lienzo.addEventListener('pointermove', (e) => { const r = listaFrutos.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; dentro = true; pedirApartar(); });
        lienzo.addEventListener('pointerleave', () => { dentro = false; pedirApartar(); });
        centros();
        addEventListener('resize', centros, { passive: true });
      }
    }
  }

  /* ---------- Aparición al entrar en pantalla, pilares que se llenan y logo del pie que se arma ---------- */
  const porRevelar = $$('[data-revelar], [data-armar]');
  if ('IntersectionObserver' in window) {
    const ojo = new IntersectionObserver((entradas) => entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visto');
      ojo.unobserve(e.target);
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    porRevelar.forEach((el) => ojo.observe(el));
    const centro = new IntersectionObserver((entradas) => entradas.forEach((e) => e.target.classList.toggle('activo', e.isIntersecting)), { rootMargin: '-42% 0px -42% 0px' });
    pilares.forEach((el) => centro.observe(el));
  } else {
    porRevelar.forEach((el) => el.classList.add('visto'));
  }

  /* ---------- Con cursor: las piezas se inclinan y los botones se dejan atraer ---------- */
  if (fino.matches && !quieto.matches) {
    $$('[data-inclinar]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (e.buttons) return;                           // mientras se arrastra el riel no se inclinan
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(py * -7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) scale(1.02)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    $$('.boton').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1)}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Visor de trabajos ---------- */
  const visor = $('[data-visor]');
  if (visor && visor.showModal) {
    const imgVisor = $('[data-visor-img]', visor);
    const titulo = $('[data-visor-titulo]', visor);
    $$('[data-ampliar]').forEach((boton) => boton.addEventListener('click', () => {
      const img = $('img', boton.closest('.obra'));
      const fuente = /\.avif(\?|$)/.test(img.currentSrc) ? $('source', img.closest('picture')).srcset : img.srcset;
      imgVisor.src = fuente.split(',').pop().trim().split(/\s+/)[0];
      imgVisor.alt = img.alt;
      imgVisor.width = img.width; imgVisor.height = img.height;
      titulo.textContent = boton.textContent.trim();
      visor.showModal();
    }));
    $('[data-visor-cerrar]', visor).addEventListener('click', () => visor.close());
    visor.addEventListener('click', (e) => { if (e.target === visor || e.target.classList.contains('visor__lienzo')) visor.close(); });
    visor.addEventListener('close', () => { imgVisor.removeAttribute('src'); });
  }

  /* ---------- Formulario: valida al salir del campo y pone el error junto a él ---------- */
  const formulario = $('[data-formulario]');
  if (formulario) {
    const estado = $('[data-formulario-estado]', formulario);
    const campos = $$('input, textarea', formulario);
    const validar = (campo) => {
      const valor = campo.value.trim();
      let bien = valor.length > 0;
      if (bien && campo.type === 'email') bien = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
      const error = d.getElementById(campo.getAttribute('aria-describedby'));
      campo.setAttribute('aria-invalid', String(!bien));
      error.textContent = bien ? '' : campo.dataset.error;
      error.hidden = bien;
      return bien;
    };
    campos.forEach((campo) => {
      campo.addEventListener('blur', () => { if (campo.value.trim() || campo.hasAttribute('aria-invalid')) validar(campo); });
      campo.addEventListener('input', () => { if (campo.getAttribute('aria-invalid') === 'true') validar(campo); });
    });
    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      const malos = campos.filter((c) => !validar(c));
      if (malos.length) { estado.textContent = ''; delete estado.dataset.tipo; malos[0].focus(); return; }
      const nombre = campos[0].value.trim().split(/\s+/)[0];
      estado.dataset.tipo = 'ok';
      estado.textContent = formulario.dataset.enviado.replace('{nombre}', nombre);
      formulario.reset();
      campos.forEach((c) => c.removeAttribute('aria-invalid'));
    });
  }

  /* ---------- Hora local de quien visita ---------- */
  const hora = $('[data-hora]');
  if (hora) {
    try {
      const ahora = new Date();
      const texto = new Intl.DateTimeFormat(raiz.lang || 'es', { hour: 'numeric', minute: '2-digit', hour12: true }).format(ahora);
      // En español la una va en singular: «Es la 1:05», «Son las 2:05»
      hora.textContent = (ahora.getHours() % 12 === 1 ? hora.dataset.una : hora.dataset.varias).replace('{hora}', texto);
      hora.hidden = false;
    } catch { /* sin Intl: la línea no se muestra */ }
  }

  /* ---------- Enlaces que la demo aún no tiene ---------- */
  const aviso = $('[data-aviso]');
  let relojAviso;
  $$('[data-pendiente]').forEach((b) => b.addEventListener('click', () => {
    if (!aviso) return;
    aviso.textContent = aviso.dataset.plantilla.replace('{nombre}', b.dataset.pendiente);
    aviso.hidden = false;
    clearTimeout(relojAviso);
    relojAviso = setTimeout(() => { aviso.hidden = true; }, 4500);
  }));

  pedir();
})();
