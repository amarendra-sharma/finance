/* ======================================================================
   fin-progress.js  —  MacroNations · Introduction to Finance progress reporter
   ----------------------------------------------------------------------
   ONE small module that the finance curriculum and every finance arena
   include. It owns:
     * the Supabase client (SAME project as StrategyArena — config in one place),
     * resolving the logged-in student + their finance course (same-origin session),
     * tiny helpers to record reading / quiz / arena progress.

   ISOLATION: this course writes to its OWN tables, prefixed `fin_`, so its
   data never collides with the StrategyArena `sa_` tables even though both
   live in the same Supabase project. Auth is project-level, so a student who
   logged into the MacroNations console (index.html) is already authenticated
   here — no second login.

   Because every MacroNations file is served from the same GitHub Pages origin,
   the login session persisted by the shell lives in localStorage that THIS
   file can read too. If the visitor is NOT logged in, every helper simply
   no-ops quietly (so the curriculum/arenas still work standalone for anonymous
   readers).

   USAGE in a host file:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="fin-progress.js"></script>
     ... then call, e.g.:
     FINProgress.recordQuiz(6, 80, true);
     FINProgress.markReadingDone(6);
     FINProgress.recordArena('portfolio', 0.82, 'win', { rounds: 10 });

   No optional chaining / nullish coalescing (Safari-safe), all logic here.
   ====================================================================== */
