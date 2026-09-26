/* ================================================================
   SoluDe.bot — interactions
   ================================================================ */

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ NAV (mobile toggle + close on link tap) ============ */

  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.getElementById('nav-links');

  navToggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  navLinks.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* ============ SCROLL REVEAL ============ */

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ============ LOOP LATENCY READOUT ============ */

  var loopEl = document.getElementById('loop-ms');
  if (loopEl && !reducedMotion) {
    setInterval(function () {
      loopEl.textContent = (1.8 + Math.random() * 2.6).toFixed(1);
    }, 900);
  }

  /* ============ CONTACT FORM ============ */

  var chipRow = document.getElementById('chip-row');
  chipRow.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (chip) {
      var active = chip.classList.toggle('active');
      chip.setAttribute('aria-pressed', String(active));
    }
  });

  var form = document.getElementById('integration-form');
  var statusEl = document.getElementById('form-status');
  var nameInput = document.getElementById('f-name');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!nameInput.value.trim() || !form.checkValidity()) {
      statusEl.classList.add('error');
      statusEl.textContent = '// CHECK YOUR NAME AND EMAIL';
      if (!nameInput.value.trim()) nameInput.focus();
      else form.reportValidity();
      return;
    }
    statusEl.classList.remove('error');
    var interests = Array.from(chipRow.querySelectorAll('.chip.active')).map(function (chip) { return chip.dataset.value; });
    var body = 'Name: ' + nameInput.value.trim() + '\nEmail: ' + document.getElementById('f-email').value.trim() +
      '\nOrganization: ' + document.getElementById('f-org').value.trim() + '\nInterest: ' + (interests.join(', ') || 'General enquiry') +
      '\n\nRequirements:\n' + document.getElementById('f-detail').value.trim();
    var mailto = 'mailto:architecture@solude.bot?subject=' + encodeURIComponent('SoluDe.bot enquiry — ' + (interests.join(', ') || 'Automation')) + '&body=' + encodeURIComponent(body);
    window.location.href = mailto;
    statusEl.textContent = '// EMAIL DRAFT PREPARED — SEND IT FROM YOUR EMAIL APP. If it did not open, email architecture@solude.bot directly.';

  });

  nameInput.addEventListener('input', function () {
    nameInput.classList.remove('invalid');
    if (statusEl.classList.contains('error')) {
      statusEl.classList.remove('error');
      statusEl.textContent = '';
    }
  });

  document.querySelectorAll('[data-model]').forEach(function (link) {
    link.addEventListener('click', function () {
      chipRow.querySelectorAll('.chip').forEach(function (chip) {
        var selected = chip.dataset.value === link.dataset.model;
        chip.classList.toggle('active', selected);
        chip.setAttribute('aria-pressed', String(selected));
      });
    });
  });

  nav.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.focus();
    }
  });

  /* ============ HERO CANVAS — robotic arm IK ============ */

  var canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;

  var ACCENT = '#c8ff4d';
  var GRID = 'rgba(255,255,255,0.045)';

  // Three-segment arm, solved with CCD each frame.
  var arm = {
    base: { x: 0, y: 0 },
    lengths: [0, 0, 0],
    angles: [-Math.PI / 3, Math.PI / 4, Math.PI / 5]
  };

  var target = { x: 0, y: 0 };     // eased target the arm chases
  var waypoint = { x: 0, y: 0 };   // current goal the target eases toward
  var waypointTimer = 0;
  var trail = [];
  var TRAIL_MAX = 90;
  var particles = [];
  var ringPhase = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var isNarrow = W < 720;
    arm.base.x = isNarrow ? W * 0.5 : W * 0.62;
    arm.base.y = H * 0.96;

    var reach = Math.min(W * 0.42, H * 0.78);
    arm.lengths = [reach * 0.42, reach * 0.34, reach * 0.24];

    if (particles.length === 0) {
      var count = Math.floor((W * H) / 26000);
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          r: Math.random() * 1.4 + 0.4
        });
      }
    }

    pickWaypoint();
    target.x = waypoint.x;
    target.y = waypoint.y;
  }

  function pickWaypoint() {
    // Somewhere in the reachable envelope, biased upward and away from the copy block.
    var reach = arm.lengths[0] + arm.lengths[1] + arm.lengths[2];
    var angle = -Math.PI * (0.18 + Math.random() * 0.64); // above the base
    var radius = reach * (0.45 + Math.random() * 0.45);
    waypoint.x = arm.base.x + Math.cos(angle) * radius;
    waypoint.y = arm.base.y + Math.sin(angle) * radius;
    waypoint.x = Math.max(40, Math.min(W - 40, waypoint.x));
    waypoint.y = Math.max(H * 0.12, Math.min(H * 0.82, waypoint.y));
    waypointTimer = 140 + Math.random() * 120; // frames until next goal
  }

  function forwardKinematics() {
    var pts = [{ x: arm.base.x, y: arm.base.y }];
    var a = 0;
    for (var i = 0; i < 3; i++) {
      a += arm.angles[i];
      pts.push({
        x: pts[i].x + Math.cos(a) * arm.lengths[i],
        y: pts[i].y + Math.sin(a) * arm.lengths[i]
      });
    }
    return pts;
  }

  function solveCCD() {
    // A few damped CCD passes per frame gives smooth, organic motion.
    for (var pass = 0; pass < 3; pass++) {
      for (var j = 2; j >= 0; j--) {
        var pts = forwardKinematics();
        var joint = pts[j];
        var end = pts[3];
        var toEnd = Math.atan2(end.y - joint.y, end.x - joint.x);
        var toTarget = Math.atan2(target.y - joint.y, target.x - joint.x);
        var delta = toTarget - toEnd;
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        arm.angles[j] += delta * 0.08;
      }
    }
  }

  function drawGrid() {
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0.5; x < W; x += 56) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (var y = 0.5; y < H; y += 56) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }

  function drawParticles() {
    ctx.fillStyle = 'rgba(232,230,225,0.14)';
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTrail() {
    if (trail.length < 2) return;
    for (var i = 1; i < trail.length; i++) {
      var alpha = (i / trail.length) * 0.35;
      ctx.strokeStyle = 'rgba(200,255,77,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
  }

  function drawTarget() {
    var s = 14;
    ctx.strokeStyle = 'rgba(200,255,77,0.85)';
    ctx.lineWidth = 1;

    // crosshair
    ctx.beginPath();
    ctx.moveTo(waypoint.x - s, waypoint.y); ctx.lineTo(waypoint.x - 4, waypoint.y);
    ctx.moveTo(waypoint.x + 4, waypoint.y); ctx.lineTo(waypoint.x + s, waypoint.y);
    ctx.moveTo(waypoint.x, waypoint.y - s); ctx.lineTo(waypoint.x, waypoint.y - 4);
    ctx.moveTo(waypoint.x, waypoint.y + 4); ctx.lineTo(waypoint.x, waypoint.y + s);
    ctx.stroke();

    // rotating ring segments
    ringPhase += 0.02;
    ctx.beginPath();
    for (var k = 0; k < 3; k++) {
      var start = ringPhase + (k * Math.PI * 2) / 3;
      ctx.moveTo(waypoint.x + Math.cos(start) * 22, waypoint.y + Math.sin(start) * 22);
      ctx.arc(waypoint.x, waypoint.y, 22, start, start + 0.9);
    }
    ctx.stroke();

    // coordinates label
    ctx.fillStyle = 'rgba(154,160,155,0.75)';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText(
      'X ' + waypoint.x.toFixed(0) + '  Y ' + waypoint.y.toFixed(0),
      waypoint.x + 28, waypoint.y + 4
    );
  }

  function drawArm() {
    var pts = forwardKinematics();

    // base plate
    ctx.strokeStyle = 'rgba(200,255,77,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x - 26, pts[0].y);
    ctx.lineTo(pts[0].x + 26, pts[0].y);
    ctx.stroke();

    // segments — tapering width, soft glow
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(200,255,77,0.5)';
    ctx.shadowBlur = 10;
    var widths = [4, 3, 2];
    for (var i = 0; i < 3; i++) {
      ctx.strokeStyle = 'rgba(200,255,77,0.9)';
      ctx.lineWidth = widths[i];
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // joints
    for (var j = 0; j < 3; j++) {
      ctx.fillStyle = '#0b0c0d';
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pts[j].x, pts[j].y, j === 0 ? 8 : 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // end effector — simple two-finger gripper aimed at the target
    var end = pts[3];
    var wrist = pts[2];
    var heading = Math.atan2(end.y - wrist.y, end.x - wrist.x);
    var spread = 0.5;
    var fingerLen = 12;
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x + Math.cos(heading + spread) * fingerLen, end.y + Math.sin(heading + spread) * fingerLen);
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x + Math.cos(heading - spread) * fingerLen, end.y + Math.sin(heading - spread) * fingerLen);
    ctx.stroke();

    return end;
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawParticles();

    // ease the live target toward the waypoint
    target.x += (waypoint.x - target.x) * 0.03;
    target.y += (waypoint.y - target.y) * 0.03;

    if (--waypointTimer <= 0) pickWaypoint();

    solveCCD();
    drawTrail();
    drawTarget();
    var end = drawArm();

    trail.push({ x: end.x, y: end.y });
    if (trail.length > TRAIL_MAX) trail.shift();
  }

  var running = false;
  var rafId = null;

  function loop() {
    frame();
    if (running) rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (!running) { running = true; rafId = requestAnimationFrame(loop); }
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  window.addEventListener('resize', function () {
    resize();
    if (reducedMotion) frame();
  });

  resize();

  if (reducedMotion) {
    // settle the arm into a pose, then render one static frame
    for (var i = 0; i < 120; i++) { solveCCD(); }
    frame();
  } else if ('IntersectionObserver' in window) {
    // only animate while the hero is on screen
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? start() : stop();
    }, { threshold: 0.05 }).observe(canvas);
  } else {
    start();
  }
})();
