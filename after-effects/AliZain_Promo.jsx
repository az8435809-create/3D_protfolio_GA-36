/*  Ali Zain — 46 s portfolio promo, rebuilt as an editable Adobe After Effects project.
    ---------------------------------------------------------------------------------
    HOW TO RUN (After Effects 2022 or newer):
      1. Install the fonts Playfair Display and Manrope (free, Google Fonts) — AE substitutes them if missing.
      2. File ▸ Scripts ▸ Run Script File…  and choose this file (keep the "assets" folder next to it).
      3. A comp "Ali Zain — Promo (46s)" is created with 7 scenes, markers, keyframed typography,
         gold wipe transitions, Glow, film grain, a 3D certificate, a 3D project carousel and the soundtrack.
      4. Composition ▸ Add to Render Queue → H.264 (or Media Encoder) → 1920×1080, 30 fps.

    Scene map (markers are added on the timeline):
      0.0  Title "Ali Zain"           5.6  Intro + character         11.2 Skills (counters + bars)
      18.2 Projects (3D carousel)     28.2 3D avatar (rendered clip) 34.2 Achievements + certificate
      40.2 Call to action + email     44.6 End card
*/
(function () {
    app.beginUndoGroup("Build Ali Zain promo");
    var here = new File($.fileName).parent;
    var A = here.fsName + "/assets/";
    var W = 1920, H = 1080, FPS = 30, DUR = 46;
    var GOLD = [217/255, 168/255, 33/255], GOLD2 = [232/255, 185/255, 35/255], CREAM = [245/255, 240/255, 230/255],
        BG = [18/255, 33/255, 26/255], INK = [19/255, 32/255, 15/255], GREY = [201/255, 207/255, 201/255];
    var SERIF = "PlayfairDisplay-Bold", SERIF_I = "PlayfairDisplay-Italic", SANS = "Manrope-ExtraBold", SANS_R = "Manrope-Regular";

    // ---------- project items ----------
    var folder = app.project.items.addFolder("Ali Zain Promo");
    function imp(name) {
        var f = new File(A + name);
        if (!f.exists) { $.writeln("missing " + name); return null; }
        var io = new ImportOptions(f); var it = app.project.importFile(io); it.parentFolder = folder; return it;
    }
    var aliImg = imp("ali.png"), certImg = imp("certificate.png"), audio = imp("soundtrack.wav"), avatarClip = imp("avatar_3d.mp4");
    var covers = []; for (var c = 1; c <= 6; c++) covers.push(imp("project-0" + c + ".png"));
    var comp = app.project.items.addComp("Ali Zain — Promo (46s)", W, H, 1, DUR, FPS);
    comp.parentFolder = folder; comp.bgColor = BG;

    // ---------- helpers ----------
    function ease(prop) { try { for (var k = 1; k <= prop.numKeys; k++) { var e = new KeyframeEase(0, 80); var d = prop.value instanceof Array ? prop.value.length : 1; var arr = []; for (var i = 0; i < (prop.propertyValueType == PropertyValueType.TwoD_SPATIAL || prop.propertyValueType == PropertyValueType.ThreeD_SPATIAL ? 1 : d); i++) arr.push(e); prop.setTemporalEaseAtKey(k, arr, arr); } } catch (err) { } }
    function keys(prop, list) { for (var i = 0; i < list.length; i++) prop.setValueAtTime(list[i][0], list[i][1]); ease(prop); }
    function span(layer, a, b) { layer.inPoint = Math.max(0, a); layer.outPoint = Math.min(DUR, b); }
    function solid(name, col, a, b, w, h) { var s = comp.layers.addSolid(col, name, w || W, h || H, 1, DUR); span(s, a, b); return s; }
    function text(str, opt) {
        var l = comp.layers.addText(str); var tp = l.property("Source Text"); var d = tp.value;
        d.resetCharStyle(); d.fontSize = opt.size || 80; d.fillColor = opt.color || CREAM; try { d.font = opt.font || SERIF; } catch (e) { }
        d.applyFill = true; d.applyStroke = false; d.justification = opt.center ? ParagraphJustification.CENTER_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
        if (opt.tracking) d.tracking = opt.tracking; tp.setValue(d);
        l.property("Position").setValue(opt.pos); span(l, opt.a, opt.b); l.name = opt.name || str.substr(0, 24);
        return l;
    }
    function fadeUp(l, a, b, dist) {             // fade + rise in at a, fade out at b
        var p = l.property("Position"), v = p.value, o = l.property("Opacity");
        keys(p, [[a, [v[0], v[1] + (dist || 50)]], [a + .8, v]]);
        keys(o, [[a, 0], [a + .7, 100], [b - .5, 100], [b, 0]]);
    }
    function wordReveal(l, a, dur) {             // per-word rise using a Text Animator
        try {
            var an = l.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            an.name = "Word reveal";
            an.property("ADBE Text Animator Properties").addProperty("ADBE Text Position 3D").setValue([0, 110, 0]);
            an.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity").setValue(0);
            var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            try { sel.property("ADBE Text Range Advanced").property("ADBE Text Range Type2").setValue(3); } catch (e) { }   // based on words
            try { sel.property("ADBE Text Range Advanced").property("ADBE Text Range Shape").setValue(2); } catch (e) { }   // ramp up
            keys(sel.property("ADBE Text Percent Offset"), [[a, 0], [a + (dur || 1.2), 100]]);
        } catch (err) { fadeUp(l, a, l.outPoint); }
    }
    function glow(l, r) { try { var g = l.property("ADBE Effect Parade").addProperty("ADBE Glo2"); g.property("ADBE Glo2-0003").setValue(r || 30); g.property("ADBE Glo2-0004").setValue(.6); } catch (e) { } }
    function floatExpr(l, amp) { try { l.property("Position").expression = "[value[0], value[1] + Math.sin(time*1.05)*" + (amp || 8) + "]"; } catch (e) { } }
    function counter(l, target, a, b, suffix) {
        var sl = l.property("ADBE Effect Parade").addProperty("ADBE Slider Control"); sl.name = "Count";
        keys(sl.property(1), [[a, 0], [b, target]]);
        l.property("Source Text").expression = 'Math.round(effect("Count")("Slider")) + "' + (suffix || "") + '"';
    }
    function marker(t, name) { var m = new MarkerValue(name); comp.markerProperty.setValueAtTime(t, m); }

    // ---------- background + atmosphere ----------
    var bg = solid("Background", BG, 0, DUR);
    try { var rr = bg.property("ADBE Effect Parade").addProperty("ADBE Ramp"); rr.property(1).setValue([W * .7, H * .35]); rr.property(2).setValue([.12, .2, .15]); rr.property(3).setValue([W * .2, H]); rr.property(4).setValue([.04, .08, .06]); rr.property(5).setValue(2); } catch (e) { }
    if (aliImg) { /* placeholder so the folder sorts nicely */ }

    // ---------- S1 title (0–5.6) ----------
    marker(0, "Title");
    var peak = comp.layers.addShape(); peak.name = "Peak logo"; span(peak, 0, 5.6);
    var pg = peak.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"), pv = pg.property("ADBE Vectors Group");
    var path = pv.addProperty("ADBE Vector Shape - Group"), sh = new Shape();
    sh.vertices = [[-150, 60], [-60, -24], [-24, 12], [27, -45], [150, 60]]; sh.closed = false; path.property("ADBE Vector Shape").setValue(sh);
    var st = pv.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue(GOLD); st.property("ADBE Vector Stroke Width").setValue(5);
    var trim = pv.addProperty("ADBE Vector Filter - Trim"); keys(trim.property("ADBE Vector Trim End"), [[.3, 0], [1.6, 100]]);
    peak.property("Position").setValue([W / 2, 300]); keys(peak.property("Opacity"), [[4.8, 100], [5.4, 0]]); glow(peak, 20);
    var t1 = text("Ali Zain", { size: 230, center: true, pos: [W / 2, 600], a: 0, b: 5.6, name: "Title" }); wordReveal(t1, 1.0, .9);
    try { var tAn = t1.property("ADBE Text Properties").property("ADBE Text Animators").property(1).property("ADBE Text Selectors").property(1); tAn.property("ADBE Text Range Advanced").property("ADBE Text Range Type2").setValue(1); } catch (e) { }   // per character for the name
    keys(t1.property("Scale"), [[1, [100, 100]], [5.5, [106, 106]]]); keys(t1.property("Opacity"), [[4.9, 100], [5.5, 0]]);
    var sub = text("PORTFOLIO  ·  2026", { size: 26, font: SANS, color: GOLD2, center: true, tracking: 600, pos: [W / 2, 680], a: 2.5, b: 5.6 }); fadeUp(sub, 2.5, 5.4, 30);

    // ---------- S2 intro (5.6–11.2) ----------
    marker(5.6, "Intro");
    if (aliImg) {
        var hero = comp.layers.add(aliImg); span(hero, 5.6, 11.4); hero.name = "Character";
        hero.property("Scale").setValue([68, 68]); hero.property("Position").setValue([1490, 470]);
        keys(hero.property("Opacity"), [[5.8, 0], [6.8, 100], [10.9, 100], [11.3, 0]]);
        floatExpr(hero, 8); glow(hero, 60);
    }
    text("HELLO, I'M ALI ZAIN", { size: 24, font: SANS, color: GOLD2, tracking: 400, pos: [130, 270], a: 6.1, b: 11.2 }).name = "Hello label";
    var h2 = text("I Build Digital\rExperiences That\rReach New Heights.", { size: 104, pos: [130, 400], a: 6.2, b: 11.2, name: "Headline" }); wordReveal(h2, 6.3, 1.4);
    var s2p = text("Web Developer & UI Designer · Karachi, Pakistan", { size: 34, font: SANS_R, color: GREY, pos: [130, 800], a: 7.6, b: 11.2 }); fadeUp(s2p, 7.6, 11.1, 30);

    // ---------- S3 skills (11.2–18.2) ----------
    marker(11.2, "Skills");
    var ghost = text("ARSENAL · ARSENAL · ARSENAL", { size: 420, pos: [-200, 860], a: 11.2, b: 18.2, name: "Ghost text" });
    try { var gd = ghost.property("Source Text").value; gd.applyFill = false; gd.applyStroke = true; gd.strokeColor = GOLD; gd.strokeWidth = 2; ghost.property("Source Text").setValue(gd); } catch (e) { }
    ghost.property("Opacity").setValue(16); keys(ghost.property("Position"), [[11.2, [-200, 860]], [18.2, [-830, 860]]]);
    text("WHAT I BRING", { size: 24, font: SANS, color: GOLD2, tracking: 400, pos: [130, 140], a: 11.4, b: 18.2 });
    var s3h = text("My Arsenal", { size: 120, pos: [130, 280], a: 11.5, b: 18.2 }); fadeUp(s3h, 11.5, 18.1);
    var SK = [["HTML / CSS", 95], ["JavaScript", 90], ["React", 88], ["Next.js", 85], ["UI/UX Design", 92], ["Tailwind CSS", 93]];
    for (var i = 0; i < SK.length; i++) {
        var col = i % 2, row = Math.floor(i / 2), x = 130 + col * 890, y = 450 + row * 150, a = 12.1 + i * .22;
        var nm = text(SK[i][0], { size: 54, pos: [x, y], a: a, b: 18.2 }); fadeUp(nm, a, 18.1, 40);
        var pc = text("0%", { size: 60, color: GOLD2, pos: [x + 770, y], a: a, b: 18.2, name: SK[i][0] + " %" });
        try { pc.property("Source Text").value.justification = ParagraphJustification.RIGHT_JUSTIFY; } catch (e) { }
        counter(pc, SK[i][1], a + .3, a + 1.9, "%"); fadeUp(pc, a, 18.1, 40);
        var track = solid("Bar track " + (i + 1), [.2, .24, .21], a, 18.2, 770, 14); track.property("Position").setValue([x + 385, y + 40]);
        var fill = solid("Bar " + SK[i][0], GOLD2, a, 18.2, 770, 14); fill.property("Anchor Point").setValue([0, 7]); fill.property("Position").setValue([x, y + 40]);
        keys(fill.property("Scale"), [[a + .3, [0, 100]], [a + 1.9, [SK[i][1], 100]]]); glow(fill, 15);
    }
    var mqBand = solid("Marquee band", GOLD, 12.6, 18.2, 2100, 90); mqBand.property("Position").setValue([W / 2, 975]); mqBand.property("Rotation").setValue(-1.5);
    var mq = text("WEB DEVELOPMENT  ◆  UI/UX DESIGN  ◆  REACT  ◆  NEXT.JS  ◆  FIGMA  ◆  3D & MOTION  ◆  WEB DEVELOPMENT  ◆  UI/UX DESIGN", { size: 44, color: INK, pos: [0, 992], a: 12.6, b: 18.2, name: "Marquee text" });
    mq.property("Rotation").setValue(-1.5); keys(mq.property("Position"), [[12.6, [0, 992]], [18.2, [-900, 992]]]);

    // ---------- S4 projects: 3D carousel with a camera (18.2–28.2) ----------
    marker(18.2, "Projects");
    text("FEATURED WORK", { size: 24, font: SANS, color: GOLD2, tracking: 400, pos: [130, 110], a: 18.4, b: 28.2 });
    var s4h = text("Selected Expeditions", { size: 104, pos: [130, 240], a: 18.5, b: 28.2 }); fadeUp(s4h, 18.5, 28.1);
    var titles = ["Karachi Cyberpunk: Neon Rickshaw", "Rigged Stylized 3D Avatar", "60s Kinetic VFX Showreel", "Interactive 3D Portfolio", "Mohatta Palace VR Tour", "AI NPC Lore & Dialogue Engine"];
    var cats = ["GAME DEVELOPMENT", "3D CHARACTER", "MOTION DESIGN", "WEB EXPERIENCE", "VR EXPERIENCE", "AI ENGINEERING"];
    var rig = comp.layers.addNull(DUR); rig.name = "Carousel rig"; rig.threeDLayer = true; span(rig, 18.2, 28.2);
    keys(rig.property("Position"), [[18.6, [W / 2 + 1400, 550, 0]], [19.8, [W / 2, 550, 0]]]);
    var rigX = rig.property("Position");
    for (var k = 0; k <= 5; k++) { var tt = 19.6 + k * 1.45; if (k) rigX.setValueAtTime(tt, [W / 2 - k * 560, 550, 0]); if (k < 5) rigX.setValueAtTime(tt + .6, [W / 2 - k * 560, 550, 0]); }
    ease(rigX);
    for (var j = 0; j < 6; j++) {
        if (!covers[j]) continue;
        var cv = comp.layers.add(covers[j]); cv.threeDLayer = true; cv.parent = rig; span(cv, 18.2, 28.2); cv.name = "Project " + (j + 1);
        cv.property("Scale").setValue([50, 50, 50]); cv.property("Position").setValue([j * 560, 0, 0]);
        // cards turn and recede the further they are from screen centre
        cv.property("Y Rotation").expression = "var d=(toComp([0,0,0])[0]-thisComp.width/2)/560; -d*22";
        cv.property("Opacity").expression = "var d=Math.abs((toComp([0,0,0])[0]-thisComp.width/2)/560); Math.max(0,Math.min(100,(1.6-d*.45)*100))";
        var cap = text(cats[j] + "\r" + titles[j], { size: 62, center: true, pos: [W / 2, 880], a: 19.6 + j * 1.45 - .3, b: j == 5 ? 28.2 : 19.6 + (j + 1) * 1.45 - .3, name: "Caption " + (j + 1) });
        keys(cap.property("Opacity"), [[cap.inPoint, 0], [cap.inPoint + .3, 100], [cap.outPoint - .25, 100], [cap.outPoint, 0]]);
    }
    var cam = comp.layers.addCamera("Camera", [W / 2, H / 2]); span(cam, 18.2, 28.2);

    // ---------- S5 3D avatar (28.2–34.2) — rendered from the GLB in the browser ----------
    marker(28.2, "3D avatar");
    if (avatarClip) { var av = comp.layers.add(avatarClip); av.startTime = 28.2; span(av, 28.2, 34.4); av.name = "3D avatar (rendered)"; keys(av.property("Opacity"), [[28.2, 0], [28.6, 100]]); }
    text("NOW IN 3D", { size: 24, font: SANS, color: GOLD2, tracking: 400, pos: [1040, 280], a: 28.6, b: 34.2 });
    var s5h = text("Meet the\r3D Me", { size: 120, pos: [1040, 420], a: 28.7, b: 34.2 }); wordReveal(s5h, 28.7, .9);
    var chips = ["Modeled & textured", "18-bone rig", "4 expressions", "5 animations", "GLB for the web"];
    for (var q = 0; q < chips.length; q++) { var ch = text(chips[q], { size: 28, font: SANS, color: GOLD2, pos: [1040 + (q % 2) * 360, 690 + Math.floor(q / 2) * 70], a: 29.6 + q * .3, b: 34.2 }); fadeUp(ch, 29.6 + q * .3, 34.1, 30); }

    // ---------- S6 achievements (34.2–40.2) ----------
    marker(34.2, "Achievements");
    text("THE TRAIL SO FAR", { size: 24, font: SANS, color: GOLD2, tracking: 400, pos: [130, 160], a: 34.4, b: 40.2 });
    var ST = [[2, "YEARS"], [25, "PROJECTS"], [15, "HAPPY CLIENTS"]];
    for (var s = 0; s < 3; s++) {
        var sx = 130 + s * 280, n = text("0+", { size: 150, color: GOLD2, pos: [sx, 340], a: 34.6 + s * .25, b: 40.2, name: ST[s][1] });
        counter(n, ST[s][0], 34.8 + s * .25, 36.4 + s * .25, "+"); fadeUp(n, 34.6 + s * .25, 40.1, 50); glow(n, 20);
        var lb = text(ST[s][1], { size: 20, font: SANS, color: GREY, tracking: 300, pos: [sx, 400], a: 34.6 + s * .25, b: 40.2 }); fadeUp(lb, 34.6 + s * .25, 40.1, 50);
    }
    var line = solid("Timeline line", GOLD2, 35.6, 40.2, 760, 4); line.property("Anchor Point").setValue([0, 2]); line.property("Position").setValue([130, 600]);
    keys(line.property("Scale"), [[35.6, [0, 100]], [37.4, [100, 100]]]); glow(line, 15);
    var YRS = [["2023", "Started learning"], ["2024", "First freelance project"], ["2025", "Built 25+ projects"], ["2026", "Going international"]];
    for (var y2 = 0; y2 < 4; y2++) { var yt = text(YRS[y2][0] + "\r" + YRS[y2][1], { size: 40, color: GOLD2, font: SERIF_I, pos: [130 + y2 * 245, 680], a: 35.8 + y2 * .45, b: 40.2 }); fadeUp(yt, 35.8 + y2 * .45, 40.1, 30); }
    if (certImg) {
        var cert = comp.layers.add(certImg); cert.threeDLayer = true; span(cert, 34.2, 40.2); cert.name = "Certificate (3D)";
        cert.property("Scale").setValue([41, 41, 41]); cert.property("Position").setValue([1410, 480, 0]);
        keys(cert.property("Y Rotation"), [[34.6, 38], [36, -12]]);
        cert.property("Y Rotation").expression = "value + Math.sin(time*.9)*4"; cert.property("X Rotation").expression = "6 + Math.sin(time*.7)*2";
        keys(cert.property("Opacity"), [[34.6, 0], [35.6, 100]]);
        try { cert.property("ADBE Effect Parade").addProperty("ADBE CC Light Sweep"); } catch (e) { }
    }

    // ---------- S7 call to action (40.2–46) ----------
    marker(40.2, "Call to action");
    if (aliImg) {
        var hero2 = comp.layers.add(aliImg); span(hero2, 40.2, 45.4); hero2.name = "Character (greeting)";
        hero2.property("Scale").setValue([37, 37]); hero2.property("Position").setValue([W / 2, 280]);
        hero2.property("Anchor Point").setValue([aliImg.width / 2, aliImg.height]); hero2.property("Position").setValue([W / 2, 440]);
        keys(hero2.property("Rotation"), [[41, 0], [41.3, -4], [41.6, 3], [41.9, -2], [42.3, 0]]); keys(hero2.property("Opacity"), [[40.4, 0], [41.2, 100]]);
    }
    var s7h = text("Let's Climb To The Top Together.", { size: 110, center: true, pos: [W / 2, 620], a: 40.6, b: 45.4 }); wordReveal(s7h, 40.8, 1.1);
    var mail = text("az8435809@gmail.com", { size: 72, center: true, color: CREAM, pos: [W / 2, 820], a: 42, b: 45.4 }); fadeUp(mail, 42, 45.3, 30);
    var ml = solid("Email underline", GOLD, 42.6, 45.4, 640, 4); ml.property("Anchor Point").setValue([0, 2]); ml.property("Position").setValue([640, 860]); keys(ml.property("Scale"), [[42.6, [0, 100]], [43.6, [100, 100]]]);
    var s7p = text("WEB DEVELOPER & UI DESIGNER · KARACHI, PAKISTAN", { size: 22, font: SANS, color: GOLD2, tracking: 300, center: true, pos: [W / 2, 930], a: 43.2, b: 45.4 }); fadeUp(s7p, 43.2, 45.3, 20);
    marker(44.6, "End card");
    var endT = text("Ali Zain.", { size: 120, center: true, pos: [W / 2, 580], a: 44.8, b: 46 }); keys(endT.property("Opacity"), [[44.8, 0], [45.3, 100], [45.8, 100], [46, 0]]);

    // ---------- gold wipe transitions ----------
    var B = [5.6, 11.2, 18.2, 28.2, 34.2, 40.2];
    for (var w = 0; w < B.length; w++) {
        var wp = solid("Wipe → scene " + (w + 2), GOLD, B[w] - .45, B[w] + .45, 1200, 1600); wp.property("Rotation").setValue(14);
        keys(wp.property("Position"), [[B[w] - .45, [-700, H / 2]], [B[w] + .45, [W + 700, H / 2]]]);
    }

    // ---------- finishing: grain + vignette adjustment layers, soundtrack ----------
    var adj = comp.layers.addSolid([1, 1, 1], "Film grain + vignette", W, H, 1, DUR); adj.adjustmentLayer = true;
    try { var ns = adj.property("ADBE Effect Parade").addProperty("ADBE Noise"); ns.property(1).setValue(6); } catch (e) { }
    try { var vg = adj.property("ADBE Effect Parade").addProperty("CC Vignette"); vg.property(1).setValue(60); } catch (e) { }
    if (audio) { var au = comp.layers.add(audio); au.name = "Soundtrack (original)"; au.moveToEnd(); }
    bg.moveToEnd();
    comp.openInViewer();
    app.endUndoGroup();
    alert("Ali Zain promo comp built: 46 s, 1920×1080, 30 fps.\nCheck fonts (Playfair Display + Manrope), then add to Render Queue.");
})();
