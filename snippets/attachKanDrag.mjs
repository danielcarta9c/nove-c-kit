// attachKanDrag — drag & drop Kanban touch-friendly per iPhone
// =====================================================================
// PROBLEMA: drag&drop tra colonne Kanban funziona con mouse, ma su
// iPhone Safari il dito non riesce a "prendere" la card — o, se la
// prende, lo scroll della pagina si blocca a metà gesto. Cause:
//   1. `touchmove` di default è passive: non puoi `preventDefault()`.
//   2. `touch-action: none` su tutto il body blocca scroll di pagina.
//   3. Listener registrato senza `{passive: false}`.
//
// SOLUZIONE: pointer events unificati (mouse + touch + pen) + listener
// `touchmove` con `{passive: false}` per poter `preventDefault()` SOLO
// durante drag attivo. Long-press (320ms) come trigger drag su touch
// per coesistere con scroll naturale.
//
// CSS richiesto:
//   .card { touch-action: auto; }                  /* default: scroll OK */
//   .card.is-dragging { touch-action: none; }      /* solo durante drag */
//   .kan-card-ghost { ... }                         /* il clone trascinato */
//   .kan-col.drag-over { background: ...; }         /* highlight colonna target */
//
// USAGE: per ogni card del Kanban →  attachKanDrag(card, item, isTouch);
// Implementa `moveToStato(id, stato)` nel tuo dominio per ricevere il drop.
// =====================================================================

