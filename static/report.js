(function () {
  const root = document.body;

  function setScrolled() {
    root.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  setScrolled();
  window.addEventListener("scroll", setScrolled, { passive: true });

  if (root.classList.contains("student-page")) {
    document.documentElement.classList.add("student-scroll-snap");
  }

  const styleSelects = document.querySelectorAll("[data-archetype-style-select]");
  const archetypeImages = document.querySelectorAll("[data-archetype-img]");
  const storedStyle = window.localStorage?.getItem("archetypeImageStyle_v2");
  const defaultStyle = "style03";

  function scheduleArchetypeTrim(image) {
    if (!image) return;
    image.classList.remove("is-trimmed");
    image.style.removeProperty("--trim-x");
    image.style.removeProperty("--trim-y");
    image.style.removeProperty("--trim-scale");
    if (!/\.(png|jpe?g|webp)$/i.test((image.getAttribute("src") || "").split("?")[0])) return;

    const apply = () => trimTransparentImage(image);
    if (image.complete && image.naturalWidth) {
      window.requestAnimationFrame(apply);
    } else {
      image.addEventListener("load", apply, { once: true });
    }
  }

  function trimTransparentImage(image) {
    try {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height) return;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, width, height).data;

      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const alpha = pixels[index + 3];
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const visible = alpha > 8 && !(red > 248 && green > 248 && blue > 248);
          if (!visible) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
      if (maxX < 0 || maxY < 0) return;

      const padX = Math.round((maxX - minX + 1) * 0.08);
      const padY = Math.round((maxY - minY + 1) * 0.08);
      minX = Math.max(0, minX - padX);
      minY = Math.max(0, minY - padY);
      maxX = Math.min(width - 1, maxX + padX);
      maxY = Math.min(height - 1, maxY + padY);

      const contentWidth = (maxX - minX + 1) / width;
      const contentHeight = (maxY - minY + 1) / height;
      const contentMax = Math.max(contentWidth, contentHeight);
      const targetCoverage = image.closest(".student-hero") ? 0.68 : 0.62;
      const scale = Math.min(1.75, Math.max(1, targetCoverage / contentMax));
      const centerX = (minX + maxX + 1) / (2 * width);
      const centerY = (minY + maxY + 1) / (2 * height);
      const translateX = (0.5 - centerX) * 100;
      const translateY = (0.5 - centerY) * 100;

      image.style.setProperty("--trim-x", `${translateX.toFixed(2)}%`);
      image.style.setProperty("--trim-y", `${translateY.toFixed(2)}%`);
      image.style.setProperty("--trim-scale", scale.toFixed(3));
      image.classList.add("is-trimmed");
    } catch (_error) {
      if (image.closest(".student-hero")) {
        image.style.setProperty("--trim-scale", "1.12");
      }
    }
  }

  function setArchetypeStyle(styleId, persist) {
    if (!styleId) return;
    archetypeImages.forEach((image) => {
      const nextSrc = image.getAttribute(`data-archetype-src-${styleId}`);
      if (nextSrc && image.getAttribute("src") !== nextSrc) {
        image.setAttribute("src", nextSrc);
      }
      scheduleArchetypeTrim(image);
    });
    styleSelects.forEach((select) => {
      if (select.value !== styleId) select.value = styleId;
    });
    root.dataset.archetypeStyle = styleId;
    if (persist) {
      window.localStorage?.setItem("archetypeImageStyle_v2", styleId);
    }
  }

  setArchetypeStyle(storedStyle || defaultStyle, false);
  archetypeImages.forEach(scheduleArchetypeTrim);
  styleSelects.forEach((select) => {
    select.addEventListener("change", () => setArchetypeStyle(select.value, true));
  });

  const overviewRows = Array.from(document.querySelectorAll("[data-overview-row]"));
  const overviewFilter = document.querySelector("[data-overview-filter]");
  const overviewSort = document.querySelector("[data-overview-sort]");
  const overviewClear = document.querySelector("[data-overview-clear]");
  const overviewCount = document.querySelector("[data-visible-count]");
  const overviewCards = Array.from(document.querySelectorAll("[data-filter-archetype]"));

  function applyOverviewControls() {
    if (!overviewRows.length) return;
    const filter = overviewFilter?.value || "all";
    const sort = overviewSort?.value || "score-desc";
    const visibleRows = overviewRows.filter((row) => filter === "all" || row.dataset.archetype === filter);

    visibleRows
      .sort((a, b) => {
        if (sort === "score-asc") return Number(a.dataset.score) - Number(b.dataset.score);
        if (sort === "review-desc") return Number(b.dataset.review) - Number(a.dataset.review) || Number(b.dataset.score) - Number(a.dataset.score);
        if (sort === "title-asc") return (a.dataset.title || "").localeCompare(b.dataset.title || "", "zh-Hant");
        if (sort === "archetype-asc") return (a.dataset.archetype || "").localeCompare(b.dataset.archetype || "") || Number(b.dataset.score) - Number(a.dataset.score);
        return Number(b.dataset.score) - Number(a.dataset.score);
      })
      .forEach((row) => row.parentElement?.appendChild(row));

    overviewRows.forEach((row) => {
      row.hidden = !visibleRows.includes(row);
    });
    if (overviewCount) overviewCount.textContent = `${visibleRows.length} 份`;
    overviewCards.forEach((card) => {
      card.setAttribute("aria-pressed", String(filter !== "all" && card.dataset.filterArchetype === filter));
    });
  }

  overviewFilter?.addEventListener("change", applyOverviewControls);
  overviewSort?.addEventListener("change", applyOverviewControls);
  overviewClear?.addEventListener("click", () => {
    if (overviewFilter) overviewFilter.value = "all";
    if (overviewSort) overviewSort.value = "score-desc";
    applyOverviewControls();
  });
  overviewCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (!overviewFilter) return;
      const nextFilter = card.dataset.filterArchetype || "all";
      overviewFilter.value = overviewFilter.value === nextFilter ? "all" : nextFilter;
      applyOverviewControls();
      document.getElementById("submissions")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  applyOverviewControls();

  const toneTargets = document.querySelectorAll("[data-student-tone]");
  if (toneTargets.length) {
    root.dataset.studentTone = toneTargets[0].dataset.studentTone || "hero";
    if ("IntersectionObserver" in window) {
      const toneObserver = new IntersectionObserver(
        (entries) => {
          entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
            .forEach((entry) => {
              root.dataset.studentTone = entry.target.dataset.studentTone || "hero";
            });
        },
        { threshold: [0.32, 0.52, 0.72], rootMargin: "-18% 0px -36% 0px" }
      );
      toneTargets.forEach((target) => toneObserver.observe(target));
    }
  }

  const revealTargets = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach((target) => observer.observe(target));
  } else {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
  }

  function updateExplainer(trigger) {
    const panel = trigger.closest(".radar-panel")?.querySelector(".dimension-explainer");
    if (!panel) return;
    const label = trigger.dataset.label || "六維說明";
    const copy = trigger.dataset.copy || "";
    const why = trigger.dataset.why || "";
    panel.innerHTML = `
      <div class="explainer-title">${escapeHtml(label)}</div>
      <p>${escapeHtml(copy)}</p>
      ${why ? `<p><strong>為什麼重要：</strong>${escapeHtml(why)}</p>` : ""}
    `;
  }

  document.querySelectorAll(".radar-hotspot,.dimension-chip").forEach((trigger) => {
    trigger.addEventListener("mouseenter", () => updateExplainer(trigger));
    trigger.addEventListener("focus", () => updateExplainer(trigger));
    trigger.addEventListener("click", () => updateExplainer(trigger));
  });

  const dimensionSheet = document.querySelector(".dimension-sheet");
  const dimensionSheetTitle = document.querySelector("[data-dim-sheet-title]");
  const dimensionSheetScore = document.querySelector("[data-dim-sheet-score]");
  const dimensionSheetWeight = document.querySelector("[data-dim-sheet-weight]");
  const dimensionSheetCopy = document.querySelector("[data-dim-sheet-copy]");
  const dimensionSheetWhy = document.querySelector("[data-dim-sheet-why]");

  function openDimensionSheet(button) {
    if (!dimensionSheet) return;
    if (dimensionSheetTitle) dimensionSheetTitle.textContent = button.dataset.dimTitle || "能力說明";
    if (dimensionSheetScore) dimensionSheetScore.textContent = button.dataset.dimScore || "-";
    if (dimensionSheetWeight) dimensionSheetWeight.textContent = button.dataset.dimWeight || "-";
    if (dimensionSheetCopy) dimensionSheetCopy.textContent = button.dataset.dimCopy || "尚未提供說明。";
    if (dimensionSheetWhy) dimensionSheetWhy.textContent = button.dataset.dimWhy || "這個能力會影響本作業的修正方向。";
    root.classList.add("dimension-sheet-open");
    dimensionSheet.setAttribute("aria-hidden", "false");
  }

  function closeDimensionSheet() {
    root.classList.remove("dimension-sheet-open");
    dimensionSheet?.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll("[data-dim-detail]").forEach((button) => {
    button.addEventListener("click", () => openDimensionSheet(button));
  });
  document.querySelector(".dimension-sheet-close")?.addEventListener("click", closeDimensionSheet);
  document.querySelector("[data-dim-sheet-scrim]")?.addEventListener("click", closeDimensionSheet);

  function openDrawer(button) {
    const title = document.querySelector("[data-drawer-title]");
    const evidence = document.querySelector("[data-drawer-evidence]");
    const reason = document.querySelector("[data-drawer-reason]");
    const advice = document.querySelector("[data-drawer-advice]");
    if (!title || !evidence || !reason || !advice) return;

    title.textContent = button.dataset.title || "評語證據";
    evidence.textContent = button.dataset.evidence || "尚未提供引用片段。";
    reason.textContent = button.dataset.reason || "尚未提供判讀理由。";
    advice.textContent = button.dataset.advice || "尚未提供修改建議。";
    root.classList.add("drawer-open");
    document.querySelector(".evidence-drawer")?.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    root.classList.remove("drawer-open");
    document.querySelector(".evidence-drawer")?.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll(".evidence-link").forEach((button) => {
    button.addEventListener("click", () => openDrawer(button));
  });
  document.querySelector(".drawer-close")?.addEventListener("click", closeDrawer);
  document.querySelector("[data-drawer-scrim]")?.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      closeDimensionSheet();
    }
  });

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