(function (global) {
  'use strict';

  // SAME Supabase project as StrategyArena (shared MacroNations backend).
  var SUPABASE_URL = 'https://qgelvmefyexyzpwqupev.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZWx2bWVmeWV4eXpwd3F1cGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDY5ODAsImV4cCI6MjA5NjAyMjk4MH0.AR55GBLefKHfs9ncWWzEFks_VISPjJtbW8SezyjM3lc';

  // Guard: if the supabase-js CDN script is missing, expose no-op helpers so
  // host pages never crash.
  if (!global.supabase || !global.supabase.createClient) {
    global.FINProgress = makeNoop('supabase-js not loaded');
    return;
  }

  var sb = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Cached identity, resolved once.
  var ready = null;          // a Promise resolving to { user, courseId } or null
  var ctx = null;            // resolved context once known

  function resolveContext() {
    if (ready) { return ready; }
    ready = sb.auth.getSession().then(function (res) {
      var session = (res && res.data) ? res.data.session : null;
      if (!session || !session.user) { ctx = null; return null; }
      var user = session.user;
      // Resolve the student's PRIMARY finance course the SAME way the app shell
      // does, so reading/quiz writes land on the course the progress view reads
      // from. Preference: a professor's course the student joined, else their
      // self-study course, else any enrollment.
      return sb.from('fin_enrollments').select('course_id, fin_courses(owner_id)')
        .eq('student_id', user.id)
        .then(function (enr) {
          var rows = (enr && enr.data) ? enr.data : [];
          var profCourse = null, selfCourse = null, anyCourse = null, i;
          for (i = 0; i < rows.length; i++) {
            anyCourse = rows[i].course_id;
            var oc = rows[i].fin_courses ? rows[i].fin_courses.owner_id : null;
            if (oc === user.id) { selfCourse = rows[i].course_id; }
            else if (oc && !profCourse) { profCourse = rows[i].course_id; }
          }
          var courseId = profCourse ? profCourse : (selfCourse ? selfCourse : anyCourse);
          ctx = { user: user, courseId: courseId };
          return ctx;
        });
    }).catch(function () { ctx = null; return null; });
    return ready;
  }

  // ---- Public helpers --------------------------------------------------

  // Upsert reading completion for a chapter.
  function markReadingDone(chapter) {
    return resolveContext().then(function (c) {
      if (!c || !c.courseId) { return null; }
      return sb.from('fin_chapter_progress').upsert({
        student_id: c.user.id,
        course_id: c.courseId,
        chapter: chapter,
        reading_done: true
      }, { onConflict: 'student_id,course_id,chapter' });
    }).catch(function () { return null; });
  }

  // Record a quiz result (score is 0..100 percent here; stored as 0..1 fraction).
  function recordQuiz(chapter, percent, passed) {
    return resolveContext().then(function (c) {
      if (!c || !c.courseId) { return null; }
      var frac = (typeof percent === 'number') ? (percent / 100) : null;
      return sb.from('fin_chapter_progress').upsert({
        student_id: c.user.id,
        course_id: c.courseId,
        chapter: chapter,
        quiz_score: frac,
        quiz_passed: passed === true,
        reading_done: true            // passing the chapter quiz implies it was read
      }, { onConflict: 'student_id,course_id,chapter' });
    }).catch(function () { return null; });
  }

  // Record an arena session.
  function recordArena(slug, score, outcome, detail) {
    return resolveContext().then(function (c) {
      if (!c) { return null; }
      var row = {
        student_id: c.user.id,
        course_id: c.courseId,            // may be null; column is nullable
        arena_slug: slug,
        score: (typeof score === 'number') ? score : null,
        outcome: outcome ? String(outcome) : null,
        details: detail ? detail : null
      };
      return sb.from('fin_arena_results').insert(row);
    }).catch(function () { return null; });
  }

  // Lightweight telemetry event (optional; feeds the concept-mastery heatmap).
  function logEvent(eventType, fields) {
    return resolveContext().then(function (c) {
      if (!c) { return null; }
      var row = { student_id: c.user.id, course_id: c.courseId, event_type: String(eventType) };
      if (fields) {
        if (fields.chapter !== undefined) { row.chapter = fields.chapter; }
        if (fields.concept_tag !== undefined) { row.concept_tag = fields.concept_tag; }
        if (fields.value_num !== undefined) { row.value_num = fields.value_num; }
        if (fields.detail !== undefined) { row.detail = fields.detail; }
      }
      return sb.from('fin_telemetry').insert(row);
    }).catch(function () { return null; });
  }

  // Is someone logged in? (resolves to boolean) — handy for host UIs.
  function isSignedIn() {
    return resolveContext().then(function (c) { return !!c; });
  }

  // ---- Universal arena session auto-reporter ---------------------------
  // An arena calls FINProgress.initArena({ slug, getSession }) once at load.
  //   slug       : the arena's slug (e.g. 'portfolio')
  //   getSession : a function returning { score, outcome, detail } at any time,
  //                reading from that arena's own State. May return null if the
  //                student never actually engaged (we skip empty sessions).
  // We report exactly once, when the game explicitly signals completion (via
  // FINProgress.reportArenaNow()) or when the page is hidden AFTER completion.
  function initArena(opts) {
    if (!opts || !opts.slug || typeof opts.getSession !== 'function') { return; }
    var recorded = false;     // ensure AT MOST ONE row per arena session

    function flush() {
      if (recorded) { return; }
      var snap;
      try { snap = opts.getSession(); } catch (e) { snap = null; }
      if (!snap) { return; }                 // nothing meaningful yet — skip
      recorded = true;
      var score = (snap.score !== undefined && snap.score !== null) ? snap.score : null;
      var outcome = snap.outcome ? snap.outcome : 'completed';
      var detail = snap.detail ? snap.detail : null;
      recordArena(opts.slug, score, outcome, detail);
    }

    // A flush on leaving happens ONLY if the game has already signalled that the
    // session is complete, so a finished-but-unsaved result is still not lost,
    // and switching tabs mid-game never writes a partial score.
    function flushIfComplete() {
      try {
        if (global.FINProgress && global.FINProgress._sessionComplete) { flush(); }
      } catch (e) { /* never let a page-exit handler throw */ }
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { flushIfComplete(); }
    });
    window.addEventListener('pagehide', flushIfComplete);
    window.addEventListener('beforeunload', flushIfComplete);

    global.FINProgress.markComplete = function () { global.FINProgress._sessionComplete = true; };
    // Explicit "match complete" trigger the game calls for a reliable, timely
    // single write (recommended: call FINProgress.reportArenaNow() at match end).
    global.FINProgress.reportArenaNow = function () {
      global.FINProgress._sessionComplete = true;   // an explicit save IS completion
      return flush();
    };
  }

  function makeNoop(reason) {
    function noop() { return Promise.resolve(null); }
    return {
      markReadingDone: noop, recordQuiz: noop, recordArena: noop,
      logEvent: noop, isSignedIn: function () { return Promise.resolve(false); },
      initArena: function () {}, reportArenaNow: function () {}, markComplete: function () {},
      trackReading: function () {}, _disabled: reason
    };
  }

  /* ====================================================================
     READING ENFORCEMENT
     --------------------------------------------------------------------
     Reading completion is EARNED, not self-declared. A chapter only counts
     as read when the student has genuinely gone through it:
       (1) COVERAGE: every section of the chapter must actually scroll into
           view (tracked per-section via IntersectionObserver).
       (2) DWELL: cumulative *active* time on the chapter must reach a floor
           scaled to the chapter's length. Time only accrues while visible.
     Only when BOTH are satisfied do we call markReadingDone(chapter).
     Caller invokes FINProgress.trackReading(chapterEl, n, mins).
     ==================================================================== */
  var _activeTracker = null;

  function trackReading(chapterEl, chapterNum, estMinutes) {
    if (!chapterEl || !chapterNum) { return; }
    if (_activeTracker && _activeTracker.teardown) { _activeTracker.teardown(); }

    var sections = [].slice.call(chapterEl.querySelectorAll('h2, h3'));
    if (sections.length < 2) {
      sections = [].slice.call(chapterEl.querySelectorAll('p, .cnl-section, .chapter-quiz')).filter(function (el, i) {
        return i % 3 === 0;
      });
    }
    var totalSections = sections.length > 0 ? sections.length : 1;

    var mins = (typeof estMinutes === 'number' && estMinutes > 0) ? estMinutes : 6;
    var floorMs = Math.max(45000, Math.min(12 * 60000, Math.round(mins * 60000 * 0.35)));

    var seen = {};
    var seenCount = 0;
    var activeMs = 0;
    var lastTick = Date.now();
    var done = false;
    var recorded = false;

    var ind = document.createElement('div');
    ind.setAttribute('data-fin-reading-indicator', '1');
    ind.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;background:#0f1b33;color:#EAF2FF;border:1px solid rgba(56,189,248,.4);border-radius:12px;padding:10px 13px;font:12.5px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:230px;';
    document.body.appendChild(ind);
    function pct(x) { return Math.max(0, Math.min(100, Math.round(x * 100))); }
    function paint() {
      if (done) {
        ind.innerHTML = '<b style="color:#34d399;">✓ Chapter ' + chapterNum + ' read</b><div style="opacity:.8;margin-top:2px;">Progress saved.</div>';
        return;
      }
      var cov = seenCount / totalSections;
      var dwell = activeMs / floorMs;
      ind.innerHTML =
        '<b>Reading Chapter ' + chapterNum + '</b>' +
        '<div style="margin-top:6px;">Sections viewed: ' + seenCount + ' / ' + totalSections + '</div>' +
        '<div style="height:5px;background:rgba(255,255,255,.12);border-radius:3px;margin:3px 0 6px;overflow:hidden;"><div style="height:100%;width:' + pct(cov) + '%;background:#38BDF8;"></div></div>' +
        '<div>Time on chapter: ' + pct(dwell) + '%</div>' +
        '<div style="height:5px;background:rgba(255,255,255,.12);border-radius:3px;margin:3px 0 0;overflow:hidden;"><div style="height:100%;width:' + pct(dwell) + '%;background:#34D399;"></div></div>';
    }

    function maybeComplete() {
      if (done) { return; }
      if (seenCount >= totalSections && activeMs >= floorMs) {
        done = true;
        paint();
        if (!recorded) {
          recorded = true;
          markReadingDone(chapterNum);
        }
        setTimeout(function () { if (ind && ind.parentNode) { ind.style.transition = 'opacity .6s'; ind.style.opacity = '0'; setTimeout(function(){ if(ind.parentNode){ ind.parentNode.removeChild(ind); } }, 700); } }, 4000);
      }
    }

    var io = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var idx = sections.indexOf(e.target);
            if (idx >= 0 && !seen[idx]) { seen[idx] = true; seenCount++; paint(); maybeComplete(); }
          }
        });
      }, { threshold: 0.6 });
      sections.forEach(function (el) { io.observe(el); });
    } else {
      seenCount = totalSections;
    }

    var timer = setInterval(function () {
      var now = Date.now();
      if (document.visibilityState === 'visible') { activeMs += (now - lastTick); }
      lastTick = now;
      paint();
      maybeComplete();
    }, 1000);
    function onVis() { lastTick = Date.now(); }
    document.addEventListener('visibilitychange', onVis);

    paint();

    _activeTracker = {
      teardown: function () {
        if (io) { io.disconnect(); }
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVis);
        if (ind && ind.parentNode) { ind.parentNode.removeChild(ind); }
        _activeTracker = null;
      }
    };
  }

  global.FINProgress = {
    markReadingDone: markReadingDone,
    recordQuiz: recordQuiz,
    recordArena: recordArena,
    logEvent: logEvent,
    isSignedIn: isSignedIn,
    initArena: initArena,
    trackReading: trackReading,
    _client: sb
  };
})(window);