function attachKanDrag(card, t, isTouch) {
  let startX = 0, startY = 0, dragging = false, ghost = null, longPressTimer = null;
  let pointerId = null, lastClientX = 0, lastClientY = 0;
  let docMove = null, docUp = null, docCancel = null, docTouchMove = null;
  let suppressNextClick = false;
  const LONG_PRESS_MS = 320;
  const MOVE_CANCEL_THRESHOLD = 8;
  const MOUSE_DRAG_THRESHOLD = 6;

  const startDrag = (clientX, clientY) => {
    dragging = true;
    if (navigator.vibrate) try { navigator.vibrate(30); } catch {}
    card.classList.add("is-dragging");
    ghost = card.cloneNode(true);
    ghost.classList.remove("is-dragging");
    ghost.classList.add("kan-card-ghost");
    Object.assign(ghost.style, {
      position: "fixed", left: (clientX - 80) + "px", top: (clientY - 25) + "px",
      width: card.offsetWidth + "px", zIndex: "9999",
      opacity: "0.92", transform: "rotate(2deg) scale(1.04)",
      pointerEvents: "none", boxShadow: "0 12px 32px rgba(6,34,90,.3)"
    });
    document.body.append(ghost);
    card.classList.add("kan-card-being-dragged");
    document.body.style.userSelect = "none";
  };

  const cleanupDocListeners = () => {
    if (docMove) document.removeEventListener("pointermove", docMove, { capture: true });
    if (docUp) document.removeEventListener("pointerup", docUp, { capture: true });
    if (docCancel) document.removeEventListener("pointercancel", docCancel, { capture: true });
    if (docTouchMove) document.removeEventListener("touchmove", docTouchMove, { capture: true });
    docMove = docUp = docCancel = docTouchMove = null;
  };

  const endDrag = (clientX, clientY, cancelled) => {
    clearTimeout(longPressTimer); longPressTimer = null;
    document.body.style.userSelect = "";
    card.classList.remove("is-dragging");
    cleanupDocListeners();
    if (!dragging) return;
    dragging = false;
    if (ghost) { ghost.remove(); ghost = null; }
    card.classList.remove("kan-card-being-dragged");
    document.querySelectorAll(".kan-col.drag-over").forEach(x => x.classList.remove("drag-over"));
    if (cancelled) return;
    const hit = document.elementFromPoint(clientX, clientY);
    const targetCol = hit && hit.closest(".kan-col");
    if (targetCol && targetCol.dataset.stato && targetCol.dataset.stato !== t.stato) {
      moveToStato(t.id, targetCol.dataset.stato);   // ← implementa nel tuo dominio
    }
  };

  card.addEventListener("pointerdown", (ev) => {
    if (ev.button !== undefined && ev.button !== 0) return;
    if (dragging) return;
    startX = ev.clientX; startY = ev.clientY;
    lastClientX = ev.clientX; lastClientY = ev.clientY;
    pointerId = ev.pointerId;
    dragging = false;

    // Listener globali — funzionano anche se il dito esce dalla card
    docMove = (mev) => {
      if (mev.pointerId !== pointerId) return;
      lastClientX = mev.clientX; lastClientY = mev.clientY;
      if (!dragging) {
        const dx = Math.abs(mev.clientX - startX), dy = Math.abs(mev.clientY - startY);
        if (dx > MOVE_CANCEL_THRESHOLD || dy > MOVE_CANCEL_THRESHOLD) {
          if (longPressTimer) {
            // touch: scroll → annulla long-press
            clearTimeout(longPressTimer); longPressTimer = null;
            cleanupDocListeners();
          } else if (mev.pointerType !== "touch" && (dx > MOUSE_DRAG_THRESHOLD || dy > MOUSE_DRAG_THRESHOLD)) {
            // mouse: parte drag al movimento
            startDrag(mev.clientX, mev.clientY);
          }
        }
        return;
      }
      // Drag attivo
      try { mev.preventDefault(); } catch {}
      if (ghost) {
        ghost.style.left = (mev.clientX - 80) + "px";
        ghost.style.top = (mev.clientY - 25) + "px";
      }
      document.querySelectorAll(".kan-col.drag-over").forEach(x => x.classList.remove("drag-over"));
      const hit = document.elementFromPoint(mev.clientX, mev.clientY);
      const tCol = hit && hit.closest(".kan-col");
      if (tCol && tCol.dataset.stato && tCol.dataset.stato !== t.stato) tCol.classList.add("drag-over");
    };
    docUp = (uev) => {
      if (uev.pointerId !== pointerId) return;
      clearTimeout(longPressTimer); longPressTimer = null;
      if (dragging) {
        suppressNextClick = true;
        // Su iOS pointerup da touch può avere clientX/Y a 0 — usa l'ultima coord nota
        const dropX = uev.clientX || lastClientX;
        const dropY = uev.clientY || lastClientY;
        endDrag(dropX, dropY, false);
        setTimeout(() => { suppressNextClick = false; }, 400);
      } else {
        cleanupDocListeners();
      }
    };
    docCancel = (cev) => {
      if (cev.pointerId !== pointerId) return;
      endDrag(0, 0, true);
    };
    // touchmove con passive:false → quando dragging=true, preventDefault per
    // impedire al browser di convertire il gesto in scroll (e quindi sparare
    // pointercancel sul nostro pointer). Senza questo, su touch il drag muore
    // dopo il primo movimento.
    docTouchMove = (tev) => {
      if (dragging) { try { tev.preventDefault(); } catch {} }
    };
    document.addEventListener("pointermove", docMove, { capture: true });
    document.addEventListener("pointerup", docUp, { capture: true });
    document.addEventListener("pointercancel", docCancel, { capture: true });
    document.addEventListener("touchmove", docTouchMove, { passive: false, capture: true });

    if (isTouch || ev.pointerType === "touch") {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        const dx = Math.abs(lastClientX - startX), dy = Math.abs(lastClientY - startY);
        if (dx <= MOVE_CANCEL_THRESHOLD && dy <= MOVE_CANCEL_THRESHOLD) {
          startDrag(lastClientX, lastClientY);
        }
      }, LONG_PRESS_MS);
    }
  });

  card.addEventListener("contextmenu", (ev) => { if (isTouch) ev.preventDefault(); });

  // Tap normale (no drag) → openItem
  card.addEventListener("click", (ev) => {
    if (suppressNextClick) {
      ev.preventDefault();
      ev.stopPropagation();
      suppressNextClick = false;
      return;
    }
    openItem(t.id);   // ← implementa nel tuo dominio
  });
}

// Stub — implementa nel tuo dominio:
function moveToStato(id, stato) { /* aggiorna state + markDirty + render */ }
function openItem(id) { /* apri sheet dettaglio */ }

export { attachKanDrag };
